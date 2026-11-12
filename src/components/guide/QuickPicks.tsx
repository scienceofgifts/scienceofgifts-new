import React from 'react';
import { GuideQuickPick, Product } from '../../types/content';
import { ArrowDownRight, Bookmark, ExternalLink } from 'lucide-react';
import { PhotoImage } from '../ObjectIllustrations';

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
      className="scroll-mt-24"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E1DB] pb-4">
        <div>
          <p className="theme-kicker text-xs font-semibold text-[#28537D]">
            Shortlist at a Glance
          </p>
          <h2
            id="quick-picks-heading"
            className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
          >
            Quick Picks
          </h2>
        </div>
        <p className="theme-caption max-w-md text-xs leading-relaxed text-[#636A6F]">
          Short on time? Start with these {resolvedPicks.length} standout selections, or jump directly to the full review below.
        </p>
      </div>

      {/* Clean White Paper Ledger without Outer Box Nesting */}
      <div className="mt-5 divide-y divide-[#E3E1DB] rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF]">
        {resolvedPicks.map(({ qp, product }) => {
          const isSaved = savedProductIds.includes(product.id);
          const primaryImage = product.images[0];

          return (
            <article
              key={qp.id}
              className="group grid grid-cols-1 gap-4 p-4 transition-colors hover:bg-[#FAF9F6] sm:grid-cols-12 sm:items-center sm:gap-5 sm:p-5"
            >
              {/* Thumbnail + Award Label + Product Title */}
              <div className="flex items-start gap-4 sm:col-span-5 sm:items-center">
                {primaryImage && (
                  <a
                    href={`/products/${product.slug}/`}
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#E3E1DB] bg-[#F6F4EF]"
                  >
                    <PhotoImage
                      image={primaryImage}
                      preset="thumbnail-sm"
                      aspectRatio="1:1"
                      width={80}
                      height={80}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </a>
                )}

                <div className="min-w-0 flex-1">
                  <div className="theme-kicker text-xs font-semibold text-[#28537D]">
                    {qp.label}
                  </div>
                  <h3 className="theme-product-title mt-0.5 font-serif text-base font-semibold leading-snug text-[#24282B] sm:text-lg">
                    <a
                      href={`/products/${product.slug}/`}
                      className="transition-colors hover:text-[#28537D]"
                    >
                      {product.title}
                    </a>
                  </h3>
                  <p className="theme-metadata mt-0.5 text-xs text-[#636A6F]">
                    {product.vendor} ·{' '}
                    <span className="font-semibold text-[#24282B] tabular-nums">
                      ${product.price} {product.currency}
                    </span>
                  </p>
                </div>
              </div>

              {/* Concise Editorial Reason */}
              <div className="sm:col-span-4">
                <p className="theme-body-sm text-xs leading-relaxed text-[#24282B] sm:text-sm">
                  {qp.reason || qp.bestFor}
                </p>
              </div>

              {/* Actions: Jump to Review, Product Profile, Save */}
              <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-3">
                <button
                  type="button"
                  onClick={() =>
                    onJumpToRecommendation(
                      product.id,
                      qp.targetSectionId ?? ''
                    )
                  }
                  className="theme-button-text inline-flex items-center gap-1 rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-2 text-xs font-semibold text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
                >
                  Read Review
                  <ArrowDownRight className="h-3.5 w-3.5 text-[#28537D]" />
                </button>

                <a
                  href={`/products/${product.slug}/`}
                  className="theme-button-text inline-flex items-center gap-1 rounded-lg bg-[#1B3D5F] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#28537D] tabular-nums"
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
                      ? 'border-[#1B3D5F] bg-[#1B3D5F] text-white'
                      : 'border-[#E3E1DB] bg-[#FFFFFF] text-[#636A6F] hover:border-[#28537D] hover:text-[#28537D]'
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
