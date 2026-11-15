import React from 'react';
import { Heart, ExternalLink, Eye } from 'lucide-react';
import { Product } from '../types/content';
import { PhotoImage } from './ObjectIllustrations';

export interface ProductCardProps {
  product: Product;
  isSaved?: boolean;
  onToggleSave?: (productId: string) => void;
  onSelectProduct?: (product: Product) => void;
  awardNote?: string;
  variant?: 'open' | 'surface' | 'discovery' | 'guide-feature';
  customEditorialNote?: string;
  idealForNote?: string;
  goodToKnowNote?: string;
  domId?: string;
  /** Optional compact secondary action slot (e.g. Save-to-List selector in Gift Finder) */
  footerActionSlot?: React.ReactNode;
}

const RECIPIENT_LABELS: Record<string, string> = {
  partner: 'Partner',
  parent: 'Parents',
  friend: 'Close Friends',
  host: 'Hosts',
  kids: 'Kids & Family',
  coworker: 'Coworkers',
};

const OCCASION_LABELS: Record<string, string> = {
  birthday: 'Birthdays',
  housewarming: 'Housewarming',
  anniversary: 'Anniversary',
  'thank-you': 'Thank You',
  holidays: 'Holidays',
  'just-because': 'Just Because',
};

const isDevPreview =
  typeof import.meta !== 'undefined' &&
  Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isSaved = false,
  onToggleSave,
  onSelectProduct,
  awardNote,
  variant = 'open',
  customEditorialNote,
  idealForNote,
  goodToKnowNote,
  domId,
  footerActionSlot,
}) => {
  const primaryImage = product.images?.[0] ?? {
    id: 'fallback',
    url: '',
    fallbackColor: '#F3ECE1',
    alt: product.title,
  };
  const activeTag = awardNote || product.calloutTag;
  const hasDisplayablePrice =
    typeof product.price === 'number' &&
    Number.isFinite(product.price) &&
    product.price > 0;

  const recipientLabels = (product.recipients ?? [])
    .slice(0, 2)
    .map((r) => RECIPIENT_LABELS[r] || r);
  const occasionLabels = (product.occasions ?? [])
    .slice(0, 2)
    .map((o) => OCCASION_LABELS[o] || o);

  // Horizontal Feature Layout for Lead Pick in each Budget Section / Guide Feature
  if (variant === 'guide-feature') {
    return (
      <article
        id={domId}
        className="group rounded-3xl bg-white p-6 md:p-8 shadow-xs transition-all scroll-mt-28"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-7 items-center">
          {/* Left: 4:3 Image Composition */}
          <div
            onClick={() => onSelectProduct?.(product)}
            className="md:col-span-5 relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-[#F3ECE1] cursor-pointer"
          >
            <PhotoImage
              image={primaryImage}
              src={primaryImage.url}
              alt={primaryImage.alt}
              fallbackColor={primaryImage.fallbackColor}
              preset="feature-landscape"
              aspectRatio="4:3"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {onToggleSave && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(product.id);
                }}
                aria-pressed={isSaved}
                aria-label={
                  isSaved
                    ? `Remove ${product.title} from Saved Gifts`
                    : `Bookmark ${product.title} to Saved Gifts`
                }
                className={`absolute top-3.5 right-3.5 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm focus-visible:outline-2 focus-visible:outline-[#1B3D5F] ${
                  isSaved
                    ? 'bg-[#F2846B] text-white'
                    : 'bg-white/95 text-[#1B3D5F] hover:bg-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>

          {/* Right: Editorial Details & Gift Rationale */}
          <div className="md:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-[#62666A] font-medium">
                {activeTag && (
                  <>
                    <span className="font-semibold uppercase tracking-wider text-[#28537D]">
                      {activeTag}
                    </span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span>{product.productType}</span>
                <span aria-hidden="true">·</span>
                <span>{product.vendor}</span>
              </div>

              <div className="text-lg font-semibold text-[#222426] tabular-nums">
                {hasDisplayablePrice ? (
                  <>
                    ${product.price}{' '}
                    <span className="text-xs font-normal text-[#62666A]">
                      {product.currency}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-medium text-[#62666A]">
                    Price unverified
                  </span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xl md:text-2xl font-serif font-semibold text-[#222426] leading-snug mb-1">
                <a
                  href={`/products/${product.slug}/`}
                  onClick={(e) => {
                    if (onSelectProduct) {
                      e.preventDefault();
                      onSelectProduct(product);
                    }
                  }}
                  className="text-left hover:text-[#28537D] transition-colors focus-visible:outline-2 focus-visible:outline-[#28537D]"
                >
                  {product.title}
                </a>
              </h3>
              <p className="text-sm font-medium text-[#62666A]">{product.subtitle}</p>
            </div>

            <div className="space-y-2 text-sm text-[#292B2D] leading-relaxed">
              <p>
                <strong className="font-semibold text-[#222426]">Why it makes a great gift: </strong>
                {customEditorialNote || product.whyToGiveIt}
              </p>
              {idealForNote && (
                <p className="text-xs text-[#62666A]">
                  <strong className="font-semibold text-[#222426]">Best for: </strong>
                  {idealForNote}
                </p>
              )}
              {goodToKnowNote && (
                <p className="text-xs text-[#62666A]">
                  <strong className="font-semibold text-[#222426]">Good to know: </strong>
                  {goodToKnowNote}
                </p>
              )}
            </div>

            {/* Unboxed Recipient, Occasion & Interest Metadata + Explicit Actions */}
            <div className="pt-3 border-t border-[#DFDBD3] flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-[#62666A]">
                <span>For: {recipientLabels.join(', ')}</span>
                <span aria-hidden="true"> · </span>
                <span>Occasions: {occasionLabels.join(', ')}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {onToggleSave && (
                  <button
                    type="button"
                    onClick={() => onToggleSave(product.id)}
                    aria-pressed={isSaved}
                    className={`px-3.5 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#1B3D5F] ${
                      isSaved
                        ? 'bg-[#F2846B]/15 text-[#222426]'
                        : 'bg-[#F3ECE1] text-[#222426] hover:bg-[#E8F8F0]'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#F2846B] text-[#F2846B]' : ''}`} />
                    <span>{isSaved ? 'Saved to List' : 'Save Gift'}</span>
                  </button>
                )}

                <a
                  href={product.purchaseUrl}
                  onClick={(e) => {
                    if (onSelectProduct) {
                      e.preventDefault();
                      onSelectProduct(product);
                    }
                  }}
                  className="px-4 py-2 rounded-full bg-[#1B3D5F] text-[#FAF7F2] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#28537D] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#28537D]"
                >
                  <span>
                    {hasDisplayablePrice
                      ? `$${product.price} ${product.currency} · `
                      : ''}
                    {product.isPlaceholderLink ? 'Sample Link & Details' : 'View Product'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // Compact Discovery Card (Homepage, Search Results, Filterable Catalog, Archives & Discovery Hubs)
  const conciseSummary =
    product.subtitle?.trim() ||
    product.bestForSummary?.trim() ||
    customEditorialNote?.trim() ||
    product.whyToGiveIt?.trim() ||
    '';
  const productHref = `/products/${product.slug}/`;
  const isSurfaceVariant = variant === 'surface';

  return (
    <article
      id={domId}
      data-card-variant="compact-discovery"
      className={`group flex flex-col justify-between h-full transition-transform duration-200 scroll-mt-28 ${
        isSurfaceVariant
          ? 'bg-white rounded-3xl p-4 border border-[#DFDBD3] shadow-2xs hover:-translate-y-0.5'
          : 'hover:-translate-y-0.5'
      }`}
    >
      <div className="flex flex-col flex-1">
        {/* Product Photography Stage */}
        <div className="relative aspect-4/5 w-full rounded-2xl overflow-hidden bg-[#F3ECE1] mb-4">
          <a
            href={productHref}
            aria-label={`View ${product.title}`}
            className="block w-full h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B3D5F]"
          >
            <PhotoImage
              image={primaryImage}
              src={primaryImage.url}
              alt={primaryImage.alt}
              fallbackColor={primaryImage.fallbackColor}
              preset="card-portrait"
              aspectRatio="4:5"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </a>

          {isDevPreview && product.isPlaceholderLink && (
            <span className="pointer-events-none absolute top-3 left-3 rounded-md bg-[#FAF9F6]/88 backdrop-blur-xs border border-[#DFDBD3]/75 px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#62666A]">
              Sample
            </span>
          )}

          {onToggleSave && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave(product.id);
              }}
              aria-pressed={isSaved}
              aria-label={
                isSaved
                  ? `Remove ${product.title} from Saved Gifts`
                  : `Save ${product.title} to Saved Gifts`
              }
              className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1B3D5F] ${
                isSaved
                  ? 'bg-[#F2846B] text-white'
                  : 'bg-white/95 text-[#222426] hover:bg-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        {/* Clean Editorial Discovery Copy */}
        <div className="px-1 flex-1 flex flex-col">
          {/* Small Category or Editorial Label */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#62666A] mb-1.5 font-medium truncate">
            {activeTag && (
              <>
                <span className="text-[#28537D] font-semibold uppercase tracking-wider shrink-0">
                  {activeTag}
                </span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span className="truncate">{product.productType}</span>
          </div>

          {/* Product Title (2-line cap for balanced grid rhythm) */}
          <h3 className="theme-product-title text-[1.0625rem] sm:text-lg font-serif font-semibold text-[#222426] leading-snug group-hover:text-[#28537D] transition-colors mb-1.5 line-clamp-2">
            <a
              href={productHref}
              className="hover:underline focus-visible:outline-2 focus-visible:outline-[#28537D]"
            >
              {product.title}
            </a>
          </h3>

          {/* One Concise Editorial Summary (2-line cap) */}
          {conciseSummary && (
            <p className="theme-caption text-[13px] text-[#62666A] leading-relaxed line-clamp-2">
              {conciseSummary}
            </p>
          )}
        </div>
      </div>

      {/* Balanced Footer: Single Price Display & Quick View (when applicable) */}
      <div className="px-1 pt-3 mt-4 border-t border-[#DFDBD3]/80 flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-[#222426] tabular-nums whitespace-nowrap">
          {hasDisplayablePrice ? (
            <>
              ${product.price}{' '}
              <span className="text-[11px] font-normal text-[#62666A]">
                {product.currency}
              </span>
            </>
          ) : (
            <span className="text-xs font-medium text-[#62666A]">
              Price unverified
            </span>
          )}
        </span>

        <div className="flex items-center gap-2.5 min-w-0">
          {footerActionSlot}
          {onSelectProduct && (
            <button
              type="button"
              onClick={() => onSelectProduct(product)}
              aria-label={`Quick view ${product.title}`}
              className="inline-flex items-center gap-1 font-semibold text-[#28537D] hover:text-[#1B3D5F] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#28537D]"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Quick View</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
