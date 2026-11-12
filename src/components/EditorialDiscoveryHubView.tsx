import React from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Eye,
  Heart,
  HeartHandshake,
  Info,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  Wallet,
} from 'lucide-react';
import {
  EnrichedEditorialHub,
  RECIPIENT_TAXONOMY_META,
} from '../cms/contentRepository';
import { Product } from '../types/content';
import { hasValidNumericPrice } from '../utils/giftFinderEngine';
import { CategoryIcon } from './CategoryIcon';
import { PhotoImage } from './ObjectIllustrations';

export interface EditorialDiscoveryHubViewProps {
  enrichedHub: EnrichedEditorialHub;
  savedProductIds?: string[];
  onToggleSave?: (productId: string) => void;
  onSelectProduct?: (product: Product) => void;
}

export const EditorialDiscoveryHubView: React.FC<
  EditorialDiscoveryHubViewProps
> = ({
  enrichedHub,
  savedProductIds = [],
  onToggleSave,
  onSelectProduct,
}) => {
  const {
    hub,
    readiness,
    relationships,
    interests,
    budgets,
    occasions,
    leadFeaturedGuide,
    supportingFeaturedGuides,
    allCuratedGuides,
    curatedProducts,
    relatedArticles,
    recipientArchives,
    companionHub,
  } = enrichedHub;

  const isHimHub = hub.slug === 'gifts-for-men' || hub.slug === 'gifts-for-him';
  const seasonalOccasionCallouts = isHimHub
    ? [
        {
          label: 'Father’s Day & Parent Milestones',
          note: 'Explore parent-focused everyday upgrades and clutter-free culinary flights in our Parents & In-Laws archive.',
          href: '/gift-guides/recipients/parent/',
          finderHref: '/gift-finder/?recipient=parent',
        },
        {
          label: 'Valentine’s Day & Romantic Milestones',
          note: 'Skip novelty clichés and browse tactile bedside glassware, Turkish cotton robes, and custom night-sky star charts.',
          href: '/gift-guides/occasions/anniversary/',
          finderHref: '/gift-finder/?recipient=partner&occasion=anniversary',
        },
        {
          label: 'Graduations, Promotions & Retirement',
          note: 'Filter by milestone birthdays, desk-ready objects, and heirloom keepsakes built for the next chapter.',
          href: '/gift-guides/occasions/birthday/',
          finderHref: '/gift-finder/?occasion=birthday&minPrice=50',
        },
      ]
    : [
        {
          label: 'Mother’s Day & Family Celebrations',
          note: 'Discover clutter-free artisan tastings, handwritten cotton recipe cards, and merino wool throws in our Parents archive.',
          href: '/gift-guides/recipients/parent/',
          finderHref: '/gift-finder/?recipient=parent',
        },
        {
          label: 'Valentine’s Day & Anniversaries',
          note: 'Browse custom framed constellation prints, garment-washed waffle robes, and shared morning tea rituals.',
          href: '/gift-guides/occasions/anniversary/',
          finderHref: '/gift-finder/?recipient=partner&occasion=anniversary',
        },
        {
          label: 'Graduations, New Homes & Milestones',
          note: 'Explore five-year daily time-capsule journals, windowsill herb trios, and lasting housewarming upgrades.',
          href: '/gift-guides/occasions/housewarming/',
          finderHref: '/gift-finder/?occasion=housewarming',
        },
      ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24 text-[#24282B]">
      {/* =====================================================================
          1. EDITORIAL HERO SECTION
         ===================================================================== */}
      <header className="border-b border-[#E3E1DB] bg-[#FAF9F6]">
        <div className="mx-auto max-w-[1360px] px-4 pt-6 sm:px-6 lg:px-8">
          {/* Top Breadcrumb & Status Bar */}
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
                href="/gift-guides/"
                className="text-[#636A6F] transition-colors hover:text-[#28537D]"
              >
                Gift Guides
              </a>
              <span aria-hidden="true" className="text-[#C5C1B8]">
                /
              </span>
              <span
                aria-current="page"
                className="font-semibold text-[#24282B]"
              >
                {hub.title}
              </span>
            </nav>

            <div className="theme-metadata flex flex-wrap items-center gap-2 text-xs text-[#636A6F] tabular-nums">
              <span className="font-medium text-[#24282B]">
                Editorial Discovery Hub
              </span>
              <span aria-hidden="true">·</span>
              <span>{relationships.length} relationship pathways</span>
              <span aria-hidden="true">·</span>
              <span>
                {allCuratedGuides.length}{' '}
                {allCuratedGuides.length === 1 ? 'curated guide' : 'curated guides'}
              </span>
              {!readiness.isIndexable && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="rounded-md border border-[#E6C786] bg-[#FFF8E7] px-2 py-0.5 text-[11px] font-semibold text-[#6E4D11]">
                    Preview Mode (noindex)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Editorial Masthead & Optional Hero Image Composition */}
          <div className="grid grid-cols-1 items-center gap-8 py-10 sm:py-12 lg:grid-cols-12 lg:gap-12 lg:py-14">
            <div className={hub.heroImage ? 'lg:col-span-7' : 'lg:col-span-10'}>
              <p className="theme-kicker text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                {hub.editorialKicker ?? `Science of Gifts · ${hub.title}`}
              </p>
              <h1 className="theme-display-heading mt-2.5 font-serif text-3xl font-semibold leading-[1.12] tracking-tight text-[#24282B] sm:text-5xl">
                {hub.title}
              </h1>
              <p className="theme-intro-text mt-4 max-w-2xl text-lg leading-[1.62] text-[#24282B] sm:text-xl">
                {hub.subtitle}
              </p>

              {hub.editorialLeadParagraphs &&
                hub.editorialLeadParagraphs.length > 0 && (
                  <div className="mt-4 max-w-2xl space-y-3 text-sm leading-relaxed text-[#636A6F] sm:text-base">
                    {hub.editorialLeadParagraphs.map((paragraph, idx) => (
                      <p key={idx} className="theme-body-text">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href={hub.finderCta?.primaryHref ?? '/gift-finder/'}
                  className="theme-btn-primary theme-button-text inline-flex items-center gap-2 rounded-lg bg-[#1B3D5F] px-5 py-3 text-xs font-semibold text-[#FFFFFF] transition-colors hover:bg-[#28537D]"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    {hub.finderCta?.primaryLabel ?? 'Open the Gift Finder'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>

                <a
                  href="#browse-by-relationship"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-4 py-3 text-xs font-semibold text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
                >
                  <span>Browse by Relationship</span>
                </a>

                {companionHub && (
                  <a
                    href={companionHub.routePath}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                  >
                    <span>Explore {companionHub.title}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {hub.heroImage && (
              <figure className="lg:col-span-5">
                <div className="overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#F6F4EF]">
                  <PhotoImage
                    src={hub.heroImage.url}
                    alt={hub.heroImage.alt}
                    preset="hero-landscape"
                    aspectRatio="16:10"
                    loading="eager"
                    fetchPriority="high"
                    className="aspect-[16/10] w-full object-cover"
                  />
                </div>
                {hub.heroImage.caption && (
                  <figcaption className="theme-caption mt-2.5 text-xs leading-relaxed text-[#636A6F]">
                    {hub.heroImage.caption}
                  </figcaption>
                )}
              </figure>
            )}
          </div>

          {/* Quick Jump Section Navigation */}
          <nav
            aria-label={`${hub.title} hub sections`}
            className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#E3E1DB] py-3.5 text-xs font-medium text-[#636A6F]"
          >
            <span className="font-semibold text-[#24282B]">Jump to:</span>
            <a
              href="#browse-by-relationship"
              className="hover:text-[#28537D] hover:underline underline-offset-4"
            >
              By Relationship ({relationships.length})
            </a>
            {interests.length > 0 && (
              <a
                href="#browse-by-interest"
                className="hover:text-[#28537D] hover:underline underline-offset-4"
              >
                By Interest ({interests.length})
              </a>
            )}
            {budgets.length > 0 && (
              <a
                href="#browse-by-budget"
                className="hover:text-[#28537D] hover:underline underline-offset-4"
              >
                By Budget ({budgets.length})
              </a>
            )}
            {occasions.length > 0 && (
              <a
                href="#browse-by-occasion"
                className="hover:text-[#28537D] hover:underline underline-offset-4"
              >
                By Occasion ({occasions.length})
              </a>
            )}
            {allCuratedGuides.length > 0 && (
              <a
                href="#featured-gift-guides"
                className="hover:text-[#28537D] hover:underline underline-offset-4"
              >
                Featured Guides ({allCuratedGuides.length})
              </a>
            )}
            {curatedProducts.length > 0 && (
              <a
                href="#featured-individual-gifts"
                className="hover:text-[#28537D] hover:underline underline-offset-4"
              >
                Curated Gifts ({curatedProducts.length})
              </a>
            )}
            <a
              href="#editorial-buying-advice"
              className="hover:text-[#28537D] hover:underline underline-offset-4"
            >
              Buying Advice
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1360px] space-y-20 px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        {/* ===================================================================
            2. BROWSE BY RELATIONSHIP
           =================================================================== */}
        <section
          id="browse-by-relationship"
          aria-labelledby="heading-hub-relationships"
          className="scroll-mt-24"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E1DB] pb-4">
            <div>
              <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                <Users className="h-3.5 w-3.5" />
                <span>Relationship Closeness & Context</span>
              </p>
              <h2
                id="heading-hub-relationships"
                className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
              >
                Browse by Relationship
              </h2>
              <p className="theme-body-sm mt-1.5 max-w-2xl text-[#636A6F]">
                The right gift depends first on how well you know someone and the
                daily life you share. Start with the relationship below to open
                curated recipient archives or pre-filtered Gift Finder views.
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {relationships.map((rel) => {
              const {
                pathway,
                iconKey,
                archiveHref,
                giftFinderHref,
                matchingGuideCount,
                matchingProductCount,
              } = rel;
              const taxonomyLabel = pathway.recipientFilter
                ? RECIPIENT_TAXONOMY_META[pathway.recipientFilter]?.label ??
                  pathway.recipientFilter
                : pathway.label;

              return (
                <article
                  key={pathway.id}
                  id={`relationship-${pathway.relationshipSlug}`}
                  className="sog-directory-card flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 transition-colors hover:border-[#C5C1B8]"
                >
                  <div>
                    <div className="flex items-start gap-3.5">
                      <CategoryIcon iconKey={iconKey} />
                      <div className="min-w-0">
                        <h3 className="theme-subsection-heading font-serif text-lg font-semibold text-[#24282B]">
                          <a
                            href={giftFinderHref}
                            className="hover:text-[#28537D] hover:underline"
                          >
                            {pathway.label}
                          </a>
                        </h3>
                        <div className="theme-metadata mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#636A6F] tabular-nums">
                          <span>
                            {matchingGuideCount}{' '}
                            {matchingGuideCount === 1 ? 'guide' : 'guides'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {matchingProductCount}{' '}
                            {matchingProductCount === 1
                              ? 'catalog find'
                              : 'catalog finds'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="theme-body-sm mt-3.5 text-[#24282B]">
                      {pathway.description}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E3E1DB] pt-3.5 text-xs">
                    <a
                      href={giftFinderHref}
                      className="theme-link inline-flex items-center gap-1 font-semibold text-[#1B3D5F] hover:text-[#28537D] hover:underline"
                    >
                      <span>
                        Filter {pathway.shortLabel ?? pathway.label} gifts
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={archiveHref}
                      className="theme-link text-[#636A6F] hover:text-[#28537D] hover:underline"
                    >
                      {taxonomyLabel} archive
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ===================================================================
            3. BROWSE BY INTEREST
           =================================================================== */}
        {interests.length > 0 && (
          <section
            id="browse-by-interest"
            aria-labelledby="heading-hub-interests"
            className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                  <Tag className="h-3.5 w-3.5" />
                  <span>Daily Routines, Hobbies & Craft</span>
                </p>
                <h2
                  id="heading-hub-interests"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
                >
                  Browse by Interest
                </h2>
                <p className="theme-body-sm mt-1.5 max-w-2xl text-[#636A6F]">
                  Instead of shopping by broad demographic clichés, anchor your
                  choice in a concrete ritual—from morning pour-over coffee and
                  sourdough baking to gardening, reading, and tabletop games.
                </p>
              </div>
              <a
                href="/gift-guides/#browse-by-interest"
                className="theme-link inline-flex items-center gap-1 text-xs font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
              >
                <span>All interest archives</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {interests.map((item) => {
                const previewProduct = item.matchingProducts[0];
                return (
                  <article
                    key={item.slug}
                    className="sog-directory-card flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-5 transition-colors hover:border-[#C5C1B8]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <CategoryIcon iconKey={item.iconKey} />
                          <div>
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

                        {previewProduct && previewProduct.images[0] && (
                          <a
                            href={item.archiveHref}
                            aria-label={`Explore ${item.label} gifts`}
                            className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#E3E1DB] bg-[#F6F4EF]"
                          >
                            <PhotoImage
                              image={previewProduct.images[0]}
                              src={previewProduct.images[0].url}
                              alt={previewProduct.images[0].alt}
                              preset="thumbnail-sm"
                              aspectRatio="1:1"
                              className="h-full w-full object-cover"
                            />
                          </a>
                        )}
                      </div>

                      <p className="theme-body-sm mt-3 text-xs leading-relaxed text-[#636A6F]">
                        {item.description}
                      </p>
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
                        Filter in Finder
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ===================================================================
            4. BROWSE BY BUDGET
           =================================================================== */}
        {budgets.length > 0 && (
          <section
            id="browse-by-budget"
            aria-labelledby="heading-hub-budgets"
            className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
          >
            <div>
              <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                <Wallet className="h-3.5 w-3.5" />
                <span>Verified Price Brackets</span>
              </p>
              <h2
                id="heading-hub-budgets"
                className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
              >
                Browse by Budget
              </h2>
              <p className="theme-body-sm mt-1.5 max-w-2xl text-[#636A6F]">
                Empirical research consistently finds that recipient appreciation
                tracks thoughtfulness rather than price tag. Each bracket below
                applies strict price bounds to verified catalog items—and links
                separately to our curated editorial budget guides.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {budgets.map((item) => {
                const {
                  bracket,
                  matchingProductCount,
                  featuredGuide,
                } = item;

                return (
                  <article
                    key={bracket.id}
                    className="sog-directory-card flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 transition-colors hover:border-[#28537D]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="theme-kicker text-xs font-semibold text-[#28537D]">
                          {bracket.priceRangeLabel}
                        </span>
                        {matchingProductCount > 0 && (
                          <span className="rounded-md border border-[#C6E4D6] bg-[#E5F3EC] px-2.5 py-0.5 text-[11px] font-semibold text-[#1B3D5F] tabular-nums">
                            {matchingProductCount}{' '}
                            {matchingProductCount === 1
                              ? 'verified gift'
                              : 'verified gifts'}
                          </span>
                        )}
                      </div>

                      <h3 className="theme-subsection-heading mt-2 font-serif text-xl font-semibold text-[#24282B]">
                        <a
                          href={bracket.giftFinderHref}
                          className="hover:text-[#28537D] hover:underline"
                        >
                          {bracket.label}
                        </a>
                      </h3>

                      <p className="theme-body-sm mt-2 text-xs leading-relaxed text-[#636A6F]">
                        {bracket.description}
                      </p>

                      {featuredGuide && (
                        <div className="mt-4 rounded-xl border border-[#E3E1DB] bg-[#FAF9F6] p-3 text-xs">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#636A6F]">
                            Dedicated Editorial Guide
                          </div>
                          <a
                            href={`/gift-guides/${featuredGuide.guide.slug}/`}
                            className="theme-link mt-1 block font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                          >
                            {featuredGuide.guide.title} →
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 border-t border-[#E3E1DB] pt-3.5 text-xs">
                      <a
                        href={bracket.giftFinderHref}
                        className="theme-link inline-flex items-center justify-between w-full font-semibold text-[#1B3D5F] hover:text-[#28537D] hover:underline"
                      >
                        <span>Filter {bracket.label} in Gift Finder</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ===================================================================
            5. BROWSE BY OCCASION
           =================================================================== */}
        {occasions.length > 0 && (
          <section
            id="browse-by-occasion"
            aria-labelledby="heading-hub-occasions"
            className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
          >
            <div>
              <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                <HeartHandshake className="h-3.5 w-3.5" />
                <span>Celebrations, Holidays & Milestones</span>
              </p>
              <h2
                id="heading-hub-occasions"
                className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
              >
                Browse by Occasion
              </h2>
              <p className="theme-body-sm mt-1.5 max-w-2xl text-[#636A6F]">
                Match the weight of the moment—from milestone birthdays,
                anniversaries, and winter holidays to low-pressure thank-you and
                weekday gestures.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {occasions.map((item) => (
                <article
                  key={item.occasion}
                  className="sog-directory-card flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-5 sm:p-6"
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
                      Filter in Gift Finder
                    </a>
                  </div>
                </article>
              ))}
            </div>

            {/* Seasonal & Milestone Guidance Callout */}
            <div className="mt-6 rounded-2xl border border-[#E3E1DB] bg-[#F6F4EF] p-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                Seasonal & Milestone Shortcuts
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {seasonalOccasionCallouts.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col justify-between rounded-xl border border-[#E3E1DB] bg-[#FFFFFF] p-4"
                  >
                    <div>
                      <h3 className="font-serif text-base font-semibold text-[#24282B]">
                        {item.label}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#636A6F]">
                        {item.note}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-[#E3E1DB] pt-2.5 text-xs">
                      <a
                        href={item.href}
                        className="font-semibold text-[#1B3D5F] hover:text-[#28537D] hover:underline"
                      >
                        Editorial archive →
                      </a>
                      <a
                        href={item.finderHref}
                        className="text-[#636A6F] hover:text-[#28537D] hover:underline"
                      >
                        Filter gifts
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ===================================================================
            6. FEATURED EDITORIAL GIFT GUIDES
           =================================================================== */}
        {leadFeaturedGuide && (
          <section
            id="featured-gift-guides"
            aria-labelledby="heading-hub-featured-guides"
            className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
          >
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E1DB] pb-4">
              <div>
                <p className="theme-kicker text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                  Curated Editorial Editions
                </p>
                <h2
                  id="heading-hub-featured-guides"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
                >
                  Featured Gift Guides for {isHimHub ? 'Him' : 'Her'}
                </h2>
                <p className="theme-body-sm mt-1.5 max-w-2xl text-[#636A6F]">
                  In-depth buying guides with side-by-side comparisons, candid
                  caveats, and budget chapters—written by our editorial team.
                </p>
              </div>
              <a
                href="/gift-guides/"
                className="theme-link inline-flex items-center gap-1 text-xs font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
              >
                <span>Browse all {allCuratedGuides.length} guides</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div
              className={`mt-8 grid grid-cols-1 gap-8 ${
                supportingFeaturedGuides.length > 0 ? 'lg:grid-cols-12' : ''
              }`}
            >
              {/* Primary Lead Guide Spread */}
              <article
                className={`overflow-hidden rounded-3xl border border-[#E3E1DB] bg-[#FFFFFF] ${
                  supportingFeaturedGuides.length > 0 ? 'lg:col-span-8' : ''
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12">
                  <div className="lg:col-span-6">
                    <a
                      href={`/gift-guides/${leadFeaturedGuide.guide.slug}/`}
                      className="group block h-full min-h-[280px] w-full overflow-hidden bg-[#F6F4EF]"
                    >
                      <PhotoImage
                        src={leadFeaturedGuide.guide.heroImageUrl}
                        alt={leadFeaturedGuide.guide.heroImageAlt}
                        preset="feature-landscape"
                        aspectRatio="16:10"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </a>
                  </div>

                  <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-6 lg:p-10">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="theme-kicker font-semibold text-[#28537D]">
                          {leadFeaturedGuide.guide.category}
                        </span>
                        <span aria-hidden="true" className="text-[#C5C1B8]">
                          ·
                        </span>
                        <span className="theme-metadata text-[#636A6F] tabular-nums">
                          {leadFeaturedGuide.totalRecommendationsCount} picks (
                          {leadFeaturedGuide.priceRangeSummary})
                        </span>
                      </div>

                      <h3 className="theme-product-title-featured mt-3 font-serif text-2xl font-semibold leading-snug text-[#24282B] sm:text-3xl">
                        <a
                          href={`/gift-guides/${leadFeaturedGuide.guide.slug}/`}
                          className="transition-colors hover:text-[#28537D]"
                        >
                          {leadFeaturedGuide.guide.title}
                        </a>
                      </h3>

                      <p className="theme-body-text mt-3 text-[#24282B]">
                        {leadFeaturedGuide.guide.subtitle}
                      </p>

                      {leadFeaturedGuide.guide.curationSummary && (
                        <p className="theme-caption mt-3 rounded-xl border border-[#C6E4D6] bg-[#E5F3EC]/65 px-4 py-3 text-xs leading-relaxed text-[#24282B]">
                          <strong className="font-semibold text-[#1B3D5F]">
                            Editorial scope:
                          </strong>{' '}
                          {leadFeaturedGuide.guide.curationSummary}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 border-t border-[#E3E1DB] pt-5">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="theme-metadata flex flex-wrap items-center gap-3 text-xs text-[#636A6F]">
                          {leadFeaturedGuide.author && (
                            <span className="font-medium text-[#24282B]">
                              By {leadFeaturedGuide.author.name}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Calendar className="h-3.5 w-3.5 text-[#28537D]" />
                            Updated {leadFeaturedGuide.guide.updatedAt}
                          </span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Clock className="h-3.5 w-3.5 text-[#28537D]" />
                            {leadFeaturedGuide.guide.readTimeMinutes} min read
                          </span>
                        </div>

                        <a
                          href={`/gift-guides/${leadFeaturedGuide.guide.slug}/`}
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

              {/* Supporting Featured Guides */}
              {supportingFeaturedGuides.length > 0 && (
                <div className="space-y-6 lg:col-span-4">
                  {supportingFeaturedGuides.map((item) => (
                    <article
                      key={item.guide.id}
                      className="flex h-full flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6"
                    >
                      <div>
                        <a
                          href={`/gift-guides/${item.guide.slug}/`}
                          className="group block aspect-[16/10] w-full overflow-hidden rounded-xl bg-[#F6F4EF]"
                        >
                          <PhotoImage
                            src={item.guide.heroImageUrl}
                            alt={item.guide.heroImageAlt}
                            preset="card-landscape"
                            aspectRatio="16:10"
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
                            {item.totalRecommendationsCount} picks ·{' '}
                            {item.priceRangeSummary}
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

                      <div className="mt-4 flex items-center justify-between border-t border-[#E3E1DB] pt-3 text-xs">
                        <span className="text-[#636A6F] tabular-nums">
                          {item.guide.readTimeMinutes} min read
                        </span>
                        <a
                          href={`/gift-guides/${item.guide.slug}/`}
                          className="theme-link inline-flex items-center gap-1 font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
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
            7. FEATURED INDIVIDUAL GIFTS (Curated vs. Catalog Matches)
           =================================================================== */}
        {curatedProducts.length > 0 && (
          <section
            id="featured-individual-gifts"
            aria-labelledby="heading-hub-curated-products"
            className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
          >
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E1DB] pb-4">
              <div>
                <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                  <Award className="h-3.5 w-3.5" />
                  <span>Hand-Picked Objects & Provenance</span>
                </p>
                <h2
                  id="heading-hub-curated-products"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
                >
                  Featured Individual Gifts
                </h2>
                <p className="theme-body-sm mt-1.5 max-w-2xl text-[#636A6F]">
                  Standout individual objects selected from our canonical catalog,
                  with explicit editorial notes on why each gift works and which
                  relationships it suits best.
                </p>
              </div>
              <a
                href="/gift-finder/"
                className="theme-link inline-flex items-center gap-1 text-xs font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
              >
                <span>Compare & filter all gifts</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {curatedProducts.map((pick) => {
                const { product, selection, featuredGuide } = pick;
                const isSaved = savedProductIds.includes(product.id);
                const hasVerifiedPrice = hasValidNumericPrice(product);
                const cleanVendor = product.vendor.replace(
                  /^Sample Maker:\s*/i,
                  ''
                );
                const isEditorialSelection =
                  selection.selectionSource === 'editorial-curation';

                return (
                  <article
                    key={product.id}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] transition-colors hover:border-[#C5C1B8]"
                  >
                    <div>
                      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#F6F4EF]">
                        <a
                          href={`/products/${product.slug}/`}
                          className="group block h-full w-full"
                        >
                          <PhotoImage
                            image={product.images[0]}
                            src={product.images[0]?.url}
                            alt={product.images[0]?.alt ?? product.title}
                            preset="card-portrait"
                            aspectRatio="4:5"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        </a>

                        {/* Provenance Badge (Editorial Curation vs Catalog Match) */}
                        <div className="pointer-events-none absolute left-3.5 top-3.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold shadow-2xs ${
                              isEditorialSelection
                                ? 'bg-[#1B3D5F] text-[#FFFFFF]'
                                : 'border border-[#E3E1DB] bg-[#FFFFFF]/95 text-[#24282B]'
                            }`}
                          >
                            {isEditorialSelection
                              ? 'Editor’s Selection'
                              : 'Catalog Match'}
                          </span>
                          {product.isPlaceholderLink && (
                            <span className="rounded-md border border-[#E6C786] bg-[#FFF8E7]/95 px-2 py-0.5 text-[10px] font-semibold text-[#6E4D11]">
                              Sample Record
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-[#636A6F]">
                            {cleanVendor}
                          </span>
                          {hasVerifiedPrice ? (
                            <span className="font-semibold text-[#24282B] tabular-nums">
                              ${product.price} {product.currency}
                            </span>
                          ) : (
                            <span className="text-[#636A6F]">
                              Price on profile
                            </span>
                          )}
                        </div>

                        <h3 className="theme-subsection-heading mt-1.5 font-serif text-xl font-semibold leading-snug text-[#24282B]">
                          <a
                            href={`/products/${product.slug}/`}
                            className="hover:text-[#28537D] hover:underline"
                          >
                            {product.title}
                          </a>
                        </h3>

                        {selection.bestForRelationship && (
                          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-[#C6E4D6] bg-[#E5F3EC]/70 px-2.5 py-1 text-[11px] font-semibold text-[#1B3D5F]">
                            <span>Best for: {selection.bestForRelationship}</span>
                          </div>
                        )}

                        <p className="theme-body-sm mt-3 text-[#24282B]">
                          {selection.editorialNote ?? product.whyToGiveIt}
                        </p>

                        {/* Interest & Recipient Tags */}
                        <div className="mt-4 flex flex-wrap items-center gap-1.5">
                          {product.recipients.slice(0, 2).map((recKey) => (
                            <span
                              key={recKey}
                              className="rounded-md border border-[#E3E1DB] bg-[#FAF9F6] px-2 py-0.5 text-[11px] font-medium text-[#636A6F]"
                            >
                              {RECIPIENT_TAXONOMY_META[recKey]?.shortLabel ??
                                recKey}
                            </span>
                          ))}
                          {product.interests.slice(0, 2).map((interest) => (
                            <span
                              key={interest}
                              className="rounded-md bg-[#F6F4EF] px-2 py-0.5 text-[11px] font-medium text-[#24282B]"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>

                        {featuredGuide && (
                          <div className="mt-4 border-t border-[#E3E1DB] pt-3 text-xs text-[#636A6F]">
                            Featured in:{' '}
                            <a
                              href={`/gift-guides/${featuredGuide.guide.slug}/`}
                              className="font-medium text-[#28537D] hover:underline"
                            >
                              {featuredGuide.guide.title}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E3E1DB] bg-[#FAF9F6]/60 px-6 py-3.5 text-xs">
                      <div className="flex items-center gap-3">
                        {onToggleSave && (
                          <button
                            type="button"
                            onClick={() => onToggleSave(product.id)}
                            aria-pressed={isSaved}
                            className="inline-flex items-center gap-1.5 font-semibold text-[#24282B] hover:text-[#28537D] cursor-pointer"
                          >
                            <Heart
                              className={`h-3.5 w-3.5 ${
                                isSaved
                                  ? 'fill-[#F2846B] text-[#F2846B]'
                                  : 'text-[#636A6F]'
                              }`}
                            />
                            <span>{isSaved ? 'Saved' : 'Save'}</span>
                          </button>
                        )}

                        {onSelectProduct && (
                          <button
                            type="button"
                            onClick={() => onSelectProduct(product)}
                            className="inline-flex items-center gap-1 font-medium text-[#636A6F] hover:text-[#28537D] cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Quick View</span>
                          </button>
                        )}
                      </div>

                      <a
                        href={`/products/${product.slug}/`}
                        className="theme-link inline-flex items-center gap-1 font-semibold text-[#1B3D5F] hover:text-[#28537D] hover:underline"
                      >
                        <span>Full Review</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ===================================================================
            8. HELP ME FIND THE RIGHT GIFT (Gift Finder Bridge Section)
           =================================================================== */}
        <section
          id="help-me-find-a-gift"
          aria-labelledby="heading-hub-finder-cta"
          className="scroll-mt-24 rounded-3xl border border-[#C6E4D6] bg-gradient-to-br from-[#E5F3EC]/85 via-[#FAF9F6] to-[#EBF3FE]/75 p-7 sm:p-10 lg:p-12"
        >
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                <Compass className="h-3.5 w-3.5" />
                <span>
                  {hub.finderCta?.kicker ?? 'Interactive Gift Discovery'}
                </span>
              </p>
              <h2
                id="heading-hub-finder-cta"
                className="theme-section-heading mt-2 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
              >
                {hub.finderCta?.heading ?? 'Still Not Sure What to Choose?'}
              </h2>
              <p className="theme-body-text mt-3 max-w-2xl text-[#24282B]">
                {hub.finderCta?.body ??
                  'Use our interactive Gift Finder to combine recipient, budget, occasion, and daily interests—or step through our 5-question guided quiz.'}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href={hub.finderCta?.primaryHref ?? '/gift-finder/'}
                  className="theme-btn-primary theme-button-text inline-flex items-center gap-2 rounded-lg bg-[#1B3D5F] px-5 py-3 text-xs font-semibold text-[#FFFFFF] transition-colors hover:bg-[#28537D]"
                >
                  <span>
                    {hub.finderCta?.primaryLabel ?? 'Open the Gift Finder'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>

                {hub.finderCta?.secondaryHref && (
                  <a
                    href={hub.finderCta.secondaryHref}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#1B3D5F]/25 bg-[#FFFFFF] px-4 py-3 text-xs font-semibold text-[#1B3D5F] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
                  >
                    <span>{hub.finderCta.secondaryLabel}</span>
                  </a>
                )}
              </div>
            </div>

            {hub.finderCta?.presetLinks &&
              hub.finderCta.presetLinks.length > 0 && (
                <div className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 lg:col-span-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                    One-Click Pre-Filtered Searches
                  </div>
                  <p className="mt-1 text-xs text-[#636A6F]">
                    Open the Gift Finder with popular combinations already selected:
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {hub.finderCta.presetLinks.map((preset) => (
                      <li key={preset.href}>
                        <a
                          href={preset.href}
                          className="flex items-center justify-between rounded-xl border border-[#E3E1DB] bg-[#FAF9F6] px-4 py-2.5 text-xs font-semibold text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
                        >
                          <span>{preset.label}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-[#28537D]" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        </section>

        {/* ===================================================================
            9. EDITORIAL BUYING ADVICE
           =================================================================== */}
        <section
          id="editorial-buying-advice"
          aria-labelledby="heading-hub-buying-advice"
          className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Behavioral Research & Practical Guidance</span>
              </p>
              <h2
                id="heading-hub-buying-advice"
                className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
              >
                How to Choose a Thoughtful Gift for {isHimHub ? 'Him' : 'Her'}
              </h2>
              <p className="theme-body-sm mt-1.5 max-w-2xl text-[#636A6F]">
                Four practical principles grounded in consumer psychology and
                everyday use—designed to help you avoid forgettable clichés.
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {hub.buyingAdvice.map((tip, index) => (
              <article
                key={tip.id}
                className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-7"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                  Principle 0{index + 1}
                </div>
                <h3 className="theme-subsection-heading mt-1.5 font-serif text-xl font-semibold text-[#24282B]">
                  {tip.heading}
                </h3>
                <p className="theme-body-text mt-2.5 text-sm leading-relaxed text-[#24282B]">
                  {tip.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ===================================================================
            10. RELATED EDITORIAL CONTENT (Stories, Archives & Companion Hub)
           =================================================================== */}
        <section
          id="related-editorial-content"
          aria-labelledby="heading-hub-related-editorial"
          className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="theme-kicker text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                Further Reading & Taxonomy Archives
              </p>
              <h2
                id="heading-hub-related-editorial"
                className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
              >
                Related Stories & Editorial Collections
              </h2>
              <p className="theme-body-sm mt-1.5 max-w-2xl text-[#636A6F]">
                Explore our research-backed essays on the psychology of gift
                giving or jump directly into recipient and interest archives.
              </p>
            </div>
            <a
              href="/articles/"
              className="theme-link inline-flex items-center gap-1 text-xs font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
            >
              <span>All Stories</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {relatedArticles.length > 0 && (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              {relatedArticles.map((item) => {
                const { article, author, readTimeMinutes, citationCount } = item;
                return (
                  <article
                    key={article.id}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="theme-kicker font-semibold text-[#28537D]">
                          {article.category}
                        </span>
                        <span aria-hidden="true" className="text-[#C5C1B8]">
                          ·
                        </span>
                        <span className="theme-metadata text-[#636A6F] tabular-nums">
                          {readTimeMinutes} min read
                        </span>
                        {citationCount > 0 && (
                          <>
                            <span aria-hidden="true" className="text-[#C5C1B8]">
                              ·
                            </span>
                            <span className="theme-metadata text-[#636A6F] tabular-nums">
                              {citationCount} peer-reviewed{' '}
                              {citationCount === 1 ? 'study' : 'studies'}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="theme-subsection-heading mt-2 font-serif text-xl font-semibold text-[#24282B]">
                        <a
                          href={`/articles/${article.slug}/`}
                          className="hover:text-[#28537D] hover:underline"
                        >
                          {article.title}
                        </a>
                      </h3>

                      <p className="theme-body-sm mt-2 text-[#636A6F]">
                        {article.subtitle}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-[#E3E1DB] pt-3.5 text-xs">
                      <span className="text-[#636A6F]">
                        {author ? `By ${author.name}` : 'Science of Gifts Editorial'}
                      </span>
                      <a
                        href={`/articles/${article.slug}/`}
                        className="theme-link inline-flex items-center gap-1 font-semibold text-[#1B3D5F] hover:text-[#28537D] hover:underline"
                      >
                        <span>Read story</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Cross-Links to Recipient Archives, Interest Collections & Companion Hub */}
          <div className="mt-8 grid grid-cols-1 gap-6 rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 lg:grid-cols-3">
            <div>
              <h3 className="font-serif text-base font-semibold text-[#24282B]">
                Recipient Archives
              </h3>
              <ul className="mt-3 space-y-2 text-xs">
                {recipientArchives.map((rec) => (
                  <li key={rec.slug}>
                    <a
                      href={rec.archiveHref}
                      className="inline-flex items-center gap-1.5 font-medium text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                    >
                      <span>Gifts for {rec.label}</span>
                      <span className="text-[#636A6F] tabular-nums">
                        ({rec.productCount})
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-serif text-base font-semibold text-[#24282B]">
                Interest Collections
              </h3>
              <ul className="mt-3 space-y-2 text-xs">
                {interests.slice(0, 6).map((interest) => (
                  <li key={interest.slug}>
                    <a
                      href={interest.archiveHref}
                      className="inline-flex items-center gap-1.5 font-medium text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                    >
                      <span>{interest.label} Gifts</span>
                      <span className="text-[#636A6F] tabular-nums">
                        ({interest.productCount})
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-[#E3E1DB] bg-[#FAF9F6] p-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                  Companion Discovery Hub
                </div>
                <h3 className="mt-1.5 font-serif text-lg font-semibold text-[#24282B]">
                  {companionHub ? companionHub.title : 'Explore All Gift Guides'}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#636A6F]">
                  {companionHub
                    ? companionHub.subtitle
                    : 'Browse our complete directory of recipient, interest, and occasion gift guides.'}
                </p>
              </div>
              <div className="mt-4 pt-2">
                <a
                  href={companionHub ? companionHub.routePath : '/gift-guides/'}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B3D5F] hover:text-[#28537D] hover:underline"
                >
                  <span>
                    {companionHub
                      ? `Visit ${companionHub.title} (${companionHub.routePath})`
                      : 'Open Gift Guides Directory'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            11. PUBLICATION READINESS & SPARSE-CATALOG SAFEGUARD DISCLOSURE
           =================================================================== */}
        <section
          aria-label="Editorial hub publication readiness status"
          className="rounded-2xl border border-[#E3E1DB] bg-[#F6F4EF] p-6 text-xs text-[#636A6F]"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#28537D]" />
              <div>
                <h2 className="font-semibold text-[#24282B]">
                  Editorial Hub Readiness & Search Indexing Safeguard ({hub.routePath})
                </h2>
                <p className="mt-1 leading-relaxed">
                  {readiness.isReadyToPublish && readiness.isIndexable
                    ? `This hub meets all quantitative and qualitative publication criteria (${readiness.publishedGuidesCount} published guides, ${readiness.verifiedProductsCount} verified non-sample products) and is eligible for public navigation and search indexing.`
                    : `This hub is currently in preview/draft mode (robots: "noindex, follow", excluded from /sitemap.xml and public navigation) until minimum real catalog thresholds are met (${readiness.publishedGuidesCount}/${hub.minimumRequiredGuides} published guides; ${readiness.verifiedProductsCount}/${hub.minimumRequiredProducts} verified non-sample products; ${readiness.sampleProductsCount} sample preview products currently referenced).`}
                </p>
              </div>
            </div>

            <span
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                readiness.isReadyToPublish && readiness.isIndexable
                  ? 'border border-[#C6E4D6] bg-[#E5F3EC] text-[#1B3D5F]'
                  : 'border border-[#E6C786] bg-[#FFF8E7] text-[#6E4D11]'
              }`}
            >
              {readiness.isReadyToPublish && readiness.isIndexable
                ? 'Ready for Public Indexing'
                : 'Draft Preview · Noindex Active'}
            </span>
          </div>

          {readiness.missingRequirements.length > 0 && (
            <details className="mt-3 border-t border-[#E3E1DB] pt-3">
              <summary className="cursor-pointer font-semibold text-[#24282B] hover:text-[#28537D]">
                View remaining publication readiness checks (
                {readiness.missingRequirements.length})
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[#636A6F]">
                {readiness.missingRequirements.map((req, idx) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      </div>
    </div>
  );
};
