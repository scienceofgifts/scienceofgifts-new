import React from 'react';
import { Heart, ArrowUpRight, ExternalLink } from 'lucide-react';
import { Product } from '../types/content';
import { PhotoImage } from './ObjectIllustrations';

interface ProductCardProps {
  product: Product;
  isSaved: boolean;
  onToggleSave: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  awardNote?: string;
  variant?: 'open' | 'surface' | 'guide-feature';
  customEditorialNote?: string;
  idealForNote?: string;
  goodToKnowNote?: string;
  domId?: string;
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

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isSaved,
  onToggleSave,
  onSelectProduct,
  awardNote,
  variant = 'open',
  customEditorialNote,
  idealForNote,
  goodToKnowNote,
  domId,
}) => {
  const primaryImage = product.images?.[0] ?? {
    id: 'fallback',
    url: '',
    fallbackColor: '#EBF3FE',
    alt: product.title,
  };
  const activeTag = awardNote || product.calloutTag;

  const recipientLabels = (product.recipients ?? [])
    .slice(0, 2)
    .map((r) => RECIPIENT_LABELS[r] || r);
  const occasionLabels = (product.occasions ?? [])
    .slice(0, 2)
    .map((o) => OCCASION_LABELS[o] || o);

  // Horizontal Feature Layout for Lead Pick in each Budget Section
  if (variant === 'guide-feature') {
    return (
      <article
        id={domId}
        className="group rounded-3xl bg-white p-6 md:p-8 shadow-xs transition-all scroll-mt-28"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-7 items-center">
          {/* Left: 4:3 Image Composition */}
          <div
            onClick={() => onSelectProduct(product)}
            className="md:col-span-5 relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-[#F3ECE1] cursor-pointer"
          >
            <PhotoImage
              src={primaryImage.url}
              alt={primaryImage.alt}
              fallbackColor={primaryImage.fallbackColor}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
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
          </div>

          {/* Right: Editorial Details & Gift Rationale */}
          <div className="md:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-[#28537D] font-medium">
                {activeTag && (
                  <>
                    <span className="font-semibold uppercase tracking-wider text-[#1B3D5F]">
                      {activeTag}
                    </span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span>{product.productType}</span>
                <span aria-hidden="true">·</span>
                <span>{product.vendor}</span>
              </div>

              <div className="text-lg font-semibold text-[#1B3D5F] tabular-nums">
                ${product.price} <span className="text-xs font-normal text-[#28537D]">{product.currency}</span>
              </div>
            </div>

            <div>
              <h3 className="text-xl md:text-2xl font-serif font-semibold text-[#1B3D5F] leading-snug mb-1">
                <button
                  type="button"
                  onClick={() => onSelectProduct(product)}
                  className="text-left hover:text-[#28537D] transition-colors focus-visible:outline-2 focus-visible:outline-[#28537D]"
                >
                  {product.title}
                </button>
              </h3>
              <p className="text-sm font-medium text-[#28537D]">{product.subtitle}</p>
            </div>

            <div className="space-y-2 text-sm text-[#1B3D5F]/90 leading-relaxed">
              <p>
                <strong className="font-semibold text-[#1B3D5F]">Why it makes a great gift: </strong>
                {customEditorialNote || product.whyToGiveIt}
              </p>
              {idealForNote && (
                <p className="text-xs text-[#28537D]">
                  <strong className="font-semibold text-[#1B3D5F]">Best for: </strong>
                  {idealForNote}
                </p>
              )}
              {goodToKnowNote && (
                <p className="text-xs text-[#28537D]">
                  <strong className="font-semibold text-[#1B3D5F]">Good to know: </strong>
                  {goodToKnowNote}
                </p>
              )}
            </div>

            {/* Unboxed Recipient, Occasion & Interest Metadata + Explicit Actions */}
            <div className="pt-3 border-t border-[#1B3D5F]/10 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-[#28537D]">
                <span>For: {recipientLabels.join(', ')}</span>
                <span aria-hidden="true"> · </span>
                <span>Occasions: {occasionLabels.join(', ')}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onToggleSave(product.id)}
                  aria-pressed={isSaved}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#1B3D5F] ${
                    isSaved
                      ? 'bg-[#F2846B]/15 text-[#1B3D5F]'
                      : 'bg-[#F3ECE1] text-[#1B3D5F] hover:bg-[#E8F8F0]'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#F2846B] text-[#F2846B]' : ''}`} />
                  <span>{isSaved ? 'Saved to List' : 'Save Gift'}</span>
                </button>

                <a
                  href={product.purchaseUrl}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectProduct(product);
                  }}
                  className="px-4 py-2 rounded-full bg-[#1B3D5F] text-[#FAF7F2] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#28537D] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#28537D]"
                >
                  <span>
                    ${product.price} {product.currency} ·{' '}
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

  return (
    <article
      id={domId}
      className={`group flex flex-col justify-between transition-transform duration-200 scroll-mt-28 ${
        variant === 'surface'
          ? 'bg-[#FAF7F2] rounded-2xl p-4 shadow-xs hover:-translate-y-1'
          : 'hover:-translate-y-1'
      }`}
    >
      <div>
        {/* Desirable Photography Stage */}
        <div
          onClick={() => onSelectProduct(product)}
          className="relative aspect-4/5 w-full rounded-2xl overflow-hidden bg-[#F3ECE1] cursor-pointer mb-4"
        >
          <PhotoImage
            src={primaryImage.url}
            alt={primaryImage.alt}
            fallbackColor={primaryImage.fallbackColor}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

          {/* Bookmark Button */}
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

          {/* Price & Currency Overlay */}
          <div className="absolute bottom-3.5 left-3.5 text-white font-semibold text-sm tracking-tight drop-shadow-xs tabular-nums">
            ${product.price} <span className="text-[11px] font-normal opacity-90">{product.currency}</span>
          </div>
        </div>

        {/* Open, Unboxed Editorial Copy */}
        <div className="px-1">
          {/* Unboxed Kicker Line */}
          <div className="flex items-center gap-1.5 text-xs text-[#28537D] mb-1.5 font-medium">
            {activeTag && (
              <>
                <span className="text-[#1B3D5F] font-semibold">{activeTag}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>{product.productType}</span>
          </div>

          {/* Product Name */}
          <h3 className="text-lg font-serif font-semibold text-[#1B3D5F] leading-snug group-hover:text-[#28537D] transition-colors mb-1">
            <button
              type="button"
              onClick={() => onSelectProduct(product)}
              className="text-left focus-visible:outline-2 focus-visible:outline-[#28537D]"
            >
              {product.title}
            </button>
          </h3>

          {/* Short, specific description */}
          <p className="text-xs font-medium text-[#28537D] mb-2 line-clamp-2">
            {product.subtitle}
          </p>

          {/* Clear explanation of why it makes a good gift */}
          <p className="text-sm text-[#1B3D5F]/85 leading-relaxed mb-3">
            {customEditorialNote || product.whyToGiveIt}
          </p>

          {goodToKnowNote && (
            <p className="text-xs text-[#28537D] mb-2">
              <strong className="font-semibold text-[#1B3D5F]">Note:</strong> {goodToKnowNote}
            </p>
          )}
        </div>
      </div>

      {/* Recipient/Occasion Labels & Explicit Product Link */}
      <div className="px-1 pt-2.5 border-t border-[#1B3D5F]/10 space-y-2 text-xs">
        <div className="text-[#28537D] truncate">
          <span>For: {recipientLabels.join(', ')}</span>
          {product.interests?.[0] && (
            <>
              <span aria-hidden="true"> · </span>
              <span>{product.interests[0]}</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="font-semibold text-[#1B3D5F] tabular-nums">
            ${product.price} {product.currency}
          </span>

          <a
            href={product.purchaseUrl}
            onClick={(e) => {
              e.preventDefault();
              onSelectProduct(product);
            }}
            className="inline-flex items-center gap-1 font-semibold text-[#1B3D5F] hover:text-[#28537D] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#28537D]"
          >
            <span>
              {product.isPlaceholderLink ? 'Sample Link & Details' : 'See why we love it'}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
};
