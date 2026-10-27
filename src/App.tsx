/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Heart,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Gift,
  BookOpen,
} from 'lucide-react';
import {
  ARTICLES,
  AUTHORS,
  GIFT_GUIDES,
  PRODUCTS,
  RECIPIENT_SPOTLIGHTS,
} from './data/catalog';
import {
  OccasionType,
  PersonalityTrait,
  Product,
  RecipientType,
} from './types/content';
import {
  buildArticleJsonLd,
  buildGiftGuideJsonLd,
  buildWebsiteJsonLd,
  syncHeadSeoMetadata,
} from './utils/seoAndValidation';
import { PhotoImage } from './components/ObjectIllustrations';
import { ProductCard } from './components/ProductCard';
import { ArticleReaderView } from './components/ArticleReaderView';
import { GiftGuideReaderView } from './components/GiftGuideReaderView';
import {
  ProductDetailModal,
  SavedGiftsDrawer,
} from './components/ProductDetailAndSavedModal';
import { ArchitectureAndSeoModal } from './components/ArchitectureAndSeoModal';

type ActiveRoute =
  | { view: 'home' }
  | { view: 'article'; slug: string }
  | { view: 'guide'; slug: string };

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

export default function App() {
  const [route, setRoute] = useState<ActiveRoute>({ view: 'home' });

  // Saved Gifts persisted in localStorage without requiring an account (deduplicated)
  const [savedProductIds, setSavedProductIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('sog_saved_gifts_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return Array.from(new Set(parsed.filter((id) => typeof id === 'string')));
        }
      }
      return ['prod_fluted_bedside_carafe_09', 'prod_chili_honey_flight_01'];
    } catch {
      return ['prod_fluted_bedside_carafe_09', 'prod_chili_honey_flight_01'];
    }
  });

  const [recipientNotes, setRecipientNotes] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('sog_recipient_notes_v2');
      return raw
        ? JSON.parse(raw)
        : {
            prod_fluted_bedside_carafe_09: 'For Elena — Guest bedroom housewarming',
            prod_chili_honey_flight_01: 'For Claire & Dan — Saturday dinner party',
          };
    } catch {
      return {};
    }
  });

  // Interactive Gift Finder & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientType | 'all'>('all');
  const [selectedBudget, setSelectedBudget] = useState<HomeBudgetFilter>('all');
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityTrait | 'all'>('all');
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionType | 'all'>('all');

  // Modals & Drawers
  const [inspectedProduct, setInspectedProduct] = useState<Product | null>(null);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('sog_saved_gifts_v2', JSON.stringify(savedProductIds));
    } catch {
      // Ignore storage errors
    }
  }, [savedProductIds]);

  useEffect(() => {
    try {
      localStorage.setItem('sog_recipient_notes_v2', JSON.stringify(recipientNotes));
    } catch {
      // Ignore storage errors
    }
  }, [recipientNotes]);

  const toggleSaveProduct = (productId: string) => {
    setSavedProductIds((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        return prev.filter((id) => id !== productId);
      }
      return Array.from(new Set([...prev, productId]));
    });
  };

  const updateRecipientNote = (productId: string, note: string) => {
    setRecipientNotes((prev) => ({ ...prev, [productId]: note }));
  };

  const resetFinderFilters = () => {
    setSearchQuery('');
    setSelectedRecipient('all');
    setSelectedBudget('all');
    setSelectedPersonality('all');
    setSelectedOccasion('all');
  };

  const allProducts = useMemo(() => Object.values(PRODUCTS), []);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allProducts.filter((product) => {
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
    allProducts,
    searchQuery,
    selectedRecipient,
    selectedBudget,
    selectedPersonality,
    selectedOccasion,
  ]);

  const underFiftyProducts = useMemo(
    () => allProducts.filter((p) => p.price < 50).slice(0, 4),
    [allProducts]
  );

  // Dynamic Schema.org JSON-LD per route
  const activeJsonLd = useMemo(() => {
    if (route.view === 'article') {
      const art = ARTICLES.find((a) => a.slug === route.slug) ?? ARTICLES[0];
      return buildArticleJsonLd(art);
    }
    if (route.view === 'guide') {
      const guide = GIFT_GUIDES.find((g) => g.slug === route.slug) ?? GIFT_GUIDES[0];
      return buildGiftGuideJsonLd(guide);
    }
    return buildWebsiteJsonLd();
  }, [route]);

  // Synchronize <title>, <meta name="description">, <link rel="canonical">, and OpenGraph tags
  useEffect(() => {
    if (route.view === 'article') {
      const art = ARTICLES.find((a) => a.slug === route.slug) ?? ARTICLES[0];
      syncHeadSeoMetadata({
        title: art.seo.seoTitle,
        description: art.seo.metaDescription,
        canonicalPath: art.seo.canonicalPath,
        ogType: art.seo.ogType,
      });
    } else if (route.view === 'guide') {
      const guide = GIFT_GUIDES.find((g) => g.slug === route.slug) ?? GIFT_GUIDES[0];
      syncHeadSeoMetadata({
        title: guide.seo.seoTitle,
        description: guide.seo.metaDescription,
        canonicalPath: guide.seo.canonicalPath,
        ogType: guide.seo.ogType,
      });
    } else {
      syncHeadSeoMetadata({
        title: 'Science of Gifts — Editorial Gift Guides & Memorable Finds',
        description:
          'Discover thoughtful gifts backed by behavioral psychology, tactile craftsmanship, and rigorous hands-on testing from Science of Gifts.',
        canonicalPath: '/',
        ogType: 'website',
      });
    }
  }, [route]);

  const scrollToSection = (elementId: string) => {
    if (route.view !== 'home') {
      setRoute({ view: 'home' });
      setTimeout(() => {
        document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const featuredGuide = GIFT_GUIDES[0];
  const featuredArticle = ARTICLES[0];
  const etiquetteArticle = ARTICLES[1];
  const heroSpotlightProduct = PRODUCTS['prod_kyoto_matcha_bowl_03'];

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedRecipient !== 'all' ||
    selectedBudget !== 'all' ||
    selectedPersonality !== 'all' ||
    selectedOccasion !== 'all';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#1B3D5F]">
      {/* Dynamic Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(activeJsonLd) }}
      />

      {/* =====================================================================
          TOP NAVIGATION BAR (Clean 3-Zone Contract)
         ===================================================================== */}
      <header className="sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#1B3D5F]/8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setRoute({ view: 'home' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-2xl font-serif font-semibold tracking-tight text-[#1B3D5F] whitespace-nowrap shrink-0"
          >
            Science of Gifts
          </a>

          {/* Zone 2: 5 Single-Line Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#28537D]"
          >
            <button
              type="button"
              onClick={() =>
                setRoute({ view: 'guide', slug: featuredGuide.slug })
              }
              className={`hover:text-[#1B3D5F] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                route.view === 'guide' ? 'text-[#1B3D5F] font-semibold underline' : ''
              }`}
            >
              Gift Guides
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('gift-finder')}
              className="hover:text-[#1B3D5F] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Gift Finder
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('under-50-edit')}
              className="hover:text-[#1B3D5F] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Under $50
            </button>
            <button
              type="button"
              onClick={() =>
                setRoute({ view: 'article', slug: featuredArticle.slug })
              }
              className={`hover:text-[#1B3D5F] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                route.view === 'article' ? 'text-[#1B3D5F] font-semibold underline' : ''
              }`}
            >
              Stories
            </button>
            <button
              type="button"
              onClick={() => setIsSavedDrawerOpen(true)}
              className="hover:text-[#1B3D5F] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Saved List ({savedProductIds.length})
            </button>
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => scrollToSection('gift-finder')}
              className="px-4 py-2.5 text-xs font-semibold text-[#FAF7F2] bg-[#1B3D5F] rounded-full hover:bg-[#28537D] transition-colors whitespace-nowrap shrink-0"
            >
              Find a Gift
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Secondary Navigation Strip (Non-sticky so it never obscures mobile viewport) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden bg-[#F3ECE1] border-b border-[#1B3D5F]/10 px-6 py-2.5 flex items-center gap-5 overflow-x-auto text-xs font-semibold text-[#1B3D5F]"
      >
        <button
          type="button"
          onClick={() => setRoute({ view: 'home' })}
          className="whitespace-nowrap shrink-0 hover:underline"
        >
          Home
        </button>
        <button
          type="button"
          onClick={() => setRoute({ view: 'guide', slug: featuredGuide.slug })}
          className="whitespace-nowrap shrink-0 hover:underline"
        >
          Little Things Guide
        </button>
        <button
          type="button"
          onClick={() => scrollToSection('gift-finder')}
          className="whitespace-nowrap shrink-0 hover:underline"
        >
          Gift Finder
        </button>
        <button
          type="button"
          onClick={() => setRoute({ view: 'article', slug: featuredArticle.slug })}
          className="whitespace-nowrap shrink-0 hover:underline"
        >
          Stories
        </button>
        <button
          type="button"
          onClick={() => setIsSavedDrawerOpen(true)}
          className="whitespace-nowrap shrink-0 hover:underline"
        >
          Saved ({savedProductIds.length})
        </button>
      </nav>

      {/* =====================================================================
          MAIN ROUTER: Homepage Magazine Storefront | Article | Gift Guide
         ===================================================================== */}
      <main className="flex-1">
        {route.view === 'article' && (
          <ArticleReaderView
            article={ARTICLES.find((a) => a.slug === route.slug) ?? ARTICLES[0]}
            savedProductIds={savedProductIds}
            onToggleSave={toggleSaveProduct}
            onSelectProduct={setInspectedProduct}
            onBackHome={() => setRoute({ view: 'home' })}
          />
        )}

        {route.view === 'guide' && (
          <GiftGuideReaderView
            guide={GIFT_GUIDES.find((g) => g.slug === route.slug) ?? GIFT_GUIDES[0]}
            savedProductIds={savedProductIds}
            onToggleSave={toggleSaveProduct}
            onSelectProduct={setInspectedProduct}
            onSelectGuide={(slug) => setRoute({ view: 'guide', slug })}
            onSelectArticle={(slug) => setRoute({ view: 'article', slug })}
            onBackHome={() => setRoute({ view: 'home' })}
          />
        )}

        {route.view === 'home' && (
          <div>
            {/* ===============================================================
                SECTION 1: WARM MAGAZINE & STOREFRONT HERO SPREAD
                Expressive photography, emotional storytelling, shoppable spotlights
               =============================================================== */}
            <section className="pt-6 pb-14 md:pt-10 md:pb-20">
              <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
                  {/* Left: Dominant Editorial Cover Feature (7 columns) */}
                  <div className="lg:col-span-7 flex flex-col justify-between">
                    <div
                      onClick={() =>
                        setRoute({ view: 'guide', slug: featuredGuide.slug })
                      }
                      className="relative aspect-16/10 w-full rounded-3xl overflow-hidden bg-[#F3ECE1] cursor-pointer group mb-6"
                    >
                      <PhotoImage
                        src={featuredGuide.heroImageUrl}
                        alt={featuredGuide.heroImageAlt}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1B3D5F]/75 via-[#1B3D5F]/20 to-transparent" />
                      <div className="absolute bottom-6 left-6 right-6 text-white">
                        <div className="text-xs uppercase tracking-widest font-semibold text-[#C3F3DF] mb-2">
                          Featured Gift Guide · {featuredGuide.category}
                        </div>
                        <p className="text-sm md:text-base font-medium text-white/95 max-w-xl">
                          Curated by editors, informed by human psychology, and organized across under-$25, $25–$75, and $75+ budgets.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 px-1">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                        <span>Cover Guide</span>
                        <span aria-hidden="true">·</span>
                        <span>By {AUTHORS[featuredGuide.authorId].name}</span>
                        <span aria-hidden="true">·</span>
                        <span>{featuredGuide.readTimeMinutes} min read</span>
                      </div>

                      <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-serif font-semibold text-[#1B3D5F] leading-[1.12] text-balance">
                        <button
                          type="button"
                          onClick={() =>
                            setRoute({ view: 'guide', slug: featuredGuide.slug })
                          }
                          className="text-left hover:text-[#28537D] transition-colors"
                        >
                          {featuredGuide.title}
                        </button>
                      </h1>

                      <p className="text-base md:text-lg text-[#28537D] leading-relaxed max-w-2xl">
                        {featuredGuide.subtitle}
                      </p>

                      <div className="pt-2 flex flex-wrap items-center gap-3.5">
                        <button
                          type="button"
                          onClick={() =>
                            setRoute({ view: 'guide', slug: featuredGuide.slug })
                          }
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1B3D5F] text-[#FAF7F2] text-xs font-semibold hover:bg-[#28537D] transition-colors whitespace-nowrap shrink-0"
                        >
                          <span>Read the Complete Gift Guide</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollToSection('gift-finder')}
                          className="px-6 py-3 rounded-full bg-[#EBF3FE] text-[#1B3D5F] text-xs font-semibold hover:bg-[#99BFF9]/40 transition-colors whitespace-nowrap shrink-0"
                        >
                          Try the Interactive Gift Finder
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Asymmetric Two-Card Magazine Stack (5 columns) */}
                  <div className="lg:col-span-5 flex flex-col justify-between gap-6">
                    {/* Top Card: Gift of the Week Spotlight on Warm Mint Surface */}
                    {heroSpotlightProduct && (
                      <div className="p-6 md:p-7 rounded-3xl bg-[#E8F8F0] flex flex-col justify-between flex-1">
                        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#1B3D5F] mb-4">
                          <span className="uppercase tracking-wider">
                            Editor’s Gift of the Week
                          </span>
                          <span className="tabular-nums font-bold">
                            ${heroSpotlightProduct.price} {heroSpotlightProduct.currency}
                          </span>
                        </div>

                        <div
                          onClick={() => setInspectedProduct(heroSpotlightProduct)}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center cursor-pointer group my-auto"
                        >
                          <div className="sm:col-span-5 aspect-square rounded-2xl overflow-hidden bg-white">
                            <PhotoImage
                              src={heroSpotlightProduct.images[0].url}
                              alt={heroSpotlightProduct.images[0].alt}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <div className="sm:col-span-7 space-y-2">
                            <div className="text-xs text-[#28537D] font-medium">
                              {heroSpotlightProduct.vendor}
                            </div>
                            <h2 className="text-xl font-serif font-semibold text-[#1B3D5F] leading-snug group-hover:underline">
                              {heroSpotlightProduct.title}
                            </h2>
                            <p className="text-xs text-[#1B3D5F]/80 leading-relaxed line-clamp-3">
                              {heroSpotlightProduct.whyToGiveIt}
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-[#1B3D5F]/10 flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => toggleSaveProduct(heroSpotlightProduct.id)}
                            aria-pressed={savedProductIds.includes(heroSpotlightProduct.id)}
                            className="inline-flex items-center gap-1.5 font-semibold text-[#1B3D5F] hover:text-[#28537D]"
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                savedProductIds.includes(heroSpotlightProduct.id)
                                  ? 'fill-[#F2846B] text-[#F2846B]'
                                  : ''
                              }`}
                            />
                            <span>
                              {savedProductIds.includes(heroSpotlightProduct.id)
                                ? 'Saved to Your List'
                                : 'Save for Later'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setInspectedProduct(heroSpotlightProduct)}
                            className="font-semibold text-[#1B3D5F] hover:underline"
                          >
                            Why we love it →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bottom Card: Warm Butter-Tinted Etiquette Essay */}
                    <div className="p-6 md:p-7 rounded-3xl bg-[#FFF4D6] flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                          <span>Modern Etiquette</span>
                          <span aria-hidden="true">·</span>
                          <span>{etiquetteArticle.readTimeMinutes} min read</span>
                        </div>

                        <h2 className="text-xl md:text-2xl font-serif font-semibold text-[#1B3D5F] leading-snug">
                          <button
                            type="button"
                            onClick={() =>
                              setRoute({
                                view: 'article',
                                slug: etiquetteArticle.slug,
                              })
                            }
                            className="text-left hover:underline"
                          >
                            {etiquetteArticle.title}
                          </button>
                        </h2>

                        <p className="text-xs md:text-sm text-[#1B3D5F]/80 leading-relaxed">
                          {etiquetteArticle.subtitle}
                        </p>
                      </div>

                      <div className="pt-4 mt-3 flex items-center justify-between text-xs">
                        <span className="text-[#28537D]">
                          By {AUTHORS[etiquetteArticle.authorId].name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setRoute({
                              view: 'article',
                              slug: etiquetteArticle.slug,
                            })
                          }
                          className="inline-flex items-center gap-1 font-semibold text-[#1B3D5F] hover:text-[#28537D]"
                        >
                          <span>Read the story</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ===============================================================
                SECTION 2: "WHO ARE YOU SHOPPING FOR?" PORTRAIT SPOTLIGHTS
                Visual recipient entry points with varied warm color washes
               =============================================================== */}
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
                  {RECIPIENT_SPOTLIGHTS.map((spot) => (
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
                        scrollToSection('gift-finder');
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

            {/* ===============================================================
                SECTION 3: PLAYFUL INTERACTIVE GIFT FINDER & CATALOG
                Conversational Mad-Libs style discovery + visual product grid
               =============================================================== */}
            <section id="gift-finder" className="py-16 md:py-20 scroll-mt-14">
              <div className="max-w-7xl mx-auto px-6 space-y-12">
                {/* Soft Blue & Mint Interactive Concierge Card */}
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
                        <span>Start Over ({allProducts.length} Gifts)</span>
                      </button>
                    )}
                  </div>

                  {/* Conversational Filter Row */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                    {/* Recipient Selector */}
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

                    {/* Vibe / Personality Selector */}
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

                    {/* Budget Selector */}
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

                    {/* Natural Search Input */}
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

                  {/* Interactive Occasion Filter Tabs */}
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

                {/* Product Showcase Grid (Open, Borderless Cards) */}
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
                        onSelectProduct={setInspectedProduct}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ===============================================================
                SECTION 4: SWEET SPOT — EXTRAORDINARY GIFTS UNDER $50
                Warm Butter & Sand Showcase for accessible, high-delight gifts
               =============================================================== */}
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
                      onSelectProduct={setInspectedProduct}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* ===============================================================
                SECTION 5: CURATED GIFT GUIDES (MAGAZINE FEATURE SPREADS)
                Varied visual scales + inline shoppable Quick Picks
               =============================================================== */}
            <section id="editorial-guides" className="py-16 md:py-20 scroll-mt-14">
              <div className="max-w-7xl mx-auto px-6 space-y-12">
                <div className="flex flex-wrap items-end justify-between gap-6">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-[#28537D] mb-1.5">
                      Curated Gift Guides
                    </div>
                    <h2 className="text-2xl md:text-4xl font-serif font-semibold text-[#1B3D5F]">
                      Handpicked Guides for Real People & Occasions
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  {GIFT_GUIDES.map((guide, idx) => {
                    const author = AUTHORS[guide.authorId];
                    const bgClass =
                      idx === 0 ? 'bg-[#E8F8F0] lg:col-span-7' : 'bg-[#F3ECE1] lg:col-span-5';

                    return (
                      <article
                        key={guide.id}
                        className={`${bgClass} rounded-3xl p-6 md:p-8 flex flex-col justify-between space-y-6`}
                      >
                        <div className="space-y-5">
                          <div
                            onClick={() =>
                              setRoute({ view: 'guide', slug: guide.slug })
                            }
                            className="aspect-16/9 w-full rounded-2xl overflow-hidden bg-white cursor-pointer group"
                          >
                            <PhotoImage
                              src={guide.heroImageUrl}
                              alt={guide.heroImageAlt}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>

                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2 text-xs font-semibold text-[#28537D]">
                              <span>{guide.category}</span>
                              <span aria-hidden="true">·</span>
                              <span>By {author?.name}</span>
                              <span aria-hidden="true">·</span>
                              <span>{guide.readTimeMinutes} min read</span>
                            </div>

                            <h3 className="text-2xl md:text-3xl font-serif font-semibold text-[#1B3D5F] leading-snug">
                              <button
                                type="button"
                                onClick={() =>
                                  setRoute({ view: 'guide', slug: guide.slug })
                                }
                                className="text-left hover:underline"
                              >
                                {guide.title}
                              </button>
                            </h3>

                            <p className="text-sm text-[#1B3D5F]/80 leading-relaxed">
                              {guide.subtitle}
                            </p>
                          </div>

                          {/* Shoppable Quick Picks Preview Strip */}
                          <div className="pt-3 space-y-2.5">
                            <div className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                              Inside This Guide:
                            </div>
                            <div className="space-y-2">
                              {guide.quickPicks.slice(0, 3).map((qp) => {
                                const prod = PRODUCTS[qp.productId];
                                if (!prod) return null;
                                return (
                                  <div
                                    key={qp.id}
                                    onClick={() => setInspectedProduct(prod)}
                                    className="p-3 rounded-2xl bg-white/80 hover:bg-white transition-colors flex items-center justify-between gap-3 cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-[#F3ECE1]">
                                        <PhotoImage
                                          src={prod.images[0].url}
                                          alt={prod.images[0].alt}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-[11px] font-semibold text-[#28537D]">
                                          {qp.label}
                                        </div>
                                        <div className="text-xs font-serif font-semibold text-[#1B3D5F] truncate">
                                          {prod.title}
                                        </div>
                                      </div>
                                    </div>
                                    <span className="text-xs font-semibold text-[#1B3D5F] tabular-nums shrink-0">
                                      ${prod.price} {prod.currency}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              setRoute({ view: 'guide', slug: guide.slug })
                            }
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1B3D5F] text-[#FAF7F2] text-xs font-semibold hover:bg-[#28537D] transition-colors"
                          >
                            <span>Read Full Guide</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ===============================================================
                SECTION 6: EDITORIAL STORY FEATURE (DEEP BLUE #1B3D5F SPREAD)
                Warm storytelling backed by real relationship psychology
               =============================================================== */}
            <section className="py-16 md:py-20 bg-[#1B3D5F] text-[#FAF7F2]">
              <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                  <div className="lg:col-span-6 space-y-5">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#C3F3DF]">
                      <BookOpen className="w-4 h-4" />
                      <span>Featured Essay · {featuredArticle.category}</span>
                    </div>

                    <h2 className="text-3xl md:text-5xl font-serif font-semibold text-white leading-tight text-balance">
                      {featuredArticle.title}
                    </h2>

                    <p className="text-base md:text-lg text-[#99BFF9] leading-relaxed">
                      {featuredArticle.subtitle}
                    </p>

                    <blockquote className="py-4 border-y border-white/15 text-lg font-serif italic text-[#C3F3DF]">
                      “A truly great gift doesn’t ask the recipient to invent a brand-new personality. It takes a quiet ritual they already love and makes it feel cherished.”
                    </blockquote>

                    <div className="pt-2 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          setRoute({ view: 'article', slug: featuredArticle.slug })
                        }
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C3F3DF] text-[#1B3D5F] text-xs font-semibold hover:bg-white transition-colors whitespace-nowrap shrink-0"
                      >
                        <span>Read the Full Story</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-[#99BFF9]">
                        By {AUTHORS[featuredArticle.authorId].name} · Includes 4 psychology studies
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-6">
                    <div
                      onClick={() =>
                        setRoute({ view: 'article', slug: featuredArticle.slug })
                      }
                      className="aspect-4/3 rounded-3xl overflow-hidden bg-[#28537D] cursor-pointer group"
                    >
                      <PhotoImage
                        src={featuredArticle.heroImageUrl}
                        alt={featuredArticle.heroAlt}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* =====================================================================
          WARM EDITORIAL FOOTER
         ===================================================================== */}
      <footer className="bg-[#F3ECE1] text-[#1B3D5F] border-t border-[#1B3D5F]/10">
        <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5 space-y-3">
            <div className="text-2xl font-serif font-semibold tracking-tight text-[#1B3D5F]">
              Science of Gifts
            </div>
            <p className="text-sm text-[#28537D] leading-relaxed max-w-sm">
              A magazine and gift-discovery destination dedicated to thoughtful giving, memorable objects, and the human stories behind why we give.
            </p>
          </div>

          <div className="md:col-span-4 space-y-2 text-xs">
            <div className="font-semibold uppercase tracking-wider text-[#28537D] mb-3">
              Guides & Stories
            </div>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setRoute({ view: 'guide', slug: GIFT_GUIDES[0].slug })
                  }
                  className="text-[#1B3D5F] hover:text-[#28537D] hover:underline text-left"
                >
                  Thoughtful Gifts for People Who Appreciate the Little Things
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setRoute({ view: 'guide', slug: GIFT_GUIDES[1].slug })
                  }
                  className="text-[#1B3D5F] hover:text-[#28537D] hover:underline text-left"
                >
                  Host Gifts & Tabletop Favorites Under $100
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setRoute({ view: 'article', slug: ARTICLES[0].slug })
                  }
                  className="text-[#1B3D5F] hover:text-[#28537D] hover:underline text-left"
                >
                  Why the Best Gifts Whisper Instead of Shout
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setRoute({ view: 'article', slug: ARTICLES[1].slug })
                  }
                  className="text-[#1B3D5F] hover:text-[#28537D] hover:underline text-left"
                >
                  What to Bring When the Host Says “Bring Nothing”
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3 text-xs">
            <div className="font-semibold uppercase tracking-wider text-[#28537D] mb-2">
              Your Gift List
            </div>
            <p className="text-[#28537D] leading-relaxed">
              Bookmark favorite ideas as you browse—your shortlist stays saved right in your browser.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsSavedDrawerOpen(true)}
                className="px-4 py-2.5 rounded-full bg-[#1B3D5F] text-[#FAF7F2] font-semibold hover:bg-[#28537D] transition-colors"
              >
                Open Saved List ({savedProductIds.length})
              </button>
              <button
                type="button"
                onClick={() => setIsArchModalOpen(true)}
                className="text-[#28537D] hover:text-[#1B3D5F] underline"
              >
                Technical & SEO Spec
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={inspectedProduct}
        isSaved={inspectedProduct ? savedProductIds.includes(inspectedProduct.id) : false}
        onToggleSave={toggleSaveProduct}
        onClose={() => setInspectedProduct(null)}
      />

      {/* Saved Gifts Drawer */}
      <SavedGiftsDrawer
        isOpen={isSavedDrawerOpen}
        savedProductIds={savedProductIds}
        recipientNotes={recipientNotes}
        onUpdateRecipientNote={updateRecipientNote}
        onToggleSave={toggleSaveProduct}
        onSelectProduct={setInspectedProduct}
        onClose={() => setIsSavedDrawerOpen(false)}
      />

      {/* Technical & SEO Blueprint Modal (accessible from footer) */}
      <ArchitectureAndSeoModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />
    </div>
  );
}
