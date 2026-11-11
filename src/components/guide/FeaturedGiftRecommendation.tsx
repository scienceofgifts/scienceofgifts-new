import React from 'react';
import { GuideEditorsPick, Product } from '../../types/content';
import {
  ArrowDownRight,
  Award,
  Bookmark,
  CheckCircle2,
  ExternalLink,
  Info,
  Sparkles,
} from 'lucide-react';

export interface FeaturedGiftRecommendationProps {
  editorsPick: GuideEditorsPick;
  product: Product;
  isSaved: boolean;
  onToggleSaveProduct: (productId: string) => void;
  onSelectProduct?: (product: Product) => void;
  onJumpToRecommendation: (productId: string, sectionId: string) => void;
}

export const FeaturedGiftRecommendation: React.FC<
  FeaturedGiftRecommendationProps
> = ({
  editorsPick,
  product,
  isSaved,
  onToggleSaveProduct,
  onSelectProduct,
  onJumpToRecommendation,
}) => {
  const primaryImage = product.images[0];
  const headline =
    editorsPick.headline ||
    `${product.title}: A Thoughtful Everyday Upgrade`;
  const intendedRecipient =
    editorsPick.intendedRecipientAndSituation || product.bestForSummary;
  const considerations = (
    editorsPick.buyingConsiderations || product.detailsAndCare
  )?.replace(/\s*—\s*/g, ', ');

  return (
    <section
      id="editors-pick"
      aria-labelledby="featured-pick-heading"
      className="scroll-mt-24 overflow-hidden rounded-3xl border border-[#C9C1B4] bg-[#F3ECE1] shadow-sm"
    >
      {/* Top Editorial Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5CFC4] bg-[#EAE2D3] px-6 py-3.5 sm:px-8">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#28537D]">
          <Award className="h-4 w-4" />
          <span>{editorsPick.kicker || 'Editor’s Standout Selection'}</span>
        </div>
        <span className="font-mono text-xs font-semibold text-[#62666A] tabular-nums">
          {product.vendor} · ${product.price} {product.currency}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-12 lg:items-center lg:gap-10">
        {/* Left: Large Magazine Product Photography */}
        <div className="lg:col-span-5">
          <div className="overflow-hidden rounded-2xl border border-[#D5CFC4] bg-[#FAF7F2]">
            {primaryImage && (
              <a
                href={`/products/${product.slug}/`}
                className="block aspect-[4/3] w-full overflow-hidden bg-[#EDE7DC]"
              >
                <img
                  src={primaryImage.url}
                  alt={primaryImage.alt}
                  width={720}
                  height={540}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                />
              </a>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#DFDBD3] px-4 py-3 text-xs text-[#62666A]">
              <span className="font-medium text-[#222426]">
                {product.productType}
              </span>
              <span className="font-mono font-bold text-[#28537D] tabular-nums">
                ${product.price} {product.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Editorial Feature Essay & Specifications */}
        <div className="lg:col-span-7">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#62666A]">
            {product.vendor} · Featured Recommendation
          </p>

          <h2
            id="featured-pick-heading"
            className="mt-1.5 font-serif text-2xl font-bold leading-snug text-[#222426] sm:text-3xl"
          >
            <a
              href={`/products/${product.slug}/`}
              className="transition-colors hover:text-[#28537D]"
            >
              {product.title}
            </a>
          </h2>

          <p className="mt-1 font-serif text-base italic text-[#28537D]">
            {headline}
          </p>

          <p className="mt-4 text-base leading-[1.75] text-[#292B2D]">
            {editorsPick.editorialRationale}
          </p>

          {/* Structured Editorial Dossier Grid */}
          <dl className="mt-5 grid grid-cols-1 gap-3 border-y border-[#D5CFC4] py-4 sm:grid-cols-2">
            {intendedRecipient && (
              <div className="rounded-xl border border-[#DFDBD3] bg-[#FAF7F2] p-3.5">
                <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#28537D]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Best Suited For
                </dt>
                <dd className="mt-1 text-xs leading-relaxed text-[#292B2D]">
                  {intendedRecipient}
                </dd>
              </div>
            )}

            {considerations && (
              <div className="rounded-xl border border-[#DFDBD3] bg-[#FAF7F2] p-3.5">
                <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#62666A]">
                  <Info className="h-3.5 w-3.5 text-[#28537D]" />
                  Practical Details & Care
                </dt>
                <dd className="mt-1 text-xs leading-relaxed text-[#292B2D]">
                  {considerations}
                </dd>
              </div>
            )}
          </dl>

          {/* Specifications & Craft Summary */}
          {product.detailsAndCare && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#62666A]">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#28537D]" />
              <span className="font-bold uppercase tracking-[0.12em] text-[#222426]">
                Specifications:
              </span>
              <span>{product.detailsAndCare.replace(/\s*—\s*/g, ', ')}</span>
            </div>
          )}

          {/* Action Bar */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={`/products/${product.slug}/`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#28537D] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#1E4164] tabular-nums"
            >
              View Product Profile · ${product.price}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <button
              type="button"
              onClick={() =>
                onJumpToRecommendation(product.id, editorsPick.targetSectionId)
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#C9C1B4] bg-[#FAF7F2] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#222426] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
            >
              Jump to Chapter Context
              <ArrowDownRight className="h-3.5 w-3.5 text-[#28537D]" />
            </button>

            {onSelectProduct && (
              <button
                type="button"
                onClick={() => onSelectProduct(product)}
                className="rounded-xl border border-[#C9C1B4] bg-[#FAF7F2] px-3.5 py-3 text-xs font-bold text-[#62666A] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
              >
                Quick Inspect
              </button>
            )}

            <button
              type="button"
              onClick={() => onToggleSaveProduct(product.id)}
              aria-label={
                isSaved
                  ? `Remove ${product.title} from saved gifts`
                  : `Save ${product.title}`
              }
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-3 text-xs font-bold transition-colors ${
                isSaved
                  ? 'border-[#28537D] bg-[#28537D] text-white'
                  : 'border-[#C9C1B4] bg-[#FAF7F2] text-[#222426] hover:border-[#28537D] hover:text-[#28537D]'
              }`}
            >
              <Bookmark
                className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`}
              />
              {isSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
