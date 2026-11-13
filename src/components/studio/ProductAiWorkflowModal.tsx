import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileCode2,
  FileText,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import {
  GeneratedProductAiBrief,
  generateProductAiWritingBrief,
} from '../../cms/productAiBriefExporter';
import {
  ALLOWED_COMMERCE_PROVIDER_VALUES,
  ALLOWED_INTEREST_VALUES,
  ALLOWED_PRODUCT_CATEGORY_VALUES,
  CanonicalInterestTag,
  CanonicalProductCategory,
  ProductInterchangeCreatePayloadV1,
  ProductInterchangeMode,
  deriveBudgetTierFromPrice,
  deriveGuidePriceBucketFromPrice,
  mapInterchangeToAstroProduct,
  mapInterchangeToSanityProductDraft,
} from '../../cms/productInterchangeSchema';
import {
  UniversalProductImportReport,
  importProductInterchangeResponse,
} from '../../cms/productUniversalImporter';
import createExampleJson from '../../cms/examples/product-interchange-v1-create.example.json';
import revisionExampleJson from '../../cms/examples/product-interchange-v1-revision.example.json';
import type { DraftPersistenceState, SanityStudioDocument } from './SanityStudioWorkspace';

interface ProductAiWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'export' | 'import';
  initialMode?: ProductInterchangeMode;
  activeProductDocument?: SanityStudioDocument | null;
  workspaceDocuments: SanityStudioDocument[];
  onApplyImportedDraftToEditor: (sanityDraftDoc: SanityStudioDocument) => void;
  onSaveImportedDraftToSanity: (
    sanityDraftDoc: SanityStudioDocument
  ) => Promise<{
    ok: boolean;
    persistedDocument?: SanityStudioDocument;
    transactionId?: string;
    errorMessage?: string;
  }>;
}

export const ProductAiWorkflowModal: React.FC<ProductAiWorkflowModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'export',
  initialMode = 'create',
  activeProductDocument,
  workspaceDocuments,
  onApplyImportedDraftToEditor,
  onSaveImportedDraftToSanity,
}) => {
  const [workflowTab, setWorkflowTab] = useState<'export' | 'import' | 'review'>(
    initialTab
  );

  // =========================================================================
  // STEP 1 STATE: AI BRIEF EXPORT
  // =========================================================================
  const [briefMode, setBriefMode] = useState<ProductInterchangeMode>(initialMode);
  const [productUrl, setProductUrl] = useState<string>('');
  const [selectedExistingProductId, setSelectedExistingProductId] = useState<string>('');
  const [showOptionalBriefInputs, setShowOptionalBriefInputs] = useState<boolean>(false);
  const [knownTitle, setKnownTitle] = useState<string>('');
  const [knownVendor, setKnownVendor] = useState<string>('');
  const [knownPriceInput, setKnownPriceInput] = useState<string>('');
  const [knownInStockInput, setKnownInStockInput] = useState<'unknown' | 'true' | 'false'>('unknown');
  const [purchaseDestinationUrl, setPurchaseDestinationUrl] = useState<string>('');
  const [additionalSourceNotes, setAdditionalSourceNotes] = useState<string>('');
  const [revisionGoals, setRevisionGoals] = useState<string>('');
  const [showBriefMarkdownPreview, setShowBriefMarkdownPreview] = useState<boolean>(false);
  const [copiedBriefStatus, setCopiedBriefStatus] = useState<boolean>(false);

  // =========================================================================
  // STEP 2 STATE: SINGLE-OPERATION IMPORT
  // =========================================================================
  const [rawImportText, setRawImportText] = useState<string>('');
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // =========================================================================
  // STEP 3 STATE: IMPORT REVIEW & INLINE CORRECTIONS
  // =========================================================================
  const [importReport, setImportReport] = useState<UniversalProductImportReport | null>(
    null
  );
  const [editableCreatePayload, setEditableCreatePayload] =
    useState<ProductInterchangeCreatePayloadV1 | null>(null);
  const [dismissedQuarantinedTags, setDismissedQuarantinedTags] = useState<string[]>([]);
  const [showAdvancedJsonDebug, setShowAdvancedJsonDebug] = useState<boolean>(false);
  const [saveState, setSaveState] = useState<DraftPersistenceState>('unsaved');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [savedRevisionInfo, setSavedRevisionInfo] = useState<{
    documentId: string;
    rev?: string;
    transactionId?: string;
  } | null>(null);

  // All product documents available for revision selection
  const productDocuments = useMemo(
    () => workspaceDocuments.filter((d) => d._type === 'product'),
    [workspaceDocuments]
  );

  // Sync initial modal state when opened
  useEffect(() => {
    if (!isOpen) return;
    setWorkflowTab(initialTab);
    setBriefMode(initialMode);
    if (activeProductDocument && activeProductDocument._type === 'product') {
      setSelectedExistingProductId(activeProductDocument._id);
      if (initialMode === 'revision' && activeProductDocument.purchaseUrl) {
        setProductUrl(activeProductDocument.purchaseUrl);
      }
    } else if (productDocuments.length > 0 && !selectedExistingProductId) {
      setSelectedExistingProductId(productDocuments[0]._id);
    }
  }, [isOpen, initialTab, initialMode, activeProductDocument]);

  const selectedExistingProduct = useMemo(() => {
    if (briefMode !== 'revision') return null;
    return (
      productDocuments.find((d) => d._id === selectedExistingProductId) ||
      activeProductDocument ||
      null
    );
  }, [briefMode, selectedExistingProductId, productDocuments, activeProductDocument]);

  // Programmatically generated AI Writing Brief
  const generatedBrief: GeneratedProductAiBrief = useMemo(() => {
    const parsedPrice =
      knownPriceInput.trim() !== '' && Number.isFinite(Number(knownPriceInput))
        ? Number(knownPriceInput)
        : undefined;
    const parsedInStock =
      knownInStockInput === 'true'
        ? true
        : knownInStockInput === 'false'
        ? false
        : undefined;

    const effectiveUrl =
      briefMode === 'revision'
        ? productUrl.trim() || selectedExistingProduct?.purchaseUrl || ''
        : productUrl.trim();

    return generateProductAiWritingBrief(
      {
        productUrl: effectiveUrl,
        mode: briefMode,
        knownTitle: knownTitle.trim() || undefined,
        knownVendor: knownVendor.trim() || undefined,
        knownPrice: parsedPrice,
        knownInStock: parsedInStock,
        purchaseDestinationUrl: purchaseDestinationUrl.trim() || undefined,
        additionalSourceNotes: additionalSourceNotes.trim() || undefined,
        revisionGoals: revisionGoals.trim() || undefined,
        existingProduct: briefMode === 'revision' ? selectedExistingProduct : undefined,
      },
      workspaceDocuments
    );
  }, [
    briefMode,
    productUrl,
    selectedExistingProduct,
    knownTitle,
    knownVendor,
    knownPriceInput,
    knownInStockInput,
    purchaseDestinationUrl,
    additionalSourceNotes,
    revisionGoals,
    workspaceDocuments,
  ]);

  if (!isOpen) return null;

  const isUrlReadyForExport =
    briefMode === 'revision'
      ? Boolean(selectedExistingProduct)
      : productUrl.trim().startsWith('https://');

  const handleCopyBrief = async () => {
    try {
      await navigator.clipboard.writeText(generatedBrief.markdownBrief);
      setCopiedBriefStatus(true);
      setTimeout(() => setCopiedBriefStatus(false), 3000);
    } catch {
      // Fallback textarea copy if clipboard API is restricted
      const el = document.createElement('textarea');
      el.value = generatedBrief.markdownBrief;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedBriefStatus(true);
      setTimeout(() => setCopiedBriefStatus(false), 3000);
    }
  };

  const handleDownloadBrief = () => {
    const blob = new Blob([generatedBrief.markdownBrief], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generatedBrief.suggestedFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setUploadedFilename(file.name);
    setRawImportText(text);
    const report = importProductInterchangeResponse(text, {
      filename: file.name,
      workspaceDocuments,
    });
    setImportReport(report);
    setEditableCreatePayload(
      report.resolvedCreatePayload
        ? JSON.parse(JSON.stringify(report.resolvedCreatePayload))
        : null
    );
    setDismissedQuarantinedTags([]);
    setSaveState('unsaved');
    setSaveErrorMessage(null);
    setSavedRevisionInfo(null);
    setWorkflowTab('review');
  };

  const handleValidateAndReviewImport = () => {
    const report = importProductInterchangeResponse(rawImportText, {
      filename: uploadedFilename ?? undefined,
      workspaceDocuments,
    });
    setImportReport(report);
    setEditableCreatePayload(
      report.resolvedCreatePayload
        ? JSON.parse(JSON.stringify(report.resolvedCreatePayload))
        : null
    );
    setDismissedQuarantinedTags([]);
    setSaveState('unsaved');
    setSaveErrorMessage(null);
    setSavedRevisionInfo(null);
    setWorkflowTab('review');
  };

  const handleMapQuarantinedTagToCanonical = (
    rawTag: string,
    canonicalTag: CanonicalInterestTag
  ) => {
    if (!editableCreatePayload) return;
    setEditableCreatePayload((prev) => {
      if (!prev) return prev;
      const nextInterests = prev.taxonomy.interests.includes(canonicalTag)
        ? prev.taxonomy.interests
        : [...prev.taxonomy.interests, canonicalTag].slice(0, 6);
      return {
        ...prev,
        taxonomy: {
          ...prev.taxonomy,
          interests: nextInterests,
        },
      };
    });
    setDismissedQuarantinedTags((prev) => [...prev, rawTag]);
    setSaveState('unsaved');
  };

  const buildCandidateSanityDocumentFromEditable = (): SanityStudioDocument | null => {
    if (!editableCreatePayload) return null;
    const existingDraftId = importReport?.candidateSanityDraft?._id;
    const existingRev = importReport?.candidateSanityDraft?._rev;
    const draft = mapInterchangeToSanityProductDraft(editableCreatePayload, {
      existingDraftId,
      existingRev,
    });
    return {
      ...draft,
      _id: draft._id,
      _type: 'product',
      _sourceOrigin: 'unsaved-local-draft',
    };
  };

  const handleSaveReviewedDraftToSanity = async () => {
    const candidateDoc = buildCandidateSanityDocumentFromEditable();
    if (!candidateDoc) return;

    setSaveState('saving');
    setSaveErrorMessage(null);
    const outcome = await onSaveImportedDraftToSanity(candidateDoc);
    if (!outcome.ok || !outcome.persistedDocument) {
      setSaveState('error');
      setSaveErrorMessage(
        outcome.errorMessage || 'Failed to save imported draft to Sanity Content Lake.'
      );
      return;
    }
    setSaveState('saved');
    setSavedRevisionInfo({
      documentId: outcome.persistedDocument._id,
      rev: outcome.persistedDocument._rev,
      transactionId: outcome.transactionId,
    });
  };

  const handleApplyToEditorWithoutSaving = () => {
    const candidateDoc = buildCandidateSanityDocumentFromEditable();
    if (!candidateDoc) return;
    onApplyImportedDraftToEditor(candidateDoc);
    onClose();
  };

  const activeQuarantinedSuggestions = (
    importReport?.quarantinedTaxonomySuggestions || []
  ).filter((q) => !dismissedQuarantinedTags.includes(q.rawValue));

  const currentEditablePrice = editableCreatePayload?.factualContext.price ?? null;
  const currentEditableInStock = editableCreatePayload?.factualContext.inStock ?? null;
  const currentPriceVerified = Boolean(
    editableCreatePayload?.factualContext.priceVerification.verified &&
      typeof currentEditablePrice === 'number' &&
      currentEditablePrice > 0
  );
  const currentInventoryVerified = Boolean(
    editableCreatePayload?.factualContext.inventoryVerification.verified &&
      typeof currentEditableInStock === 'boolean'
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Product Brief Export and Single-Operation Import"
      className="fixed inset-0 z-50 bg-[#0F172A]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between gap-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#34D399] shrink-0" />
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                AI Product Brief Exporter &amp; Universal JSON Importer
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Canonical Product Interchange Schema v1.0 · Zero API Keys Required · Works with ChatGPT, Claude, and Gemini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation Bar */}
        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWorkflowTab('export')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                workflowTab === 'export'
                  ? 'bg-[#1B3D5F] text-white'
                  : 'bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
              }`}
            >
              1. Export AI Writing Brief
            </button>
            <button
              type="button"
              onClick={() => setWorkflowTab('import')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                workflowTab === 'import'
                  ? 'bg-[#1B3D5F] text-white'
                  : 'bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
              }`}
            >
              2. Import AI Response (JSON / File)
            </button>
            <button
              type="button"
              disabled={!importReport}
              onClick={() => importReport && setWorkflowTab('review')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                !importReport
                  ? 'bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed'
                  : workflowTab === 'review'
                  ? 'bg-[#1B3D5F] text-white cursor-pointer'
                  : 'bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9] cursor-pointer'
              }`}
            >
              3. Review &amp; Save Draft to Sanity
            </button>
          </div>

          <div className="text-[11px] font-mono text-[#64748B]">
            URL → Export Brief → Write in ChatGPT → Paste/Upload JSON → Review → Save Draft
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* =================================================================
              TAB 1: EXPORT AI WRITING BRIEF
              ================================================================= */}
          {workflowTab === 'export' && (
            <div className="space-y-5">
              {/* Mode Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBriefMode('create')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    briefMode === 'create'
                      ? 'border-[#1B3D5F] bg-[#EFF6FF] ring-1 ring-[#1B3D5F]'
                      : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="text-xs font-semibold text-[#0F172A]">
                    New Product Profile from URL (mode: &quot;create&quot;)
                  </div>
                  <p className="text-xs text-[#475569] mt-1">
                    Start with only a product URL. Exports a complete self-contained brief so ChatGPT can research and write the entire editorial profile.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBriefMode('revision')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    briefMode === 'revision'
                      ? 'border-[#1B3D5F] bg-[#EFF6FF] ring-1 ring-[#1B3D5F]'
                      : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="text-xs font-semibold text-[#0F172A]">
                    Revise Existing Product (mode: &quot;revision&quot;)
                  </div>
                  <p className="text-xs text-[#475569] mt-1">
                    Includes the existing product’s canonical ID and current content so ChatGPT returns only the intended editorial or taxonomy updates.
                  </p>
                </button>
              </div>

              {/* Primary Input: Product URL or Existing Product Selector */}
              {briefMode === 'create' ? (
                <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] space-y-3">
                  <label className="block text-xs font-semibold text-[#0F172A]">
                    Product Source URL (Minimum Required Input) *
                  </label>
                  <input
                    type="url"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="https://merchant-or-brand.com/products/your-gift-item"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-2 focus:outline-[#1B3D5F]"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#475569]">
                    <span>
                      Derived slug suggestion: <code className="font-mono text-[#0F172A]">{generatedBrief.slugSuggestion}</code> · Canonical ID:{' '}
                      <code className="font-mono text-[#0F172A]">
                        prod_{generatedBrief.slugSuggestion.replace(/-/g, '_')}
                      </code>
                    </span>
                    {generatedBrief.matchedExistingProduct && (
                      <span className="text-[#059669] font-semibold">
                        ✓ Matched existing catalog record ({generatedBrief.canonicalProductId}) — known facts included automatically
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] space-y-3">
                  <label className="block text-xs font-semibold text-[#0F172A]">
                    Select Existing Product to Revise *
                  </label>
                  <select
                    value={selectedExistingProductId}
                    onChange={(e) => {
                      setSelectedExistingProductId(e.target.value);
                      const found = productDocuments.find((d) => d._id === e.target.value);
                      if (found?.purchaseUrl) {
                        setProductUrl(found.purchaseUrl);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A]"
                  >
                    {productDocuments.map((doc) => {
                      const canonicalId = (doc.productId || doc._id).replace(/^drafts\./, '');
                      const isDraft = doc._id.startsWith('drafts.');
                      return (
                        <option key={doc._id} value={doc._id}>
                          {isDraft ? '[Sanity Draft] ' : '[Catalog] '}
                          {doc.title || canonicalId} ({canonicalId})
                        </option>
                      );
                    })}
                  </select>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Revision Instructions for ChatGPT (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={revisionGoals}
                      onChange={(e) => setRevisionGoals(e.target.value)}
                      placeholder="E.g. Sharpen the Gift Verdict for holiday shoppers, add anniversary occasion context, and keep verified pricing unchanged..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A]"
                    />
                  </div>
                </div>
              )}

              {/* Optional Known Source Context */}
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowOptionalBriefInputs((prev) => !prev)}
                  className="w-full px-4 py-3 bg-white hover:bg-[#F8FAFC] flex items-center justify-between text-xs font-semibold text-[#334155] cursor-pointer"
                >
                  <span>
                    Optional Source Hints (Product Title, Maker, Verified Price, Affiliate Link, or Pasted Notes)
                  </span>
                  {showOptionalBriefInputs ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {showOptionalBriefInputs && (
                  <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1">
                        Known Product Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={knownTitle}
                        onChange={(e) => setKnownTitle(e.target.value)}
                        placeholder="E.g. Kiso Hinoki & Cherry Bark Tea Caddy"
                        className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1">
                        Known Maker / Brand (Optional)
                      </label>
                      <input
                        type="text"
                        value={knownVendor}
                        onChange={(e) => setKnownVendor(e.target.value)}
                        placeholder="E.g. Kiso Woodwork Studio"
                        className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1">
                        Verified Price in USD (Optional — leave blank if unknown)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={knownPriceInput}
                        onChange={(e) => setKnownPriceInput(e.target.value)}
                        placeholder="E.g. 68"
                        className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1">
                        Separate Purchase / Affiliate URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={purchaseDestinationUrl}
                        onChange={(e) => setPurchaseDestinationUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-[#0F172A] mb-1">
                        Additional Source Notes / Pasted Specifications (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={additionalSourceNotes}
                        onChange={(e) => setAdditionalSourceNotes(e.target.value)}
                        placeholder="Paste any known dimensions, materials, or editorial notes you want included in the brief..."
                        className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Export Actions */}
              <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-[#065F46]">
                    Self-Contained Markdown Writing Brief Ready ({generatedBrief.markdownBrief.length.toLocaleString()} chars)
                  </div>
                  <p className="text-xs text-[#047857]">
                    Includes Product Interchange v1.0 schema rules, all controlled vocabularies from <code>taxonomyRegistry.ts</code>, anti-hallucination rules, and a ready-to-fill JSON template.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={!isUrlReadyForExport}
                    onClick={handleCopyBrief}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors ${
                      !isUrlReadyForExport
                        ? 'bg-[#CBD5E1] text-[#64748B] cursor-not-allowed'
                        : 'bg-[#059669] text-white hover:bg-[#047857] cursor-pointer'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedBriefStatus ? 'Copied Complete Brief!' : 'Copy AI Brief'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={!isUrlReadyForExport}
                    onClick={handleDownloadBrief}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-lg border inline-flex items-center gap-1.5 transition-colors ${
                      !isUrlReadyForExport
                        ? 'border-[#CBD5E1] text-[#94A3B8] cursor-not-allowed'
                        : 'border-[#059669] bg-white text-[#065F46] hover:bg-[#D1FAE5] cursor-pointer'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .md</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkflowTab('import')}
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1B3D5F] text-white hover:bg-[#28537D] cursor-pointer"
                  >
                    Next: Import AI Response →
                  </button>
                </div>
              </div>

              {/* Collapsible Brief Preview */}
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowBriefMarkdownPreview((prev) => !prev)}
                  className="w-full px-4 py-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] flex items-center justify-between text-xs font-medium text-[#334155] cursor-pointer"
                >
                  <span>Preview Generated Markdown Brief ({generatedBrief.suggestedFilename})</span>
                  <span>{showBriefMarkdownPreview ? 'Hide Preview' : 'Show Preview'}</span>
                </button>
                {showBriefMarkdownPreview && (
                  <pre className="p-4 text-[11px] font-mono bg-[#0F172A] text-[#E2E8F0] overflow-x-auto max-h-80 leading-relaxed whitespace-pre-wrap">
                    {generatedBrief.markdownBrief}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 2: SINGLE-OPERATION IMPORT
              ================================================================= */}
          {workflowTab === 'import' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A]">
                    Paste Chatbot Response or Upload JSON / Markdown File
                  </h3>
                  <p className="text-xs text-[#475569]">
                    Supports raw JSON, a fenced <code>```json</code> block copied from ChatGPT, a response with surrounding prose, or an uploaded <code>.json</code>, <code>.md</code>, or <code>.txt</code> file.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.md,.txt,application/json,text/markdown,text/plain"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#CBD5E1] bg-white text-[#1E293B] hover:bg-[#F8FAFC] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload .json / .md / .txt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFilename(null);
                      setRawImportText(JSON.stringify(createExampleJson, null, 2));
                    }}
                    className="px-3 py-2 text-xs font-medium rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#1B3D5F] hover:bg-[#E2E8F0] cursor-pointer"
                  >
                    Load Fictional New Product Example
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFilename(null);
                      setRawImportText(JSON.stringify(revisionExampleJson, null, 2));
                    }}
                    className="px-3 py-2 text-xs font-medium rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#1B3D5F] hover:bg-[#E2E8F0] cursor-pointer"
                  >
                    Load Fictional Revision Example
                  </button>
                </div>
              </div>

              {uploadedFilename && (
                <div className="px-3.5 py-2 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1E40AF] flex items-center justify-between">
                  <span>
                    Loaded file: <strong>{uploadedFilename}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setUploadedFilename(null)}
                    className="underline cursor-pointer"
                  >
                    Clear filename
                  </button>
                </div>
              )}

              <textarea
                rows={14}
                value={rawImportText}
                onChange={(e) => {
                  setRawImportText(e.target.value);
                  setUploadedFilename(null);
                }}
                placeholder='Paste the entire ChatGPT / Claude / Gemini response here (either raw JSON or a ```json ... ``` block)...'
                className="w-full p-4 text-xs font-mono leading-relaxed rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] focus:bg-white focus:outline-2 focus:outline-[#1B3D5F]"
              />

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={!rawImportText.trim()}
                  onClick={handleValidateAndReviewImport}
                  className={`px-5 py-2.5 text-xs font-semibold rounded-lg inline-flex items-center gap-2 transition-colors ${
                    !rawImportText.trim()
                      ? 'bg-[#CBD5E1] text-[#64748B] cursor-not-allowed'
                      : 'bg-[#1B3D5F] text-white hover:bg-[#28537D] cursor-pointer'
                  }`}
                >
                  <FileCode2 className="w-4 h-4" />
                  <span>Validate &amp; Open Import Review Screen</span>
                </button>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 3: IMPORT REVIEW SCREEN
              ================================================================= */}
          {workflowTab === 'review' && importReport && (
            <div className="space-y-6">
              {/* Top Status Summary Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-wrap items-start justify-between gap-4 ${
                  !importReport.ok
                    ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                    : importReport.status === 'incomplete_needs_review'
                    ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                    : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {!importReport.ok ? (
                      <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                    )}
                    <span>
                      {!importReport.ok
                        ? `Import Blocked (${importReport.errors.length} Validation Error${
                            importReport.errors.length === 1 ? '' : 's'
                          })`
                        : importReport.status === 'incomplete_needs_review'
                        ? `Import Validated with Review Items (Mode: ${importReport.mode?.toUpperCase()} · Schema v${importReport.schemaVersion})`
                        : `Import Validated & Ready for Draft Save (Mode: ${importReport.mode?.toUpperCase()} · Schema v${importReport.schemaVersion})`}
                    </span>
                  </div>
                  <p className="text-xs opacity-90">
                    Source format detected: <code>{importReport.detectedSourceType}</code>
                    {importReport.canonicalProductId
                      ? ` · Canonical ID: ${importReport.canonicalProductId}`
                      : ''}
                    {' · '}This candidate has <strong>not</strong> been saved to Sanity yet. Review and edit any fields below, then click <strong>Save Draft to Sanity</strong>.
                  </p>
                </div>

                {importReport.ok && editableCreatePayload && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleApplyToEditorWithoutSaving}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#CBD5E1] bg-white text-[#1E293B] hover:bg-[#F8FAFC] cursor-pointer"
                    >
                      Load into Studio Form (Unsaved)
                    </button>
                    <button
                      type="button"
                      disabled={saveState === 'saving'}
                      onClick={handleSaveReviewedDraftToSanity}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#059669] text-white hover:bg-[#047857] cursor-pointer"
                    >
                      {saveState === 'saving'
                        ? 'Saving Draft to Sanity...'
                        : 'Save Draft to Sanity'}
                    </button>
                  </div>
                )}
              </div>

              {/* Persistence Status Feedback */}
              {saveState === 'saved' && savedRevisionInfo && (
                <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#10B981] text-xs text-[#065F46] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong>✓ Saved to Sanity Content Lake as Draft:</strong>{' '}
                    <code>{savedRevisionInfo.documentId}</code>
                    {savedRevisionInfo.rev ? ` · _rev: ${savedRevisionInfo.rev}` : ''}
                    {savedRevisionInfo.transactionId
                      ? ` · tx: ${savedRevisionInfo.transactionId}`
                      : ''}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-lg bg-[#065F46] text-white font-semibold cursor-pointer"
                  >
                    Done &amp; Return to Studio
                  </button>
                </div>
              )}

              {saveState === 'error' && saveErrorMessage && (
                <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#F87171] text-xs text-[#991B1B]">
                  <strong>Sanity Draft Save Failed:</strong> {saveErrorMessage}
                </div>
              )}

              {/* Blocking Validation Errors */}
              {importReport.errors.length > 0 && (
                <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] space-y-2">
                  <div className="text-xs font-semibold text-[#991B1B]">
                    Blocking Errors Requiring Correction:
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#7F1D1D]">
                    {importReport.errors.map((err, idx) => (
                      <li key={idx} className="font-mono">
                        • [{err.code}] <strong>{err.path}</strong>: {err.message}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setWorkflowTab('import')}
                    className="mt-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#991B1B] text-white cursor-pointer"
                  >
                    ← Back to Edit JSON Input
                  </button>
                </div>
              )}

              {/* 8-Section Structured Human Review Screen */}
              {importReport.ok && editableCreatePayload && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* SECTION 8 (Highlighted at top when warnings/diffs exist): Missing or Unverified Information & Revision Diffs */}
                  <div className="lg:col-span-2 p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                      Missing / Unverified Information, Duplicate Checks &amp; Proposed Revision Changes
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-white border border-[#E2E8F0]">
                        <div className="font-semibold text-[#0F172A]">
                          Factual Verification Status
                        </div>
                        <ul className="mt-1.5 space-y-1 text-[#475569]">
                          <li>
                            Price:{' '}
                            {currentEditablePrice !== null ? (
                              <strong className="text-[#0F172A]">${currentEditablePrice} USD</strong>
                            ) : (
                              <span className="text-[#D97706] font-semibold">
                                NULL (Unverified — set below before publishing)
                              </span>
                            )}{' '}
                            ({currentPriceVerified ? 'Verified' : 'Unverified'})
                          </li>
                          <li>
                            Stock:{' '}
                            {currentEditableInStock !== null ? (
                              <strong className="text-[#0F172A]">
                                {currentEditableInStock ? 'In Stock' : 'Out of Stock'}
                              </strong>
                            ) : (
                              <span className="text-[#D97706] font-semibold">
                                NULL (Unverified)
                              </span>
                            )}{' '}
                            ({currentInventoryVerified ? 'Verified' : 'Unverified'})
                          </li>
                        </ul>
                      </div>

                      <div className="p-3 rounded-lg bg-white border border-[#E2E8F0]">
                        <div className="font-semibold text-[#0F172A]">
                          Duplicate &amp; Canonical ID Check
                        </div>
                        {importReport.duplicateConflict ? (
                          <p className="mt-1 text-[#B45309]">
                            Matched existing product{' '}
                            <strong>{importReport.duplicateConflict.existingTitle}</strong> (
                            <code>{importReport.duplicateConflict.existingCanonicalProductId}</code>) by{' '}
                            <code>{importReport.duplicateConflict.matchedBy}</code>. Saving will update draft{' '}
                            <code>{importReport.duplicateConflict.existingDocumentId}</code> without creating a duplicate.
                          </p>
                        ) : (
                          <p className="mt-1 text-[#059669]">
                            ✓ No duplicate product collision detected. Target ID:{' '}
                            <code>{importReport.canonicalProductId}</code>
                          </p>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-white border border-[#E2E8F0]">
                        <div className="font-semibold text-[#0F172A]">
                          Unverified Flags ({importReport.unverifiedFactFlags.length})
                        </div>
                        {importReport.unverifiedFactFlags.length === 0 ? (
                          <p className="mt-1 text-[#059669]">
                            ✓ All primary commerce facts include verification provenance.
                          </p>
                        ) : (
                          <ul className="mt-1 space-y-1 text-[#B45309]">
                            {importReport.unverifiedFactFlags.map((flag, i) => (
                              <li key={i}>
                                • <strong>{flag.field}</strong>: {flag.reason}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Revision Field Diffs (when mode === "revision") */}
                    {importReport.mode === 'revision' && importReport.revisionDiffs.length > 0 && (
                      <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] space-y-2 text-xs">
                        <div className="font-semibold text-[#0F172A]">
                          Proposed Revision Field Diffs (Preserved:{' '}
                          {
                            importReport.revisionDiffs.filter((d) => d.action === 'preserved')
                              .length
                          }{' '}
                          fields)
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {importReport.revisionDiffs
                            .filter((d) => d.action !== 'preserved')
                            .map((diff, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]"
                              >
                                <span>
                                  <strong
                                    className={
                                      diff.action === 'updated'
                                        ? 'text-[#1D4ED8]'
                                        : diff.action === 'cleared'
                                        ? 'text-[#D97706]'
                                        : 'text-[#DC2626]'
                                    }
                                  >
                                    [{diff.action.toUpperCase()}]
                                  </strong>{' '}
                                  {diff.fieldPath}
                                </span>
                                <span className="text-[#475569] truncate max-w-xl">
                                  {diff.reason
                                    ? diff.reason
                                    : `${JSON.stringify(diff.previousValue)} → ${JSON.stringify(
                                        diff.nextValue
                                      )}`}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 1: PRODUCT IDENTITY */}
                  <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B3D5F]">
                      1. Product Identity
                    </h3>
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <label className="block font-semibold text-[#0F172A] mb-1">
                          Visible Product Title
                        </label>
                        <input
                          type="text"
                          value={editableCreatePayload.identity.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditableCreatePayload((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    identity: { ...prev.identity, title: val },
                                  }
                                : prev
                            );
                            setSaveState('unsaved');
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-[#CBD5E1]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-[#0F172A] mb-1">
                            Canonical ID (Immutable)
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={
                              editableCreatePayload.targetProduct?.canonicalProductId || ''
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] font-mono text-[#64748B]"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-[#0F172A] mb-1">
                            Product Category
                          </label>
                          <select
                            value={editableCreatePayload.identity.productType}
                            onChange={(e) => {
                              const val = e.target.value as CanonicalProductCategory;
                              setEditableCreatePayload((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      identity: { ...prev.identity, productType: val },
                                    }
                                  : prev
                              );
                              setSaveState('unsaved');
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1]"
                          >
                            {ALLOWED_PRODUCT_CATEGORY_VALUES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block font-semibold text-[#0F172A] mb-1">
                          Subtitle
                        </label>
                        <input
                          type="text"
                          value={editableCreatePayload.identity.subtitle}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditableCreatePayload((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    identity: { ...prev.identity, subtitle: val },
                                  }
                                : prev
                            );
                            setSaveState('unsaved');
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-[#CBD5E1]"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#0F172A] mb-1">
                          Callout Badge (Optional)
                        </label>
                        <input
                          type="text"
                          value={editableCreatePayload.identity.calloutTag ?? ''}
                          onChange={(e) => {
                            const val = e.target.value || null;
                            setEditableCreatePayload((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    identity: { ...prev.identity, calloutTag: val },
                                  }
                                : prev
                            );
                            setSaveState('unsaved');
                          }}
                          placeholder="None"
                          className="w-full px-3 py-1.5 rounded-lg border border-[#CBD5E1]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 7: COMMERCE INFORMATION */}
                  <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B3D5F]">
                      2. Commerce &amp; Verification
                    </h3>
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="block font-semibold text-[#0F172A] mb-1">
                          Price (USD)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={editableCreatePayload.factualContext.price ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const num =
                              raw.trim() === '' ? null : Math.max(0, Number(raw));
                            setEditableCreatePayload((prev) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                factualContext: {
                                  ...prev.factualContext,
                                  price: num,
                                },
                                taxonomy: {
                                  ...prev.taxonomy,
                                  budgetTier:
                                    num && num > 0
                                      ? deriveBudgetTierFromPrice(num)
                                      : prev.taxonomy.budgetTier,
                                  guidePriceBucket:
                                    num && num > 0
                                      ? deriveGuidePriceBucketFromPrice(num)
                                      : prev.taxonomy.guidePriceBucket,
                                },
                              };
                            });
                            setSaveState('unsaved');
                          }}
                          placeholder="Unverified (null)"
                          className="w-full px-3 py-1.5 rounded-lg border border-[#CBD5E1] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#0F172A] mb-1">
                          Commerce Provider
                        </label>
                        <select
                          value={editableCreatePayload.factualContext.commerceProvider}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setEditableCreatePayload((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    factualContext: {
                                      ...prev.factualContext,
                                      commerceProvider: val,
                                    },
                                  }
                                : prev
                            );
                            setSaveState('unsaved');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1]"
                        >
                          {ALLOWED_COMMERCE_PROVIDER_VALUES.map((cp) => (
                            <option key={cp} value={cp}>
                              {cp}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2 flex flex-wrap items-center gap-4 pt-1">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(editableCreatePayload.factualContext.inStock)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setEditableCreatePayload((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      factualContext: {
                                        ...prev.factualContext,
                                        inStock: checked,
                                      },
                                    }
                                  : prev
                              );
                              setSaveState('unsaved');
                            }}
                          />
                          <span>In Stock</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentPriceVerified}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setEditableCreatePayload((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      factualContext: {
                                        ...prev.factualContext,
                                        priceVerification: {
                                          verified: checked,
                                          source: checked
                                            ? 'retailer_live_check'
                                            : 'unverified',
                                          verifiedAt: checked
                                            ? new Date().toISOString()
                                            : null,
                                          evidenceNote:
                                            prev.factualContext.priceVerification
                                              .evidenceNote ?? null,
                                        },
                                      },
                                    }
                                  : prev
                              );
                              setSaveState('unsaved');
                            }}
                          />
                          <span>Mark Price Verified</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentInventoryVerified}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setEditableCreatePayload((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      factualContext: {
                                        ...prev.factualContext,
                                        inventoryVerification: {
                                          verified: checked,
                                          source: checked
                                            ? 'retailer_live_check'
                                            : 'unverified',
                                          verifiedAt: checked
                                            ? new Date().toISOString()
                                            : null,
                                        },
                                      },
                                    }
                                  : prev
                              );
                              setSaveState('unsaved');
                            }}
                          />
                          <span>Mark Inventory Verified</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: EDITORIAL PROFILE */}
                  <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B3D5F]">
                      3. Editorial Profile &amp; Gift Verdict
                    </h3>
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <label className="block font-semibold text-[#0F172A] mb-1">
                          Best-For Quick Summary
                        </label>
                        <textarea
                          rows={2}
                          value={editableCreatePayload.editorialProfile.bestForSummary}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditableCreatePayload((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    editorialProfile: {
                                      ...prev.editorialProfile,
                                      bestForSummary: val,
                                    },
                                  }
                                : prev
                            );
                            setSaveState('unsaved');
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-[#CBD5E1]"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#0F172A] mb-1">
                          Why To Give It (Primary Narrative)
                        </label>
                        <textarea
                          rows={3}
                          value={editableCreatePayload.editorialProfile.whyToGiveIt}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditableCreatePayload((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    editorialProfile: {
                                      ...prev.editorialProfile,
                                      whyToGiveIt: val,
                                    },
                                  }
                                : prev
                            );
                            setSaveState('unsaved');
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-[#CBD5E1]"
                        />
                      </div>
                      <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                        <div className="font-semibold text-[#0F172A]">
                          4-Part Gift Verdict
                        </div>
                        <p className="text-[#334155]">
                          <strong>Assessment:</strong>{' '}
                          {editableCreatePayload.editorialProfile.giftVerdict.editorialAssessment}
                        </p>
                        <p className="text-[#334155]">
                          <strong>Standout:</strong>{' '}
                          {editableCreatePayload.editorialProfile.giftVerdict.standoutReason}
                        </p>
                        <p className="text-[#334155]">
                          <strong>Delight:</strong>{' '}
                          {editableCreatePayload.editorialProfile.giftVerdict.recipientDelight}
                        </p>
                        {editableCreatePayload.editorialProfile.giftVerdict.importantCaveat && (
                          <p className="text-[#B45309]">
                            <strong>Caveat:</strong>{' '}
                            {editableCreatePayload.editorialProfile.giftVerdict.importantCaveat}
                          </p>
                        )}
                      </div>
                      <div className="text-[#475569]">
                        Extended Rationale Paragraphs:{' '}
                        <strong>
                          {editableCreatePayload.editorialProfile.extendedGiftRationale.length}
                        </strong>{' '}
                        · Buying Considerations:{' '}
                        <strong>
                          {editableCreatePayload.editorialProfile.buyingConsiderations.length}
                        </strong>{' '}
                        · Occasion Notes:{' '}
                        <strong>
                          {editableCreatePayload.editorialProfile.occasionContextNotes.length}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: RECIPIENT SUITABILITY */}
                  <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B3D5F]">
                      4. Recipient Suitability
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="font-semibold text-[#0F172A]">
                        {editableCreatePayload.editorialProfile.idealRecipientProfile.headline}
                      </div>
                      <p className="text-[#334155] leading-relaxed">
                        {editableCreatePayload.editorialProfile.idealRecipientProfile.narrative}
                      </p>
                      <div>
                        <div className="font-semibold text-[#0F172A] mb-1">
                          Lifestyle Cues:
                        </div>
                        <ul className="list-disc pl-4 space-y-0.5 text-[#475569]">
                          {editableCreatePayload.editorialProfile.idealRecipientProfile.lifestyleNotes.map(
                            (n, i) => (
                              <li key={i}>{n}</li>
                            )
                          )}
                        </ul>
                      </div>
                      <div>
                        <div className="font-semibold text-[#0F172A] mb-1">
                          Relationship Fit:
                        </div>
                        <ul className="list-disc pl-4 space-y-0.5 text-[#475569]">
                          {editableCreatePayload.editorialProfile.idealRecipientProfile.relationshipFit.map(
                            (r, i) => (
                              <li key={i}>{r}</li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: TAXONOMY & QUARANTINED SUGGESTIONS */}
                  <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B3D5F]">
                      5. Controlled Taxonomy &amp; Tag Mapping
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div>
                        <strong>Recipients:</strong>{' '}
                        <code>{editableCreatePayload.taxonomy.recipients.join(', ')}</code>
                      </div>
                      <div>
                        <strong>Occasions:</strong>{' '}
                        <code>{editableCreatePayload.taxonomy.occasions.join(', ')}</code>
                      </div>
                      <div>
                        <strong>Canonical Interests:</strong>{' '}
                        <code>{editableCreatePayload.taxonomy.interests.join(', ')}</code>
                      </div>
                      <div>
                        <strong>Personality Traits:</strong>{' '}
                        <code>
                          {editableCreatePayload.taxonomy.personalityTraits.join(', ')}
                        </code>
                      </div>
                      <div>
                        <strong>Age Ranges:</strong>{' '}
                        <code>{editableCreatePayload.taxonomy.ageRanges.join(', ')}</code>
                      </div>
                      <div>
                        <strong>Derived Budget / Guide Buckets:</strong>{' '}
                        <code>
                          {editableCreatePayload.taxonomy.budgetTier || 'unverified'} /{' '}
                          {editableCreatePayload.taxonomy.guidePriceBucket || 'unverified'}
                        </code>
                      </div>

                      {activeQuarantinedSuggestions.length > 0 && (
                        <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] space-y-2 mt-2">
                          <div className="font-semibold text-[#92400E]">
                            Quarantined AI Tag Suggestions ({activeQuarantinedSuggestions.length})
                          </div>
                          <p className="text-[11px] text-[#B45309]">
                            These non-canonical tags were excluded from <code>taxonomy.interests</code> so new categories are never auto-created. Map them to a canonical interest or dismiss:
                          </p>
                          <div className="space-y-2">
                            {activeQuarantinedSuggestions.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded border border-[#FDE68A]"
                              >
                                <span className="font-mono font-semibold text-[#92400E]">
                                  &quot;{item.rawValue}&quot;
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <select
                                    defaultValue=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleMapQuarantinedTagToCanonical(
                                          item.rawValue,
                                          e.target.value as CanonicalInterestTag
                                        );
                                      }
                                    }}
                                    className="px-2 py-1 text-[11px] rounded border border-[#CBD5E1]"
                                  >
                                    <option value="">Map to canonical interest...</option>
                                    {ALLOWED_INTEREST_VALUES.map((ci) => (
                                      <option key={ci} value={ci}>
                                        {ci}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDismissedQuarantinedTags((prev) => [
                                        ...prev,
                                        item.rawValue,
                                      ])
                                    }
                                    className="px-2 py-1 text-[11px] rounded border border-[#CBD5E1] text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION 5: SEO METADATA */}
                  <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B3D5F]">
                      6. Search Engine &amp; Social Metadata (SEO)
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="block font-semibold text-[#0F172A] mb-1">
                          SEO Title ({editableCreatePayload.seo.seoTitle.length}/65 chars)
                        </label>
                        <input
                          type="text"
                          value={editableCreatePayload.seo.seoTitle}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditableCreatePayload((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    seo: { ...prev.seo, seoTitle: val },
                                  }
                                : prev
                            );
                            setSaveState('unsaved');
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-[#CBD5E1]"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#0F172A] mb-1">
                          Meta Description ({editableCreatePayload.seo.metaDescription.length}/160 chars)
                        </label>
                        <textarea
                          rows={2}
                          value={editableCreatePayload.seo.metaDescription}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditableCreatePayload((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    seo: { ...prev.seo, metaDescription: val },
                                  }
                                : prev
                            );
                            setSaveState('unsaved');
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-[#CBD5E1]"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[#475569] font-mono text-[11px]">
                        <span>Canonical: {editableCreatePayload.seo.canonicalPath}</span>
                        <span>Indexing: {editableCreatePayload.seo.indexing}</span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 6: IMAGES & SOURCE FACTS */}
                  <div className="lg:col-span-2 p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B3D5F]">
                      7. Images, Specifications &amp; Source Facts
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-2">
                        <div>
                          <label className="block font-semibold text-[#0F172A] mb-1">
                            Merchant Source URL
                          </label>
                          <input
                            type="url"
                            value={editableCreatePayload.factualContext.sourceUrl ?? ''}
                            onChange={(e) => {
                              const val = e.target.value || null;
                              setEditableCreatePayload((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      factualContext: {
                                        ...prev.factualContext,
                                        sourceUrl: val,
                                      },
                                    }
                                  : prev
                              );
                              setSaveState('unsaved');
                            }}
                            className="w-full px-3 py-1.5 rounded-lg border border-[#CBD5E1]"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-[#0F172A] mb-1">
                            Maker / Vendor Name
                          </label>
                          <input
                            type="text"
                            value={editableCreatePayload.factualContext.vendor ?? ''}
                            onChange={(e) => {
                              const val = e.target.value || null;
                              setEditableCreatePayload((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      factualContext: {
                                        ...prev.factualContext,
                                        vendor: val,
                                      },
                                    }
                                  : prev
                              );
                              setSaveState('unsaved');
                            }}
                            className="w-full px-3 py-1.5 rounded-lg border border-[#CBD5E1]"
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-[#0F172A] mb-1">
                            Verified Specifications ({editableCreatePayload.factualContext.specifications.length})
                          </div>
                          <ul className="space-y-1 text-[#475569]">
                            {editableCreatePayload.factualContext.specifications.map(
                              (spec, idx) => (
                                <li key={idx}>
                                  • <strong>{spec.label}:</strong> {spec.value}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="font-semibold text-[#0F172A]">
                          Product Photography ({editableCreatePayload.media.images.length})
                        </div>
                        {editableCreatePayload.media.images.map((img, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] space-y-1.5"
                          >
                            <div className="font-mono text-[11px] truncate text-[#1B3D5F]">
                              {img.url}
                            </div>
                            <div className="text-[#334155]">
                              <strong>Alt:</strong> {img.alt}
                            </div>
                            <div className="text-[11px] text-[#64748B] font-mono">
                              fitMode: {img.fitMode || 'cover'} · focalPoint: (
                              {img.focalPoint?.x ?? 0.5}, {img.focalPoint?.y ?? 0.5})
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Optional Collapsible Advanced JSON View for Debugging */}
                  <div className="lg:col-span-2 border border-[#E2E8F0] rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedJsonDebug((prev) => !prev)}
                      className="w-full px-4 py-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] flex items-center justify-between text-xs font-medium text-[#475569] cursor-pointer"
                    >
                      <span>Advanced JSON View (Normalized Interchange &amp; Sanity Draft Payload)</span>
                      <span>{showAdvancedJsonDebug ? 'Hide JSON' : 'Show JSON'}</span>
                    </button>
                    {showAdvancedJsonDebug && (
                      <pre className="p-4 text-[11px] font-mono bg-[#0F172A] text-[#E2E8F0] overflow-x-auto max-h-80">
                        {JSON.stringify(
                          {
                            editableInterchange: editableCreatePayload,
                            sanityDraftCandidate: buildCandidateSanityDocumentFromEditable(),
                          },
                          null,
                          2
                        )}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
