import React from 'react';
import { X, Heart, ExternalLink, Trash2, Info, Sparkles } from 'lucide-react';
import { Product } from '../types/content';
import { PRODUCTS } from '../data/catalog';
import { PhotoImage } from './ObjectIllustrations';

interface ProductDetailModalProps {
  product: Product | null;
  isSaved: boolean;
  onToggleSave: (productId: string) => void;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isSaved,
  onToggleSave,
  onClose,
}) => {
  if (!product) return null;
  const primaryImage = product.images?.[0] ?? {
    id: 'fallback',
    url: '',
    fallbackColor: '#EBF3FE',
    alt: product.title,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B3D5F]/55 backdrop-blur-xs p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-modal-title"
    >
      <div className="bg-[#FAF7F2] rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#FAF7F2]/90 backdrop-blur-xs sticky top-0 z-10">
          <div className="flex items-center gap-2 text-xs font-medium text-[#28537D]">
            <span>{product.productType}</span>
            <span aria-hidden="true">·</span>
            <span>{product.vendor}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[#1B3D5F] hover:bg-[#1B3D5F]/10 transition-colors"
            aria-label="Close gift details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contiguous Purchase & Gallery Split */}
        <div className="px-6 pb-8 pt-2 md:px-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Realistic Photography */}
          <div className="md:col-span-6 space-y-3">
            <div className="aspect-4/5 w-full rounded-2xl overflow-hidden bg-[#F3ECE1]">
              <PhotoImage
                src={primaryImage.url}
                alt={primaryImage.alt}
                fallbackColor={primaryImage.fallbackColor}
                className="w-full h-full object-cover"
              />
            </div>
            {primaryImage.caption && (
              <p className="text-xs font-serif italic text-[#28537D] px-1">
                {primaryImage.caption}
              </p>
            )}
          </div>

          {/* Right Column: Warm Purchase Module & Editorial Notes */}
          <div className="md:col-span-6 space-y-6">
            <div>
              {product.calloutTag && (
                <div className="text-xs font-semibold uppercase tracking-wider text-[#28537D] mb-1.5">
                  {product.calloutTag}
                </div>
              )}

              <h2
                id="pdp-modal-title"
                className="text-2xl md:text-3xl font-serif font-semibold text-[#1B3D5F] leading-snug mb-2"
              >
                {product.title}
              </h2>
              <p className="text-sm text-[#28537D] leading-relaxed">{product.subtitle}</p>
            </div>

            {/* Price & Primary Actions */}
            <div className="p-5 rounded-2xl bg-[#F3ECE1] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold text-[#1B3D5F] tabular-nums">
                    ${product.price}{' '}
                    <span className="text-xs font-normal text-[#28537D]">
                      {product.currency}
                    </span>
                  </div>
                  <div className="text-xs text-[#28537D] mt-0.5">{product.vendor}</div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onToggleSave(product.id)}
                    aria-pressed={isSaved}
                    className={`px-4 py-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                      isSaved
                        ? 'bg-[#F2846B] text-white'
                        : 'bg-white text-[#1B3D5F] hover:bg-[#1B3D5F]/5'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    <span>{isSaved ? 'Saved' : 'Save Idea'}</span>
                  </button>

                  <a
                    href={product.purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-full bg-[#1B3D5F] text-[#FAF7F2] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#28537D] transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>
                      {product.isPlaceholderLink
                        ? 'Placeholder Purchase Link'
                        : `Shop at ${product.vendor}`}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {product.isPlaceholderLink && (
                <div className="pt-2 border-t border-[#1B3D5F]/10 flex items-start gap-2 text-[11px] text-[#28537D]">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Development Preview: This is a sample canonical product record (ID:{' '}
                    <code>{product.id}</code>). The purchase button points to a labeled placeholder destination (<code>{product.purchaseUrl}</code>).
                  </span>
                </div>
              )}
            </div>

            {/* Why They'll Love It */}
            <div className="space-y-4 text-sm leading-relaxed">
              <div className="p-5 rounded-2xl bg-[#E8F8F0]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1B3D5F] mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Why It Makes a Great Gift</span>
                </h3>
                <p className="text-[#1B3D5F]">{product.whyToGiveIt}</p>
              </div>

              <div className="px-1 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                  Details & Presentation
                </h3>
                <p className="text-[#28537D] text-xs leading-relaxed">
                  {product.detailsAndCare}
                </p>
              </div>

              <div className="px-1 pt-2 border-t border-[#1B3D5F]/10 text-xs text-[#28537D] space-y-2">
                <div>
                  <strong className="text-[#1B3D5F]">Best for:</strong>{' '}
                  {product.bestForSummary}
                </div>
                <div>
                  <strong className="text-[#1B3D5F]">Occasions:</strong>{' '}
                  {product.occasions.join(' · ')}
                </div>
                <div className="pt-1">
                  <a
                    href={`/products/${product.slug}/`}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#1B3D5F] hover:text-[#28537D] hover:underline"
                  >
                    <span>Open Canonical Product Page (/products/{product.slug}/)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SavedGiftsDrawerProps {
  isOpen: boolean;
  savedProductIds: string[];
  recipientNotes: Record<string, string>;
  onUpdateRecipientNote: (productId: string, note: string) => void;
  onToggleSave: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onClose: () => void;
  productsMap?: Record<string, Product>;
}

export const SavedGiftsDrawer: React.FC<SavedGiftsDrawerProps> = ({
  isOpen,
  savedProductIds,
  recipientNotes,
  onUpdateRecipientNote,
  onToggleSave,
  onSelectProduct,
  onClose,
  productsMap = PRODUCTS,
}) => {
  if (!isOpen) return null;

  const savedProducts = savedProductIds.map((id) => productsMap[id]).filter(Boolean);
  const totalBudget = savedProducts.reduce((sum, p) => sum + p.price, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#1B3D5F]/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Saved Gift Ideas"
    >
      <div className="w-full max-w-md bg-[#FAF7F2] h-full flex flex-col shadow-2xl">
        <div className="px-6 py-5 bg-[#F3ECE1] flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#28537D]">
              Saved in Your Browser · No Account Needed
            </span>
            <h2 className="text-xl font-serif font-semibold text-[#1B3D5F]">
              Your Gift List ({savedProducts.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[#1B3D5F] hover:bg-[#1B3D5F]/10"
            aria-label="Close Saved Gifts drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {savedProducts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#F3ECE1]/60 space-y-2">
              <p className="font-serif text-lg text-[#1B3D5F]">
                No saved gift ideas yet
              </p>
              <p className="text-xs text-[#28537D] leading-relaxed">
                Tap the heart icon on any product while browsing to keep track of ideas for birthdays, hosts, and holidays.
              </p>
            </div>
          ) : (
            savedProducts.map((prod) => (
              <div
                key={prod.id}
                className="p-4 rounded-2xl bg-white shadow-xs space-y-3"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    onClick={() => {
                      onClose();
                      onSelectProduct(prod);
                    }}
                    className="w-16 h-16 rounded-xl overflow-hidden shrink-0 cursor-pointer bg-[#F3ECE1]"
                  >
                    <PhotoImage
                      src={prod.images[0]?.url}
                      alt={prod.images[0]?.alt}
                      fallbackColor={prod.images[0]?.fallbackColor}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#28537D]">
                      {prod.vendor} ·{' '}
                      <strong className="text-[#1B3D5F]">
                        ${prod.price} {prod.currency}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectProduct(prod);
                      }}
                      className="text-sm font-serif font-semibold text-[#1B3D5F] hover:underline text-left line-clamp-1"
                    >
                      {prod.title}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleSave(prod.id)}
                    className="p-1.5 text-[#28537D] hover:text-[#F2846B] transition-colors"
                    aria-label={`Remove ${prod.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label
                    htmlFor={`note-${prod.id}`}
                    className="block text-[11px] font-medium text-[#28537D] mb-1"
                  >
                    Who is this for?
                  </label>
                  <input
                    id={`note-${prod.id}`}
                    type="text"
                    value={recipientNotes[prod.id] ?? ''}
                    onChange={(e) => onUpdateRecipientNote(prod.id, e.target.value)}
                    placeholder="e.g., Mom's birthday, Sam's housewarming..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAF7F2] text-[#1B3D5F] placeholder:text-[#28537D]/50 focus:outline-2 focus:outline-[#28537D]"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {savedProducts.length > 0 && (
          <div className="p-6 bg-[#F3ECE1] flex items-center justify-between">
            <div>
              <div className="text-xs text-[#28537D]">Total for {savedProducts.length} gifts</div>
              <div className="text-lg font-semibold text-[#1B3D5F] tabular-nums">
                ${totalBudget} USD
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-[#1B3D5F] text-[#FAF7F2] text-xs font-semibold hover:bg-[#28537D] transition-colors"
            >
              Keep Exploring
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
