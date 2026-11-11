import React from 'react';
import { GiftGuide } from '../../types/content';
import {
  Award,
  Bookmark,
  Compass,
  HelpCircle,
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
      {/* Mobile / Tablet Non-Sticky Editorial Directory (preserves viewport height) */}
      <nav
        aria-label="Guide chapter directory"
        className="mb-8 rounded-2xl border border-[#D5CFC4] bg-[#F4EFE6] p-4 lg:hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5CFC4] pb-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#28537D]">
            In This Gift Guide
          </span>
          {savedInGuideCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#28537D] tabular-nums">
              <Bookmark className="h-3.5 w-3.5 fill-current" />
              {savedInGuideCount} Saved
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onJumpToSection('quick-picks')}
            className="rounded-lg border border-[#D5CFC4] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#222426] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
          >
            Quick Picks ({guide.quickPicks.length})
          </button>
          <button
            type="button"
            onClick={() => onJumpToSection('find-the-right-gift')}
            className="rounded-lg border border-[#D5CFC4] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#222426] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
          >
            By Recipient
          </button>
          <button
            type="button"
            onClick={() => onJumpToSection('editors-pick')}
            className="rounded-lg border border-[#D5CFC4] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#222426] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
          >
            Editor’s Standout
          </button>
          {guide.sections.map((sec, idx) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => onJumpToSection(sec.id)}
              className="rounded-lg border border-[#D5CFC4] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#222426] transition-colors hover:border-[#28537D] hover:text-[#28537D] tabular-nums"
            >
              Ch. 0{idx + 1}: {sec.shortNavTitle} ({sec.recommendations.length})
            </button>
          ))}
          {hasComparison && (
            <button
              type="button"
              onClick={() => onJumpToSection('gift-comparison')}
              className="rounded-lg border border-[#D5CFC4] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#222426] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
            >
              Comparison Ledger
            </button>
          )}
          {guide.buyingAdvice.length > 0 && (
            <button
              type="button"
              onClick={() => onJumpToSection('buying-advice')}
              className="rounded-lg border border-[#D5CFC4] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#222426] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
            >
              How to Choose
            </button>
          )}
          {hasFaqs && (
            <button
              type="button"
              onClick={() => onJumpToSection('guide-faq')}
              className="rounded-lg border border-[#D5CFC4] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#222426] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
            >
              FAQ
            </button>
          )}
        </div>

        {activeRecipientFilterLabel && onClearRecipientFilter && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-[#A7E3C5] bg-[#E8F8F0] px-3 py-2 text-xs text-[#222426]">
            <span>
              Highlighting: <strong>{activeRecipientFilterLabel}</strong>
            </span>
            <button
              type="button"
              onClick={onClearRecipientFilter}
              className="font-bold text-[#28537D] underline underline-offset-2"
            >
              Show All
            </button>
          </div>
        )}
      </nav>

      {/* Desktop Sticky Left-Rail Table of Contents */}
      <aside className="hidden lg:col-span-3 lg:block">
        <div className="sticky top-24 space-y-5">
          <nav
            aria-label="Guide sections"
            className="rounded-2xl border border-[#D5CFC4] bg-[#F4EFE6] p-5"
          >
            <div className="flex items-center justify-between border-b border-[#D5CFC4] pb-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#28537D]">
                Editorial Index
              </div>
              <span className="font-mono text-[11px] text-[#62666A] tabular-nums">
                {guide.sections.reduce(
                  (acc, s) => acc + s.recommendations.length,
                  0
                )}{' '}
                picks
              </span>
            </div>

            {/* Part I: Overview & Shortlist */}
            <div className="mt-4">
              <div className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#62666A]">
                I. Shortlist & Pathways
              </div>
              <ul className="mt-1.5 space-y-1">
                <li>
                  <button
                    type="button"
                    onClick={() => onJumpToSection('quick-picks')}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                      activeSectionId === 'quick-picks'
                        ? 'bg-[#28537D] text-white'
                        : 'text-[#292B2D] hover:bg-[#EAE3D5] hover:text-[#222426]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <ListChecks className="h-3.5 w-3.5 shrink-0" />
                      Quick Picks Ledger
                    </span>
                    <span className="font-mono text-[11px] opacity-80 tabular-nums">
                      {guide.quickPicks.length}
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onJumpToSection('find-the-right-gift')}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                      activeSectionId === 'find-the-right-gift'
                        ? 'bg-[#28537D] text-white'
                        : 'text-[#292B2D] hover:bg-[#EAE3D5] hover:text-[#222426]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Compass className="h-3.5 w-3.5 shrink-0" />
                      Find the Right Gift
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onJumpToSection('editors-pick')}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                      activeSectionId === 'editors-pick'
                        ? 'bg-[#28537D] text-white'
                        : 'text-[#292B2D] hover:bg-[#EAE3D5] hover:text-[#222426]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Award className="h-3.5 w-3.5 shrink-0" />
                      Editor’s Standout Pick
                    </span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Part II: Budget Chapters */}
            <div className="mt-5 border-t border-[#D5CFC4] pt-4">
              <div className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#62666A]">
                II. Curated Chapters
              </div>
              <ul className="mt-1.5 space-y-1">
                {guide.sections.map((sec, idx) => (
                  <li key={sec.id}>
                    <button
                      type="button"
                      onClick={() => onJumpToSection(sec.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                        activeSectionId === sec.id
                          ? 'bg-[#28537D] text-white'
                          : 'text-[#292B2D] hover:bg-[#EAE3D5] hover:text-[#222426]'
                      }`}
                    >
                      <span className="truncate pr-2">
                        <span className="mr-1.5 font-mono text-[11px] opacity-75 tabular-nums">
                          0{idx + 1}.
                        </span>
                        {sec.shortNavTitle}
                      </span>
                      <span className="font-mono text-[11px] opacity-80 tabular-nums">
                        {sec.recommendations.length}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Part III: Comparison, Buying Guide & FAQ */}
            <div className="mt-5 border-t border-[#D5CFC4] pt-4">
              <div className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#62666A]">
                III. Evaluation & Advice
              </div>
              <ul className="mt-1.5 space-y-1">
                {hasComparison && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onJumpToSection('gift-comparison')}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                        activeSectionId === 'gift-comparison'
                          ? 'bg-[#28537D] text-white'
                          : 'text-[#292B2D] hover:bg-[#EAE3D5] hover:text-[#222426]'
                      }`}
                    >
                      <Scale className="h-3.5 w-3.5 shrink-0" />
                      Gift Comparison Ledger
                    </button>
                  </li>
                )}
                {guide.buyingAdvice.length > 0 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onJumpToSection('buying-advice')}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                        activeSectionId === 'buying-advice'
                          ? 'bg-[#28537D] text-white'
                          : 'text-[#292B2D] hover:bg-[#EAE3D5] hover:text-[#222426]'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                      How to Choose
                    </button>
                  </li>
                )}
                {hasFaqs && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onJumpToSection('guide-faq')}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                        activeSectionId === 'guide-faq'
                          ? 'bg-[#28537D] text-white'
                          : 'text-[#292B2D] hover:bg-[#EAE3D5] hover:text-[#222426]'
                      }`}
                    >
                      <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                      Reader Questions (FAQ)
                    </button>
                  </li>
                )}
                {hasRelatedContent && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onJumpToSection('related-discoveries')}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                        activeSectionId === 'related-discoveries'
                          ? 'bg-[#28537D] text-white'
                          : 'text-[#292B2D] hover:bg-[#EAE3D5] hover:text-[#222426]'
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5 shrink-0" />
                      Related Guides & Research
                    </button>
                  </li>
                )}
              </ul>
            </div>

            {/* Active recipient pathway filter indicator */}
            {activeRecipientFilterLabel && onClearRecipientFilter && (
              <div className="mt-4 rounded-xl border border-[#A7E3C5] bg-[#E8F8F0] p-3 text-xs text-[#222426]">
                <div className="font-bold text-[#1B3D5F]">
                  Active Recipient Filter
                </div>
                <div className="mt-0.5 text-[#292B2D]">
                  {activeRecipientFilterLabel}
                </div>
                <button
                  type="button"
                  onClick={onClearRecipientFilter}
                  className="mt-2 text-xs font-bold text-[#28537D] underline underline-offset-2 hover:text-[#1B3D5F]"
                >
                  Reset to all recommendations
                </button>
              </div>
            )}

            {/* Saved in This Guide Counter */}
            <div className="mt-5 border-t border-[#D5CFC4] pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#62666A]">
                  <Bookmark className="h-3.5 w-3.5 text-[#28537D]" />
                  Saved in This Guide
                </span>
                <span className="font-mono font-bold text-[#28537D] tabular-nums">
                  {savedInGuideCount}
                </span>
              </div>
            </div>
          </nav>

          {/* Secondary Utility Card: Interactive Gift Finder */}
          <div className="rounded-2xl border border-[#D5CFC4] bg-[#FAF7F2] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#28537D]">
              Need a Custom Shortlist?
            </p>
            <p className="mt-1.5 font-serif text-sm font-bold text-[#222426]">
              Filter the Full Catalog by Recipient & Budget
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#62666A]">
              Combine relationship, occasion, and exact price ceiling in the interactive Gift Finder.
            </p>
            <a
              href="/gift-finder/"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#28537D] underline decoration-[#28537D]/30 underline-offset-4 hover:text-[#1B3D5F]"
            >
              Open Gift Finder →
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};
