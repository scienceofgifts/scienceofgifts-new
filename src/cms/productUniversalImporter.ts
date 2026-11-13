import type { Product } from '../types/content';
import { findMatchingExistingProduct } from './productAiBriefExporter';
import {
  ProductInterchangeCreatePayloadV1,
  ProductInterchangeDocumentV1,
  ProductInterchangeMode,
  ProductInterchangeRevisionPayloadV1,
  ProductInterchangeValidationIssue,
  ProductRevisionFieldDiff,
  QuarantinedTaxonomySuggestion,
  UnverifiedFactFlag,
  applyProductInterchangeRevision,
  deriveCanonicalProductIdFromSlug,
  mapInterchangeToAstroProduct,
  mapInterchangeToSanityProductDraft,
  validateAndNormalizeProductInterchange,
} from './productInterchangeSchema';

export type ImportInputSourceType =
  | 'pasted_raw_json'
  | 'pasted_fenced_markdown'
  | 'pasted_prose_wrapped_json'
  | 'uploaded_json_file'
  | 'uploaded_markdown_or_text_file';

export interface SingleJsonExtractionResult {
  ok: boolean;
  parsed: unknown | null;
  extractedJsonText: string | null;
  detectedSourceType: ImportInputSourceType;
  errorCode?: 'EMPTY_INPUT' | 'AMBIGUOUS_MULTIPLE_JSON_OBJECTS' | 'MALFORMED_JSON_SYNTAX';
  errorMessage?: string;
}

export interface DuplicateProductConflictInfo {
  detected: boolean;
  matchedBy: 'canonicalProductId' | 'slug' | 'sourceUrl';
  existingCanonicalProductId: string;
  existingDocumentId: string;
  existingTitle: string;
  existingRev?: string;
  isSanityDraft: boolean;
}

export interface UniversalProductImportReport {
  ok: boolean;
  status: 'valid' | 'incomplete_needs_review' | 'invalid';
  detectedSourceType: ImportInputSourceType;
  mode: ProductInterchangeMode | null;
  schemaVersion: string | null;
  canonicalProductId: string | null;
  slug: string | null;
  errors: ProductInterchangeValidationIssue[];
  warnings: ProductInterchangeValidationIssue[];
  quarantinedTaxonomySuggestions: QuarantinedTaxonomySuggestion[];
  unverifiedFactFlags: UnverifiedFactFlag[];
  duplicateConflict: DuplicateProductConflictInfo | null;
  revisionDiffs: ProductRevisionFieldDiff[];
  normalizedPayload: ProductInterchangeDocumentV1 | null;
  resolvedCreatePayload: ProductInterchangeCreatePayloadV1 | null;
  candidateAstroProduct: Product | null;
  candidateSanityDraft: Record<string, any> | null;
}

/**
 * Scans a string for balanced top-level `{ ... }` JSON object substrings,
 * respecting quoted strings and escaped characters.
 */
function extractTopLevelBraceBlocks(text: string): string[] {
  const blocks: string[] = [];
  let depth = 0;
  let startIdx = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (inString) {
      if (ch === '\\') {
        escapeNext = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      if (depth === 0) {
        startIdx = i;
      }
      depth += 1;
    } else if (ch === '}') {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && startIdx !== -1) {
          blocks.push(text.slice(startIdx, i + 1));
          startIdx = -1;
        }
      }
    }
  }

  return blocks;
}

function buildReadableJsonSyntaxError(rawCandidate: string, err: any): string {
  const baseMessage = err?.message ? String(err.message) : 'Invalid JSON syntax';
  const posMatch = baseMessage.match(/position\s+(\d+)/i);
  if (posMatch) {
    const pos = Number(posMatch[1]);
    if (Number.isFinite(pos) && pos >= 0 && pos <= rawCandidate.length) {
      const upToPos = rawCandidate.slice(0, pos);
      const lines = upToPos.split('\n');
      const lineNum = lines.length;
      const colNum = lines[lines.length - 1].length + 1;
      const snippet = rawCandidate
        .slice(Math.max(0, pos - 40), Math.min(rawCandidate.length, pos + 40))
        .replace(/\s+/g, ' ');
      return `JSON syntax error near line ${lineNum}, column ${colNum} (${baseMessage}). Context: "${snippet}"`;
    }
  }
  return `JSON syntax error: ${baseMessage}. Verify that all property names and strings use double quotes and there are no trailing commas.`;
}

/**
 * Extracts exactly ONE unambiguous JSON object from pasted text or an uploaded
 * `.json`, `.md`, or `.txt` file.
 *
 * Guarantees:
 * - Never silently combines or guesses between multiple competing JSON objects.
 * - Never calls an external AI API to repair malformed JSON.
 */
export function extractSingleUnambiguousJsonObject(
  rawText: string,
  options?: { filename?: string }
): SingleJsonExtractionResult {
  const filename = options?.filename?.toLowerCase() || '';
  const isUploadedJson = filename.endsWith('.json');
  const isUploadedTextOrMd = filename.endsWith('.md') || filename.endsWith('.txt');

  if (typeof rawText !== 'string' || !rawText.trim()) {
    return {
      ok: false,
      parsed: null,
      extractedJsonText: null,
      detectedSourceType: isUploadedJson
        ? 'uploaded_json_file'
        : isUploadedTextOrMd
        ? 'uploaded_markdown_or_text_file'
        : 'pasted_raw_json',
      errorCode: 'EMPTY_INPUT',
      errorMessage: 'Paste a chatbot response or upload a .json, .md, or .txt file to import.',
    };
  }

  const trimmed = rawText.trim();

  // 1. Check for Markdown fenced code blocks (```json ... ``` or ``` ... ```)
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
  const fencedCandidates: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = fenceRegex.exec(trimmed)) !== null) {
    const blockContent = match[1].trim();
    if (blockContent.startsWith('{') && blockContent.endsWith('}')) {
      fencedCandidates.push(blockContent);
    }
  }

  if (fencedCandidates.length > 1) {
    return {
      ok: false,
      parsed: null,
      extractedJsonText: null,
      detectedSourceType: isUploadedTextOrMd
        ? 'uploaded_markdown_or_text_file'
        : 'pasted_fenced_markdown',
      errorCode: 'AMBIGUOUS_MULTIPLE_JSON_OBJECTS',
      errorMessage: `Detected ${fencedCandidates.length} competing JSON code blocks in the input. The importer requires one unambiguous JSON object and never merges multiple responses.`,
    };
  }

  if (fencedCandidates.length === 1) {
    const candidate = fencedCandidates[0];
    try {
      const parsed = JSON.parse(candidate);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {
          ok: false,
          parsed: null,
          extractedJsonText: candidate,
          detectedSourceType: isUploadedTextOrMd
            ? 'uploaded_markdown_or_text_file'
            : 'pasted_fenced_markdown',
          errorCode: 'MALFORMED_JSON_SYNTAX',
          errorMessage: 'Top-level JSON value inside the code fence must be a JSON object ({ ... }).',
        };
      }
      return {
        ok: true,
        parsed,
        extractedJsonText: candidate,
        detectedSourceType: isUploadedTextOrMd
          ? 'uploaded_markdown_or_text_file'
          : 'pasted_fenced_markdown',
      };
    } catch (err: any) {
      return {
        ok: false,
        parsed: null,
        extractedJsonText: candidate,
        detectedSourceType: isUploadedTextOrMd
          ? 'uploaded_markdown_or_text_file'
          : 'pasted_fenced_markdown',
        errorCode: 'MALFORMED_JSON_SYNTAX',
        errorMessage: buildReadableJsonSyntaxError(candidate, err),
      };
    }
  }

  // 2. If the entire input starts with `{` and ends with `}`, check if it is a single raw JSON object
  const topLevelBlocks = extractTopLevelBraceBlocks(trimmed);
  if (topLevelBlocks.length > 1) {
    return {
      ok: false,
      parsed: null,
      extractedJsonText: null,
      detectedSourceType: isUploadedJson
        ? 'uploaded_json_file'
        : isUploadedTextOrMd
        ? 'uploaded_markdown_or_text_file'
        : 'pasted_prose_wrapped_json',
      errorCode: 'AMBIGUOUS_MULTIPLE_JSON_OBJECTS',
      errorMessage: `Detected ${topLevelBlocks.length} separate top-level JSON objects in the input. Please provide only one JSON object per import.`,
    };
  }

  const singleCandidate = topLevelBlocks.length === 1 ? topLevelBlocks[0] : trimmed;
  const isPureRawJson = trimmed.startsWith('{') && trimmed.endsWith('}');
  const sourceType: ImportInputSourceType = isUploadedJson
    ? 'uploaded_json_file'
    : isUploadedTextOrMd
    ? 'uploaded_markdown_or_text_file'
    : isPureRawJson
    ? 'pasted_raw_json'
    : 'pasted_prose_wrapped_json';

  try {
    const parsed = JSON.parse(singleCandidate);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        ok: false,
        parsed: null,
        extractedJsonText: singleCandidate,
        detectedSourceType: sourceType,
        errorCode: 'MALFORMED_JSON_SYNTAX',
        errorMessage: 'Top-level JSON value must be a JSON object ({ ... }).',
      };
    }
    return {
      ok: true,
      parsed,
      extractedJsonText: singleCandidate,
      detectedSourceType: sourceType,
    };
  } catch (err: any) {
    return {
      ok: false,
      parsed: null,
      extractedJsonText: singleCandidate,
      detectedSourceType: sourceType,
      errorCode: 'MALFORMED_JSON_SYNTAX',
      errorMessage: buildReadableJsonSyntaxError(singleCandidate, err),
    };
  }
}

/**
 * Validates, normalizes, checks for duplicates or revision targets, and maps a pasted
 * or uploaded AI response into a reviewable product candidate.
 *
 * Never mutates Sanity or saves automatically — returns a structured `UniversalProductImportReport`
 * for the Import Review Screen.
 */
export interface ImportProductInterchangeOptions {
  rawInput?: string | Record<string, any>;
  expectedMode?: ProductInterchangeMode;
  enforceVerifiedFactProtection?: boolean;
  filename?: string;
  workspaceDocuments?: Array<Record<string, any>>;
  /**
   * Optional array of product images already uploaded in the Studio Media Manager
   * before or during the AI brief/import workflow. Preserved automatically on import.
   */
  existingDraftImages?: Array<Record<string, any>>;
  /**
   * When true during `"create"` mode, allows updating an existing draft if a duplicate ID/slug is detected.
   * When false (default), a duplicate product in `"create"` mode is flagged as a warning/conflict for review.
   */
  allowUpdateOnDuplicateCreate?: boolean;
}

export function importProductInterchangeResponse(
  rawInputOrOptions: string | Record<string, any> | ImportProductInterchangeOptions,
  maybeOptions?: ImportProductInterchangeOptions
): UniversalProductImportReport {
  let rawInput: string | Record<string, any>;
  let options: ImportProductInterchangeOptions | undefined = maybeOptions;

  if (
    rawInputOrOptions &&
    typeof rawInputOrOptions === 'object' &&
    !Array.isArray(rawInputOrOptions) &&
    'rawInput' in rawInputOrOptions &&
    rawInputOrOptions.rawInput !== undefined &&
    !('schemaVersion' in rawInputOrOptions)
  ) {
    const wrapper = rawInputOrOptions as ImportProductInterchangeOptions;
    rawInput = wrapper.rawInput!;
    options = { ...wrapper, ...maybeOptions };
  } else {
    rawInput = rawInputOrOptions as string | Record<string, any>;
  }

  let parsedObj: unknown;
  let detectedSourceType: ImportInputSourceType = 'pasted_raw_json';

  if (typeof rawInput === 'string') {
    const extraction = extractSingleUnambiguousJsonObject(rawInput, {
      filename: options?.filename,
    });
    detectedSourceType = extraction.detectedSourceType;
    if (!extraction.ok || !extraction.parsed) {
      return {
        ok: false,
        status: 'invalid',
        detectedSourceType,
        mode: null,
        schemaVersion: null,
        canonicalProductId: null,
        slug: null,
        errors: [
          {
            path: '$',
            code: 'INVALID_JSON',
            severity: 'error',
            message: extraction.errorMessage || 'Unable to extract a valid JSON object.',
          },
        ],
        warnings: [],
        quarantinedTaxonomySuggestions: [],
        unverifiedFactFlags: [],
        duplicateConflict: null,
        revisionDiffs: [],
        normalizedPayload: null,
        resolvedCreatePayload: null,
        candidateAstroProduct: null,
        candidateSanityDraft: null,
      };
    }
    parsedObj = extraction.parsed;
  } else {
    parsedObj = rawInput;
  }

  const validation = validateAndNormalizeProductInterchange(parsedObj);
  if (!validation.valid || !validation.normalized) {
    return {
      ok: false,
      status: 'invalid',
      detectedSourceType,
      mode: validation.mode,
      schemaVersion: validation.schemaVersion,
      canonicalProductId: null,
      slug: null,
      errors: validation.errors,
      warnings: validation.warnings,
      quarantinedTaxonomySuggestions: validation.quarantinedTaxonomySuggestions,
      unverifiedFactFlags: validation.unverifiedFactFlags,
      duplicateConflict: null,
      revisionDiffs: [],
      normalizedPayload: null,
      resolvedCreatePayload: null,
      candidateAstroProduct: null,
      candidateSanityDraft: null,
    };
  }

  const normalized = validation.normalized;
  const errors = [...validation.errors];
  const warnings = [...validation.warnings];
  const unverifiedFactFlags = [...validation.unverifiedFactFlags];

  if (normalized.mode === 'create') {
    const slug = normalized.identity.slug;
    const canonicalProductId =
      normalized.targetProduct?.canonicalProductId || deriveCanonicalProductIdFromSlug(slug);

    // Check if an existing product already uses this canonicalProductId, slug, or sourceUrl
    const existingMatch = findMatchingExistingProduct(
      {
        canonicalProductId,
        slug,
        productUrl: normalized.factualContext.sourceUrl ?? undefined,
      },
      options?.workspaceDocuments
    );

    let duplicateConflict: DuplicateProductConflictInfo | null = null;
    let existingRev: string | undefined;
    let existingDraftId: string | undefined;

    if (existingMatch) {
      const rec = existingMatch as Record<string, any>;
      const existingCanonicalId = (
        rec.productId ||
        rec.id ||
        rec._id ||
        canonicalProductId
      ).replace(/^drafts\./, '');
      const existingSlug =
        typeof rec.slug === 'string'
          ? rec.slug
          : typeof rec.slug?.current === 'string'
          ? rec.slug.current
          : '';
      const matchedBy: DuplicateProductConflictInfo['matchedBy'] =
        existingCanonicalId === canonicalProductId
          ? 'canonicalProductId'
          : existingSlug === slug
          ? 'slug'
          : 'sourceUrl';

      duplicateConflict = {
        detected: true,
        matchedBy,
        existingCanonicalProductId: existingCanonicalId,
        existingDocumentId: rec._id || `drafts.${existingCanonicalId}`,
        existingTitle: rec.title || existingCanonicalId,
        existingRev: typeof rec._rev === 'string' ? rec._rev : undefined,
        isSanityDraft: Boolean(
          typeof rec._id === 'string' && rec._id.startsWith('drafts.')
        ),
      };

      existingRev = duplicateConflict.existingRev;
      existingDraftId = `drafts.${existingCanonicalId}`;

      warnings.push({
        path: 'targetProduct.canonicalProductId',
        code: 'DUPLICATE_VALUE',
        severity: 'warning',
        message: `Existing product "${duplicateConflict.existingTitle}" (${existingCanonicalId}) matched by ${matchedBy}. Saving will update draft "${existingDraftId}" rather than creating a duplicate product.`,
      });
    }

    // Preserve already-uploaded Sanity gallery images when importing editorial JSON
    const priorImagesSource: Array<Record<string, any>> =
      options?.existingDraftImages && options.existingDraftImages.length > 0
        ? options.existingDraftImages
        : Array.isArray((existingMatch as any)?.images) &&
          (existingMatch as any).images.some(
            (img: any) =>
              img?.sanityAssetId ||
              img?.asset?._ref ||
              img?.asset?.asset?._ref ||
              img?.sourceType === 'sanity-upload' ||
              (typeof img?.url === 'string' && img.url.includes('cdn.sanity.io'))
          )
        ? (existingMatch as any).images
        : [];

    if (priorImagesSource.length > 0) {
      const incomingImgs = normalized.media.images || [];
      const isGenericTemplateFallback =
        incomingImgs.length === 0 ||
        (incomingImgs.length === 1 &&
          incomingImgs[0].url.includes('photo-1544787219-7f47ccb76574'));

      if (isGenericTemplateFallback) {
        normalized.media.images = priorImagesSource.map((rawImg, idx) => {
          const incomingSingle = incomingImgs[idx];
          const url = rawImg.url || rawImg.externalUrl || '';
          const isGenericAlt =
            !incomingSingle?.alt ||
            incomingSingle.alt.toLowerCase().endsWith('product photograph');
          return {
            id:
              rawImg.id ||
              rawImg._key ||
              `img_${slug.replace(/-/g, '_')}_${String(idx + 1).padStart(2, '0')}`,
            url,
            alt:
              !isGenericAlt && incomingSingle?.alt
                ? incomingSingle.alt
                : rawImg.alt || `${normalized.identity.title} photograph ${idx + 1}`,
            caption: incomingSingle?.caption ?? rawImg.caption ?? undefined,
            sanityAssetId:
              rawImg.sanityAssetId ||
              rawImg.asset?.asset?._ref ||
              rawImg.asset?._ref ||
              undefined,
            sourceType: rawImg.sourceType || 'sanity-upload',
            fourthwallVariantId: rawImg.fourthwallVariantId ?? undefined,
            originalFilename: rawImg.originalFilename ?? undefined,
            mimeType: rawImg.mimeType ?? undefined,
            aspectRatio: rawImg.aspectRatio ?? undefined,
            fitMode: rawImg.fitMode === 'contain' ? 'contain' : 'cover',
            fallbackColor: rawImg.fallbackColor || '#F6F4EF',
            focalPoint: rawImg.focalPoint
              ? { x: Number(rawImg.focalPoint.x ?? 0.5), y: Number(rawImg.focalPoint.y ?? 0.5) }
              : { x: 0.5, y: 0.5 },
            crop: rawImg.crop,
            landscapeOverrideUrl: rawImg.landscapeOverrideUrl ?? undefined,
            portraitOverrideUrl: rawImg.portraitOverrideUrl ?? undefined,
            width: Number(rawImg.width) || 2400,
            height: Number(rawImg.height) || 2400,
          };
        });
        // Remove the empty-images warning/flag since we preserved the uploaded Sanity gallery
        const emptyFlagIdx = unverifiedFactFlags.findIndex((f) =>
          f.reason.includes('Product image collection is empty')
        );
        if (emptyFlagIdx !== -1) unverifiedFactFlags.splice(emptyFlagIdx, 1);
        const emptyWarnIdx = warnings.findIndex((w) => w.path === 'media.images');
        if (emptyWarnIdx !== -1) warnings.splice(emptyWarnIdx, 1);
      } else {
        // Merge any Sanity asset references from priorImagesSource onto matching URLs/IDs in incomingImgs,
        // and append any remaining uploaded Sanity images that the chatbot omitted
        const usedPriorIds = new Set<string>();
        const mergedGallery = incomingImgs.map((incImg, idx) => {
          const matchPrior =
            priorImagesSource.find(
              (p) => (incImg.id && (p.id === incImg.id || p._key === incImg.id)) || p.url === incImg.url
            ) || priorImagesSource[idx];
          if (matchPrior && (matchPrior.url === incImg.url || matchPrior.id === incImg.id)) {
            usedPriorIds.add(matchPrior.id || matchPrior._key || matchPrior.url);
            return {
              ...incImg,
              url: matchPrior.url || incImg.url,
              sanityAssetId:
                incImg.sanityAssetId ||
                matchPrior.sanityAssetId ||
                matchPrior.asset?.asset?._ref ||
                matchPrior.asset?._ref,
              sourceType: incImg.sourceType || matchPrior.sourceType || 'sanity-upload',
              fourthwallVariantId:
                incImg.fourthwallVariantId || matchPrior.fourthwallVariantId,
              originalFilename: incImg.originalFilename || matchPrior.originalFilename,
              mimeType: incImg.mimeType || matchPrior.mimeType,
              aspectRatio: incImg.aspectRatio || matchPrior.aspectRatio,
              fitMode: matchPrior.fitMode || incImg.fitMode || 'cover',
              focalPoint: matchPrior.focalPoint || incImg.focalPoint || { x: 0.5, y: 0.5 },
              width: Number(matchPrior.width) || incImg.width || 2400,
              height: Number(matchPrior.height) || incImg.height || 2400,
            };
          }
          return incImg;
        });

        for (const priorImg of priorImagesSource) {
          const key = priorImg.id || priorImg._key || priorImg.url;
          if (key && !usedPriorIds.has(key) && priorImg.url) {
            mergedGallery.push({
              id:
                priorImg.id ||
                priorImg._key ||
                `img_${slug.replace(/-/g, '_')}_${String(mergedGallery.length + 1).padStart(2, '0')}`,
              url: priorImg.url,
              alt: priorImg.alt || `${normalized.identity.title} photograph`,
              caption: priorImg.caption ?? undefined,
              sanityAssetId:
                priorImg.sanityAssetId ||
                priorImg.asset?.asset?._ref ||
                priorImg.asset?._ref ||
                undefined,
              sourceType: priorImg.sourceType || 'sanity-upload',
              fourthwallVariantId: priorImg.fourthwallVariantId ?? undefined,
              originalFilename: priorImg.originalFilename ?? undefined,
              mimeType: priorImg.mimeType ?? undefined,
              aspectRatio: priorImg.aspectRatio ?? undefined,
              fitMode: priorImg.fitMode === 'contain' ? 'contain' : 'cover',
              fallbackColor: priorImg.fallbackColor || '#F6F4EF',
              focalPoint: priorImg.focalPoint || { x: 0.5, y: 0.5 },
              crop: priorImg.crop,
              width: Number(priorImg.width) || 2400,
              height: Number(priorImg.height) || 2400,
            });
          }
        }
        normalized.media.images = mergedGallery;
      }
    }

    const candidateAstroProduct = mapInterchangeToAstroProduct(normalized);
    const candidateSanityDraft = mapInterchangeToSanityProductDraft(normalized, {
      existingDraftId,
      existingRev,
    });

    const hasUnverifiedFacts = unverifiedFactFlags.length > 0;
    const hasQuarantinedTags = validation.quarantinedTaxonomySuggestions.length > 0;

    return {
      ok: true,
      status:
        hasUnverifiedFacts || hasQuarantinedTags || duplicateConflict
          ? 'incomplete_needs_review'
          : 'valid',
      detectedSourceType,
      mode: 'create',
      schemaVersion: validation.schemaVersion,
      canonicalProductId: candidateAstroProduct.id,
      slug: candidateAstroProduct.slug,
      errors,
      warnings,
      quarantinedTaxonomySuggestions: validation.quarantinedTaxonomySuggestions,
      unverifiedFactFlags,
      duplicateConflict,
      revisionDiffs: [],
      normalizedPayload: normalized,
      resolvedCreatePayload: normalized,
      candidateAstroProduct,
      candidateSanityDraft,
    };
  }

  // Revision mode (`mode: "revision"`)
  const revisionDoc = normalized as ProductInterchangeRevisionPayloadV1;
  const targetMatch = findMatchingExistingProduct(
    {
      canonicalProductId: revisionDoc.targetProduct.canonicalProductId,
      slug: revisionDoc.targetProduct.slug,
      productUrl: revisionDoc.targetProduct.sourceUrl,
    },
    options?.workspaceDocuments
  );

  if (!targetMatch) {
    errors.push({
      path: 'targetProduct',
      code: 'INVALID_CANONICAL_ID',
      severity: 'error',
      message: `No existing product found matching targetProduct (${
        revisionDoc.targetProduct.canonicalProductId ||
        revisionDoc.targetProduct.slug ||
        revisionDoc.targetProduct.sourceUrl ||
        'unknown'
      }). Revisions can only be applied to an existing product record.`,
    });
    return {
      ok: false,
      status: 'invalid',
      detectedSourceType,
      mode: 'revision',
      schemaVersion: validation.schemaVersion,
      canonicalProductId: revisionDoc.targetProduct.canonicalProductId ?? null,
      slug: revisionDoc.targetProduct.slug ?? null,
      errors,
      warnings,
      quarantinedTaxonomySuggestions: validation.quarantinedTaxonomySuggestions,
      unverifiedFactFlags: validation.unverifiedFactFlags,
      duplicateConflict: null,
      revisionDiffs: [],
      normalizedPayload: revisionDoc,
      resolvedCreatePayload: null,
      candidateAstroProduct: null,
      candidateSanityDraft: null,
    };
  }

  const effectiveTargetMatch =
    options?.existingDraftImages && options.existingDraftImages.length > 0
      ? { ...targetMatch, images: options.existingDraftImages }
      : targetMatch;

  const mergeResult = applyProductInterchangeRevision(effectiveTargetMatch, revisionDoc);
  errors.push(...mergeResult.errors);
  warnings.push(...mergeResult.warnings);

  if (!mergeResult.valid || !mergeResult.mergedInterchange) {
    return {
      ok: false,
      status: 'invalid',
      detectedSourceType,
      mode: 'revision',
      schemaVersion: validation.schemaVersion,
      canonicalProductId: mergeResult.canonicalProductId,
      slug: mergeResult.slug,
      errors,
      warnings,
      quarantinedTaxonomySuggestions: validation.quarantinedTaxonomySuggestions,
      unverifiedFactFlags: validation.unverifiedFactFlags,
      duplicateConflict: null,
      revisionDiffs: mergeResult.fieldDiffs,
      normalizedPayload: revisionDoc,
      resolvedCreatePayload: null,
      candidateAstroProduct: null,
      candidateSanityDraft: null,
    };
  }

  const hasUnverifiedFacts = validation.unverifiedFactFlags.length > 0;
  const hasQuarantinedTags = validation.quarantinedTaxonomySuggestions.length > 0;
  const hasBlockedOverwrites = mergeResult.fieldDiffs.some(
    (d) => d.action === 'blocked_verified_fact'
  );

  return {
    ok: true,
    status:
      hasUnverifiedFacts || hasQuarantinedTags || hasBlockedOverwrites
        ? 'incomplete_needs_review'
        : 'valid',
    detectedSourceType,
    mode: 'revision',
    schemaVersion: validation.schemaVersion,
    canonicalProductId: mergeResult.canonicalProductId,
    slug: mergeResult.slug,
    errors,
    warnings,
    quarantinedTaxonomySuggestions: validation.quarantinedTaxonomySuggestions,
    unverifiedFactFlags: validation.unverifiedFactFlags,
    duplicateConflict: null,
    revisionDiffs: mergeResult.fieldDiffs,
    normalizedPayload: revisionDoc,
    resolvedCreatePayload: mergeResult.mergedInterchange,
    candidateAstroProduct: mergeResult.mergedAstroProduct,
    candidateSanityDraft: mergeResult.mergedSanityDraft,
  };
}
