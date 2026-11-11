import React from 'react';
import { Author, GiftGuide } from '../../types/content';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  Users,
} from 'lucide-react';

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
    <header className="relative overflow-hidden border-b border-[#DFDBD3] bg-[#F4EFE6]">
      {/* Subtle architectural top rule */}
      <div className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D5CFC4] pb-4 text-xs text-[#62666A]">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 font-medium"
          >
            <a
              href="/"
              className="text-[#62666A] transition-colors hover:text-[#28537D]"
            >
              Home
            </a>
            <span aria-hidden="true" className="text-[#8C867B]">
              /
            </span>
            <a
              href="/gift-guides/"
              className="text-[#62666A] transition-colors hover:text-[#28537D]"
            >
              Gift Guides
            </a>
            <span aria-hidden="true" className="text-[#8C867B]">
              /
            </span>
            <span className="font-semibold text-[#28537D]">{guide.category}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#62666A]">
            <Sparkles className="h-3.5 w-3.5 text-[#28537D]" />
            <span>
              {guide.editorialIssueNumber ?? 'Science of Gifts · Curated Guide'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {totalRecommendationsCount} Vetted Objects ({priceRangeSummary})
            </span>
          </div>
        </div>
      </div>

      {/* Main editorial spread */}
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-12">
          {/* Left Column: Title, Dek, Byline, Intro Essay, Jump CTAs */}
          <div className="lg:col-span-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#28537D]">
              {guide.category} · Editorial Gift Guide
            </p>

            <h1 className="mt-3 font-serif text-3xl font-bold leading-[1.1] tracking-tight text-[#222426] sm:text-5xl lg:text-[3.35rem]">
              {guide.title}
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#292B2D] sm:text-xl sm:leading-[1.55]">
              {guide.subtitle}
            </p>

            {/* Author & Curation Metadata Bar */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-[#D5CFC4] py-4">
              {author ? (
                <div className="flex items-center gap-3.5">
                  <img
                    src={author.avatarUrl}
                    alt={author.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full border border-[#D5CFC4] object-cover"
                  />
                  <div>
                    <div className="text-sm font-bold text-[#222426]">
                      Curated by {author.name}
                    </div>
                    <div className="text-xs text-[#62666A]">{author.role}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-bold text-[#222426]">
                  Science of Gifts Editorial Desk
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[#62666A] tabular-nums">
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

            {/* Editorial Introduction with Drop Cap on First Paragraph */}
            {guide.introParagraphs && guide.introParagraphs.length > 0 && (
              <div className="mt-6 space-y-4 text-base leading-[1.75] text-[#292B2D] sm:text-[1.0625rem]">
                {guide.introParagraphs.map((para, idx) => (
                  <p
                    key={idx}
                    className={
                      idx === 0
                        ? 'first-letter:float-left first-letter:mr-3 first-letter:font-serif first-letter:text-4xl first-letter:font-bold first-letter:leading-none first-letter:text-[#28537D]'
                        : ''
                    }
                  >
                    {para}
                  </p>
                ))}
              </div>
            )}

            {/* Curation scope note */}
            {guide.curationSummary && (
              <div className="mt-6 border-t border-[#DFDBD3] pt-4 text-xs leading-relaxed text-[#62666A]">
                <span className="font-bold uppercase tracking-[0.14em] text-[#222426]">
                  How This Guide Is Structured:{' '}
                </span>
                {guide.curationSummary}
              </div>
            )}

            {/* Editorial Jump Actions */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onJumpToSection('quick-picks')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#28537D] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#1E4164]"
              >
                Jump to Quick Picks
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onJumpToSection('find-the-right-gift')}
                className="inline-flex items-center gap-2 rounded-xl border border-[#C9C1B4] bg-[#FAF7F2] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#222426] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#28537D]" />
                Browse by Recipient
              </button>
              {guide.sections[0] && (
                <button
                  type="button"
                  onClick={() => onJumpToSection(guide.sections[0].id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-[#28537D] underline decoration-[#28537D]/30 underline-offset-4 transition-colors hover:text-[#1B3D5F]"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Read Full Reviews
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Hero Photograph + Who This Guide Serves Dossier */}
          <div className="space-y-6 lg:col-span-5">
            <figure className="overflow-hidden rounded-2xl border border-[#D5CFC4] bg-[#FAF7F2] shadow-sm">
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#EDE7DC]">
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
                <figcaption className="border-t border-[#DFDBD3] bg-[#FAF7F2] px-5 py-3.5 font-serif text-xs italic leading-relaxed text-[#62666A]">
                  {guide.heroImageCaption}
                </figcaption>
              )}
            </figure>

            {/* Architectural Dossier: Who This Guide Is For */}
            {guide.whoThisGuideIsFor && guide.whoThisGuideIsFor.length > 0 && (
              <aside
                aria-label="Who this gift guide serves"
                className="rounded-2xl border border-[#D5CFC4] bg-[#FAF7F2] p-5 sm:p-6"
              >
                <div className="flex items-center justify-between border-b border-[#DFDBD3] pb-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#28537D]">
                    <Users className="h-3.5 w-3.5" />
                    Who This Guide Is Written For
                  </div>
                  <span className="font-serif text-xs italic text-[#62666A]">
                    Reader Checklist
                  </span>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {guide.whoThisGuideIsFor.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm leading-relaxed text-[#292B2D]"
                    >
                      <span className="mt-0.5 font-mono text-xs font-bold text-[#28537D] tabular-nums">
                        0{idx + 1}.
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </div>

        {/* Hairline Reader Disclosure */}
        <div className="mt-8 border-t border-[#D5CFC4] pt-4 text-xs leading-relaxed text-[#62666A]">
          {guide.affiliateDisclosure}
        </div>
      </div>
    </header>
  );
};
