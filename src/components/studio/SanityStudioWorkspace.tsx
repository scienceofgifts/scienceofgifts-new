import React, { useEffect, useMemo, useState } from 'react';
import {
  ALL_SANITY_STUDIO_TYPES,
  SANITY_DOCUMENT_SCHEMAS,
} from '../../cms/studio/schemas';
import {
  ResolvedSanityEnvironmentConfig,
  SanityTypeSpec,
} from '../../cms/studio/sanityCore';
import {
  validateSanityDraftBeforeServerMutation,
} from '../../cms/studio/sanityServerClient';
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
  _sourceOrigin?: 'sanity-content-lake' | 'local-catalog-reference' | 'unsaved-local-draft';
};

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
      price: product.price,
      currency: product.currency,
      budgetTier: product.budgetTier,
      guidePriceBucket: product.guidePriceBucket,
      inStock: product.inStock,
      priceVerified: Boolean(product.priceVerified),
      priceVerificationSource: product.priceVerified
        ? 'manual-merchant-check'
        : 'unverified',
      priceVerificationEvidenceNote: product.priceVerified
        ? 'Verified against merchant product page'
        : '',
      inventoryVerified: Boolean(product.inventoryVerified),
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
        externalUrl: img.url,
        alt: img.alt,
        fitMode: img.fitMode ?? 'cover',
      })),
      specifications: product.specifications || [],
      giftVerdictAssessment:
        product.giftVerdict?.editorialAssessment ||
        product.giftVerdict?.summary ||
        '',
      giftVerdictBehavioralLogic:
        product.giftVerdict?.recipientDelight ||
        product.giftVerdict?.appeal ||
        '',
      giftVerdictTactileQuality:
        product.giftVerdict?.standoutReason ||
        product.giftVerdict?.distinctDifference ||
        '',
      giftVerdictPracticalCaveats:
        product.giftVerdict?.importantCaveat ||
        product.giftVerdict?.caveat ||
        '',
      idealRecipientProfile:
        product.idealRecipientProfile?.narrative ||
        product.idealRecipientProfile?.headline ||
        '',
      extendedGiftRationale: Array.isArray(product.extendedGiftRationale)
        ? product.extendedGiftRationale.join('\n\n')
        : (product.extendedGiftRationale as any) || '',
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

  // Sync Drafts from Sanity Content Lake
  const syncDraftsFromSanityContentLake = async () => {
    setCloudStatus((prev) => ({ ...prev, checking: true }));
    try {
      const [statusRes, draftsRes] = await Promise.all([
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
        const draftsJson = draftsRes.data;
        const remoteDrafts: SanityStudioDocument[] = Array.isArray(draftsJson?.drafts)
          ? draftsJson.drafts.map((d: SanityStudioDocument) => ({
              ...d,
              _sourceOrigin: 'sanity-content-lake' as const,
            }))
          : [];

        setDocuments((prev) => {
          const remoteIds = new Set(remoteDrafts.map((d) => d._id));
          const remaining = prev.filter(
            (doc) =>
              !remoteIds.has(doc._id) &&
              doc._sourceOrigin !== 'sanity-content-lake'
          );
          return [...remoteDrafts, ...remaining];
        });

        setPersistenceStateByDocId((prev) => {
          const next = { ...prev };
          for (const d of remoteDrafts) {
            next[d._id] = 'saved';
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

      // Update lake draft count
      setCloudStatus((prev) => ({
        ...prev,
        draftCount: typeof prev.draftCount === 'number' ? prev.draftCount + 1 : 1,
      }));
    } catch (err: any) {
      setPersistenceError(err?.message || 'Network error saving draft to Sanity.');
      setPersistenceStateByDocId((prev) => ({
        ...prev,
        [activeDocument._id]: 'error',
      }));
    }
  };

  // Clone a Local Reference into an editable Sanity Draft
  const handleCloneReferenceToDraft = (doc: SanityStudioDocument) => {
    const canonicalId = doc.productId || doc.id || doc._id;
    const cleanId = canonicalId.replace(/^drafts\./, '');
    const newDraftId = `drafts.${cleanId}`;

    const newDraft: SanityStudioDocument = {
      ...doc,
      _id: newDraftId,
      _sourceOrigin: 'sanity-content-lake',
      status: 'draft',
      _updatedAt: new Date().toISOString(),
    };

    setDocuments((prev) => {
      const exists = prev.find((d) => d._id === newDraftId);
      if (exists) {
        return prev.map((d) => (d._id === newDraftId ? newDraft : d));
      }
      return [newDraft, ...prev];
    });

    setActiveDocumentId(newDraftId);
    setPersistenceStateByDocId((prev) => ({
      ...prev,
      [newDraftId]: 'unsaved',
    }));

    if (doc._type === 'product') {
      setViewMode('product-editor');
    } else {
      setViewMode('generic-editor');
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
    report?: UniversalProductImportReport
  ) => {
    setDocuments((prev) => {
      const filtered = prev.filter((d) => d._id !== draftDoc._id);
      return [draftDoc, ...filtered];
    });
    setActiveDocumentId(draftDoc._id);
    setInitialImportReport(report || null);
    setPersistenceStateByDocId((prev) => ({
      ...prev,
      [draftDoc._id]: 'unsaved',
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
            onSelectDocument={handleSelectDocument}
            onNewProduct={handleOpenNewProductScreen}
            onExportBriefForProduct={handleExportBriefForProduct}
            onCloneReferenceToDraft={handleCloneReferenceToDraft}
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
            onCloneReferenceToDraft={handleCloneReferenceToDraft}
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
            handleOpenEditorialReviewFromImport(json.persistedDocument || sanityDraftDoc);
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
    </div>
  );
};
