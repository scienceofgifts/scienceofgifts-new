import React, { useState } from 'react';
import { X, CheckCircle2, FileCode2, Database, Sparkles, ShieldCheck, Globe } from 'lucide-react';
import {
  buildArticleJsonLd,
  buildGiftGuideJsonLd,
  buildWebsiteJsonLd,
  validateCatalogIntegrity,
} from '../utils/seoAndValidation';
import { ARTICLES, GIFT_GUIDES } from '../data/catalog';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureAndSeoModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'stack' | 'sanity-ai' | 'seo-validator'>('stack');
  const validation = validateCatalogIntegrity();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B3D5F]/60 backdrop-blur-xs p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arch-modal-title"
    >
      <div className="bg-[#FAF7F2] border border-[#1B3D5F]/20 rounded-xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1B3D5F]/15 bg-[#F3EFE6]">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#28537D]">
              Technical Blueprint & SEO Audit
            </span>
            <h2 id="arch-modal-title" className="text-xl font-serif font-semibold text-[#1B3D5F]">
              Science of Gifts — Greenfield Architecture & CMS Specification
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#1B3D5F] hover:bg-[#1B3D5F]/10 transition-colors"
            aria-label="Close technical blueprint modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Tab Bar */}
        <div className="flex items-center gap-2 px-6 py-3 bg-[#FAF7F2] border-b border-[#1B3D5F]/10">
          <button
            onClick={() => setActiveTab('stack')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'stack'
                ? 'bg-[#1B3D5F] text-[#FAF7F2]'
                : 'text-[#28537D] hover:bg-[#1B3D5F]/10'
            }`}
          >
            1. Stack & Normalized Data Model
          </button>
          <button
            onClick={() => setActiveTab('sanity-ai')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'sanity-ai'
                ? 'bg-[#1B3D5F] text-[#FAF7F2]'
                : 'text-[#28537D] hover:bg-[#1B3D5F]/10'
            }`}
          >
            2. Sanity CMS & Editor-Triggered AI Entry
          </button>
          <button
            onClick={() => setActiveTab('seo-validator')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'seo-validator'
                ? 'bg-[#1B3D5F] text-[#FAF7F2]'
                : 'text-[#28537D] hover:bg-[#1B3D5F]/10'
            }`}
          >
            3. Live SEO Validator & JSON-LD ({validation.passed ? 'PASS' : 'WARN'})
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed text-[#1B3D5F]">
          {activeTab === 'stack' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#F3EFE6] border border-[#1B3D5F]/12">
                  <div className="flex items-center gap-2 font-semibold text-[#1B3D5F] mb-1.5">
                    <Globe className="w-4 h-4 text-[#28537D]" />
                    <span>Astro + React Islands + Cloudflare Pages</span>
                  </div>
                  <p className="text-xs text-[#28537D]">
                    Editorial routes (<code>/articles/[slug]</code>, <code>/guides/[slug]</code>) pre-render to 100% static, crawlable HTML at build time for instant TTFB on Cloudflare Pages. Interactive modules (Gift Finder, Search, Saved Gifts Drawer) hydrate selectively via React + TypeScript islands (<code>client:load</code> / <code>client:idle</code>).
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[#F3EFE6] border border-[#1B3D5F]/12">
                  <div className="flex items-center gap-2 font-semibold text-[#1B3D5F] mb-1.5">
                    <Database className="w-4 h-4 text-[#28537D]" />
                    <span>Single-Record Canonical Product Graph</span>
                  </div>
                  <p className="text-xs text-[#28537D]">
                    Every product has one stable ID (e.g. <code>prod_borosilicate_carafe_01</code>) and a provider-agnostic commerce schema (<code>affiliate | fourthwall | digital | direct</code>). Gift guides and articles reference canonical <code>productId</code>s via GROQ projections—eliminating price drift or duplicate copy.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-[#1B3D5F]/15 bg-white">
                <h3 className="font-serif font-semibold text-base mb-2">
                  Recommended Implementation Sequence (Isolated Through Dec 2026)
                </h3>
                <ol className="space-y-2 text-xs text-[#28537D] list-decimal list-inside">
                  <li>
                    <strong className="text-[#1B3D5F]">Phase 1 — Foundation & Design System (Complete):</strong> Normalized TypeScript content model, SEO/JSON-LD builders, link/route validator, and responsive editorial storefront.
                  </li>
                  <li>
                    <strong className="text-[#1B3D5F]">Phase 2 — Sanity v3 Studio & GROQ Layer:</strong> Provision isolated Sanity dataset, register canonical <code>product</code>, <code>giftGuide</code>, <code>article</code>, and <code>citation</code> document schemas, and add manual Document Action for AI product extraction.
                  </li>
                  <li>
                    <strong className="text-[#1B3D5F]">Phase 3 — Interactive Discovery & Fourthwall Readiness:</strong> Connect natural-language taxonomy facets and provider-neutral checkout adapters.
                  </li>
                  <li>
                    <strong className="text-[#1B3D5F]">Phase 4 — Post-Holiday URL Parity Audit (Jan 2027):</strong> Validate legacy Jekyll URL mapping table and 301 redirect rules on staging before any DNS cutover.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'sanity-ai' && (
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-[#C3F3DF]/35 border border-[#28537D]/20">
                <div className="flex items-center gap-2 font-semibold text-[#1B3D5F] mb-1">
                  <Sparkles className="w-4 h-4 text-[#28537D]" />
                  <span>Safe Editor-Triggered AI Product Entry Architecture</span>
                </div>
                <p className="text-xs text-[#1B3D5F]">
                  Sanity does <strong>not</strong> provide free, native URL-to-schema extraction out of the box (Sanity AI Assist requires paid add-on seats and lacks deterministic HTML scraping). Instead, we implement a custom <strong>Sanity Document Action button</strong> (<code>"Suggest Fields from URL / Image"</code>) backed by a stateless Cloudflare Pages Function (<code>POST /api/cms/extract-product</code>).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-lg bg-white border border-[#1B3D5F]/12">
                  <div className="font-mono uppercase text-[11px] text-[#28537D] mb-1">01. Explicit Trigger Only</div>
                  <div className="font-semibold mb-1">Zero On-Save Calls</div>
                  <p className="text-[#28537D]">
                    Runs strictly when an editor clicks the custom action inside Sanity Studio. Bounded to 1 request with a 10-second timeout and zero automatic background retries.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white border border-[#1B3D5F]/12">
                  <div className="font-mono uppercase text-[11px] text-[#28537D] mb-1">02. Extraction Pipeline</div>
                  <div className="font-semibold mb-1">HTML Metadata + Gemini Flash</div>
                  <p className="text-[#28537D]">
                    Server route fetches target product URL’s OpenGraph / Product JSON-LD + optional uploaded image, then calls <code>gemini-2.5-flash</code> with <code>responseSchema</code> to suggest taxonomy tags, dimensions, and draft copy.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white border border-[#1B3D5F]/12">
                  <div className="font-mono uppercase text-[11px] text-[#28537D] mb-1">03. Cost & Human Review</div>
                  <div className="font-semibold mb-1">~$0.002 per Product Entry</div>
                  <p className="text-[#28537D]">
                    Returns a diff preview modal in Sanity Studio. Editor reviews and approves fields before patching the draft document—preventing hallucinated prices or unverified URLs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seo-validator' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-[#C3F3DF]/40 border border-[#28537D]/20">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#1B3D5F]" />
                  <div>
                    <div className="font-semibold text-sm">
                      Automated Build-Time Integrity Check: {validation.passed ? 'All Checks Passed' : 'Issues Found'}
                    </div>
                    <div className="text-xs text-[#28537D] font-mono tabular-nums">
                      Checked {validation.checkedEntities} entities · {validation.canonicalProductsCount} canonical products · {validation.issues.length} broken links/routes
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#1B3D5F]">
                  robots.txt & sitemap.xml ready
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#28537D]">
                  <FileCode2 className="w-4 h-4" />
                  <span>Distinct Structured Data Output (Article vs. Gift Guide ItemList JSON-LD)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-[#1B3D5F] text-[#FAF7F2] font-mono text-[11px] overflow-x-auto max-h-56">
                    <div className="text-[#99BFF9] mb-1">Article Schema ({ARTICLES[0].slug})</div>
                    <pre>{JSON.stringify(buildArticleJsonLd(ARTICLES[0]), null, 2)}</pre>
                  </div>
                  <div className="p-3 rounded-lg bg-[#1B3D5F] text-[#FAF7F2] font-mono text-[11px] overflow-x-auto max-h-56">
                    <div className="text-[#C3F3DF] mb-1">Gift Guide ItemList Schema ({GIFT_GUIDES[0].slug})</div>
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
