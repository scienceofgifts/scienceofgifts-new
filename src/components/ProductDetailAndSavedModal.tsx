import React, { useState } from 'react';
import {
  X,
  Heart,
  ExternalLink,
  Trash2,
  Info,
  Sparkles,
  Plus,
  Check,
  FolderPlus,
  AlertTriangle,
} from 'lucide-react';
import { Product } from '../types/content';
import { PRODUCTS } from '../data/catalog';
import { PhotoImage } from './ObjectIllustrations';
import {
  DEFAULT_LIST_ID,
  SavedGiftList,
  resolveSavedListItems,
  useSavedGiftsState,
} from '../utils/savedGiftsStore';

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
  const { giftLists, addProductToList } = useSavedGiftsState();
  const [selectedListId, setSelectedListId] = useState<string>(DEFAULT_LIST_ID);

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
              <p className="text-sm text-[#28537D] leading-relaxed">
                {product.subtitle}
              </p>
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
                  <div className="text-xs text-[#28537D] mt-0.5">
                    {product.vendor}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
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
                    <Heart
                      className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`}
                    />
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

              {giftLists.length > 1 && (
                <div className="pt-2 border-t border-[#1B3D5F]/10 flex items-center justify-between gap-2 text-xs">
                  <label
                    htmlFor="modal-save-to-list"
                    className="text-[#28537D] font-medium"
                  >
                    Save to specific list:
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      id="modal-save-to-list"
                      value={selectedListId}
                      onChange={(e) => setSelectedListId(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-white text-[#1B3D5F] text-xs font-medium border border-[#1B3D5F]/15"
                    >
                      {giftLists.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => addProductToList(product.id, selectedListId)}
                      className="px-3 py-1.5 rounded-xl bg-[#1B3D5F] text-white text-xs font-semibold hover:bg-[#28537D]"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {product.isPlaceholderLink && (
                <div className="pt-2 border-t border-[#1B3D5F]/10 flex items-start gap-2 text-[11px] text-[#28537D]">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Development Preview: This is a sample canonical product
                    record (ID: <code>{product.id}</code>). The purchase button
                    points to a labeled placeholder destination (
                    <code>{product.purchaseUrl}</code>).
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
                    <span>
                      Open Canonical Product Page (/products/{product.slug}/)
                    </span>
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
  onUpdateRecipientNote: (productId: string, note: string, listId?: string) => void;
  onToggleSave: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onClose: () => void;
  productsMap?: Record<string, Product>;
  giftLists?: SavedGiftList[];
}

export const SavedGiftsDrawer: React.FC<SavedGiftsDrawerProps> = ({
  isOpen,
  onUpdateRecipientNote,
  onSelectProduct,
  onClose,
  productsMap = PRODUCTS,
}) => {
  const {
    giftLists,
    createList,
    removeList,
    removeItemFromList,
    moveItemBetweenLists,
    toggleItemPurchased,
    clearAllLists,
  } = useSavedGiftsState();

  const [activeListId, setActiveListId] = useState<string>(DEFAULT_LIST_ID);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListRecipient, setNewListRecipient] = useState('');
  const [newListOccasion, setNewListOccasion] = useState('');
  const [confirmAction, setConfirmAction] = useState<
    null | { type: 'delete-list'; listId: string; listName: string } | { type: 'clear-all' }
  >(null);

  if (!isOpen) return null;

  const currentList =
    giftLists.find((l) => l.id === activeListId) ??
    giftLists[0] ?? {
      id: DEFAULT_LIST_ID,
      name: 'General Saved Ideas',
      createdAt: '',
      updatedAt: '',
      items: [],
    };

  const {
    resolvedItems,
    validProductsCount,
    purchasedCount,
    totalVerifiedPrice,
  } = resolveSavedListItems(currentList, productsMap);

  const totalUniqueSavedAcrossLists = new Set(
    giftLists.flatMap((l) => l.items.map((i) => i.productId))
  ).size;

  const handleCreateListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const created = createList({
      name: newListName.trim(),
      recipientLabel: newListRecipient.trim() || undefined,
      occasionLabel: newListOccasion.trim() || undefined,
    });
    setActiveListId(created.id);
    setNewListName('');
    setNewListRecipient('');
    setNewListOccasion('');
    setIsCreatingList(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#1B3D5F]/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Saved Gift Ideas & Recipient Lists"
    >
      <div className="w-full max-w-lg bg-[#FAF7F2] h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="px-6 py-5 bg-[#F3ECE1] border-b border-[#1B3D5F]/10 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-[#28537D]">
                Saved in Your Browser · {giftLists.length}{' '}
                {giftLists.length === 1 ? 'List' : 'Lists'} ·{' '}
                {totalUniqueSavedAcrossLists} Total{' '}
                {totalUniqueSavedAcrossLists === 1 ? 'Gift' : 'Gifts'}
              </span>
              <h2 className="text-xl font-serif font-semibold text-[#1B3D5F]">
                Your Saved Gift Lists
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

          {/* List Tabs & New List Button */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {giftLists.map((list) => {
              const isActive = list.id === currentList.id;
              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => {
                    setActiveListId(list.id);
                    setConfirmAction(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#1B3D5F] text-white'
                      : 'bg-white text-[#1B3D5F] hover:bg-white/80'
                  }`}
                >
                  {list.name} ({list.items.length})
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setIsCreatingList((v) => !v)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#E8F8F0] text-[#1B3D5F] hover:bg-[#C3F3DF] inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New List</span>
            </button>
          </div>

          {/* Create New List Inline Form */}
          {isCreatingList && (
            <form
              onSubmit={handleCreateListSubmit}
              className="p-4 rounded-2xl bg-white border border-[#1B3D5F]/15 space-y-3"
            >
              <div className="text-xs font-semibold text-[#1B3D5F] flex items-center gap-1.5">
                <FolderPlus className="w-3.5 h-3.5 text-[#28537D]" />
                <span>Create a Recipient or Occasion List</span>
              </div>
              <div>
                <label
                  htmlFor="drawer-new-list-name"
                  className="block text-[11px] font-medium text-[#28537D] mb-1"
                >
                  List Name (required)
                </label>
                <input
                  id="drawer-new-list-name"
                  type="text"
                  required
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g., Mom’s Birthday, Holiday Hosts, Sam & Alex"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAF7F2] text-[#1B3D5F] border border-[#1B3D5F]/15 focus:outline-2 focus:outline-[#28537D]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="drawer-new-list-recipient"
                    className="block text-[11px] font-medium text-[#28537D] mb-1"
                  >
                    Relationship (optional)
                  </label>
                  <input
                    id="drawer-new-list-recipient"
                    type="text"
                    value={newListRecipient}
                    onChange={(e) => setNewListRecipient(e.target.value)}
                    placeholder="e.g., Parent, Partner, Host"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#FAF7F2] text-[#1B3D5F] border border-[#1B3D5F]/15"
                  />
                </div>
                <div>
                  <label
                    htmlFor="drawer-new-list-occasion"
                    className="block text-[11px] font-medium text-[#28537D] mb-1"
                  >
                    Occasion (optional)
                  </label>
                  <input
                    id="drawer-new-list-occasion"
                    type="text"
                    value={newListOccasion}
                    onChange={(e) => setNewListOccasion(e.target.value)}
                    placeholder="e.g., Birthday, Holidays"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-[#FAF7F2] text-[#1B3D5F] border border-[#1B3D5F]/15"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingList(false)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-[#28537D] hover:bg-[#F3ECE1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-full bg-[#1B3D5F] text-white text-xs font-semibold hover:bg-[#28537D]"
                >
                  Create List
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Active List Metadata Sub-bar */}
        <div className="px-6 py-3 bg-[#FAF7F2] border-b border-[#1B3D5F]/8 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-[#28537D]">
            <strong className="text-[#1B3D5F]">{currentList.name}</strong>
            {currentList.recipientLabel && (
              <>
                <span aria-hidden="true"> · </span>
                <span>{currentList.recipientLabel}</span>
              </>
            )}
            {currentList.occasionLabel && (
              <>
                <span aria-hidden="true"> · </span>
                <span>{currentList.occasionLabel}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentList.id !== DEFAULT_LIST_ID && (
              <button
                type="button"
                onClick={() =>
                  setConfirmAction({
                    type: 'delete-list',
                    listId: currentList.id,
                    listName: currentList.name,
                  })
                }
                className="text-xs font-medium text-[#28537D] hover:text-[#F2846B] underline"
              >
                Delete list
              </button>
            )}
            <a
              href="/gift-finder/"
              onClick={onClose}
              className="text-xs font-semibold text-[#1B3D5F] hover:text-[#28537D] underline"
            >
              Open in Gift Finder →
            </a>
          </div>
        </div>

        {/* Destructive Action Confirmation Banner */}
        {confirmAction && (
          <div
            role="alert"
            className="mx-6 mt-4 p-4 rounded-2xl bg-[#FFF4D6] border border-[#1B3D5F]/15 space-y-2.5 text-xs"
          >
            <div className="flex items-start gap-2 text-[#1B3D5F] font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#F2846B]" />
              <span>
                {confirmAction.type === 'delete-list'
                  ? `Delete "${confirmAction.listName}" and remove its ${currentList.items.length} saved items?`
                  : 'Clear all saved gift lists and notes from this browser?'}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1.5 rounded-full bg-white text-[#1B3D5F] font-semibold"
              >
                Keep Items
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmAction.type === 'delete-list') {
                    removeList(confirmAction.listId);
                    setActiveListId(DEFAULT_LIST_ID);
                  } else {
                    clearAllLists();
                    setActiveListId(DEFAULT_LIST_ID);
                  }
                  setConfirmAction(null);
                }}
                className="px-3.5 py-1.5 rounded-full bg-[#F2846B] text-white font-semibold"
              >
                {confirmAction.type === 'delete-list'
                  ? 'Yes, Delete List'
                  : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        )}

        {/* Saved Items Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {resolvedItems.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#F3ECE1]/60 space-y-3">
              <p className="font-serif text-lg text-[#1B3D5F]">
                No gifts saved in “{currentList.name}” yet
              </p>
              <p className="text-xs text-[#28537D] leading-relaxed">
                Tap the heart icon on any recommendation or use the Gift Finder
                to save ideas, compare prices, and jot down private notes.
              </p>
              <a
                href="/gift-finder/"
                onClick={onClose}
                className="inline-block px-4 py-2 rounded-full bg-[#1B3D5F] text-white text-xs font-semibold hover:bg-[#28537D]"
              >
                Explore the Gift Finder
              </a>
            </div>
          ) : (
            resolvedItems.map(({ entry, product, isMissingFromCatalog }) => {
              if (isMissingFromCatalog || !product) {
                return (
                  <div
                    key={entry.productId}
                    className="p-4 rounded-2xl bg-white border border-[#D9DFE2] flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-[#1B3D5F]">
                        Unavailable Gift Record ({entry.productId})
                      </div>
                      <p className="text-xs text-[#28537D]">
                        This item is no longer in the active catalog.
                        {entry.note ? ` Note: "${entry.note}"` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        removeItemFromList(entry.productId, currentList.id)
                      }
                      className="px-3 py-1.5 rounded-full bg-[#F3ECE1] text-xs font-semibold text-[#1B3D5F] hover:bg-[#F2846B] hover:text-white transition-colors shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={product.id}
                  className={`p-4 rounded-2xl bg-white shadow-xs border transition-colors space-y-3 ${
                    entry.purchased
                      ? 'border-[#C3F3DF] bg-[#E8F8F0]/35'
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      onClick={() => {
                        onClose();
                        onSelectProduct(product);
                      }}
                      className="w-16 h-16 rounded-xl overflow-hidden shrink-0 cursor-pointer bg-[#F3ECE1]"
                    >
                      <PhotoImage
                        src={product.images[0]?.url}
                        alt={product.images[0]?.alt}
                        fallbackColor={product.images[0]?.fallbackColor}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-[#28537D]">
                        {product.vendor} ·{' '}
                        <strong className="text-[#1B3D5F] tabular-nums">
                          ${product.price} {product.currency}
                        </strong>
                        {entry.purchased && (
                          <span className="ml-1.5 text-[#1B3D5F] font-semibold">
                            · Purchased
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectProduct(product);
                        }}
                        className={`text-sm font-serif font-semibold text-[#1B3D5F] hover:underline text-left line-clamp-1 ${
                          entry.purchased ? 'line-through opacity-75' : ''
                        }`}
                      >
                        {product.title}
                      </button>
                      <div className="pt-0.5 flex items-center gap-3 text-[11px] text-[#28537D]">
                        <a
                          href={`/products/${product.slug}/`}
                          onClick={onClose}
                          className="hover:underline font-medium"
                        >
                          Product page →
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        removeItemFromList(product.id, currentList.id)
                      }
                      className="p-1.5 text-[#28537D] hover:text-[#F2846B] transition-colors"
                      aria-label={`Remove ${product.title} from ${currentList.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Private Note Input */}
                  <div>
                    <label
                      htmlFor={`note-${currentList.id}-${product.id}`}
                      className="block text-[11px] font-medium text-[#28537D] mb-1"
                    >
                      Private recipient note (saved locally)
                    </label>
                    <input
                      id={`note-${currentList.id}-${product.id}`}
                      type="text"
                      value={entry.note}
                      onChange={(e) =>
                        onUpdateRecipientNote(
                          product.id,
                          e.target.value,
                          currentList.id
                        )
                      }
                      placeholder="e.g., Mom’s birthday, write family recipe on top card..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAF7F2] text-[#1B3D5F] placeholder:text-[#28537D]/50 focus:outline-2 focus:outline-[#28537D]"
                    />
                  </div>

                  {/* Purchased Status & Move Between Lists Controls */}
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        toggleItemPurchased(product.id, currentList.id)
                      }
                      aria-pressed={entry.purchased}
                      className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                        entry.purchased
                          ? 'bg-[#1B3D5F] text-white'
                          : 'bg-[#F3ECE1] text-[#1B3D5F] hover:bg-[#E8F8F0]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {entry.purchased ? 'Marked Purchased' : 'Mark Purchased'}
                      </span>
                    </button>

                    {giftLists.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        <label
                          htmlFor={`move-${currentList.id}-${product.id}`}
                          className="text-[11px] text-[#28537D]"
                        >
                          Move to:
                        </label>
                        <select
                          id={`move-${currentList.id}-${product.id}`}
                          value={currentList.id}
                          onChange={(e) =>
                            moveItemBetweenLists(
                              product.id,
                              currentList.id,
                              e.target.value
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] text-[#1B3D5F] text-xs font-medium border border-[#1B3D5F]/15"
                        >
                          {giftLists.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer Summary */}
        <div className="p-6 bg-[#F3ECE1] border-t border-[#1B3D5F]/10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-[#28537D]">
              {validProductsCount}{' '}
              {validProductsCount === 1 ? 'gift' : 'gifts'} in list
              {purchasedCount > 0 ? ` · ${purchasedCount} purchased` : ''}
            </div>
            <div className="text-lg font-semibold text-[#1B3D5F] tabular-nums">
              ${totalVerifiedPrice} USD
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {totalUniqueSavedAcrossLists > 0 && (
              <button
                type="button"
                onClick={() => setConfirmAction({ type: 'clear-all' })}
                className="px-3.5 py-2 rounded-full text-xs font-medium text-[#28537D] hover:text-[#F2846B]"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-[#1B3D5F] text-[#FAF7F2] text-xs font-semibold hover:bg-[#28537D] transition-colors"
            >
              Keep Exploring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
