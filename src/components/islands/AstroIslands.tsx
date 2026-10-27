import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Heart,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Gift,
  ExternalLink,
} from 'lucide-react';
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
  dispatchOpenArchModal,
  dispatchOpenProductModal,
  dispatchOpenSavedDrawer,
  useSavedGiftsState,
} from '../../utils/savedGiftsStore';
import { PhotoImage } from '../ObjectIllustrations';
import { ProductCard } from '../ProductCard';
import { GiftGuideReaderView } from '../GiftGuideReaderView';
import { ArticleReaderView } from '../ArticleReaderView';
import {
  ProductDetailModal,
  SavedGiftsDrawer,
} from '../ProductDetailAndSavedModal';
import { ArchitectureAndSeoModal } from '../ArchitectureAndSeoModal';

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

export const HeaderSavedButtonIsland: React.FC<{
  variant?: 'desktop' | 'mobile';
}> = ({ variant = 'desktop' }) => {
  const { savedProductIds } = useSavedGiftsState();

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={dispatchOpenSavedDrawer}
        className="whitespace-nowrap shrink-0 hover:underline"
      >
        Saved ({savedProductIds.length})
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={dispatchOpenSavedDrawer}
      className="hover:text-[#1B3D5F] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
    >
      Saved List ({savedProductIds.length})
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
        className="px-4 py-2.5 rounded-full bg-[#1B3D5F] text-[#FAF7F2] font-semibold hover:bg-[#28537D] transition-colors"
      >
        Open Saved List ({savedProductIds.length})
      </button>
      <button
        type="button"
        onClick={dispatchOpenArchModal}
        className="text-[#28537D] hover:text-[#1B3D5F] underline"
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

    window.addEventListener(OPEN_PRODUCT_MODAL_EVENT, onOpenProduct);
    window.addEventListener(OPEN_SAVED_DRAWER_EVENT, onOpenSaved);
    window.addEventListener(OPEN_ARCH_MODAL_EVENT, onOpenArch);
    return () => {
      window.removeEventListener(OPEN_PRODUCT_MODAL_EVENT, onOpenProduct);
      window.removeEventListener(OPEN_SAVED_DRAWER_EVENT, onOpenSaved);
      window.removeEventListener(OPEN_ARCH_MODAL_EVENT, onOpenArch);
    };
  }, []);

  return (
    <>
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
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#1B3D5F] mb-4">
        <span className="uppercase tracking-wider">Editor’s Gift of the Week</span>
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
            src={product.images[0].url}
            alt={product.images[0].alt}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="sm:col-span-7 space-y-2">
          <div className="text-xs text-[#28537D] font-medium">{product.vendor}</div>
          <h2 className="text-xl font-serif font-semibold text-[#1B3D5F] leading-snug group-hover:underline">
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
          <p className="text-xs text-[#1B3D5F]/80 leading-relaxed line-clamp-3">
            {product.whyToGiveIt}
          </p>
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-[#1B3D5F]/10 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => toggleSaveProduct(product.id)}
          aria-pressed={isSaved}
          className="inline-flex items-center gap-1.5 font-semibold text-[#1B3D5F] hover:text-[#28537D]"
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
          className="font-semibold text-[#1B3D5F] hover:underline"
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
              <h2 className="text-2xl md:text-4xl font-serif font-semibold text-[#1B3D5F]">
                Who Are You Shopping For Today?
              </h2>
            </div>
            <p className="text-sm text-[#28537D] max-w-md">
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
                  <h3 className="text-lg font-serif font-semibold text-[#1B3D5F] leading-snug mb-1.5 px-1">
                    {spot.title}
                  </h3>
                  <p className="text-xs text-[#28537D] leading-relaxed px-1 mb-3">
                    {spot.subtitle}
                  </p>
                </div>

                <div className="px-1 pt-2 flex items-center gap-1 text-xs font-semibold text-[#1B3D5F] group-hover:text-[#28537D]">
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
                <h2 className="text-2xl md:text-4xl font-serif font-semibold text-[#1B3D5F]">
                  Let’s Find Something They’ll Genuinely Love
                </h2>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFinderFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-xs font-semibold text-[#1B3D5F] hover:bg-[#1B3D5F] hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start Over ({products.length} Gifts)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
              <div className="md:col-span-3 space-y-1.5">
                <label
                  htmlFor="finder-recipient"
                  className="block text-xs font-semibold text-[#28537D]"
                >
                  1. Who is it for?
                </label>
                <select
                  id="finder-recipient"
                  value={selectedRecipient}
                  onChange={(e) =>
                    setSelectedRecipient(e.target.value as RecipientType | 'all')
                  }
                  className="w-full px-4 py-3 text-sm rounded-2xl bg-white text-[#1B3D5F] font-medium shadow-2xs focus:outline-2 focus:outline-[#28537D]"
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
                  className="block text-xs font-semibold text-[#28537D]"
                >
                  2. What do they enjoy?
                </label>
                <select
                  id="finder-vibe"
                  value={selectedPersonality}
                  onChange={(e) =>
                    setSelectedPersonality(e.target.value as PersonalityTrait | 'all')
                  }
                  className="w-full px-4 py-3 text-sm rounded-2xl bg-white text-[#1B3D5F] font-medium shadow-2xs focus:outline-2 focus:outline-[#28537D]"
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
                  className="block text-xs font-semibold text-[#28537D]"
                >
                  3. Budget
                </label>
                <select
                  id="finder-budget"
                  value={selectedBudget}
                  onChange={(e) =>
                    setSelectedBudget(e.target.value as HomeBudgetFilter)
                  }
                  className="w-full px-4 py-3 text-sm rounded-2xl bg-white text-[#1B3D5F] font-medium shadow-2xs focus:outline-2 focus:outline-[#28537D]"
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
                  className="block text-xs font-semibold text-[#28537D]"
                >
                  Or search by keyword
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#28537D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="finder-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Matcha, honey, robe, kids..."
                    className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl bg-white text-[#1B3D5F] placeholder:text-[#28537D]/55 shadow-2xs focus:outline-2 focus:outline-[#28537D]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[#28537D] mr-1">
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
                        : 'bg-white/80 text-[#28537D] hover:bg-white'
                    }`}
                  >
                    {occ.label}
                  </button>
                ))}
              </div>

              <div className="text-xs font-semibold text-[#1B3D5F] tabular-nums">
                Showing {filteredProducts.length} thoughtful{' '}
                {filteredProducts.length === 1 ? 'gift' : 'gifts'}
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-12 rounded-3xl bg-[#F3ECE1]/70 text-center space-y-3">
              <Gift className="w-8 h-8 text-[#28537D] mx-auto opacity-75" />
              <p className="text-xl font-serif text-[#1B3D5F]">
                We didn’t find an exact match for all of those filters together.
              </p>
              <p className="text-xs text-[#28537D]">
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
              <h2 className="text-2xl md:text-4xl font-serif font-semibold text-[#1B3D5F] text-balance">
                Small Wonders Under $50 That Feel Twice the Price
              </h2>
            </div>
            <p className="text-sm text-[#28537D] max-w-md">
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
        className={`px-5 py-3 rounded-full text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          isSaved
            ? 'bg-[#F2846B] text-white'
            : 'bg-white text-[#1B3D5F] hover:bg-[#1B3D5F]/8'
        }`}
      >
        <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        <span>{isSaved ? 'Saved in Your Gift List' : 'Save to Gift List'}</span>
      </button>

      <a
        href={product.purchaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-6 py-3 rounded-full bg-[#1B3D5F] text-[#FAF7F2] text-xs font-semibold inline-flex items-center gap-2 hover:bg-[#28537D] transition-colors whitespace-nowrap shrink-0"
      >
        <span>
          {product.isPlaceholderLink
            ? 'Placeholder Purchase Link'
            : `Shop at ${product.vendor}`}
        </span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
};
