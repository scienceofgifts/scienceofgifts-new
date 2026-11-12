import React from 'react';
import { GuideEditorsPick, Product } from '../../types/content';
import { ArrowDownRight, Award, Bookmark, ExternalLink } from 'lucide-react';
import { PhotoImage } from '../ObjectIllustrations';

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
    editorsPick.editorialHeadline ||
    `${product.title}: A Thoughtful Everyday Upgrade`;
  const rationale =
    editorsPick.editorialRationale ||
    editorsPick.whyItStoodOut ||
    product.whyToGiveIt;
  const intendedRecipient =
    editorsPick.intendedRecipientAndSituation ||
    editorsPick.whoItFitsBest ||
    product.bestForSummary;
  const considerations = (
    editorsPick.buyingConsiderations ||
    editorsPick.practicalNotes ||
    product.detailsAndCare
  )?.replace(/\s*—\s*/g, ', ');

  return (
    <section
      id="editors-pick"
      aria-labelledby="featured-pick-heading"
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF]"
    >
      {/* Subtle Top Editorial Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E1DB] bg-[#FAF9F6] px-6 py-3.5 sm:px-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#1B3D5F]">
          <Award className="h-4 w-4 text-[#28537D]" />
          <span>
            {editorsPick.kicker ||
              editorsPick.awardLabel ||
              'Editor’s Standout Selection'}
          </span>
        </div>
        <span className="text-xs font-medium text-[#636A6F] tabular-nums">
          {product.vendor} · ${product.price} {product.currency}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-12 lg:items-start lg:gap-10">
        {/* Left: Prominent Magazine Product Photography */}
        <div className="lg:col-span-6">
          <figure className="overflow-hidden rounded-xl border border-[#E3E1DB] bg-[#FAF9F6]">
            {primaryImage && (
              <a
                href={`/products/${product.slug}/`}
                className="block aspect-[4/3] w-full overflow-hidden bg-[#F6F4EF]"
              >
                <PhotoImage
                  image={primaryImage}
                  preset="feature-landscape"
                  aspectRatio="4:3"
                  width={760}
                  height={570}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                />
              </a>
            )}
            <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E3E1DB] px-4 py-3 text-xs text-[#636A6F]">
              <span>{primaryImage?.caption || product.productType}</span>
              <span className="font-semibold text-[#24282B] tabular-nums">
                ${product.price} {product.currency}
              </span>
            </figcaption>
          </figure>
        </div>

        {/* Right: Open Editorial Feature Essay & Hairline Details */}
        <div className="lg:col-span-6">
          <p className="theme-metadata text-xs font-medium text-[#636A6F]">
            {product.vendor} · {product.productType}
          </p>

          <h2
            id="featured-pick-heading"
            className="theme-product-title-featured mt-1.5 font-serif text-2xl font-semibold leading-snug text-[#24282B] sm:text-3xl"
          >
            <a
              href={`/products/${product.slug}/`}
              className="transition-colors hover:text-[#28537D]"
            >
              {product.title}
            </a>
          </h2>

          <p className="mt-2 font-serif text-base italic text-[#28537D]">
            {headline}
          </p>

          <p className="theme-body-text mt-4 text-base leading-[1.8] text-[#24282B]">
            {rationale}
          </p>

          {/* Hairline-Divided Editorial Notes (No Nested Sub-Cards) */}
          <dl className="mt-6 divide-y divide-[#E3E1DB] border-y border-[#E3E1DB] text-sm">
            {intendedRecipient && (
              <div className="py-3.5">
                <dt className="theme-info-label text-xs font-semibold text-[#1B3D5F]">
                  Best suited for
                </dt>
                <dd className="theme-body-sm mt-1 leading-relaxed text-[#24282B]">
                  {intendedRecipient}
                </dd>
              </div>
            )}

            {considerations && (
              <div className="py-3.5">
                <dt className="theme-info-label text-xs font-semibold text-[#636A6F]">
                  What to keep in mind
                </dt>
                <dd className="theme-body-sm mt-1 leading-relaxed text-[#24282B]">
                  {considerations}
                </dd>
              </div>
            )}

            {product.detailsAndCare && (
              <div className="py-3.5">
                <dt className="theme-info-label text-xs font-semibold text-[#636A6F]">
                  Details & specifications
                </dt>
                <dd className="theme-caption mt-1 text-xs leading-relaxed text-[#636A6F]">
                  {product.detailsAndCare.replace(/\s*—\s*/g, ', ')}
                </dd>
              </div>
            )}
          </dl>

          {/* Action Bar */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={`/products/${product.slug}/`}
              className="theme-button-text inline-flex items-center gap-2 rounded-lg bg-[#1B3D5F] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#28537D] tabular-nums"
            >
              Read Gift Profile · ${product.price}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            {editorsPick.targetSectionId && (
              <button
                type="button"
                onClick={() =>
                  onJumpToRecommendation(
                    product.id,
                    editorsPick.targetSectionId!
                  )
                }
                className="theme-button-text inline-flex items-center gap-1.5 rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-4 py-2.5 text-xs font-semibold text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
              >
                See in Budget Chapter
                <ArrowDownRight className="h-3.5 w-3.5 text-[#28537D]" />
              </button>
            )}

            {onSelectProduct && (
              <button
                type="button"
                onClick={() => onSelectProduct(product)}
                className="theme-button-text rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3.5 py-2.5 text-xs font-medium text-[#636A6F] transition-colors hover:border-[#28537D] hover:text-[#24282B]"
              >
                Quick View
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
              className={`theme-button-text inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-xs font-semibold transition-colors ${
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
      </div>
    </section>
  );
};
