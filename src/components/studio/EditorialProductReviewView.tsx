import React, { useMemo, useState } from 'react';
import {
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
} from '../../cms/productInterchangeSchema';
import {
  UniversalProductImportReport,
  importProductInterchangeResponse,
} from '../../cms/productUniversalImporter';
import { generateProductAiWritingBrief } from '../../cms/productAiBriefExporter';
import { ProductMediaManager } from './ProductMediaManager';
import type { DraftPersistenceState, SanityStudioDocument } from './SanityStudioWorkspace';

export interface EditorialProductReviewViewProps {
  document: SanityStudioDocument;
  persistenceState: DraftPersistenceState;
  persistenceError: string | null;
  serverValidationIssues: Array<{ path: string; message: string }>;
  workspaceDocuments: SanityStudioDocument[];
  onBackToLibrary: () => void;
  onUpdateDocument: (updatedDoc: SanityStudioDocument) => void;
  onSaveDraftToSanity: () => Promise<void>;
  onCloneReferenceToDraft: (doc: SanityStudioDocument) => void;
  initialImportReport?: UniversalProductImportReport | null;
  sessionCredentials?: {
    sessionToken: string;
    csrfToken: string;
    expiresAtMs: number;
  } | null;
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
  onCloneReferenceToDraft,
  initialImportReport,
  sessionCredentials,
}) => {
  // Collapsible Accordion States (progressive disclosure)
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    verdict: true,
    rationale: true,
    taxonomy: false,
    gallery: true,
    specs: false,
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
  const [previewAstroDraftNotice, setPreviewAstroDraftNotice] = useState<boolean>(false);

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
  const isLocalReference = !isSanityDraft;

  // Generic Field Updater
  const updateField = (fieldName: string, value: any) => {
    const updated = {
      ...doc,
      [fieldName]: value,
      _updatedAt: new Date().toISOString(),
    };
    onUpdateDocument(updated);
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
    onUpdateDocument({
      ...doc,
      interests: currentInterests,
      _quarantinedInterestTags: nextQuarantined,
      _updatedAt: new Date().toISOString(),
    });
  };

  const handleDismissQuarantinedTag = (tag: string) => {
    const nextQuarantined = quarantinedTags.filter((t) => t !== tag);
    setQuarantinedTags(nextQuarantined);
    onUpdateDocument({
      ...doc,
      _quarantinedInterestTags: nextQuarantined,
      _updatedAt: new Date().toISOString(),
    });
  };

  // One-click verification helpers
  const handleMarkPriceVerified = () => {
    onUpdateDocument({
      ...doc,
      priceVerified: true,
      priceVerificationSource: 'manual-merchant-check',
      priceVerificationEvidenceNote: `Verified by editor against ${doc.purchaseUrl || 'merchant page'} on ${new Date().toISOString().slice(0, 10)}`,
      _updatedAt: new Date().toISOString(),
    });
  };

  const handleMarkStockVerified = () => {
    onUpdateDocument({
      ...doc,
      inStock: true,
      inventoryVerified: true,
      inventoryVerificationSource: 'manual-merchant-check',
      _updatedAt: new Date().toISOString(),
    });
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

  // Specifications helpers
  const specs: Array<{ key: string; value: string; note?: string }> = Array.isArray(
    doc.specifications
  )
    ? doc.specifications
    : [];

  const handleUpdateSpec = (idx: number, patch: Partial<{ key: string; value: string; note?: string }>) => {
    const nextSpecs = [...specs];
    nextSpecs[idx] = { ...nextSpecs[idx], ...patch };
    updateField('specifications', nextSpecs);
  };

  const handleAddSpec = () => {
    updateField('specifications', [...specs, { key: '', value: '', note: '' }]);
  };

  const handleRemoveSpec = (idx: number) => {
    const nextSpecs = specs.filter((_, i) => i !== idx);
    updateField('specifications', nextSpecs);
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
                    Sanity Draft ·{' '}
                    {persistenceState === 'saved'
                      ? 'Saved in Lake'
                      : persistenceState === 'saving'
                      ? 'Saving to Sanity...'
                      : persistenceState === 'unsaved'
                      ? 'Unsaved Changes'
                      : 'Sync Error'}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                  <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
                  <span>Local Catalog Reference (Read-Only)</span>
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
          <div className="flex items-center gap-2 shrink-0">
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

            {/* Preview Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (isLocalReference && doc.slug?.current) {
                    window.open(`/products/${doc.slug.current}/`, '_blank');
                  } else {
                    setPreviewAstroDraftNotice(true);
                  }
                }}
                className="px-3 py-1.5 text-xs text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors flex items-center gap-1.5 font-medium border border-[#E2E8F0]"
                title="Preview Product Page"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>

              {/* Draft preview notice popover */}
              {previewAstroDraftNotice && (
                <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-white border border-[#CBD5E1] rounded-xl shadow-lg z-30 text-xs text-[#475569]">
                  <div className="flex items-start justify-between">
                    <span className="font-semibold text-[#0F172A] flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-[#2A5A48]" />
                      Draft Preview Notice
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewAstroDraftNotice(false)}
                      className="text-[#94A3B8] hover:text-[#0F172A]"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    Live Astro layout preview is enabled for published catalog items. Authenticated live draft preview for unpublished Sanity Content Lake drafts connects in Phase 2. The editor below displays full editorial fidelity.
                  </p>
                </div>
              )}
            </div>

            {/* Save / Clone to Sanity Draft Button */}
            {isSanityDraft ? (
              <button
                type="button"
                onClick={onSaveDraftToSanity}
                disabled={persistenceState === 'saving'}
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
            ) : (
              <button
                type="button"
                onClick={() => onCloneReferenceToDraft(doc)}
                className="px-4 py-1.5 bg-[#2A5A48] hover:bg-[#234b3c] text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                title="Clone this local reference to an editable Sanity Draft"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Create Sanity Draft</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Review Column (Comfortable 820-860px reading width) */}
      <main className="max-w-4xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Local Reference Guidance Notice */}
        {isLocalReference && (
          <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                You are viewing a <strong>Local Catalog Reference</strong>. To persist changes to Sanity Content Lake, click <strong>Create Sanity Draft</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onCloneReferenceToDraft(doc)}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shrink-0 text-xs shadow-xs"
            >
              Create Draft
            </button>
          </div>
        )}

        {/* Server Persistence Error Banner */}
        {persistenceError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Persistence Error</p>
              <p className="mt-0.5">{persistenceError}</p>
            </div>
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
                      Price Unverified ({typeof doc.price === 'number' ? `$${doc.price}` : 'Null/Unknown'})
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      AI-imported prices must be confirmed against merchant.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkPriceVerified}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-md font-semibold text-[11px] shrink-0"
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
                      Inventory Status Unverified
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      Confirm item is currently purchasable or in stock.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkStockVerified}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-md font-semibold text-[11px] shrink-0"
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
                onChange={(e) => updateField('vendor', e.target.value)}
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
                  value={doc.price ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    updateField('price', val);
                    if (typeof val === 'number') {
                      updateField('budgetTier', deriveBudgetTierFromPrice(val));
                      updateField('guidePriceBucket', deriveGuidePriceBucketFromPrice(val));
                    }
                  }}
                  placeholder="0.00"
                  className="font-medium text-[#0F172A] bg-transparent border-b border-transparent hover:border-[#CBD5E1] focus:border-[#2A5A48] focus:outline-none w-20"
                />
              </div>
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
                  const val = e.target.value === 'true' ? true : e.target.value === 'false' ? false : null;
                  updateField('inStock', val);
                }}
                className={`font-semibold bg-transparent focus:outline-none w-full ${
                  doc.inStock ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                <option value="true">● In Stock</option>
                <option value="false">● Out of Stock</option>
                <option value="null">● Unknown</option>
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

          {/* Why To Give It */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
              Why To Give It (Core Emotional Gift Rationale)
            </label>
            <textarea
              rows={3}
              value={doc.whyToGiveIt || ''}
              onChange={(e) => updateField('whyToGiveIt', e.target.value)}
              placeholder="Explain the emotional and relational weight of giving this item..."
              className="w-full p-3 text-xs text-[#0F172A] bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2A5A48] leading-relaxed"
            />
          </div>

          {/* =========================================================================
           * 4-PART GIFT VERDICT
           * ========================================================================= */}
          <div className="pt-4 border-t border-[#F1F5F9] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-semibold text-[#0F172A]">
                  The 4-Part Science of Gifts Verdict
                </h3>
                <p className="text-xs text-[#64748B]">
                  Behavioral, tactile, and practical assessment criteria unique to Science of Gifts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Verdict Assessment */}
              <div className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#2A5A48]">
                  1. Overall Verdict Assessment
                </span>
                <textarea
                  rows={3}
                  value={
                    doc.giftVerdictAssessment ||
                    (typeof doc.verdict === 'object' ? doc.verdict?.assessment : '') ||
                    ''
                  }
                  onChange={(e) => {
                    updateField('giftVerdictAssessment', e.target.value);
                  }}
                  placeholder="Summary verdict and definitive editorial recommendation..."
                  className="w-full text-xs text-[#0F172A] bg-transparent focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Behavioral Gifting Logic */}
              <div className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#2A5A48]">
                  2. Behavioral Gifting Logic
                </span>
                <textarea
                  rows={3}
                  value={
                    doc.giftVerdictBehavioralLogic ||
                    (typeof doc.verdict === 'object' ? doc.verdict?.behavioralLogic : '') ||
                    ''
                  }
                  onChange={(e) => {
                    updateField('giftVerdictBehavioralLogic', e.target.value);
                  }}
                  placeholder="Recipient psychology, relational signaling, and why it succeeds as a gift..."
                  className="w-full text-xs text-[#0F172A] bg-transparent focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Tactile & Material Quality */}
              <div className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#2A5A48]">
                  3. Tactile & Material Quality
                </span>
                <textarea
                  rows={3}
                  value={
                    doc.giftVerdictTactileQuality ||
                    (typeof doc.verdict === 'object' ? doc.verdict?.tactileQuality : '') ||
                    ''
                  }
                  onChange={(e) => {
                    updateField('giftVerdictTactileQuality', e.target.value);
                  }}
                  placeholder="Sensory experience, unboxing touch, weight, craftsmanship..."
                  className="w-full text-xs text-[#0F172A] bg-transparent focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Practical Caveats */}
              <div className="p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#2A5A48]">
                  4. Practical Caveats & Nuances
                </span>
                <textarea
                  rows={3}
                  value={
                    doc.giftVerdictPracticalCaveats ||
                    (typeof doc.verdict === 'object' ? doc.verdict?.practicalCaveats : '') ||
                    ''
                  }
                  onChange={(e) => {
                    updateField('giftVerdictPracticalCaveats', e.target.value);
                  }}
                  placeholder="Fragility, sizing constraints, hand-wash care, recipient caveats..."
                  className="w-full text-xs text-[#0F172A] bg-transparent focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Extended Rationale & Ideal Recipient */}
          <div className="pt-4 border-t border-[#F1F5F9] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Ideal Recipient Profile
              </label>
              <textarea
                rows={3}
                value={
                  doc.idealRecipientProfile ||
                  (typeof doc.recipientProfile === 'object' ? doc.recipientProfile?.summary : '') ||
                  ''
                }
                onChange={(e) => updateField('idealRecipientProfile', e.target.value)}
                placeholder="Persona description of the person who cherishes this gift most..."
                className="w-full p-3 text-xs text-[#0F172A] bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2A5A48] leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Extended Gift Rationale
              </label>
              <textarea
                rows={3}
                value={doc.extendedGiftRationale || ''}
                onChange={(e) => updateField('extendedGiftRationale', e.target.value)}
                placeholder="Deep-dive analysis on craft, longevity, and heirloom suitability..."
                className="w-full p-3 text-xs text-[#0F172A] bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2A5A48] leading-relaxed"
              />
            </div>
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
                  Physical Specifications & Materials ({specs.length})
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
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.key || ''}
                      onChange={(e) => handleUpdateSpec(idx, { key: e.target.value })}
                      placeholder="e.g. Dimensions"
                      className="w-1/3 px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                    />
                    <input
                      type="text"
                      value={item.value || ''}
                      onChange={(e) => handleUpdateSpec(idx, { value: e.target.value })}
                      placeholder="e.g. 8.5 x 8.5 cm"
                      className="flex-1 px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                    />
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
                  Commerce, Merchant Links & Fulfillment
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
                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">
                    Direct Purchase URL (Merchant or Affiliate Link)
                  </label>
                  <input
                    type="url"
                    value={doc.purchaseUrl || ''}
                    onChange={(e) => updateField('purchaseUrl', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      Verification Evidence Note
                    </label>
                    <input
                      type="text"
                      value={doc.priceVerificationEvidenceNote || ''}
                      onChange={(e) => updateField('priceVerificationEvidenceNote', e.target.value)}
                      placeholder="e.g. Verified against official Azmaya Japanese shop"
                      className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                    />
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
                  SEO & Social Share Metadata
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
                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">
                    SEO Meta Title
                  </label>
                  <input
                    type="text"
                    value={doc.seo?.seoTitle || doc.title || ''}
                    onChange={(e) => {
                      const seo = doc.seo ? { ...doc.seo } : {};
                      seo.seoTitle = e.target.value;
                      updateField('seo', seo);
                    }}
                    className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">
                    Meta Description
                  </label>
                  <textarea
                    rows={2}
                    value={doc.seo?.metaDescription || doc.subtitle || ''}
                    onChange={(e) => {
                      const seo = doc.seo ? { ...doc.seo } : {};
                      seo.metaDescription = e.target.value;
                      updateField('seo', seo);
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
