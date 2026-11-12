import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Compass,
  ExternalLink,
  FileText,
  Sparkles,
} from 'lucide-react';
import {
  EnrichedArticle,
  EnrichedGiftGuide,
} from '../cms/contentRepository';
import { Product } from '../types/content';
import {
  AFFILIATE_DISCLOSURE_CONFIG,
  CategoryIconKey,
} from '../config/navigationConfig';
import { CategoryIcon } from './CategoryIcon';
import { PhotoImage } from './ObjectIllustrations';

export interface RelatedCategoryLink {
  slug: string;
  label: string;
  description: string;
  iconKey: CategoryIconKey;
  archiveHref: string;
  primaryCountLabel: string;
  secondaryCountLabel?: string;
}

export interface CategoryArchiveViewProps {
  archiveType: 'guide-category' | 'article-topic';
  dimensionLabel: string;
  parentDirectoryLabel: 'Gift Guides' | 'Stories';
  parentDirectoryHref: '/gift-guides/' | '/articles/';
  categoryLabel: string;
  categoryDescription: string;
  iconKey: CategoryIconKey;
  matchingGuides?: EnrichedGiftGuide[];
  matchingArticles?: EnrichedArticle[];
  matchingProducts?: Product[];
  finderHref?: string;
  relatedCategories: RelatedCategoryLink[];
  companionGuides?: EnrichedGiftGuide[];
  pageSize?: number;
}

export const DEFAULT_ARCHIVE_PAGE_SIZE = 6;

export const CategoryArchiveView: React.FC<CategoryArchiveViewProps> = ({
  archiveType,
  dimensionLabel,
  parentDirectoryLabel,
  parentDirectoryHref,
  categoryLabel,
  categoryDescription,
  iconKey,
  matchingGuides = [],
  matchingArticles = [],
  matchingProducts = [],
  finderHref,
  relatedCategories,
  companionGuides = [],
  pageSize = DEFAULT_ARCHIVE_PAGE_SIZE,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentProductPage, setCurrentProductPage] = useState(1);

  const isGuideCategory = archiveType === 'guide-category';

  const featuredGuide = isGuideCategory
    ? matchingGuides.find((g) => g.guide.featured) ?? matchingGuides[0] ?? null
    : null;
  const featuredArticle = !isGuideCategory
    ? matchingArticles.find((a) => a.article.featured) ??
      matchingArticles[0] ??
      null
    : null;

  const totalEditorialItems = isGuideCategory
    ? matchingGuides.length
    : matchingArticles.length;
  const totalEditorialPages = Math.max(
    1,
    Math.ceil(totalEditorialItems / pageSize)
  );
  const safePage = Math.min(currentPage, totalEditorialPages);
  const startIdx = (safePage - 1) * pageSize;

  const paginatedGuides = matchingGuides.slice(startIdx, startIdx + pageSize);
  const paginatedArticles = matchingArticles.slice(
    startIdx,
    startIdx + pageSize
  );

  const productPageSize = 9;
  const totalProductPages = Math.max(
    1,
    Math.ceil(matchingProducts.length / productPageSize)
  );
  const safeProductPage = Math.min(currentProductPage, totalProductPages);
  const productStartIdx = (safeProductPage - 1) * productPageSize;
  const paginatedProducts = matchingProducts.slice(
    productStartIdx,
    productStartIdx + productPageSize
  );

  const hasAffiliateProducts = matchingProducts.some(
    (p) => p.commerceProvider === 'affiliate'
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24 text-[#24282B]">
      {/* =====================================================================
          A. ARCHIVE HEADER & BREADCRUMB
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
              <a
                href={parentDirectoryHref}
                className="text-[#636A6F] transition-colors hover:text-[#28537D]"
              >
                {parentDirectoryLabel}
              </a>
              <span aria-hidden="true" className="text-[#C5C1B8]">
                /
              </span>
              <span className="text-[#636A6F]">{dimensionLabel}</span>
              <span aria-hidden="true" className="text-[#C5C1B8]">
                /
              </span>
              <span
                aria-current="page"
                className="font-semibold text-[#24282B]"
              >
                {categoryLabel}
              </span>
            </nav>

            <div className="theme-metadata flex flex-wrap items-center gap-2 text-xs text-[#636A6F] tabular-nums">
              {isGuideCategory ? (
                <>
                  <span className="font-medium text-[#24282B]">
                    {matchingGuides.length}{' '}
                    {matchingGuides.length === 1 ? 'gift guide' : 'gift guides'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {matchingProducts.length}{' '}
                    {matchingProducts.length === 1
                      ? 'catalog gift'
                      : 'catalog gifts'}
                  </span>
                </>
              ) : (
                <span className="font-medium text-[#24282B]">
                  {matchingArticles.length}{' '}
                  {matchingArticles.length === 1
                    ? 'published story'
                    : 'published stories'}
                </span>
              )}
            </div>
          </div>

          <div className="py-10 sm:py-12">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4 max-w-3xl">
                <CategoryIcon iconKey={iconKey} sizeClass="h-7 w-7" />
                <div>
                  <p className="theme-kicker text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                    {parentDirectoryLabel} · {dimensionLabel} Archive
                  </p>
                  <h1 className="theme-page-title mt-1.5 font-serif text-3xl font-semibold leading-tight text-[#24282B] sm:text-4xl lg:text-5xl">
                    {categoryLabel}
                  </h1>
                  <p className="theme-intro-text mt-3 text-base leading-relaxed text-[#636A6F] sm:text-lg">
                    {categoryDescription}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <a
                  href={parentDirectoryHref}
                  className="theme-button-text inline-flex items-center gap-1.5 rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-4 py-2.5 text-xs font-semibold text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>All {parentDirectoryLabel}</span>
                </a>
                {finderHref && (
                  <a
                    href={finderHref}
                    className="theme-btn-primary theme-button-text inline-flex items-center gap-1.5 rounded-lg bg-[#1B3D5F] px-4 py-2.5 text-xs font-semibold text-[#FFFFFF] transition-colors hover:bg-[#28537D]"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Filter in Gift Finder</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] space-y-16 px-4 pt-12 sm:px-6 sm:pt-14 lg:px-8">
        {/* ===================================================================
            B. FEATURED CONTENT IN THIS CATEGORY
           =================================================================== */}
        {featuredGuide && (
          <section
            id="featured-category-guide"
            aria-labelledby="heading-featured-category-guide"
          >
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E1DB] pb-3.5">
              <div>
                <p className="theme-kicker text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                  Lead Recommendation Guide
                </p>
                <h2
                  id="heading-featured-category-guide"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B]"
                >
                  Featured Guide for {categoryLabel}
                </h2>
              </div>
            </div>

            <article className="mt-6 overflow-hidden rounded-3xl border border-[#E3E1DB] bg-[#FFFFFF]">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <a
                    href={`/gift-guides/${featuredGuide.guide.slug}/`}
                    className="group block h-full min-h-[240px] w-full overflow-hidden bg-[#F6F4EF]"
                  >
                    <img
                      src={featuredGuide.guide.heroImageUrl}
                      alt={featuredGuide.guide.heroImageAlt}
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </a>
                </div>
                <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="theme-kicker font-semibold text-[#28537D]">
                        {featuredGuide.guide.category}
                      </span>
                      <span aria-hidden="true" className="text-[#C5C1B8]">
                        ·
                      </span>
                      <span className="theme-metadata text-[#636A6F] tabular-nums">
                        {featuredGuide.totalRecommendationsCount} picks (
                        {featuredGuide.priceRangeSummary})
                      </span>
                    </div>
                    <h3 className="theme-product-title-featured mt-2.5 font-serif text-2xl font-semibold leading-snug text-[#24282B]">
                      <a
                        href={`/gift-guides/${featuredGuide.guide.slug}/`}
                        className="hover:text-[#28537D] hover:underline"
                      >
                        {featuredGuide.guide.title}
                      </a>
                    </h3>
                    <p className="theme-body-text mt-2.5 text-[#24282B]">
                      {featuredGuide.guide.subtitle}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#E3E1DB] pt-4 text-xs">
                    <div className="theme-metadata flex flex-wrap items-center gap-3 text-[#636A6F]">
                      <span className="font-medium text-[#24282B]">
                        By {featuredGuide.author?.name ?? 'Editorial Desk'}
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Calendar
                          className="h-3.5 w-3.5 text-[#28537D]"
                          aria-hidden="true"
                        />
                        Updated {featuredGuide.guide.updatedAt}
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Clock
                          className="h-3.5 w-3.5 text-[#28537D]"
                          aria-hidden="true"
                        />
                        {featuredGuide.guide.readTimeMinutes} min read
                      </span>
                    </div>
                    <a
                      href={`/gift-guides/${featuredGuide.guide.slug}/`}
                      className="theme-btn-primary theme-button-text inline-flex items-center gap-1.5 rounded-lg bg-[#1B3D5F] px-4 py-2 text-xs font-semibold text-[#FFFFFF] transition-colors hover:bg-[#28537D]"
                    >
                      <span>Read Gift Guide</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>
            </article>
          </section>
        )}

        {featuredArticle && (
          <section
            id="featured-topic-story"
            aria-labelledby="heading-featured-topic-story"
          >
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E1DB] pb-3.5">
              <div>
                <p className="theme-kicker text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                  Lead Topic Essay
                </p>
                <h2
                  id="heading-featured-topic-story"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B]"
                >
                  Featured Story in {categoryLabel}
                </h2>
              </div>
            </div>

            <article className="mt-6 overflow-hidden rounded-3xl border border-[#E3E1DB] bg-[#FFFFFF]">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <a
                    href={`/articles/${featuredArticle.article.slug}/`}
                    className="group block h-full min-h-[240px] w-full overflow-hidden bg-[#F6F4EF]"
                  >
                    <img
                      src={featuredArticle.article.heroImageUrl}
                      alt={featuredArticle.article.heroAlt}
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </a>
                </div>
                <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="theme-kicker font-semibold text-[#28537D]">
                        {featuredArticle.article.category}
                      </span>
                      <span aria-hidden="true" className="text-[#C5C1B8]">
                        ·
                      </span>
                      <span className="theme-metadata text-[#636A6F] tabular-nums">
                        {featuredArticle.readTimeMinutes} min read ·{' '}
                        {featuredArticle.citationCount} studies cited
                      </span>
                    </div>
                    <h3 className="theme-product-title-featured mt-2.5 font-serif text-2xl font-semibold leading-snug text-[#24282B]">
                      <a
                        href={`/articles/${featuredArticle.article.slug}/`}
                        className="hover:text-[#28537D] hover:underline"
                      >
                        {featuredArticle.article.title}
                      </a>
                    </h3>
                    <p className="theme-body-text mt-2.5 text-[#24282B]">
                      {featuredArticle.article.subtitle}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#E3E1DB] pt-4 text-xs">
                    <div className="theme-metadata flex flex-wrap items-center gap-3 text-[#636A6F]">
                      <span className="font-medium text-[#24282B]">
                        By {featuredArticle.author?.name ?? 'Editorial Desk'}
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Calendar
                          className="h-3.5 w-3.5 text-[#28537D]"
                          aria-hidden="true"
                        />
                        Published {featuredArticle.article.publishedAt}
                      </span>
                    </div>
                    <a
                      href={`/articles/${featuredArticle.article.slug}/`}
                      className="theme-btn-primary theme-button-text inline-flex items-center gap-1.5 rounded-lg bg-[#1B3D5F] px-4 py-2 text-xs font-semibold text-[#FFFFFF] transition-colors hover:bg-[#28537D]"
                    >
                      <span>Read Full Story</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>
            </article>
          </section>
        )}

        {/* ===================================================================
            C. ALL MATCHING EDITORIAL GUIDES OR STORIES (WITH PAGINATION)
           =================================================================== */}
        {isGuideCategory && matchingGuides.length > 0 && (
          <section
            id="category-guides-list"
            aria-labelledby="heading-category-guides-list"
            className="border-t border-[#E3E1DB] pt-12"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="theme-kicker text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                  Curated Editorial Guides
                </p>
                <h2
                  id="heading-category-guides-list"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B]"
                >
                  Gift Guides for {categoryLabel} ({matchingGuides.length})
                </h2>
              </div>
              {totalEditorialPages > 1 && (
                <div className="theme-metadata text-xs text-[#636A6F] tabular-nums">
                  Page {safePage} of {totalEditorialPages}
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {paginatedGuides.map((item) => (
                <article
                  key={item.guide.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="theme-kicker font-semibold text-[#28537D]">
                        {item.guide.category}
                      </span>
                      <span className="theme-metadata text-[#636A6F] tabular-nums">
                        {item.totalRecommendationsCount} picks ·{' '}
                        {item.priceRangeSummary}
                      </span>
                    </div>
                    <h3 className="theme-subsection-heading mt-2 font-serif text-xl font-semibold text-[#24282B]">
                      <a
                        href={`/gift-guides/${item.guide.slug}/`}
                        className="hover:text-[#28537D] hover:underline"
                      >
                        {item.guide.title}
                      </a>
                    </h3>
                    <p className="theme-body-sm mt-2 text-[#636A6F]">
                      {item.guide.subtitle}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[#E3E1DB] pt-3.5 text-xs">
                    <span className="theme-metadata text-[#636A6F]">
                      By {item.author?.name ?? 'Editorial Desk'}
                    </span>
                    <a
                      href={`/gift-guides/${item.guide.slug}/`}
                      className="theme-link inline-flex items-center gap-1 font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                    >
                      <span>Read Guide</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </article>
              ))}
            </div>

            {totalEditorialPages > 1 && (
              <nav
                aria-label="Category guides pagination"
                className="mt-8 flex items-center justify-between border-t border-[#E3E1DB] pt-4 text-xs"
              >
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3.5 py-2 font-semibold text-[#24282B] disabled:opacity-40 cursor-pointer"
                >
                  Previous Page
                </button>
                <span className="theme-metadata text-[#636A6F] tabular-nums">
                  Showing {startIdx + 1}–
                  {Math.min(
                    startIdx + pageSize,
                    matchingGuides.length
                  )}{' '}
                  of {matchingGuides.length} guides
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalEditorialPages}
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(totalEditorialPages, p + 1)
                    )
                  }
                  className="rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3.5 py-2 font-semibold text-[#24282B] disabled:opacity-40 cursor-pointer"
                >
                  Next Page
                </button>
              </nav>
            )}
          </section>
        )}

        {!isGuideCategory && matchingArticles.length > 0 && (
          <section
            id="topic-stories-list"
            aria-labelledby="heading-topic-stories-list"
            className="border-t border-[#E3E1DB] pt-12"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="theme-kicker text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                  Complete Topic Index
                </p>
                <h2
                  id="heading-topic-stories-list"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B]"
                >
                  All Stories in {categoryLabel} ({matchingArticles.length})
                </h2>
              </div>
              {totalEditorialPages > 1 && (
                <div className="theme-metadata text-xs text-[#636A6F] tabular-nums">
                  Page {safePage} of {totalEditorialPages}
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {paginatedArticles.map((item) => (
                <article
                  key={item.article.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="theme-kicker font-semibold text-[#28537D]">
                        {item.article.category}
                      </span>
                      <span className="theme-metadata text-[#636A6F] tabular-nums">
                        {item.readTimeMinutes} min read · {item.citationCount}{' '}
                        citations
                      </span>
                    </div>
                    <h3 className="theme-subsection-heading mt-2 font-serif text-xl font-semibold text-[#24282B]">
                      <a
                        href={`/articles/${item.article.slug}/`}
                        className="hover:text-[#28537D] hover:underline"
                      >
                        {item.article.title}
                      </a>
                    </h3>
                    <p className="theme-body-sm mt-2 text-[#636A6F]">
                      {item.article.subtitle}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[#E3E1DB] pt-3.5 text-xs">
                    <span className="theme-metadata text-[#636A6F]">
                      By {item.author?.name ?? 'Editorial Desk'}
                    </span>
                    <a
                      href={`/articles/${item.article.slug}/`}
                      className="theme-link inline-flex items-center gap-1 font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Read Essay</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>

            {totalEditorialPages > 1 && (
              <nav
                aria-label="Topic stories pagination"
                className="mt-8 flex items-center justify-between border-t border-[#E3E1DB] pt-4 text-xs"
              >
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3.5 py-2 font-semibold text-[#24282B] disabled:opacity-40 cursor-pointer"
                >
                  Previous Page
                </button>
                <span className="theme-metadata text-[#636A6F] tabular-nums">
                  Showing {startIdx + 1}–
                  {Math.min(
                    startIdx + pageSize,
                    matchingArticles.length
                  )}{' '}
                  of {matchingArticles.length} stories
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalEditorialPages}
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(totalEditorialPages, p + 1)
                    )
                  }
                  className="rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3.5 py-2 font-semibold text-[#24282B] disabled:opacity-40 cursor-pointer"
                >
                  Next Page
                </button>
              </nav>
            )}
          </section>
        )}

        {/* ===================================================================
            D. MATCHING CANONICAL CATALOG GIFTS (DISTINCT FROM GUIDE COUNT)
           =================================================================== */}
        {isGuideCategory && matchingProducts.length > 0 && (
          <section
            id="category-products-list"
            aria-labelledby="heading-category-products-list"
            className="border-t border-[#E3E1DB] pt-12"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="theme-kicker text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                  Canonical Gift Catalog
                </p>
                <h2
                  id="heading-category-products-list"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B]"
                >
                  Evaluated Gifts for {categoryLabel} ({matchingProducts.length})
                </h2>
                <p className="theme-body-sm mt-1 max-w-2xl text-[#636A6F]">
                  Every object below is linked to its full editorial profile,
                  recipient suitability notes, and verified price tier.
                </p>
              </div>
              {finderHref && (
                <a
                  href={finderHref}
                  className="theme-link inline-flex items-center gap-1 text-xs font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                >
                  <span>Combine with budget & hobby filters in Gift Finder</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
            </div>

            {hasAffiliateProducts && (
              <p className="theme-caption mt-4 rounded-xl border border-[#E3E1DB] bg-[#FFFFFF] px-4 py-2.5 text-xs text-[#636A6F]">
                {AFFILIATE_DISCLOSURE_CONFIG.shortInlineNotice}{' '}
                <a
                  href={AFFILIATE_DISCLOSURE_CONFIG.disclosurePageHref}
                  className="font-semibold text-[#28537D] underline underline-offset-2 hover:text-[#1B3D5F]"
                >
                  Learn more
                </a>
                .
              </p>
            )}

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedProducts.map((product) => {
                const img = product.images[0];
                return (
                  <article
                    key={product.id}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF]"
                  >
                    <div>
                      {img && (
                        <a
                          href={`/products/${product.slug}/`}
                          className="group block aspect-[4/3] w-full overflow-hidden bg-[#F6F4EF]"
                        >
                          <PhotoImage
                            image={img}
                            preset="card-landscape"
                            aspectRatio="4:3"
                            width={560}
                            height={420}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </a>
                      )}
                      <div className="p-5">
                        <div className="flex items-center justify-between gap-2 text-xs text-[#636A6F]">
                          <span>{product.vendor}</span>
                          <span className="font-semibold text-[#24282B] tabular-nums">
                            ${product.price} {product.currency}
                          </span>
                        </div>
                        <h3 className="theme-product-title mt-1.5 font-serif text-lg font-semibold text-[#24282B]">
                          <a
                            href={`/products/${product.slug}/`}
                            className="hover:text-[#28537D] hover:underline"
                          >
                            {product.title}
                          </a>
                        </h3>
                        <p className="theme-body-sm mt-1.5 text-xs text-[#636A6F]">
                          {product.bestForSummary}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#E3E1DB] px-5 py-3 text-xs">
                      <a
                        href={`/products/${product.slug}/`}
                        className="theme-link font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                      >
                        Editorial Profile →
                      </a>
                      <a
                        href={product.purchaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#636A6F] hover:text-[#24282B]"
                      >
                        <span>
                          {product.commerceProvider === 'fourthwall'
                            ? 'Science of Gifts Shop'
                            : product.vendor}
                        </span>
                        <ExternalLink
                          className="h-3 w-3"
                          aria-hidden="true"
                        />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>

            {totalProductPages > 1 && (
              <nav
                aria-label="Category products pagination"
                className="mt-8 flex items-center justify-between border-t border-[#E3E1DB] pt-4 text-xs"
              >
                <button
                  type="button"
                  disabled={safeProductPage <= 1}
                  onClick={() =>
                    setCurrentProductPage((p) => Math.max(1, p - 1))
                  }
                  className="rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3.5 py-2 font-semibold text-[#24282B] disabled:opacity-40 cursor-pointer"
                >
                  Previous Gifts
                </button>
                <span className="theme-metadata text-[#636A6F] tabular-nums">
                  Showing {productStartIdx + 1}–
                  {Math.min(
                    productStartIdx + productPageSize,
                    matchingProducts.length
                  )}{' '}
                  of {matchingProducts.length} gifts
                </span>
                <button
                  type="button"
                  disabled={safeProductPage >= totalProductPages}
                  onClick={() =>
                    setCurrentProductPage((p) =>
                      Math.min(totalProductPages, p + 1)
                    )
                  }
                  className="rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3.5 py-2 font-semibold text-[#24282B] disabled:opacity-40 cursor-pointer"
                >
                  Next Gifts
                </button>
              </nav>
            )}
          </section>
        )}

        {/* ===================================================================
            E. COMPANION GUIDES FOR STORY TOPICS
           =================================================================== */}
        {!isGuideCategory && companionGuides.length > 0 && (
          <section
            id="topic-companion-guides"
            aria-labelledby="heading-topic-companion-guides"
            className="border-t border-[#E3E1DB] pt-12"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>From Research to Recommendations</span>
                </p>
                <h2
                  id="heading-topic-companion-guides"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B]"
                >
                  Companion Gift Guides
                </h2>
              </div>
              <a
                href="/gift-guides/"
                className="theme-link text-xs font-semibold text-[#28537D] hover:underline"
              >
                All Gift Guides →
              </a>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              {companionGuides.map((g) => (
                <a
                  key={g.guide.id}
                  href={`/gift-guides/${g.guide.slug}/`}
                  className="flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 transition-colors hover:border-[#28537D]"
                >
                  <div>
                    <div className="text-xs font-semibold text-[#28537D]">
                      Gift Guide · {g.guide.category}
                    </div>
                    <h3 className="theme-subsection-heading mt-1.5 font-serif text-lg font-semibold text-[#24282B]">
                      {g.guide.title}
                    </h3>
                    <p className="theme-body-sm mt-1.5 text-xs text-[#636A6F]">
                      {g.guide.subtitle}
                    </p>
                  </div>
                  <div className="mt-4 text-xs font-semibold text-[#1B3D5F]">
                    Explore {g.totalRecommendationsCount} recommendations (
                    {g.priceRangeSummary}) →
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ===================================================================
            F. RELATED CATEGORIES
           =================================================================== */}
        {relatedCategories.length > 0 && (
          <section
            id="related-categories"
            aria-labelledby="heading-related-categories"
            className="border-t border-[#E3E1DB] pt-12"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                  <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Continue Exploring</span>
                </p>
                <h2
                  id="heading-related-categories"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B]"
                >
                  Related {dimensionLabel} Categories
                </h2>
              </div>
              <a
                href={parentDirectoryHref}
                className="theme-link text-xs font-semibold text-[#28537D] hover:underline"
              >
                Return to {parentDirectoryLabel} Directory →
              </a>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedCategories.map((rel) => (
                <a
                  key={rel.slug}
                  href={rel.archiveHref}
                  className="flex items-start gap-3.5 rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-5 transition-colors hover:border-[#28537D]"
                >
                  <CategoryIcon iconKey={rel.iconKey} />
                  <div className="min-w-0">
                    <h3 className="theme-info-heading font-serif text-base font-semibold text-[#24282B]">
                      {rel.label}
                    </h3>
                    <div className="theme-metadata mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#636A6F] tabular-nums">
                      <span>{rel.primaryCountLabel}</span>
                      {rel.secondaryCountLabel && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{rel.secondaryCountLabel}</span>
                        </>
                      )}
                    </div>
                    <p className="theme-body-sm mt-1.5 line-clamp-2 text-xs text-[#636A6F]">
                      {rel.description}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
