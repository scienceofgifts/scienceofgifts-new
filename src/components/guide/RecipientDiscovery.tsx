import React, { useMemo, useState } from 'react';
import {
  GiftGuide,
  GuideRecipientPathway,
  Product,
} from '../../types/content';
import {
  ArrowDownRight,
  Compass,
  Filter,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

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
  // Use explicit guide.recipientPathways when defined; otherwise derive pathways from the guide's products
  const pathways = useMemo<GuideRecipientPathway[]>(() => {
    if (guide.recipientPathways && guide.recipientPathways.length > 0) {
      return guide.recipientPathways.filter((p) =>
        (p.recommendedProductIds ?? []).some((id) => Boolean(productsMap[id]))
      );
    }

    // Auto-derive from canonical products referenced in guide sections
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

  // Map productId -> sectionId so jump links land smoothly
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
      className="scroll-mt-24 rounded-3xl border border-[#D5CFC4] bg-[#FAF7F2] p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#DFDBD3] pb-5">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#28537D]">
            <Compass className="h-3.5 w-3.5" />
            Curated Pathways · Recipient Matchmaker
          </p>
          <h2
            id="recipient-discovery-heading"
            className="mt-1.5 font-serif text-2xl font-bold text-[#222426] sm:text-3xl"
          >
            Find the Right Gift for Your Person
          </h2>
        </div>
        <p className="max-w-md text-xs leading-relaxed text-[#62666A]">
          Select who you are shopping for to see my top recommendations in this guide, or filter the chapters below to highlight matching picks.
        </p>
      </div>

      {/* Pathway Selector Tabs */}
      <div
        role="tablist"
        aria-label="Recipient profiles"
        className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
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
              className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-[#28537D] bg-[#EBF3FE]/70 shadow-sm'
                  : 'border-[#DFDBD3] bg-[#F4EFE6]/70 hover:border-[#28537D]/60 hover:bg-[#F4EFE6]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-serif text-sm font-bold text-[#222426]">
                    {pathway.label}
                  </span>
                  {isFilterActive && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#28537D]">
                      Filtered
                    </span>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#62666A]">
                  {pathway.description}
                </p>
              </div>
              <div className="mt-3 border-t border-[#DFDBD3] pt-2 text-[11px] font-semibold text-[#28537D] tabular-nums">
                {(pathway.recommendedProductIds ?? []).length} matched recommendations →
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Pathway Detail Panel */}
      <div className="mt-6 rounded-2xl border border-[#D5CFC4] bg-[#F4EFE6] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#D5CFC4] pb-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#28537D]">
              Selected Profile · {currentPathway.label}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-[#292B2D]">
              {currentPathway.description}
            </p>
            {currentPathway.editorialTip && (
              <p className="mt-2 flex items-start gap-2 text-xs italic text-[#62666A]">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#28537D]" />
                <span>
                  <strong className="font-semibold not-italic text-[#222426]">
                    Curator’s Advice:
                  </strong>{' '}
                  {currentPathway.editorialTip}
                </span>
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
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${
                isFilteringMainGuide
                  ? 'bg-[#28537D] text-white hover:bg-[#1E4164]'
                  : 'border border-[#28537D] bg-[#FAF7F2] text-[#28537D] hover:bg-[#28537D] hover:text-white'
              }`}
            >
              {isFilteringMainGuide ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Showing Only These Picks (Reset)
                </>
              ) : (
                <>
                  <Filter className="h-3.5 w-3.5" />
                  Highlight in Full Guide Below
                </>
              )}
            </button>
          </div>
        </div>

        {/* Matched Product Shortlist Cards */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(currentPathway.recommendedProductIds ?? []).map((pid, idx) => {
            const product = productsMap[pid];
            if (!product) return null;
            const sectionId = productSectionMap.get(pid);
            const img = product.images[0];

            return (
              <div
                key={pid}
                className="flex flex-col justify-between rounded-xl border border-[#D5CFC4] bg-[#FAF7F2] p-4"
              >
                <div>
                  <div className="flex items-center gap-3">
                    {img && (
                      <img
                        src={img.url}
                        alt={img.alt}
                        width={56}
                        height={56}
                        loading="lazy"
                        className="h-14 w-14 shrink-0 rounded-lg border border-[#DFDBD3] object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <span className="font-mono text-[11px] font-bold text-[#28537D] tabular-nums">
                        Match 0{idx + 1} · ${product.price}
                      </span>
                      <h3 className="font-serif text-sm font-bold leading-snug text-[#222426]">
                        <a
                          href={`/products/${product.slug}/`}
                          className="hover:text-[#28537D]"
                        >
                          {product.title}
                        </a>
                      </h3>
                      <p className="text-[11px] text-[#62666A]">
                        {product.vendor}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[#292B2D]">
                    {(product.bestForSummary || product.whyToGiveIt).replace(
                      /\s*—\s*/g,
                      ', '
                    )}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[#DFDBD3] pt-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => onJumpToRecommendation(pid, sectionId)}
                    className="inline-flex items-center gap-1 font-bold text-[#28537D] hover:text-[#1B3D5F]"
                  >
                    Jump to review
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={`/products/${product.slug}/`}
                    className="font-semibold text-[#62666A] hover:text-[#28537D]"
                  >
                    Details →
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
