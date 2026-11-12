import React, { useMemo, useState } from 'react';
import {
  GiftGuide,
  GuideRecipientPathway,
  Product,
} from '../../types/content';
import { ArrowDownRight, Filter, RotateCcw } from 'lucide-react';
import { PhotoImage } from '../ObjectIllustrations';

export interface RecipientDiscoveryProps {
  guide: GiftGuide;
  productsMap: Record<string, Product>;
  activePathwayId: string | null;
  onSelectPathwayFilter: (pathway: GuideRecipientPathway | null) => void;
  onJumpToRecommendation: (productId: string, sectionId?: string) => void;
}

const RECIPIENT_LABELS: Record<string, string> = {
  partner: 'For a Partner or Spouse',
  friend: 'For a Close Friend',
  parent: 'For Parents & In-Laws',
  host: 'For a Gracious Host',
  coworker: 'For a Coworker or Mentor',
  teacher: 'For a Teacher',
  sibling: 'For a Sibling',
  grandparent: 'For Grandparents',
};

export const RecipientDiscovery: React.FC<RecipientDiscoveryProps> = ({
  guide,
  productsMap,
  activePathwayId,
  onSelectPathwayFilter,
  onJumpToRecommendation,
}) => {
  const pathways = useMemo<GuideRecipientPathway[]>(() => {
    if (guide.recipientPathways && guide.recipientPathways.length > 0) {
      return guide.recipientPathways.filter((p) =>
        (p.recommendedProductIds ?? []).some((id) => Boolean(productsMap[id]))
      );
    }

    const allRecs = guide.sections.flatMap((s) => s.recommendations);
    const byRecipient = new Map<string, string[]>();

    for (const rec of allRecs) {
      const product = productsMap[rec.productId];
      if (!product) continue;
      for (const rel of (product.recipients ?? []).slice(0, 2)) {
        const list = byRecipient.get(rel) ?? [];
        if (!list.includes(product.id)) {
          list.push(product.id);
        }
        byRecipient.set(rel, list);
      }
    }

    return Array.from(byRecipient.entries())
      .filter(([, ids]) => ids.length >= 2)
      .slice(0, 4)
      .map(([rel, ids]) => ({
        id: `auto-pathway-${rel}`,
        label: RECIPIENT_LABELS[rel] ?? `For ${rel}`,
        description: `Recommendations in this guide matched to ${rel} gifting scenarios.`,
        recipientFilter: rel as GuideRecipientPathway['recipientFilter'],
        recommendedProductIds: ids.slice(0, 3),
        editorialTip:
          'Focus on how this gift fits into their ordinary weekday routine.',
      }));
  }, [guide.recipientPathways, guide.sections, productsMap]);

  const [selectedTabId, setSelectedTabId] = useState<string>(
    pathways[0]?.id ?? ''
  );

  if (pathways.length === 0) return null;

  const currentPathway =
    pathways.find((p) => p.id === (activePathwayId ?? selectedTabId)) ??
    pathways[0];

  const isFilteringMainGuide = activePathwayId === currentPathway.id;

  const productSectionMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const sec of guide.sections) {
      for (const rec of sec.recommendations) {
        if (!map.has(rec.productId)) {
          map.set(rec.productId, sec.id);
        }
      }
    }
    return map;
  }, [guide.sections]);

  return (
    <section
      id="find-the-right-gift"
      aria-labelledby="recipient-discovery-heading"
      className="scroll-mt-24 border-t border-[#E3E1DB] pt-10"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E1DB] pb-4">
        <div>
          <p className="theme-kicker text-xs font-semibold text-[#28537D]">
            Browse by Recipient
          </p>
          <h2
            id="recipient-discovery-heading"
            className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
          >
            Find the Right Gift for Your Person
          </h2>
        </div>
        <p className="theme-caption max-w-md text-xs leading-relaxed text-[#636A6F]">
          Select who you are shopping for to see top matches in this guide, or filter the chapters below.
        </p>
      </div>

      {/* Pathway Selector Tabs */}
      <div
        role="tablist"
        aria-label="Recipient profiles"
        className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {pathways.map((pathway) => {
          const isSelected = currentPathway.id === pathway.id;
          const isFilterActive = activePathwayId === pathway.id;

          return (
            <button
              key={pathway.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                setSelectedTabId(pathway.id);
                if (activePathwayId && activePathwayId !== pathway.id) {
                  onSelectPathwayFilter(pathway);
                }
              }}
              className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-[#1B3D5F] bg-[#FFFFFF] shadow-xs'
                  : 'border-[#E3E1DB] bg-[#FFFFFF]/70 hover:border-[#28537D]/60 hover:bg-[#FFFFFF]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="theme-info-heading font-serif text-sm font-semibold text-[#24282B]">
                    {pathway.label}
                  </span>
                  {isFilterActive && (
                    <span className="text-[11px] font-semibold text-[#28537D]">
                      Filtered
                    </span>
                  )}
                </div>
                <p className="theme-caption mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#636A6F]">
                  {pathway.description}
                </p>
              </div>
              <div className="mt-3 border-t border-[#E3E1DB] pt-2 text-[11px] font-medium text-[#28537D] tabular-nums">
                {(pathway.recommendedProductIds ?? []).length} recommendations →
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Pathway Detail Panel */}
      <div className="mt-5 rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E3E1DB] pb-4">
          <div className="max-w-2xl">
            <div className="theme-kicker text-xs font-semibold text-[#1B3D5F]">
              {currentPathway.label}
            </div>
            <p className="theme-body-sm mt-1 text-sm leading-relaxed text-[#24282B]">
              {currentPathway.description}
            </p>
            {currentPathway.editorialTip && (
              <p className="theme-caption mt-2 text-xs italic text-[#636A6F]">
                <strong className="font-semibold not-italic text-[#24282B]">
                  Editorial tip:
                </strong>{' '}
                {currentPathway.editorialTip}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onSelectPathwayFilter(
                  isFilteringMainGuide ? null : currentPathway
                )
              }
              className={`theme-button-text inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                isFilteringMainGuide
                  ? 'bg-[#1B3D5F] text-white hover:bg-[#28537D]'
                  : 'border border-[#E3E1DB] bg-[#FAF9F6] text-[#24282B] hover:border-[#28537D] hover:text-[#28537D]'
              }`}
            >
              {isFilteringMainGuide ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Showing Only These Picks (Reset)
                </>
              ) : (
                <>
                  <Filter className="h-3.5 w-3.5 text-[#28537D]" />
                  Highlight in Guide Below
                </>
              )}
            </button>
          </div>
        </div>

        {/* Matched Product Shortlist Row */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(currentPathway.recommendedProductIds ?? []).map((pid) => {
            const product = productsMap[pid];
            if (!product) return null;
            const sectionId = productSectionMap.get(pid);
            const img = product.images[0];

            return (
              <div
                key={pid}
                className="flex flex-col justify-between rounded-xl border border-[#E3E1DB] bg-[#FAF9F6] p-4"
              >
                <div>
                  <div className="flex items-center gap-3">
                    {img && (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#E3E1DB] bg-[#F6F4EF]">
                        <PhotoImage
                          image={img}
                          preset="thumbnail-xs"
                          aspectRatio="1:1"
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-[#28537D] tabular-nums">
                        ${product.price}
                      </span>
                      <h3 className="theme-product-title font-serif text-sm font-semibold leading-snug text-[#24282B]">
                        <a
                          href={`/products/${product.slug}/`}
                          className="hover:text-[#28537D]"
                        >
                          {product.title}
                        </a>
                      </h3>
                      <p className="theme-metadata text-[11px] text-[#636A6F]">
                        {product.vendor}
                      </p>
                    </div>
                  </div>
                  <p className="theme-body-sm mt-3 line-clamp-2 text-xs leading-relaxed text-[#24282B]">
                    {(product.bestForSummary || product.whyToGiveIt).replace(
                      /\s*—\s*/g,
                      ', '
                    )}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[#E3E1DB] pt-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => onJumpToRecommendation(pid, sectionId)}
                    className="inline-flex items-center gap-1 font-semibold text-[#28537D] hover:text-[#1B3D5F]"
                  >
                    Jump to review
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={`/products/${product.slug}/`}
                    className="font-medium text-[#636A6F] hover:text-[#28537D]"
                  >
                    Gift Profile →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
