import React from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Clock,
  Compass,
  HeartHandshake,
  Sparkles,
  Tag,
  Users,
  Wallet,
} from 'lucide-react';
import {
  BudgetDiscoveryItem,
  EnrichedGiftGuide,
  InterestDiscoveryItem,
  OccasionDiscoveryItem,
  RECIPIENT_TAXONOMY_META,
  RecipientDiscoveryItem,
} from '../cms/contentRepository';
import { CategoryIcon } from './CategoryIcon';

export const MAX_CATEGORY_PREVIEW_ITEMS = 3;

export interface GiftGuidesDirectoryViewProps {
  allGuides: EnrichedGiftGuide[];
  primaryFeaturedGuide: EnrichedGiftGuide | null;
  supportingFeaturedGuides: EnrichedGiftGuide[];
  recipientDiscovery: RecipientDiscoveryItem[];
  interestDiscovery: InterestDiscoveryItem[];
  occasionDiscovery: OccasionDiscoveryItem[];
  budgetDiscovery: BudgetDiscoveryItem[];
  totalCanonicalProductsCount: number;
}

export const GiftGuidesDirectoryView: React.FC<
  GiftGuidesDirectoryViewProps
> = ({
  allGuides,
  primaryFeaturedGuide,
  supportingFeaturedGuides,
  recipientDiscovery,
  interestDiscovery,
  occasionDiscovery,
  budgetDiscovery,
  totalCanonicalProductsCount,
}) => {
  const hasSupportingFeatured = supportingFeaturedGuides.length > 0;

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24 text-[#24282B]">
      {/* =====================================================================
          A. EDITORIAL INTRODUCTION
         ===================================================================== */}
      <header className="border-b border-[#E3E1DB] bg-[#FAF9F6]">
        <div className="mx-auto max-w-[1360px] px-4 pt-6 sm:px-6 lg:px-8">
          {/* Top Breadcrumb Bar */}
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
                Gift Guides
              </span>
            </nav>

            <div className="theme-metadata flex flex-wrap items-center gap-2 text-xs text-[#636A6F] tabular-nums">
              <span className="font-medium text-[#24282B]">
                Editorial Directory
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {allGuides.length}{' '}
                {allGuides.length === 1 ? 'published guide' : 'published guides'}
              </span>
            </div>
          </div>

          {/* Restrained Editorial Masthead */}
          <div className="py-10 sm:py-12 lg:py-14">
            <p className="theme-kicker text-xs font-semibold uppercase tracking-widest text-[#28537D]">
              Science of Gifts · Curated Editions
            </p>
            <h1 className="theme-display-heading mt-2.5 font-serif text-3xl font-semibold leading-[1.12] tracking-tight text-[#24282B] sm:text-5xl">
              Gift Guides
            </h1>
            <p className="theme-intro-text mt-4 max-w-2xl text-lg leading-[1.62] text-[#636A6F] sm:text-xl">
              Thoughtful ideas for the people in your life, organized by what
              they love, who they are, and the occasions worth celebrating.
            </p>
          </div>

          {/* Directory Section Jump Navigation */}
          <nav
            aria-label="Gift guides directory sections"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#E3E1DB] py-3.5 text-xs font-medium text-[#636A6F]"
          >
            <span className="font-semibold text-[#24282B]">Explore:</span>
            {primaryFeaturedGuide && (
              <a
                href="#featured-gift-guides"
                className="hover:text-[#28537D] hover:underline underline-offset-4"
              >
                Featured Guide
              </a>
            )}
            <a
              href="#browse-gift-guides"
              className="hover:text-[#28537D] hover:underline underline-offset-4"
            >
              All Gift Guides ({allGuides.length})
            </a>
            {recipientDiscovery.length > 0 && (
              <a
                href="#browse-by-recipient"
                className="hover:text-[#28537D] hover:underline underline-offset-4"
              >
                By Recipient
              </a>
            )}
            {interestDiscovery.length > 0 && (
              <a
                href="#browse-by-interest"
                className="hover:text-[#28537D] hover:underline underline-offset-4"
              >
                By Interest
              </a>
            )}
            {occasionDiscovery.length > 0 && (
              <a
                href="#browse-by-occasion"
                className="hover:text-[#28537D] hover:underline underline-offset-4"
              >
                By Occasion
              </a>
            )}
            {budgetDiscovery.length > 0 && (
              <a
                href="#browse-by-budget"
                className="hover:text-[#28537D] hover:underline underline-offset-4"
              >
                By Budget
              </a>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1360px] space-y-20 px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        {/* ===================================================================
            B. FEATURED GIFT GUIDES
            Adapts gracefully: single flagship spread when 1 featured guide exists,
            or 1 primary + supporting cards when multiple featured guides exist.
           =================================================================== */}
        {primaryFeaturedGuide && (
          <section
            id="featured-gift-guides"
            aria-labelledby="heading-featured-gift-guides"
            className="scroll-mt-24"
          >
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E1DB] pb-4">
              <div>
                <p className="theme-kicker text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                  {hasSupportingFeatured
                    ? 'Editor’s Highlights'
                    : 'Flagship Cover Edition'}
                </p>
                <h2
                  id="heading-featured-gift-guides"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
                >
                  {hasSupportingFeatured
                    ? 'Featured Gift Guides'
                    : 'Featured Gift Guide'}
                </h2>
              </div>
              <span className="theme-metadata text-xs text-[#636A6F]">
                {primaryFeaturedGuide.guide.editorialIssueNumber ??
                  primaryFeaturedGuide.guide.category}
              </span>
            </div>

            <div
              className={`mt-8 grid grid-cols-1 gap-8 ${
                hasSupportingFeatured ? 'lg:grid-cols-12' : ''
              }`}
            >
              {/* Primary Featured Guide Spread */}
              <article
                className={`overflow-hidden rounded-3xl border border-[#E3E1DB] bg-[#FFFFFF] ${
                  hasSupportingFeatured ? 'lg:col-span-8' : ''
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12">
                  <div className="lg:col-span-6">
                    <a
                      href={`/gift-guides/${primaryFeaturedGuide.guide.slug}/`}
                      className="group block h-full min-h-[280px] w-full overflow-hidden bg-[#F6F4EF]"
                    >
                      <img
                        src={primaryFeaturedGuide.guide.heroImageUrl}
                        alt={primaryFeaturedGuide.guide.heroImageAlt}
                        width={840}
                        height={600}
                        loading="eager"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </a>
                  </div>

                  <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-6 lg:p-10">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="theme-kicker font-semibold text-[#28537D]">
                          {primaryFeaturedGuide.guide.category}
                        </span>
                        <span aria-hidden="true" className="text-[#C5C1B8]">
                          ·
                        </span>
                        <span className="theme-metadata text-[#636A6F] tabular-nums">
                          {primaryFeaturedGuide.totalRecommendationsCount} picks (
                          {primaryFeaturedGuide.priceRangeSummary})
                        </span>
                      </div>

                      <h3 className="theme-product-title-featured mt-3 font-serif text-2xl font-semibold leading-snug text-[#24282B] sm:text-3xl">
                        <a
                          href={`/gift-guides/${primaryFeaturedGuide.guide.slug}/`}
                          className="hover:text-[#28537D] transition-colors"
                        >
                          {primaryFeaturedGuide.guide.title}
                        </a>
                      </h3>

                      <p className="theme-body-text mt-3 text-[#24282B]">
                        {primaryFeaturedGuide.guide.subtitle}
                      </p>

                      {primaryFeaturedGuide.guide.curationSummary && (
                        <p className="theme-caption mt-3 rounded-xl border border-[#C6E4D6] bg-[#E5F3EC]/65 px-4 py-3 text-xs leading-relaxed text-[#24282B]">
                          <strong className="font-semibold text-[#1B3D5F]">
                            How this guide is organized:
                          </strong>{' '}
                          {primaryFeaturedGuide.guide.curationSummary}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 border-t border-[#E3E1DB] pt-5">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="theme-metadata flex flex-wrap items-center gap-3 text-xs text-[#636A6F]">
                          {primaryFeaturedGuide.author && (
                            <span className="font-medium text-[#24282B]">
                              By {primaryFeaturedGuide.author.name}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Calendar className="h-3.5 w-3.5 text-[#28537D]" />
                            Updated {primaryFeaturedGuide.guide.updatedAt}
                          </span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Clock className="h-3.5 w-3.5 text-[#28537D]" />
                            {primaryFeaturedGuide.guide.readTimeMinutes} min read
                          </span>
                        </div>

                        <a
                          href={`/gift-guides/${primaryFeaturedGuide.guide.slug}/`}
                          className="theme-btn-primary theme-button-text inline-flex items-center gap-2 rounded-lg bg-[#1B3D5F] px-5 py-2.5 text-xs font-semibold text-[#FFFFFF] transition-colors hover:bg-[#28537D]"
                        >
                          <span>Read Gift Guide</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              {/* Supporting Featured Guides (Rendered only when additional guides are marked featured) */}
              {hasSupportingFeatured && (
                <div className="space-y-6 lg:col-span-4">
                  {supportingFeaturedGuides.map((item) => (
                    <article
                      key={item.guide.id}
                      className="flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6"
                    >
                      <div>
                        <a
                          href={`/gift-guides/${item.guide.slug}/`}
                          className="group block aspect-[16/10] w-full overflow-hidden rounded-xl bg-[#F6F4EF]"
                        >
                          <img
                            src={item.guide.heroImageUrl}
                            alt={item.guide.heroImageAlt}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        </a>
                        <div className="mt-4 flex items-center gap-2 text-xs">
                          <span className="theme-kicker font-semibold text-[#28537D]">
                            {item.guide.category}
                          </span>
                          <span aria-hidden="true" className="text-[#C5C1B8]">
                            ·
                          </span>
                          <span className="theme-metadata text-[#636A6F] tabular-nums">
                            {item.totalRecommendationsCount} picks
                          </span>
                        </div>
                        <h3 className="theme-subsection-heading mt-1.5 font-serif text-xl font-semibold text-[#24282B]">
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

                      <div className="mt-4 border-t border-[#E3E1DB] pt-3">
                        <a
                          href={`/gift-guides/${item.guide.slug}/`}
                          className="theme-link inline-flex items-center gap-1 text-xs font-semibold text-[#28537D] hover:text-[#1B3D5F]"
                        >
                          <span>Explore guide</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===================================================================
            C. BROWSE GIFT GUIDES (Complete Published Directory)
           =================================================================== */}
        <section
          id="browse-gift-guides"
          aria-labelledby="heading-browse-gift-guides"
          className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="theme-kicker text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                Complete Editorial Index
              </p>
              <h2
                id="heading-browse-gift-guides"
                className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
              >
                Browse Gift Guides
              </h2>
              <p className="theme-body-sm mt-1.5 max-w-2xl text-[#636A6F]">
                Every published guide on Science of Gifts, organized with tiered
                budgets, candid buying considerations, and recipient pathways.
              </p>
            </div>
          </div>

          {allGuides.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-8 text-left">
              <h3 className="theme-subsection-heading font-serif text-xl font-semibold text-[#24282B]">
                No gift guides are currently published
              </h3>
              <p className="theme-body-text mt-2 text-[#636A6F]">
                You can still search our canonical product catalog directly in the{' '}
                <a
                  href="/gift-finder/"
                  className="theme-link font-semibold text-[#28537D] underline"
                >
                  Interactive Gift Finder
                </a>
                .
              </p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
              {allGuides.map((item) => {
                const { guide, author } = item;
                const editorsPickProduct = item.referencedProducts.find(
                  (p) => p.id === guide.editorsPick.productId
                );

                return (
                  <article
                    key={guide.id}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] transition-colors hover:border-[#C5C1B8]"
                  >
                    <div>
                      <a
                        href={`/gift-guides/${guide.slug}/`}
                        className="group block aspect-[16/10] w-full overflow-hidden bg-[#F6F4EF]"
                      >
                        <img
                          src={guide.heroImageUrl}
                          alt={guide.heroImageAlt}
                          width={720}
                          height={450}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </a>

                      <div className="p-6 sm:p-7">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="theme-kicker font-semibold text-[#28537D]">
                            {guide.category}
                          </span>
                          <span className="theme-metadata font-medium text-[#636A6F] tabular-nums">
                            {item.totalRecommendationsCount} picks ·{' '}
                            {item.priceRangeSummary}
                          </span>
                        </div>

                        <h3 className="theme-subsection-heading mt-2 font-serif text-xl font-semibold leading-snug text-[#24282B] sm:text-2xl">
                          <a
                            href={`/gift-guides/${guide.slug}/`}
                            className="hover:text-[#28537D] hover:underline"
                          >
                            {guide.title}
                          </a>
                        </h3>

                        <p className="theme-body-text mt-2.5 text-[#24282B]">
                          {guide.subtitle}
                        </p>

                        {/* Recipient & Interest Classification Pills */}
                        <div className="mt-4 flex flex-wrap items-center gap-1.5">
                          {item.recipients.slice(0, 4).map((recKey) => (
                            <span
                              key={recKey}
                              className="rounded-md border border-[#E3E1DB] bg-[#FAF9F6] px-2.5 py-1 text-[11px] font-medium text-[#636A6F]"
                            >
                              For {RECIPIENT_TAXONOMY_META[recKey]?.shortLabel ?? recKey}
                            </span>
                          ))}
                          {item.interests.slice(0, 2).map((interest) => (
                            <span
                              key={interest}
                              className="rounded-md bg-[#E5F3EC] px-2.5 py-1 text-[11px] font-medium text-[#1B3D5F]"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>

                        {/* Standout Pick Preview inside Guide Card */}
                        {editorsPickProduct && (
                          <div className="mt-5 rounded-xl border border-[#E3E1DB] bg-[#FAF9F6] p-3.5 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 font-semibold text-[#1B3D5F]">
                                <Award className="h-3.5 w-3.5 text-[#28537D]" />
                                {guide.editorsPick.kicker || 'Editor’s Pick'}:{' '}
                                {editorsPickProduct.title}
                              </span>
                              <span className="font-semibold text-[#24282B] tabular-nums">
                                ${editorsPickProduct.price}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E3E1DB] bg-[#FAF9F6]/60 px-6 py-4 text-xs sm:px-7">
                      <div className="theme-metadata flex flex-wrap items-center gap-2 text-[#636A6F]">
                        {author && (
                          <span className="font-medium text-[#24282B]">
                            {author.name}
                          </span>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          Updated {guide.updatedAt}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {guide.readTimeMinutes} min read
                        </span>
                      </div>

                      <a
                        href={`/gift-guides/${guide.slug}/`}
                        className="theme-link inline-flex items-center gap-1.5 font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                      >
                        <span>Read Guide</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ===================================================================
            D. BROWSE BY RECIPIENT
           =================================================================== */}
        {recipientDiscovery.length > 0 && (
          <section
            id="browse-by-recipient"
            aria-labelledby="heading-browse-by-recipient"
            className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                  <Users className="h-3.5 w-3.5" />
                  <span>Recipient Taxonomy</span>
                </p>
                <h2
                  id="heading-browse-by-recipient"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
                >
                  Browse by Recipient
                </h2>
                <p className="theme-body-sm mt-1.5 max-w-2xl text-[#636A6F]">
                  Explore guides and verified catalog recommendations tailored to
                  the relationship you are celebrating.
                </p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recipientDiscovery.map((item) => {
                const previewGuides = item.matchingGuides.slice(
                  0,
                  MAX_CATEGORY_PREVIEW_ITEMS
                );
                const hasMoreGuides =
                  item.matchingGuides.length > MAX_CATEGORY_PREVIEW_ITEMS;

                return (
                  <div
                    key={item.recipient}
                    id={`recipient-${item.recipient}`}
                    className="flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <CategoryIcon iconKey={item.iconKey} />
                          <div>
                            <h3 className="theme-subsection-heading font-serif text-lg font-semibold text-[#24282B]">
                              <a
                                href={item.archiveHref}
                                className="hover:text-[#28537D] hover:underline"
                              >
                                {item.label}
                              </a>
                            </h3>
                            <div className="theme-metadata mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#636A6F] tabular-nums">
                              <span>
                                {item.matchingGuides.length}{' '}
                                {item.matchingGuides.length === 1
                                  ? 'guide'
                                  : 'guides'}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {item.productCount}{' '}
                                {item.productCount === 1 ? 'gift' : 'gifts'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="theme-body-sm mt-3 text-[#636A6F]">
                        {item.description}
                      </p>

                      {previewGuides.length > 0 && (
                        <div className="mt-4 border-t border-[#E3E1DB] pt-3.5">
                          <div className="theme-info-label text-xs font-semibold text-[#24282B]">
                            Featured in guides:
                          </div>
                          <ul className="mt-2 space-y-1.5 text-xs">
                            {previewGuides.map((g) => (
                              <li key={g.guide.id}>
                                <a
                                  href={`/gift-guides/${g.guide.slug}/`}
                                  className="theme-link font-medium text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                                >
                                  {g.guide.title} →
                                </a>
                              </li>
                            ))}
                          </ul>
                          {hasMoreGuides && (
                            <div className="mt-2.5">
                              <a
                                href={item.archiveHref}
                                className="theme-link inline-flex items-center gap-1 text-xs font-semibold text-[#1B3D5F] hover:text-[#28537D] hover:underline"
                              >
                                <span>
                                  View all {item.matchingGuides.length} guides
                                </span>
                                <ArrowRight className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E3E1DB] pt-3.5 text-xs">
                      <a
                        href={item.archiveHref}
                        className="theme-link inline-flex items-center gap-1 font-semibold text-[#1B3D5F] hover:text-[#28537D] hover:underline"
                      >
                        <span>View {item.shortLabel} archive</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={item.finderHref}
                        className="theme-link text-[#636A6F] hover:text-[#28537D] hover:underline"
                      >
                        Browse all {item.shortLabel.toLowerCase()} gifts in Gift
                        Finder
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ===================================================================
            E. BROWSE BY INTEREST
           =================================================================== */}
        {interestDiscovery.length > 0 && (
          <section
            id="browse-by-interest"
            aria-labelledby="heading-browse-by-interest"
            className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
          >
            <div>
              <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                <Tag className="h-3.5 w-3.5" />
                <span>Interests & Rituals</span>
              </p>
              <h2
                id="heading-browse-by-interest"
                className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
              >
                Browse by Interest
              </h2>
              <p className="theme-body-sm mt-1.5 max-w-2xl text-[#636A6F]">
                Find gifts anchored in what they genuinely love doing on an
                ordinary weekend or weekday morning.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {interestDiscovery.map((item) => {
                const previewGuides = item.matchingGuides.slice(
                  0,
                  MAX_CATEGORY_PREVIEW_ITEMS
                );
                const hasMoreGuides =
                  item.matchingGuides.length > MAX_CATEGORY_PREVIEW_ITEMS;

                return (
                  <div
                    key={item.interest}
                    className="flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-5"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <CategoryIcon iconKey={item.iconKey} />
                        <div className="min-w-0">
                          <h3 className="theme-info-heading font-serif text-base font-semibold text-[#24282B]">
                            <a
                              href={item.archiveHref}
                              className="hover:text-[#28537D] hover:underline"
                            >
                              {item.label}
                            </a>
                          </h3>
                          <div className="theme-metadata mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#636A6F] tabular-nums">
                            <span>
                              {item.matchingGuides.length}{' '}
                              {item.matchingGuides.length === 1
                                ? 'guide'
                                : 'guides'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {item.productCount}{' '}
                              {item.productCount === 1 ? 'find' : 'finds'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="theme-body-sm mt-3 text-xs text-[#636A6F]">
                        {item.description}
                      </p>

                      {previewGuides.length > 0 && (
                        <div className="mt-3.5 border-t border-[#E3E1DB] pt-2.5 text-xs">
                          <div className="text-[11px] font-semibold text-[#24282B]">
                            Related guides:
                          </div>
                          <ul className="mt-1.5 space-y-1">
                            {previewGuides.map((g) => (
                              <li key={g.guide.id}>
                                <a
                                  href={`/gift-guides/${g.guide.slug}/`}
                                  className="theme-link font-medium text-[#28537D] hover:underline"
                                >
                                  {g.guide.category} →
                                </a>
                              </li>
                            ))}
                          </ul>
                          {hasMoreGuides && (
                            <a
                              href={item.archiveHref}
                              className="theme-link mt-1.5 inline-block text-[11px] font-semibold text-[#1B3D5F] hover:underline"
                            >
                              View all {item.matchingGuides.length} guides →
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E3E1DB] pt-3 text-xs">
                      <a
                        href={item.archiveHref}
                        className="theme-link inline-flex items-center gap-1 font-semibold text-[#1B3D5F] hover:text-[#28537D] hover:underline"
                      >
                        <span>View archive</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={item.finderHref}
                        className="theme-link text-[#636A6F] hover:text-[#28537D] hover:underline"
                      >
                        Explore {item.label} gifts
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ===================================================================
            F. BROWSE BY OCCASION
           =================================================================== */}
        {occasionDiscovery.length > 0 && (
          <section
            id="browse-by-occasion"
            aria-labelledby="heading-browse-by-occasion"
            className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
          >
            <div>
              <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                <HeartHandshake className="h-3.5 w-3.5" />
                <span>Celebrations & Milestones</span>
              </p>
              <h2
                id="heading-browse-by-occasion"
                className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
              >
                Browse by Occasion
              </h2>
              <p className="theme-body-sm mt-1.5 max-w-2xl text-[#636A6F]">
                Match the tone of the moment, from unannounced thank-you gestures
                to milestone birthdays and housewarmings.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {occasionDiscovery.map((item) => {
                const previewGuides = item.matchingGuides.slice(
                  0,
                  MAX_CATEGORY_PREVIEW_ITEMS
                );
                const hasMoreGuides =
                  item.matchingGuides.length > MAX_CATEGORY_PREVIEW_ITEMS;

                return (
                  <div
                    key={item.occasion}
                    className="flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FAF9F6] p-5 sm:p-6"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <CategoryIcon iconKey={item.iconKey} />
                        <div>
                          <h3 className="theme-subsection-heading font-serif text-lg font-semibold text-[#24282B]">
                            <a
                              href={item.archiveHref}
                              className="hover:text-[#28537D] hover:underline"
                            >
                              {item.label}
                            </a>
                          </h3>
                          <div className="theme-metadata mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#636A6F] tabular-nums">
                            <span>
                              {item.matchingGuides.length}{' '}
                              {item.matchingGuides.length === 1
                                ? 'guide'
                                : 'guides'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{item.productCount} eligible gifts</span>
                          </div>
                        </div>
                      </div>
                      <p className="theme-body-sm mt-3 text-[#636A6F]">
                        {item.description}
                      </p>

                      {previewGuides.length > 0 && (
                        <div className="mt-4 border-t border-[#E3E1DB] pt-3 text-xs">
                          <div className="theme-info-label text-xs font-semibold text-[#24282B]">
                            Featured guides:
                          </div>
                          <ul className="mt-1.5 space-y-1.5">
                            {previewGuides.map((g) => (
                              <li key={g.guide.id}>
                                <a
                                  href={`/gift-guides/${g.guide.slug}/`}
                                  className="theme-link font-medium text-[#28537D] hover:underline"
                                >
                                  {g.guide.title} →
                                </a>
                              </li>
                            ))}
                          </ul>
                          {hasMoreGuides && (
                            <a
                              href={item.archiveHref}
                              className="theme-link mt-2 inline-block text-xs font-semibold text-[#1B3D5F] hover:underline"
                            >
                              View all {item.matchingGuides.length} guides →
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E3E1DB] pt-3.5 text-xs">
                      <a
                        href={item.archiveHref}
                        className="theme-link inline-flex items-center gap-1 font-semibold text-[#1B3D5F] hover:text-[#28537D] hover:underline"
                      >
                        <span>View {item.label} archive</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={item.finderHref}
                        className="theme-link text-[#636A6F] hover:text-[#28537D] hover:underline"
                      >
                        Filter by {item.label}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ===================================================================
            G. BROWSE BY BUDGET
           =================================================================== */}
        {budgetDiscovery.length > 0 && (
          <section
            id="browse-by-budget"
            aria-labelledby="heading-browse-by-budget"
            className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
          >
            <div>
              <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                <Wallet className="h-3.5 w-3.5" />
                <span>Verified Price Brackets</span>
              </p>
              <h2
                id="heading-browse-by-budget"
                className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
              >
                Browse by Budget
              </h2>
              <p className="theme-body-sm mt-1.5 max-w-2xl text-[#636A6F]">
                Behavioral research shows that thoughtfulness—not spend—drives
                recipient gratitude. Open our Gift Finder with strict, verified
                price bounds applied.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {budgetDiscovery.map((item) => (
                <a
                  key={item.id}
                  href={item.finderHref}
                  className="group flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 transition-colors hover:border-[#28537D]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="theme-kicker text-xs font-semibold text-[#28537D]">
                        {item.rangeSummary}
                      </span>
                      <span className="rounded-full bg-[#E5F3EC] px-2.5 py-0.5 text-[11px] font-semibold text-[#1B3D5F] tabular-nums">
                        {item.productCount}{' '}
                        {item.productCount === 1 ? 'gift' : 'gifts'}
                      </span>
                    </div>
                    <h3 className="theme-subsection-heading mt-2 font-serif text-xl font-semibold text-[#24282B] group-hover:text-[#28537D]">
                      {item.label}
                    </h3>
                    <p className="theme-body-sm mt-2 text-xs text-[#636A6F]">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[#E3E1DB] pt-3.5 text-xs font-semibold text-[#28537D] group-hover:text-[#1B3D5F]">
                    <span>Explore {item.label} in Finder</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ===================================================================
            H. GIFT FINDER DISCOVERY FEATURE
           =================================================================== */}
        <section
          id="gift-finder-feature"
          aria-labelledby="heading-gift-finder-feature"
          className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
        >
          <div className="rounded-3xl border border-[#C6E4D6] bg-[#E5F3EC]/70 p-8 sm:p-10 lg:p-12">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-8">
                <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#1B3D5F]">
                  <Compass className="h-4 w-4 text-[#28537D]" />
                  <span>Interactive Catalog Concierge</span>
                </p>
                <h2
                  id="heading-gift-finder-feature"
                  className="theme-section-heading mt-2 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
                >
                  Looking for a Specific Combination of Recipient, Interest, and Budget?
                </h2>
                <p className="theme-body-text theme-reading-measure mt-3 text-[#24282B]">
                  While our editorial guides curate objects around a single
                  theme, the Science of Gifts Interactive Gift Finder lets you
                  search across all {totalCanonicalProductsCount} canonical
                  catalog gifts at once—combining recipient relationship,
                  hobbies, occasion, gift style, and strict maximum price caps.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-[#24282B]">
                  <span className="font-semibold text-[#1B3D5F]">
                    Filter simultaneously by:
                  </span>
                  <span className="rounded-md border border-[#C6E4D6] bg-[#FFFFFF] px-2.5 py-1">
                    Recipient
                  </span>
                  <span className="rounded-md border border-[#C6E4D6] bg-[#FFFFFF] px-2.5 py-1">
                    Interests & Hobbies
                  </span>
                  <span className="rounded-md border border-[#C6E4D6] bg-[#FFFFFF] px-2.5 py-1">
                    Strict Budget Caps
                  </span>
                  <span className="rounded-md border border-[#C6E4D6] bg-[#FFFFFF] px-2.5 py-1">
                    Occasion
                  </span>
                  <span className="rounded-md border border-[#C6E4D6] bg-[#FFFFFF] px-2.5 py-1">
                    5-Step Guided Quiz
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 lg:col-span-4 lg:items-end">
                <a
                  href="/gift-finder/"
                  className="theme-btn-primary theme-button-text inline-flex items-center gap-2 rounded-lg bg-[#1B3D5F] px-6 py-3.5 text-xs font-semibold text-[#FFFFFF] transition-colors hover:bg-[#28537D]"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Open the Interactive Gift Finder</span>
                </a>
                <a
                  href="/articles/"
                  className="theme-link inline-flex items-center gap-1.5 text-xs font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Or read our Stories on the psychology of giving →</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
