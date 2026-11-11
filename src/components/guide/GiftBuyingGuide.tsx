import React, { useState } from 'react';
import { GuideBuyingTip } from '../../types/content';
import { BookOpen, ChevronDown, Sparkles } from 'lucide-react';

export interface GiftBuyingGuideProps {
  guideTitle: string;
  buyingAdviceIntro?: string;
  buyingAdvice: GuideBuyingTip[];
}

export const GiftBuyingGuide: React.FC<GiftBuyingGuideProps> = ({
  guideTitle,
  buyingAdviceIntro,
  buyingAdvice,
}) => {
  const [expandedTips, setExpandedTips] = useState<Record<string, boolean>>({});

  if (buyingAdvice.length === 0) return null;

  const toggleTip = (id: string) => {
    setExpandedTips((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section
      id="buying-advice"
      aria-labelledby="buying-advice-heading"
      className="scroll-mt-24 rounded-3xl border border-[#D5CFC4] bg-[#FAF7F2] p-6 sm:p-8 lg:p-10"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Essay Header & Curatorial Principles */}
        <div className="lg:col-span-5">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#28537D]">
            <BookOpen className="h-3.5 w-3.5" />
            Curatorial Methodology · Buying Guide
          </p>

          <h2
            id="buying-advice-heading"
            className="mt-2 font-serif text-2xl font-bold leading-snug text-[#222426] sm:text-3xl"
          >
            How to Choose the Right Gift From This Guide
          </h2>

          {buyingAdviceIntro ? (
            <p className="mt-3 text-sm leading-[1.75] text-[#292B2D] sm:text-base">
              {buyingAdviceIntro}
            </p>
          ) : (
            <p className="mt-3 text-sm leading-[1.75] text-[#292B2D] sm:text-base">
              Choosing a memorable gift is less about spending more and more about matching the object to how your recipient actually lives.
            </p>
          )}

          {/* Quick Decision Checklist Box */}
          <div className="mt-6 rounded-2xl border border-[#D5CFC4] bg-[#F4EFE6] p-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#28537D]">
              <Sparkles className="h-3.5 w-3.5" />
              Three Questions Before You Buy
            </div>
            <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-[#292B2D]">
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold text-[#28537D] tabular-nums">
                  01.
                </span>
                <span>
                  <strong>Daily Touchpoint:</strong> Will they interact with this object during a morning or evening routine?
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold text-[#28537D] tabular-nums">
                  02.
                </span>
                <span>
                  <strong>Space Footprint:</strong> Does it replace an older item or disappear cleanly once enjoyed?
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold text-[#28537D] tabular-nums">
                  03.
                </span>
                <span>
                  <strong>Personal Note:</strong> Can you add a two-sentence card explaining why it reminded you of them?
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Numbered Buying Advice Chapters with Expandable Research Notes */}
        <div className="space-y-4 lg:col-span-7">
          {buyingAdvice.map((tip, idx) => {
            const isExpanded = Boolean(expandedTips[tip.id]);
            const panelId = `buying-tip-panel-${tip.id}`;

            return (
              <article
                key={tip.id}
                className="rounded-2xl border border-[#D5CFC4] bg-[#F4EFE6]/60 p-5 sm:p-6"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-serif text-lg font-bold text-[#222426] sm:text-xl">
                    {tip.heading}
                  </h3>
                  <span className="font-mono text-xs font-bold text-[#62666A] tabular-nums">
                     Principle 0{idx + 1}
                  </span>
                </div>

                <p className="mt-2.5 text-sm leading-[1.75] text-[#292B2D] sm:text-base">
                  {tip.body}
                </p>

                {tip.expandablePrompt && tip.expandableDetails && (
                  <div className="mt-4 border-t border-[#D5CFC4] pt-3">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      onClick={() => toggleTip(tip.id)}
                      className="flex w-full items-center justify-between gap-2 text-left text-xs font-bold text-[#28537D] transition-colors hover:text-[#1B3D5F]"
                    >
                      <span>{tip.expandablePrompt}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div
                        id={panelId}
                        className="mt-3 rounded-xl border border-[#DFDBD3] bg-[#FAF7F2] p-4 text-xs leading-relaxed text-[#292B2D] sm:text-sm"
                      >
                        {tip.expandableDetails}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
