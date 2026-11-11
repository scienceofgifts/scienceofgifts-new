import React from 'react';
import { GiftGuide } from '../../types/content';
import {
  Award,
  Bookmark,
  CircleHelp,
  Compass,
  Layers,
  ListChecks,
  Scale,
  Sparkles,
} from 'lucide-react';

export interface GuideSectionNavigationProps {
  guide: GiftGuide;
  activeSectionId: string;
  savedInGuideCount: number;
  hasComparison: boolean;
  hasFaqs: boolean;
  hasRelatedContent: boolean;
  activeRecipientFilterLabel?: string | null;
  onClearRecipientFilter?: () => void;
  onJumpToSection: (sectionId: string) => void;
}

export const GuideSectionNavigation: React.FC<GuideSectionNavigationProps> = ({
  guide,
  activeSectionId,
  savedInGuideCount,
  hasComparison,
  hasFaqs,
  hasRelatedContent,
  activeRecipientFilterLabel,
  onClearRecipientFilter,
  onJumpToSection,
}) => {
  return (
    <>
      {/* Mobile / Tablet Non-Sticky Editorial Directory */}
      <nav
        aria-label="Guide chapter directory"
        className="mb-8 rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-4 lg:hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E1DB] pb-2.5">
          <span className="text-xs font-semibold text-[#24282B]">
            In This Guide
          </span>
          {savedInGuideCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#28537D] tabular-nums">
              <Bookmark
                aria-hidden="true"
                strokeWidth={1.75}
                className="h-3.5 w-3.5 fill-current"
              />
              {savedInGuideCount} saved
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onJumpToSection('quick-picks')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-1.5 text-xs font-medium text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
          >
            <ListChecks
              aria-hidden="true"
              strokeWidth={1.75}
              className="h-3.5 w-3.5 shrink-0 text-[#636A6F]"
            />
            <span>Quick Picks</span>
          </button>
          <button
            type="button"
            onClick={() => onJumpToSection('find-the-right-gift')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-1.5 text-xs font-medium text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
          >
            <Compass
              aria-hidden="true"
              strokeWidth={1.75}
              className="h-3.5 w-3.5 shrink-0 text-[#636A6F]"
            />
            <span>By Recipient</span>
          </button>
          <button
            type="button"
            onClick={() => onJumpToSection('editors-pick')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-1.5 text-xs font-medium text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
          >
            <Award
              aria-hidden="true"
              strokeWidth={1.75}
              className="h-3.5 w-3.5 shrink-0 text-[#636A6F]"
            />
            <span>Editor’s Pick</span>
          </button>
          {guide.sections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => onJumpToSection(sec.id)}
              className="rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-1.5 text-xs font-medium text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
            >
              {sec.shortNavTitle}
            </button>
          ))}
          {hasComparison && (
            <button
              type="button"
              onClick={() => onJumpToSection('gift-comparison')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-1.5 text-xs font-medium text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
            >
              <Scale
                aria-hidden="true"
                strokeWidth={1.75}
                className="h-3.5 w-3.5 shrink-0 text-[#636A6F]"
              />
              <span>Compare the Gifts</span>
            </button>
          )}
          {guide.buyingAdvice.length > 0 && (
            <button
              type="button"
              onClick={() => onJumpToSection('buying-advice')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-1.5 text-xs font-medium text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
            >
              <Sparkles
                aria-hidden="true"
                strokeWidth={1.75}
                className="h-3.5 w-3.5 shrink-0 text-[#636A6F]"
              />
              <span>Buying Advice</span>
            </button>
          )}
          {hasFaqs && (
            <button
              type="button"
              onClick={() => onJumpToSection('guide-faq')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-1.5 text-xs font-medium text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
            >
              <CircleHelp
                aria-hidden="true"
                strokeWidth={1.75}
                className="h-3.5 w-3.5 shrink-0 text-[#636A6F]"
              />
              <span>Questions</span>
            </button>
          )}
        </div>

        {activeRecipientFilterLabel && onClearRecipientFilter && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-[#C6E4D6] bg-[#E5F3EC] px-3 py-2 text-xs text-[#24282B]">
            <span>
              Filtered for: <strong>{activeRecipientFilterLabel}</strong>
            </span>
            <button
              type="button"
              onClick={onClearRecipientFilter}
              className="font-semibold text-[#28537D] underline underline-offset-2"
            >
              Show all
            </button>
          </div>
        )}
      </nav>

      {/* Desktop Sticky Left-Rail Editorial Index (Light, Restrained, No Heavy Box) */}
      <aside className="hidden lg:col-span-3 lg:block">
        <div className="sticky top-24 space-y-6 pr-2">
          <nav
            aria-label="Guide sections"
            className="border-t border-[#E3E1DB] pt-4"
          >
            <div className="flex items-center justify-between pb-3">
              <span className="font-serif text-sm font-semibold text-[#24282B]">
                In This Guide
              </span>
              <span className="text-xs text-[#636A6F] tabular-nums">
                {guide.sections.reduce(
                  (acc, s) => acc + s.recommendations.length,
                  0
                )}{' '}
                picks
              </span>
            </div>

            {/* Overview & Shortlist */}
            <ul className="space-y-1 border-t border-[#E3E1DB] pt-3">
              <li>
                <button
                  type="button"
                  onClick={() => onJumpToSection('quick-picks')}
                  className={`group flex w-full items-center justify-between py-1.5 text-left text-xs transition-colors ${
                    activeSectionId === 'quick-picks'
                      ? 'border-l-2 border-[#1B3D5F] pl-2.5 font-semibold text-[#1B3D5F]'
                      : 'pl-3 text-[#636A6F] hover:text-[#24282B]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <ListChecks
                      aria-hidden="true"
                      strokeWidth={1.75}
                      className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                        activeSectionId === 'quick-picks'
                          ? 'text-[#1B3D5F]'
                          : 'text-[#636A6F] group-hover:text-[#24282B]'
                      }`}
                    />
                    <span>Quick Picks</span>
                  </span>
                  <span className="text-[11px] text-[#636A6F] tabular-nums">
                    {guide.quickPicks.length}
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onJumpToSection('find-the-right-gift')}
                  className={`group flex w-full items-center justify-between py-1.5 text-left text-xs transition-colors ${
                    activeSectionId === 'find-the-right-gift'
                      ? 'border-l-2 border-[#1B3D5F] pl-2.5 font-semibold text-[#1B3D5F]'
                      : 'pl-3 text-[#636A6F] hover:text-[#24282B]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Compass
                      aria-hidden="true"
                      strokeWidth={1.75}
                      className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                        activeSectionId === 'find-the-right-gift'
                          ? 'text-[#1B3D5F]'
                          : 'text-[#636A6F] group-hover:text-[#24282B]'
                      }`}
                    />
                    <span>Find the Right Gift</span>
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onJumpToSection('editors-pick')}
                  className={`group flex w-full items-center justify-between py-1.5 text-left text-xs transition-colors ${
                    activeSectionId === 'editors-pick'
                      ? 'border-l-2 border-[#1B3D5F] pl-2.5 font-semibold text-[#1B3D5F]'
                      : 'pl-3 text-[#636A6F] hover:text-[#24282B]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Award
                      aria-hidden="true"
                      strokeWidth={1.75}
                      className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                        activeSectionId === 'editors-pick'
                          ? 'text-[#1B3D5F]'
                          : 'text-[#636A6F] group-hover:text-[#24282B]'
                      }`}
                    />
                    <span>Editor’s Pick</span>
                  </span>
                </button>
              </li>
            </ul>

            {/* Budget Chapters */}
            <div className="mt-4 border-t border-[#E3E1DB] pt-3">
              <div className="mb-1.5 text-[11px] font-medium text-[#636A6F]">
                Recommendations by Budget
              </div>
              <ul className="space-y-1">
                {guide.sections.map((sec) => (
                  <li key={sec.id}>
                    <button
                      type="button"
                      onClick={() => onJumpToSection(sec.id)}
                      className={`flex w-full items-center justify-between py-1.5 text-left text-xs transition-colors ${
                        activeSectionId === sec.id
                          ? 'border-l-2 border-[#1B3D5F] pl-2.5 font-semibold text-[#1B3D5F]'
                          : 'pl-3 text-[#636A6F] hover:text-[#24282B]'
                      }`}
                    >
                      <span className="truncate pr-2">{sec.shortNavTitle}</span>
                      <span className="text-[11px] text-[#636A6F] tabular-nums">
                        {sec.recommendations.length}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Comparison, Buying Advice & FAQ */}
            <div className="mt-4 border-t border-[#E3E1DB] pt-3">
              <div className="mb-1.5 text-[11px] font-medium text-[#636A6F]">
                Comparison & Advice
              </div>
              <ul className="space-y-1">
                {hasComparison && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onJumpToSection('gift-comparison')}
                      className={`group flex w-full items-center justify-between py-1.5 text-left text-xs transition-colors ${
                        activeSectionId === 'gift-comparison'
                          ? 'border-l-2 border-[#1B3D5F] pl-2.5 font-semibold text-[#1B3D5F]'
                          : 'pl-3 text-[#636A6F] hover:text-[#24282B]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Scale
                          aria-hidden="true"
                          strokeWidth={1.75}
                          className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                            activeSectionId === 'gift-comparison'
                              ? 'text-[#1B3D5F]'
                              : 'text-[#636A6F] group-hover:text-[#24282B]'
                          }`}
                        />
                        <span>Compare the Gifts</span>
                      </span>
                    </button>
                  </li>
                )}
                {guide.buyingAdvice.length > 0 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onJumpToSection('buying-advice')}
                      className={`group flex w-full items-center justify-between py-1.5 text-left text-xs transition-colors ${
                        activeSectionId === 'buying-advice'
                          ? 'border-l-2 border-[#1B3D5F] pl-2.5 font-semibold text-[#1B3D5F]'
                          : 'pl-3 text-[#636A6F] hover:text-[#24282B]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Sparkles
                          aria-hidden="true"
                          strokeWidth={1.75}
                          className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                            activeSectionId === 'buying-advice'
                              ? 'text-[#1B3D5F]'
                              : 'text-[#636A6F] group-hover:text-[#24282B]'
                          }`}
                        />
                        <span>How to Choose</span>
                      </span>
                    </button>
                  </li>
                )}
                {hasFaqs && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onJumpToSection('guide-faq')}
                      className={`group flex w-full items-center justify-between py-1.5 text-left text-xs transition-colors ${
                        activeSectionId === 'guide-faq'
                          ? 'border-l-2 border-[#1B3D5F] pl-2.5 font-semibold text-[#1B3D5F]'
                          : 'pl-3 text-[#636A6F] hover:text-[#24282B]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <CircleHelp
                          aria-hidden="true"
                          strokeWidth={1.75}
                          className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                            activeSectionId === 'guide-faq'
                              ? 'text-[#1B3D5F]'
                              : 'text-[#636A6F] group-hover:text-[#24282B]'
                          }`}
                        />
                        <span>Common Questions</span>
                      </span>
                    </button>
                  </li>
                )}
                {hasRelatedContent && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onJumpToSection('related-discoveries')}
                      className={`group flex w-full items-center justify-between py-1.5 text-left text-xs transition-colors ${
                        activeSectionId === 'related-discoveries'
                          ? 'border-l-2 border-[#1B3D5F] pl-2.5 font-semibold text-[#1B3D5F]'
                          : 'pl-3 text-[#636A6F] hover:text-[#24282B]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Layers
                          aria-hidden="true"
                          strokeWidth={1.75}
                          className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                            activeSectionId === 'related-discoveries'
                              ? 'text-[#1B3D5F]'
                              : 'text-[#636A6F] group-hover:text-[#24282B]'
                          }`}
                        />
                        <span>Related Reading</span>
                      </span>
                    </button>
                  </li>
                )}
              </ul>
            </div>

            {/* Active recipient pathway filter indicator */}
            {activeRecipientFilterLabel && onClearRecipientFilter && (
              <div className="mt-4 rounded-xl border border-[#C6E4D6] bg-[#E5F3EC] p-3 text-xs text-[#24282B]">
                <div className="font-semibold text-[#1B3D5F]">
                  Filtered by Recipient
                </div>
                <div className="mt-0.5 text-[#24282B]">
                  {activeRecipientFilterLabel}
                </div>
                <button
                  type="button"
                  onClick={onClearRecipientFilter}
                  className="mt-1.5 text-xs font-semibold text-[#28537D] underline underline-offset-2 hover:text-[#1B3D5F]"
                >
                  Show all recommendations
                </button>
              </div>
            )}

            {/* Saved in This Guide Counter */}
            <div className="mt-4 border-t border-[#E3E1DB] pt-3">
              <div className="flex items-center justify-between pl-3 text-xs text-[#636A6F]">
                <span className="inline-flex items-center gap-2">
                  <Bookmark
                    aria-hidden="true"
                    strokeWidth={1.75}
                    className={`h-3.5 w-3.5 shrink-0 ${
                      savedInGuideCount > 0
                        ? 'text-[#1B3D5F]'
                        : 'text-[#636A6F]'
                    }`}
                  />
                  <span>Saved in this guide</span>
                </span>
                <span className="font-semibold text-[#24282B] tabular-nums">
                  {savedInGuideCount}
                </span>
              </div>
            </div>
          </nav>

          {/* Restrained Discovery Note */}
          <div className="border-t border-[#E3E1DB] pt-4 text-xs">
            <p className="font-serif text-sm font-semibold text-[#24282B]">
              Looking for a specific budget or occasion?
            </p>
            <p className="mt-1 leading-relaxed text-[#636A6F]">
              Filter the full catalog by recipient, relationship, and price ceiling in the Gift Finder.
            </p>
            <a
              href="/gift-finder/"
              className="mt-2 inline-block font-semibold text-[#28537D] underline decoration-[#28537D]/35 underline-offset-4 hover:text-[#1B3D5F]"
            >
              Open Gift Finder →
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};
