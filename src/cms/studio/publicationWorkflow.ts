/**
 * Science of Gifts — Publication Workflow & Readiness State Evaluator
 *
 * Clearly separates the five distinct lifecycle states required by Section 11:
 * 1. Sanity Draft (`drafts.*` document in Sanity Studio)
 * 2. Published Sanity Document (committed in Sanity dataset)
 * 3. Editorial Record Approved for Public Website (`status === 'published'` & valid editorial fields)
 * 4. Verified Commercial Information (`priceVerified`, evidence, non-placeholder URL, optional `inventoryVerified`)
 * 5. Indexable Public Page (`robots: "index, follow"` & eligible for `/sitemap.xml`)
 *
 * Ensures that:
 * - New records default to an unpublished `'draft'` state.
 * - Sample products or placeholder merchant URLs can never be accidentally published as public indexed pages.
 * - Missing `inventoryVerified` suppresses unsupported Schema.org availability claims (`InStock`/`OutOfStock`)
 *   without invalidating or blocking useful editorial product profiles.
 */

export interface PublicationLifecycleEvaluation {
  /** 1. True if the document is currently an uncommitted Sanity Studio draft (`_id` starts with `drafts.`) */
  isSanityDraft: boolean;
  /** 2. True if the document has been published in Sanity (no `drafts.` prefix) */
  isSanityPublishedDocument: boolean;
  /** 3. True if the editorial record is approved to appear on the public website (`status === 'published'` and passes safety checks) */
  isApprovedForPublicWebsite: boolean;
  /** 4a. True if price and merchant destination are verified with supporting source metadata */
  hasVerifiedCommerce: boolean;
  /** 4b. True if stock availability (`inStock`) is explicitly verified; when false, availability claims are suppressed without invalidating editorial copy */
  hasVerifiedInventory: boolean;
  /** 5. True if the rendered public page is eligible for search engine indexing (`index,follow`) and XML sitemaps */
  isIndexablePublicPage: boolean;
  /** Resolved robots meta directive */
  robotsDirective: 'index,follow' | 'noindex,follow';
  /** Blocking errors that prevent public publication */
  blockingErrors: string[];
  /** Non-blocking warnings (e.g., missing inventory verification or SEO length guidance) */
  warnings: string[];
}

export function isPlaceholderOrSamplePurchaseUrl(rawUrl?: string | null): boolean {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed || !trimmed.startsWith('https://')) {
    return true;
  }
  if (
    /^https?:\/\/(www\.)?example\.(com|org|net)\b/i.test(trimmed) ||
    trimmed.includes('/dev-placeholder/')
  ) {
    return true;
  }
  return false;
}

export function isSampleVendorName(vendor?: string | null): boolean {
  return /^sample\s+maker\b/i.test((vendor ?? '').trim());
}

/**
 * Evaluates the complete 5-stage publication and indexing state for a Product document in Sanity.
 */
export function evaluateProductPublicationLifecycle(
  doc: Record<string, any>
): PublicationLifecycleEvaluation {
  const blockingErrors: string[] = [];
  const warnings: string[] = [];

  const rawId = String(doc._id ?? doc.productId ?? doc.id ?? '');
  const isSanityDraft = rawId.startsWith('drafts.');
  const isSanityPublishedDocument = Boolean(rawId) && !isSanityDraft;

  const status = doc.status ?? 'draft';
  const isSampleProduct = Boolean(doc.isSampleProduct);
  const isPlaceholderLink = Boolean(doc.isPlaceholderLink);
  const sampleVendor = isSampleVendorName(doc.vendor);
  const placeholderUrl =
    isPlaceholderLink || isPlaceholderOrSamplePurchaseUrl(doc.purchaseUrl);

  const hasValidPositivePrice =
    typeof doc.price === 'number' &&
    Number.isFinite(doc.price) &&
    doc.price > 0;

  const hasPriceVerificationEvidence =
    Boolean(doc.priceVerificationSource) &&
    doc.priceVerificationSource !== 'unverified';

  const hasVerifiedCommerce =
    !isSampleProduct &&
    !sampleVendor &&
    !placeholderUrl &&
    hasValidPositivePrice &&
    doc.priceVerified === true &&
    hasPriceVerificationEvidence;

  const hasVerifiedInventory =
    !isSampleProduct &&
    !sampleVendor &&
    doc.inventoryVerified === true &&
    typeof doc.inStock === 'boolean';

  if (status === 'published') {
    if (isSampleProduct || sampleVendor) {
      blockingErrors.push(
        'Sample products (`isSampleProduct: true` or "Sample Maker" vendor) cannot be set to status "published".'
      );
    }
    if (placeholderUrl) {
      blockingErrors.push(
        'Products with placeholder or non-HTTPS purchase URLs cannot be set to status "published".'
      );
    }
  }

  if (doc.priceVerified === true) {
    if (!hasValidPositivePrice) {
      blockingErrors.push(
        'Price cannot be marked verified (`priceVerified: true`) without a positive numeric price.'
      );
    }
    if (!hasPriceVerificationEvidence) {
      blockingErrors.push(
        'Price verification requires selecting a valid `priceVerificationSource` (e.g., merchant JSON-LD, manual merchant check, or Fourthwall catalog) rather than checking a box without evidence.'
      );
    }
  } else if (status === 'published') {
    warnings.push(
      'Product price is not yet marked verified with supporting evidence; Schema.org Offer structured data and search indexing will remain suppressed (`noindex,follow`) until verified.'
    );
  }

  if (!hasVerifiedInventory) {
    warnings.push(
      'Inventory verification (`inventoryVerified`) is not set. Unsupported Schema.org availability claims (`InStock`/`OutOfStock`) will be suppressed automatically while keeping all editorial product content intact.'
    );
  }

  const isApprovedForPublicWebsite =
    !isSanityDraft &&
    status === 'published' &&
    blockingErrors.length === 0 &&
    !isSampleProduct &&
    !sampleVendor &&
    !placeholderUrl;

  const explicitNoindex =
    doc.seo?.noindex === true || doc.seo?.indexing === 'noindex,follow';

  const isIndexablePublicPage =
    isApprovedForPublicWebsite && hasVerifiedCommerce && !explicitNoindex;

  return {
    isSanityDraft,
    isSanityPublishedDocument,
    isApprovedForPublicWebsite,
    hasVerifiedCommerce,
    hasVerifiedInventory,
    isIndexablePublicPage,
    robotsDirective: isIndexablePublicPage ? 'index,follow' : 'noindex,follow',
    blockingErrors,
    warnings,
  };
}

/**
 * Evaluates the publication and indexing state for an Editorial Document (`giftGuide`, `article`, `editorialHub`, `taxonomyArchive`, `publicationInfoPage`).
 */
export function evaluateEditorialDocumentLifecycle(
  doc: Record<string, any>
): PublicationLifecycleEvaluation {
  const blockingErrors: string[] = [];
  const warnings: string[] = [];

  const rawId = String(doc._id ?? doc.id ?? '');
  const isSanityDraft = rawId.startsWith('drafts.');
  const isSanityPublishedDocument = Boolean(rawId) && !isSanityDraft;

  const status = doc.status ?? 'draft';
  const title = typeof doc.title === 'string' ? doc.title.trim() : '';
  const slug =
    typeof doc.slug === 'string'
      ? doc.slug.trim()
      : typeof doc.slug?.current === 'string'
      ? doc.slug.current.trim()
      : '';

  if (status === 'published') {
    if (!title) {
      blockingErrors.push('Document title is required before setting status to "published".');
    }
    if (!slug) {
      blockingErrors.push('URL slug is required before setting status to "published".');
    }
  }

  const isApprovedForPublicWebsite =
    !isSanityDraft && status === 'published' && blockingErrors.length === 0;

  const explicitNoindex =
    doc.seo?.noindex === true || doc.seo?.indexing === 'noindex,follow';

  const isIndexablePublicPage = isApprovedForPublicWebsite && !explicitNoindex;

  return {
    isSanityDraft,
    isSanityPublishedDocument,
    isApprovedForPublicWebsite,
    hasVerifiedCommerce: true,
    hasVerifiedInventory: true,
    isIndexablePublicPage,
    robotsDirective: isIndexablePublicPage ? 'index,follow' : 'noindex,follow',
    blockingErrors,
    warnings,
  };
}
