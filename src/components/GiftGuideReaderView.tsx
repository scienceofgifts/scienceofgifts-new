import React, { useEffect, useMemo, useState } from 'react';
import {
  Article,
  GiftGuide,
  GuideRecipientPathway,
  GuideRecommendation,
  GuideSection,
  Product,
  ResearchCitation,
} from '../types/content';
import {
  ARTICLES,
  AUTHORS,
  CITATIONS,
  GIFT_GUIDES,
  PRODUCTS,
} from '../data/catalog';
import { CatalogDataOverride } from '../utils/seoAndValidation';
import { RotateCcw } from 'lucide-react';
import { EditorialGuideHero } from './guide/EditorialGuideHero';
import { GuideSectionNavigation } from './guide/GuideSectionNavigation';
import { QuickPicks } from './guide/QuickPicks';
import { RecipientDiscovery } from './guide/RecipientDiscovery';
import { FeaturedGiftRecommendation } from './guide/FeaturedGiftRecommendation';
import { GiftRecommendation } from './guide/GiftRecommendation';
import { CuratorNote } from './guide/CuratorNote';
import { GiftComparison } from './guide/GiftComparison';
import { GiftBuyingGuide } from './guide/GiftBuyingGuide';
import { GuideFAQ } from './guide/GuideFAQ';
import { RelatedEditorialContent } from './guide/RelatedEditorialContent';

// Export re-usable subcomponents for external consumers or tests
export {
  EditorialGuideHero,
  GuideSectionNavigation,
  QuickPicks,
  RecipientDiscovery,
  FeaturedGiftRecommendation,
  GiftRecommendation,
  CuratorNote,
  GiftComparison,
  GiftBuyingGuide,
  GuideFAQ,
  RelatedEditorialContent,
};

export interface GuideBudgetSectionProps {
  section: GuideSection;
  chapterIndex?: number;
  startRankIndex?: number;
  productsMap: Record<string, Product>;
  savedProductIds: string[];
  highlightedProductIds?: Set<string> | null;
  onSelectProduct?: (product: Product) => void;
  onToggleSaveProduct: (productId: string) => void;
}

/**
 * Reusable Editorial Chapter / Budget Section component.
 * Combines full-width featured/editorial-feature recommendations with
 * balanced two-column grids for standard recommendations, plus optional Curator's Notes.
 */
export const GuideBudgetSection: React.FC<GuideBudgetSectionProps> = ({
  section,
  chapterIndex = 0,
  startRankIndex = 0,
  productsMap,
  savedProductIds,
  highlightedProductIds,
  onSelectProduct,
  onToggleSaveProduct,
}) => {
  const surfaceBg =
    section.accentSurface === 'mint'
      ? 'bg-[#E8F8F0]/45 border-[#BDE8D2]'
      : section.accentSurface === 'sand'
      ? 'bg-[#F4EFE6] border-[#D5CFC4]'
      : 'bg-[#FAF7F2] border-[#D5CFC4]';

  // Filter valid recommendations (and optionally filter by active recipient pathway)
  const validRecommendations = section.recommendations
    .map((rec, idx) => ({
      rec,
      product: productsMap[rec.productId],
      globalRank: startRankIndex + idx,
    }))
    .filter(
      (
        item
      ): item is {
        rec: GuideRecommendation;
        product: Product;
        globalRank: number;
      } => {
        if (!item.product) return false;
        if (
          highlightedProductIds &&
          highlightedProductIds.size > 0 &&
          !highlightedProductIds.has(item.product.id)
        ) {
          return false;
        }
        return true;
      }
    );

  if (validRecommendations.length === 0) {
    return null;
  }

  // Group consecutive 'standard' items so they can sit in a balanced 2-column editorial grid,
  // while 'featured', 'editorial-feature', and 'compact' span the full chapter width.
  type RenderGroup =
    | {
        kind: 'single';
        item: {
          rec: GuideRecommendation;
          product: Product;
          globalRank: number;
        };
      }
    | {
        kind: 'standard-grid';
        items: Array<{
          rec: GuideRecommendation;
          product: Product;
          globalRank: number;
        }>;
      };

  const renderGroups: RenderGroup[] = [];
  for (const entry of validRecommendations) {
    const effectiveStyle =
      entry.rec.presentationStyle ??
      (entry.rec.layoutHighlight === 'feature-horizontal'
        ? 'featured'
        : 'standard');

    if (effectiveStyle === 'standard') {
      const prev = renderGroups[renderGroups.length - 1];
      if (prev && prev.kind === 'standard-grid') {
        prev.items.push(entry);
      } else {
        renderGroups.push({ kind: 'standard-grid', items: [entry] });
      }
    } else {
      renderGroups.push({ kind: 'single', item: entry });
    }
  }

  return (
    <section
      id={section.id}
      aria-labelledby={`heading-${section.id}`}
      className={`scroll-mt-24 rounded-3xl border p-6 sm:p-8 lg:p-10 ${surfaceBg}`}
    >
      {/* Chapter Header */}
      <div className="border-b border-[#D5CFC4] pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#28537D]">
            {section.editorialKicker ||
              `Chapter 0${chapterIndex + 1} · ${section.priceRangeLabel}`}
          </p>
          <span className="font-mono text-xs font-semibold text-[#62666A] tabular-nums">
            {validRecommendations.length}{' '}
            {validRecommendations.length === 1
              ? 'Curated Pick'
              : 'Curated Picks'}{' '}
            · {section.priceRangeLabel}
          </span>
        </div>

        <h2
          id={`heading-${section.id}`}
          className="mt-2 font-serif text-2xl font-bold leading-tight text-[#222426] sm:text-3xl lg:text-[2.1rem]"
        >
          {section.title}
        </h2>

        <p className="mt-2.5 max-w-3xl text-sm leading-[1.7] text-[#292B2D] sm:text-base">
          {section.summary}
        </p>
      </div>

      {/* Recommendations with Mixed Editorial Rhythm */}
      <div className="mt-8 space-y-7">
        {renderGroups.map((group, gIdx) => {
          if (group.kind === 'single') {
            const { rec, product, globalRank } = group.item;
            return (
              <GiftRecommendation
                key={product.id}
                recommendation={rec}
                product={product}
                rankIndex={globalRank}
                isSaved={savedProductIds.includes(product.id)}
                onToggleSaveProduct={onToggleSaveProduct}
                onSelectProduct={onSelectProduct}
              />
            );
          }

          return (
            <div
              key={`grid-${gIdx}`}
              className={`grid grid-cols-1 gap-6 ${
                group.items.length > 1 ? 'md:grid-cols-2' : ''
              }`}
            >
              {group.items.map(({ rec, product, globalRank }) => (
                <GiftRecommendation
                  key={product.id}
                  recommendation={rec}
                  product={product}
                  rankIndex={globalRank}
                  isSaved={savedProductIds.includes(product.id)}
                  onToggleSaveProduct={onToggleSaveProduct}
                  onSelectProduct={onSelectProduct}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Section-level Curator's Note (if present) */}
      {section.curatorNote && (
        <div className="mt-8">
          <CuratorNote note={section.curatorNote} />
        </div>
      )}
    </section>
  );
};

export interface GiftGuideReaderViewProps {
  guide: GiftGuide;
  savedProductIds: string[];
  onToggleSaveProduct?: (productId: string) => void;
  onToggleSave?: (productId: string) => void;
  onSelectProduct?: (product: Product) => void;
  onOpenArticle?: (slug: string) => void;
  onSelectArticle?: (slug: string) => void;
  onOpenGuide?: (slug: string) => void;
  onSelectGuide?: (slug: string) => void;
  onNavigateHome?: () => void;
  onBackHome?: () => void;
  catalog?: CatalogDataOverride;
}

export const GiftGuideReaderView: React.FC<GiftGuideReaderViewProps> = ({
  guide,
  savedProductIds,
  onToggleSaveProduct,
  onToggleSave,
  onSelectProduct,
  onOpenArticle,
  onSelectArticle,
  onOpenGuide,
  onSelectGuide,
  catalog,
}) => {
  const handleToggleSave = onToggleSaveProduct ?? onToggleSave ?? (() => {});
  const handleOpenArticle = onOpenArticle ?? onSelectArticle;
  const handleOpenGuide = onOpenGuide ?? onSelectGuide;
  const productsMap = catalog?.products ?? PRODUCTS;
  const authorsMap = catalog?.authors ?? AUTHORS;
  const citationsMap = catalog?.citations ?? CITATIONS;
  const guidesList = catalog?.guides ?? GIFT_GUIDES;
  const articlesList = catalog?.articles ?? ARTICLES;

  const author = authorsMap[guide.authorId];
  const editorsPickProduct = productsMap[guide.editorsPick.productId];

  const [activeSectionId, setActiveSectionId] =
    useState<string>('quick-picks');
  const [activePathway, setActivePathway] =
    useState<GuideRecipientPathway | null>(null);

  // Calculate total recommendations and price range summary from canonical products
  const { totalRecommendationsCount, priceRangeSummary, allGuideProductIds } =
    useMemo(() => {
      const ids = new Set<string>();
      const prices: number[] = [];

      const epProd = productsMap[guide.editorsPick.productId];
      if (epProd) {
        ids.add(epProd.id);
        prices.push(epProd.price);
      }

      for (const sec of guide.sections) {
        for (const rec of sec.recommendations) {
          const p = productsMap[rec.productId];
          if (p) {
            ids.add(p.id);
            prices.push(p.price);
          }
        }
      }

      if (prices.length === 0) {
        return {
          totalRecommendationsCount: 0,
          priceRangeSummary: 'Curated Range',
          allGuideProductIds: ids,
        };
      }

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const summary =
        minPrice === maxPrice
          ? `$${minPrice} USD`
          : `$${minPrice} to $${maxPrice} USD`;

      return {
        totalRecommendationsCount: ids.size,
        priceRangeSummary: summary,
        allGuideProductIds: ids,
      };
    }, [guide.editorsPick.productId, guide.sections, productsMap]);

  const savedInGuideCount = useMemo(() => {
    let count = 0;
    for (const pid of savedProductIds) {
      if (allGuideProductIds.has(pid)) count += 1;
    }
    return count;
  }, [allGuideProductIds, savedProductIds]);

  // Track active section while scrolling
  useEffect(() => {
    const trackedIds = [
      'quick-picks',
      'find-the-right-gift',
      'editors-pick',
      ...guide.sections.map((s) => s.id),
      'gift-comparison',
      'buying-advice',
      'guide-faq',
      'related-discoveries',
    ];

    const handleScroll = () => {
      const offset = 180;
      for (let i = trackedIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(trackedIds[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= offset) {
            setActiveSectionId(trackedIds[i]);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [guide.sections]);

  const scrollToElement = (id: string) => {
    setActiveSectionId(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToRecommendation = (productId: string, sectionId?: string) => {
    // If recipient pathway filter is hiding this product, clear the filter first
    if (
      activePathway &&
      !(activePathway.recommendedProductIds ?? []).includes(productId)
    ) {
      setActivePathway(null);
    }

    setTimeout(() => {
      const recEl = document.getElementById(`rec-${productId}`);
      if (recEl) {
        recEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (sectionId) {
        scrollToElement(sectionId);
      }
    }, 20);
  };

  const highlightedProductIds = useMemo(() => {
    if (!activePathway) return null;
    return new Set(activePathway.recommendedProductIds);
  }, [activePathway]);

  const relatedGuides = (guide.relatedGuideIds ?? [])
    .map((id) => guidesList.find((g) => g.id === id))
    .filter((g): g is GiftGuide => Boolean(g));

  const relatedArticles = (guide.relatedArticleIds ?? [])
    .map((id) => articlesList.find((a) => a.id === id))
    .filter((a): a is Article => Boolean(a));

  const guideCitations = (guide.citationIds ?? [])
    .map((id) => citationsMap[id])
    .filter((c): c is ResearchCitation => Boolean(c));

  const hasComparison =
    (guide.comparison?.rows && guide.comparison.rows.length >= 2) ||
    totalRecommendationsCount >= 2;
  const hasFaqs = Boolean(guide.faqs && guide.faqs.length > 0);
  const hasRelatedContent =
    relatedGuides.length > 0 ||
    relatedArticles.length > 0 ||
    guideCitations.length > 0;

  // Compute cumulative starting rank index for each section
  const sectionStartRanks = useMemo(() => {
    const starts: number[] = [];
    let running = 0;
    for (const sec of guide.sections) {
      starts.push(running);
      running += sec.recommendations.length;
    }
    return starts;
  }, [guide.sections]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-20 text-[#292B2D]">
      {/* A. Premium Editorial Hero */}
      <EditorialGuideHero
        guide={guide}
        author={author}
        totalRecommendationsCount={totalRecommendationsCount}
        priceRangeSummary={priceRangeSummary}
        onJumpToSection={scrollToElement}
      />

      {/* Main Editorial Layout: Left Sticky Rail + Right Curated Content */}
      <div className="mx-auto max-w-[1400px] px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-10">
          {/* B. Editorial Navigation (Mobile Directory + Desktop Sticky Rail) */}
          <GuideSectionNavigation
            guide={guide}
            activeSectionId={activeSectionId}
            savedInGuideCount={savedInGuideCount}
            hasComparison={hasComparison}
            hasFaqs={hasFaqs}
            hasRelatedContent={hasRelatedContent}
            activeRecipientFilterLabel={activePathway?.label ?? null}
            onClearRecipientFilter={() => setActivePathway(null)}
            onJumpToSection={scrollToElement}
          />

          {/* Primary Editorial Column */}
          <div className="space-y-12 lg:col-span-9">
            {/* C. Quick Picks Executive Ledger */}
            <QuickPicks
              quickPicks={guide.quickPicks}
              productsMap={productsMap}
              savedProductIds={savedProductIds}
              onToggleSaveProduct={handleToggleSave}
              onJumpToRecommendation={scrollToRecommendation}
            />

            {/* D. Find the Right Gift (Recipient Matchmaker & Pathway Filter) */}
            <RecipientDiscovery
              guide={guide}
              productsMap={productsMap}
              activePathwayId={activePathway?.id ?? null}
              onSelectPathwayFilter={(pathway) => setActivePathway(pathway)}
              onJumpToRecommendation={scrollToRecommendation}
            />

            {/* E. Featured Editorial Recommendation (Editor's Standout Pick) */}
            {editorsPickProduct && (
              <FeaturedGiftRecommendation
                editorsPick={guide.editorsPick}
                product={editorsPickProduct}
                isSaved={savedProductIds.includes(editorsPickProduct.id)}
                onToggleSaveProduct={handleToggleSave}
                onSelectProduct={onSelectProduct}
                onJumpToRecommendation={scrollToRecommendation}
              />
            )}

            {/* G1. First Standalone Curator's Field Note (Editorial Rhythm Interlude) */}
            {guide.curatorNotes && guide.curatorNotes[0] && (
              <CuratorNote note={guide.curatorNotes[0]} />
            )}

            {/* Active Pathway Filter Banner (if reader filtered the main guide) */}
            {activePathway && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#A7E3C5] bg-[#E8F8F0] px-5 py-4 text-sm text-[#222426]">
                <div>
                  <span className="font-bold text-[#1B3D5F]">
                    Recipient Filter Active:
                  </span>{' '}
                  Showing chapters with gifts matched to{' '}
                  <strong>{activePathway.label}</strong>.
                </div>
                <button
                  type="button"
                  onClick={() => setActivePathway(null)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#28537D] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1E4164]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Show All {totalRecommendationsCount} Recommendations
                </button>
              </div>
            )}

            {/* F. Main Recommendations Organized by Chapter / Budget Tier */}
            <div className="space-y-12">
              {guide.sections.map((section, idx) => (
                <React.Fragment key={section.id}>
                  <GuideBudgetSection
                    section={section}
                    chapterIndex={idx}
                    startRankIndex={sectionStartRanks[idx] ?? 0}
                    productsMap={productsMap}
                    savedProductIds={savedProductIds}
                    highlightedProductIds={highlightedProductIds}
                    onSelectProduct={onSelectProduct}
                    onToggleSaveProduct={handleToggleSave}
                  />

                  {/* G2. Second Standalone Curator's Field Note after Chapter 2 */}
                  {idx === 1 &&
                    guide.curatorNotes &&
                    guide.curatorNotes[1] && (
                      <CuratorNote note={guide.curatorNotes[1]} />
                    )}
                </React.Fragment>
              ))}
            </div>

            {/* H. Qualitative Gift Comparison Ledger */}
            <GiftComparison
              guide={guide}
              productsMap={productsMap}
              onJumpToRecommendation={scrollToRecommendation}
            />

            {/* I. How to Choose the Right Gift (Buying Guide) */}
            <GiftBuyingGuide
              guideTitle={guide.title}
              buyingAdviceIntro={guide.buyingAdviceIntro}
              buyingAdvice={guide.buyingAdvice}
            />

            {/* J. Frequently Asked Questions */}
            <GuideFAQ
              faqs={guide.faqs}
              productsMap={productsMap}
              onJumpToRecommendation={(pid) => scrollToRecommendation(pid)}
            />

            {/* K. Related Editorial Content & Behavioral Bibliography */}
            <RelatedEditorialContent
              relatedGuides={relatedGuides}
              relatedArticles={relatedArticles}
              citations={guideCitations}
              onOpenGuide={handleOpenGuide}
              onOpenArticle={handleOpenArticle}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
