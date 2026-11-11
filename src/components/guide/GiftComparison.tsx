import React, { useMemo, useState } from 'react';
import {
  GiftGuide,
  GuideComparisonRow,
  Product,
} from '../../types/content';
import { ArrowDownRight, Scale } from 'lucide-react';

export interface GiftComparisonProps {
  guide: GiftGuide;
  productsMap: Record<string, Product>;
  onJumpToRecommendation: (productId: string, sectionId?: string) => void;
}

export const GiftComparison: React.FC<GiftComparisonProps> = ({
  guide,
  productsMap,
  onJumpToRecommendation,
}) => {
  const [priceFilter, setPriceFilter] = useState<
    'all' | 'under-30' | '30-to-75' | 'over-75'
  >('all');

  // Map productId -> sectionId
  const productSectionMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const sec of guide.sections) {
      for (const rec of sec.recommendations) {
        if (!map.has(rec.productId)) {
          map.set(rec.productId, sec.id);
        }
      }
    }
    return map;
  }, [guide.sections]);

  // Use explicit guide.comparison.rows when defined; otherwise derive qualitative rows from guide recommendations
  const allRows = useMemo<
    Array<{ row: GuideComparisonRow; product: Product }>
  >(() => {
    if (guide.comparison?.rows && guide.comparison.rows.length > 0) {
      return guide.comparison.rows
        .map((row) => ({ row, product: productsMap[row.productId] }))
        .filter(
          (
            item
          ): item is { row: GuideComparisonRow; product: Product } =>
            Boolean(item.product)
        );
    }

    // Auto-derive from guide sections if explicit comparison rows are omitted
    const seen = new Set<string>();
    const derived: Array<{ row: GuideComparisonRow; product: Product }> = [];
    for (const sec of guide.sections) {
      for (const rec of sec.recommendations) {
        const product = productsMap[rec.productId];
        if (!product || seen.has(product.id)) continue;
        seen.add(product.id);
        derived.push({
          product,
          row: {
            productId: product.id,
            bestSuitedRecipient:
              rec.idealFor || product.bestForSummary || 'Everyday gifting',
            giftStyle: rec.awardLabel || product.productType,
            practicalUsefulness:
              rec.goodToKnow || product.detailsAndCare || 'Ready for daily use',
            personalizationOption: 'Pair with a handwritten card',
            mainAppeal: product.subtitle,
            keyConsideration: product.detailsAndCare || 'Standard care',
            bestOccasion: (product.occasions ?? []).slice(0, 2).join(', '),
          },
        });
      }
    }
    return derived;
  }, [guide.comparison, guide.sections, productsMap]);

  const filteredRows = useMemo(() => {
    return allRows.filter(({ product }) => {
      if (priceFilter === 'under-30') return product.price < 30;
      if (priceFilter === '30-to-75')
        return product.price >= 30 && product.price <= 75;
      if (priceFilter === 'over-75') return product.price > 75;
      return true;
    });
  }, [allRows, priceFilter]);

  if (allRows.length < 2) return null;

  const title =
    guide.comparison?.title || 'Comparing the Gifts in This Guide';
  const subtitle =
    guide.comparison?.subtitle ||
    'Compare recipient suitability, gift style, everyday utility, and practical care across our curated picks.';

  return (
    <section
      id="gift-comparison"
      aria-labelledby="gift-comparison-heading"
      className="scroll-mt-24 rounded-3xl border border-[#D5CFC4] bg-[#F4EFE6] p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#D5CFC4] pb-5">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#28537D]">
            <Scale className="h-3.5 w-3.5" />
            Curatorial Ledger · Side-by-Side Comparison
          </p>
          <h2
            id="gift-comparison-heading"
            className="mt-1.5 font-serif text-2xl font-bold text-[#222426] sm:text-3xl"
          >
            {title}
          </h2>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[#62666A] sm:text-sm">
            {subtitle}
          </p>
        </div>

        {/* Budget Filter Controls */}
        <div
          role="group"
          aria-label="Filter comparison table by price"
          className="flex flex-wrap gap-1.5"
        >
          {(
            [
              { id: 'all', label: `All (${allRows.length})` },
              { id: 'under-30', label: 'Under $30' },
              { id: '30-to-75', label: '$30 to $75' },
              { id: 'over-75', label: 'Over $75' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPriceFilter(tab.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors tabular-nums ${
                priceFilter === tab.id
                  ? 'border-[#28537D] bg-[#28537D] text-white'
                  : 'border-[#D5CFC4] bg-[#FAF7F2] text-[#222426] hover:border-[#28537D]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Architectural Comparison Table */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-[#D5CFC4] bg-[#FAF7F2] lg:block">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#D5CFC4] bg-[#EAE2D3] text-[11px] font-bold uppercase tracking-[0.14em] text-[#222426]">
              <th className="py-3.5 pl-5 pr-3">Gift & Maker</th>
              <th className="px-3 py-3.5">Price</th>
              <th className="px-3 py-3.5">Best Suited Recipient</th>
              <th className="px-3 py-3.5">Gift Style & Appeal</th>
              <th className="px-3 py-3.5">Practical Utility & Care</th>
              <th className="py-3.5 pl-3 pr-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DFDBD3]">
            {filteredRows.map(({ row, product }) => {
              const secId = productSectionMap.get(product.id);
              return (
                <tr
                  key={product.id}
                  className="transition-colors hover:bg-[#F3ECE1]/60"
                >
                  <td className="py-4 pl-5 pr-3 align-top">
                    <a
                      href={`/products/${product.slug}/`}
                      className="font-serif text-sm font-bold text-[#222426] hover:text-[#28537D]"
                    >
                      {product.title}
                    </a>
                    <div className="mt-0.5 text-[11px] text-[#62666A]">
                      {product.vendor}
                    </div>
                  </td>
                  <td className="px-3 py-4 align-top font-mono text-xs font-bold text-[#28537D] tabular-nums">
                    ${product.price}
                  </td>
                  <td className="max-w-[200px] px-3 py-4 align-top leading-relaxed text-[#292B2D]">
                    {row.bestSuitedRecipient}
                    {row.bestOccasion && (
                      <div className="mt-1 text-[11px] text-[#62666A]">
                        Occasions: {row.bestOccasion}
                      </div>
                    )}
                  </td>
                  <td className="max-w-[220px] px-3 py-4 align-top leading-relaxed text-[#292B2D]">
                    <div className="font-semibold text-[#222426]">
                      {row.giftStyle}
                    </div>
                    <div className="mt-0.5 text-[#62666A]">{row.mainAppeal}</div>
                  </td>
                  <td className="max-w-[220px] px-3 py-4 align-top leading-relaxed text-[#292B2D]">
                    <div>{row.practicalUsefulness}</div>
                    {row.keyConsideration && (
                      <div className="mt-1 text-[11px] text-[#62666A]">
                        Note: {row.keyConsideration}
                      </div>
                    )}
                  </td>
                  <td className="py-4 pl-3 pr-5 text-right align-top">
                    <button
                      type="button"
                      onClick={() => onJumpToRecommendation(product.id, secId)}
                      className="inline-flex items-center gap-1 font-bold text-[#28537D] hover:text-[#1B3D5F]"
                    >
                      Review
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile / Tablet Stacked Comparison Cards */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
        {filteredRows.map(({ row, product }) => {
          const secId = productSectionMap.get(product.id);
          return (
            <div
              key={product.id}
              className="rounded-2xl border border-[#D5CFC4] bg-[#FAF7F2] p-4"
            >
              <div className="flex items-start justify-between gap-2 border-b border-[#DFDBD3] pb-2.5">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#222426]">
                    <a
                      href={`/products/${product.slug}/`}
                      className="hover:text-[#28537D]"
                    >
                      {product.title}
                    </a>
                  </h3>
                  <p className="text-[11px] text-[#62666A]">
                    {product.vendor} · {row.giftStyle}
                  </p>
                </div>
                <span className="font-mono text-sm font-bold text-[#28537D] tabular-nums">
                  ${product.price}
                </span>
              </div>

              <dl className="mt-3 space-y-2 text-xs">
                <div>
                  <dt className="font-bold text-[#222426]">Best Suited For:</dt>
                  <dd className="text-[#292B2D]">{row.bestSuitedRecipient}</dd>
                </div>
                <div>
                  <dt className="font-bold text-[#222426]">Main Appeal:</dt>
                  <dd className="text-[#292B2D]">{row.mainAppeal}</dd>
                </div>
                <div>
                  <dt className="font-bold text-[#62666A]">
                    Practical Utility & Care:
                  </dt>
                  <dd className="text-[#62666A]">
                    {row.practicalUsefulness} ({row.keyConsideration})
                  </dd>
                </div>
              </dl>

              <div className="mt-3 flex items-center justify-between border-t border-[#DFDBD3] pt-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => onJumpToRecommendation(product.id, secId)}
                  className="inline-flex items-center gap-1 font-bold text-[#28537D]"
                >
                  Jump to review
                  <ArrowDownRight className="h-3.5 w-3.5" />
                </button>
                <a
                  href={`/products/${product.slug}/`}
                  className="font-semibold text-[#62666A] hover:text-[#28537D]"
                >
                  View Gift →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
