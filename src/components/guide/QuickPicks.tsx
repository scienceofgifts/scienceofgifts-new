import React from 'react';
import { GuideQuickPick, Product } from '../../types/content';
import { ArrowDownRight, Bookmark, ExternalLink } from 'lucide-react';

export interface QuickPicksProps {
  quickPicks: GuideQuickPick[];
  productsMap: Record<string, Product>;
  savedProductIds: string[];
  onToggleSaveProduct: (productId: string) => void;
  onJumpToRecommendation: (productId: string, sectionId: string) => void;
}

export const QuickPicks: React.FC<QuickPicksProps> = ({
  quickPicks,
  productsMap,
  savedProductIds,
  onToggleSaveProduct,
  onJumpToRecommendation,
}) => {
  // Deduplicate quickPicks by productId while preserving editorial order
  const seenProductIds = new Set<string>();
  const resolvedPicks = quickPicks
    .map((qp) => ({
      qp,
      product: productsMap[qp.productId],
    }))
    .filter((entry): entry is { qp: GuideQuickPick; product: Product } => {
      if (!entry.product) return false;
      if (seenProductIds.has(entry.product.id)) return false;
      seenProductIds.add(entry.product.id);
      return true;
    });

  if (resolvedPicks.length === 0) return null;

  return (
    <section
      id="quick-picks"
      aria-labelledby="quick-picks-heading"
      className="scroll-mt-24 rounded-3xl border border-[#D5CFC4] bg-[#F4EFE6] p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#D5CFC4] pb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#28537D]">
            Executive Shortlist · At a Glance
          </p>
          <h2
            id="quick-picks-heading"
            className="mt-1.5 font-serif text-2xl font-bold text-[#222426] sm:text-3xl"
          >
            Quick Picks: The Top Gifts by Need & Budget
          </h2>
        </div>
        <p className="max-w-md text-xs leading-relaxed text-[#62666A]">
          Short on time? Start with these {resolvedPicks.length} standout selections, or jump directly to the full curatorial review below.
        </p>
      </div>

      {/* High-density architectural ledger */}
      <div className="mt-6 divide-y divide-[#DFDBD3] rounded-2xl border border-[#D5CFC4] bg-[#FAF7F2]">
        {resolvedPicks.map(({ qp, product }, idx) => {
          const isSaved = savedProductIds.includes(product.id);
          const primaryImage = product.images[0];

          return (
            <article
              key={qp.id}
              className="group grid grid-cols-1 gap-4 p-4 transition-colors hover:bg-[#F3ECE1]/60 sm:grid-cols-12 sm:items-center sm:gap-5 sm:p-5"
            >
              {/* Rank + Thumbnail + Superlative + Product Title */}
              <div className="flex items-start gap-4 sm:col-span-5 sm:items-center">
                <span className="hidden font-mono text-xs font-bold text-[#62666A] tabular-nums sm:inline-block">
                  0{idx + 1}
                </span>

                {primaryImage && (
                  <a
                    href={`/products/${product.slug}/`}
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#DFDBD3] bg-[#EDE7DC]"
                  >
                    <img
                      src={primaryImage.url}
                      alt={primaryImage.alt}
                      width={80}
                      height={80}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </a>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#28537D]">
                    <span className="font-mono sm:hidden">0{idx + 1} ·</span>
                    <span>{qp.label}</span>
                  </div>
                  <h3 className="mt-0.5 font-serif text-base font-bold leading-snug text-[#222426] sm:text-lg">
                    <a
                      href={`/products/${product.slug}/`}
                      className="transition-colors hover:text-[#28537D]"
                    >
                      {product.title}
                    </a>
                  </h3>
                  <p className="mt-0.5 text-xs text-[#62666A]">
                    {product.vendor} ·{' '}
                    <span className="font-semibold text-[#222426] tabular-nums">
                      ${product.price} {product.currency}
                    </span>
                  </p>
                </div>
              </div>

              {/* Concise Editorial Reason */}
              <div className="sm:col-span-4">
                <p className="text-xs leading-relaxed text-[#292B2D] sm:text-sm">
                  {qp.reason}
                </p>
              </div>

              {/* Actions: Jump to Review, Product Profile, Save */}
              <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-3">
                <button
                  type="button"
                  onClick={() =>
                    onJumpToRecommendation(product.id, qp.targetSectionId)
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-[#D5CFC4] bg-[#F4EFE6] px-3 py-2 text-xs font-bold text-[#222426] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
                >
                  Read Review
                  <ArrowDownRight className="h-3.5 w-3.5 text-[#28537D]" />
                </button>

                <a
                  href={`/products/${product.slug}/`}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#28537D] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1E4164] tabular-nums"
                >
                  ${product.price}
                  <ExternalLink className="h-3 w-3 opacity-80" />
                </a>

                <button
                  type="button"
                  onClick={() => onToggleSaveProduct(product.id)}
                  aria-label={
                    isSaved
                      ? `Remove ${product.title} from saved gifts`
                      : `Save ${product.title}`
                  }
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                    isSaved
                      ? 'border-[#28537D] bg-[#28537D] text-white'
                      : 'border-[#D5CFC4] bg-[#FAF7F2] text-[#62666A] hover:border-[#28537D] hover:text-[#28537D]'
                  }`}
                >
                  <Bookmark
                    className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`}
                  />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
