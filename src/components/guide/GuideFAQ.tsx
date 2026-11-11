import React, { useState } from 'react';
import { GuideFAQItem, Product } from '../../types/content';
import { ArrowDownRight, ChevronDown } from 'lucide-react';

export interface GuideFAQProps {
  faqs?: GuideFAQItem[];
  productsMap: Record<string, Product>;
  onJumpToRecommendation: (productId: string) => void;
}

export const GuideFAQ: React.FC<GuideFAQProps> = ({
  faqs,
  productsMap,
  onJumpToRecommendation,
}) => {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>(() => {
    if (!faqs || faqs.length === 0) return {};
    return { [faqs[0].id]: true };
  });

  if (!faqs || faqs.length === 0) return null;

  const allExpanded = faqs.every((f) => Boolean(openIds[f.id]));

  const toggleItem = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = () => {
    if (allExpanded) {
      setOpenIds({});
    } else {
      const next: Record<string, boolean> = {};
      for (const f of faqs) next[f.id] = true;
      setOpenIds(next);
    }
  };

  return (
    <section
      id="guide-faq"
      aria-labelledby="guide-faq-heading"
      className="scroll-mt-24 border-t border-[#E3E1DB] pt-10"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E1DB] pb-4">
        <div>
          <p className="text-xs font-semibold text-[#28537D]">
            Common Questions
          </p>
          <h2
            id="guide-faq-heading"
            className="mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
          >
            Frequently Asked Questions
          </h2>
        </div>

        <button
          type="button"
          onClick={toggleAll}
          className="rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3.5 py-2 text-xs font-semibold text-[#28537D] transition-colors hover:border-[#28537D]"
        >
          {allExpanded ? 'Collapse All Answers' : 'Expand All Answers'}
        </button>
      </div>

      <div className="mt-6 divide-y divide-[#E3E1DB] rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF]">
        {faqs.map((faq) => {
          const isOpen = Boolean(openIds[faq.id]);
          const panelId = `faq-answer-${faq.id}`;
          const relatedProduct = faq.relatedProductId
            ? productsMap[faq.relatedProductId]
            : undefined;

          return (
            <div key={faq.id} className="p-5 sm:p-6">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleItem(faq.id)}
                  className="flex w-full items-start justify-between gap-4 text-left"
                >
                  <span className="font-serif text-base font-semibold leading-snug text-[#24282B] sm:text-lg">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`mt-1 h-4 w-4 shrink-0 text-[#28537D] transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </h3>

              <div id={panelId} hidden={!isOpen} className="mt-3">
                <p className="max-w-[68ch] text-sm leading-[1.8] text-[#24282B] sm:text-base">
                  {faq.answer}
                </p>

                {relatedProduct && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => onJumpToRecommendation(relatedProduct.id)}
                      className="inline-flex items-center gap-1 font-semibold text-[#28537D] underline decoration-[#28537D]/35 underline-offset-4 hover:text-[#1B3D5F]"
                    >
                      Jump to {relatedProduct.title} (${relatedProduct.price})
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    </button>
                    <span aria-hidden="true" className="text-[#C5C1B8]">
                      ·
                    </span>
                    <a
                      href={`/products/${relatedProduct.slug}/`}
                      className="font-medium text-[#636A6F] hover:text-[#28537D]"
                    >
                      Read Gift Profile →
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
