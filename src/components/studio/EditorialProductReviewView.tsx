import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCode2,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Link as LinkIcon,
  Package,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AGE_RANGE_OPTIONS,
  COMMERCE_PROVIDER_OPTIONS,
  INTEREST_OPTIONS,
  OCCASION_OPTIONS,
  PERSONALITY_TRAIT_OPTIONS,
  PRODUCT_BUDGET_TIER_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  RECIPIENT_OPTIONS,
} from '../../cms/studio/taxonomyRegistry';
import {
  deriveBudgetTierFromPrice,
  deriveGuidePriceBucketFromPrice,
  mapExistingProductToInterchangeV1,
  validateProductPublicationReadiness,
} from '../../cms/productInterchangeSchema';
import { evaluateProductPublicationLifecycle } from '../../cms/studio/publicationWorkflow';
import {
  UniversalProductImportReport,
  importProductInterchangeResponse,
} from '../../cms/productUniversalImporter';
import { generateProductAiWritingBrief } from '../../cms/productAiBriefExporter';
import { ProductMediaManager } from './ProductMediaManager';
import type {
  DraftPersistenceState,
  SanityStudioDocument,
  StudioPublishResult,
} from './SanityStudioWorkspace';

export interface EditorialProductReviewViewProps {
  document: SanityStudioDocument;
  persistenceState: DraftPersistenceState;
  persistenceError: string | null;
  serverValidationIssues: Array<{ path: string; message: string }>;
  workspaceDocuments: SanityStudioDocument[];
  onBackToLibrary: () => void;
  onUpdateDocument: (updatedDoc: SanityStudioDocument) => void;
  onSaveDraftToSanity: () => Promise<void>;
  onReloadDocumentFromSanity?: (docId: string) => Promise<void>;
  onCloneReferenceToDraft: (doc: SanityStudioDocument) => void;
  onOpenDraftPreview?: (doc: SanityStudioDocument) => void;
  onPublishProductToSanity?: () => Promise<void>;
  onUnpublishProductToSanity?: () => Promise<void>;
  isPublishing?: boolean;
  isUnpublishing?: boolean;
  publishResult?: StudioPublishResult | null;
  openingDraftDocId?: string | null;
  initialImportReport?: UniversalProductImportReport | null;
  sessionCredentials?: {
    sessionToken: string;
    csrfToken: string;
    expiresAtMs: number;
  } | null;
}

export interface ResolvedEditorGiftVerdict {
  editorialAssessment: string;
  standoutReason: string;
  recipientDelight: string;
  importantCaveat: string;
}

export interface ResolvedEditorRecipientProfile {
  headline: string;
  narrative: string;
  lifestyleNotes: string[];
  relationshipFit: string[];
}

export interface ResolvedEditorSpecification {
  _type: 'productSpecificationItem';
  _key: string;
  label: string;
  value: string;
}

export interface ResolvedEditorBuyingConsideration {
  _type: 'productBuyingConsideration';
  _key: string;
  label: string;
  detail: string;
}

export interface ResolvedEditorOccasionNote {
  _type: 'productOccasionNote';
  _key: string;
  occasion: string;
  label: string;
  note: string;
}

export function resolveGiftVerdictForEditor(
  doc: Record<string, any>
): ResolvedEditorGiftVerdict {
  const gv =
    doc.giftVerdict && typeof doc.giftVerdict === 'object' ? doc.giftVerdict : {};
  const legacyVerdict =
    doc.verdict && typeof doc.verdict === 'object' ? doc.verdict : {};
  return {
    editorialAssessment: String(
      gv.editorialAssessment ??
        gv.summary ??
        doc.giftVerdictAssessment ??
        legacyVerdict.assessment ??
        ''
    ),
    standoutReason: String(
      gv.standoutReason ??
        gv.distinctDifference ??
        doc.giftVerdictTactileQuality ??
        legacyVerdict.tactileQuality ??
        ''
    ),
    recipientDelight: String(
      gv.recipientDelight ??
        gv.whyEnjoyReceiving ??
        gv.appeal ??
        doc.giftVerdictBehavioralLogic ??
        legacyVerdict.behavioralLogic ??
        ''
    ),
    importantCaveat: String(
      gv.importantCaveat ??
        gv.caveat ??
        doc.giftVerdictPracticalCaveats ??
        legacyVerdict.practicalCaveats ??
        ''
    ),
  };
}

export function buildCanonicalGiftVerdictUpdate(
  doc: Record<string, any>,
  fieldKey: keyof ResolvedEditorGiftVerdict,
  value: string
): Record<string, any> {
  const resolved = resolveGiftVerdictForEditor(doc);
  const existingObj =
    doc.giftVerdict && typeof doc.giftVerdict === 'object' ? doc.giftVerdict : {};
  const merged: ResolvedEditorGiftVerdict = {
    ...resolved,
    [fieldKey]: value,
  };
  const nextVerdict: Record<string, any> = {
    ...existingObj,
    _type: 'productGiftVerdict',
    editorialAssessment: merged.editorialAssessment,
    standoutReason: merged.standoutReason,
    recipientDelight: merged.recipientDelight,
  };
  if (merged.importantCaveat !== '') {
    nextVerdict.importantCaveat = merged.importantCaveat;
  } else {
    delete nextVerdict.importantCaveat;
  }
  return nextVerdict;
}

export function resolveRecipientProfileForEditor(
  doc: Record<string, any>
): ResolvedEditorRecipientProfile {
  const raw = doc.idealRecipientProfile;
  if (typeof raw === 'string') {
    return {
      headline: '',
      narrative: raw,
      lifestyleNotes: [],
      relationshipFit: [],
    };
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return {
      headline: typeof raw.headline === 'string' ? raw.headline : '',
      narrative:
        typeof raw.narrative === 'string'
          ? raw.narrative
          : typeof raw.summary === 'string'
          ? raw.summary
          : '',
      lifestyleNotes: Array.isArray(raw.lifestyleNotes)
        ? raw.lifestyleNotes.map((item: unknown) => String(item ?? ''))
        : [],
      relationshipFit: Array.isArray(raw.relationshipFit)
        ? raw.relationshipFit.map((item: unknown) => String(item ?? ''))
        : [],
    };
  }
  if (doc.recipientProfile && typeof doc.recipientProfile === 'object') {
    return {
      headline: String(doc.recipientProfile.headline || ''),
      narrative: String(
        doc.recipientProfile.narrative || doc.recipientProfile.summary || ''
      ),
      lifestyleNotes: Array.isArray(doc.recipientProfile.lifestyleNotes)
        ? doc.recipientProfile.lifestyleNotes.map((item: unknown) => String(item ?? ''))
        : [],
      relationshipFit: Array.isArray(doc.recipientProfile.relationshipFit)
        ? doc.recipientProfile.relationshipFit.map((item: unknown) => String(item ?? ''))
        : [],
    };
  }
  return {
    headline: '',
    narrative: '',
    lifestyleNotes: [],
    relationshipFit: [],
  };
}

export function buildCanonicalRecipientProfileUpdate(
  doc: Record<string, any>,
  patch: Partial<ResolvedEditorRecipientProfile>
): Record<string, any> {
  const current = resolveRecipientProfileForEditor(doc);
  const existingObj =
    doc.idealRecipientProfile &&
    typeof doc.idealRecipientProfile === 'object' &&
    !Array.isArray(doc.idealRecipientProfile)
      ? doc.idealRecipientProfile
      : {};
  return {
    ...existingObj,
    _type: 'productRecipientProfile',
    headline: patch.headline !== undefined ? patch.headline : current.headline,
    narrative: patch.narrative !== undefined ? patch.narrative : current.narrative,
    lifestyleNotes:
      patch.lifestyleNotes !== undefined
        ? patch.lifestyleNotes
        : current.lifestyleNotes,
    relationshipFit:
      patch.relationshipFit !== undefined
        ? patch.relationshipFit
        : current.relationshipFit,
  };
}

export function resolveExtendedRationaleParagraphsForEditor(
  doc: Record<string, any>
): string[] {
  if (Array.isArray(doc.extendedGiftRationale)) {
    return doc.extendedGiftRationale.map((p: unknown) => String(p ?? ''));
  }
  if (typeof doc.extendedGiftRationale === 'string' && doc.extendedGiftRationale.trim()) {
    return doc.extendedGiftRationale
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return [];
}

export function resolveSpecificationsForEditor(
  doc: Record<string, any>
): ResolvedEditorSpecification[] {
  if (!Array.isArray(doc.specifications)) return [];
  return doc.specifications.map((item: any, idx: number) => ({
    _type: 'productSpecificationItem',
    _key:
      typeof item?._key === 'string' && item._key.trim()
        ? item._key
        : `spec_${String(idx + 1).padStart(2, '0')}`,
    label: String(item?.label ?? item?.key ?? ''),
    value: String(item?.value ?? ''),
  }));
}

export function resolveBuyingConsiderationsForEditor(
  doc: Record<string, any>
): ResolvedEditorBuyingConsideration[] {
  if (!Array.isArray(doc.buyingConsiderationsList)) return [];
  return doc.buyingConsiderationsList.map((item: any, idx: number) => ({
    _type: 'productBuyingConsideration',
    _key:
      typeof item?._key === 'string' && item._key.trim()
        ? item._key
        : `buy_cons_${String(idx + 1).padStart(2, '0')}`,
    label: String(item?.label ?? ''),
    detail: String(item?.detail ?? ''),
  }));
}

export function resolveOccasionNotesForEditor(
  doc: Record<string, any>
): ResolvedEditorOccasionNote[] {
  if (!Array.isArray(doc.occasionContextNotes)) return [];
  return doc.occasionContextNotes.map((item: any, idx: number) => ({
    _type: 'productOccasionNote',
    _key:
      typeof item?._key === 'string' && item._key.trim()
        ? item._key
        : `occ_note_${String(idx + 1).padStart(2, '0')}`,
    occasion: String(item?.occasion || OCCASION_OPTIONS[0]?.value || 'birthday'),
    label: String(item?.label ?? ''),
    note: String(item?.note ?? ''),
  }));
}

export function applyEditorialDocumentPatch(
  doc: SanityStudioDocument,
  patch: Record<string, any>,
  options?: { clearFields?: string[] }
): SanityStudioDocument {
  const next: SanityStudioDocument = {
    ...doc,
    ...patch,
    _updatedAt: new Date().toISOString(),
  };

  const existingClears = Array.isArray(doc._clearFields)
    ? doc._clearFields.filter((f: unknown): f is string => typeof f === 'string')
    : [];
  const nextClearSet = new Set<string>(existingClears);

  for (const [key, val] of Object.entries(patch)) {
    if (key.startsWith('_')) continue;
    if (val !== undefined && val !== null && val !== '') {
      nextClearSet.delete(key);
    }
  }

  if (options?.clearFields) {
    for (const clearKey of options.clearFields) {
      nextClearSet.add(clearKey);
      if (!clearKey.includes('.')) {
        delete next[clearKey];
      }
    }
  }

  for (const key of Object.keys(next)) {
    if (next[key] === undefined && !key.startsWith('_')) {
      delete next[key];
    }
  }

  if (nextClearSet.size > 0) {
    next._clearFields = Array.from(nextClearSet);
  } else {
    delete next._clearFields;
  }

  return next;
}

function reorderListItems<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (toIndex < 0 || toIndex >= list.length || fromIndex === toIndex) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export const EditorialProductReviewView: React.FC<EditorialProductReviewViewProps> = ({
  document: doc,
  persistenceState,
  persistenceError,
  serverValidationIssues,
  workspaceDocuments,
  onBackToLibrary,
  onUpdateDocument,
  onSaveDraftToSanity,
  onReloadDocumentFromSanity,
  onCloneReferenceToDraft,
  onOpenDraftPreview,
  onPublishProductToSanity,
  onUnpublishProductToSanity,
  isPublishing = false,
  isUnpublishing = false,
  publishResult = null,
  openingDraftDocId = null,
  initialImportReport,
  sessionCredentials,
}) => {
  // Collapsible Accordion States (progressive disclosure)
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    verdict: true,
    rationale: true,
    considerations: true,
    occasions: true,
    taxonomy: false,
    gallery: true,
    specs: true,
    commerce: false,
    relationships: false,
    seo: false,
    rawJson: false,
  });

  const toggleAccordion = (section: string) => {
    setOpenAccordions((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Revision Modal / Drawer State
  const [showRevisionBriefModal, setShowRevisionBriefModal] = useState<boolean>(false);
  const [showRevisionImportModal, setShowRevisionImportModal] = useState<boolean>(false);
  const [revisionGoals, setRevisionGoals] = useState<string>('');
  const [copiedRevisionBrief, setCopiedRevisionBrief] = useState<boolean>(false);
  const [revisionImportText, setRevisionImportText] = useState<string>('');
  const [revisionImportError, setRevisionImportError] = useState<string | null>(null);
  const [isReloadingFromSanity, setIsReloadingFromSanity] = useState<boolean>(false);
  const [confirmUnpublishOpen, setConfirmUnpublishOpen] = useState<boolean>(false);

  // Quarantined tags state (from AI import or previous audit)
  const [quarantinedTags, setQuarantinedTags] = useState<string[]>(() => {
    if (
      initialImportReport?.quarantinedTaxonomySuggestions &&
      initialImportReport.quarantinedTaxonomySuggestions.length > 0
    ) {
      return initialImportReport.quarantinedTaxonomySuggestions.map((s) => s.rawValue);
    }
    return Array.isArray((doc as any)._quarantinedInterestTags)
      ? [...(doc as any)._quarantinedInterestTags]
      : [];
  });

  const isSanityDraft =
    doc._id.startsWith('drafts.') || doc._sourceOrigin === 'sanity-content-lake';
  const isPublishedSanity =
    !isSanityDraft && doc._sourceOrigin === 'sanity-published';
  const isLocalReference = !isSanityDraft && !isPublishedSanity;
  const isBusyOpeningDraft = openingDraftDocId === doc._id;

  const commitDocumentPatch = (
    patch: Record<string, any>,
    options?: { clearFields?: string[] }
  ) => {
    onUpdateDocument(applyEditorialDocumentPatch(doc, patch, options));
  };

  // Generic single-field Updater
  const updateField = (fieldName: string, value: any) => {
    commitDocumentPatch({ [fieldName]: value });
  };

  // Helper to toggle multi-select tags
  const toggleArrayItem = (fieldName: string, item: string) => {
    const currentList: string[] = Array.isArray(doc[fieldName]) ? [...doc[fieldName]] : [];
    const index = currentList.indexOf(item);
    if (index >= 0) {
      currentList.splice(index, 1);
    } else {
      currentList.push(item);
    }
    updateField(fieldName, currentList);
  };

  // Interactive Quarantined Tag Mapping
  const handleMapQuarantinedTag = (tag: string, canonicalInterest: string) => {
    const currentInterests: string[] = Array.isArray(doc.interests) ? [...doc.interests] : [];
    if (!currentInterests.includes(canonicalInterest)) {
      currentInterests.push(canonicalInterest);
    }
    const nextQuarantined = quarantinedTags.filter((t) => t !== tag);
    setQuarantinedTags(nextQuarantined);
    commitDocumentPatch({
      interests: currentInterests,
      _quarantinedInterestTags: nextQuarantined,
    });
  };

  const handleDismissQuarantinedTag = (tag: string) => {
    const nextQuarantined = quarantinedTags.filter((t) => t !== tag);
    setQuarantinedTags(nextQuarantined);
    commitDocumentPatch({
      _quarantinedInterestTags: nextQuarantined,
    });
  };

  const hasValidPositivePrice =
    typeof doc.price === 'number' && Number.isFinite(doc.price) && doc.price > 0;
  const hasExplicitStockBoolean = typeof doc.inStock === 'boolean';

  // Explicit verification helpers (never fabricate price or stock status)
  const handleMarkPriceVerified = () => {
    if (!hasValidPositivePrice) return;
    const existingNote =
      typeof doc.priceVerificationEvidenceNote === 'string' &&
      doc.priceVerificationEvidenceNote.trim().length >= 8
        ? doc.priceVerificationEvidenceNote.trim()
        : `Verified $${doc.price} USD against ${
            doc.purchaseUrl || 'merchant page'
          } on ${new Date().toISOString().slice(0, 10)}`;
    const existingSource =
      typeof doc.priceVerificationSource === 'string' &&
      doc.priceVerificationSource !== 'unverified'
        ? doc.priceVerificationSource
        : 'manual-merchant-check';
    commitDocumentPatch({
      priceVerified: true,
      priceVerificationSource: existingSource,
      priceVerifiedAt: new Date().toISOString().slice(0, 10),
      priceVerificationEvidenceNote: existingNote,
    });
  };

  const handleClearPriceVerification = () => {
    commitDocumentPatch(
      {
        priceVerified: false,
        priceVerificationSource: 'unverified',
      },
      { clearFields: ['priceVerifiedAt', 'priceVerificationEvidenceNote'] }
    );
  };

  const handleMarkStockVerified = () => {
    if (!hasExplicitStockBoolean) return;
    const existingSource =
      typeof doc.inventoryVerificationSource === 'string' &&
      doc.inventoryVerificationSource !== 'unverified'
        ? doc.inventoryVerificationSource
        : 'manual-merchant-check';
    commitDocumentPatch({
      inventoryVerified: true,
      inventoryVerificationSource: existingSource,
      inventoryVerifiedAt: new Date().toISOString().slice(0, 10),
    });
  };

  const handleClearStockVerification = () => {
    commitDocumentPatch(
      {
        inventoryVerified: false,
        inventoryVerificationSource: 'unverified',
      },
      { clearFields: ['inventoryVerifiedAt'] }
    );
  };

  const handleReloadLatest = async () => {
    if (!onReloadDocumentFromSanity || !isSanityDraft) return;
    setIsReloadingFromSanity(true);
    try {
      await onReloadDocumentFromSanity(doc._id);
    } finally {
      setIsReloadingFromSanity(false);
    }
  };

  // Generated Revision Brief
  const generatedRevisionBrief = useMemo(() => {
    if (!showRevisionBriefModal) return null;
    return generateProductAiWritingBrief({
      mode: 'revision',
      productUrl: doc.purchaseUrl || `https://example.com/products/${doc.slug?.current || 'item'}`,
      existingProduct: doc,
      revisionGoals: revisionGoals.trim() || undefined,
      uploadedImages: Array.isArray(doc.images) ? doc.images : undefined,
    });
  }, [showRevisionBriefModal, doc, revisionGoals]);

  // Handle Revision Import
  const handleApplyRevisionImport = () => {
    setRevisionImportError(null);
    if (!revisionImportText.trim()) {
      setRevisionImportError('Please paste the revision response.');
      return;
    }

    try {
      const report = importProductInterchangeResponse({
        rawInput: revisionImportText,
        expectedMode: 'revision',
        workspaceDocuments,
        enforceVerifiedFactProtection: true,
        existingDraftImages: Array.isArray(doc.images) ? doc.images : undefined,
      });

      if (!report.ok || !report.candidateSanityDraft) {
        setRevisionImportError(
          report.errors?.[0]?.message || 'Failed to merge revision response.'
        );
        return;
      }

      onUpdateDocument({
        _type: 'product',
        ...report.candidateSanityDraft,
        _id: doc._id, // Preserve exact draft ID
        _rev: doc._rev,
        _sourceOrigin: 'sanity-content-lake',
      });

      if (
        report.quarantinedTaxonomySuggestions &&
        report.quarantinedTaxonomySuggestions.length > 0
      ) {
        setQuarantinedTags(
          report.quarantinedTaxonomySuggestions.map((s) => s.rawValue)
        );
      }

      setShowRevisionImportModal(false);
      setRevisionImportText('');
    } catch (err: any) {
      setRevisionImportError(err?.message || 'Error processing revision response.');
    }
  };

  // Resolved canonical structured data accessors
  const resolvedVerdict = resolveGiftVerdictForEditor(doc);
  const resolvedRecipientProfile = resolveRecipientProfileForEditor(doc);
  const extendedRationaleParagraphs = resolveExtendedRationaleParagraphsForEditor(doc);
  const buyingConsiderations = resolveBuyingConsiderationsForEditor(doc);
  const occasionNotes = resolveOccasionNotesForEditor(doc);
  const specs = resolveSpecificationsForEditor(doc);

  const handleUpdateSpec = (
    idx: number,
    patch: Partial<{ label: string; value: string }>
  ) => {
    const nextSpecs = specs.map((item, i) =>
      i === idx
        ? {
            _type: 'productSpecificationItem' as const,
            _key: item._key,
            label: patch.label !== undefined ? patch.label : item.label,
            value: patch.value !== undefined ? patch.value : item.value,
          }
        : item
    );
    updateField('specifications', nextSpecs);
  };

  const handleAddSpec = () => {
    updateField('specifications', [
      ...specs,
      {
        _type: 'productSpecificationItem',
        _key: `spec_${Date.now().toString(36)}_${specs.length + 1}`,
        label: '',
        value: '',
      },
    ]);
  };

  const handleRemoveSpec = (idx: number) => {
    updateField(
      'specifications',
      specs.filter((_, i) => i !== idx)
    );
  };

  // Raw Interchange JSON
  const canonicalInterchangeJson = useMemo(() => {
    try {
      return JSON.stringify(mapExistingProductToInterchangeV1(doc as any), null, 2);
    } catch {
      return JSON.stringify(doc, null, 2);
    }
  }, [doc]);

  const [copiedRawJson, setCopiedRawJson] = useState(false);
  const handleCopyRawJson = () => {
    navigator.clipboard.writeText(canonicalInterchangeJson);
    setCopiedRawJson(true);
    setTimeout(() => setCopiedRawJson(false), 2000);
  };

  const currentSlugString =
    typeof doc.slug === 'string' ? doc.slug : doc.slug?.current || '';
  const canonicalPathValue =
    typeof doc.seo?.canonicalPath === 'string' ? doc.seo.canonicalPath : '';
  const expectedCanonicalPathWithSlash = currentSlugString
    ? `/products/${currentSlugString}/`
    : '';
  const canonicalPathWarning =
    canonicalPathValue &&
    (!canonicalPathValue.endsWith('/') ||
      (expectedCanonicalPathWithSlash &&
        canonicalPathValue !== expectedCanonicalPathWithSlash))
      ? `Stored canonicalPath is "${canonicalPathValue}". Standard route format is "${
          expectedCanonicalPathWithSlash || '/products/<slug>/'
        }". Edit below only if intentionally overriding.`
      : null;

  const publishReadiness = useMemo(() => {
    const check = validateProductPublicationReadiness(doc);
    const lifecycle = evaluateProductPublicationLifecycle({
      ...doc,
      status: 'published',
    });
    return { check, lifecycle };
  }, [doc]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F6] overflow-y-auto">
      {/* =========================================================================
       * 1. STICKY ACTION HEADER
       * ========================================================================= */}
      <header className="px-8 py-4 border-b border-[#E2E8F0] bg-white sticky top-0 z-20 shadow-xs">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Back button and status pill */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToLibrary}
              className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Products</span>
            </button>
            <span className="text-[#CBD5E1]">/</span>

            {/* Document Origin & Persistence State Pill */}
            <div className="flex items-center gap-2 min-w-0">
              {isSanityDraft ? (
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    persistenceState === 'saved'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : persistenceState === 'saving'
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : persistenceState === 'unsaved'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      persistenceState === 'saved'
                        ? 'bg-emerald-500'
                        : persistenceState === 'saving'
                        ? 'bg-blue-500 animate-spin'
                        : persistenceState === 'unsaved'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <span>
                    {isSanityDraft && doc._hasPublishedPartner
                      ? 'Published · Unpublished Changes · '
                      : 'Sanity Draft · '}
                    {persistenceState === 'saved'
                      ? 'Saved in Lake'
                      : persistenceState === 'saving'
                      ? 'Saving to Sanity...'
                      : persistenceState === 'unsaved'
                      ? 'Unsaved Changes'
                      : 'Sync Error'}
                  </span>
                </div>
              ) : isPublishedSanity ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#1B3D5F] border border-blue-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1B3D5F]" />
                  <span>Published in Sanity</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                  <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
                  <span>Local Catalog Reference</span>
                </div>
              )}

              {doc._rev && (
                <span className="hidden sm:inline font-mono text-[10px] text-[#94A3B8] truncate max-w-[120px]" title={`Sanity Revision: ${doc._rev}`}>
                  rev:{doc._rev.slice(0, 8)}…
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* AI Revision Actions */}
            <button
              type="button"
              onClick={() => setShowRevisionBriefModal(true)}
              className="px-3 py-1.5 text-xs text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors flex items-center gap-1.5 font-medium border border-[#E2E8F0]"
              title="Export Revision Brief for ChatGPT / Claude"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2A5A48]" />
              <span>Revision Brief</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRevisionImportModal(true)}
              className="px-3 py-1.5 text-xs text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors flex items-center gap-1.5 font-medium border border-[#E2E8F0]"
              title="Import Revised JSON Response"
            >
              <Upload className="w-3.5 h-3.5 text-[#2A5A48]" />
              <span>Import Revision</span>
            </button>

            {/* Real Authenticated Draft Preview */}
            <button
              type="button"
              onClick={() => onOpenDraftPreview?.(doc)}
              className="px-3 py-1.5 text-xs text-[#1B3D5F] hover:bg-[#EBF3FE] rounded-lg transition-colors flex items-center gap-1.5 font-medium border border-[#CBD5E1]"
              title="Open live rendered Astro preview"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>

            {(isPublishedSanity || doc._hasPublishedPartner) && currentSlugString && (
              <a
                href={`/products/${currentSlugString}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs text-[#28537D] hover:bg-[#EBF3FE] rounded-lg transition-colors flex items-center gap-1 font-medium border border-[#CBD5E1]"
                title="Open live website product page"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Live</span>
              </a>
            )}

            {/* Save Draft / Publish / Republish / Unpublish / Convert to Sanity Draft */}
            {isSanityDraft ? (
              <>
                <button
                  type="button"
                  onClick={onSaveDraftToSanity}
                  disabled={persistenceState === 'saving' || isPublishing || isUnpublishing}
                  className="px-4 py-1.5 bg-[#2A5A48] hover:bg-[#234b3c] disabled:bg-[#94A3B8] text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                  title="Save draft directly to Sanity Content Lake"
                >
                  {persistenceState === 'saving' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{persistenceState === 'saving' ? 'Saving...' : 'Save Draft'}</span>
                </button>

                {onPublishProductToSanity && (
                  <button
                    type="button"
                    onClick={onPublishProductToSanity}
                    disabled={isPublishing || isUnpublishing || persistenceState === 'saving'}
                    className="px-4 py-1.5 bg-[#1B3D5F] hover:bg-[#28537D] disabled:bg-[#94A3B8] text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                    title="Publish product to Sanity Content Lake and Astro website"
                  >
                    {isPublishing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isPublishing
                        ? 'Publishing...'
                        : doc._hasPublishedPartner
                        ? 'Republish Changes'
                        : 'Publish to Website'}
                    </span>
                  </button>
                )}

                {doc._hasPublishedPartner && onUnpublishProductToSanity && (
                  confirmUnpublishOpen ? (
                    <div className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1">
                      <button
                        type="button"
                        disabled={isUnpublishing}
                        onClick={async () => {
                          setConfirmUnpublishOpen(false);
                          await onUnpublishProductToSanity();
                        }}
                        className="px-2 py-0.5 bg-amber-700 hover:bg-amber-800 text-white rounded text-[11px] font-semibold"
                      >
                        {isUnpublishing ? 'Unpublishing...' : 'Confirm Unpublish'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmUnpublishOpen(false)}
                        className="px-2 py-0.5 text-[11px] text-[#475569] hover:text-[#0F172A] font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isUnpublishing || isPublishing}
                      onClick={() => setConfirmUnpublishOpen(true)}
                      className="px-3 py-1.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold transition-all"
                      title="Remove live public product page while keeping this draft intact"
                    >
                      {isUnpublishing ? 'Unpublishing...' : 'Unpublish'}
                    </button>
                  )
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isBusyOpeningDraft || isUnpublishing}
                  onClick={() => onCloneReferenceToDraft(doc)}
                  className="px-4 py-1.5 bg-[#2A5A48] hover:bg-[#234b3c] disabled:bg-[#94A3B8] text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                  title={
                    isPublishedSanity
                      ? 'Open editable draft revision in Sanity'
                      : 'Convert local reference to an editable Sanity Draft'
                  }
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>
                    {isBusyOpeningDraft
                      ? 'Preparing Draft...'
                      : isPublishedSanity
                      ? 'Edit as Draft'
                      : 'Create Sanity Draft'}
                  </span>
                </button>

                {isPublishedSanity && onUnpublishProductToSanity && (
                  confirmUnpublishOpen ? (
                    <div className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1">
                      <button
                        type="button"
                        disabled={isUnpublishing}
                        onClick={async () => {
                          setConfirmUnpublishOpen(false);
                          await onUnpublishProductToSanity();
                        }}
                        className="px-2 py-0.5 bg-amber-700 hover:bg-amber-800 text-white rounded text-[11px] font-semibold"
                      >
                        {isUnpublishing ? 'Unpublishing...' : 'Confirm Unpublish'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmUnpublishOpen(false)}
                        className="px-2 py-0.5 text-[11px] text-[#475569] hover:text-[#0F172A] font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isUnpublishing || isBusyOpeningDraft}
                      onClick={() => setConfirmUnpublishOpen(true)}
                      className="px-3 py-1.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold transition-all"
                      title="Unpublish live website product back to editable draft"
                    >
                      {isUnpublishing ? 'Unpublishing...' : 'Unpublish'}
                    </button>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Review Column (Comfortable 820-860px reading width) */}
      <main className="max-w-4xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Local Reference Guidance Notice */}
        {(isLocalReference || isPublishedSanity) && (
          <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {isPublishedSanity ? (
                  <>
                    You are viewing the live <strong>Published Sanity Product</strong>. Click{' '}
                    <strong>Edit as Draft</strong> to open an editable draft revision without modifying the live page until published.
                  </>
                ) : (
                  <>
                    You are viewing a <strong>Local Catalog Reference</strong>. Click{' '}
                    <strong>Create Sanity Draft</strong> to convert it into an editable Sanity draft.
                  </>
                )}
              </span>
            </div>
            <button
              type="button"
              disabled={isBusyOpeningDraft}
              onClick={() => onCloneReferenceToDraft(doc)}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg font-semibold shrink-0 text-xs shadow-xs"
            >
              {isBusyOpeningDraft
                ? 'Preparing...'
                : isPublishedSanity
                ? 'Edit as Draft'
                : 'Create Draft'}
            </button>
          </div>
        )}

        {/* Post-Publish / Post-Unpublish Feedback Banner */}
        {publishResult?.ok && (
          <div
            className={`p-4 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 border ${
              publishResult.action === 'unpublished'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-start gap-2">
              {publishResult.action === 'unpublished' ? (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{publishResult.message}</p>
                {publishResult.lifecycle?.robotsDirective && (
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Robots policy: <code className="font-mono">{publishResult.lifecycle.robotsDirective}</code> · Transaction:{' '}
                    <code className="font-mono">{publishResult.transactionId || 'committed'}</code>
                  </p>
                )}
                {publishResult.action === 'unpublished' && publishResult.transactionId && (
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Transaction: <code className="font-mono">{publishResult.transactionId}</code> · Draft content preserved cleanly.
                  </p>
                )}
              </div>
            </div>
            {publishResult.action !== 'unpublished' && publishResult.livePath && (
              <a
                href={publishResult.livePath}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-[#1B3D5F] hover:bg-[#28537D] text-white rounded-lg font-semibold inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View {publishResult.livePath}</span>
              </a>
            )}
          </div>
        )}

        {/* Server Persistence Error Banner */}
        {persistenceError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold">
                  {persistenceError.toLowerCase().includes('revision conflict')
                    ? 'Revision Conflict Detected'
                    : 'Persistence Error'}
                </p>
                <p className="mt-0.5">{persistenceError}</p>
                {serverValidationIssues.length > 0 && (
                  <ul className="mt-2 list-disc list-inside space-y-0.5 text-[11px] text-red-700">
                    {serverValidationIssues.map((issue, idx) => (
                      <li key={`${issue.path}_${idx}`}>
                        <span className="font-mono">{issue.path}</span>: {issue.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {isSanityDraft && onReloadDocumentFromSanity && (
              <button
                type="button"
                onClick={handleReloadLatest}
                disabled={isReloadingFromSanity}
                className="px-3 py-1.5 bg-white hover:bg-red-100 text-red-800 border border-red-300 rounded-lg font-semibold text-xs shrink-0 inline-flex items-center gap-1.5"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isReloadingFromSanity ? 'animate-spin' : ''}`}
                />
                <span>
                  {isReloadingFromSanity ? 'Reloading...' : 'Reload from Sanity'}
                </span>
              </button>
            )}
          </div>
        )}

        {/* =========================================================================
         * 2. PRIORITIZED VALIDATION & FACT-CHECK BANNER
         * ========================================================================= */}
        {(!doc.priceVerified || !doc.inventoryVerified || quarantinedTags.length > 0) && (
          <section className="bg-white border-l-4 border-l-amber-500 border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Editorial Verification & Taxonomy Checks
              </h2>
              <span className="text-[11px] text-[#64748B]">Review required before publishing</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Price Verification Check */}
              {!doc.priceVerified && (
                <div className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-[#0F172A] block">
                      Price Unverified (
                      {hasValidPositivePrice ? `$${doc.price} USD` : 'Unknown / unverified'})
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      {hasValidPositivePrice
                        ? 'Confirm price and verification source against merchant.'
                        : 'Enter a positive verified USD price below before marking price verified.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkPriceVerified}
                    disabled={!hasValidPositivePrice}
                    className={`px-2.5 py-1 border rounded-md font-semibold text-[11px] shrink-0 ${
                      hasValidPositivePrice
                        ? 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed'
                    }`}
                  >
                    Verify Price
                  </button>
                </div>
              )}

              {/* Stock Verification Check */}
              {!doc.inventoryVerified && (
                <div className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-[#0F172A] block">
                      Inventory Status Unverified (
                      {doc.inStock === true
                        ? 'In Stock'
                        : doc.inStock === false
                        ? 'Out of Stock'
                        : 'Unknown'})
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      {hasExplicitStockBoolean
                        ? 'Confirm current merchant stock status to mark inventory verified.'
                        : 'Select In Stock or Out of Stock below before marking inventory verified.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkStockVerified}
                    disabled={!hasExplicitStockBoolean}
                    className={`px-2.5 py-1 border rounded-md font-semibold text-[11px] shrink-0 ${
                      hasExplicitStockBoolean
                        ? 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed'
                    }`}
                  >
                    Verify Stock
                  </button>
                </div>
              )}
            </div>

            {/* Quarantined Tag Mapper */}
            {quarantinedTags.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50/50 border border-amber-200 rounded-lg text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-900">
                    Quarantined Non-Canonical Tags ({quarantinedTags.length})
                  </span>
                  <span className="text-[10px] text-amber-700">
                    Map to approved canonical interests or dismiss
                  </span>
                </div>
                <div className="space-y-2">
                  {quarantinedTags.map((tag) => (
                    <div
                      key={tag}
                      className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white rounded-md border border-amber-200"
                    >
                      <span className="font-mono text-[11px] font-medium text-amber-800">
                        "{tag}"
                      </span>
                      <div className="flex items-center gap-1.5">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleMapQuarantinedTag(tag, e.target.value);
                            }
                          }}
                          className="px-2 py-0.5 text-[11px] bg-[#FAF9F6] border border-[#CBD5E1] rounded text-[#0F172A]"
                        >
                          <option value="">Map to Canonical Interest...</option>
                          {INTEREST_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.title}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDismissQuarantinedTag(tag)}
                          className="px-2 py-0.5 text-[10px] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* =========================================================================
         * 3. PRIMARY EDITORIAL HERO & NARRATIVE FLOW (Focused Writing)
         * ========================================================================= */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs space-y-6">
          {/* Dominant Headline */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1">
              Editorial Product Title
            </label>
            <input
              type="text"
              value={doc.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g. Hasami Porcelain Stacking Mug & Walnut Saucer"
              className="w-full font-serif text-3xl font-semibold text-[#0F172A] leading-tight border-b border-transparent hover:border-[#CBD5E1] focus:border-[#2A5A48] focus:outline-none pb-1 transition-colors"
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1">
              Editorial Subtitle & Hook
            </label>
            <input
              type="text"
              value={doc.subtitle || ''}
              onChange={(e) => updateField('subtitle', e.target.value)}
              placeholder="e.g. Tactile Japanese stoneware engineered for meditative morning coffee rituals."
              className="w-full text-base text-[#475569] italic border-b border-transparent hover:border-[#CBD5E1] focus:border-[#2A5A48] focus:outline-none pb-1 transition-colors"
            />
          </div>

          {/* Key Facts Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl text-xs">
            <div>
              <span className="block text-[10px] uppercase font-bold text-[#94A3B8]">Maker / Vendor</span>
              <input
                type="text"
                value={doc.vendor || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val.trim()) {
                    commitDocumentPatch(
                      { vendor: val === '' ? undefined : val },
                      val === '' ? { clearFields: ['vendor'] } : undefined
                    );
                  } else {
                    commitDocumentPatch({ vendor: val });
                  }
                }}
                placeholder="Maker name"
                className="font-medium text-[#0F172A] bg-transparent border-b border-transparent hover:border-[#CBD5E1] focus:border-[#2A5A48] focus:outline-none w-full"
              />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-[#94A3B8]">Price (USD)</span>
              <div className="flex items-center gap-1">
                <span className="text-[#64748B]">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={hasValidPositivePrice ? doc.price : ''}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    const parsed = raw === '' ? null : Number(raw);
                    if (
                      parsed === null ||
                      Number.isNaN(parsed) ||
                      !Number.isFinite(parsed) ||
                      parsed <= 0
                    ) {
                      commitDocumentPatch(
                        {
                          price: undefined,
                          budgetTier: undefined,
                          guidePriceBucket: undefined,
                          priceVerified: false,
                          priceVerificationSource: 'unverified',
                          priceVerifiedAt: undefined,
                          priceVerificationEvidenceNote: undefined,
                        },
                        {
                          clearFields: [
                            'price',
                            'budgetTier',
                            'guidePriceBucket',
                            'priceVerifiedAt',
                            'priceVerificationEvidenceNote',
                          ],
                        }
                      );
                    } else {
                      const nextPatch: Record<string, any> = {
                        price: parsed,
                        budgetTier: deriveBudgetTierFromPrice(parsed),
                        guidePriceBucket: deriveGuidePriceBucketFromPrice(parsed),
                      };
                      const clears: string[] = [];
                      if (doc.price !== parsed) {
                        nextPatch.priceVerified = false;
                        nextPatch.priceVerificationSource = 'unverified';
                        nextPatch.priceVerifiedAt = undefined;
                        clears.push('priceVerifiedAt');
                      }
                      commitDocumentPatch(
                        nextPatch,
                        clears.length > 0 ? { clearFields: clears } : undefined
                      );
                    }
                  }}
                  placeholder="Unknown / unverified"
                  className="font-medium text-[#0F172A] bg-transparent border-b border-transparent hover:border-[#CBD5E1] focus:border-[#2A5A48] focus:outline-none w-full"
                />
              </div>
              {!hasValidPositivePrice && (
                <span className="block text-[10px] text-amber-700 mt-0.5">
                  Unverified (budget tier unassigned)
                </span>
              )}
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-[#94A3B8]">Category</span>
              <select
                value={doc.productType || ''}
                onChange={(e) => updateField('productType', e.target.value)}
                className="font-medium text-[#0F172A] bg-transparent focus:outline-none w-full truncate"
              >
                <option value="">Select Category...</option>
                {PRODUCT_CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-[#94A3B8]">Stock Status</span>
              <select
                value={doc.inStock === true ? 'true' : doc.inStock === false ? 'false' : 'null'}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === 'null') {
                    commitDocumentPatch(
                      {
                        inStock: undefined,
                        inventoryVerified: false,
                        inventoryVerificationSource: 'unverified',
                        inventoryVerifiedAt: undefined,
                      },
                      { clearFields: ['inStock', 'inventoryVerifiedAt'] }
                    );
                  } else {
                    const nextStock = raw === 'true';
                    const nextPatch: Record<string, any> = { inStock: nextStock };
                    const clears: string[] = [];
                    if (doc.inStock !== nextStock) {
                      nextPatch.inventoryVerified = false;
                      nextPatch.inventoryVerificationSource = 'unverified';
                      nextPatch.inventoryVerifiedAt = undefined;
                      clears.push('inventoryVerifiedAt');
                    }
                    commitDocumentPatch(
                      nextPatch,
                      clears.length > 0 ? { clearFields: clears } : undefined
                    );
                  }
                }}
                className={`font-semibold bg-transparent focus:outline-none w-full ${
                  doc.inStock === true
                    ? 'text-emerald-700'
                    : doc.inStock === false
                    ? 'text-amber-700'
                    : 'text-[#64748B]'
                }`}
              >
                <option value="true">● In Stock</option>
                <option value="false">● Out of Stock</option>
                <option value="null">● Unknown / Unverified</option>
              </select>
            </div>
          </div>

          {/* Best-For Callout */}
          <div className="p-4 bg-[#2A5A48]/5 border-l-4 border-l-[#2A5A48] rounded-r-xl">
            <label className="block text-[10px] uppercase font-bold tracking-wider text-[#2A5A48] mb-1">
              Best-For Editorial Summary
            </label>
            <textarea
              rows={2}
              value={doc.bestForSummary || ''}
              onChange={(e) => updateField('bestForSummary', e.target.value)}
              placeholder="e.g. Best for design-conscious homebodies and slow morning ritualists who value understated tableware."
              className="w-full text-xs text-[#0F172A] bg-transparent focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Why To Give It & Details/Care */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Why To Give It (Core Emotional Gift Rationale)
              </label>
              <textarea
                rows={4}
                value={doc.whyToGiveIt || ''}
                onChange={(e) => updateField('whyToGiveIt', e.target.value)}
                placeholder="Explain the emotional and relational weight of giving this item..."
                className="w-full p-3 text-xs text-[#0F172A] bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2A5A48] leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Materials, Dimensions &amp; Care Summary
              </label>
              <textarea
                rows={4}
                value={doc.detailsAndCare || ''}
                onChange={(e) => updateField('detailsAndCare', e.target.value)}
                placeholder="Materials, sizing, origin, and care instructions..."
                className="w-full p-3 text-xs text-[#0F172A] bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2A5A48] leading-relaxed"
              />
            </div>
          </div>

          {/* =========================================================================
           * 4-PART GIFT VERDICT (Canonical Nested `doc.giftVerdict`)
           * ========================================================================= */}
          <div className="pt-4 border-t border-[#F1F5F9] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-semibold text-[#0F172A]">
                  The 4-Part Science of Gifts Verdict
                </h3>
                <p className="text-xs text-[#64748B]">
                  Canonical editorial verdict fields stored under <code>giftVerdict</code>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Editorial Assessment */}
              <div className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl space-y-1">
                <label className="block text-[10px] uppercase font-bold text-[#2A5A48]">
                  1. Editorial Assessment
                </label>
                <textarea
                  rows={3}
                  value={resolvedVerdict.editorialAssessment}
                  onChange={(e) =>
                    commitDocumentPatch({
                      giftVerdict: buildCanonicalGiftVerdictUpdate(
                        doc,
                        'editorialAssessment',
                        e.target.value
                      ),
                    })
                  }
                  placeholder="Summary verdict and definitive editorial recommendation..."
                  className="w-full text-xs text-[#0F172A] bg-transparent focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* 2. Standout Reason */}
              <div className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl space-y-1">
                <label className="block text-[10px] uppercase font-bold text-[#2A5A48]">
                  2. Standout Reason
                </label>
                <textarea
                  rows={3}
                  value={resolvedVerdict.standoutReason}
                  onChange={(e) =>
                    commitDocumentPatch({
                      giftVerdict: buildCanonicalGiftVerdictUpdate(
                        doc,
                        'standoutReason',
                        e.target.value
                      ),
                    })
                  }
                  placeholder="What makes this maker, material, or format stand apart from generic alternatives..."
                  className="w-full text-xs text-[#0F172A] bg-transparent focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* 3. Recipient Delight */}
              <div className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl space-y-1">
                <label className="block text-[10px] uppercase font-bold text-[#2A5A48]">
                  3. Recipient Delight
                </label>
                <textarea
                  rows={3}
                  value={resolvedVerdict.recipientDelight}
                  onChange={(e) =>
                    commitDocumentPatch({
                      giftVerdict: buildCanonicalGiftVerdictUpdate(
                        doc,
                        'recipientDelight',
                        e.target.value
                      ),
                    })
                  }
                  placeholder="How the gift feels to unwrap and live with in the recipient's daily routine..."
                  className="w-full text-xs text-[#0F172A] bg-transparent focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* 4. Important Caveat */}
              <div className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl space-y-1">
                <label className="block text-[10px] uppercase font-bold text-[#2A5A48]">
                  4. Important Caveat (Optional)
                </label>
                <textarea
                  rows={3}
                  value={resolvedVerdict.importantCaveat}
                  onChange={(e) =>
                    commitDocumentPatch(
                      {
                        giftVerdict: buildCanonicalGiftVerdictUpdate(
                          doc,
                          'importantCaveat',
                          e.target.value
                        ),
                      },
                      e.target.value === ''
                        ? { clearFields: ['giftVerdict.importantCaveat'] }
                        : undefined
                    )
                  }
                  placeholder="Fragility, sizing constraints, hand-wash care, or who should skip it..."
                  className="w-full text-xs text-[#0F172A] bg-transparent focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* =========================================================================
           * IDEAL RECIPIENT PROFILE (Canonical Structured Object)
           * ========================================================================= */}
          <div className="pt-4 border-t border-[#F1F5F9] space-y-4">
            <div>
              <h3 className="font-serif text-base font-semibold text-[#0F172A]">
                Ideal Recipient Profile
              </h3>
              <p className="text-xs text-[#64748B]">
                Structured persona headline, fit narrative, lifestyle signals, and relationship contexts.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Recipient Profile Headline
                </label>
                <input
                  type="text"
                  value={resolvedRecipientProfile.headline}
                  onChange={(e) =>
                    commitDocumentPatch({
                      idealRecipientProfile: buildCanonicalRecipientProfileUpdate(
                        doc,
                        { headline: e.target.value }
                      ),
                    })
                  }
                  placeholder="e.g. Built for psychology majors, campus regulars, and practical hoodie devotees"
                  className="w-full px-3 py-2 text-xs text-[#0F172A] bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2A5A48]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Recipient Fit Narrative
                </label>
                <textarea
                  rows={3}
                  value={resolvedRecipientProfile.narrative}
                  onChange={(e) =>
                    commitDocumentPatch({
                      idealRecipientProfile: buildCanonicalRecipientProfileUpdate(
                        doc,
                        { narrative: e.target.value }
                      ),
                    })
                  }
                  placeholder="Persona description of the person who cherishes this gift most..."
                  className="w-full p-3 text-xs text-[#0F172A] bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2A5A48] leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Lifestyle Notes Array */}
                <div className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#475569]">
                      Lifestyle &amp; Personality Notes ({resolvedRecipientProfile.lifestyleNotes.length})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        commitDocumentPatch({
                          idealRecipientProfile: buildCanonicalRecipientProfileUpdate(
                            doc,
                            {
                              lifestyleNotes: [
                                ...resolvedRecipientProfile.lifestyleNotes,
                                '',
                              ],
                            }
                          ),
                        })
                      }
                      className="text-[11px] text-[#2A5A48] hover:underline font-semibold inline-flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                  {resolvedRecipientProfile.lifestyleNotes.length === 0 ? (
                    <p className="text-[11px] text-[#94A3B8] italic">
                      No lifestyle notes added yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {resolvedRecipientProfile.lifestyleNotes.map((note, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <input
                            type="text"
                            value={note}
                            onChange={(e) => {
                              const next = [...resolvedRecipientProfile.lifestyleNotes];
                              next[idx] = e.target.value;
                              commitDocumentPatch({
                                idealRecipientProfile: buildCanonicalRecipientProfileUpdate(
                                  doc,
                                  { lifestyleNotes: next }
                                ),
                              });
                            }}
                            placeholder="Everyday habit or personality signal..."
                            className="flex-1 px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs"
                          />
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() =>
                              commitDocumentPatch({
                                idealRecipientProfile: buildCanonicalRecipientProfileUpdate(
                                  doc,
                                  {
                                    lifestyleNotes: reorderListItems(
                                      resolvedRecipientProfile.lifestyleNotes,
                                      idx,
                                      idx - 1
                                    ),
                                  }
                                ),
                              })
                            }
                            className="p-1 text-[#64748B] hover:text-[#0F172A] disabled:opacity-30"
                            title="Move up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={
                              idx === resolvedRecipientProfile.lifestyleNotes.length - 1
                            }
                            onClick={() =>
                              commitDocumentPatch({
                                idealRecipientProfile: buildCanonicalRecipientProfileUpdate(
                                  doc,
                                  {
                                    lifestyleNotes: reorderListItems(
                                      resolvedRecipientProfile.lifestyleNotes,
                                      idx,
                                      idx + 1
                                    ),
                                  }
                                ),
                              })
                            }
                            className="p-1 text-[#64748B] hover:text-[#0F172A] disabled:opacity-30"
                            title="Move down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              commitDocumentPatch({
                                idealRecipientProfile: buildCanonicalRecipientProfileUpdate(
                                  doc,
                                  {
                                    lifestyleNotes:
                                      resolvedRecipientProfile.lifestyleNotes.filter(
                                        (_, i) => i !== idx
                                      ),
                                  }
                                ),
                              })
                            }
                            className="p-1 text-[#94A3B8] hover:text-red-600"
                            title="Remove"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Relationship Fit Array */}
                <div className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#475569]">
                      Best Relationship Fit ({resolvedRecipientProfile.relationshipFit.length})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        commitDocumentPatch({
                          idealRecipientProfile: buildCanonicalRecipientProfileUpdate(
                            doc,
                            {
                              relationshipFit: [
                                ...resolvedRecipientProfile.relationshipFit,
                                '',
                              ],
                            }
                          ),
                        })
                      }
                      className="text-[11px] text-[#2A5A48] hover:underline font-semibold inline-flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                  {resolvedRecipientProfile.relationshipFit.length === 0 ? (
                    <p className="text-[11px] text-[#94A3B8] italic">
                      No relationship fit contexts added yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {resolvedRecipientProfile.relationshipFit.map((rel, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <input
                            type="text"
                            value={rel}
                            onChange={(e) => {
                              const next = [...resolvedRecipientProfile.relationshipFit];
                              next[idx] = e.target.value;
                              commitDocumentPatch({
                                idealRecipientProfile: buildCanonicalRecipientProfileUpdate(
                                  doc,
                                  { relationshipFit: next }
                                ),
                              });
                            }}
                            placeholder="e.g. Close friend or college sibling..."
                            className="flex-1 px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs"
                          />
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() =>
                              commitDocumentPatch({
                                idealRecipientProfile: buildCanonicalRecipientProfileUpdate(
                                  doc,
                                  {
                                    relationshipFit: reorderListItems(
                                      resolvedRecipientProfile.relationshipFit,
                                      idx,
                                      idx - 1
                                    ),
                                  }
                                ),
                              })
                            }
                            className="p-1 text-[#64748B] hover:text-[#0F172A] disabled:opacity-30"
                            title="Move up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={
                              idx === resolvedRecipientProfile.relationshipFit.length - 1
                            }
                            onClick={() =>
                              commitDocumentPatch({
                                idealRecipientProfile: buildCanonicalRecipientProfileUpdate(
                                  doc,
                                  {
                                    relationshipFit: reorderListItems(
                                      resolvedRecipientProfile.relationshipFit,
                                      idx,
                                      idx + 1
                                    ),
                                  }
                                ),
                              })
                            }
                            className="p-1 text-[#64748B] hover:text-[#0F172A] disabled:opacity-30"
                            title="Move down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              commitDocumentPatch({
                                idealRecipientProfile: buildCanonicalRecipientProfileUpdate(
                                  doc,
                                  {
                                    relationshipFit:
                                      resolvedRecipientProfile.relationshipFit.filter(
                                        (_, i) => i !== idx
                                      ),
                                  }
                                ),
                              })
                            }
                            className="p-1 text-[#94A3B8] hover:text-red-600"
                            title="Remove"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
           * EXTENDED GIFT RATIONALE (Paragraph Array)
           * ========================================================================= */}
          <div className="pt-4 border-t border-[#F1F5F9] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-semibold text-[#0F172A]">
                  Extended Gift Rationale Paragraphs ({extendedRationaleParagraphs.length})
                </h3>
                <p className="text-xs text-[#64748B]">
                  Multi-paragraph deep dive rendered on product profile pages (stored as an array of separate paragraphs).
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateField('extendedGiftRationale', [
                    ...extendedRationaleParagraphs,
                    '',
                  ])
                }
                className="px-3 py-1.5 text-xs text-[#2A5A48] hover:bg-[#2A5A48]/10 rounded-lg font-semibold inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Paragraph</span>
              </button>
            </div>

            {extendedRationaleParagraphs.length === 0 ? (
              <p className="text-xs text-[#94A3B8] italic">
                No extended rationale paragraphs added yet. Click &ldquo;Add Paragraph&rdquo; to create one.
              </p>
            ) : (
              <div className="space-y-3">
                {extendedRationaleParagraphs.map((para, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[#64748B]">
                        Paragraph {idx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() =>
                            updateField(
                              'extendedGiftRationale',
                              reorderListItems(extendedRationaleParagraphs, idx, idx - 1)
                            )
                          }
                          className="p-1 text-[#64748B] hover:text-[#0F172A] disabled:opacity-30"
                          title="Move paragraph up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === extendedRationaleParagraphs.length - 1}
                          onClick={() =>
                            updateField(
                              'extendedGiftRationale',
                              reorderListItems(extendedRationaleParagraphs, idx, idx + 1)
                            )
                          }
                          className="p-1 text-[#64748B] hover:text-[#0F172A] disabled:opacity-30"
                          title="Move paragraph down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              'extendedGiftRationale',
                              extendedRationaleParagraphs.filter((_, i) => i !== idx)
                            )
                          }
                          className="p-1 text-[#94A3B8] hover:text-red-600"
                          title="Remove paragraph"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={3}
                      value={para}
                      onChange={(e) => {
                        const next = [...extendedRationaleParagraphs];
                        next[idx] = e.target.value;
                        updateField('extendedGiftRationale', next);
                      }}
                      placeholder="Deep-dive paragraph on craft, behavioral meaning, or gift longevity..."
                      className="w-full p-2.5 text-xs text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2A5A48] leading-relaxed"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* =========================================================================
         * 4. SECONDARY STRUCTURED DRAWERS / COLLAPSIBLE ACCORDIONS
         * ========================================================================= */}
        <div className="space-y-4">
          {/* Drawer 1: Taxonomy & Classifications */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleAccordion('taxonomy')}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#FAF9F6] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#2A5A48]" />
                <span className="font-serif text-sm font-semibold text-[#0F172A]">
                  Taxonomy, Recipient & Occasion Classifications
                </span>
              </div>
              {openAccordions.taxonomy ? (
                <ChevronDown className="w-4 h-4 text-[#64748B]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#64748B]" />
              )}
            </button>

            {openAccordions.taxonomy && (
              <div className="px-6 pb-6 pt-2 border-t border-[#F1F5F9] space-y-4 text-xs">
                {/* Recipients */}
                <div>
                  <span className="block text-[11px] font-bold uppercase text-[#475569] mb-1.5">
                    Target Recipients
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {RECIPIENT_OPTIONS.map((opt) => {
                      const selected = Array.isArray(doc.recipients) && doc.recipients.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleArrayItem('recipients', opt.value)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            selected
                              ? 'bg-[#2A5A48] text-white font-semibold'
                              : 'bg-[#FAF9F6] text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
                          }`}
                        >
                          {opt.title}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Occasions */}
                <div>
                  <span className="block text-[11px] font-bold uppercase text-[#475569] mb-1.5">
                    Gift Occasions
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {OCCASION_OPTIONS.map((opt) => {
                      const selected = Array.isArray(doc.occasions) && doc.occasions.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleArrayItem('occasions', opt.value)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            selected
                              ? 'bg-[#2A5A48] text-white font-semibold'
                              : 'bg-[#FAF9F6] text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
                          }`}
                        >
                          {opt.title}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Canonical Interests */}
                <div>
                  <span className="block text-[11px] font-bold uppercase text-[#475569] mb-1.5">
                    Canonical Interests
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {INTEREST_OPTIONS.map((opt) => {
                      const selected = Array.isArray(doc.interests) && doc.interests.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleArrayItem('interests', opt.value)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            selected
                              ? 'bg-[#2A5A48] text-white font-semibold'
                              : 'bg-[#FAF9F6] text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
                          }`}
                        >
                          {opt.title}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Personality Traits */}
                <div>
                  <span className="block text-[11px] font-bold uppercase text-[#475569] mb-1.5">
                    Personality Traits
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PERSONALITY_TRAIT_OPTIONS.map((opt) => {
                      const selected = Array.isArray(doc.personalityTraits) && doc.personalityTraits.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleArrayItem('personalityTraits', opt.value)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            selected
                              ? 'bg-[#2A5A48] text-white font-semibold'
                              : 'bg-[#FAF9F6] text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
                          }`}
                        >
                          {opt.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer 2: Photography & Gallery */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleAccordion('gallery')}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#FAF9F6] transition-colors"
            >
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#2A5A48]" />
                <span className="font-serif text-sm font-semibold text-[#0F172A]">
                  Photography & Product Gallery ({Array.isArray(doc.images) ? doc.images.length : 0})
                </span>
              </div>
              {openAccordions.gallery ? (
                <ChevronDown className="w-4 h-4 text-[#64748B]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#64748B]" />
              )}
            </button>

            {openAccordions.gallery && (
              <div className="px-6 pb-6 pt-3 border-t border-[#F1F5F9]">
                <ProductMediaManager
                  images={Array.isArray(doc.images) ? doc.images : []}
                  productTitle={doc.title || 'Product'}
                  productType={doc.productType}
                  onChangeImages={(nextImages) => updateField('images', nextImages)}
                  sessionCredentials={sessionCredentials}
                />
              </div>
            )}
          </div>

          {/* Drawer 2B: Buying Considerations List */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleAccordion('considerations')}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#FAF9F6] transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2A5A48]" />
                <span className="font-serif text-sm font-semibold text-[#0F172A]">
                  Buying Considerations ({buyingConsiderations.length})
                </span>
              </div>
              {openAccordions.considerations ? (
                <ChevronDown className="w-4 h-4 text-[#64748B]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#64748B]" />
              )}
            </button>

            {openAccordions.considerations && (
              <div className="px-6 pb-6 pt-3 border-t border-[#F1F5F9] space-y-3 text-xs">
                {buyingConsiderations.map((item, idx) => (
                  <div
                    key={item._key}
                    className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => {
                          const next = buyingConsiderations.map((b, i) =>
                            i === idx ? { ...b, label: e.target.value } : b
                          );
                          updateField('buyingConsiderationsList', next);
                        }}
                        placeholder="e.g. Sizing & Fit, Care & Maintenance"
                        className="flex-1 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg font-medium"
                      />
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() =>
                          updateField(
                            'buyingConsiderationsList',
                            reorderListItems(buyingConsiderations, idx, idx - 1)
                          )
                        }
                        className="p-1 text-[#64748B] hover:text-[#0F172A] disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === buyingConsiderations.length - 1}
                        onClick={() =>
                          updateField(
                            'buyingConsiderationsList',
                            reorderListItems(buyingConsiderations, idx, idx + 1)
                          )
                        }
                        className="p-1 text-[#64748B] hover:text-[#0F172A] disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateField(
                            'buyingConsiderationsList',
                            buyingConsiderations.filter((_, i) => i !== idx)
                          )
                        }
                        className="p-1.5 text-[#94A3B8] hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={item.detail}
                      onChange={(e) => {
                        const next = buyingConsiderations.map((b, i) =>
                          i === idx ? { ...b, detail: e.target.value } : b
                        );
                        updateField('buyingConsiderationsList', next);
                      }}
                      placeholder="Practical shopper detail (sizing guidance, care, lead time)..."
                      className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    updateField('buyingConsiderationsList', [
                      ...buyingConsiderations,
                      {
                        _type: 'productBuyingConsideration',
                        _key: `buy_cons_${Date.now().toString(36)}_${buyingConsiderations.length + 1}`,
                        label: '',
                        detail: '',
                      },
                    ])
                  }
                  className="px-3 py-1.5 text-xs text-[#2A5A48] hover:bg-[#2A5A48]/10 rounded-lg font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Buying Consideration</span>
                </button>
              </div>
            )}
          </div>

          {/* Drawer 2C: Occasion Context Notes */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleAccordion('occasions')}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#FAF9F6] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2A5A48]" />
                <span className="font-serif text-sm font-semibold text-[#0F172A]">
                  Occasion Context Notes ({occasionNotes.length})
                </span>
              </div>
              {openAccordions.occasions ? (
                <ChevronDown className="w-4 h-4 text-[#64748B]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#64748B]" />
              )}
            </button>

            {openAccordions.occasions && (
              <div className="px-6 pb-6 pt-3 border-t border-[#F1F5F9] space-y-3 text-xs">
                {occasionNotes.map((item, idx) => (
                  <div
                    key={item._key}
                    className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={item.occasion}
                        onChange={(e) => {
                          const next = occasionNotes.map((n, i) =>
                            i === idx ? { ...n, occasion: e.target.value } : n
                          );
                          updateField('occasionContextNotes', next);
                        }}
                        className="px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium"
                      >
                        {OCCASION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.title}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => {
                          const next = occasionNotes.map((n, i) =>
                            i === idx ? { ...n, label: e.target.value } : n
                          );
                          updateField('occasionContextNotes', next);
                        }}
                        placeholder="e.g. Finals Care Package or Graduation Milestone"
                        className="flex-1 min-w-[180px] px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg font-medium"
                      />
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() =>
                          updateField(
                            'occasionContextNotes',
                            reorderListItems(occasionNotes, idx, idx - 1)
                          )
                        }
                        className="p-1 text-[#64748B] hover:text-[#0F172A] disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === occasionNotes.length - 1}
                        onClick={() =>
                          updateField(
                            'occasionContextNotes',
                            reorderListItems(occasionNotes, idx, idx + 1)
                          )
                        }
                        className="p-1 text-[#64748B] hover:text-[#0F172A] disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateField(
                            'occasionContextNotes',
                            occasionNotes.filter((_, i) => i !== idx)
                          )
                        }
                        className="p-1.5 text-[#94A3B8] hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={item.note}
                      onChange={(e) => {
                        const next = occasionNotes.map((n, i) =>
                          i === idx ? { ...n, note: e.target.value } : n
                        );
                        updateField('occasionContextNotes', next);
                      }}
                      placeholder="How to present or contextualize this gift for the selected occasion..."
                      className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    updateField('occasionContextNotes', [
                      ...occasionNotes,
                      {
                        _type: 'productOccasionNote',
                        _key: `occ_note_${Date.now().toString(36)}_${occasionNotes.length + 1}`,
                        occasion: OCCASION_OPTIONS[0]?.value || 'birthday',
                        label: '',
                        note: '',
                      },
                    ])
                  }
                  className="px-3 py-1.5 text-xs text-[#2A5A48] hover:bg-[#2A5A48]/10 rounded-lg font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Occasion Context Note</span>
                </button>
              </div>
            )}
          </div>

          {/* Drawer 3: Physical Specifications */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleAccordion('specs')}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#FAF9F6] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#2A5A48]" />
                <span className="font-serif text-sm font-semibold text-[#0F172A]">
                  Physical Specifications &amp; Materials ({specs.length})
                </span>
              </div>
              {openAccordions.specs ? (
                <ChevronDown className="w-4 h-4 text-[#64748B]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#64748B]" />
              )}
            </button>

            {openAccordions.specs && (
              <div className="px-6 pb-6 pt-2 border-t border-[#F1F5F9] space-y-3 text-xs">
                {specs.map((item, idx) => (
                  <div key={item._key} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => handleUpdateSpec(idx, { label: e.target.value })}
                      placeholder="e.g. Material"
                      className="w-1/3 px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                    />
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => handleUpdateSpec(idx, { value: e.target.value })}
                      placeholder="e.g. Heavyweight combed cotton blend"
                      className="flex-1 px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                    />
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() =>
                        updateField('specifications', reorderListItems(specs, idx, idx - 1))
                      }
                      className="p-1 text-[#64748B] hover:text-[#0F172A] disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === specs.length - 1}
                      onClick={() =>
                        updateField('specifications', reorderListItems(specs, idx, idx + 1))
                      }
                      className="p-1 text-[#64748B] hover:text-[#0F172A] disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSpec(idx)}
                      className="p-1.5 text-[#94A3B8] hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddSpec}
                  className="px-3 py-1.5 text-xs text-[#2A5A48] hover:bg-[#2A5A48]/10 rounded-lg font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Specification Item</span>
                </button>
              </div>
            )}
          </div>

          {/* Drawer 4: Commerce & Fulfillment */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleAccordion('commerce')}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#FAF9F6] transition-colors"
            >
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#2A5A48]" />
                <span className="font-serif text-sm font-semibold text-[#0F172A]">
                  Commerce, Merchant Links &amp; Verification Evidence
                </span>
              </div>
              {openAccordions.commerce ? (
                <ChevronDown className="w-4 h-4 text-[#64748B]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#64748B]" />
              )}
            </button>

            {openAccordions.commerce && (
              <div className="px-6 pb-6 pt-2 border-t border-[#F1F5F9] space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      Direct Purchase URL (Merchant or Affiliate Link)
                    </label>
                    <input
                      type="url"
                      value={doc.purchaseUrl || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        commitDocumentPatch(
                          { purchaseUrl: val === '' ? undefined : val },
                          val === '' ? { clearFields: ['purchaseUrl'] } : undefined
                        );
                      }}
                      placeholder="https://..."
                      className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      Commerce Provider
                    </label>
                    <select
                      value={doc.commerceProvider || 'direct-merchant'}
                      onChange={(e) => updateField('commerceProvider', e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                    >
                      {COMMERCE_PROVIDER_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      Editorial Callout Tag (Optional)
                    </label>
                    <input
                      type="text"
                      value={doc.calloutTag || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        commitDocumentPatch(
                          { calloutTag: val === '' ? undefined : val },
                          val === '' ? { clearFields: ['calloutTag'] } : undefined
                        );
                      }}
                      placeholder="e.g. Daily Ritual Upgrade"
                      className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      Availability Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={doc.availabilityNote || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        commitDocumentPatch(
                          { availabilityNote: val === '' ? undefined : val },
                          val === '' ? { clearFields: ['availabilityNote'] } : undefined
                        );
                      }}
                      placeholder="e.g. Printed to order in 3-5 business days"
                      className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#F1F5F9]">
                  <div className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#0F172A]">
                        Price Verification ({doc.priceVerified ? 'Verified' : 'Unverified'})
                      </span>
                      {doc.priceVerified ? (
                        <button
                          type="button"
                          onClick={handleClearPriceVerification}
                          className="text-[11px] text-amber-700 hover:underline font-medium"
                        >
                          Clear Verification
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleMarkPriceVerified}
                          disabled={!hasValidPositivePrice}
                          className="text-[11px] text-emerald-700 hover:underline font-semibold disabled:text-[#94A3B8] disabled:no-underline"
                        >
                          Mark Verified
                        </button>
                      )}
                    </div>
                    <select
                      value={doc.priceVerificationSource || 'unverified'}
                      onChange={(e) => {
                        const nextSrc = e.target.value;
                        commitDocumentPatch({
                          priceVerificationSource: nextSrc,
                          ...(nextSrc === 'unverified' ? { priceVerified: false } : {}),
                        });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs"
                    >
                      <option value="unverified">unverified</option>
                      <option value="merchant-json-ld">merchant-json-ld</option>
                      <option value="manual-merchant-check">manual-merchant-check</option>
                      <option value="fourthwall-catalog">fourthwall-catalog</option>
                    </select>
                    <input
                      type="text"
                      value={doc.priceVerificationEvidenceNote || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        commitDocumentPatch(
                          { priceVerificationEvidenceNote: val === '' ? undefined : val },
                          val === ''
                            ? { clearFields: ['priceVerificationEvidenceNote'] }
                            : undefined
                        );
                      }}
                      placeholder="Price verification evidence note..."
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs"
                    />
                  </div>

                  <div className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#0F172A]">
                        Inventory Verification ({doc.inventoryVerified ? 'Verified' : 'Unverified'})
                      </span>
                      {doc.inventoryVerified ? (
                        <button
                          type="button"
                          onClick={handleClearStockVerification}
                          className="text-[11px] text-amber-700 hover:underline font-medium"
                        >
                          Clear Verification
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleMarkStockVerified}
                          disabled={!hasExplicitStockBoolean}
                          className="text-[11px] text-emerald-700 hover:underline font-semibold disabled:text-[#94A3B8] disabled:no-underline"
                        >
                          Mark Verified
                        </button>
                      )}
                    </div>
                    <select
                      value={doc.inventoryVerificationSource || 'unverified'}
                      onChange={(e) => {
                        const nextSrc = e.target.value;
                        commitDocumentPatch({
                          inventoryVerificationSource: nextSrc,
                          ...(nextSrc === 'unverified'
                            ? { inventoryVerified: false }
                            : {}),
                        });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs"
                    >
                      <option value="unverified">unverified</option>
                      <option value="merchant-json-ld">merchant-json-ld</option>
                      <option value="manual-merchant-check">manual-merchant-check</option>
                      <option value="fourthwall-catalog">fourthwall-catalog</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer 5: SEO & Metadata */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleAccordion('seo')}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#FAF9F6] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#2A5A48]" />
                <span className="font-serif text-sm font-semibold text-[#0F172A]">
                  SEO &amp; Social Share Metadata
                </span>
              </div>
              {openAccordions.seo ? (
                <ChevronDown className="w-4 h-4 text-[#64748B]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#64748B]" />
              )}
            </button>

            {openAccordions.seo && (
              <div className="px-6 pb-6 pt-2 border-t border-[#F1F5F9] space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      SEO Meta Title
                    </label>
                    <input
                      type="text"
                      value={doc.seo?.seoTitle || ''}
                      placeholder={`${doc.title || 'Product'} | Science of Gifts`}
                      onChange={(e) => {
                        const nextSeo = {
                          _type: 'seoMetadata',
                          ...(doc.seo && typeof doc.seo === 'object' ? doc.seo : {}),
                        };
                        if (e.target.value) {
                          nextSeo.seoTitle = e.target.value;
                        } else {
                          delete nextSeo.seoTitle;
                        }
                        updateField('seo', nextSeo);
                      }}
                      className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      Robots Indexing Directive
                    </label>
                    <select
                      value={doc.seo?.indexing || 'index,follow'}
                      onChange={(e) => {
                        const nextSeo = {
                          _type: 'seoMetadata',
                          ...(doc.seo && typeof doc.seo === 'object' ? doc.seo : {}),
                          indexing: e.target.value,
                        };
                        updateField('seo', nextSeo);
                      }}
                      className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                    >
                      <option value="index,follow">index,follow</option>
                      <option value="noindex,follow">noindex,follow</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">
                    Canonical Path Override
                  </label>
                  <input
                    type="text"
                    value={canonicalPathValue}
                    placeholder={expectedCanonicalPathWithSlash || '/products/<slug>/'}
                    onChange={(e) => {
                      const nextSeo = {
                        _type: 'seoMetadata',
                        ...(doc.seo && typeof doc.seo === 'object' ? doc.seo : {}),
                      };
                      if (e.target.value) {
                        nextSeo.canonicalPath = e.target.value;
                      } else {
                        delete nextSeo.canonicalPath;
                      }
                      commitDocumentPatch(
                        { seo: nextSeo },
                        e.target.value === ''
                          ? { clearFields: ['seo.canonicalPath'] }
                          : undefined
                      );
                    }}
                    className="w-full px-3 py-1.5 font-mono bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                  />
                  {canonicalPathWarning && (
                    <p className="mt-1 text-[11px] text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{canonicalPathWarning}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">
                    Meta Description
                  </label>
                  <textarea
                    rows={2}
                    value={doc.seo?.metaDescription || ''}
                    placeholder={doc.bestForSummary || doc.subtitle || 'Search snippet description...'}
                    onChange={(e) => {
                      const nextSeo = {
                        _type: 'seoMetadata',
                        ...(doc.seo && typeof doc.seo === 'object' ? doc.seo : {}),
                      };
                      if (e.target.value) {
                        nextSeo.metaDescription = e.target.value;
                      } else {
                        delete nextSeo.metaDescription;
                      }
                      updateField('seo', nextSeo);
                    }}
                    className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#F1F5F9]">
                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      OpenGraph Title (og:title)
                    </label>
                    <input
                      type="text"
                      value={doc.seo?.ogTitle || ''}
                      placeholder="Defaults to SEO Title"
                      onChange={(e) => {
                        const nextSeo = {
                          _type: 'seoMetadata',
                          ...(doc.seo && typeof doc.seo === 'object' ? doc.seo : {}),
                        };
                        if (e.target.value) {
                          nextSeo.ogTitle = e.target.value;
                        } else {
                          delete nextSeo.ogTitle;
                        }
                        commitDocumentPatch(
                          { seo: nextSeo },
                          e.target.value === ''
                            ? { clearFields: ['seo.ogTitle'] }
                            : undefined
                        );
                      }}
                      className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      OpenGraph Share Image URL (og:image)
                    </label>
                    <input
                      type="url"
                      value={doc.seo?.ogImage || ''}
                      placeholder="https://... (defaults to primary product image)"
                      onChange={(e) => {
                        const nextSeo = {
                          _type: 'seoMetadata',
                          ...(doc.seo && typeof doc.seo === 'object' ? doc.seo : {}),
                        };
                        if (e.target.value) {
                          nextSeo.ogImage = e.target.value;
                        } else {
                          delete nextSeo.ogImage;
                        }
                        commitDocumentPatch(
                          { seo: nextSeo },
                          e.target.value === ''
                            ? { clearFields: ['seo.ogImage'] }
                            : undefined
                        );
                      }}
                      className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">
                    OpenGraph Description (og:description)
                  </label>
                  <textarea
                    rows={2}
                    value={doc.seo?.ogDescription || ''}
                    placeholder="Defaults to Meta Description"
                    onChange={(e) => {
                      const nextSeo = {
                        _type: 'seoMetadata',
                        ...(doc.seo && typeof doc.seo === 'object' ? doc.seo : {}),
                      };
                      if (e.target.value) {
                        nextSeo.ogDescription = e.target.value;
                      } else {
                        delete nextSeo.ogDescription;
                      }
                      commitDocumentPatch(
                        { seo: nextSeo },
                        e.target.value === ''
                          ? { clearFields: ['seo.ogDescription'] }
                          : undefined
                      );
                    }}
                    className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Drawer 6: Technical Details & Raw Interchange JSON */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleAccordion('rawJson')}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#FAF9F6] transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-[#2A5A48]" />
                <span className="font-serif text-sm font-semibold text-[#0F172A]">
                  Technical Details & Interchange JSON Schema v1.0
                </span>
              </div>
              {openAccordions.rawJson ? (
                <ChevronDown className="w-4 h-4 text-[#64748B]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#64748B]" />
              )}
            </button>

            {openAccordions.rawJson && (
              <div className="px-6 pb-6 pt-2 border-t border-[#F1F5F9] space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#FAF9F6] rounded-lg font-mono text-[11px]">
                  <div>
                    <span className="text-[#94A3B8] block text-[10px]">_id</span>
                    <span className="truncate block">{doc._id}</span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px]">productId</span>
                    <span className="truncate block">{doc.productId || doc.id}</span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px]">slug</span>
                    <span className="truncate block">
                      {typeof doc.slug === 'string' ? doc.slug : doc.slug?.current}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px]">_rev</span>
                    <span className="truncate block">{doc._rev || 'none'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#0F172A]">Canonical Interchange Payload</span>
                  <button
                    type="button"
                    onClick={handleCopyRawJson}
                    className="px-3 py-1 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded text-[11px] font-medium flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedRawJson ? 'Copied!' : 'Copy Interchange JSON'}</span>
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto p-4 bg-[#0F172A] text-[#E2E8F0] rounded-xl font-mono text-[11px] whitespace-pre-wrap">
                  {canonicalInterchangeJson}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =====================================================================
         * 3. PUBLISH READINESS & GO-LIVE CONTROL CARD
         * ===================================================================== */}
        <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F1F5F9] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1B3D5F]" />
                <h2 className="font-serif text-base font-semibold text-[#0F172A]">
                  Publish Readiness &amp; Live Website Release
                </h2>
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                Editorial profiles can publish without live merchant prices or stock checks; unverified prices omit Schema.org Offer data and remain{' '}
                <code className="font-mono">noindex,follow</code> until verified.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`px-2.5 py-1 rounded-full font-semibold ${
                  publishReadiness.check.ready
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {publishReadiness.check.ready
                  ? 'Ready for Website Publish'
                  : `${publishReadiness.check.blockers.length} Blocking Issue${
                      publishReadiness.check.blockers.length === 1 ? '' : 's'
                    }`}
              </span>
              <span className="px-2.5 py-1 rounded-full font-mono text-[11px] bg-[#FAF9F6] text-[#475569] border border-[#E2E8F0]">
                {publishReadiness.lifecycle.robotsDirective}
              </span>
            </div>
          </div>

          {publishReadiness.check.blockers.length > 0 && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Blocking Requirements before Publishing:</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                {publishReadiness.check.blockers.map((b, idx) => (
                  <li key={`${b.field}_${idx}`}>
                    <code className="font-mono">{b.field}</code>: {b.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {publishReadiness.check.warnings.length > 0 && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Non-Blocking Commercial Notices (Allowed to Publish):</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                {publishReadiness.check.warnings.map((w, idx) => (
                  <li key={`${w.field}_${idx}`}>
                    <code className="font-mono">{w.field}</code>: {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isSanityDraft && (
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onSaveDraftToSanity}
                disabled={persistenceState === 'saving' || isPublishing}
                className="px-4 py-2 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-[#2A5A48]" />
                <span>{persistenceState === 'saving' ? 'Saving...' : 'Save Draft'}</span>
              </button>
              {onPublishProductToSanity && (
                <button
                  type="button"
                  onClick={onPublishProductToSanity}
                  disabled={isPublishing || persistenceState === 'saving'}
                  className="px-4 py-2 bg-[#1B3D5F] hover:bg-[#28537D] disabled:bg-[#94A3B8] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  {isPublishing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>{isPublishing ? 'Publishing to Sanity...' : 'Publish to Website'}</span>
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      {/* =========================================================================
       * REVISION BRIEF MODAL
       * ========================================================================= */}
      {showRevisionBriefModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="font-serif text-lg font-semibold text-[#0F172A]">
                Export Revision Brief · {doc.title}
              </h3>
              <button
                type="button"
                onClick={() => setShowRevisionBriefModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#64748B]">
              This brief includes this product's canonical ID (<code>{doc.productId || doc._id}</code>), existing verified facts, and revision instructions so external chatbots (ChatGPT, Claude) can propose surgical updates without clobbering verified data.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Optional Revision Goals (tell the AI what to improve)
              </label>
              <textarea
                rows={2}
                value={revisionGoals}
                onChange={(e) => setRevisionGoals(e.target.value)}
                placeholder="e.g. Expand on the tactile quality and update the best-for summary for holiday gifting."
                className="w-full p-2.5 text-xs bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setShowRevisionBriefModal(false)}
                className="px-3 py-1.5 text-xs text-[#64748B] hover:text-[#0F172A]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (generatedRevisionBrief) {
                    navigator.clipboard.writeText(generatedRevisionBrief.markdownBrief);
                    setCopiedRevisionBrief(true);
                    setTimeout(() => setCopiedRevisionBrief(false), 2000);
                  }
                }}
                className="px-4 py-1.5 bg-[#2A5A48] hover:bg-[#234b3c] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedRevisionBrief ? 'Copied to Clipboard!' : 'Copy Revision Brief'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * REVISION IMPORT MODAL
       * ========================================================================= */}
      {showRevisionImportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="font-serif text-lg font-semibold text-[#0F172A]">
                Import Revision Response
              </h3>
              <button
                type="button"
                onClick={() => setShowRevisionImportModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#64748B]">
              Paste the revised JSON output from ChatGPT or Claude. The merger ensures canonical IDs and verified prices remain protected against hallucination.
            </p>

            <textarea
              rows={8}
              value={revisionImportText}
              onChange={(e) => setRevisionImportText(e.target.value)}
              placeholder="Paste revision JSON response..."
              className="w-full p-3 font-mono text-xs bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl"
            />

            {revisionImportError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{revisionImportError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setShowRevisionImportModal(false)}
                className="px-3 py-1.5 text-xs text-[#64748B] hover:text-[#0F172A]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyRevisionImport}
                className="px-4 py-1.5 bg-[#2A5A48] hover:bg-[#234b3c] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Revision Diff</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
