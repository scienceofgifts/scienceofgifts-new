import React from 'react';
import {
  GuidePresentationStyle,
  GuideRecommendation,
  Product,
} from '../../types/content';
import { ArrowUpRight, Award, Bookmark } from 'lucide-react';

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
 * - 'editorial-feature': Asymmetric narrative callout with deep "Why It Works" prose
 * - 'standard': Balanced two-column editorial review card on #FFFFFF paper
 * - 'compact': Streamlined horizontal recommendation row for secondary/personalized picks
 */
export const GiftRecommendation: React.FC<GiftRecommendationProps> = ({
  recommendation,
  product,
  rankIndex,
  isSaved,
  onToggleSaveProduct,
  onSelectProduct,
}) => {
  const style: GuidePresentationStyle =
    recommendation.presentationStyle ??
    (recommendation.layoutHighlight === 'feature-horizontal'
      ? 'featured'
      : 'standard');

  const primaryImage = product.images[0];
  const secondaryImage = product.images[1];
  const rankNumber = rankIndex < 9 ? `0${rankIndex + 1}` : `${rankIndex + 1}`;
  const headline =
    recommendation.editorialHeadline ||
    recommendation.editorialHook ||
    product.subtitle;
  const mainReview =
    recommendation.customEditorialNote ||
    recommendation.whyWeChoseIt ||
    product.whyToGiveIt;
  const whyItWorks = (
    recommendation.whyItWorks || product.whyToGiveIt
  )?.replace(/\s*—\s*/g, ', ');
  const idealFor =
    recommendation.idealFor ||
    recommendation.whoItsBestFor ||
    product.bestForSummary;
  const considerations = (
    recommendation.buyingConsiderations ||
    recommendation.goodToKnow ||
    recommendation.keepInMind ||
    product.detailsAndCare
  )?.replace(/\s*—\s*/g, ', ');

  // 1. FEATURED PRESENTATION (Chapter Lead Spread)
  if (style === 'featured') {
    return (
      <article
        id={`rec-${product.id}`}
        data-presentation-style="featured"
        className="scroll-mt-28 overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF]"
      >
        {/* Top Kicker Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E1DB] bg-[#FAF9F6] px-6 py-3 sm:px-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#1B3D5F]">
            <span className="text-[#636A6F] tabular-nums">
              No. {rankNumber}
            </span>
            <span aria-hidden="true">·</span>
            <Award className="h-3.5 w-3.5 text-[#28537D]" />
            <span>{recommendation.awardLabel || 'Chapter Standout'}</span>
          </div>
          <div className="text-sm font-semibold text-[#24282B] tabular-nums">
            ${product.price} {product.currency}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-12 lg:items-start">
          {/* Visual Column */}
          <div className="space-y-3 lg:col-span-5">
            {primaryImage && (
              <a
                href={`/products/${product.slug}/`}
                className="block aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#E3E1DB] bg-[#F6F4EF]"
              >
                <img
                  src={primaryImage.url}
                  alt={primaryImage.alt}
                  width={680}
                  height={510}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                />
              </a>
            )}

            {product.detailsAndCare && (
              <p className="text-xs leading-relaxed text-[#636A6F]">
                <strong className="font-semibold text-[#24282B]">
                  Details:
                </strong>{' '}
                {product.detailsAndCare.replace(/\s*—\s*/g, ', ')}
              </p>
            )}
          </div>

          {/* Editorial Content Column */}
          <div className="lg:col-span-7">
            <p className="text-xs font-medium text-[#636A6F]">
              {product.vendor} · {product.productType}
            </p>

            <h3 className="mt-1 font-serif text-2xl font-semibold leading-snug text-[#24282B] sm:text-[1.65rem]">
              <a
                href={`/products/${product.slug}/`}
                className="transition-colors hover:text-[#28537D]"
              >
                {product.title}
              </a>
            </h3>

            {headline && (
              <p className="mt-1.5 font-serif text-sm italic text-[#28537D] sm:text-base">
                {headline}
              </p>
            )}

            <p className="mt-3.5 text-sm leading-[1.8] text-[#24282B] sm:text-base">
              {mainReview}
            </p>

            {whyItWorks && whyItWorks !== mainReview && (
              <p className="mt-3 text-sm leading-[1.75] text-[#24282B]">
                <strong className="font-semibold text-[#1B3D5F]">
                  Why it works as a gift:{' '}
                </strong>
                {whyItWorks}
              </p>
            )}

            {/* Hairline-Divided Notes (No Nested Boxes) */}
            <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-[#E3E1DB] pt-4 text-xs sm:grid-cols-2">
              {idealFor && (
                <div>
                  <dt className="font-semibold text-[#1B3D5F]">Best for</dt>
                  <dd className="mt-1 leading-relaxed text-[#24282B]">
                    {idealFor}
                  </dd>
                </div>
              )}

              {considerations && (
                <div>
                  <dt className="font-semibold text-[#636A6F]">
                    What to consider
                  </dt>
                  <dd className="mt-1 leading-relaxed text-[#24282B]">
                    {considerations}
                  </dd>
                </div>
              )}
            </dl>

            {recommendation.betterAlternativeNote && (
              <p className="mt-3.5 border-t border-[#E3E1DB] pt-3 text-xs italic text-[#636A6F]">
                {recommendation.betterAlternativeNote}
              </p>
            )}

            {/* Action Bar */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E3E1DB] pt-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={`/products/${product.slug}/`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B3D5F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#28537D] tabular-nums"
                >
                  Gift Profile · ${product.price}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>

                {onSelectProduct && (
                  <button
                    type="button"
                    onClick={() => onSelectProduct(product)}
                    className="rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3.5 py-2 text-xs font-medium text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
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
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  isSaved
                    ? 'border-[#1B3D5F] bg-[#1B3D5F] text-white'
                    : 'border-[#E3E1DB] bg-[#FFFFFF] text-[#24282B] hover:border-[#28537D] hover:text-[#28537D]'
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

  // 2. EDITORIAL-FEATURE PRESENTATION (Narrative Callout)
  if (style === 'editorial-feature') {
    return (
      <article
        id={`rec-${product.id}`}
        data-presentation-style="editorial-feature"
        className="scroll-mt-28 overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E1DB] pb-3.5">
          <div className="text-xs font-semibold text-[#1B3D5F]">
            <span className="text-[#636A6F] tabular-nums">
              No. {rankNumber}
            </span>{' '}
            · {recommendation.awardLabel || 'Editorial Spotlight'}
          </div>
          <div className="text-sm font-semibold text-[#24282B] tabular-nums">
            ${product.price} {product.currency}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <p className="text-xs font-medium text-[#636A6F]">
              {product.vendor} · {product.productType}
            </p>
            <h3 className="mt-1 font-serif text-2xl font-semibold text-[#24282B]">
              <a
                href={`/products/${product.slug}/`}
                className="transition-colors hover:text-[#28537D]"
              >
                {product.title}
              </a>
            </h3>
            {headline && (
              <p className="mt-1 font-serif text-sm italic text-[#28537D]">
                {headline}
              </p>
            )}

            <p className="mt-3.5 text-sm leading-[1.8] text-[#24282B] sm:text-base">
              {mainReview}
            </p>

            {whyItWorks && whyItWorks !== mainReview && (
              <p className="mt-3 text-sm leading-relaxed text-[#24282B]">
                <strong className="font-semibold text-[#1B3D5F]">
                  Why it stands out:{' '}
                </strong>
                {whyItWorks}
              </p>
            )}

            <div className="mt-4 space-y-2 border-t border-[#E3E1DB] pt-3.5 text-xs text-[#24282B]">
              {idealFor && (
                <div>
                  <strong className="font-semibold text-[#1B3D5F]">
                    Ideal recipient:{' '}
                  </strong>
                  {idealFor}
                </div>
              )}
              {considerations && (
                <div>
                  <strong className="font-semibold text-[#636A6F]">
                    Practical consideration:{' '}
                  </strong>
                  {considerations}
                </div>
              )}
              {recommendation.betterAlternativeNote && (
                <div className="italic text-[#636A6F]">
                  {recommendation.betterAlternativeNote}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <a
                href={`/products/${product.slug}/`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B3D5F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#28537D] tabular-nums"
              >
                Gift Profile · ${product.price}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              {onSelectProduct && (
                <button
                  type="button"
                  onClick={() => onSelectProduct(product)}
                  className="rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3.5 py-2 text-xs font-medium text-[#24282B] hover:border-[#28537D] hover:text-[#28537D]"
                >
                  Quick View
                </button>
              )}
              <button
                type="button"
                onClick={() => onToggleSaveProduct(product.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  isSaved
                    ? 'border-[#1B3D5F] bg-[#1B3D5F] text-white'
                    : 'border-[#E3E1DB] bg-[#FFFFFF] text-[#24282B] hover:border-[#28537D] hover:text-[#28537D]'
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
                className="block aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#E3E1DB] bg-[#F6F4EF]"
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
              <div className="flex items-center gap-3 border-t border-[#E3E1DB] pt-2.5 text-xs text-[#636A6F]">
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

  // 3. COMPACT PRESENTATION (Streamlined Horizontal Recommendation Row)
  if (style === 'compact') {
    return (
      <article
        id={`rec-${product.id}`}
        data-presentation-style="compact"
        className="scroll-mt-28 rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-5 transition-colors hover:border-[#28537D]/50 sm:p-6"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-12 sm:items-center">
          <div className="flex items-start gap-4 sm:col-span-8">
            {primaryImage && (
              <a
                href={`/products/${product.slug}/`}
                className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[#E3E1DB] bg-[#F6F4EF]"
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
              <div className="text-xs font-semibold text-[#28537D]">
                <span className="text-[#636A6F] tabular-nums">
                  No. {rankNumber}
                </span>
                {recommendation.awardLabel
                  ? ` · ${recommendation.awardLabel}`
                  : ''}
              </div>
              <h3 className="mt-0.5 font-serif text-lg font-semibold text-[#24282B]">
                <a
                  href={`/products/${product.slug}/`}
                  className="hover:text-[#28537D]"
                >
                  {product.title}
                </a>
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#24282B] sm:text-sm">
                {mainReview}
              </p>
              {(idealFor || considerations) && (
                <p className="mt-2 text-xs text-[#636A6F]">
                  {idealFor && (
                    <span>
                      <strong className="font-semibold text-[#24282B]">
                        Best for:
                      </strong>{' '}
                      {idealFor}
                    </span>
                  )}
                  {idealFor && considerations ? ' · ' : ''}
                  {considerations && <span>{considerations}</span>}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E3E1DB] pt-3 sm:col-span-4 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
            <div className="text-right">
              <div className="text-base font-semibold text-[#24282B] tabular-nums">
                ${product.price} {product.currency}
              </div>
              <div className="text-xs text-[#636A6F]">{product.vendor}</div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/products/${product.slug}/`}
                className="inline-flex items-center gap-1 rounded-lg bg-[#1B3D5F] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#28537D]"
              >
                Gift Profile
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
                    ? 'border-[#1B3D5F] bg-[#1B3D5F] text-white'
                    : 'border-[#E3E1DB] bg-[#FAF9F6] text-[#636A6F] hover:border-[#28537D] hover:text-[#28537D]'
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

  // 4. STANDARD PRESENTATION (Default Editorial Review Card on #FFFFFF Paper)
  return (
    <article
      id={`rec-${product.id}`}
      data-presentation-style="standard"
      className="scroll-mt-28 flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF]"
    >
      <div>
        {primaryImage && (
          <a
            href={`/products/${product.slug}/`}
            className="block aspect-[16/10] w-full overflow-hidden border-b border-[#E3E1DB] bg-[#F6F4EF]"
          >
            <img
              src={primaryImage.url}
              alt={primaryImage.alt}
              width={560}
              height={350}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
            />
          </a>
        )}

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[#28537D]">
              <span className="text-[#636A6F] tabular-nums">
                No. {rankNumber}
              </span>
              {recommendation.awardLabel
                ? ` · ${recommendation.awardLabel}`
                : ''}
            </span>
            <span className="font-semibold text-[#24282B] tabular-nums">
              ${product.price} {product.currency}
            </span>
          </div>

          <p className="mt-1 text-xs text-[#636A6F]">
            {product.vendor} · {product.productType}
          </p>

          <h3 className="mt-1 font-serif text-xl font-semibold leading-snug text-[#24282B]">
            <a
              href={`/products/${product.slug}/`}
              className="transition-colors hover:text-[#28537D]"
            >
              {product.title}
            </a>
          </h3>

          {headline && (
            <p className="mt-1 font-serif text-xs italic text-[#28537D] sm:text-sm">
              {headline}
            </p>
          )}

          <p className="mt-3 text-sm leading-[1.75] text-[#24282B]">
            {mainReview}
          </p>

          {/* Hairline Notes */}
          <dl className="mt-4 space-y-2 border-t border-[#E3E1DB] pt-3.5 text-xs">
            {idealFor && (
              <div className="flex items-start gap-2">
                <dt className="shrink-0 font-semibold text-[#1B3D5F]">
                  Best for:
                </dt>
                <dd className="text-[#24282B]">{idealFor}</dd>
              </div>
            )}
            {considerations && (
              <div className="flex items-start gap-2">
                <dt className="shrink-0 font-semibold text-[#636A6F]">
                  Keep in mind:
                </dt>
                <dd className="text-[#24282B]">{considerations}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-2 border-t border-[#E3E1DB] bg-[#FAF9F6] px-5 py-3.5 sm:px-6">
        <div className="flex items-center gap-2">
          <a
            href={`/products/${product.slug}/`}
            className="inline-flex items-center gap-1 rounded-lg bg-[#1B3D5F] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#28537D] tabular-nums"
          >
            Gift Profile · ${product.price}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          {onSelectProduct && (
            <button
              type="button"
              onClick={() => onSelectProduct(product)}
              className="rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3 py-2 text-xs font-medium text-[#24282B] hover:border-[#28537D] hover:text-[#28537D]"
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
          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
            isSaved
              ? 'border-[#1B3D5F] bg-[#1B3D5F] text-white'
              : 'border-[#E3E1DB] bg-[#FFFFFF] text-[#636A6F] hover:border-[#28537D] hover:text-[#28537D]'
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
