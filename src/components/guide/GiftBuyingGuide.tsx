import React, { useState } from 'react';
import { GuideBuyingTip } from '../../types/content';
import { ChevronDown } from 'lucide-react';

export interface GiftBuyingGuideProps {
  guideTitle: string;
  buyingAdviceIntro?: string;
  buyingAdvice: GuideBuyingTip[];
}

export const GiftBuyingGuide: React.FC<GiftBuyingGuideProps> = ({
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
      className="scroll-mt-24 border-t border-[#E3E1DB] pt-10"
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Essay Header & Three Questions */}
        <div className="lg:col-span-5">
          <p className="theme-kicker text-xs font-semibold text-[#28537D]">
            Buying Advice
          </p>

          <h2
            id="buying-advice-heading"
            className="theme-section-heading mt-1.5 font-serif text-2xl font-semibold leading-snug text-[#24282B] sm:text-3xl"
          >
            How to Choose the Right Gift From This Guide
          </h2>

          {buyingAdviceIntro ? (
            <p className="theme-body-text mt-3 text-sm leading-[1.8] text-[#24282B] sm:text-base">
              {buyingAdviceIntro}
            </p>
          ) : (
            <p className="theme-body-text mt-3 text-sm leading-[1.8] text-[#24282B] sm:text-base">
              Choosing a memorable gift is less about spending more and more about matching the object to how your recipient actually lives.
            </p>
          )}

          {/* Three Questions Before You Buy */}
          <div className="mt-6 rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-5">
            <h3 className="theme-info-heading font-serif text-base font-semibold text-[#24282B]">
              Three Questions Before You Buy
            </h3>
            <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-[#24282B]">
              <li className="flex items-start gap-2.5">
                <span className="font-semibold text-[#28537D] tabular-nums">
                  1.
                </span>
                <span>
                  <strong>Daily Touchpoint:</strong> Will they interact with this object during a morning or evening routine?
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-semibold text-[#28537D] tabular-nums">
                  2.
                </span>
                <span>
                  <strong>Space Footprint:</strong> Does it replace an older item or disappear cleanly once enjoyed?
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-semibold text-[#28537D] tabular-nums">
                  3.
                </span>
                <span>
                  <strong>Personal Note:</strong> Can you add a two-sentence card explaining why it reminded you of them?
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Buying Advice Principles on Clean #FFFFFF Surface */}
        <div className="divide-y divide-[#E3E1DB] rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] lg:col-span-7">
          {buyingAdvice.map((tip, idx) => {
            const isExpanded = Boolean(expandedTips[tip.id]);
            const panelId = `buying-tip-panel-${tip.id}`;

            return (
              <article key={tip.id} className="p-6">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="theme-subsection-heading font-serif text-lg font-semibold text-[#24282B] sm:text-xl">
                    {tip.heading}
                  </h3>
                  <span className="theme-metadata text-xs font-medium text-[#636A6F] tabular-nums">
                    Principle 0{idx + 1}
                  </span>
                </div>

                <p className="theme-body-text mt-2.5 text-sm leading-[1.8] text-[#24282B] sm:text-base">
                  {tip.body}
                </p>

                {tip.expandablePrompt && tip.expandableDetails && (
                  <div className="mt-4 border-t border-[#E3E1DB] pt-3">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      onClick={() => toggleTip(tip.id)}
                      className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-[#28537D] transition-colors hover:text-[#1B3D5F]"
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
                        className="theme-body-sm mt-3 rounded-xl border border-[#E3E1DB] bg-[#FAF9F6] p-4 text-xs leading-relaxed text-[#24282B] sm:text-sm"
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
