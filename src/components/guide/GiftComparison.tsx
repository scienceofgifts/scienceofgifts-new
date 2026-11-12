import React, { useMemo, useState } from 'react';
import {
  GiftGuide,
  GuideComparisonRow,
  Product,
} from '../../types/content';
import { ArrowDownRight } from 'lucide-react';

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
      className="scroll-mt-24 border-t border-[#E3E1DB] pt-10"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E1DB] pb-4">
        <div>
          <p className="theme-kicker text-xs font-semibold text-[#28537D]">
            Side-by-Side Comparison
          </p>
          <h2
            id="gift-comparison-heading"
            className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
          >
            {title}
          </h2>
          <p className="theme-caption mt-1.5 max-w-2xl text-xs leading-relaxed text-[#636A6F] sm:text-sm">
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
              className={`theme-button-text rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors tabular-nums ${
                priceFilter === tab.id
                  ? 'border-[#1B3D5F] bg-[#1B3D5F] text-white'
                  : 'border-[#E3E1DB] bg-[#FFFFFF] text-[#24282B] hover:border-[#28537D]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Comparison Table on Clean #FFFFFF Paper */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] lg:block">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#E3E1DB] bg-[#FAF9F6] text-xs font-semibold text-[#24282B]">
              <th className="py-3.5 pl-5 pr-3">Gift & Maker</th>
              <th className="px-3 py-3.5">Price</th>
              <th className="px-3 py-3.5">Best Suited Recipient</th>
              <th className="px-3 py-3.5">Gift Style & Appeal</th>
              <th className="px-3 py-3.5">Practical Utility & Care</th>
              <th className="py-3.5 pl-3 pr-5 text-right">Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E1DB]">
            {filteredRows.map(({ row, product }) => {
              const secId = productSectionMap.get(product.id);
              const bestFor =
                row.bestSuitedRecipient ||
                row.bestFor ||
                product.bestForSummary;
              const styleLabel =
                row.giftStyle || row.standoutTrait || product.productType;
              const appeal = row.mainAppeal || product.subtitle;
              const utility =
                row.practicalUsefulness ||
                row.everydayUsefulness ||
                product.detailsAndCare;
              const note = row.keyConsideration || row.careOrStorage;

              return (
                <tr
                  key={product.id}
                  className="transition-colors hover:bg-[#FAF9F6]"
                >
                  <td className="py-4 pl-5 pr-3 align-top">
                    <a
                      href={`/products/${product.slug}/`}
                      className="theme-product-title font-serif text-sm font-semibold text-[#24282B] hover:text-[#28537D]"
                    >
                      {product.title}
                    </a>
                    <div className="theme-metadata mt-0.5 text-[11px] text-[#636A6F]">
                      {product.vendor}
                    </div>
                  </td>
                  <td className="px-3 py-4 align-top font-semibold text-[#24282B] tabular-nums">
                    ${product.price}
                  </td>
                  <td className="max-w-[200px] px-3 py-4 align-top leading-relaxed text-[#24282B]">
                    {bestFor}
                    {row.bestOccasion && (
                      <div className="mt-1 text-[11px] text-[#636A6F]">
                        Occasions: {row.bestOccasion}
                      </div>
                    )}
                  </td>
                  <td className="max-w-[220px] px-3 py-4 align-top leading-relaxed text-[#24282B]">
                    <div className="font-semibold text-[#1B3D5F]">
                      {styleLabel}
                    </div>
                    <div className="mt-0.5 text-[#636A6F]">{appeal}</div>
                  </td>
                  <td className="max-w-[220px] px-3 py-4 align-top leading-relaxed text-[#24282B]">
                    <div>{utility}</div>
                    {note && (
                      <div className="mt-1 text-[11px] text-[#636A6F]">
                        Note: {note}
                      </div>
                    )}
                  </td>
                  <td className="py-4 pl-3 pr-5 text-right align-top">
                    <button
                      type="button"
                      onClick={() => onJumpToRecommendation(product.id, secId)}
                      className="inline-flex items-center gap-1 font-semibold text-[#28537D] hover:text-[#1B3D5F]"
                    >
                      Jump
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
          const bestFor =
            row.bestSuitedRecipient || row.bestFor || product.bestForSummary;
          const styleLabel =
            row.giftStyle || row.standoutTrait || product.productType;
          const appeal = row.mainAppeal || product.subtitle;
          const utility =
            row.practicalUsefulness ||
            row.everydayUsefulness ||
            product.detailsAndCare;

          return (
            <div
              key={product.id}
              className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-4"
            >
              <div className="flex items-start justify-between gap-2 border-b border-[#E3E1DB] pb-2.5">
                <div>
                  <h3 className="theme-product-title font-serif text-base font-semibold text-[#24282B]">
                    <a
                      href={`/products/${product.slug}/`}
                      className="hover:text-[#28537D]"
                    >
                      {product.title}
                    </a>
                  </h3>
                  <p className="theme-metadata text-[11px] text-[#636A6F]">
                    {product.vendor} · {styleLabel}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[#24282B] tabular-nums">
                  ${product.price}
                </span>
              </div>

              <dl className="mt-3 space-y-2 text-xs">
                <div>
                  <dt className="font-semibold text-[#1B3D5F]">Best for:</dt>
                  <dd className="text-[#24282B]">{bestFor}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#24282B]">Main appeal:</dt>
                  <dd className="text-[#24282B]">{appeal}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#636A6F]">
                    Practical utility:
                  </dt>
                  <dd className="text-[#636A6F]">{utility}</dd>
                </div>
              </dl>

              <div className="mt-3 flex items-center justify-between border-t border-[#E3E1DB] pt-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => onJumpToRecommendation(product.id, secId)}
                  className="inline-flex items-center gap-1 font-semibold text-[#28537D]"
                >
                  Jump to review
                  <ArrowDownRight className="h-3.5 w-3.5" />
                </button>
                <a
                  href={`/products/${product.slug}/`}
                  className="font-medium text-[#636A6F] hover:text-[#28537D]"
                >
                  Gift Profile →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
