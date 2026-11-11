import React, { useState } from 'react';
import { GuideFAQItem, Product } from '../../types/content';
import { ArrowDownRight, ChevronDown, HelpCircle } from 'lucide-react';

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
  // Open the first FAQ item by default so static HTML and initial readers see an immediate answer
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
      className="scroll-mt-24 rounded-3xl border border-[#D5CFC4] bg-[#F4EFE6] p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#D5CFC4] pb-5">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#28537D]">
            <HelpCircle className="h-3.5 w-3.5" />
            Practical Gifting Questions · Answered
          </p>
          <h2
            id="guide-faq-heading"
            className="mt-1.5 font-serif text-2xl font-bold text-[#222426] sm:text-3xl"
          >
            Frequently Asked Questions
          </h2>
        </div>

        <button
          type="button"
          onClick={toggleAll}
          className="rounded-lg border border-[#D5CFC4] bg-[#FAF7F2] px-3.5 py-2 text-xs font-bold text-[#28537D] transition-colors hover:border-[#28537D]"
        >
          {allExpanded ? 'Collapse All Answers' : 'Expand All Answers'}
        </button>
      </div>

      <div className="mt-6 divide-y divide-[#DFDBD3] rounded-2xl border border-[#D5CFC4] bg-[#FAF7F2]">
        {faqs.map((faq, idx) => {
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
                  <span className="font-serif text-base font-bold leading-snug text-[#222426] sm:text-lg">
                    <span className="mr-2 font-mono text-xs text-[#28537D] tabular-nums">
                      Q0{idx + 1}.
                    </span>
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`mt-1 h-4 w-4 shrink-0 text-[#28537D] transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </h3>

              <div
                id={panelId}
                hidden={!isOpen}
                className="mt-3 pl-0 sm:pl-8"
              >
                <p className="text-sm leading-[1.75] text-[#292B2D] sm:text-base">
                  {faq.answer}
                </p>

                {relatedProduct && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => onJumpToRecommendation(relatedProduct.id)}
                      className="inline-flex items-center gap-1 font-bold text-[#28537D] underline decoration-[#28537D]/30 underline-offset-4 hover:text-[#1B3D5F]"
                    >
                      Jump to {relatedProduct.title} (${relatedProduct.price})
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    </button>
                    <span aria-hidden="true" className="text-[#8C867B]">
                      ·
                    </span>
                    <a
                      href={`/products/${relatedProduct.slug}/`}
                      className="font-semibold text-[#62666A] hover:text-[#28537D]"
                    >
                      Open Product Profile →
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
