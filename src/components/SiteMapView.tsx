import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Compass,
  ExternalLink,
  FileText,
  FolderTree,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import {
  ArticleTopicDiscoveryItem,
  BudgetDiscoveryItem,
  EnrichedArticle,
  EnrichedGiftGuide,
  InterestDiscoveryItem,
  OccasionDiscoveryItem,
  RecipientDiscoveryItem,
} from '../cms/contentRepository';
import { EditorialHubConfig, Product } from '../types/content';
import {
  SHOP_EXTERNAL_URL,
  SHOP_RETURNS_FAQ_URL,
} from '../config/navigationConfig';
import { CategoryIcon } from './CategoryIcon';

export interface SiteMapViewProps {
  guides: EnrichedGiftGuide[];
  recipientCategories: RecipientDiscoveryItem[];
  interestCategories: InterestDiscoveryItem[];
  occasionCategories: OccasionDiscoveryItem[];
  budgetBrackets: BudgetDiscoveryItem[];
  articles: EnrichedArticle[];
  storyTopics: ArticleTopicDiscoveryItem[];
  products: Product[];
  publishedEditorialHubs?: EditorialHubConfig[];
}

export const SiteMapView: React.FC<SiteMapViewProps> = ({
  guides,
  recipientCategories,
  interestCategories,
  occasionCategories,
  budgetBrackets,
  articles,
  storyTopics,
  products,
  publishedEditorialHubs = [],
}) => {
  // Group canonical products by productType so large catalogs remain structured and scannable
  const productsByCategory = React.useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const product of products) {
      const group = map.get(product.productType) ?? [];
      group.push(product);
      map.set(product.productType, group);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  const totalCategoryArchivesCount =
    recipientCategories.length +
    interestCategories.length +
    occasionCategories.length +
    storyTopics.length;

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24 text-[#24282B]">
      {/* =====================================================================
          HEADER & BREADCRUMB
         ===================================================================== */}
      <header className="border-b border-[#E3E1DB] bg-[#FAF9F6]">
        <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E1DB] pb-3.5 text-xs text-[#636A6F]">
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-2 font-medium"
            >
              <a
                href="/"
                className="text-[#636A6F] transition-colors hover:text-[#28537D]"
              >
                Home
              </a>
              <span aria-hidden="true" className="text-[#C5C1B8]">
                /
              </span>
              <span
                aria-current="page"
                className="font-semibold text-[#24282B]"
              >
                Site Map
              </span>
            </nav>

            <div className="theme-metadata flex flex-wrap items-center gap-2 text-xs text-[#636A6F] tabular-nums">
              <span>{guides.length} Gift Guides</span>
              <span aria-hidden="true">·</span>
              <span>{articles.length} Stories</span>
              <span aria-hidden="true">·</span>
              <span>{totalCategoryArchivesCount} Category Archives</span>
              <span aria-hidden="true">·</span>
              <span>{products.length} Product Profiles</span>
            </div>
          </div>

          <div className="py-10 sm:py-14">
            <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
              <FolderTree className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Complete Publication Directory</span>
            </p>
            <h1 className="theme-page-title mt-2 font-serif text-3xl font-semibold leading-tight text-[#24282B] sm:text-4xl lg:text-5xl">
              Site Map
            </h1>
            <p className="theme-intro-text mt-3 max-w-2xl text-base leading-relaxed text-[#636A6F] sm:text-lg">
              A complete, human-readable index of all published sections, gift
              guides, category archives, stories, product profiles, and
              editorial policies on Science of Gifts.
            </p>

            {/* Quick Section Jump Pills */}
            <nav
              aria-label="Site map section links"
              className="mt-6 flex flex-wrap items-center gap-2 pt-2 text-xs"
            >
              <a
                href="#sitemap-main-sections"
                className="rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3 py-1.5 font-medium text-[#24282B] hover:border-[#28537D] hover:text-[#28537D]"
              >
                Main Website Sections
              </a>
              <a
                href="#sitemap-gift-guides"
                className="rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3 py-1.5 font-medium text-[#24282B] hover:border-[#28537D] hover:text-[#28537D]"
              >
                Gift Guides ({guides.length})
              </a>
              <a
                href="#sitemap-guide-categories"
                className="rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3 py-1.5 font-medium text-[#24282B] hover:border-[#28537D] hover:text-[#28537D]"
              >
                Gift Guide Categories
              </a>
              <a
                href="#sitemap-stories"
                className="rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3 py-1.5 font-medium text-[#24282B] hover:border-[#28537D] hover:text-[#28537D]"
              >
                Stories ({articles.length})
              </a>
              <a
                href="#sitemap-story-topics"
                className="rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3 py-1.5 font-medium text-[#24282B] hover:border-[#28537D] hover:text-[#28537D]"
              >
                Story Topics ({storyTopics.length})
              </a>
              <a
                href="#sitemap-product-profiles"
                className="rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3 py-1.5 font-medium text-[#24282B] hover:border-[#28537D] hover:text-[#28537D]"
              >
                Product Profiles ({products.length})
              </a>
              <a
                href="#sitemap-publication-info"
                className="rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3 py-1.5 font-medium text-[#24282B] hover:border-[#28537D] hover:text-[#28537D]"
              >
                Publication Information
              </a>
            </nav>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] space-y-14 px-4 pt-12 sm:px-6 lg:px-8">
        {/* ===================================================================
            1. MAIN WEBSITE SECTIONS & 7. PUBLICATION INFORMATION
           =================================================================== */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section
            id="sitemap-main-sections"
            aria-labelledby="heading-sitemap-main-sections"
            className="scroll-mt-24 rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8 lg:col-span-6"
          >
            <div className="flex items-center gap-2 border-b border-[#E3E1DB] pb-3.5">
              <Compass
                className="h-4 w-4 text-[#28537D]"
                aria-hidden="true"
              />
              <h2
                id="heading-sitemap-main-sections"
                className="theme-section-heading font-serif text-xl font-semibold text-[#24282B]"
              >
                Main Website Sections
              </h2>
            </div>

            <ul className="mt-5 space-y-3.5 text-sm">
              <li className="flex items-baseline justify-between gap-4 border-b border-[#E3E1DB]/60 pb-3">
                <div>
                  <a
                    href="/"
                    className="font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                  >
                    Home — Science of Gifts Front Page
                  </a>
                  <p className="theme-caption mt-0.5 text-xs text-[#636A6F]">
                    Cover guide, Gift of the Week spotlight, recipient pathways,
                    and interactive finder preview.
                  </p>
                </div>
                <span className="font-mono text-xs text-[#636A6F]">/</span>
              </li>

              <li className="flex items-baseline justify-between gap-4 border-b border-[#E3E1DB]/60 pb-3">
                <div>
                  <a
                    href="/gift-guides/"
                    className="font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                  >
                    Gift Guides Directory
                  </a>
                  <p className="theme-caption mt-0.5 text-xs text-[#636A6F]">
                    Browse all curated gift guides by recipient, interest,
                    occasion, and budget.
                  </p>
                </div>
                <span className="font-mono text-xs text-[#636A6F]">
                  /gift-guides/
                </span>
              </li>

              {publishedEditorialHubs.map((hub) => (
                <li
                  key={hub.slug}
                  className="flex items-baseline justify-between gap-4 border-b border-[#E3E1DB]/60 pb-3"
                >
                  <div>
                    <a
                      href={hub.routePath}
                      className="font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                    >
                      {hub.title} — Editorial Discovery Hub
                    </a>
                    <p className="theme-caption mt-0.5 text-xs text-[#636A6F]">
                      {hub.subtitle}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[#636A6F]">
                    {hub.routePath}
                  </span>
                </li>
              ))}

              <li className="flex items-baseline justify-between gap-4 border-b border-[#E3E1DB]/60 pb-3">
                <div>
                  <a
                    href="/articles/"
                    className="font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                  >
                    Stories Directory
                  </a>
                  <p className="theme-caption mt-0.5 text-xs text-[#636A6F]">
                    Long-form essays on gift-giving psychology, relationships,
                    and modern host etiquette.
                  </p>
                </div>
                <span className="font-mono text-xs text-[#636A6F]">
                  /articles/
                </span>
              </li>

              <li className="flex items-baseline justify-between gap-4 border-b border-[#E3E1DB]/60 pb-3">
                <div>
                  <a
                    href="/gift-finder/"
                    className="font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                  >
                    Interactive Gift Finder & Guided Quiz
                  </a>
                  <p className="theme-caption mt-0.5 text-xs text-[#636A6F]">
                    Natural-language gift search, multi-facet filtering, strict
                    budget caps, and 5-step quiz.
                  </p>
                </div>
                <span className="font-mono text-xs text-[#636A6F]">
                  /gift-finder/
                </span>
              </li>

              <li className="flex items-baseline justify-between gap-4">
                <div>
                  <a
                    href={SHOP_EXTERNAL_URL}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                  >
                    <span>Science of Gifts Shop</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                  <p className="theme-caption mt-0.5 text-xs text-[#636A6F]">
                    Official first-party merchandise store hosted on Fourthwall.
                  </p>
                </div>
                <span className="font-mono text-xs text-[#636A6F]">
                  shop.scienceofgifts.com
                </span>
              </li>
            </ul>
          </section>

          <section
            id="sitemap-publication-info"
            aria-labelledby="heading-sitemap-publication-info"
            className="scroll-mt-24 rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8 lg:col-span-6"
          >
            <div className="flex items-center gap-2 border-b border-[#E3E1DB] pb-3.5">
              <ShieldCheck
                className="h-4 w-4 text-[#28537D]"
                aria-hidden="true"
              />
              <h2
                id="heading-sitemap-publication-info"
                className="theme-section-heading font-serif text-xl font-semibold text-[#24282B]"
              >
                Publication Information & Policies
              </h2>
            </div>

            <ul className="mt-5 space-y-3.5 text-sm">
              <li className="flex items-baseline justify-between gap-4 border-b border-[#E3E1DB]/60 pb-3">
                <div>
                  <a
                    href="/about/"
                    className="font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                  >
                    About Science of Gifts
                  </a>
                  <p className="theme-caption mt-0.5 text-xs text-[#636A6F]">
                    Our mission, research-informed curation model, and how the
                    Gift Finder works.
                  </p>
                </div>
                <span className="font-mono text-xs text-[#636A6F]">
                  /about/
                </span>
              </li>

              <li className="flex items-baseline justify-between gap-4 border-b border-[#E3E1DB]/60 pb-3">
                <div>
                  <a
                    href="/editorial-policy/"
                    className="font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                  >
                    Editorial Policy
                  </a>
                  <p className="theme-caption mt-0.5 text-xs text-[#636A6F]">
                    Standards for curating gifts, evaluating recipient fit, and
                    citing academic studies.
                  </p>
                </div>
                <span className="font-mono text-xs text-[#636A6F]">
                  /editorial-policy/
                </span>
              </li>

              <li className="flex items-baseline justify-between gap-4 border-b border-[#E3E1DB]/60 pb-3">
                <div>
                  <a
                    href="/affiliate-disclosure/"
                    className="font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                  >
                    Affiliate Disclosure
                  </a>
                  <p className="theme-caption mt-0.5 text-xs text-[#636A6F]">
                    How third-party retailer commissions work vs. first-party
                    shop merchandise.
                  </p>
                </div>
                <span className="font-mono text-xs text-[#636A6F]">
                  /affiliate-disclosure/
                </span>
              </li>

              <li className="flex items-baseline justify-between gap-4 border-b border-[#E3E1DB]/60 pb-3">
                <div>
                  <a
                    href="/contact/"
                    className="font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                  >
                    Contact
                  </a>
                  <p className="theme-caption mt-0.5 text-xs text-[#636A6F]">
                    Editorial correspondence and Science of Gifts Shop support
                    routing.
                  </p>
                </div>
                <span className="font-mono text-xs text-[#636A6F]">
                  /contact/
                </span>
              </li>

              <li className="flex items-baseline justify-between gap-4 border-b border-[#E3E1DB]/60 pb-3">
                <div>
                  <a
                    href="/privacy-policy/"
                    className="font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                  >
                    Privacy Policy
                  </a>
                  <p className="theme-caption mt-0.5 text-xs text-[#636A6F]">
                    Browser-local Saved Gifts storage and third-party service
                    disclosures.
                  </p>
                </div>
                <span className="font-mono text-xs text-[#636A6F]">
                  /privacy-policy/
                </span>
              </li>

              <li className="flex items-baseline justify-between gap-4 border-b border-[#E3E1DB]/60 pb-3">
                <div>
                  <a
                    href="/terms-of-use/"
                    className="font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                  >
                    Terms of Use
                  </a>
                  <p className="theme-caption mt-0.5 text-xs text-[#636A6F]">
                    Terms governing the editorial site and external merchant
                    links.
                  </p>
                </div>
                <span className="font-mono text-xs text-[#636A6F]">
                  /terms-of-use/
                </span>
              </li>

              <li className="flex items-baseline justify-between gap-4">
                <div>
                  <a
                    href={SHOP_RETURNS_FAQ_URL}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                  >
                    <span>Shop Returns & FAQ</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                  <p className="theme-caption mt-0.5 text-xs text-[#636A6F]">
                    Shipping, order, and return policies for Fourthwall store
                    merchandise.
                  </p>
                </div>
                <span className="font-mono text-xs text-[#636A6F]">
                  shop.scienceofgifts.com
                </span>
              </li>
            </ul>
          </section>
        </div>

        {/* ===================================================================
            2. GIFT GUIDES & 4. STORIES
           =================================================================== */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section
            id="sitemap-gift-guides"
            aria-labelledby="heading-sitemap-gift-guides"
            className="scroll-mt-24 rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8 lg:col-span-6"
          >
            <div className="flex items-center justify-between border-b border-[#E3E1DB] pb-3.5">
              <div className="flex items-center gap-2">
                <BookOpen
                  className="h-4 w-4 text-[#28537D]"
                  aria-hidden="true"
                />
                <h2
                  id="heading-sitemap-gift-guides"
                  className="theme-section-heading font-serif text-xl font-semibold text-[#24282B]"
                >
                  Gift Guides ({guides.length})
                </h2>
              </div>
              <a
                href="/gift-guides/"
                className="text-xs font-semibold text-[#28537D] hover:underline"
              >
                Open Directory →
              </a>
            </div>

            <ul className="mt-5 space-y-4 text-sm">
              {guides.map((item) => (
                <li
                  key={item.guide.id}
                  className="border-b border-[#E3E1DB]/60 pb-3.5 last:border-b-0 last:pb-0"
                >
                  <div className="text-xs font-semibold text-[#28537D]">
                    {item.guide.category} · {item.totalRecommendationsCount}{' '}
                    recommendations ({item.priceRangeSummary})
                  </div>
                  <a
                    href={`/gift-guides/${item.guide.slug}/`}
                    className="mt-0.5 block font-serif text-lg font-semibold text-[#24282B] hover:text-[#28537D] hover:underline"
                  >
                    {item.guide.title}
                  </a>
                  <p className="theme-caption mt-1 text-xs text-[#636A6F]">
                    {item.guide.subtitle}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section
            id="sitemap-stories"
            aria-labelledby="heading-sitemap-stories"
            className="scroll-mt-24 rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8 lg:col-span-6"
          >
            <div className="flex items-center justify-between border-b border-[#E3E1DB] pb-3.5">
              <div className="flex items-center gap-2">
                <FileText
                  className="h-4 w-4 text-[#28537D]"
                  aria-hidden="true"
                />
                <h2
                  id="heading-sitemap-stories"
                  className="theme-section-heading font-serif text-xl font-semibold text-[#24282B]"
                >
                  Stories ({articles.length})
                </h2>
              </div>
              <a
                href="/articles/"
                className="text-xs font-semibold text-[#28537D] hover:underline"
              >
                Open Directory →
              </a>
            </div>

            <ul className="mt-5 space-y-4 text-sm">
              {articles.map((item) => (
                <li
                  key={item.article.id}
                  className="border-b border-[#E3E1DB]/60 pb-3.5 last:border-b-0 last:pb-0"
                >
                  <div className="text-xs font-semibold text-[#28537D]">
                    {item.article.category} · {item.readTimeMinutes} min read ·{' '}
                    {item.citationCount} citations
                  </div>
                  <a
                    href={`/articles/${item.article.slug}/`}
                    className="mt-0.5 block font-serif text-lg font-semibold text-[#24282B] hover:text-[#28537D] hover:underline"
                  >
                    {item.article.title}
                  </a>
                  <p className="theme-caption mt-1 text-xs text-[#636A6F]">
                    {item.article.subtitle}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ===================================================================
            3. GIFT GUIDE CATEGORIES (RECIPIENTS, INTERESTS, OCCASIONS, BUDGETS)
           =================================================================== */}
        <section
          id="sitemap-guide-categories"
          aria-labelledby="heading-sitemap-guide-categories"
          className="scroll-mt-24 rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8"
        >
          <div className="border-b border-[#E3E1DB] pb-4">
            <h2
              id="heading-sitemap-guide-categories"
              className="theme-section-heading font-serif text-2xl font-semibold text-[#24282B]"
            >
              Gift Guide Categories & Discovery Archives
            </h2>
            <p className="theme-body-sm mt-1 text-xs text-[#636A6F]">
              Dedicated category archives generated from published recipient,
              interest, and occasion taxonomies.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Recipients */}
            <div>
              <h3 className="theme-info-heading font-serif text-base font-semibold text-[#24282B]">
                By Recipient ({recipientCategories.length})
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm">
                {recipientCategories.map((rec) => (
                  <li key={rec.slug} className="flex items-center gap-2.5">
                    <CategoryIcon
                      iconKey={rec.iconKey}
                      withSurfaceBadge={false}
                      sizeClass="h-4 w-4"
                    />
                    <a
                      href={rec.archiveHref}
                      className="font-medium text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                    >
                      {rec.label}
                    </a>
                    <span className="text-xs text-[#636A6F] tabular-nums">
                      ({rec.matchingGuides.length}g · {rec.productCount}p)
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Interests */}
            <div>
              <h3 className="theme-info-heading font-serif text-base font-semibold text-[#24282B]">
                By Interest ({interestCategories.length})
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm">
                {interestCategories.map((interest) => (
                  <li key={interest.slug} className="flex items-center gap-2.5">
                    <CategoryIcon
                      iconKey={interest.iconKey}
                      withSurfaceBadge={false}
                      sizeClass="h-4 w-4"
                    />
                    <a
                      href={interest.archiveHref}
                      className="font-medium text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                    >
                      {interest.label}
                    </a>
                    <span className="text-xs text-[#636A6F] tabular-nums">
                      ({interest.matchingGuides.length}g ·{' '}
                      {interest.productCount}p)
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Occasions */}
            <div>
              <h3 className="theme-info-heading font-serif text-base font-semibold text-[#24282B]">
                By Occasion ({occasionCategories.length})
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm">
                {occasionCategories.map((occ) => (
                  <li key={occ.slug} className="flex items-center gap-2.5">
                    <CategoryIcon
                      iconKey={occ.iconKey}
                      withSurfaceBadge={false}
                      sizeClass="h-4 w-4"
                    />
                    <a
                      href={occ.archiveHref}
                      className="font-medium text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                    >
                      {occ.label}
                    </a>
                    <span className="text-xs text-[#636A6F] tabular-nums">
                      ({occ.matchingGuides.length}g · {occ.productCount}p)
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Budgets */}
            <div>
              <h3 className="theme-info-heading font-serif text-base font-semibold text-[#24282B]">
                By Budget ({budgetBrackets.length})
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm">
                {budgetBrackets.map((b) => (
                  <li key={b.id} className="flex items-center gap-2.5">
                    <CategoryIcon
                      iconKey={b.iconKey}
                      withSurfaceBadge={false}
                      sizeClass="h-4 w-4"
                    />
                    <a
                      href={b.finderHref}
                      className="font-medium text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                    >
                      {b.label}
                    </a>
                    <span className="text-xs text-[#636A6F] tabular-nums">
                      ({b.productCount} gifts)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ===================================================================
            5. STORY TOPICS
           =================================================================== */}
        <section
          id="sitemap-story-topics"
          aria-labelledby="heading-sitemap-story-topics"
          className="scroll-mt-24 rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8"
        >
          <div className="border-b border-[#E3E1DB] pb-4">
            <h2
              id="heading-sitemap-story-topics"
              className="theme-section-heading font-serif text-2xl font-semibold text-[#24282B]"
            >
              Story Topics ({storyTopics.length})
            </h2>
            <p className="theme-body-sm mt-1 text-xs text-[#636A6F]">
              Topic archives organizing our behavioral psychology and etiquette
              essays.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {storyTopics.map((topic) => (
              <a
                key={topic.slug}
                href={topic.archiveHref}
                className="flex items-start gap-3 rounded-xl border border-[#E3E1DB] bg-[#FAF9F6] p-4 transition-colors hover:border-[#28537D]"
              >
                <CategoryIcon iconKey={topic.iconKey} />
                <div>
                  <div className="font-serif text-base font-semibold text-[#24282B]">
                    {topic.label}
                  </div>
                  <div className="text-xs text-[#636A6F] tabular-nums">
                    {topic.matchingArticles.length}{' '}
                    {topic.matchingArticles.length === 1 ? 'story' : 'stories'}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ===================================================================
            6. CANONICAL PRODUCT PROFILES (GROUPED BY PRODUCT CATEGORY)
           =================================================================== */}
        <section
          id="sitemap-product-profiles"
          aria-labelledby="heading-sitemap-product-profiles"
          className="scroll-mt-24 rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E1DB] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers
                  className="h-4 w-4 text-[#28537D]"
                  aria-hidden="true"
                />
                <h2
                  id="heading-sitemap-product-profiles"
                  className="theme-section-heading font-serif text-2xl font-semibold text-[#24282B]"
                >
                  Canonical Product Profiles ({products.length})
                </h2>
              </div>
              <p className="theme-body-sm mt-1 text-xs text-[#636A6F]">
                Every evaluated gift profile in our repository, organized by
                object category.
              </p>
            </div>
            <a
              href="/gift-finder/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#28537D] hover:underline"
            >
              <span>Search & filter in Gift Finder</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {productsByCategory.map(([categoryName, categoryProducts]) => (
              <div key={categoryName} className="space-y-2.5">
                <h3 className="theme-info-heading border-b border-[#E3E1DB] pb-2 font-serif text-base font-semibold text-[#24282B]">
                  {categoryName}{' '}
                  <span className="font-sans text-xs font-normal text-[#636A6F] tabular-nums">
                    ({categoryProducts.length})
                  </span>
                </h3>
                <ul className="space-y-2 text-xs">
                  {categoryProducts.map((prod) => (
                    <li
                      key={prod.id}
                      className="flex items-baseline justify-between gap-2"
                    >
                      <a
                        href={`/products/${prod.slug}/`}
                        className="font-medium text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                      >
                        {prod.title}
                      </a>
                      <span className="shrink-0 text-[#636A6F] tabular-nums">
                        ${prod.price}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
