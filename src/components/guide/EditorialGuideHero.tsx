import React from 'react';
import { Author, GiftGuide } from '../../types/content';
import { ArrowRight, BookOpen, Calendar, Clock } from 'lucide-react';

export interface EditorialGuideHeroProps {
  guide: GiftGuide;
  author?: Author;
  totalRecommendationsCount: number;
  priceRangeSummary: string;
  onJumpToSection: (sectionId: string) => void;
}

export const EditorialGuideHero: React.FC<EditorialGuideHeroProps> = ({
  guide,
  author,
  totalRecommendationsCount,
  priceRangeSummary,
  onJumpToSection,
}) => {
  return (
    <header className="border-b border-[#E3E1DB] bg-[#FAF9F6]">
      {/* Top Breadcrumb & Issue Line */}
      <div className="mx-auto max-w-[1360px] px-4 pt-6 sm:px-6 lg:px-8">
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
              className="max-w-xs truncate font-semibold text-[#24282B]"
            >
              {guide.title}
            </span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 text-xs text-[#636A6F]">
            <span className="font-medium text-[#24282B]">
              {guide.editorialIssueNumber ?? 'Science of Gifts · Gift Guide'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {totalRecommendationsCount} recommendations ({priceRangeSummary})
            </span>
          </div>
        </div>
      </div>

      {/* Main Magazine Feature Spread */}
      <div className="mx-auto max-w-[1360px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-14">
          {/* Left Column: Title, Standfirst, Byline, Intro Essay, Jump Actions */}
          <div className="lg:col-span-7">
            <p className="theme-kicker text-xs font-semibold text-[#28537D]">
              {guide.category} · Gift Guide
            </p>

            <h1 className="theme-display-heading mt-2.5 font-serif text-3xl font-semibold leading-[1.12] tracking-tight text-[#24282B] sm:text-5xl lg:text-[3.25rem]">
              {guide.title}
            </h1>

            <p className="theme-intro-text mt-4 max-w-2xl text-lg leading-[1.6] text-[#636A6F] sm:text-xl">
              {guide.subtitle}
            </p>

            {/* Author & Curation Metadata Bar */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-y border-[#E3E1DB] py-4">
              {author ? (
                <div className="flex items-center gap-3.5">
                  <img
                    src={author.avatarUrl}
                    alt={author.name}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full border border-[#E3E1DB] object-cover"
                  />
                  <div>
                    <div className="text-sm font-semibold text-[#24282B]">
                      Curated by {author.name}
                    </div>
                    <div className="theme-caption text-xs text-[#636A6F]">{author.role}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-semibold text-[#24282B]">
                  Science of Gifts Editorial Desk
                </div>
              )}

              <div className="theme-metadata flex flex-wrap items-center gap-3 text-xs text-[#636A6F] tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#28537D]" />
                  Updated {guide.updatedAt}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#28537D]" />
                  {guide.readTimeMinutes} min read
                </span>
              </div>
            </div>

            {/* Editorial Introduction */}
            {guide.introParagraphs && guide.introParagraphs.length > 0 && (
              <div className="theme-body-text theme-reading-measure mt-6 max-w-[68ch] space-y-4 text-base leading-[1.8] text-[#24282B] sm:text-[1.09375rem]">
                {guide.introParagraphs.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            )}

            {/* Curation scope note */}
            {guide.curationSummary && (
              <p className="theme-caption mt-6 border-t border-[#E3E1DB] pt-4 text-xs leading-relaxed text-[#636A6F]">
                <strong className="font-semibold text-[#24282B]">
                  How this guide is organized:{' '}
                </strong>
                {guide.curationSummary}
              </p>
            )}

            {/* Editorial Jump Actions */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onJumpToSection('quick-picks')}
                className="theme-button-text inline-flex items-center gap-2 rounded-lg bg-[#1B3D5F] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#28537D]"
              >
                Jump to Quick Picks
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onJumpToSection('find-the-right-gift')}
                className="theme-button-text inline-flex items-center gap-2 rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-4 py-2.5 text-xs font-semibold text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
              >
                Browse by Recipient
              </button>
              {guide.sections[0] && (
                <button
                  type="button"
                  onClick={() => onJumpToSection(guide.sections[0].id)}
                  className="theme-button-text inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#28537D] underline decoration-[#28537D]/35 underline-offset-4 transition-colors hover:text-[#1B3D5F]"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Read Full Reviews
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Hero Photograph + Who This Guide Is Written For */}
          <div className="space-y-6 lg:col-span-5">
            <figure className="overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF]">
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#F6F4EF]">
                <img
                  src={guide.heroImageUrl}
                  alt={guide.heroImageAlt}
                  width={900}
                  height={675}
                  fetchPriority="high"
                  className="h-full w-full object-cover"
                />
              </div>
              {guide.heroImageCaption && (
                <figcaption className="theme-caption border-t border-[#E3E1DB] px-5 py-3 text-xs leading-relaxed text-[#636A6F]">
                  {guide.heroImageCaption}
                </figcaption>
              )}
            </figure>

            {/* Who This Guide Is Written For */}
            {guide.whoThisGuideIsFor && guide.whoThisGuideIsFor.length > 0 && (
              <aside
                aria-label="Who this gift guide serves"
                className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6"
              >
                <div className="border-b border-[#E3E1DB] pb-3">
                  <h2 className="theme-info-heading font-serif text-base font-semibold text-[#24282B]">
                    Who This Guide Is Written For
                  </h2>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {guide.whoThisGuideIsFor.map((item, idx) => (
                    <li
                      key={idx}
                      className="theme-body-sm flex items-start gap-3 text-sm leading-relaxed text-[#24282B]"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#28537D]"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </div>

        {/* Hairline Reader Disclosure */}
        <div className="theme-caption mt-10 border-t border-[#E3E1DB] pt-4 text-xs leading-relaxed text-[#636A6F]">
          {guide.affiliateDisclosure}{' '}
          <a
            href="/affiliate-disclosure/"
            className="font-semibold text-[#28537D] underline underline-offset-2 hover:text-[#1B3D5F]"
          >
            Affiliate Disclosure
          </a>
          .
        </div>
      </div>
    </header>
  );
};
