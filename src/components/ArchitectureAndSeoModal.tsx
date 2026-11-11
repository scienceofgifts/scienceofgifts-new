import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  FileCode2,
  Database,
  Sparkles,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import {
  buildArticleJsonLd,
  buildGiftGuideJsonLd,
  validateCatalogIntegrity,
} from '../utils/seoAndValidation';
import { ARTICLES, GIFT_GUIDES } from '../data/catalog';
import { GROQ_QUERIES, SANITY_SCHEMA_TYPES } from '../cms/sanitySchemas';
import {
  AIProductDraftSuggestion,
  buildSuggestedProductDraftFromInput,
  validateProductDraftForPublish,
} from '../cms/productDraftValidator';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureAndSeoModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    'sanity-eval' | 'schemas' | 'ai-workflow' | 'seo-validator'
  >('sanity-eval');
  const [selectedSchemaName, setSelectedSchemaName] = useState<string>('product');

  // Interactive AI Product Entry Sandbox State
  const [sampleUrl, setSampleUrl] = useState<string>(
    'https://www.eastfork.com/products/the-mug'
  );
  const [simulateMissingPrice, setSimulateMissingPrice] =
    useState<boolean>(false);
  const [draft, setDraft] = useState<AIProductDraftSuggestion>(() =>
    buildSuggestedProductDraftFromInput({
      sourceUrl: 'https://www.eastfork.com/products/the-mug',
      scrapedMetadata: {
        ogTitle: 'East Fork Stoneware Everyday Mug',
        ogSiteName: 'East Fork Pottery',
        ogDescription:
          'Wheel-thrown stoneware mug crafted in Asheville with a comfortable handle and satin glaze.',
        jsonLdPrice: 40,
        jsonLdCurrency: 'USD',
        jsonLdAvailability: 'InStock',
      },
    })
  );

  const validation = validateCatalogIntegrity();
  const draftValidation = validateProductDraftForPublish(draft);

  if (!isOpen) return null;

  const selectedSchema =
    SANITY_SCHEMA_TYPES.find((s) => s.name === selectedSchemaName) ??
    SANITY_SCHEMA_TYPES[0];

  const handleRunExtraction = () => {
    const nextDraft = buildSuggestedProductDraftFromInput({
      sourceUrl: sampleUrl,
      scrapedMetadata: {
        ogTitle: 'East Fork Stoneware Everyday Mug',
        ogSiteName: 'East Fork Pottery',
        ogDescription:
          'Wheel-thrown stoneware mug crafted in Asheville with a comfortable handle and satin glaze.',
        jsonLdPrice: simulateMissingPrice ? undefined : 40,
        jsonLdCurrency: 'USD',
        jsonLdAvailability: simulateMissingPrice ? undefined : 'InStock',
      },
    });
    setDraft(nextDraft);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B3D5F]/60 backdrop-blur-xs p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arch-modal-title"
    >
      <div className="bg-[#FAF7F2] border border-[#DFDBD3] rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DFDBD3] bg-[#F5F4F0]">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#62666A]">
              CMS Evaluation, Content Model & SEO Blueprint
            </span>
            <h2
              id="arch-modal-title"
              className="text-xl font-serif font-semibold text-[#222426]"
            >
              Science of Gifts — Sanity CMS Architecture & Product Workflow
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#222426] hover:bg-[#1B3D5F]/10 transition-colors"
            aria-label="Close technical blueprint modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Tab Bar */}
        <div className="flex flex-wrap items-center gap-2 px-6 py-3 bg-[#FAF7F2] border-b border-[#DFDBD3]">
          <button
            type="button"
            onClick={() => setActiveTab('sanity-eval')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'sanity-eval'
                ? 'bg-[#1B3D5F] text-[#FFFFFF]'
                : 'text-[#28537D] hover:bg-[#E5F5EE]'
            }`}
          >
            1. Sanity CMS Evaluation & Pricing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schemas')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'schemas'
                ? 'bg-[#1B3D5F] text-[#FFFFFF]'
                : 'text-[#28537D] hover:bg-[#E5F5EE]'
            }`}
          >
            2. Content Model & GROQ ({SANITY_SCHEMA_TYPES.length} Schemas)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai-workflow')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'ai-workflow'
                ? 'bg-[#1B3D5F] text-[#FFFFFF]'
                : 'text-[#28537D] hover:bg-[#E5F5EE]'
            }`}
          >
            3. AI Product Entry & Draft Validator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('seo-validator')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'seo-validator'
                ? 'bg-[#1B3D5F] text-[#FFFFFF]'
                : 'text-[#28537D] hover:bg-[#E5F5EE]'
            }`}
          >
            4. SEO & Link Integrity ({validation.passed ? 'PASS' : 'WARN'})
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed text-[#292B2D]">
          {activeTab === 'sanity-eval' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-white border border-[#DFDBD3] space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-[#222426]">
                    <Database className="w-4 h-4 text-[#28537D]" />
                    <span>Native Sanity v3 Capabilities (Included in Free Tier)</span>
                  </div>
                  <ul className="text-xs text-[#292B2D] space-y-1.5 list-disc list-inside">
                    <li>
                      <strong>Custom Document & Object Schemas:</strong> Full TypeScript schema definitions (`defineType`, `defineField`), custom validation rules, and cross-document `reference` fields.
                    </li>
                    <li>
                      <strong>Portable Text & Custom Blocks:</strong> Native rich-text array supporting custom inline annotations (`citationAnnotation`) and block objects (pull quotes, callouts, comparison tables, contextual product blocks).
                    </li>
                    <li>
                      <strong>Image Pipeline & Transformations:</strong> Built-in asset CDN with `hotspot`/`crop`, automatic WebP/AVIF conversion, and mandatory `alt` validation.
                    </li>
                    <li>
                      <strong>Free Plan Quotas ($0/mo):</strong> Up to 20 user seats, 2 public datasets, 10,000 documents, 250k API requests/mo, 1M CDN requests/mo, and 100 GB asset bandwidth.
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-white border border-[#DFDBD3] space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-[#222426]">
                    <Globe className="w-4 h-4 text-[#28537D]" />
                    <span>Features Requiring Custom Dev or Paid Plans</span>
                  </div>
                  <ul className="text-xs text-[#292B2D] space-y-1.5 list-disc list-inside">
                    <li>
                      <strong>Sanity AI Assist & Agent Actions:</strong> Full Sanity AI Assist requires the <strong>Growth Plan ($15/seat/mo)</strong> and consumes metered AI credits. Furthermore, it does <em>not</em> scrape external ecommerce product URLs out of the box.
                    </li>
                    <li>
                      <strong>URL-to-Product Extraction (Custom Dev):</strong> Implemented via a custom Sanity <strong>Document Action button</strong> calling our own serverless endpoint (`POST /api/cms/extract-product`) that parses deterministic HTML OpenGraph/JSON-LD + calls Gemini Flash (~$0.002/item).
                    </li>
                    <li>
                      <strong>Private Datasets & Granular RBAC:</strong> Free tier datasets are public-read (or token-gated with 2 roles: Admin/Viewer); 5-role RBAC and private datasets require Growth ($15/seat/mo).
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schemas' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {SANITY_SCHEMA_TYPES.map((schema) => (
                  <button
                    key={schema.name}
                    type="button"
                    onClick={() => setSelectedSchemaName(schema.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors ${
                      selectedSchema.name === schema.name
                        ? 'bg-[#1B3D5F] text-white border-[#1B3D5F]'
                        : 'bg-white text-[#222426] border-[#DFDBD3] hover:bg-[#E5F5EE]'
                    }`}
                  >
                    {schema.name} ({schema.fields.length} fields)
                  </button>
                ))}
              </div>

              <div className="p-5 rounded-xl bg-white border border-[#DFDBD3] space-y-3">
                <div>
                  <div className="text-xs font-mono uppercase text-[#62666A]">
                    Sanity Document Type: {selectedSchema.name}
                  </div>
                  <h3 className="text-base font-serif font-semibold text-[#222426]">
                    {selectedSchema.title}
                  </h3>
                  <p className="text-xs text-[#292B2D] mt-0.5">
                    {selectedSchema.description}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#DFDBD3] text-[#62666A] uppercase">
                        <th className="py-2 px-3">Field</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Validation Rule</th>
                        <th className="py-2 px-3">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DFDBD3]">
                      {selectedSchema.fields.map((field) => (
                        <tr key={field.name}>
                          <td className="py-2 px-3 font-mono font-semibold text-[#222426]">
                            {field.name}
                          </td>
                          <td className="py-2 px-3 font-mono text-[#28537D]">
                            {field.type}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-[#62666A]">
                            {field.validationRule}
                          </td>
                          <td className="py-2 px-3 text-[#292B2D]">
                            {field.description || field.title}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#1B3D5F] text-[#FAF7F2] font-mono text-[11px] overflow-x-auto max-h-48">
                <div className="text-[#E5F5EE] mb-1">
                  GROQ Reference Projection (Guide-Specific Overrides + Canonical Product Dereferencing)
                </div>
                <pre>{GROQ_QUERIES.giftGuideBySlug}</pre>
              </div>
            </div>
          )}

          {activeTab === 'ai-workflow' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#E5F5EE] border border-[#DFDBD3] space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-semibold text-[#222426] text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-[#28537D]" />
                    <span>Interactive AI Product Entry & Human-Review Sandbox</span>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-[#292B2D] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simulateMissingPrice}
                      onChange={(e) => setSimulateMissingPrice(e.target.checked)}
                    />
                    <span>Simulate URL without JSON-LD price (test non-hallucination guard)</span>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={sampleUrl}
                    onChange={(e) => setSampleUrl(e.target.value)}
                    aria-label="Product source URL"
                    className="flex-1 px-3 py-2 rounded-lg bg-white border border-[#DFDBD3] text-xs text-[#292B2D]"
                  />
                  <button
                    type="button"
                    onClick={handleRunExtraction}
                    className="px-4 py-2 rounded-lg bg-[#1B3D5F] text-white text-xs font-semibold hover:bg-[#28537D] transition-colors shrink-0"
                  >
                    Run Explicit AI Extraction Action
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-white border border-[#DFDBD3] space-y-2.5">
                  <div className="font-semibold text-[#222426]">
                    Extracted & Suggested Draft Fields (`{draft.productId}`)
                  </div>
                  <div>
                    <span className="font-semibold text-[#62666A]">Title: </span>
                    <span className="text-[#292B2D]">{draft.title}</span>{' '}
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#E5F5EE] text-[#222426]">
                      {draft.provenance.title}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#62666A]">Vendor: </span>
                    <span className="text-[#292B2D]">{draft.vendor}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#62666A]">Price: </span>
                    <span className="text-[#292B2D]">
                      {draft.price !== null
                        ? `$${draft.price} ${draft.currency}`
                        : 'UNVERIFIED (Requires Manual Entry)'}
                    </span>{' '}
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#E5F5EE] text-[#222426]">
                      {draft.provenance.price}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#62666A]">
                      AI Suggested Taxonomy:{' '}
                    </span>
                    <span className="text-[#292B2D]">
                      Recipients: {draft.recipients.join(', ')} · Occasions:{' '}
                      {draft.occasions.join(', ')}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#DFDBD3] flex flex-wrap gap-2">
                    {!draft.priceVerified && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            price: 40,
                            priceVerified: true,
                            inStock: true,
                            budgetTier: 'under-50',
                            guidePriceBucket: '25-to-75',
                          }))
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#E5F5EE] border border-[#DFDBD3] text-[#222426] font-semibold"
                      >
                        Manually Verify Price ($40) & Stock
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          humanReviewed: !prev.humanReviewed,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg font-semibold border ${
                        draft.humanReviewed
                          ? 'bg-[#1B3D5F] text-white border-[#1B3D5F]'
                          : 'bg-white text-[#222426] border-[#DFDBD3]'
                      }`}
                    >
                      {draft.humanReviewed
                        ? '✓ Editor Approved Draft'
                        : 'Approve AI Suggestions (Human Review)'}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#DFDBD3] space-y-2.5">
                  <div className="flex items-center gap-2 font-semibold text-[#222426]">
                    {draftValidation.valid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#28537D]" />
                        <span>Ready to Publish to Canonical Product Record</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-[#28537D]" />
                        <span>
                          Blocked From Publishing Until Editor Review Completes
                        </span>
                      </>
                    )}
                  </div>

                  {draftValidation.errors.length > 0 ? (
                    <ul className="space-y-1 text-[#292B2D] list-disc list-inside">
                      {draftValidation.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[#292B2D]">
                      All required canonical fields, verified price, merchant URL, taxonomy arrays, and human review checks passed.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seo-validator' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#E5F5EE] border border-[#DFDBD3]">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#28537D]" />
                  <div>
                    <div className="font-semibold text-sm text-[#222426]">
                      Automated Build-Time Integrity Check:{' '}
                      {validation.passed ? 'All Checks Passed' : 'Issues Found'}
                    </div>
                    <div className="text-xs text-[#62666A] font-mono tabular-nums">
                      Checked {validation.checkedEntities} entities ·{' '}
                      {validation.canonicalProductsCount} canonical products ·{' '}
                      {validation.issues.length} broken links/routes
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#62666A]">
                  robots.txt & sitemap.xml ready
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#62666A]">
                  <FileCode2 className="w-4 h-4" />
                  <span>
                    Distinct Structured Data Output (Article vs. Gift Guide ItemList JSON-LD)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-[#1B3D5F] text-[#FAF7F2] font-mono text-[11px] overflow-x-auto max-h-56">
                    <div className="text-[#99BFF9] mb-1">
                      Article Schema ({ARTICLES[0].slug})
                    </div>
                    <pre>{JSON.stringify(buildArticleJsonLd(ARTICLES[0]), null, 2)}</pre>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1B3D5F] text-[#FAF7F2] font-mono text-[11px] overflow-x-auto max-h-56">
                    <div className="text-[#C3F3DF] mb-1">
                      Gift Guide ItemList Schema ({GIFT_GUIDES[0].slug})
                    </div>
                    <pre>{JSON.stringify(buildGiftGuideJsonLd(GIFT_GUIDES[0]), null, 2)}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
