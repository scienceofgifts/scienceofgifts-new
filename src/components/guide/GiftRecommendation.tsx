import React from 'react';
import {
  GuidePresentationStyle,
  GuideRecommendation,
  Product,
} from '../../types/content';
import {
  ArrowUpRight,
  Award,
  Bookmark,
  CheckCircle2,
  Compass,
  Info,
  Sparkles,
} from 'lucide-react';

export interface GiftRecommendationProps {
  recommendation: GuideRecommendation;
  product: Product;
  rankIndex: number;
  isSaved: boolean;
  onToggleSaveProduct: (productId: string) => void;
  onSelectProduct?: (product: Product) => void;
}

/**
 * Reusable GiftRecommendation component supporting a family of 4 presentation styles:
 * - 'featured': Full-width magazine spread for chapter-leading picks
 * - 'editorial-feature': Asymmetric narrative callout with deep "Why It Works" dossier
 * - 'standard': Balanced two-column editorial review card
 * - 'compact': Streamlined architectural ledger card for secondary/personalized picks
 *
 * Gracefully degrades if any optional metadata fields are absent.
 */
export const GiftRecommendation: React.FC<GiftRecommendationProps> = ({
  recommendation,
  product,
  rankIndex,
  isSaved,
  onToggleSaveProduct,
  onSelectProduct,
}) => {
  // Determine presentation style with backward compatibility for layoutHighlight
  const style: GuidePresentationStyle =
    recommendation.presentationStyle ??
    (recommendation.layoutHighlight === 'feature-horizontal'
      ? 'featured'
      : 'standard');

  const primaryImage = product.images[0];
  const secondaryImage = product.images[1];
  const rankNumber = rankIndex < 9 ? `0${rankIndex + 1}` : `${rankIndex + 1}`;
  const headline = recommendation.editorialHeadline || product.subtitle;
  const whyItWorks = (
    recommendation.whyItWorks || product.whyToGiveIt
  )?.replace(/\s*—\s*/g, ', ');
  const considerations = (
    recommendation.buyingConsiderations ||
    recommendation.goodToKnow ||
    product.detailsAndCare
  )?.replace(/\s*—\s*/g, ', ');

  // 1. FEATURED PRESENTATION (Chapter Lead Spread)
  if (style === 'featured') {
    return (
      <article
        id={`rec-${product.id}`}
        data-presentation-style="featured"
        className="scroll-mt-28 overflow-hidden rounded-3xl border border-[#C9C1B4] bg-[#FAF7F2] shadow-sm transition-shadow hover:shadow-md"
      >
        {/* Top Kicker Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DFDBD3] bg-[#F4EFE6] px-6 py-3 sm:px-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#28537D]">
            <span className="font-mono text-[#62666A] tabular-nums">
              Pick {rankNumber}
            </span>
            <span aria-hidden="true">·</span>
            <Award className="h-3.5 w-3.5" />
            <span>{recommendation.awardLabel || 'Chapter Lead Selection'}</span>
          </div>
          <div className="font-mono text-xs font-bold text-[#222426] tabular-nums">
            ${product.price} {product.currency}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-12 lg:items-start lg:gap-8">
          {/* Visual Column */}
          <div className="space-y-3 lg:col-span-5">
            {primaryImage && (
              <a
                href={`/products/${product.slug}/`}
                className="block aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#DFDBD3] bg-[#EDE7DC]"
              >
                <img
                  src={primaryImage.url}
                  alt={primaryImage.alt}
                  width={680}
                  height={510}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                />
              </a>
            )}

            {/* Specifications Ledger Strip */}
            <div className="rounded-xl border border-[#DFDBD3] bg-[#F4EFE6] p-3.5 text-xs text-[#62666A]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-[#222426]">
                  Maker: {product.vendor}
                </span>
                <span className="tabular-nums">{product.productType}</span>
              </div>
              {product.detailsAndCare && (
                <div className="mt-1.5 border-t border-[#DFDBD3] pt-1.5 text-[11px]">
                  <strong className="text-[#222426]">Specifications:</strong>{' '}
                  {product.detailsAndCare.replace(/\s*—\s*/g, ', ')}
                </div>
              )}
            </div>
          </div>

          {/* Editorial Content Column */}
          <div className="lg:col-span-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#62666A]">
              {product.vendor} · {product.productType}
            </p>

            <h4 className="mt-1 font-serif text-2xl font-bold leading-snug text-[#222426] sm:text-[1.7rem]">
              <a
                href={`/products/${product.slug}/`}
                className="transition-colors hover:text-[#28537D]"
              >
                {product.title}
              </a>
            </h4>

            {headline && (
              <p className="mt-1 font-serif text-sm italic text-[#28537D] sm:text-base">
                {headline}
              </p>
            )}

            {/* Primary Editorial Review */}
            <p className="mt-3.5 text-sm leading-[1.75] text-[#292B2D] sm:text-base">
              {recommendation.customEditorialNote}
            </p>

            {/* Why It Works as a Gift */}
            {whyItWorks &&
              whyItWorks !== recommendation.customEditorialNote && (
                <div className="mt-4 rounded-xl border border-[#DFDBD3] bg-[#F4EFE6]/80 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#28537D]">
                    Why It Works as a Gift
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#292B2D] sm:text-sm">
                    {whyItWorks}
                  </p>
                </div>
              )}

            {/* Best For & Practical Considerations */}
            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {recommendation.idealFor && (
                <div className="rounded-xl border border-[#DFDBD3] bg-[#FAF7F2] p-3">
                  <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#28537D]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Best For
                  </dt>
                  <dd className="mt-1 text-xs leading-relaxed text-[#292B2D]">
                    {recommendation.idealFor}
                  </dd>
                </div>
              )}

              {considerations && (
                <div className="rounded-xl border border-[#DFDBD3] bg-[#FAF7F2] p-3">
                  <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#62666A]">
                    <Info className="h-3.5 w-3.5 text-[#28537D]" />
                    Good to Know
                  </dt>
                  <dd className="mt-1 text-xs leading-relaxed text-[#292B2D]">
                    {considerations}
                  </dd>
                </div>
              )}
            </dl>

            {/* Alternative Pointer */}
            {recommendation.betterAlternativeNote && (
              <p className="mt-3 flex items-start gap-2 text-xs italic text-[#62666A]">
                <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#28537D]" />
                <span>{recommendation.betterAlternativeNote}</span>
              </p>
            )}

            {/* Action Bar */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#DFDBD3] pt-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={`/products/${product.slug}/`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#28537D] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#1E4164] tabular-nums"
                >
                  Explore Gift · ${product.price}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>

                {onSelectProduct && (
                  <button
                    type="button"
                    onClick={() => onSelectProduct(product)}
                    className="rounded-xl border border-[#D5CFC4] bg-[#F4EFE6] px-3.5 py-2.5 text-xs font-bold text-[#222426] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
                  >
                    Quick View
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => onToggleSaveProduct(product.id)}
                aria-label={
                  isSaved
                    ? `Remove ${product.title} from saved gifts`
                    : `Save ${product.title}`
                }
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-colors ${
                  isSaved
                    ? 'border-[#28537D] bg-[#28537D] text-white'
                    : 'border-[#D5CFC4] bg-[#FAF7F2] text-[#222426] hover:border-[#28537D] hover:text-[#28537D]'
                }`}
              >
                <Bookmark
                  className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`}
                />
                {isSaved ? 'Saved' : 'Save Gift'}
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // 2. EDITORIAL-FEATURE PRESENTATION (Deep Narrative Callout)
  if (style === 'editorial-feature') {
    return (
      <article
        id={`rec-${product.id}`}
        data-presentation-style="editorial-feature"
        className="scroll-mt-28 overflow-hidden rounded-3xl border border-[#C9C1B4] bg-[#F4EFE6] p-6 sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5CFC4] pb-4">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#28537D]">
            <span className="font-mono text-[#62666A] tabular-nums">
              Pick {rankNumber}
            </span>{' '}
            · {recommendation.awardLabel || 'Curator’s Spotlight'}
          </div>
          <div className="font-mono text-sm font-bold text-[#222426] tabular-nums">
            ${product.price} {product.currency}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7 lg:pr-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#62666A]">
              {product.vendor} · {product.productType}
            </p>
            <h4 className="mt-1 font-serif text-2xl font-bold text-[#222426]">
              <a
                href={`/products/${product.slug}/`}
                className="transition-colors hover:text-[#28537D]"
              >
                {product.title}
              </a>
            </h4>
            {headline && (
              <p className="mt-1 font-serif text-sm italic text-[#28537D]">
                {headline}
              </p>
            )}

            <p className="mt-3.5 text-sm leading-[1.75] text-[#292B2D] sm:text-base">
              {recommendation.customEditorialNote}
            </p>

            {whyItWorks &&
              whyItWorks !== recommendation.customEditorialNote && (
                <p className="mt-3 text-xs leading-relaxed text-[#292B2D] sm:text-sm">
                  <strong className="font-bold text-[#222426]">
                    Why it stands out:{' '}
                  </strong>
                  {whyItWorks}
                </p>
              )}

            <div className="mt-4 space-y-2 border-t border-[#D5CFC4] pt-3 text-xs text-[#292B2D]">
              {recommendation.idealFor && (
                <div>
                  <strong className="font-bold text-[#28537D]">
                    Ideal Recipient:{' '}
                  </strong>
                  {recommendation.idealFor}
                </div>
              )}
              {considerations && (
                <div>
                  <strong className="font-bold text-[#222426]">
                    Practical Consideration:{' '}
                  </strong>
                  {considerations}
                </div>
              )}
              {recommendation.betterAlternativeNote && (
                <div className="italic text-[#62666A]">
                  {recommendation.betterAlternativeNote}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <a
                href={`/products/${product.slug}/`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#28537D] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#1E4164] tabular-nums"
              >
                View Details · ${product.price}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              {onSelectProduct && (
                <button
                  type="button"
                  onClick={() => onSelectProduct(product)}
                  className="rounded-xl border border-[#D5CFC4] bg-[#FAF7F2] px-3.5 py-2.5 text-xs font-bold text-[#222426] hover:border-[#28537D] hover:text-[#28537D]"
                >
                  Quick View
                </button>
              )}
              <button
                type="button"
                onClick={() => onToggleSaveProduct(product.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-colors ${
                  isSaved
                    ? 'border-[#28537D] bg-[#28537D] text-white'
                    : 'border-[#D5CFC4] bg-[#FAF7F2] text-[#222426] hover:border-[#28537D] hover:text-[#28537D]'
                }`}
              >
                <Bookmark
                  className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`}
                />
                {isSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>

          <div className="space-y-3 lg:col-span-5">
            {primaryImage && (
              <a
                href={`/products/${product.slug}/`}
                className="block aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#D5CFC4] bg-[#FAF7F2]"
              >
                <img
                  src={primaryImage.url}
                  alt={primaryImage.alt}
                  width={600}
                  height={450}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </a>
            )}
            {secondaryImage && (
              <div className="flex items-center gap-3 rounded-xl border border-[#D5CFC4] bg-[#FAF7F2] p-2.5 text-xs text-[#62666A]">
                <img
                  src={secondaryImage.url}
                  alt={secondaryImage.alt}
                  width={48}
                  height={48}
                  loading="lazy"
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
                <span className="line-clamp-2 leading-snug">
                  {secondaryImage.alt}
                </span>
              </div>
            )}
          </div>
        </div>
      </article>
    );
  }

  // 3. COMPACT PRESENTATION (Streamlined Architectural Ledger Item)
  if (style === 'compact') {
    return (
      <article
        id={`rec-${product.id}`}
        data-presentation-style="compact"
        className="scroll-mt-28 rounded-2xl border border-[#D5CFC4] bg-[#FAF7F2] p-5 transition-colors hover:border-[#28537D]/60 sm:p-6"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-12 sm:items-center">
          <div className="flex items-start gap-4 sm:col-span-8">
            {primaryImage && (
              <a
                href={`/products/${product.slug}/`}
                className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[#DFDBD3] bg-[#EDE7DC]"
              >
                <img
                  src={primaryImage.url}
                  alt={primaryImage.alt}
                  width={120}
                  height={120}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </a>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#28537D]">
                <span className="font-mono text-[#62666A] tabular-nums">
                  Pick {rankNumber}
                </span>
                {recommendation.awardLabel
                  ? ` · ${recommendation.awardLabel}`
                  : ''}
              </div>
              <h4 className="mt-0.5 font-serif text-lg font-bold text-[#222426]">
                <a
                  href={`/products/${product.slug}/`}
                  className="hover:text-[#28537D]"
                >
                  {product.title}
                </a>
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-[#292B2D] sm:text-sm">
                {recommendation.customEditorialNote}
              </p>
              {(recommendation.idealFor || considerations) && (
                <p className="mt-2 text-xs text-[#62666A]">
                  {recommendation.idealFor && (
                    <span>
                      <strong className="text-[#222426]">Best for:</strong>{' '}
                      {recommendation.idealFor}
                    </span>
                  )}
                  {recommendation.idealFor && considerations ? ' · ' : ''}
                  {considerations && <span>{considerations}</span>}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#DFDBD3] pt-3 sm:col-span-4 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
            <div className="text-right">
              <div className="font-mono text-base font-bold text-[#222426] tabular-nums">
                ${product.price} {product.currency}
              </div>
              <div className="text-[11px] text-[#62666A]">{product.vendor}</div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/products/${product.slug}/`}
                className="inline-flex items-center gap-1 rounded-lg bg-[#28537D] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1E4164]"
              >
                Explore Gift
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={() => onToggleSaveProduct(product.id)}
                aria-label={
                  isSaved
                    ? `Remove ${product.title} from saved gifts`
                    : `Save ${product.title}`
                }
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                  isSaved
                    ? 'border-[#28537D] bg-[#28537D] text-white'
                    : 'border-[#D5CFC4] bg-[#F4EFE6] text-[#62666A] hover:border-[#28537D] hover:text-[#28537D]'
                }`}
              >
                <Bookmark
                  className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`}
                />
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // 4. STANDARD PRESENTATION (Default Editorial Review Card)
  return (
    <article
      id={`rec-${product.id}`}
      data-presentation-style="standard"
      className="scroll-mt-28 flex flex-col justify-between overflow-hidden rounded-2xl border border-[#D5CFC4] bg-[#FAF7F2] transition-shadow hover:shadow-sm"
    >
      <div>
        {/* Image + Top Classification */}
        <div className="relative">
          {primaryImage && (
            <a
              href={`/products/${product.slug}/`}
              className="block aspect-[16/10] w-full overflow-hidden border-b border-[#DFDBD3] bg-[#EDE7DC]"
            >
              <img
                src={primaryImage.url}
                alt={primaryImage.alt}
                width={560}
                height={350}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
              />
            </a>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold uppercase tracking-[0.14em] text-[#28537D]">
              <span className="font-mono text-[#62666A] tabular-nums">
                Pick {rankNumber}
              </span>
              {recommendation.awardLabel
                ? ` · ${recommendation.awardLabel}`
                : ''}
            </span>
            <span className="font-mono font-bold text-[#222426] tabular-nums">
              ${product.price} {product.currency}
            </span>
          </div>

          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#62666A]">
            {product.vendor} · {product.productType}
          </p>

          <h4 className="mt-1 font-serif text-xl font-bold leading-snug text-[#222426]">
            <a
              href={`/products/${product.slug}/`}
              className="transition-colors hover:text-[#28537D]"
            >
              {product.title}
            </a>
          </h4>

          {headline && (
            <p className="mt-1 font-serif text-xs italic text-[#28537D] sm:text-sm">
              {headline}
            </p>
          )}

          <p className="mt-3 text-sm leading-[1.7] text-[#292B2D]">
            {recommendation.customEditorialNote}
          </p>

          {/* Structured Notes */}
          <dl className="mt-4 space-y-2 border-t border-[#DFDBD3] pt-3.5 text-xs">
            {recommendation.idealFor && (
              <div className="flex items-start gap-2">
                <dt className="shrink-0 font-bold text-[#28537D]">
                  Best For:
                </dt>
                <dd className="text-[#292B2D]">{recommendation.idealFor}</dd>
              </div>
            )}
            {considerations && (
              <div className="flex items-start gap-2">
                <dt className="shrink-0 font-bold text-[#62666A]">
                  Details:
                </dt>
                <dd className="text-[#292B2D]">{considerations}</dd>
              </div>
            )}
            {product.detailsAndCare && (
              <div className="flex items-start gap-2">
                <dt className="shrink-0 font-bold text-[#62666A]">Specs:</dt>
                <dd className="text-[#62666A]">
                  {product.detailsAndCare.replace(/\s*—\s*/g, ', ')}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-2 border-t border-[#DFDBD3] bg-[#F4EFE6]/60 px-5 py-3.5 sm:px-6">
        <div className="flex items-center gap-2">
          <a
            href={`/products/${product.slug}/`}
            className="inline-flex items-center gap-1 rounded-lg bg-[#28537D] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1E4164] tabular-nums"
          >
            View Gift · ${product.price}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          {onSelectProduct && (
            <button
              type="button"
              onClick={() => onSelectProduct(product)}
              className="rounded-lg border border-[#D5CFC4] bg-[#FAF7F2] px-3 py-2 text-xs font-bold text-[#222426] hover:border-[#28537D] hover:text-[#28537D]"
            >
              Inspect
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onToggleSaveProduct(product.id)}
          aria-label={
            isSaved
              ? `Remove ${product.title} from saved gifts`
              : `Save ${product.title}`
          }
          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
            isSaved
              ? 'border-[#28537D] bg-[#28537D] text-white'
              : 'border-[#D5CFC4] bg-[#FAF7F2] text-[#62666A] hover:border-[#28537D] hover:text-[#28537D]'
          }`}
        >
          <Bookmark
            className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`}
          />
          {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>
    </article>
  );
};
