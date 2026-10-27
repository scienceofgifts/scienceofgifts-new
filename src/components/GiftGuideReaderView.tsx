import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowDownRight,
  Heart,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  Info,
} from 'lucide-react';
import { Article, GiftGuide, GuideSection, Product } from '../types/content';
import { ARTICLES, AUTHORS, GIFT_GUIDES, PRODUCTS } from '../data/catalog';
import { PhotoImage } from './ObjectIllustrations';
import { ProductCard } from './ProductCard';

interface GiftGuideReaderViewProps {
  guide: GiftGuide;
  savedProductIds: string[];
  onToggleSave: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onSelectGuide: (slug: string) => void;
  onSelectArticle: (slug: string) => void;
  onBackHome: () => void;
}

interface GuideBudgetSectionProps {
  section: GuideSection;
  savedProductIds: string[];
  onToggleSave: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
}

export const GuideBudgetSection: React.FC<GuideBudgetSectionProps> = ({
  section,
  savedProductIds,
  onToggleSave,
  onSelectProduct,
}) => {
  const surfaceBg =
    section.accentSurface === 'sand'
      ? 'bg-[#F3ECE1]/65 rounded-3xl p-6 md:p-9'
      : section.accentSurface === 'mint'
      ? 'bg-[#E8F8F0]/65 rounded-3xl p-6 md:p-9'
      : section.accentSurface === 'blue'
      ? 'bg-[#EBF3FE]/65 rounded-3xl p-6 md:p-9'
      : '';

  const leadRec = section.recommendations.find(
    (r) => r.layoutHighlight === 'feature-horizontal'
  );
  const gridRecs = section.recommendations.filter((r) => r !== leadRec);

  return (
    <section
      id={section.id}
      aria-labelledby={`heading-${section.id}`}
      className={`space-y-8 scroll-mt-24 ${surfaceBg}`}
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[#1B3D5F]/10 pb-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#28537D]">
            Budget Tier · {section.priceRangeLabel}
          </div>
          <h2
            id={`heading-${section.id}`}
            className="text-2xl md:text-3xl font-serif font-semibold text-[#1B3D5F]"
          >
            {section.title}
          </h2>
          <p className="text-sm text-[#28537D] leading-relaxed">{section.summary}</p>
        </div>
      </div>

      {/* Lead Horizontal Feature Card (Varied Composition) */}
      {leadRec && PRODUCTS[leadRec.productId] && (
        <ProductCard
          domId={`rec-${leadRec.productId}`}
          product={PRODUCTS[leadRec.productId]}
          variant="guide-feature"
          isSaved={savedProductIds.includes(leadRec.productId)}
          onToggleSave={onToggleSave}
          onSelectProduct={onSelectProduct}
          awardNote={leadRec.awardLabel}
          customEditorialNote={leadRec.customEditorialNote}
          idealForNote={leadRec.idealFor}
          goodToKnowNote={leadRec.goodToKnow}
        />
      )}

      {/* Open 2-Column Portrait Recommendations */}
      {gridRecs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
          {gridRecs.map((rec) => {
            const product = PRODUCTS[rec.productId];
            if (!product) return null;
            return (
              <ProductCard
                key={rec.productId}
                domId={`rec-${rec.productId}`}
                product={product}
                variant={section.accentSurface ? 'surface' : 'open'}
                isSaved={savedProductIds.includes(product.id)}
                onToggleSave={onToggleSave}
                onSelectProduct={onSelectProduct}
                awardNote={rec.awardLabel}
                customEditorialNote={rec.customEditorialNote}
                idealForNote={rec.idealFor}
                goodToKnowNote={rec.goodToKnow}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};

export const GiftGuideReaderView: React.FC<GiftGuideReaderViewProps> = ({
  guide,
  savedProductIds,
  onToggleSave,
  onSelectProduct,
  onSelectGuide,
  onSelectArticle,
  onBackHome,
}) => {
  const [activeSectionId, setActiveSectionId] = useState<string>('editors-pick');
  const [expandedTips, setExpandedTips] = useState<Record<string, boolean>>({
    'tip-upgrade-habit': true,
  });

  const author = AUTHORS[guide.authorId];
  const editorsPickProduct = PRODUCTS[guide.editorsPick.productId];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [guide.id]);

  // Track active section in Table of Contents on scroll
  useEffect(() => {
    const trackedIds = [
      'editors-pick',
      'quick-picks',
      ...guide.sections.map((s) => s.id),
      'buying-advice',
      'related-discoveries',
    ];

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;
      for (let i = trackedIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(trackedIds[i]);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSectionId(trackedIds[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [guide]);

  const jumpToAnchor = (anchorId: string) => {
    const target = document.getElementById(anchorId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSectionId(anchorId);
    }
  };

  const toggleTip = (tipId: string) => {
    setExpandedTips((prev) => ({ ...prev, [tipId]: !prev[tipId] }));
  };

  // Unique canonical products referenced in this guide
  const guideProductIds = Array.from(
    new Set([
      guide.editorsPick.productId,
      ...guide.quickPicks.map((q) => q.productId),
      ...guide.sections.flatMap((s) => s.recommendations.map((r) => r.productId)),
    ])
  );
  const savedInThisGuideCount = guideProductIds.filter((id) =>
    savedProductIds.includes(id)
  ).length;

  const relatedGuides = (guide.relatedGuideIds ?? [])
    .map((id) => GIFT_GUIDES.find((g) => g.id === id))
    .filter((g): g is GiftGuide => Boolean(g));

  const relatedArticles = (guide.relatedArticleIds ?? [])
    .map((id) => ARTICLES.find((a) => a.id === id))
    .filter((a): a is Article => Boolean(a));

  return (
    <article className="min-h-screen bg-[#FAF7F2] text-[#1B3D5F]">
      <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">
        {/* ===================================================================
            A. GUIDE INTRODUCTION: Breadcrumb, H1, Intro, Hero, Disclosure
           =================================================================== */}
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1B3D5F]/10"
        >
          <ol className="flex items-center gap-2 text-xs text-[#28537D]">
            <li>
              <button
                type="button"
                onClick={onBackHome}
                className="inline-flex items-center gap-1.5 font-semibold text-[#1B3D5F] hover:underline focus-visible:outline-2 focus-visible:outline-[#28537D] whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <button
                type="button"
                onClick={onBackHome}
                className="hover:underline focus-visible:outline-2 focus-visible:outline-[#28537D]"
              >
                Gift Guides
              </button>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-[#1B3D5F] font-medium truncate max-w-xs">
              {guide.category}
            </li>
          </ol>

          <div className="flex items-center gap-2 text-xs text-[#28537D]">
            <span>Last updated {guide.updatedAt}</span>
            <span aria-hidden="true">·</span>
            <span>{guide.readTimeMinutes} min read</span>
          </div>
        </nav>

        {/* Masthead & Hero Composition */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-10">
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-[#28537D]">
              <span>Curated Gift Guide</span>
              <span aria-hidden="true">·</span>
              <span>{guide.category}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold text-[#1B3D5F] leading-[1.12] text-balance">
              {guide.title}
            </h1>

            <p className="text-lg md:text-xl text-[#28537D] leading-relaxed">
              {guide.subtitle}
            </p>

            {/* Concise Editorial Intro Paragraphs */}
            {guide.introParagraphs && guide.introParagraphs.length > 0 && (
              <div className="space-y-3 text-sm md:text-base text-[#1B3D5F]/85 leading-relaxed pt-1">
                {guide.introParagraphs.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            )}

            {/* Author & Editorial Attribution */}
            {author && (
              <div className="flex items-center gap-3.5 pt-2">
                <PhotoImage
                  src={author.avatarUrl}
                  alt={author.name}
                  className="w-11 h-11 rounded-full object-cover shrink-0"
                />
                <div className="text-xs text-[#28537D]">
                  <div>
                    <span className="font-semibold text-[#1B3D5F]">By {author.name}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{author.role}</span>
                  </div>
                  <p className="text-[#28537D]/85 line-clamp-1 mt-0.5">{author.bio}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Editorial Hero Image + Who This Guide Is For */}
          <div className="lg:col-span-5 space-y-4">
            <figure>
              <div className="aspect-4/3 w-full rounded-3xl overflow-hidden bg-[#F3ECE1]">
                <PhotoImage
                  src={guide.heroImageUrl}
                  alt={guide.heroImageAlt}
                  className="w-full h-full object-cover"
                />
              </div>
              {guide.heroImageCaption && (
                <figcaption className="text-xs font-serif italic text-[#28537D] mt-2.5 px-1">
                  {guide.heroImageCaption}
                </figcaption>
              )}
            </figure>

            {guide.whoThisGuideIsFor && guide.whoThisGuideIsFor.length > 0 && (
              <div className="p-5 rounded-2xl bg-[#F3ECE1] space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                  Who This Guide Is For
                </div>
                <ul className="space-y-1.5 text-xs text-[#1B3D5F]">
                  {guide.whoThisGuideIsFor.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span aria-hidden="true" className="text-[#28537D] font-bold">
                        ·
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </header>

        {/* Unobtrusive Affiliate & Sample Content Disclosure */}
        <aside
          aria-label="Editorial and affiliate disclosure"
          className="mb-10 px-5 py-3.5 rounded-2xl bg-[#F3ECE1]/65 text-xs text-[#28537D] flex items-start gap-2.5"
        >
          <Info className="w-4 h-4 text-[#28537D] shrink-0 mt-0.5" />
          <p className="leading-relaxed">{guide.affiliateDisclosure}</p>
        </aside>

        {/* Mobile / Tablet Inline Section Jump Bar (Non-sticky so it never obscures mobile viewport) */}
        <nav
          aria-label="Guide sections mobile navigation"
          className="lg:hidden mb-10 p-4 rounded-2xl bg-[#EBF3FE]/70 space-y-2.5"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
            Jump to a Section
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => jumpToAnchor('editors-pick')}
              className="px-3 py-1.5 rounded-full bg-white text-xs font-semibold text-[#1B3D5F] hover:bg-[#1B3D5F] hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Editor’s Pick
            </button>
            <button
              type="button"
              onClick={() => jumpToAnchor('quick-picks')}
              className="px-3 py-1.5 rounded-full bg-white text-xs font-semibold text-[#1B3D5F] hover:bg-[#1B3D5F] hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Quick Picks ({guide.quickPicks.length})
            </button>
            {guide.sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => jumpToAnchor(sec.id)}
                className="px-3 py-1.5 rounded-full bg-white text-xs font-semibold text-[#1B3D5F] hover:bg-[#1B3D5F] hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                {sec.shortNavTitle}
              </button>
            ))}
            <button
              type="button"
              onClick={() => jumpToAnchor('buying-advice')}
              className="px-3 py-1.5 rounded-full bg-white text-xs font-semibold text-[#1B3D5F] hover:bg-[#1B3D5F] hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Buying Advice
            </button>
          </div>
        </nav>

        {/* ===================================================================
            MAIN 2-COLUMN GUIDE BODY: Sticky Desktop TOC + Editorial Flow
           =================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Desktop Sticky Table of Contents Rail */}
          <aside className="hidden lg:block lg:col-span-3 lg:sticky lg:top-24 space-y-5">
            <nav
              aria-label="Table of contents"
              className="p-6 rounded-3xl bg-[#F3ECE1] space-y-4"
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                In This Guide
              </div>

              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => jumpToAnchor('editors-pick')}
                    className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors ${
                      activeSectionId === 'editors-pick'
                        ? 'bg-[#1B3D5F] text-white font-semibold'
                        : 'text-[#1B3D5F] hover:bg-white/60'
                    }`}
                  >
                    Editor’s Standout Pick
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => jumpToAnchor('quick-picks')}
                    className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors ${
                      activeSectionId === 'quick-picks'
                        ? 'bg-[#1B3D5F] text-white font-semibold'
                        : 'text-[#1B3D5F] hover:bg-white/60'
                    }`}
                  >
                    Quick Picks ({guide.quickPicks.length})
                  </button>
                </li>

                <li className="pt-2 pb-1 px-2.5 text-[11px] uppercase tracking-wider text-[#28537D] font-semibold">
                  By Budget
                </li>

                {guide.sections.map((sec) => (
                  <li key={sec.id}>
                    <button
                      type="button"
                      onClick={() => jumpToAnchor(sec.id)}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg flex items-center justify-between transition-colors ${
                        activeSectionId === sec.id
                          ? 'bg-[#1B3D5F] text-white font-semibold'
                          : 'text-[#1B3D5F] hover:bg-white/60'
                      }`}
                    >
                      <span>{sec.shortNavTitle}</span>
                      <span className="text-[11px] opacity-75">{sec.priceRangeLabel}</span>
                    </button>
                  </li>
                ))}

                <li className="pt-2">
                  <button
                    type="button"
                    onClick={() => jumpToAnchor('buying-advice')}
                    className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors ${
                      activeSectionId === 'buying-advice'
                        ? 'bg-[#1B3D5F] text-white font-semibold'
                        : 'text-[#1B3D5F] hover:bg-white/60'
                    }`}
                  >
                    How to Choose Well
                  </button>
                </li>

                <li>
                  <button
                    type="button"
                    onClick={() => jumpToAnchor('related-discoveries')}
                    className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors ${
                      activeSectionId === 'related-discoveries'
                        ? 'bg-[#1B3D5F] text-white font-semibold'
                        : 'text-[#1B3D5F] hover:bg-white/60'
                    }`}
                  >
                    Related Guides & Stories
                  </button>
                </li>
              </ul>
            </nav>

            {/* Saved in This Guide Counter */}
            <div className="p-5 rounded-3xl bg-[#E8F8F0] space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-[#1B3D5F]">
                <span>Saved From This Guide</span>
                <span className="tabular-nums">{savedInThisGuideCount}</span>
              </div>
              <p className="text-[#28537D] leading-relaxed">
                Tap the heart icon on any recommendation to bookmark it. Your saved state stays synced everywhere that product appears.
              </p>
            </div>
          </aside>

          {/* Right 9 Columns: Complete Editorial Shopping Flow */}
          <div className="lg:col-span-9 space-y-16">
            {/* ===============================================================
                B. EDITOR'S PICK: Visually Distinctive Standout Spotlight
               =============================================================== */}
            {editorsPickProduct && (
              <section
                id="editors-pick"
                aria-labelledby="heading-editors-pick"
                className="rounded-3xl bg-gradient-to-br from-[#E8F8F0] via-[#F2FBF7] to-[#EBF3FE] p-6 md:p-10 scroll-mt-24"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#1B3D5F]">
                    <Sparkles className="w-4 h-4 text-[#28537D]" />
                    <span id="heading-editors-pick">{guide.editorsPick.kicker}</span>
                  </div>
                  <span className="text-xs font-medium text-[#28537D]">
                    {editorsPickProduct.productType} · {editorsPickProduct.vendor}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  {/* Prominent Product Image */}
                  <div
                    onClick={() => onSelectProduct(editorsPickProduct)}
                    className="md:col-span-5 relative aspect-4/5 w-full rounded-2xl overflow-hidden bg-white cursor-pointer group shadow-xs"
                  >
                    <PhotoImage
                      src={editorsPickProduct.images[0]?.url}
                      alt={editorsPickProduct.images[0]?.alt}
                      fallbackColor={editorsPickProduct.images[0]?.fallbackColor}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave(editorsPickProduct.id);
                      }}
                      aria-pressed={savedProductIds.includes(editorsPickProduct.id)}
                      aria-label={
                        savedProductIds.includes(editorsPickProduct.id)
                          ? `Remove ${editorsPickProduct.title} from Saved Gifts`
                          : `Bookmark ${editorsPickProduct.title} to Saved Gifts`
                      }
                      className={`absolute top-3.5 right-3.5 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                        savedProductIds.includes(editorsPickProduct.id)
                          ? 'bg-[#F2846B] text-white'
                          : 'bg-white/95 text-[#1B3D5F] hover:bg-white'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          savedProductIds.includes(editorsPickProduct.id)
                            ? 'fill-current'
                            : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Standout Editorial Copy */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                        {guide.editorsPick.headline}
                      </p>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="text-2xl md:text-3xl font-serif font-semibold text-[#1B3D5F] leading-snug">
                          <button
                            type="button"
                            onClick={() => onSelectProduct(editorsPickProduct)}
                            className="text-left hover:underline"
                          >
                            {editorsPickProduct.title}
                          </button>
                        </h2>
                        <span className="text-xl font-semibold text-[#1B3D5F] tabular-nums">
                          ${editorsPickProduct.price}{' '}
                          <span className="text-xs font-normal text-[#28537D]">
                            {editorsPickProduct.currency}
                          </span>
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[#28537D]">
                        {editorsPickProduct.subtitle}
                      </p>
                    </div>

                    <p className="text-sm md:text-base text-[#1B3D5F]/90 leading-relaxed">
                      {guide.editorsPick.editorialRationale}
                    </p>

                    <div className="p-4 rounded-2xl bg-white/80 text-xs text-[#1B3D5F] space-y-1">
                      <div className="font-semibold text-[#28537D] uppercase tracking-wider text-[11px]">
                        Who & When to Give It
                      </div>
                      <p className="leading-relaxed">
                        {guide.editorsPick.intendedRecipientAndSituation}
                      </p>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <a
                        href={editorsPickProduct.purchaseUrl}
                        onClick={(e) => {
                          e.preventDefault();
                          onSelectProduct(editorsPickProduct);
                        }}
                        className="px-5 py-2.5 rounded-full bg-[#1B3D5F] text-[#FAF7F2] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#28537D] transition-colors whitespace-nowrap shrink-0"
                      >
                        <span>
                          ${editorsPickProduct.price} {editorsPickProduct.currency} ·{' '}
                          {editorsPickProduct.isPlaceholderLink
                            ? 'Sample Link & Full Details'
                            : 'View Product'}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={() => toggleSaveProductWithFeedback(editorsPickProduct.id)}
                        aria-pressed={savedProductIds.includes(editorsPickProduct.id)}
                        className="px-4 py-2.5 rounded-full bg-white text-[#1B3D5F] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-white/80 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            savedProductIds.includes(editorsPickProduct.id)
                              ? 'fill-[#F2846B] text-[#F2846B]'
                              : ''
                          }`}
                        />
                        <span>
                          {savedProductIds.includes(editorsPickProduct.id)
                            ? 'Saved in Your List'
                            : 'Bookmark Pick'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => jumpToAnchor(`rec-${editorsPickProduct.id}`)}
                        className="text-xs font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline inline-flex items-center gap-1"
                      >
                        <span>See in $25–$75 section</span>
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ===============================================================
                C. QUICK PICKS: Scannable Editorial Summary Grid
               =============================================================== */}
            <section
              id="quick-picks"
              aria-labelledby="heading-quick-picks"
              className="rounded-3xl bg-[#F3ECE1] p-6 md:p-9 space-y-6 scroll-mt-24"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-[#28537D] mb-1">
                    At a Glance
                  </div>
                  <h2
                    id="heading-quick-picks"
                    className="text-2xl font-serif font-semibold text-[#1B3D5F]"
                  >
                    Quick Picks by Recipient & Occasion
                  </h2>
                </div>
                <p className="text-xs text-[#28537D]">
                  Editorial highlights — select any pick to jump to its full review below
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guide.quickPicks.map((qp, index) => {
                  const product = PRODUCTS[qp.productId];
                  if (!product) return null;
                  const isSaved = savedProductIds.includes(product.id);
                  const isWide =
                    index === 0 && guide.quickPicks.length % 2 === 1
                      ? 'md:col-span-2'
                      : '';

                  return (
                    <div
                      key={qp.id}
                      className={`p-4 md:p-5 rounded-2xl bg-[#FAF7F2] flex flex-col justify-between gap-4 ${isWide}`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          onClick={() => jumpToAnchor(`rec-${product.id}`)}
                          className="w-20 h-20 rounded-xl overflow-hidden bg-[#F3ECE1] shrink-0 cursor-pointer"
                        >
                          <PhotoImage
                            src={product.images[0]?.url}
                            alt={product.images[0]?.alt}
                            fallbackColor={product.images[0]?.fallbackColor}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                              {qp.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => onToggleSave(product.id)}
                              aria-pressed={isSaved}
                              aria-label={
                                isSaved
                                  ? `Remove ${product.title} from Saved Gifts`
                                  : `Bookmark ${product.title}`
                              }
                              className="p-1.5 rounded-full text-[#1B3D5F] hover:bg-[#1B3D5F]/10 transition-colors"
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  isSaved ? 'fill-[#F2846B] text-[#F2846B]' : ''
                                }`}
                              />
                            </button>
                          </div>

                          <h3 className="text-base font-serif font-semibold text-[#1B3D5F] leading-snug">
                            <button
                              type="button"
                              onClick={() => jumpToAnchor(`rec-${product.id}`)}
                              className="text-left hover:underline"
                            >
                              {product.title}
                            </button>
                          </h3>

                          <p className="text-xs text-[#28537D] leading-relaxed">
                            {qp.reason}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#1B3D5F]/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#1B3D5F] tabular-nums">
                          ${product.price} {product.currency} · {product.vendor}
                        </span>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => jumpToAnchor(`rec-${product.id}`)}
                            className="font-semibold text-[#28537D] hover:text-[#1B3D5F] inline-flex items-center gap-1"
                          >
                            <span>Jump to review</span>
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          </button>
                          <span aria-hidden="true" className="text-[#1B3D5F]/25">
                            ·
                          </span>
                          <a
                            href={product.purchaseUrl}
                            onClick={(e) => {
                              e.preventDefault();
                              onSelectProduct(product);
                            }}
                            className="font-semibold text-[#1B3D5F] hover:underline"
                          >
                            Details →
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ===============================================================
                D & E. MAIN PRODUCT RECOMMENDATIONS BY BUDGET SECTION
               =============================================================== */}
            <div className="space-y-16">
              {guide.sections.map((section) => (
                <GuideBudgetSection
                  key={section.id}
                  section={section}
                  savedProductIds={savedProductIds}
                  onToggleSave={onToggleSave}
                  onSelectProduct={onSelectProduct}
                />
              ))}
            </div>

            {/* ===============================================================
                F. CONTEXTUAL BUYING ADVICE (With Accessible Expandable Notes)
               =============================================================== */}
            <section
              id="buying-advice"
              aria-labelledby="heading-buying-advice"
              className="rounded-3xl bg-[#EBF3FE] p-6 md:p-10 space-y-6 scroll-mt-24"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                  <Sparkles className="w-4 h-4" />
                  <span>Contextual Buying Advice</span>
                </div>
                <h2
                  id="heading-buying-advice"
                  className="text-2xl md:text-3xl font-serif font-semibold text-[#1B3D5F]"
                >
                  How to Choose for People Who Notice the Little Things
                </h2>
                {guide.buyingAdviceIntro && (
                  <p className="text-sm text-[#28537D] leading-relaxed">
                    {guide.buyingAdviceIntro}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {guide.buyingAdvice.map((tip) => {
                  const isExpanded = Boolean(expandedTips[tip.id]);
                  const panelId = `advice-panel-${tip.id}`;

                  return (
                    <div
                      key={tip.id}
                      className="p-5 md:p-6 rounded-2xl bg-[#FAF7F2] space-y-3"
                    >
                      <h3 className="text-lg font-serif font-semibold text-[#1B3D5F]">
                        {tip.heading}
                      </h3>
                      <p className="text-sm text-[#1B3D5F]/85 leading-relaxed">
                        {tip.body}
                      </p>

                      {tip.expandablePrompt && tip.expandableDetails && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => toggleTip(tip.id)}
                            aria-expanded={isExpanded}
                            aria-controls={panelId}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#28537D] hover:text-[#1B3D5F] focus-visible:outline-2 focus-visible:outline-[#28537D]"
                          >
                            <span>{tip.expandablePrompt}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {isExpanded && (
                            <div
                              id={panelId}
                              role="region"
                              aria-label={tip.expandablePrompt}
                              className="mt-3 p-4 rounded-xl bg-[#EBF3FE]/60 text-xs text-[#1B3D5F] leading-relaxed"
                            >
                              {tip.expandableDetails}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ===============================================================
                G. RELATED DISCOVERIES: Companion Gift Guides & Stories
               =============================================================== */}
            <section
              id="related-discoveries"
              aria-labelledby="heading-related-discoveries"
              className="pt-8 border-t border-[#1B3D5F]/12 space-y-8 scroll-mt-24"
            >
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-[#28537D] mb-1.5">
                  Keep Exploring
                </div>
                <h2
                  id="heading-related-discoveries"
                  className="text-2xl md:text-3xl font-serif font-semibold text-[#1B3D5F]"
                >
                  Related Gift Guides & Editorial Stories
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedGuides.map((relGuide) => (
                  <article
                    key={relGuide.id}
                    className="rounded-3xl bg-[#FFF4D6] p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div
                        onClick={() => onSelectGuide(relGuide.slug)}
                        className="aspect-16/10 rounded-2xl overflow-hidden bg-white cursor-pointer group"
                      >
                        <PhotoImage
                          src={relGuide.heroImageUrl}
                          alt={relGuide.heroImageAlt}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                        Companion Gift Guide · {relGuide.readTimeMinutes} min read
                      </div>
                      <h3 className="text-lg font-serif font-semibold text-[#1B3D5F] leading-snug">
                        <button
                          type="button"
                          onClick={() => onSelectGuide(relGuide.slug)}
                          className="text-left hover:underline"
                        >
                          {relGuide.title}
                        </button>
                      </h3>
                      <p className="text-xs text-[#1B3D5F]/80 leading-relaxed line-clamp-3">
                        {relGuide.subtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectGuide(relGuide.slug)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B3D5F] hover:text-[#28537D]"
                    >
                      <span>Explore Guide</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </article>
                ))}

                {relatedArticles.map((art) => (
                  <article
                    key={art.id}
                    className="rounded-3xl bg-[#F3ECE1] p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div
                        onClick={() => onSelectArticle(art.slug)}
                        className="aspect-16/10 rounded-2xl overflow-hidden bg-white cursor-pointer group"
                      >
                        <PhotoImage
                          src={art.heroImageUrl}
                          alt={art.heroAlt}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{art.category}</span>
                      </div>
                      <h3 className="text-lg font-serif font-semibold text-[#1B3D5F] leading-snug">
                        <button
                          type="button"
                          onClick={() => onSelectArticle(art.slug)}
                          className="text-left hover:underline"
                        >
                          {art.title}
                        </button>
                      </h3>
                      <p className="text-xs text-[#1B3D5F]/80 leading-relaxed line-clamp-3">
                        {art.subtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectArticle(art.slug)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B3D5F] hover:text-[#28537D]"
                    >
                      <span>Read Story</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </article>
  );

  function toggleSaveProductWithFeedback(productId: string) {
    onToggleSave(productId);
  }
};
