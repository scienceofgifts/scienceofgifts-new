import React, { useEffect, useMemo, useState } from 'react';
import {
  ALL_SANITY_STUDIO_TYPES,
  SANITY_DOCUMENT_SCHEMAS,
} from '../../cms/studio/schemas';
import {
  ResolvedSanityEnvironmentConfig,
  SanityTypeSpec,
} from '../../cms/studio/sanityCore';
import { SITE_SETTINGS_SINGLETON_ID } from '../../cms/studio/schemas/documents/siteSettings';
import {
  ARTICLES,
  AUTHORS,
  CITATIONS,
  GIFT_GUIDES,
  PRODUCTS,
} from '../../data/catalog';
import { contentRepository } from '../../cms/contentRepository';
import { EditorialSidebar, EditorialStudioSection } from './EditorialSidebar';
import { ContentLibraryView } from './ContentLibraryView';
import { ProductCreationView } from './ProductCreationView';
import { EditorialProductReviewView } from './EditorialProductReviewView';
import { GenericDocumentEditorView } from './GenericDocumentEditorView';
import { ProductAiWorkflowModal } from './ProductAiWorkflowModal';
import { fetchStudioApiJson } from './studioApiClient';
import type { UniversalProductImportReport } from '../../cms/productUniversalImporter';

export type SanityStudioDocument = Record<string, any> & {
  _id: string;
  _type: string;
  _rev?: string;
  _createdAt?: string;
  _updatedAt?: string;
  _sourceOrigin?:
    | 'sanity-content-lake'
    | 'sanity-published'
    | 'local-catalog-reference'
    | 'unsaved-local-draft';
  _hasPublishedPartner?: boolean;
  _publishedSlug?: string;
};

export interface StudioPublishResult {
  ok: boolean;
  action?: 'published' | 'unpublished';
  livePath?: string;
  message: string;
  transactionId?: string;
  blockers?: Array<{ path: string; message: string }>;
  warnings?: Array<{ path: string; message: string }>;
  lifecycle?: {
    hasVerifiedCommerce?: boolean;
    hasVerifiedInventory?: boolean;
    robotsDirective?: string;
  };
}

export type DraftPersistenceState =
  | 'idle'
  | 'unsaved'
  | 'saving'
  | 'saved'
  | 'reloading'
  | 'error';

interface SanityStudioWorkspaceProps {
  envConfig: ResolvedSanityEnvironmentConfig;
  sessionCredentials?: {
    sessionToken: string;
    csrfToken: string;
    expiresAtMs: number;
  } | null;
}

function slugifyText(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Seeds the Studio workspace with existing reference records (Products, Guides, Articles,
 * Authors, Citations, Hubs, Info Pages, and Site Settings) converted into Sanity document
 * structure so editors can browse the library immediately.
 */
function buildInitialSeededStudioDocuments(): SanityStudioDocument[] {
  const docs: SanityStudioDocument[] = [];

  // 1. Authors
  for (const author of Object.values(AUTHORS)) {
    docs.push({
      _id: author.id,
      _type: 'author',
      _updatedAt: '2026-11-01T10:00:00Z',
      id: author.id,
      name: author.name,
      slug: { _type: 'slug', current: slugifyText(author.name) },
      role: author.role,
      bio: author.bio,
      avatarUrl: author.avatarUrl,
    });
  }

  // 2. Research Citations
  for (const citation of Object.values(CITATIONS)) {
    docs.push({
      _id: citation.id,
      _type: 'researchCitation',
      _updatedAt: '2026-11-01T10:00:00Z',
      id: citation.id,
      authors: citation.authors,
      year: citation.year,
      title: citation.title,
      publication: citation.publication,
      keyFinding: citation.keyFinding,
      doiOrUrl: citation.doiOrUrl,
    });
  }

  // 3. Canonical Products
  for (const product of Object.values(PRODUCTS)) {
    docs.push({
      _id: product.id,
      _type: 'product',
      _updatedAt: '2026-11-10T12:00:00Z',
      title: product.title,
      slug: { _type: 'slug', current: product.slug },
      productId: product.id,
      vendor: product.vendor,
      productType: product.productType,
      subtitle: product.subtitle,
      calloutTag: product.calloutTag ?? '',
      whyToGiveIt: product.whyToGiveIt,
      bestForSummary: product.bestForSummary,
      detailsAndCare: product.detailsAndCare,
      commerceProvider: product.commerceProvider,
      fulfillmentClassification:
        product.commerceProvider === 'fourthwall'
          ? 'owned-fourthwall-merch'
          : 'affiliate-partner',
      purchaseUrl: product.purchaseUrl,
      price:
        typeof product.price === 'number' &&
        Number.isFinite(product.price) &&
        product.price > 0
          ? product.price
          : undefined,
      currency: product.currency,
      budgetTier:
        typeof product.price === 'number' &&
        Number.isFinite(product.price) &&
        product.price > 0
          ? product.budgetTier
          : undefined,
      guidePriceBucket:
        typeof product.price === 'number' &&
        Number.isFinite(product.price) &&
        product.price > 0
          ? product.guidePriceBucket
          : undefined,
      inStock: typeof product.inStock === 'boolean' ? product.inStock : undefined,
      priceVerified: Boolean(
        product.priceVerified &&
          typeof product.price === 'number' &&
          Number.isFinite(product.price) &&
          product.price > 0
      ),
      priceVerificationSource:
        product.priceVerified &&
        typeof product.price === 'number' &&
        product.price > 0
          ? 'manual-merchant-check'
          : 'unverified',
      priceVerificationEvidenceNote:
        product.priceVerified &&
        typeof product.price === 'number' &&
        product.price > 0
          ? 'Verified against merchant product page'
          : '',
      inventoryVerified: Boolean(
        product.inventoryVerified && typeof product.inStock === 'boolean'
      ),
      inventoryVerificationSource: 'unverified',
      isSampleProduct: Boolean(product.isSampleProduct),
      isPlaceholderLink: Boolean(product.isPlaceholderLink),
      recipients: product.recipients,
      interests: product.interests,
      occasions: product.occasions,
      personalityTraits: product.personalityTraits,
      ageRanges: product.ageRanges,
      images: product.images.map((img, idx) => ({
        _key: `img_${idx}`,
        _type: 'productImage',
        url: img.url,
        externalUrl: img.url,
        alt: img.alt,
        caption: img.caption,
        fitMode: img.fitMode ?? 'cover',
        focalPoint: img.focalPoint,
        fallbackColor: img.fallbackColor,
      })),
      specifications: (product.specifications || []).map((spec, idx) => ({
        _key: `spec_${idx}`,
        _type: 'productSpecificationItem',
        label: spec.label,
        value: spec.value,
      })),
      giftVerdict: {
        _type: 'productGiftVerdict',
        editorialAssessment:
          product.giftVerdict?.editorialAssessment ||
          product.giftVerdict?.summary ||
          '',
        standoutReason:
          product.giftVerdict?.standoutReason ||
          product.giftVerdict?.distinctDifference ||
          '',
        recipientDelight:
          product.giftVerdict?.recipientDelight ||
          product.giftVerdict?.appeal ||
          '',
        ...(product.giftVerdict?.importantCaveat || product.giftVerdict?.caveat
          ? {
              importantCaveat:
                product.giftVerdict?.importantCaveat ||
                product.giftVerdict?.caveat ||
                '',
            }
          : {}),
      },
      idealRecipientProfile: product.idealRecipientProfile
        ? {
            _type: 'productRecipientProfile',
            headline: product.idealRecipientProfile.headline || '',
            narrative: product.idealRecipientProfile.narrative || '',
            lifestyleNotes: Array.isArray(
              product.idealRecipientProfile.lifestyleNotes
            )
              ? [...product.idealRecipientProfile.lifestyleNotes]
              : [],
            relationshipFit: Array.isArray(
              product.idealRecipientProfile.relationshipFit
            )
              ? [...product.idealRecipientProfile.relationshipFit]
              : [],
          }
        : undefined,
      extendedGiftRationale: Array.isArray(product.extendedGiftRationale)
        ? [...product.extendedGiftRationale]
        : typeof product.extendedGiftRationale === 'string' &&
          product.extendedGiftRationale
        ? String(product.extendedGiftRationale).split(/\n{2,}/).filter(Boolean)
        : [],
      buyingConsiderationsList: Array.isArray(product.buyingConsiderationsList)
        ? product.buyingConsiderationsList.map((item, idx) => ({
            _key: `bc_${idx}`,
            _type: 'productBuyingConsideration',
            label: item.label,
            detail: item.detail,
          }))
        : [],
      occasionContextNotes: Array.isArray(product.occasionContextNotes)
        ? product.occasionContextNotes.map((item, idx) => ({
            _key: `occ_${idx}`,
            _type: 'productOccasionNote',
            occasion: item.occasion,
            label: item.label,
            note: item.note,
          }))
        : [],
      status: product.status ?? 'published',
      editorialApproved: true,
      seo: {
        _type: 'seoMetadata',
        seoTitle: product.seo?.seoTitle ?? product.title,
        metaDescription: product.seo?.metaDescription ?? product.subtitle,
        canonicalPath:
          product.seo?.canonicalPath ?? `/products/${product.slug}/`,
        indexing: product.seo?.noindex ? 'noindex,follow' : 'index,follow',
      },
    });
  }

  // 4. Gift Guides
  for (const guide of GIFT_GUIDES) {
    docs.push({
      _id: guide.id,
      _type: 'giftGuide',
      _updatedAt: `${guide.updatedAt}T12:00:00Z`,
      id: guide.id,
      title: guide.title,
      slug: { _type: 'slug', current: guide.slug },
      subtitle: guide.subtitle,
      editorialIssueNumber: guide.editorialIssueNumber ?? '',
      curationSummary: guide.curationSummary ?? '',
      author: { _type: 'reference', _ref: guide.authorId },
      publishedAt: guide.publishedAt,
      updatedAt: guide.updatedAt,
      readTimeMinutes: guide.readTimeMinutes,
      accentTone: guide.accentTone,
      heroImage: {
        _type: 'editorialImage',
        externalUrl: guide.heroImageUrl,
        alt: guide.heroImageAlt,
      },
      category: guide.category,
      recipients: guide.recipients ?? ['friend', 'partner'],
      occasions: guide.occasions ?? ['birthday', 'just-because'],
      interests: guide.interests ?? ['Daily Rituals'],
      personalityTraits: guide.personalityTraits ?? ['everyday-ritual'],
      budgetTiers: guide.budgetTiers ?? ['under-50', '50-to-100'],
      status: guide.status ?? 'published',
      featured: Boolean(guide.featured),
      affiliateDisclosure: guide.affiliateDisclosure,
      seo: {
        _type: 'seoMetadata',
        seoTitle: guide.seo.seoTitle ?? guide.title,
        metaDescription: guide.seo.metaDescription,
        canonicalPath: `/gift-guides/${guide.slug}/`,
        indexing: guide.seo.noindex ? 'noindex,follow' : 'index,follow',
      },
    });
  }

  // 5. Articles
  for (const article of ARTICLES) {
    docs.push({
      _id: article.id,
      _type: 'article',
      _updatedAt: `${article.updatedAt ?? article.publishedAt}T12:00:00Z`,
      id: article.id,
      title: article.title,
      slug: { _type: 'slug', current: article.slug },
      subtitle: article.subtitle,
      category: article.category,
      topics: article.topics ?? ['gift-giving-psychology'],
      author: { _type: 'reference', _ref: article.authorId },
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt ?? article.publishedAt,
      readTimeMinutes: article.readTimeMinutes ?? 6,
      heroImage: {
        _type: 'editorialImage',
        externalUrl: article.heroImageUrl,
        alt: article.heroAlt,
      },
      status: article.status ?? 'published',
      featured: Boolean(article.featured),
      seo: {
        _type: 'seoMetadata',
        seoTitle: article.seo.seoTitle ?? article.title,
        metaDescription: article.seo.metaDescription,
        canonicalPath: `/articles/${article.slug}/`,
        indexing: article.seo.noindex ? 'noindex,follow' : 'index,follow',
      },
    });
  }

  // 6. Editorial Discovery Hubs
  for (const hub of contentRepository.getAllEditorialHubs({
    includeDrafts: true,
  })) {
    docs.push({
      _id: hub.id,
      _type: 'editorialDiscoveryHub',
      _updatedAt: '2026-11-10T12:00:00Z',
      title: hub.title,
      slug: { _type: 'slug', current: hub.slug },
      subtitle: hub.subtitle,
      editorialPositioning: hub.editorialPositioning,
      status: hub.status,
    });
  }

  // 7. Site Settings
  docs.push({
    _id: SITE_SETTINGS_SINGLETON_ID,
    _type: 'siteSettings',
    _updatedAt: '2026-11-12T12:00:00Z',
    publicationTitle: 'Science of Gifts',
    publicationTagline:
      'Behavioral research, tactile craft, and thoughtful gift discovery.',
    canonicalDomain: 'https://www.scienceofgifts.com',
    shopExternalUrl: 'https://shop.scienceofgifts.com',
    shortInlineAffiliateNotice:
      'Science of Gifts is reader-supported. When you buy through links on our site, we may earn an affiliate commission.',
  });

  return docs.map((d) => ({
    ...d,
    _sourceOrigin: 'local-catalog-reference',
  }));
}

export const SanityStudioWorkspace: React.FC<SanityStudioWorkspaceProps> = ({
  envConfig,
  sessionCredentials,
}) => {
  const buildStudioAuthHeaders = (includeCsrf = false): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (sessionCredentials?.sessionToken) {
      headers['X-Sanity-Studio-Token'] = sessionCredentials.sessionToken;
    }
    if (includeCsrf) {
      headers['Content-Type'] = 'application/json';
      if (sessionCredentials?.csrfToken) {
        headers['X-Sanity-Studio-Csrf'] = sessionCredentials.csrfToken;
      }
    }
    return headers;
  };

  const schemaMap = useMemo(() => {
    const map = new Map<string, SanityTypeSpec>();
    for (const s of ALL_SANITY_STUDIO_TYPES) {
      map.set(s.name, s);
    }
    return map;
  }, []);

  // Studio Documents State:
  // - Real drafts (`drafts.*`) are loaded directly from Sanity Content Lake via `/api/studio/sanity/drafts`
  // - Local catalog items are kept as read-only reference records (`_sourceOrigin: 'local-catalog-reference'`)
  const [documents, setDocuments] = useState<SanityStudioDocument[]>(() =>
    buildInitialSeededStudioDocuments()
  );

  // Persistence State
  const [persistenceStateByDocId, setPersistenceStateByDocId] = useState<
    Record<string, DraftPersistenceState>
  >({});
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [serverValidationIssues, setServerValidationIssues] = useState<
    Array<{ path: string; message: string }>
  >([]);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);

  // Live Sanity Content Lake Status via Server API
  const [cloudStatus, setCloudStatus] = useState<{
    checking: boolean;
    reachable: boolean | null;
    hasWriteToken: boolean;
    draftCount: number | null;
    publishedCount: number | null;
    message: string;
  }>({
    checking: false,
    reachable: null,
    hasWriteToken: false,
    draftCount: null,
    publishedCount: null,
    message: 'Verifying server-side Sanity Content Lake connection...',
  });

  // Navigation & View Mode
  const [currentSection, setCurrentSection] = useState<EditorialStudioSection>('products');
  const [viewMode, setViewMode] = useState<'library' | 'new-product' | 'product-editor' | 'generic-editor'>('library');
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Checkpoint 2: Draft Conversion, Publish, Unpublish & Preview States
  const [openingDraftDocId, setOpeningDraftDocId] = useState<string | null>(null);
  const [isPublishingProduct, setIsPublishingProduct] = useState<boolean>(false);
  const [isUnpublishingProduct, setIsUnpublishingProduct] = useState<boolean>(false);
  const [publishResult, setPublishResult] = useState<StudioPublishResult | null>(null);
  const [previewModal, setPreviewModal] = useState<{
    open: boolean;
    title: string;
    docId: string;
    previewUrl: string;
    loading: boolean;
    hasUnsavedEdits?: boolean;
    error?: string;
  }>({
    open: false,
    title: '',
    docId: '',
    previewUrl: '',
    loading: false,
  });

  // Modal State for AI brief/import
  const [aiWorkflowModalOpen, setAiWorkflowModalOpen] = useState<boolean>(false);
  const [aiWorkflowInitialTab, setAiWorkflowInitialTab] = useState<'export' | 'import'>('export');
  const [initialImportReport, setInitialImportReport] = useState<UniversalProductImportReport | null>(null);

  const activeDocument = useMemo(() => {
    if (!activeDocumentId) return null;
    return documents.find((d) => d._id === activeDocumentId) || null;
  }, [activeDocumentId, documents]);

  const activeSchema = useMemo(() => {
    if (!activeDocument) return null;
    return schemaMap.get(activeDocument._type) || null;
  }, [activeDocument, schemaMap]);

  const sanityDraftCount = useMemo(() => {
    return documents.filter(
      (d) => d._id.startsWith('drafts.') || d._sourceOrigin === 'sanity-content-lake'
    ).length;
  }, [documents]);

  // Sync Drafts & Published Products from Sanity Content Lake with Canonical Deduplication
  const syncDraftsFromSanityContentLake = async () => {
    setCloudStatus((prev) => ({ ...prev, checking: true }));
    try {
      const [statusRes, draftsRes, publishedRes] = await Promise.all([
        fetchStudioApiJson('/api/studio/sanity/status', {
          method: 'GET',
          sessionCredentials,
          cache: 'no-store',
        }),
        fetchStudioApiJson('/api/studio/sanity/drafts', {
          method: 'GET',
          sessionCredentials,
          cache: 'no-store',
        }),
        fetchStudioApiJson('/api/studio/sanity/published', {
          method: 'GET',
          sessionCredentials,
          cache: 'no-store',
        }),
      ]);

      if (statusRes.ok && statusRes.data) {
        const statusJson = statusRes.data;
        setCloudStatus({
          checking: false,
          reachable: Boolean(statusJson.reachable),
          hasWriteToken: Boolean(statusJson.hasWriteToken),
          draftCount:
            typeof statusJson.draftCount === 'number'
              ? statusJson.draftCount
              : 0,
          publishedCount:
            typeof statusJson.publishedCount === 'number'
              ? statusJson.publishedCount
              : 0,
          message:
            statusJson.message ||
            `Connected to ${envConfig.projectId} (${envConfig.dataset})`,
        });
      } else {
        setCloudStatus({
          checking: false,
          reachable: false,
          hasWriteToken: false,
          draftCount: null,
          publishedCount: null,
          message:
            statusRes.diagnosticMessage ||
            'Unable to verify Sanity Content Lake status.',
        });
      }

      if (draftsRes.ok && draftsRes.data) {
        const remoteDrafts: SanityStudioDocument[] = Array.isArray(draftsRes.data?.drafts)
          ? draftsRes.data.drafts.map((d: SanityStudioDocument) => ({
              ...d,
              _sourceOrigin: 'sanity-content-lake' as const,
            }))
          : [];
        const remotePublishedProducts: SanityStudioDocument[] =
          publishedRes.ok && Array.isArray(publishedRes.data?.products)
            ? publishedRes.data.products.map((p: SanityStudioDocument) => ({
                ...p,
                _sourceOrigin: 'sanity-published' as const,
                _hasPublishedPartner: true,
                _publishedSlug:
                  typeof p.slug === 'string' ? p.slug : p.slug?.current || '',
              }))
            : [];

        const publishedProductMap = new Map<string, SanityStudioDocument>();
        for (const pub of remotePublishedProducts) {
          const cid = String(pub.productId || pub._id || '').replace(/^drafts\./, '');
          if (cid) publishedProductMap.set(cid, pub);
        }

        const remoteDraftProductIds = new Set<string>();
        const enrichedDrafts = remoteDrafts.map((d) => {
          if (d._type !== 'product') return d;
          const cid = String(d.productId || d._id || '').replace(/^drafts\./, '');
          if (cid) remoteDraftProductIds.add(cid);
          const partner = cid ? publishedProductMap.get(cid) : undefined;
          return {
            ...d,
            _hasPublishedPartner: Boolean(partner),
            _publishedSlug:
              partner?._publishedSlug ||
              (typeof d.slug === 'string' ? d.slug : d.slug?.current || ''),
          };
        });

        setDocuments((prev) => {
          const baselineLocal = buildInitialSeededStudioDocuments();
          const nonProductRemoteIds = new Set(
            enrichedDrafts.filter((d) => d._type !== 'product').map((d) => d._id)
          );

          // Deduplicate products by canonical productId:
          // 1) Active Sanity Draft wins
          // 2) Else Published Sanity document wins over local baseline
          // 3) Else local baseline reference
          const productRows: SanityStudioDocument[] = [
            ...enrichedDrafts.filter((d) => d._type === 'product'),
            ...remotePublishedProducts.filter((pub) => {
              const cid = String(pub.productId || pub._id || '').replace(/^drafts\./, '');
              return cid && !remoteDraftProductIds.has(cid);
            }),
          ];

          const coveredCanonicalProductIds = new Set<string>([
            ...remoteDraftProductIds,
            ...publishedProductMap.keys(),
          ]);

          for (const localDoc of prev.length > 0 ? prev : baselineLocal) {
            if (localDoc._type !== 'product') continue;
            if (
              localDoc._sourceOrigin === 'sanity-content-lake' ||
              localDoc._sourceOrigin === 'sanity-published'
            ) {
              continue;
            }
            const cid = String(localDoc.productId || localDoc.id || localDoc._id).replace(
              /^drafts\./,
              ''
            );
            if (!coveredCanonicalProductIds.has(cid)) {
              coveredCanonicalProductIds.add(cid);
              productRows.push(localDoc);
            }
          }

          const nonProductRows = [
            ...enrichedDrafts.filter((d) => d._type !== 'product'),
            ...(prev.length > 0 ? prev : baselineLocal).filter(
              (d) =>
                d._type !== 'product' &&
                !nonProductRemoteIds.has(d._id) &&
                d._sourceOrigin !== 'sanity-content-lake'
            ),
          ];

          return [...productRows, ...nonProductRows];
        });

        setPersistenceStateByDocId((prev) => {
          const next = { ...prev };
          for (const d of enrichedDrafts) {
            next[d._id] = 'saved';
          }
          for (const p of remotePublishedProducts) {
            next[p._id] = 'saved';
          }
          return next;
        });
      }
    } catch (err: any) {
      setCloudStatus({
        checking: false,
        reachable: false,
        hasWriteToken: false,
        draftCount: null,
        publishedCount: null,
        message: `Failed to reach server Sanity API: ${err?.message ?? String(err)}`,
      });
    }
  };

  useEffect(() => {
    syncDraftsFromSanityContentLake();
  }, [envConfig.projectId, envConfig.dataset]);

  // Handle Document Selection from Library
  const handleSelectDocument = (doc: SanityStudioDocument) => {
    setPublishResult(null);
    setPersistenceError(null);
    setServerValidationIssues([]);
    setActiveDocumentId(doc._id);
    if (doc._type === 'product') {
      setViewMode('product-editor');
    } else {
      setViewMode('generic-editor');
    }
  };

  // Handle Document Mutation locally
  const handleUpdateActiveDocument = (updatedDoc: SanityStudioDocument) => {
    setDocuments((prev) =>
      prev.map((d) => (d._id === updatedDoc._id ? updatedDoc : d))
    );
    setPersistenceStateByDocId((prev) => ({
      ...prev,
      [updatedDoc._id]: 'unsaved',
    }));
  };

  // Save Draft directly to Sanity Content Lake
  const handleSaveActiveDraftToSanity = async () => {
    if (!activeDocument) return;

    if (!sessionCredentials?.sessionToken || !sessionCredentials?.csrfToken) {
      setPersistenceError(
        'Studio session credentials missing. Draft mutation is restricted to authenticated development sessions.'
      );
      setPersistenceStateByDocId((prev) => ({
        ...prev,
        [activeDocument._id]: 'error',
      }));
      return;
    }

    setPersistenceError(null);
    setServerValidationIssues([]);
    setPersistenceStateByDocId((prev) => ({
      ...prev,
      [activeDocument._id]: 'saving',
    }));

    try {
      const parsed = await fetchStudioApiJson('/api/studio/sanity/save-draft', {
        method: 'POST',
        sessionCredentials,
        body: {
          document: activeDocument,
          expectedRevision: activeDocument._rev,
        },
      });

      const json = parsed.data;

      if (!parsed.ok || !json || !json.ok) {
        const errorMsg =
          parsed.diagnosticMessage ||
          json?.message ||
          'Failed to save draft to Sanity Content Lake.';
        setPersistenceError(errorMsg);
        const issues = Array.isArray(json?.validationIssues)
          ? json.validationIssues
          : Array.isArray(json?.serverValidation?.blockingDraftErrors)
          ? json.serverValidation.blockingDraftErrors
          : [];
        if (issues.length > 0) {
          setServerValidationIssues(issues);
        }
        setPersistenceStateByDocId((prev) => ({
          ...prev,
          [activeDocument._id]: 'error',
        }));
        return;
      }

      const persistedDoc = json.persistedDocument;
      setLastTransactionId(json.transactionId || null);

      if (persistedDoc) {
        setDocuments((prev) =>
          prev.map((d) =>
            d._id === activeDocument._id
              ? {
                  ...d,
                  ...persistedDoc,
                  _sourceOrigin: 'sanity-content-lake' as const,
                }
              : d
          )
        );
      }

      setPersistenceStateByDocId((prev) => ({
        ...prev,
        [activeDocument._id]: 'saved',
      }));

      // Update lake draft count only when creating a new draft
      if (json.mutationOperation === 'create') {
        setCloudStatus((prev) => ({
          ...prev,
          draftCount: typeof prev.draftCount === 'number' ? prev.draftCount + 1 : 1,
        }));
      }
    } catch (err: any) {
      setPersistenceError(err?.message || 'Network error saving draft to Sanity.');
      setPersistenceStateByDocId((prev) => ({
        ...prev,
        [activeDocument._id]: 'error',
      }));
    }
  };

  // Reload the latest persisted Sanity draft revision into workspace state
  const handleReloadDocumentFromSanity = async (docId: string) => {
    if (!docId || !docId.startsWith('drafts.')) return;

    setPersistenceError(null);
    setServerValidationIssues([]);
    setPersistenceStateByDocId((prev) => ({
      ...prev,
      [docId]: 'reloading',
    }));

    try {
      const parsed = await fetchStudioApiJson(
        `/api/studio/sanity/document?id=${encodeURIComponent(docId)}`,
        {
          method: 'GET',
          sessionCredentials,
          cache: 'no-store',
        }
      );

      const json = parsed.data;
      if (!parsed.ok || !json?.ok || !json?.document) {
        setPersistenceError(
          parsed.diagnosticMessage ||
            json?.message ||
            'Failed to reload draft from Sanity Content Lake.'
        );
        setPersistenceStateByDocId((prev) => ({
          ...prev,
          [docId]: 'error',
        }));
        return;
      }

      const reloadedDoc: SanityStudioDocument = {
        ...json.document,
        _sourceOrigin: 'sanity-content-lake' as const,
      };

      setDocuments((prev) => {
        const exists = prev.some((d) => d._id === reloadedDoc._id);
        if (exists) {
          return prev.map((d) =>
            d._id === reloadedDoc._id ? { ...d, ...reloadedDoc } : d
          );
        }
        return [reloadedDoc, ...prev];
      });

      setPersistenceStateByDocId((prev) => ({
        ...prev,
        [docId]: 'saved',
      }));
    } catch (err: any) {
      setPersistenceError(
        err?.message || 'Network error reloading draft from Sanity.'
      );
      setPersistenceStateByDocId((prev) => ({
        ...prev,
        [docId]: 'error',
      }));
    }
  };

  // Idempotent server-backed Edit / Convert Local Catalog Product -> Sanity Draft
  const handleOpenOrEditProduct = async (doc: SanityStudioDocument) => {
    const canonicalId = String(doc.productId || doc.id || doc._id)
      .trim()
      .replace(/^drafts\./, '');

    if (doc._type !== 'product') {
      const newDraftId = `drafts.${canonicalId}`;
      const newDraft: SanityStudioDocument = {
        ...doc,
        _id: newDraftId,
        _sourceOrigin: 'sanity-content-lake',
        status: 'draft',
        _updatedAt: new Date().toISOString(),
      };
      setDocuments((prev) => {
        const filtered = prev.filter((d) => d._id !== newDraftId);
        return [newDraft, ...filtered];
      });
      setActiveDocumentId(newDraftId);
      setPersistenceStateByDocId((prev) => ({ ...prev, [newDraftId]: 'unsaved' }));
      setViewMode('generic-editor');
      return;
    }

    setOpeningDraftDocId(doc._id);
    setPersistenceError(null);
    setServerValidationIssues([]);
    setPublishResult(null);

    try {
      const parsed = await fetchStudioApiJson(
        '/api/studio/sanity/open-or-create-draft',
        {
          method: 'POST',
          sessionCredentials,
          body: {
            canonicalId,
            localProductFallback:
              PRODUCTS[canonicalId] ?? doc,
          },
        }
      );

      const json = parsed.data;
      if (!parsed.ok || !json?.ok || !json?.draftDocument) {
        setPersistenceError(
          parsed.diagnosticMessage ||
            json?.message ||
            `Unable to create or open Sanity draft for "${canonicalId}".`
        );
        const issues = Array.isArray(json?.validationIssues)
          ? json.validationIssues
          : Array.isArray(json?.serverValidation?.blockingDraftErrors)
          ? json.serverValidation.blockingDraftErrors
          : [];
        if (issues.length > 0) {
          setServerValidationIssues(issues);
        }
        return;
      }

      const persistedDraft: SanityStudioDocument = {
        ...json.draftDocument,
        _sourceOrigin: 'sanity-content-lake' as const,
        _hasPublishedPartner: Boolean(
          json.hasPublishedPartner || doc._hasPublishedPartner
        ),
        _publishedSlug:
          doc._publishedSlug ||
          (typeof json.draftDocument.slug === 'string'
            ? json.draftDocument.slug
            : json.draftDocument.slug?.current || ''),
      };

      setDocuments((prev) => {
        const remaining = prev.filter((d) => {
          if (d._type !== 'product') return d._id !== persistedDraft._id;
          const dCid = String(d.productId || d.id || d._id).replace(/^drafts\./, '');
          return dCid !== canonicalId;
        });
        return [persistedDraft, ...remaining];
      });

      setPersistenceStateByDocId((prev) => ({
        ...prev,
        [persistedDraft._id]: 'saved',
      }));
      setActiveDocumentId(persistedDraft._id);
      setViewMode('product-editor');

      if (json.action === 'converted_local_to_draft' || json.action === 'forked_published_to_draft') {
        setCloudStatus((prev) => ({
          ...prev,
          draftCount: typeof prev.draftCount === 'number' ? prev.draftCount + 1 : 1,
        }));
      }
    } catch (err: any) {
      setPersistenceError(
        err?.message || `Error preparing Sanity draft for "${canonicalId}".`
      );
    } finally {
      setOpeningDraftDocId(null);
    }
  };

  // Publish active product draft directly to Sanity Content Lake & Website
  const handlePublishActiveProductToSanity = async () => {
    if (!activeDocument || activeDocument._type !== 'product') return;

    setIsPublishingProduct(true);
    setPublishResult(null);
    setPersistenceError(null);
    setServerValidationIssues([]);

    try {
      const parsed = await fetchStudioApiJson(
        '/api/studio/sanity/publish-product',
        {
          method: 'POST',
          sessionCredentials,
          body: {
            document: activeDocument,
            canonicalId: String(
              activeDocument.productId || activeDocument._id
            ).replace(/^drafts\./, ''),
            expectedRev: activeDocument._rev,
          },
        }
      );

      const json = parsed.data;
      if (!parsed.ok || !json?.ok) {
        const msg =
          parsed.diagnosticMessage ||
          json?.message ||
          'Publish blocked by server validation.';
        setPersistenceError(msg);
        if (Array.isArray(json?.blockers)) {
          setServerValidationIssues(json.blockers);
        }
        setPublishResult({
          ok: false,
          message: msg,
          blockers: json?.blockers,
          warnings: json?.warnings,
          lifecycle: json?.lifecycle,
        });
        return;
      }

      const pubDoc: SanityStudioDocument = {
        ...json.publishedDocument,
        _sourceOrigin: 'sanity-published' as const,
        _hasPublishedPartner: true,
        _publishedSlug:
          typeof json.publishedDocument?.slug === 'string'
            ? json.publishedDocument.slug
            : json.publishedDocument?.slug?.current || '',
      };
      const canonicalId = String(pubDoc.productId || pubDoc._id).replace(
        /^drafts\./,
        ''
      );

      setDocuments((prev) => {
        const remaining = prev.filter((d) => {
          if (d._type !== 'product') return true;
          const dCid = String(d.productId || d.id || d._id).replace(/^drafts\./, '');
          return dCid !== canonicalId;
        });
        return [pubDoc, ...remaining];
      });
      setPersistenceStateByDocId((prev) => ({
        ...prev,
        [pubDoc._id]: 'saved',
      }));
      setActiveDocumentId(pubDoc._id);
      setLastTransactionId(json.transactionId || null);
      setPublishResult({
        ok: true,
        action: 'published',
        livePath: json.livePath,
        message: json.message,
        transactionId: json.transactionId,
        warnings: json.warnings,
        lifecycle: json.lifecycle,
      });

      void syncDraftsFromSanityContentLake();
    } catch (err: any) {
      const msg = err?.message || 'Network error publishing product to Sanity.';
      setPersistenceError(msg);
      setPublishResult({
        ok: false,
        action: 'published',
        message: msg,
      });
    } finally {
      setIsPublishingProduct(false);
    }
  };

  // Unpublish active product from Sanity & public website while keeping editable draft
  const handleUnpublishActiveProductFromSanity = async () => {
    if (!activeDocument || activeDocument._type !== 'product') return;

    setIsUnpublishingProduct(true);
    setPublishResult(null);
    setPersistenceError(null);
    setServerValidationIssues([]);

    try {
      const canonicalId = String(
        activeDocument.productId || activeDocument._id
      ).replace(/^drafts\./, '');

      const parsed = await fetchStudioApiJson(
        '/api/studio/sanity/unpublish-product',
        {
          method: 'POST',
          sessionCredentials,
          body: {
            document: activeDocument,
            canonicalId,
            expectedRev: activeDocument._rev,
          },
        }
      );

      const json = parsed.data;
      if (!parsed.ok || !json?.ok || !json?.draftDocument) {
        const msg =
          parsed.diagnosticMessage ||
          json?.message ||
          'Failed to unpublish product in Sanity Content Lake.';
        setPersistenceError(msg);
        setPublishResult({
          ok: false,
          action: 'unpublished',
          message: msg,
        });
        return;
      }

      const restoredDraft: SanityStudioDocument = {
        ...json.draftDocument,
        _sourceOrigin: 'sanity-content-lake' as const,
        _hasPublishedPartner: false,
        _publishedSlug:
          typeof json.draftDocument?.slug === 'string'
            ? json.draftDocument.slug
            : json.draftDocument?.slug?.current || '',
      };

      setDocuments((prev) => {
        const remaining = prev.filter((d) => {
          if (d._type !== 'product') return true;
          const dCid = String(d.productId || d.id || d._id).replace(/^drafts\./, '');
          return dCid !== canonicalId;
        });
        return [restoredDraft, ...remaining];
      });
      setPersistenceStateByDocId((prev) => ({
        ...prev,
        [restoredDraft._id]: 'saved',
      }));
      setActiveDocumentId(restoredDraft._id);
      setLastTransactionId(json.transactionId || null);
      setPublishResult({
        ok: true,
        action: 'unpublished',
        message: json.message,
        transactionId: json.transactionId,
      });

      void syncDraftsFromSanityContentLake();
    } catch (err: any) {
      const msg = err?.message || 'Network error unpublishing product in Sanity.';
      setPersistenceError(msg);
      setPublishResult({
        ok: false,
        action: 'unpublished',
        message: msg,
      });
    } finally {
      setIsUnpublishingProduct(false);
    }
  };

  // Real Authenticated SSR Draft Preview Modal
  const handleOpenDraftPreview = async (doc: SanityStudioDocument) => {
    const title = String(doc.title || doc._id);
    const hasUnsaved = persistenceStateByDocId[doc._id] === 'unsaved';

    if (
      doc._sourceOrigin !== 'sanity-content-lake' &&
      doc._sourceOrigin !== 'sanity-published'
    ) {
      const slug = typeof doc.slug === 'string' ? doc.slug : doc.slug?.current;
      if (slug) {
        setPreviewModal({
          open: true,
          title,
          docId: doc._id,
          previewUrl: `/products/${slug}/`,
          loading: false,
          hasUnsavedEdits: false,
        });
      }
      return;
    }

    setPreviewModal({
      open: true,
      title,
      docId: doc._id,
      previewUrl: '',
      loading: true,
      hasUnsavedEdits: hasUnsaved,
    });

    try {
      const parsed = await fetchStudioApiJson(
        '/api/studio/sanity/preview-ticket',
        {
          method: 'POST',
          sessionCredentials,
          body: { documentId: doc._id },
        }
      );
      if (!parsed.ok || !parsed.data?.ok || !parsed.data?.previewUrl) {
        setPreviewModal((prev) => ({
          ...prev,
          loading: false,
          error:
            parsed.diagnosticMessage ||
            parsed.data?.message ||
            'Failed to generate authenticated preview ticket.',
        }));
        return;
      }

      setPreviewModal((prev) => ({
        ...prev,
        loading: false,
        previewUrl: parsed.data!.previewUrl,
      }));
    } catch (err: any) {
      setPreviewModal((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || 'Error opening draft preview.',
      }));
    }
  };

  // Delete Sanity Draft from Lake
  const handleDeleteSanityDraft = async (docId: string) => {
    if (!docId.startsWith('drafts.')) return;

    try {
      const parsed = await fetchStudioApiJson('/api/studio/sanity/delete-draft', {
        method: 'POST',
        sessionCredentials,
        body: { documentId: docId },
      });

      const json = parsed.data;
      if (!parsed.ok || !json || !json.ok) {
        setPersistenceError(
          parsed.diagnosticMessage ||
            json?.message ||
            'Failed to delete draft from Sanity.'
        );
        return;
      }

      setDocuments((prev) => prev.filter((d) => d._id !== docId));
      if (activeDocumentId === docId) {
        setActiveDocumentId(null);
        setViewMode('library');
      }

      setCloudStatus((prev) => ({
        ...prev,
        draftCount:
          typeof prev.draftCount === 'number' && prev.draftCount > 0
            ? prev.draftCount - 1
            : 0,
      }));
    } catch (err: any) {
      setPersistenceError(`Error deleting draft: ${err?.message || err}`);
    }
  };

  // New Product Screen Handlers
  const handleOpenNewProductScreen = () => {
    setViewMode('new-product');
  };

  const handleOpenEditorialReviewFromImport = (
    draftDoc: SanityStudioDocument,
    report?: UniversalProductImportReport,
    initialPersistenceState: DraftPersistenceState = 'unsaved'
  ) => {
    setDocuments((prev) => {
      const filtered = prev.filter((d) => d._id !== draftDoc._id);
      return [draftDoc, ...filtered];
    });
    setActiveDocumentId(draftDoc._id);
    setInitialImportReport(report || null);
    setPersistenceError(null);
    setServerValidationIssues([]);
    setPersistenceStateByDocId((prev) => ({
      ...prev,
      [draftDoc._id]: initialPersistenceState,
    }));
    setViewMode('product-editor');
  };

  const handleExportBriefForProduct = (product: SanityStudioDocument) => {
    setActiveDocumentId(product._id);
    setAiWorkflowInitialTab('export');
    setAiWorkflowModalOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-[#FAF9F6]">
      {/* 1. Collapsible Sidebar Navigation */}
      <EditorialSidebar
        currentSection={currentSection}
        onSelectSection={(sec) => {
          setCurrentSection(sec);
          setViewMode('library');
        }}
        onNewProduct={handleOpenNewProductScreen}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        envConfig={envConfig}
        cloudStatus={cloudStatus}
        onRefreshCloudStatus={syncDraftsFromSanityContentLake}
        sanityDraftCount={sanityDraftCount}
      />

      {/* 2. Main Workspace Router */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {viewMode === 'library' && (
          <ContentLibraryView
            currentSection={currentSection}
            documents={documents}
            persistenceStateByDocId={persistenceStateByDocId}
            openingDraftDocId={openingDraftDocId}
            persistenceError={persistenceError}
            onDismissPersistenceError={() => setPersistenceError(null)}
            onSelectDocument={handleSelectDocument}
            onNewProduct={handleOpenNewProductScreen}
            onExportBriefForProduct={handleExportBriefForProduct}
            onCloneReferenceToDraft={handleOpenOrEditProduct}
            onOpenDraftPreview={handleOpenDraftPreview}
            onDeleteSanityDraft={handleDeleteSanityDraft}
          />
        )}

        {viewMode === 'new-product' && (
          <ProductCreationView
            onBackToLibrary={() => setViewMode('library')}
            workspaceDocuments={documents}
            onOpenEditorialReview={handleOpenEditorialReviewFromImport}
            sessionCredentials={sessionCredentials}
          />
        )}

        {viewMode === 'product-editor' && activeDocument && (
          <EditorialProductReviewView
            document={activeDocument}
            persistenceState={persistenceStateByDocId[activeDocument._id] || 'idle'}
            persistenceError={persistenceError}
            serverValidationIssues={serverValidationIssues}
            workspaceDocuments={documents}
            onBackToLibrary={() => setViewMode('library')}
            onUpdateDocument={handleUpdateActiveDocument}
            onSaveDraftToSanity={handleSaveActiveDraftToSanity}
            onReloadDocumentFromSanity={handleReloadDocumentFromSanity}
            onCloneReferenceToDraft={handleOpenOrEditProduct}
            onOpenDraftPreview={handleOpenDraftPreview}
            onPublishProductToSanity={handlePublishActiveProductToSanity}
            onUnpublishProductToSanity={handleUnpublishActiveProductFromSanity}
            isPublishing={isPublishingProduct}
            isUnpublishing={isUnpublishingProduct}
            publishResult={publishResult}
            openingDraftDocId={openingDraftDocId}
            initialImportReport={initialImportReport}
            sessionCredentials={sessionCredentials}
          />
        )}

        {viewMode === 'generic-editor' && activeDocument && activeSchema && (
          <GenericDocumentEditorView
            document={activeDocument}
            schema={activeSchema}
            persistenceState={persistenceStateByDocId[activeDocument._id] || 'idle'}
            persistenceError={persistenceError}
            serverValidationIssues={serverValidationIssues}
            allDocuments={documents}
            onBackToLibrary={() => setViewMode('library')}
            onUpdateDocument={handleUpdateActiveDocument}
            onSaveDraftToSanity={handleSaveActiveDraftToSanity}
            onDeleteDocument={handleDeleteSanityDraft}
          />
        )}
      </div>

      {/* 3. On-Demand Modal for AI Workflow */}
      <ProductAiWorkflowModal
        isOpen={aiWorkflowModalOpen}
        onClose={() => setAiWorkflowModalOpen(false)}
        initialTab={aiWorkflowInitialTab}
        activeProductDocument={activeDocument}
        workspaceDocuments={documents}
        onApplyImportedDraftToEditor={(sanityDraftDoc) => {
          handleOpenEditorialReviewFromImport(sanityDraftDoc);
          setAiWorkflowModalOpen(false);
        }}
        onSaveImportedDraftToSanity={async (sanityDraftDoc) => {
          // Direct save via safe Studio API client
          const parsed = await fetchStudioApiJson('/api/studio/sanity/save-draft', {
            method: 'POST',
            sessionCredentials,
            body: { document: sanityDraftDoc },
          });
          const json = parsed.data;
          if (parsed.ok && json?.ok) {
            if (json.transactionId) {
              setLastTransactionId(json.transactionId);
            }
            if (json.mutationOperation === 'create') {
              setCloudStatus((prev) => ({
                ...prev,
                draftCount:
                  typeof prev.draftCount === 'number' ? prev.draftCount + 1 : 1,
              }));
            }
            handleOpenEditorialReviewFromImport(
              {
                ...(json.persistedDocument || sanityDraftDoc),
                _sourceOrigin: 'sanity-content-lake' as const,
              },
              undefined,
              'saved'
            );
            return {
              ok: true,
              persistedDocument: json.persistedDocument,
              transactionId: json.transactionId,
            };
          }
          return {
            ok: false,
            errorMessage:
              parsed.diagnosticMessage ||
              json?.message ||
              'Failed to save draft to Sanity.',
          };
        }}
      />

      {/* 4. Authenticated Live Draft Preview Modal */}
      {previewModal.open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-xs p-4 sm:p-6">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] bg-[#FAF9F6] px-5 py-3">
              <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                <span className="rounded bg-amber-300 px-2 py-0.5 font-mono text-[11px] font-bold text-[#1B2228]">
                  DRAFT PREVIEW
                </span>
                <h3 className="truncate font-serif text-sm font-semibold text-[#0F172A]">
                  {previewModal.title}
                </h3>
                <span className="font-mono text-[11px] text-[#64748B]">
                  {previewModal.docId}
                </span>
                {previewModal.hasUnsavedEdits && (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">
                    Showing last saved Sanity revision — click Save Draft to preview unpersisted form edits
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {previewModal.previewUrl && (
                  <a
                    href={previewModal.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#1B3D5F] hover:bg-[#F1F5F9]"
                  >
                    Open in New Tab
                  </a>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setPreviewModal({
                      open: false,
                      title: '',
                      docId: '',
                      previewUrl: '',
                      loading: false,
                    })
                  }
                  className="rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E293B]"
                >
                  Close Preview
                </button>
              </div>
            </div>

            <div className="relative flex-1 bg-[#FAF9F6]">
              {previewModal.loading ? (
                <div className="flex h-full items-center justify-center text-xs text-[#64748B]">
                  Rendering live Astro product preview from Sanity Content Lake...
                </div>
              ) : previewModal.error ? (
                <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
                  {previewModal.error}
                </div>
              ) : previewModal.previewUrl ? (
                <iframe
                  src={previewModal.previewUrl}
                  title={`Draft preview: ${previewModal.title}`}
                  className="h-full w-full border-0 bg-white"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
