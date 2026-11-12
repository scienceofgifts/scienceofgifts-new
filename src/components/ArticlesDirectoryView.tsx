import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Compass,
  FileText,
  Sparkles,
  Tag,
} from 'lucide-react';
import {
  ArticleTopicDiscoveryItem,
  EnrichedArticle,
  EnrichedGiftGuide,
} from '../cms/contentRepository';
import { CategoryIcon } from './CategoryIcon';
import { MAX_CATEGORY_PREVIEW_ITEMS } from './GiftGuidesDirectoryView';

export interface ArticlesDirectoryViewProps {
  allArticles: EnrichedArticle[];
  featuredArticle: EnrichedArticle | null;
  recentArticles: EnrichedArticle[];
  topicDiscovery: ArticleTopicDiscoveryItem[];
  relatedGuides: EnrichedGiftGuide[];
}

export const ArticlesDirectoryView: React.FC<ArticlesDirectoryViewProps> = ({
  allArticles,
  featuredArticle,
  recentArticles,
  topicDiscovery,
  relatedGuides,
}) => {
  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-24 text-[#24282B]">
      {/* =====================================================================
          A. EDITORIAL INTRODUCTION
         ===================================================================== */}
      <header className="border-b border-[#E3E1DB] bg-[#FAF7F2]">
        <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6 lg:px-8">
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
                Stories
              </span>
            </nav>

            <div className="theme-metadata flex flex-wrap items-center gap-2 text-xs text-[#636A6F] tabular-nums">
              <span className="font-medium text-[#24282B]">
                Essays & Behavioral Research
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {allArticles.length}{' '}
                {allArticles.length === 1 ? 'published story' : 'published stories'}
              </span>
            </div>
          </div>

          {/* Literary Editorial Masthead */}
          <div className="py-10 sm:py-12 lg:py-14">
            <p className="theme-kicker text-xs font-semibold uppercase tracking-widest text-[#28537D]">
              Science of Gifts · Editorial Desk
            </p>
            <h1 className="theme-display-heading mt-2.5 font-serif text-3xl font-semibold leading-[1.12] tracking-tight text-[#24282B] sm:text-5xl">
              Stories
            </h1>
            <p className="theme-intro-text mt-4 max-w-2xl text-lg leading-[1.62] text-[#636A6F] sm:text-xl">
              Curious observations, useful advice, and the psychology behind why
              we give, choose, and remember gifts.
            </p>
          </div>

          {/* Section Jump Bar */}
          <nav
            aria-label="Stories archive sections"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#E3E1DB] py-3.5 text-xs font-medium text-[#636A6F]"
          >
            <span className="font-semibold text-[#24282B]">In this section:</span>
            {featuredArticle && (
              <a
                href="#featured-story"
                className="hover:text-[#28537D] hover:underline underline-offset-4"
              >
                Featured Story
              </a>
            )}
            {recentArticles.length > 0 && (
              <a
                href="#recent-stories"
                className="hover:text-[#28537D] hover:underline underline-offset-4"
              >
                Recent Stories
              </a>
            )}
            {topicDiscovery.length > 0 && (
              <a
                href="#browse-by-topic"
                className="hover:text-[#28537D] hover:underline underline-offset-4"
              >
                Browse by Topic
              </a>
            )}
            {relatedGuides.length > 0 && (
              <a
                href="#related-editorial-discovery"
                className="hover:text-[#28537D] hover:underline underline-offset-4"
              >
                Related Gift Guides
              </a>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] space-y-20 px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        {allArticles.length === 0 ? (
          <div className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-8">
            <h2 className="theme-subsection-heading font-serif text-xl font-semibold text-[#24282B]">
              No stories are currently published
            </h2>
            <p className="theme-body-text mt-2 text-[#636A6F]">
              Explore our curated{' '}
              <a
                href="/gift-guides/"
                className="theme-link font-semibold text-[#28537D] underline"
              >
                Gift Guides
              </a>{' '}
              or search the{' '}
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
          <>
            {/* ===============================================================
                B. FEATURED STORY
               =============================================================== */}
            {featuredArticle && (
              <section
                id="featured-story"
                aria-labelledby="heading-featured-story"
                className="scroll-mt-24"
              >
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E1DB] pb-4">
                  <div>
                    <p className="theme-kicker text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                      Lead Essay · {featuredArticle.article.category}
                    </p>
                    <h2
                      id="heading-featured-story"
                      className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
                    >
                      Featured Story
                    </h2>
                  </div>
                  <span className="theme-metadata text-xs text-[#636A6F] tabular-nums">
                    Published {featuredArticle.article.publishedAt} ·{' '}
                    {featuredArticle.readTimeMinutes} min read
                  </span>
                </div>

                <article className="mt-8 overflow-hidden rounded-3xl border border-[#E3E1DB] bg-[#FFFFFF]">
                  <div className="grid grid-cols-1 lg:grid-cols-12">
                    <div className="lg:col-span-6">
                      <a
                        href={`/articles/${featuredArticle.article.slug}/`}
                        className="group block h-full min-h-[300px] w-full overflow-hidden bg-[#F6F4EF]"
                      >
                        <img
                          src={featuredArticle.article.heroImageUrl}
                          alt={featuredArticle.article.heroAlt}
                          width={840}
                          height={620}
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
                            {featuredArticle.article.category}
                          </span>
                          <span aria-hidden="true" className="text-[#C5C1B8]">
                            ·
                          </span>
                          <span className="theme-metadata text-[#636A6F] tabular-nums">
                            {featuredArticle.citationCount} peer-reviewed{' '}
                            {featuredArticle.citationCount === 1
                              ? 'citation'
                              : 'citations'}
                          </span>
                        </div>

                        <h3 className="theme-product-title-featured mt-3 font-serif text-2xl font-semibold leading-snug text-[#24282B] sm:text-3xl">
                          <a
                            href={`/articles/${featuredArticle.article.slug}/`}
                            className="hover:text-[#28537D] transition-colors"
                          >
                            {featuredArticle.article.title}
                          </a>
                        </h3>

                        <p className="theme-body-text mt-3 text-[#24282B]">
                          {featuredArticle.article.subtitle}
                        </p>

                        {featuredArticle.article.executiveSummary[0] && (
                          <blockquote className="mt-5 border-l-2 border-[#1B3D5F] pl-4 text-sm italic leading-relaxed text-[#636A6F]">
                            “{featuredArticle.article.executiveSummary[0]}”
                          </blockquote>
                        )}

                        <div className="mt-5 flex flex-wrap items-center gap-1.5">
                          {featuredArticle.topicLabels.map((topicLabel) => (
                            <span
                              key={topicLabel}
                              className="rounded-md bg-[#F6F4EF] px-2.5 py-1 text-[11px] font-medium text-[#636A6F]"
                            >
                              {topicLabel}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 border-t border-[#E3E1DB] pt-5">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {featuredArticle.author && (
                              <img
                                src={featuredArticle.author.avatarUrl}
                                alt={featuredArticle.author.name}
                                width={38}
                                height={38}
                                loading="lazy"
                                decoding="async"
                                className="h-9 w-9 rounded-full border border-[#E3E1DB] object-cover"
                              />
                            )}
                            <div className="text-xs">
                              <div className="font-semibold text-[#24282B]">
                                {featuredArticle.author?.name ??
                                  'Science of Gifts Editorial'}
                              </div>
                              <div className="theme-metadata text-[#636A6F] tabular-nums">
                                {featuredArticle.article.publishedAt} ·{' '}
                                {featuredArticle.readTimeMinutes} min read
                              </div>
                            </div>
                          </div>

                          <a
                            href={`/articles/${featuredArticle.article.slug}/`}
                            className="theme-btn-primary theme-button-text inline-flex items-center gap-2 rounded-lg bg-[#1B3D5F] px-5 py-2.5 text-xs font-semibold text-[#FFFFFF] transition-colors hover:bg-[#28537D]"
                          >
                            <span>Read Full Story</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </section>
            )}

            {/* ===============================================================
                C. RECENT STORIES
                Displays remaining stories without duplicating the featured story.
               =============================================================== */}
            {recentArticles.length > 0 && (
              <section
                id="recent-stories"
                aria-labelledby="heading-recent-stories"
                className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
              >
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="theme-kicker text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                      Editorial Essays & Field Notes
                    </p>
                    <h2
                      id="heading-recent-stories"
                      className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
                    >
                      Recent Stories
                    </h2>
                    <p className="theme-body-sm mt-1.5 max-w-2xl text-[#636A6F]">
                      Practical etiquette, social psychology, and candid advice
                      for navigating everyday gifting moments.
                    </p>
                  </div>
                </div>

                <div className="mt-8 space-y-8">
                  {recentArticles.map((item) => {
                    const { article, author } = item;
                    return (
                      <article
                        key={article.id}
                        className="overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] transition-colors hover:border-[#C5C1B8]"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12">
                          <div className="md:col-span-5">
                            <a
                              href={`/articles/${article.slug}/`}
                              className="group block h-full min-h-[240px] w-full overflow-hidden bg-[#F6F4EF]"
                            >
                              <img
                                src={article.heroImageUrl}
                                alt={article.heroAlt}
                                width={640}
                                height={440}
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                              />
                            </a>
                          </div>

                          <div className="flex flex-col justify-between p-6 sm:p-8 md:col-span-7">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="theme-kicker font-semibold text-[#28537D]">
                                  {article.category}
                                </span>
                                <span aria-hidden="true" className="text-[#C5C1B8]">
                                  ·
                                </span>
                                <span className="theme-metadata inline-flex items-center gap-1 text-[#636A6F] tabular-nums">
                                  <Calendar className="h-3.5 w-3.5 text-[#28537D]" />
                                  Published {article.publishedAt}
                                </span>
                                <span aria-hidden="true" className="text-[#C5C1B8]">
                                  ·
                                </span>
                                <span className="theme-metadata inline-flex items-center gap-1 text-[#636A6F] tabular-nums">
                                  <Clock className="h-3.5 w-3.5 text-[#28537D]" />
                                  {item.readTimeMinutes} min read
                                </span>
                              </div>

                              <h3 className="theme-subsection-heading mt-2.5 font-serif text-xl font-semibold leading-snug text-[#24282B] sm:text-2xl">
                                <a
                                  href={`/articles/${article.slug}/`}
                                  className="hover:text-[#28537D] hover:underline"
                                >
                                  {article.title}
                                </a>
                              </h3>

                              <p className="theme-body-text mt-2.5 text-[#24282B]">
                                {article.subtitle}
                              </p>

                              {article.executiveSummary.length > 0 && (
                                <ul className="mt-4 space-y-1.5 rounded-xl border border-[#E3E1DB] bg-[#FAF9F6] p-4 text-xs text-[#636A6F]">
                                  {article.executiveSummary
                                    .slice(0, 2)
                                    .map((point, idx) => (
                                      <li key={idx} className="leading-relaxed">
                                        • {point}
                                      </li>
                                    ))}
                                </ul>
                              )}

                              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                                {item.topicLabels.map((topicLabel) => (
                                  <span
                                    key={topicLabel}
                                    className="rounded-md bg-[#F6F4EF] px-2.5 py-1 text-[11px] font-medium text-[#636A6F]"
                                  >
                                    {topicLabel}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#E3E1DB] pt-4 text-xs">
                              <div className="theme-metadata text-[#636A6F]">
                                {author ? (
                                  <span>
                                    By{' '}
                                    <strong className="font-semibold text-[#24282B]">
                                      {author.name}
                                    </strong>{' '}
                                    · {author.role}
                                  </span>
                                ) : (
                                  <span>Science of Gifts Editorial</span>
                                )}
                              </div>

                              <a
                                href={`/articles/${article.slug}/`}
                                className="theme-link inline-flex items-center gap-1.5 font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                              >
                                <span>Read Essay</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ===============================================================
                D. BROWSE BY TOPIC
               =============================================================== */}
            {topicDiscovery.length > 0 && (
              <section
                id="browse-by-topic"
                aria-labelledby="heading-browse-by-topic"
                className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
              >
                <div>
                  <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Editorial Themes</span>
                  </p>
                  <h2
                    id="heading-browse-by-topic"
                    className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
                  >
                    Browse by Topic
                  </h2>
                  <p className="theme-body-sm mt-1.5 max-w-2xl text-[#636A6F]">
                    Explore our essays organized by behavioral science themes,
                    relationship dynamics, and modern etiquette.
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {topicDiscovery.map((topic) => {
                    const previewArticles = topic.matchingArticles.slice(
                      0,
                      MAX_CATEGORY_PREVIEW_ITEMS
                    );
                    const hasMoreArticles =
                      topic.matchingArticles.length >
                      MAX_CATEGORY_PREVIEW_ITEMS;

                    return (
                      <div
                        key={topic.id}
                        id={`topic-${topic.id}`}
                        className="flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <CategoryIcon iconKey={topic.iconKey} />
                              <div>
                                <h3 className="theme-subsection-heading font-serif text-lg font-semibold text-[#24282B]">
                                  <a
                                    href={topic.archiveHref}
                                    className="hover:text-[#28537D] hover:underline"
                                  >
                                    {topic.label}
                                  </a>
                                </h3>
                                <span className="theme-metadata mt-0.5 block text-xs text-[#636A6F] tabular-nums">
                                  {topic.matchingArticles.length}{' '}
                                  {topic.matchingArticles.length === 1
                                    ? 'story'
                                    : 'stories'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="theme-body-sm mt-3 text-[#636A6F]">
                            {topic.description}
                          </p>
                        </div>

                        <div className="mt-5 border-t border-[#E3E1DB] pt-3.5">
                          <div className="theme-info-label text-xs font-semibold text-[#24282B]">
                            Published in this topic:
                          </div>
                          <ul className="mt-2 space-y-2 text-xs">
                            {previewArticles.map((art) => (
                              <li key={art.article.id}>
                                <a
                                  href={`/articles/${art.article.slug}/`}
                                  className="theme-link inline-flex items-start gap-1.5 font-medium text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                                >
                                  <FileText
                                    aria-hidden="true"
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                  />
                                  <span>{art.article.title}</span>
                                </a>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-3.5 flex items-center justify-between border-t border-[#E3E1DB] pt-3 text-xs">
                            <a
                              href={topic.archiveHref}
                              className="theme-link inline-flex items-center gap-1 font-semibold text-[#1B3D5F] hover:text-[#28537D] hover:underline"
                            >
                              <span>
                                {hasMoreArticles
                                  ? `View all ${topic.matchingArticles.length} stories`
                                  : `View ${topic.label} archive`}
                              </span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ===============================================================
                E. RELEVANT EDITORIAL DISCOVERY (Connected Gift Guides & Finder)
               =============================================================== */}
            {relatedGuides.length > 0 && (
              <section
                id="related-editorial-discovery"
                aria-labelledby="heading-related-editorial-discovery"
                className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
              >
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>From Theory to Practice</span>
                    </p>
                    <h2
                      id="heading-related-editorial-discovery"
                      className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
                    >
                      Companion Gift Guides
                    </h2>
                    <p className="theme-body-sm mt-1.5 max-w-2xl text-[#636A6F]">
                      See how the behavioral research and etiquette principles in
                      our stories translate into concrete, editor-tested gift
                      recommendations.
                    </p>
                  </div>

                  <a
                    href="/gift-guides/"
                    className="theme-link inline-flex items-center gap-1.5 text-xs font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                  >
                    <span>Open Gift Guides Directory</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                  {relatedGuides.map((item) => (
                    <article
                      key={item.guide.id}
                      className="flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="theme-kicker font-semibold text-[#28537D]">
                            Gift Guide · {item.guide.category}
                          </span>
                          <span className="theme-metadata text-[#636A6F] tabular-nums">
                            {item.totalRecommendationsCount} picks (
                            {item.priceRangeSummary})
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

                      <div className="mt-5 flex items-center justify-between border-t border-[#E3E1DB] pt-4 text-xs">
                        <span className="theme-metadata text-[#636A6F]">
                          Curated by {item.author?.name ?? 'Editorial Desk'}
                        </span>
                        <a
                          href={`/gift-guides/${item.guide.slug}/`}
                          className="theme-link inline-flex items-center gap-1 font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                        >
                          <span>Explore Guide</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Tasteful Gift Finder Cross-Link */}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#C6E4D6] bg-[#E5F3EC]/70 p-6">
                  <div className="flex items-start gap-3">
                    <Compass className="mt-0.5 h-5 w-5 shrink-0 text-[#1B3D5F]" />
                    <div>
                      <h3 className="theme-info-heading font-serif text-base font-semibold text-[#24282B]">
                        Ready to put these ideas into action?
                      </h3>
                      <p className="theme-body-sm mt-1 text-xs text-[#24282B]">
                        Use the Interactive Gift Finder to filter our canonical
                        catalog by recipient, hobby, occasion, and strict budget
                        caps.
                      </p>
                    </div>
                  </div>

                  <a
                    href="/gift-finder/"
                    className="theme-btn-primary theme-button-text inline-flex items-center gap-2 rounded-lg bg-[#1B3D5F] px-5 py-2.5 text-xs font-semibold text-[#FFFFFF] transition-colors hover:bg-[#28537D]"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Find a Gift</span>
                  </a>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};
