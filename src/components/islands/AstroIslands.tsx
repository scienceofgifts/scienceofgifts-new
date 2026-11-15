import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Heart,
  Bookmark,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Gift,
  ExternalLink,
  Menu,
  ShoppingBag,
  X,
} from 'lucide-react';
import {
  HeaderActiveSection,
  SHOP_EXTERNAL_URL,
  resolveEditorialHubHeaderLinks,
} from '../../config/navigationConfig';
import {
  Article,
  GiftGuide,
  OccasionType,
  PersonalityTrait,
  Product,
  RecipientSpotlight,
  RecipientType,
} from '../../types/content';
import { CatalogDataOverride } from '../../utils/seoAndValidation';
import {
  OPEN_ARCH_MODAL_EVENT,
  OPEN_PRODUCT_MODAL_EVENT,
  OPEN_SAVED_DRAWER_EVENT,
  OPEN_SITE_SEARCH_EVENT,
  dispatchOpenArchModal,
  dispatchOpenProductModal,
  dispatchOpenSavedDrawer,
  dispatchOpenSiteSearch,
  useSavedGiftsState,
} from '../../utils/savedGiftsStore';
import { PhotoImage } from '../ObjectIllustrations';
import { ProductCard } from '../ProductCard';
import { GiftGuideReaderView } from '../GiftGuideReaderView';
import { ArticleReaderView } from '../ArticleReaderView';
import { EnrichedEditorialHub } from '../../cms/contentRepository';
import { EditorialDiscoveryHubView } from '../EditorialDiscoveryHubView';
import {
  ProductDetailModal,
  SavedGiftsDrawer,
} from '../ProductDetailAndSavedModal';
import { ArchitectureAndSeoModal } from '../ArchitectureAndSeoModal';
import { SiteSearchModal } from '../SiteSearchModal';

type HomeBudgetFilter = 'all' | 'under-50' | '50-to-100' | '100-plus';

const RECIPIENT_PILLS: { value: RecipientType | 'all'; label: string }[] = [
  { value: 'all', label: 'Anyone' },
  { value: 'parent', label: 'Parents & In-Laws' },
  { value: 'partner', label: 'Partner' },
  { value: 'friend', label: 'Best Friend' },
  { value: 'host', label: 'Dinner Host' },
  { value: 'kids', label: 'Kids & Family' },
  { value: 'coworker', label: 'Coworker' },
];

const VIBE_OPTIONS: { value: PersonalityTrait | 'all'; label: string }[] = [
  { value: 'all', label: 'All Interests & Vibes' },
  { value: 'foodie-host', label: 'Cooking, Hosting & Flavors' },
  { value: 'cozy-homebody', label: 'Cozy Sanctuary & Slow Mornings' },
  { value: 'curious-creative', label: 'Art, Games & Hands-On Craft' },
  { value: 'outdoors-nature', label: 'Gardens, Plants & Nature' },
  { value: 'nostalgic-sentimental', label: 'Sentimental & Personal Keepsakes' },
  { value: 'everyday-ritual', label: 'Coffee, Tea & Daily Rituals' },
];

const BUDGET_PILLS: { value: HomeBudgetFilter; label: string }[] = [
  { value: 'all', label: 'Any Price' },
  { value: 'under-50', label: 'Under $50' },
  { value: '50-to-100', label: '$50 – $100' },
  { value: '100-plus', label: 'Over $100' },
];

const OCCASION_PILLS: { value: OccasionType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Occasions' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'housewarming', label: 'Housewarming' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'thank-you', label: 'Thank You & Host' },
  { value: 'holidays', label: 'Holidays' },
  { value: 'just-because', label: 'Just Because' },
];

export const HeaderSearchButtonIsland: React.FC<{
  variant?: 'bar' | 'icon';
}> = ({ variant = 'bar' }) => {
  const [headerQuery, setHeaderQuery] = useState('');

  const handleOpenSearch = (initialQuery?: string) => {
    dispatchOpenSiteSearch(initialQuery);
    setHeaderQuery('');
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={() => handleOpenSearch()}
        aria-label="Search gifts, guides, and stories"
        title="Search gifts, guides, and stories (⌘K)"
        className="inline-flex h-9 w-9 items-center justify-center rounded-[6px] text-[#24282B] hover:bg-[#F6F4EF] hover:text-[#1B3D5F] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B3D5F] cursor-pointer shrink-0"
      >
        <Search
          aria-hidden="true"
          strokeWidth={1.75}
          className="h-[17px] w-[17px]"
        />
      </button>
    );
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        handleOpenSearch(headerQuery.trim());
      }}
      className="w-full max-w-[560px]"
    >
      <div
        onClick={() => handleOpenSearch(headerQuery.trim())}
        className="group flex h-[42px] w-full items-center rounded-[8px] border border-[#C5C1B8]/90 bg-[#FFFFFF] px-3.5 transition-colors duration-150 hover:border-[#24282B]/55 focus-within:border-[#24282B] cursor-text"
      >
        <button
          type="submit"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenSearch(headerQuery.trim());
          }}
          aria-label="Search gifts, guides, and stories"
          title="Search gifts, guides, and stories (⌘K)"
          className="mr-2.5 inline-flex h-6 w-6 shrink-0 items-center justify-center text-[#636A6F] transition-colors group-hover:text-[#24282B] hover:text-[#1B3D5F] focus-visible:outline-2 focus-visible:outline-[#1B3D5F] cursor-pointer"
        >
          <Search
            aria-hidden="true"
            strokeWidth={1.75}
            className="h-[16px] w-[16px]"
          />
        </button>
        <input
          type="search"
          value={headerQuery}
          onChange={(e) => {
            const nextValue = e.target.value;
            setHeaderQuery(nextValue);
            handleOpenSearch(nextValue);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleOpenSearch(headerQuery.trim());
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenSearch(headerQuery.trim());
          }}
          placeholder="Search gifts, guides, recipients, or occasions..."
          aria-label="Search gifts, guides, and stories"
          className="w-full min-w-0 bg-transparent font-sans text-[0.875rem] text-[#24282B] placeholder:text-[#636A6F] focus:outline-none"
        />
      </div>
    </form>
  );
};

export const HeaderSavedButtonIsland: React.FC<{
  variant?: 'desktop' | 'compact-icon' | 'mobile';
}> = ({ variant = 'desktop' }) => {
  const { savedProductIds } = useSavedGiftsState();

  if (variant === 'compact-icon') {
    return (
      <button
        type="button"
        onClick={dispatchOpenSavedDrawer}
        aria-label={`Saved Gifts (${savedProductIds.length})`}
        title={`Saved Gifts (${savedProductIds.length})`}
        className="inline-flex h-9 items-center justify-center gap-1 rounded-[6px] px-2 text-[#24282B] hover:bg-[#F6F4EF] hover:text-[#1B3D5F] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B3D5F] cursor-pointer"
      >
        <Bookmark
          aria-hidden="true"
          strokeWidth={1.75}
          className="h-[17px] w-[17px] shrink-0 text-[#24282B]"
        />
        <span className="font-mono text-[0.75rem] tabular-nums text-[#636A6F]">
          ({savedProductIds.length})
        </span>
      </button>
    );
  }

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={dispatchOpenSavedDrawer}
        className="theme-nav-utility inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:text-[#1B3D5F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B3D5F] cursor-pointer"
      >
        <Bookmark
          aria-hidden="true"
          strokeWidth={1.7}
          className="h-[15px] w-[15px] shrink-0 text-[#1B3D5F]"
        />
        <span>Saved Gifts ({savedProductIds.length})</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={dispatchOpenSavedDrawer}
      className="theme-nav-utility inline-flex items-center gap-1.5 py-2 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B3D5F] cursor-pointer"
    >
      <Bookmark
        aria-hidden="true"
        strokeWidth={1.7}
        className="h-[16px] w-[16px] shrink-0 text-[#24282B] -translate-y-[0.5px]"
      />
      <span>Saved Gifts</span>
      <span className="font-mono text-[0.75rem] tabular-nums text-[#636A6F]">
        ({savedProductIds.length})
      </span>
    </button>
  );
};

export const MobileNavigationIsland: React.FC<{
  activeSection?: HeaderActiveSection;
  isDevPreview?: boolean;
}> = ({ activeSection = 'home', isDevPreview }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { savedProductIds } = useSavedGiftsState();
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorialHubLinks = resolveEditorialHubHeaderLinks(
    isDevPreview !== undefined ? { isDevPreview } : undefined
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        toggleBtnRef.current?.focus();
      }
    };

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="lg:hidden shrink-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => dispatchOpenSiteSearch()}
          aria-label="Search gifts, guides, and stories"
          title="Search gifts, guides, and stories"
          className="inline-flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#E3E1DB] bg-[#FFFFFF] text-[#24282B] hover:border-[#24282B]/40 hover:text-[#1B3D5F] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B3D5F] cursor-pointer shrink-0"
        >
          <Search
            aria-hidden="true"
            strokeWidth={1.7}
            className="h-[16px] w-[16px]"
          />
        </button>

        <button
          ref={toggleBtnRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-controls="mobile-primary-navigation-panel"
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-[#E3E1DB] bg-[#FFFFFF] px-3 font-sans text-[0.75rem] font-medium text-[#24282B] hover:border-[#24282B]/40 hover:text-[#1B3D5F] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B3D5F] cursor-pointer shrink-0"
        >
          {isOpen ? (
            <X className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
          ) : (
            <Menu className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
          )}
          <span>Menu</span>
        </button>
      </div>

      <nav
        id="mobile-primary-navigation-panel"
        aria-label="Mobile Primary Navigation"
        className={`${
          isOpen ? 'block' : 'hidden'
        } absolute left-0 right-0 top-full border-b border-[#E3E1DB] bg-[#FAF9F6] px-5 sm:px-8 py-5 shadow-[0_14px_34px_-12px_rgba(17,17,17,0.08)]`}
      >
        <div className="max-w-2xl mx-auto">
          <div className="pb-4 border-b border-[#E3E1DB]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                dispatchOpenSiteSearch();
              }}
              className="flex h-10 w-full items-center gap-2.5 rounded-[8px] border border-[#C5C1B8]/90 bg-[#FFFFFF] px-3.5 text-left font-sans text-[0.875rem] text-[#636A6F] transition-colors hover:border-[#24282B]/50 hover:text-[#24282B] focus-visible:outline-2 focus-visible:outline-[#1B3D5F] cursor-pointer"
            >
              <Search
                aria-hidden="true"
                strokeWidth={1.7}
                className="h-4 w-4 shrink-0 text-[#636A6F]"
              />
              <span>Search gifts, guides, and stories...</span>
            </button>
          </div>

          <ul className="divide-y divide-[#E3E1DB]/70 py-1">
            <li>
              <a
                href="/gift-guides/"
                aria-current={activeSection === 'guides' ? 'page' : undefined}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between py-3 font-sans text-[0.9375rem] transition-colors focus-visible:outline-2 focus-visible:outline-[#1B3D5F] ${
                  activeSection === 'guides'
                    ? 'font-semibold text-[#1B3D5F]'
                    : 'font-medium text-[#24282B] hover:text-[#1B3D5F]'
                }`}
              >
                <span>Gift Guides</span>
                {activeSection === 'guides' && (
                  <span className="font-sans text-[0.6875rem] uppercase tracking-[0.06em] text-[#636A6F]">
                    Current
                  </span>
                )}
              </a>
            </li>

            {editorialHubLinks.map((hubLink) => {
              const isCurrent = activeSection === hubLink.activeSection;
              return (
                <li key={hubLink.id}>
                  <a
                    href={hubLink.href}
                    aria-current={isCurrent ? 'page' : undefined}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between py-3 font-sans text-[0.9375rem] transition-colors focus-visible:outline-2 focus-visible:outline-[#1B3D5F] ${
                      isCurrent
                        ? 'font-semibold text-[#1B3D5F]'
                        : 'font-medium text-[#24282B] hover:text-[#1B3D5F]'
                    }`}
                  >
                    <span>{hubLink.label}</span>
                    {isCurrent && (
                      <span className="font-sans text-[0.6875rem] uppercase tracking-[0.06em] text-[#636A6F]">
                        Current
                      </span>
                    )}
                  </a>
                </li>
              );
            })}

            <li>
              <a
                href="/articles/"
                aria-current={activeSection === 'articles' ? 'page' : undefined}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between py-3 font-sans text-[0.9375rem] transition-colors focus-visible:outline-2 focus-visible:outline-[#1B3D5F] ${
                  activeSection === 'articles'
                    ? 'font-semibold text-[#1B3D5F]'
                    : 'font-medium text-[#24282B] hover:text-[#1B3D5F]'
                }`}
              >
                <span>Stories</span>
                {activeSection === 'articles' && (
                  <span className="font-sans text-[0.6875rem] uppercase tracking-[0.06em] text-[#636A6F]">
                    Current
                  </span>
                )}
              </a>
            </li>

            <li>
              <a
                href={SHOP_EXTERNAL_URL}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 py-3 font-sans text-[0.9375rem] font-medium text-[#24282B] transition-colors hover:text-[#1B3D5F] focus-visible:outline-2 focus-visible:outline-[#1B3D5F]"
              >
                <ShoppingBag
                  aria-hidden="true"
                  strokeWidth={1.65}
                  className="h-4 w-4 shrink-0 text-[#24282B] opacity-80 -translate-y-[0.5px]"
                />
                <span>Shop</span>
              </a>
            </li>

            <li>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  dispatchOpenSavedDrawer();
                }}
                className="flex w-full items-center justify-between py-3 text-left font-sans text-[0.9375rem] font-medium text-[#24282B] transition-colors hover:text-[#1B3D5F] focus-visible:outline-2 focus-visible:outline-[#1B3D5F] cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <Bookmark
                    aria-hidden="true"
                    strokeWidth={1.7}
                    className="h-4 w-4 shrink-0 text-[#24282B]"
                  />
                  <span>Saved Gifts</span>
                </span>
                <span className="font-mono text-xs text-[#636A6F] tabular-nums">
                  ({savedProductIds.length})
                </span>
              </button>
            </li>
          </ul>

          <div className="pt-4 mt-1 border-t border-[#E3E1DB]">
            <a
              href="/gift-finder/"
              aria-current={activeSection === 'finder' ? 'page' : undefined}
              onClick={() => setIsOpen(false)}
              className="theme-btn-primary theme-button-text flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#1B3D5F] px-5 py-3 text-[0.8125rem] font-semibold tracking-[0.01em] text-[#FFFFFF] transition-colors hover:bg-[#28537D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B3D5F]"
            >
              <Gift
                aria-hidden="true"
                strokeWidth={1.65}
                className="h-4 w-4 shrink-0"
              />
              <span>Find a Gift</span>
            </a>
          </div>
        </div>
      </nav>
    </div>
  );
};

export const FooterSavedLinkIsland: React.FC = () => {
  const { savedProductIds } = useSavedGiftsState();

  return (
    <button
      type="button"
      onClick={dispatchOpenSavedDrawer}
      className="theme-link text-sm text-[#24282B] hover:text-[#28537D] hover:underline text-left cursor-pointer"
    >
      Saved Gifts ({savedProductIds.length})
    </button>
  );
};

export const FooterSavedActionsIsland: React.FC = () => {
  const { savedProductIds } = useSavedGiftsState();

  return (
    <div className="flex flex-wrap items-center gap-3 pt-1">
      <button
        type="button"
        onClick={dispatchOpenSavedDrawer}
        className="px-4 py-2 rounded-lg bg-[#1B3D5F] text-xs text-[#FAF7F2] font-semibold hover:bg-[#28537D] transition-colors cursor-pointer"
      >
        Open Saved Gifts ({savedProductIds.length})
      </button>
      <button
        type="button"
        onClick={dispatchOpenArchModal}
        className="text-xs text-[#28537D] hover:text-[#1B3D5F] underline cursor-pointer"
      >
        Technical & SEO Spec
      </button>
    </div>
  );
};

export const GlobalOverlaysIsland: React.FC<{
  productsMap: Record<string, Product>;
}> = ({ productsMap }) => {
  const { savedProductIds, recipientNotes, toggleSaveProduct, updateRecipientNote } =
    useSavedGiftsState();
  const [inspectedProduct, setInspectedProduct] = useState<Product | null>(null);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);
  const [isSiteSearchOpen, setIsSiteSearchOpen] = useState(false);
  const [initialSearchQuery, setInitialSearchQuery] = useState('');

  useEffect(() => {
    const onOpenProduct = (event: Event) => {
      const custom = event as CustomEvent<Product | { product: Product }>;
      const detail = custom.detail;
      if (!detail) return;
      const prod = 'product' in detail ? detail.product : detail;
      if (prod && prod.id) {
        setInspectedProduct(prod);
      }
    };
    const onOpenSaved = () => setIsSavedDrawerOpen(true);
    const onOpenArch = () => setIsArchModalOpen(true);
    const onOpenSearch = (event: Event) => {
      const custom = event as CustomEvent<{ initialQuery?: string } | undefined>;
      setInitialSearchQuery(custom.detail?.initialQuery ?? '');
      setIsSiteSearchOpen(true);
    };
    const onGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsSiteSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener(OPEN_PRODUCT_MODAL_EVENT, onOpenProduct);
    window.addEventListener(OPEN_SAVED_DRAWER_EVENT, onOpenSaved);
    window.addEventListener(OPEN_ARCH_MODAL_EVENT, onOpenArch);
    window.addEventListener(OPEN_SITE_SEARCH_EVENT, onOpenSearch);
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => {
      window.removeEventListener(OPEN_PRODUCT_MODAL_EVENT, onOpenProduct);
      window.removeEventListener(OPEN_SAVED_DRAWER_EVENT, onOpenSaved);
      window.removeEventListener(OPEN_ARCH_MODAL_EVENT, onOpenArch);
      window.removeEventListener(OPEN_SITE_SEARCH_EVENT, onOpenSearch);
      window.removeEventListener('keydown', onGlobalKeyDown);
    };
  }, []);

  return (
    <>
      <SiteSearchModal
        isOpen={isSiteSearchOpen}
        initialQuery={initialSearchQuery}
        onClose={() => setIsSiteSearchOpen(false)}
      />

      <ProductDetailModal
        product={inspectedProduct}
        isSaved={
          inspectedProduct ? savedProductIds.includes(inspectedProduct.id) : false
        }
        onToggleSave={toggleSaveProduct}
        onClose={() => setInspectedProduct(null)}
      />

      <SavedGiftsDrawer
        isOpen={isSavedDrawerOpen}
        savedProductIds={savedProductIds}
        recipientNotes={recipientNotes}
        onUpdateRecipientNote={updateRecipientNote}
        onToggleSave={toggleSaveProduct}
        onSelectProduct={setInspectedProduct}
        onClose={() => setIsSavedDrawerOpen(false)}
        productsMap={productsMap}
      />

      <ArchitectureAndSeoModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />
    </>
  );
};


export const HomeHeroSpotlightIsland: React.FC<{
  product: Product;
}> = ({ product }) => {
  const { savedProductIds, toggleSaveProduct } = useSavedGiftsState();
  const isSaved = savedProductIds.includes(product.id);

  return (
    <div className="p-6 md:p-7 rounded-3xl bg-[#E8F8F0] flex flex-col justify-between flex-1">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#222426] mb-4">
        <span className="uppercase tracking-wider text-[#28537D]">Editor’s Gift of the Week</span>
        <span className="tabular-nums font-bold">
          ${product.price} {product.currency}
        </span>
      </div>

      <div
        onClick={() => dispatchOpenProductModal(product)}
        className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center cursor-pointer group my-auto"
      >
        <div className="sm:col-span-5 aspect-square rounded-2xl overflow-hidden bg-white">
          <PhotoImage
            image={product.images[0]}
            src={product.images[0]?.url}
            alt={product.images[0]?.alt}
            preset="spotlight-square"
            aspectRatio="1:1"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="sm:col-span-7 space-y-2">
          <div className="text-xs text-[#62666A] font-medium">{product.vendor}</div>
          <h2 className="text-xl font-serif font-semibold text-[#222426] leading-snug group-hover:text-[#28537D] group-hover:underline">
            <a
              href={`/products/${product.slug}/`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dispatchOpenProductModal(product);
              }}
            >
              {product.title}
            </a>
          </h2>
          <p className="text-xs text-[#292B2D] leading-relaxed line-clamp-3">
            {product.whyToGiveIt}
          </p>
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-[#DFDBD3] flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => toggleSaveProduct(product.id)}
          aria-pressed={isSaved}
          className="inline-flex items-center gap-1.5 font-semibold text-[#222426] hover:text-[#28537D]"
        >
          <Heart
            className={`w-3.5 h-3.5 ${
              isSaved ? 'fill-[#F2846B] text-[#F2846B]' : ''
            }`}
          />
          <span>{isSaved ? 'Saved to Your List' : 'Save for Later'}</span>
        </button>
        <a
          href={`/products/${product.slug}/`}
          onClick={(e) => {
            e.preventDefault();
            dispatchOpenProductModal(product);
          }}
          className="font-semibold text-[#28537D] hover:underline"
        >
          Why we love it →
        </a>
      </div>
    </div>
  );
};

export const HomeDiscoveryAndFinderIsland: React.FC<{
  products: Product[];
  recipientSpotlights: RecipientSpotlight[];
}> = ({ products, recipientSpotlights }) => {
  const { savedProductIds, toggleSaveProduct } = useSavedGiftsState();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientType | 'all'>('all');
  const [selectedBudget, setSelectedBudget] = useState<HomeBudgetFilter>('all');
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityTrait | 'all'>('all');
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionType | 'all'>('all');

  const resetFinderFilters = () => {
    setSearchQuery('');
    setSelectedRecipient('all');
    setSelectedBudget('all');
    setSelectedPersonality('all');
    setSelectedOccasion('all');
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      if (selectedRecipient !== 'all' && !product.recipients.includes(selectedRecipient)) {
        return false;
      }
      if (selectedBudget !== 'all' && product.budgetTier !== selectedBudget) {
        return false;
      }
      if (
        selectedPersonality !== 'all' &&
        !product.personalityTraits.includes(selectedPersonality)
      ) {
        return false;
      }
      if (selectedOccasion !== 'all' && !product.occasions.includes(selectedOccasion)) {
        return false;
      }
      if (q) {
        const haystack = [
          product.title,
          product.subtitle,
          product.vendor,
          product.productType,
          product.whyToGiveIt,
          product.bestForSummary,
          ...product.interests,
          ...product.recipients,
          ...product.occasions,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
  }, [
    products,
    searchQuery,
    selectedRecipient,
    selectedBudget,
    selectedPersonality,
    selectedOccasion,
  ]);

  const underFiftyProducts = useMemo(
    () => products.filter((p) => p.price < 50).slice(0, 4),
    [products]
  );

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedRecipient !== 'all' ||
    selectedBudget !== 'all' ||
    selectedPersonality !== 'all' ||
    selectedOccasion !== 'all';

  const scrollToFinder = () => {
    document.getElementById('gift-finder')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* SECTION 2: "WHO ARE YOU SHOPPING FOR?" PORTRAIT SPOTLIGHTS */}
      <section className="py-14 bg-[#F3ECE1]/65">
        <div className="max-w-7xl mx-auto px-6 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-[#28537D] mb-1.5">
                Browse by Person & Mood
              </div>
              <h2 className="text-2xl md:text-4xl font-serif font-semibold text-[#222426]">
                Who Are You Shopping For Today?
              </h2>
            </div>
            <p className="text-sm text-[#292B2D] max-w-md">
              Pick a personality below to jump straight to gifts tailored to how they actually live.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recipientSpotlights.map((spot) => (
              <button
                key={spot.id}
                type="button"
                onClick={() => {
                  resetFinderFilters();
                  if (spot.recipientFilter) {
                    setSelectedRecipient(spot.recipientFilter);
                  }
                  if (spot.personalityFilter) {
                    setSelectedPersonality(spot.personalityFilter);
                  }
                  if (spot.budgetFilter) {
                    setSelectedBudget(spot.budgetFilter);
                  }
                  scrollToFinder();
                }}
                style={{ backgroundColor: spot.accentBg }}
                className="group text-left rounded-3xl p-4 transition-transform duration-200 hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-4/3 w-full rounded-2xl overflow-hidden mb-4 bg-white">
                    <PhotoImage
                      src={spot.imageUrl}
                      alt={spot.imageAlt}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <h3 className="text-lg font-serif font-semibold text-[#222426] leading-snug mb-1.5 px-1">
                    {spot.title}
                  </h3>
                  <p className="text-xs text-[#292B2D] leading-relaxed px-1 mb-3">
                    {spot.subtitle}
                  </p>
                </div>

                <div className="px-1 pt-2 flex items-center gap-1 text-xs font-semibold text-[#28537D] group-hover:underline">
                  <span>See curated ideas</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: PLAYFUL INTERACTIVE GIFT FINDER & CATALOG */}
      <section id="gift-finder" className="py-16 md:py-20 scroll-mt-14">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="rounded-3xl bg-gradient-to-br from-[#EBF3FE] via-[#F2F8FD] to-[#E8F8F0] p-7 md:p-10 space-y-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                  <Sparkles className="w-4 h-4" />
                  <span>Interactive Gift Finder</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-serif font-semibold text-[#222426]">
                  Let’s Find Something They’ll Genuinely Love
                </h2>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFinderFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-xs font-semibold text-[#28537D] hover:bg-[#1B3D5F] hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start Over ({products.length} Gifts)</span>
                </button>
              )}

              <a
                href="/gift-finder/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1B3D5F] text-white text-xs font-semibold hover:bg-[#28537D] transition-colors whitespace-nowrap shrink-0"
              >
                <span>Open Full Gift Finder & Quiz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
              <div className="md:col-span-3 space-y-1.5">
                <label
                  htmlFor="finder-recipient"
                  className="block text-xs font-semibold text-[#222426]"
                >
                  1. Who is it for?
                </label>
                <select
                  id="finder-recipient"
                  value={selectedRecipient}
                  onChange={(e) =>
                    setSelectedRecipient(e.target.value as RecipientType | 'all')
                  }
                  className="w-full px-4 py-3 text-sm rounded-2xl bg-white text-[#292B2D] font-medium shadow-2xs focus:outline-2 focus:outline-[#28537D]"
                >
                  {RECIPIENT_PILLS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label
                  htmlFor="finder-vibe"
                  className="block text-xs font-semibold text-[#222426]"
                >
                  2. What do they enjoy?
                </label>
                <select
                  id="finder-vibe"
                  value={selectedPersonality}
                  onChange={(e) =>
                    setSelectedPersonality(e.target.value as PersonalityTrait | 'all')
                  }
                  className="w-full px-4 py-3 text-sm rounded-2xl bg-white text-[#292B2D] font-medium shadow-2xs focus:outline-2 focus:outline-[#28537D]"
                >
                  {VIBE_OPTIONS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label
                  htmlFor="finder-budget"
                  className="block text-xs font-semibold text-[#222426]"
                >
                  3. Budget
                </label>
                <select
                  id="finder-budget"
                  value={selectedBudget}
                  onChange={(e) =>
                    setSelectedBudget(e.target.value as HomeBudgetFilter)
                  }
                  className="w-full px-4 py-3 text-sm rounded-2xl bg-white text-[#292B2D] font-medium shadow-2xs focus:outline-2 focus:outline-[#28537D]"
                >
                  {BUDGET_PILLS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label
                  htmlFor="finder-search"
                  className="block text-xs font-semibold text-[#222426]"
                >
                  Or search by keyword
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#62666A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="finder-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Matcha, honey, robe, kids..."
                    className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl bg-white text-[#292B2D] placeholder:text-[#62666A]/70 shadow-2xs focus:outline-2 focus:outline-[#28537D]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[#62666A] mr-1">
                  Occasion:
                </span>
                {OCCASION_PILLS.map((occ) => (
                  <button
                    key={occ.value}
                    type="button"
                    onClick={() => setSelectedOccasion(occ.value)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      selectedOccasion === occ.value
                        ? 'bg-[#1B3D5F] text-white'
                        : 'bg-white/80 text-[#292B2D] hover:bg-white hover:text-[#28537D]'
                    }`}
                  >
                    {occ.label}
                  </button>
                ))}
              </div>

              <div className="text-xs font-semibold text-[#62666A] tabular-nums">
                Showing {filteredProducts.length} thoughtful{' '}
                {filteredProducts.length === 1 ? 'gift' : 'gifts'}
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-12 rounded-3xl bg-[#F3ECE1]/70 text-center space-y-3">
              <Gift className="w-8 h-8 text-[#28537D] mx-auto opacity-75" />
              <p className="text-xl font-serif text-[#222426]">
                We didn’t find an exact match for all of those filters together.
              </p>
              <p className="text-xs text-[#292B2D]">
                Try clearing one filter to see our full collection of editor-tested gifts.
              </p>
              <button
                type="button"
                onClick={resetFinderFilters}
                className="px-5 py-2.5 rounded-full bg-[#1B3D5F] text-[#FAF7F2] text-xs font-semibold"
              >
                Show All Gifts
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSaved={savedProductIds.includes(product.id)}
                  onToggleSave={toggleSaveProduct}
                  onSelectProduct={dispatchOpenProductModal}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4: SWEET SPOT — EXTRAORDINARY GIFTS UNDER $50 */}
      <section id="under-50-edit" className="py-16 bg-[#FFF8E7] scroll-mt-14">
        <div className="max-w-7xl mx-auto px-6 space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                The Sweet Spot Edit
              </div>
              <h2 className="text-2xl md:text-4xl font-serif font-semibold text-[#222426] text-balance">
                Small Wonders Under $50 That Feel Twice the Price
              </h2>
            </div>
            <p className="text-sm text-[#292B2D] max-w-md">
              Because a memorable gift is about thoughtfulness and charm—never about showing off a receipt.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
            {underFiftyProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                variant="surface"
                isSaved={savedProductIds.includes(prod.id)}
                onToggleSave={toggleSaveProduct}
                onSelectProduct={dispatchOpenProductModal}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export const GiftGuideInteractiveIsland: React.FC<{
  guide: GiftGuide;
  catalog: CatalogDataOverride;
}> = ({ guide, catalog }) => {
  const { savedProductIds, toggleSaveProduct } = useSavedGiftsState();

  return (
    <GiftGuideReaderView
      guide={guide}
      savedProductIds={savedProductIds}
      onToggleSave={toggleSaveProduct}
      onSelectProduct={dispatchOpenProductModal}
      catalog={catalog}
    />
  );
};

export const ArticleInteractiveIsland: React.FC<{
  article: Article;
  catalog: CatalogDataOverride;
}> = ({ article, catalog }) => {
  const { savedProductIds, toggleSaveProduct } = useSavedGiftsState();

  return (
    <ArticleReaderView
      article={article}
      savedProductIds={savedProductIds}
      onToggleSave={toggleSaveProduct}
      onSelectProduct={dispatchOpenProductModal}
      catalog={catalog}
    />
  );
};

export const ProductDetailActionsIsland: React.FC<{
  product: Product;
}> = ({ product }) => {
  const { savedProductIds, toggleSaveProduct } = useSavedGiftsState();
  const isSaved = savedProductIds.includes(product.id);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => toggleSaveProduct(product.id)}
        aria-pressed={isSaved}
        className={`px-4 py-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          isSaved
            ? 'border-[#1B3D5F] bg-[#1B3D5F] text-white'
            : 'border-[#E3E1DB] bg-[#FFFFFF] text-[#24282B] hover:border-[#28537D] hover:text-[#28537D]'
        }`}
      >
        <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
        <span>{isSaved ? 'Saved in Gift List' : 'Save to Gift List'}</span>
      </button>

      {product.isPlaceholderLink ? (
        <a
          href={product.purchaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Sample merchant preview link for ${product.title} (development placeholder)`}
          className="px-4 py-2.5 rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] text-[#24282B] text-xs font-semibold inline-flex items-center gap-2 hover:border-[#28537D] hover:text-[#28537D] transition-colors whitespace-nowrap shrink-0"
        >
          <span>Merchant Preview Link (Sample)</span>
          <ExternalLink className="w-3.5 h-3.5 text-[#636A6F]" />
        </a>
      ) : (
        <a
          href={product.purchaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 rounded-lg bg-[#1B3D5F] text-[#FFFFFF] text-xs font-semibold inline-flex items-center gap-2 hover:bg-[#28537D] transition-colors whitespace-nowrap shrink-0"
        >
          <span>View at {product.vendor.replace(/^Sample Maker:\s*/i, '')}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
};

export { GiftFinderExperience as GiftFinderInteractiveIsland } from '../GiftFinderExperience';

export const EditorialHubInteractiveIsland: React.FC<{
  enrichedHub: EnrichedEditorialHub;
}> = ({ enrichedHub }) => {
  const { savedProductIds, toggleSaveProduct } = useSavedGiftsState();

  return (
    <EditorialDiscoveryHubView
      enrichedHub={enrichedHub}
      savedProductIds={savedProductIds}
      onToggleSave={toggleSaveProduct}
      onSelectProduct={dispatchOpenProductModal}
    />
  );
};
