import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileCode2,
  FileText,
  HelpCircle,
  Link as LinkIcon,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  GeneratedProductAiBrief,
  generateProductAiWritingBrief,
} from '../../cms/productAiBriefExporter';
import {
  ProductInterchangeCreatePayloadV1,
  mapInterchangeToSanityProductDraft,
} from '../../cms/productInterchangeSchema';
import {
  UniversalProductImportReport,
  importProductInterchangeResponse,
} from '../../cms/productUniversalImporter';
import createExampleJson from '../../cms/examples/product-interchange-v1-create.example.json';
import {
  ProductMediaManager,
  SanityStudioImageItem,
} from './ProductMediaManager';
import type { SanityStudioDocument } from './SanityStudioWorkspace';

export interface ProductCreationViewProps {
  onBackToLibrary: () => void;
  workspaceDocuments: SanityStudioDocument[];
  onOpenEditorialReview: (draftDoc: SanityStudioDocument, initialReport?: UniversalProductImportReport) => void;
  sessionCredentials?: {
    sessionToken: string;
    csrfToken: string;
    expiresAtMs: number;
  } | null;
}

function slugifyUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1] || parsed.hostname.replace('www.', '');
    return lastPart
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
  } catch {
    return 'new-product';
  }
}

export const ProductCreationView: React.FC<ProductCreationViewProps> = ({
  onBackToLibrary,
  workspaceDocuments,
  onOpenEditorialReview,
  sessionCredentials,
}) => {
  // Step 1: URL input
  const [productUrl, setProductUrl] = useState<string>('');
  const [showOptionalContext, setShowOptionalContext] = useState<boolean>(false);
  const [knownVendor, setKnownVendor] = useState<string>('');
  const [knownTitle, setKnownTitle] = useState<string>('');
  const [knownPrice, setKnownPrice] = useState<string>('');
  const [knownStock, setKnownStock] = useState<'unknown' | 'true' | 'false'>('unknown');
  const [sourceNotes, setSourceNotes] = useState<string>('');

  // Pre-uploaded Sanity product gallery images (preserved across AI brief export & import)
  const [uploadedGalleryImages, setUploadedGalleryImages] = useState<
    SanityStudioImageItem[]
  >([]);

  // Step 2: Brief state
  const [copiedBrief, setCopiedBrief] = useState<boolean>(false);
  const [showBriefPreview, setShowBriefPreview] = useState<boolean>(false);

  // Step 3: Import state
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Derived slug and ID
  const derivedSlug = useMemo(() => {
    if (!productUrl.trim()) return '';
    return slugifyUrl(productUrl);
  }, [productUrl]);

  const derivedCanonicalId = useMemo(() => {
    if (!derivedSlug) return '';
    const clean = derivedSlug.replace(/[^a-z0-9_]+/g, '_');
    return `prod_${clean.slice(0, 36)}`;
  }, [derivedSlug]);

  // Programmatic AI brief generation (includes uploaded gallery context if present)
  const generatedBrief: GeneratedProductAiBrief | null = useMemo(() => {
    if (!productUrl.trim()) return null;
    const priceNum =
      knownPrice.trim() !== '' && Number.isFinite(Number(knownPrice))
        ? Number(knownPrice)
        : undefined;
    const stockBool =
      knownStock === 'true' ? true : knownStock === 'false' ? false : undefined;

    return generateProductAiWritingBrief({
      mode: 'create',
      productUrl: productUrl.trim(),
      knownTitle: knownTitle.trim() || undefined,
      knownVendor: knownVendor.trim() || undefined,
      knownPrice: priceNum,
      knownInStock: stockBool,
      additionalSourceNotes: sourceNotes.trim() || undefined,
      uploadedImages:
        uploadedGalleryImages.length > 0 ? uploadedGalleryImages : undefined,
    });
  }, [
    productUrl,
    knownTitle,
    knownVendor,
    knownPrice,
    knownStock,
    sourceNotes,
    uploadedGalleryImages,
  ]);

  const handleCopyBrief = async () => {
    if (!generatedBrief) return;
    try {
      await navigator.clipboard.writeText(generatedBrief.markdownBrief);
      setCopiedBrief(true);
      setTimeout(() => setCopiedBrief(false), 2500);
    } catch {
      // Fallback
      setCopiedBrief(true);
    }
  };

  const handleDownloadBrief = () => {
    if (!generatedBrief) return;
    const blob = new Blob([generatedBrief.markdownBrief], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generatedBrief.suggestedFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadSampleJson = () => {
    setImportJsonText(JSON.stringify(createExampleJson, null, 2));
    setImportError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      setImportJsonText(text);
      setImportError(null);
    };
    reader.readAsText(file);
  };

  const handleImportAndReview = () => {
    setImportError(null);
    if (!importJsonText.trim()) {
      setImportError('Please paste the chatbot response or upload a JSON file.');
      return;
    }

    try {
      const report = importProductInterchangeResponse({
        rawInput: importJsonText,
        expectedMode: 'create',
        workspaceDocuments,
        enforceVerifiedFactProtection: true,
        existingDraftImages:
          uploadedGalleryImages.length > 0 ? uploadedGalleryImages : undefined,
      });

      if (!report.ok || !report.resolvedCreatePayload) {
        const topError = report.errors?.[0]?.message || 'Validation failed. Check the payload format.';
        setImportError(topError);
        return;
      }

      // Convert canonical interchange payload to Sanity Draft
      const rawDraft = mapInterchangeToSanityProductDraft(report.resolvedCreatePayload);
      const sanityDraftDoc: SanityStudioDocument = {
        _id: rawDraft._id || `drafts.prod_${report.resolvedCreatePayload.identity.slug.replace(/[^a-z0-9_]+/g, '_')}`,
        _type: 'product',
        ...rawDraft,
        _sourceOrigin: 'sanity-content-lake',
      };

      // Open the rich Editorial Review Screen directly!
      onOpenEditorialReview(sanityDraftDoc, report);
    } catch (err: any) {
      setImportError(err?.message || 'Failed to parse AI response.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F6] overflow-y-auto">
      {/* Top Header */}
      <div className="px-8 py-5 border-b border-[#E2E8F0] bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToLibrary}
              className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Library</span>
            </button>
            <span className="text-[#CBD5E1]">/</span>
            <h1 className="font-serif text-xl font-semibold text-[#0F172A]">
              New Product · AI Authoring Workflow
            </h1>
          </div>
          <button
            type="button"
            onClick={handleLoadSampleJson}
            className="text-xs text-[#2A5A48] hover:underline font-medium"
          >
            Load Sample AI Response
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-8 py-8 space-y-8">
        {/* Step 1: Minimum URL Starting Point */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#2A5A48] px-2 py-0.5 rounded-full bg-[#2A5A48]/10 inline-block mb-1.5">
                Step 1 · Minimum Input
              </span>
              <h2 className="font-serif text-lg font-semibold text-[#0F172A]">
                Product Merchant or Maker URL
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Paste the merchant, artisan, or manufacturer product page. The exporter will build a complete research prompt.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="relative">
              <LinkIcon className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://merchant.com/products/artisan-brass-kettle"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2A5A48]/20 focus:border-[#2A5A48]"
              />
            </div>

            {derivedSlug && (
              <div className="mt-2 flex items-center gap-3 text-[11px] text-[#64748B]">
                <span>
                  Derived Slug: <span className="font-mono text-[#0F172A]">/{derivedSlug}</span>
                </span>
                <span>•</span>
                <span>
                  Canonical ID: <span className="font-mono text-[#0F172A]">{derivedCanonicalId}</span>
                </span>
              </div>
            )}
          </div>

          {/* Optional Progressive Disclosure */}
          <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
            <button
              type="button"
              onClick={() => setShowOptionalContext(!showOptionalContext)}
              className="text-xs text-[#64748B] hover:text-[#0F172A] flex items-center gap-1.5 font-medium"
            >
              {showOptionalContext ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <span>Add optional known details before exporting (title, vendor, price, notes)</span>
            </button>

            {showOptionalContext && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">
                    Known Title
                  </label>
                  <input
                    type="text"
                    value={knownTitle}
                    onChange={(e) => setKnownTitle(e.target.value)}
                    placeholder="e.g. Copper Kettle"
                    className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">
                    Maker / Vendor
                  </label>
                  <input
                    type="text"
                    value={knownVendor}
                    onChange={(e) => setKnownVendor(e.target.value)}
                    placeholder="e.g. Azmaya"
                    className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">
                    Known Price (USD)
                  </label>
                  <input
                    type="number"
                    value={knownPrice}
                    onChange={(e) => setKnownPrice(e.target.value)}
                    placeholder="e.g. 185"
                    className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">
                    Stock Status
                  </label>
                  <select
                    value={knownStock}
                    onChange={(e) => setKnownStock(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg text-[#475569]"
                  >
                    <option value="unknown">Unknown / Let AI verify</option>
                    <option value="true">In Stock</option>
                    <option value="false">Out of Stock</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 1B: Product Photography & Multi-Image Sanity Uploader */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#2A5A48] px-2 py-0.5 rounded-full bg-[#2A5A48]/10 inline-block mb-1.5">
                Product Photography · Multi-Image Gallery
              </span>
              <h2 className="font-serif text-lg font-semibold text-[#0F172A]">
                Upload Product Photographs (Preserved Across AI Import)
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Upload photographs directly from your computer to Sanity Content Lake before or after running ChatGPT. Uploaded images are automatically preserved when importing editorial JSON.
              </p>
            </div>
          </div>

          <ProductMediaManager
            images={uploadedGalleryImages}
            productTitle={knownTitle.trim() || derivedSlug || 'New Product'}
            onChangeImages={setUploadedGalleryImages}
            sessionCredentials={sessionCredentials}
          />
        </div>

        {/* Step 2 & 3: Two High-Contrast Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card A: Export AI Brief */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#2A5A48] px-2 py-0.5 rounded-full bg-[#2A5A48]/10">
                  Method 1 · Brief Exporter
                </span>
                <Sparkles className="w-4 h-4 text-[#2A5A48]" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-[#0F172A]">
                Export AI Writing Brief
              </h3>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                Generate the comprehensive writing brief containing controlled taxonomy, 4-part verdict guidelines, and the canonical JSON Schema v1.0. Give this to ChatGPT, Claude, or Gemini.
              </p>

              {/* Status note */}
              <div className="mt-4 p-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl text-xs text-[#475569]">
                {productUrl.trim() ? (
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">
                      Brief ready for {derivedSlug || 'product'}
                    </span>
                  </div>
                ) : (
                  <span className="text-[#64748B]">
                    Enter a Product URL in Step 1 above to generate the brief.
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#F1F5F9] space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyBrief}
                  disabled={!generatedBrief}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    generatedBrief
                      ? 'bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-xs'
                      : 'bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedBrief ? 'Copied to Clipboard!' : 'Copy Brief'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBrief}
                  disabled={!generatedBrief}
                  className={`py-2 px-3 border border-[#E2E8F0] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    generatedBrief
                      ? 'bg-white hover:bg-[#F8FAFC] text-[#0F172A]'
                      : 'bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed'
                  }`}
                  title="Download as .md file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.md</span>
                </button>
              </div>

              {generatedBrief && (
                <button
                  type="button"
                  onClick={() => setShowBriefPreview(!showBriefPreview)}
                  className="w-full text-center text-xs text-[#64748B] hover:text-[#0F172A] font-medium"
                >
                  {showBriefPreview ? 'Hide brief preview' : 'Preview brief content'}
                </button>
              )}

              {showBriefPreview && generatedBrief && (
                <div className="max-h-48 overflow-y-auto p-3 bg-[#0F172A] text-[#E2E8F0] rounded-xl text-[10px] font-mono whitespace-pre-wrap leading-relaxed">
                  {generatedBrief.markdownBrief}
                </div>
              )}
            </div>
          </div>

          {/* Card B: Universal Import AI Response */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#2A5A48] px-2 py-0.5 rounded-full bg-[#2A5A48]/10">
                  Method 2 · Universal Importer
                </span>
                <Upload className="w-4 h-4 text-[#2A5A48]" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-[#0F172A]">
                Import AI Chatbot Response
              </h3>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                Paste the entire output from ChatGPT, Claude, or Gemini. The parser automatically extracts the JSON, validates schema v1.0, and maps it directly into the editorial review screen.
              </p>

              <div className="mt-4">
                <textarea
                  value={importJsonText}
                  onChange={(e) => {
                    setImportJsonText(e.target.value);
                    if (importError) setImportError(null);
                  }}
                  rows={5}
                  placeholder="Paste ```json ... ``` response or raw JSON payload here..."
                  className="w-full p-3 text-xs font-mono bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2A5A48]/20 focus:border-[#2A5A48]"
                />

                <div className="mt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.md,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[#64748B] hover:text-[#0F172A] text-[11px] flex items-center gap-1 font-medium"
                    >
                      <Upload className="w-3 h-3" />
                      Upload file (.json/.md)
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadSampleJson}
                    className="text-[#2A5A48] hover:underline text-[11px] font-medium"
                  >
                    Paste Sample Response
                  </button>
                </div>
              </div>

              {importError && (
                <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={handleImportAndReview}
                className="w-full py-2.5 px-4 bg-[#2A5A48] hover:bg-[#234b3c] text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <span>Import & Open Editorial Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
