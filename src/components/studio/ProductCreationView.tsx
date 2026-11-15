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
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  GeneratedProductAiBrief,
  generateProductAiWritingBrief,
} from '../../cms/productAiBriefExporter';
import { mapInterchangeToSanityProductDraft } from '../../cms/productInterchangeSchema';
import {
  UniversalProductImportReport,
  importProductInterchangeResponse,
} from '../../cms/productUniversalImporter';
import createExampleJson from '../../cms/examples/product-interchange-v1-create.example.json';
import type { ExtractedProductDetails } from '../../cms/studio/productUrlExtractor';
import {
  ProductMediaManager,
  SanityStudioImageItem,
} from './ProductMediaManager';
import { fetchStudioApiJson } from './studioApiClient';
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
  // Step 1: URL input & server-side extraction state
  const [productUrl, setProductUrl] = useState<string>('');
  const [isFetchingDetails, setIsFetchingDetails] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [extractedDetails, setExtractedDetails] =
    useState<ExtractedProductDetails | null>(null);

  const [showOptionalContext, setShowOptionalContext] = useState<boolean>(false);
  const [knownVendor, setKnownVendor] = useState<string>('');
  const [knownTitle, setKnownTitle] = useState<string>('');
  const [knownPrice, setKnownPrice] = useState<string>('');
  const [knownCurrency, setKnownCurrency] = useState<string>('USD');
  const [knownStock, setKnownStock] = useState<'unknown' | 'true' | 'false'>('unknown');
  const [knownAvailabilityLabel, setKnownAvailabilityLabel] = useState<string>('');
  const [knownDescription, setKnownDescription] = useState<string>('');
  const [knownMaterialsText, setKnownMaterialsText] = useState<string>('');
  const [knownDimensions, setKnownDimensions] = useState<string>('');
  const [knownSpecs, setKnownSpecs] = useState<
    Array<{ label: string; value: string; source?: string }>
  >([]);
  const [selectedExtractedImageUrls, setSelectedExtractedImageUrls] = useState<string[]>([]);
  const [priceConfirmed, setPriceConfirmed] = useState<boolean>(false);
  const [stockConfirmed, setStockConfirmed] = useState<boolean>(false);
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

  const handleFetchProductDetails = async () => {
    const target = productUrl.trim();
    if (!target) {
      setFetchError('Enter a merchant product URL first.');
      return;
    }

    setIsFetchingDetails(true);
    setFetchError(null);

    try {
      const res = await fetchStudioApiJson<ExtractedProductDetails>(
        '/api/studio/sanity/fetch-product-details',
        {
          method: 'POST',
          sessionCredentials,
          body: { url: target },
        }
      );

      if (!res.ok || !res.data || (res.data as any).ok === false) {
        setFetchError(
          res.diagnosticMessage ||
            (res.data as any)?.message ||
            'Unable to retrieve product details from that URL.'
        );
        return;
      }

      const data = res.data;
      setExtractedDetails(data);
      setShowOptionalContext(true);

      // Populate reviewable fields cleanly (never marking unconfirmed facts as verified)
      setKnownTitle(data.title || '');
      setKnownVendor(data.vendor || data.brand || '');
      setKnownPrice(
        typeof data.price === 'number' && Number.isFinite(data.price) && data.price > 0
          ? String(data.price)
          : ''
      );
      setKnownCurrency(data.currency || 'USD');
      setKnownStock(
        data.inStock === true ? 'true' : data.inStock === false ? 'false' : 'unknown'
      );
      setKnownAvailabilityLabel(data.availabilityLabel || '');
      setKnownDescription(data.description || '');
      setKnownMaterialsText(data.materials.join(', '));
      setKnownDimensions(data.dimensions || '');
      setKnownSpecs(
        Array.isArray(data.specifications)
          ? data.specifications.map((s) => ({
              label: s.label,
              value: s.value,
              source: s.source,
            }))
          : []
      );
      setSelectedExtractedImageUrls(data.images.slice(0, 6).map((img) => img.url));
      // Always start unverified until human editor reviews and checks confirmation
      setPriceConfirmed(false);
      setStockConfirmed(false);
    } catch (err: any) {
      setFetchError(err?.message || 'Network error fetching product details.');
    } finally {
      setIsFetchingDetails(false);
    }
  };

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

  const parsedMaterialsList = useMemo(
    () =>
      knownMaterialsText
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean),
    [knownMaterialsText]
  );

  // Programmatic AI brief generation (includes retrieved merchant facts + uploaded gallery context)
  const generatedBrief: GeneratedProductAiBrief | null = useMemo(() => {
    if (!productUrl.trim()) return null;
    const priceNum =
      knownPrice.trim() !== '' && Number.isFinite(Number(knownPrice)) && Number(knownPrice) > 0
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
      knownCurrency: knownCurrency.trim() || 'USD',
      knownInStock: stockBool,
      knownAvailabilityLabel: knownAvailabilityLabel.trim() || undefined,
      knownDescription: knownDescription.trim() || undefined,
      knownMaterials: parsedMaterialsList.length > 0 ? parsedMaterialsList : undefined,
      knownDimensions: knownDimensions.trim() || undefined,
      knownSpecifications: knownSpecs.length > 0 ? knownSpecs : undefined,
      knownVariants: extractedDetails?.variants,
      knownSizes: extractedDetails?.sizes,
      knownColors: extractedDetails?.colors,
      knownImageUrls:
        selectedExtractedImageUrls.length > 0 ? selectedExtractedImageUrls : undefined,
      retrievedFromUrl: Boolean(extractedDetails),
      knownPriceConfirmed: extractedDetails ? priceConfirmed : priceNum !== undefined,
      knownStockConfirmed: extractedDetails ? stockConfirmed : stockBool !== undefined,
      missingRetrievedFields: extractedDetails?.missingFields,
      unverifiedRetrievedFields: extractedDetails?.unverifiedFields,
      extractionSources: extractedDetails?.extractionSources,
      additionalSourceNotes: sourceNotes.trim() || undefined,
      uploadedImages:
        uploadedGalleryImages.length > 0 ? uploadedGalleryImages : undefined,
    });
  }, [
    productUrl,
    knownTitle,
    knownVendor,
    knownPrice,
    knownCurrency,
    knownStock,
    knownAvailabilityLabel,
    knownDescription,
    parsedMaterialsList,
    knownDimensions,
    knownSpecs,
    selectedExtractedImageUrls,
    extractedDetails,
    priceConfirmed,
    stockConfirmed,
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
      const fallbackSelectedImages =
        (!rawDraft.images || rawDraft.images.length === 0) &&
        uploadedGalleryImages.length === 0 &&
        selectedExtractedImageUrls.length > 0
          ? selectedExtractedImageUrls.map((url, idx) => {
              const matchedMeta = extractedDetails?.images.find((i) => i.url === url);
              return {
                _key: `img_ext_${idx + 1}`,
                _type: 'productImage',
                id: `img_ext_${idx + 1}`,
                url,
                externalUrl: url,
                alt:
                  matchedMeta?.alt ||
                  `${knownTitle.trim() || rawDraft.title || 'Product'} photograph ${idx + 1}`,
                fitMode: 'cover' as const,
                fallbackColor: '#F6F4EF',
                focalPoint: { x: 0.5, y: 0.5 },
                sourceType: 'external-url',
              };
            })
          : null;

      const sanityDraftDoc: SanityStudioDocument = {
        _id: rawDraft._id || `drafts.prod_${report.resolvedCreatePayload.identity.slug.replace(/[^a-z0-9_]+/g, '_')}`,
        _type: 'product',
        ...rawDraft,
        ...(fallbackSelectedImages ? { images: fallbackSelectedImages } : {}),
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
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <LinkIcon className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={productUrl}
                  onChange={(e) => {
                    setProductUrl(e.target.value);
                    if (fetchError) setFetchError(null);
                  }}
                  placeholder="https://merchant.com/products/artisan-brass-kettle"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2A5A48]/20 focus:border-[#2A5A48]"
                />
              </div>
              <button
                type="button"
                onClick={handleFetchProductDetails}
                disabled={isFetchingDetails || !productUrl.trim()}
                className="px-4 py-2.5 bg-[#1B3D5F] hover:bg-[#28537D] disabled:bg-[#CBD5E1] disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
              >
                {isFetchingDetails ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                <span>
                  {isFetchingDetails ? 'Fetching Details...' : 'Fetch Product Details'}
                </span>
              </button>
            </div>

            {fetchError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Unable to fetch merchant URL automatically</p>
                  <p className="mt-0.5">{fetchError}</p>
                </div>
              </div>
            )}

            {derivedSlug && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#64748B]">
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

          {/* Retrieved Product Details Review & Provenance Banner */}
          {extractedDetails && (
            <div className="mt-5 p-4 bg-[#FAF9F6] border border-[#CBD5E1] rounded-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2A5A48]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                    Retrieved Merchant Product Details (Review & Correct Before Brief Export)
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {extractedDetails.extractionSources.map((src) => (
                    <span
                      key={src}
                      className="px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-[10px] font-mono text-[#475569]"
                    >
                      {src}
                    </span>
                  ))}
                  <a
                    href={extractedDetails.finalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#1B3D5F] hover:underline ml-1"
                  >
                    <span>Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {(extractedDetails.missingFields.length > 0 ||
                extractedDetails.unverifiedFields.length > 0) && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Verification & Missing Facts Notice</span>
                  </div>
                  {extractedDetails.missingFields.length > 0 && (
                    <p>
                      <strong>Missing / Not Found:</strong>{' '}
                      {extractedDetails.missingFields.join(', ')}
                    </p>
                  )}
                  <p className="text-amber-800">
                    Retrieved price and availability remain marked <strong>Unverified</strong> until an editor checks them directly against the live merchant page.
                  </p>
                </div>
              )}

              {/* Variants / Sizes / Colors summary if retrieved */}
              {(extractedDetails.variants.length > 0 ||
                extractedDetails.sizes.length > 0 ||
                extractedDetails.colors.length > 0) && (
                <div className="flex flex-wrap gap-3 text-[11px] text-[#334155] bg-white p-3 rounded-lg border border-[#E2E8F0]">
                  {extractedDetails.sizes.length > 0 && (
                    <div>
                      <span className="font-semibold text-[#0F172A]">Sizes:</span>{' '}
                      <span>{extractedDetails.sizes.join(', ')}</span>
                    </div>
                  )}
                  {extractedDetails.colors.length > 0 && (
                    <div>
                      <span className="font-semibold text-[#0F172A]">Colors / Finishes:</span>{' '}
                      <span>{extractedDetails.colors.join(', ')}</span>
                    </div>
                  )}
                  {extractedDetails.variants.length > 0 && (
                    <div>
                      <span className="font-semibold text-[#0F172A]">Variants:</span>{' '}
                      <span>
                        {extractedDetails.variants
                          .slice(0, 8)
                          .map((v) => v.title)
                          .join(', ')}
                        {extractedDetails.variants.length > 8
                          ? ` (+${extractedDetails.variants.length - 8} more)`
                          : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Retrieved Merchant Images selector */}
              {extractedDetails.images.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#2A5A48]" />
                      Retrieved Merchant Images ({selectedExtractedImageUrls.length} of{' '}
                      {extractedDetails.images.length} selected for brief & draft fallback)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedExtractedImageUrls(
                          selectedExtractedImageUrls.length === extractedDetails.images.length
                            ? []
                            : extractedDetails.images.map((img) => img.url)
                        )
                      }
                      className="text-[#1B3D5F] hover:underline font-medium"
                    >
                      {selectedExtractedImageUrls.length === extractedDetails.images.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {extractedDetails.images.map((img, idx) => {
                      const isChecked = selectedExtractedImageUrls.includes(img.url);
                      return (
                        <button
                          key={`${img.url}_${idx}`}
                          type="button"
                          onClick={() =>
                            setSelectedExtractedImageUrls((prev) =>
                              prev.includes(img.url)
                                ? prev.filter((u) => u !== img.url)
                                : [...prev, img.url]
                            )
                          }
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all bg-white ${
                            isChecked
                              ? 'border-[#2A5A48] ring-2 ring-[#2A5A48]/20'
                              : 'border-[#E2E8F0] opacity-55 hover:opacity-85'
                          }`}
                          title={img.alt}
                        >
                          <img
                            src={img.url}
                            alt={img.alt}
                            className="w-full h-full object-cover"
                          />
                          <span
                            className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isChecked
                                ? 'bg-[#2A5A48] text-white'
                                : 'bg-white/90 text-[#475569]'
                            }`}
                          >
                            {isChecked ? 'Selected' : 'Off'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Review / Correct Facts Accordion */}
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
              <span>
                {extractedDetails
                  ? 'Review & edit extracted product facts before exporting AI brief'
                  : 'Add or edit known details before exporting (title, vendor, price, specs, notes)'}
              </span>
            </button>

            {showOptionalContext && (
              <div className="mt-4 space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      Product Title
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
                      Maker / Brand / Merchant
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
                      Price ({knownCurrency || 'USD'})
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        value={knownPrice}
                        onChange={(e) => setKnownPrice(e.target.value)}
                        placeholder="Unknown"
                        className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                      />
                      <input
                        type="text"
                        value={knownCurrency}
                        onChange={(e) => setKnownCurrency(e.target.value.toUpperCase())}
                        maxLength={4}
                        className="w-14 px-2 py-1.5 text-xs font-mono bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg text-center"
                        title="Currency"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      Availability
                    </label>
                    <select
                      value={knownStock}
                      onChange={(e) => setKnownStock(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg text-[#475569]"
                    >
                      <option value="unknown">Unknown / Unverified</option>
                      <option value="true">In Stock</option>
                      <option value="false">Out of Stock / Pre-Order</option>
                    </select>
                  </div>
                </div>

                {extractedDetails && (
                  <div className="flex flex-wrap gap-4 text-[11px] text-[#475569]">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={priceConfirmed}
                        disabled={!knownPrice.trim() || Number(knownPrice) <= 0}
                        onChange={(e) => setPriceConfirmed(e.target.checked)}
                      />
                      <span>Mark retrieved price as editor-confirmed</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stockConfirmed}
                        disabled={knownStock === 'unknown'}
                        onChange={(e) => setStockConfirmed(e.target.checked)}
                      />
                      <span>Mark retrieved stock status as editor-confirmed</span>
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      Materials (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={knownMaterialsText}
                      onChange={(e) => setKnownMaterialsText(e.target.value)}
                      placeholder="e.g. 400 GSM Organic Cotton, Stoneware"
                      className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      Dimensions / Weight
                    </label>
                    <input
                      type="text"
                      value={knownDimensions}
                      onChange={(e) => setKnownDimensions(e.target.value)}
                      placeholder="e.g. 14cm × 9cm, 420g"
                      className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">
                    Merchant Description (Included in AI Writing Brief)
                  </label>
                  <textarea
                    rows={3}
                    value={knownDescription}
                    onChange={(e) => setKnownDescription(e.target.value)}
                    placeholder="Extracted or pasted merchant product description..."
                    className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                  />
                </div>

                {/* Retrieved / Editable Specifications */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-[#475569]">
                      Specifications ({knownSpecs.length})
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setKnownSpecs((prev) => [...prev, { label: '', value: '' }])
                      }
                      className="inline-flex items-center gap-1 text-[11px] text-[#2A5A48] hover:underline font-medium"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Spec</span>
                    </button>
                  </div>
                  {knownSpecs.length > 0 && (
                    <div className="space-y-1.5">
                      {knownSpecs.map((spec, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={spec.label}
                            onChange={(e) =>
                              setKnownSpecs((prev) =>
                                prev.map((s, i) =>
                                  i === idx ? { ...s, label: e.target.value } : s
                                )
                              )
                            }
                            placeholder="Label"
                            className="w-1/3 px-2.5 py-1 text-xs bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                          />
                          <input
                            type="text"
                            value={spec.value}
                            onChange={(e) =>
                              setKnownSpecs((prev) =>
                                prev.map((s, i) =>
                                  i === idx ? { ...s, value: e.target.value } : s
                                )
                              )
                            }
                            placeholder="Value"
                            className="flex-1 px-2.5 py-1 text-xs bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setKnownSpecs((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="p-1 text-[#94A3B8] hover:text-red-600"
                            title="Remove specification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">
                    Additional Editor Research Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={sourceNotes}
                    onChange={(e) => setSourceNotes(e.target.value)}
                    placeholder="Packaging details, artisan notes, or buyer caveats..."
                    className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg"
                  />
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
