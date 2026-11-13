import React from 'react';
import {
  Article,
  GiftGuide,
  Product,
  ResearchCitation,
} from '../../types/content';
import { AFFILIATE_DISCLOSURE_CONFIG } from '../../config/navigationConfig';
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  ExternalLink,
  Heart,
  Info,
  Scale,
} from 'lucide-react';
import { PhotoImage } from '../ObjectIllustrations';
import { ProductMediaGallery } from './ProductMediaGallery';

export interface ProductGuideAppearance {
  guide: GiftGuide;
  isEditorsPick: boolean;
  awardLabel?: string;
  sectionTitle?: string;
  sectionId?: string;
  editorialHeadline?: string;
  whyWeChoseIt?: string;
  bestFor?: string;
  considerations?: string;
}

export interface SimilarProductComparisonItem {
  product: Product;
  comparisonAngle: string;
  summary: string;
}

export interface EditorialProductProfileProps {
  product: Product;
  guideAppearances: ProductGuideAppearance[];
  similarComparisons: SimilarProductComparisonItem[];
  relatedArticles: Article[];
  citations: ResearchCitation[];
  actionsSlot?: React.ReactNode;
  children?: React.ReactNode;
}

const RECIPIENT_LABELS: Record<string, string> = {
  partner: 'Partners & Spouses',
  parent: 'Parents & In-Laws',
  friend: 'Close Friends',
  host: 'Dinner & Weekend Hosts',
  kids: 'Kids & Families',
  coworker: 'Coworkers & Mentors',
};

const OCCASION_LABELS: Record<string, string> = {
  birthday: 'Birthday',
  housewarming: 'Housewarming',
  anniversary: 'Anniversary',
  'thank-you': 'Thank-You & Host Gesture',
  holidays: 'Winter Holidays',
  'just-because': 'Just Because',
};

const BUDGET_BUCKET_LABELS: Record<string, string> = {
  'under-25': 'Under $25 Tier',
  '25-to-75': '$25 to $75 Tier',
  'over-75': '$75+ Tier',
};

export const EditorialProductProfile: React.FC<
  EditorialProductProfileProps
> = ({
  product,
  guideAppearances,
  similarComparisons,
  relatedArticles,
  citations,
  actionsSlot,
  children,
}) => {
  const renderedActions = actionsSlot ?? children;
  const primaryImage = product.images[0] ?? {
    id: 'fallback',
    url: '',
    fallbackColor: '#F6F4EF',
    alt: product.title,
    isSampleAsset: true,
  };

  const primaryGuideAppearance = guideAppearances[0];
  const editorsPickAppearances = guideAppearances.filter((a) => a.isEditorsPick);
  const unambiguousParentGuide =
    guideAppearances.length === 1
      ? guideAppearances[0].guide
      : editorsPickAppearances.length === 1
        ? editorsPickAppearances[0].guide
        : undefined;
  const verdict = product.giftVerdict;
  const recipientProfile = product.idealRecipientProfile;

  // Build non-repetitive extended rationale paragraphs
  const narrativeParagraphs =
    product.extendedGiftRationale && product.extendedGiftRationale.length > 0
      ? product.extendedGiftRationale
      : [product.whyToGiveIt];

  // Build practical considerations list with graceful fallback
  const considerationsList =
    product.buyingConsiderationsList &&
    product.buyingConsiderationsList.length > 0
      ? product.buyingConsiderationsList
      : [
          ...(product.detailsAndCare
            ? [
                {
                  label: 'Materials, Dimensions & Care',
                  detail: product.detailsAndCare.replace(/\s*—\s*/g, ', '),
                },
              ]
            : []),
          ...(verdict?.importantCaveat
            ? [
                {
                  label: 'Practical Caveat',
                  detail: verdict.importantCaveat,
                },
              ]
            : []),
        ];

  // Build occasion context items with graceful fallback from product.occasions
  const occasionItems =
    product.occasionContextNotes && product.occasionContextNotes.length > 0
      ? product.occasionContextNotes
      : product.occasions.map((occ) => ({
          occasion: occ,
          label: OCCASION_LABELS[occ] || occ,
          note: `Well suited for ${
            (OCCASION_LABELS[occ] || occ).toLowerCase()
          } gifting when shopping for ${product.bestForSummary.toLowerCase()}`,
        }));

  // Build structured specifications with graceful fallback
  const specificationRows =
    product.specifications && product.specifications.length > 0
      ? product.specifications
      : [
          { label: 'Maker / Brand', value: product.vendor },
          { label: 'Category', value: product.productType },
          {
            label: 'Price & Tier',
            value: `$${product.price} ${product.currency} (${
              BUDGET_BUCKET_LABELS[product.guidePriceBucket] ||
              product.budgetTier
            })`,
          },
          ...(product.detailsAndCare
            ? [
                {
                  label: 'Details & Care',
                  value: product.detailsAndCare.replace(/\s*—\s*/g, ', '),
                },
              ]
            : []),
        ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24 text-[#24282B]">
      {/* =====================================================================
          A. EDITORIAL PRODUCT HERO
         ===================================================================== */}
      <header
        id="product-hero"
        className="border-b border-[#E3E1DB] bg-[#FAF9F6]"
      >
        <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6 lg:px-8">
          {/* Top Breadcrumb Bar */}
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
              {guideAppearances.length > 0 ? (
                <>
                  <a
                    href="/gift-guides/"
                    className="text-[#636A6F] transition-colors hover:text-[#28537D]"
                  >
                    Gift Guides
                  </a>
                  <span aria-hidden="true" className="text-[#C5C1B8]">
                    /
                  </span>
                  {unambiguousParentGuide && (
                    <>
                      <a
                        href={`/gift-guides/${unambiguousParentGuide.slug}/`}
                        className="text-[#636A6F] transition-colors hover:text-[#28537D]"
                      >
                        {unambiguousParentGuide.title}
                      </a>
                      <span aria-hidden="true" className="text-[#C5C1B8]">
                        /
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <a
                    href="/gift-finder/"
                    className="text-[#636A6F] transition-colors hover:text-[#28537D]"
                  >
                    Gift Finder
                  </a>
                  <span aria-hidden="true" className="text-[#C5C1B8]">
                    /
                  </span>
                </>
              )}
              <span
                aria-current="page"
                className="max-w-xs truncate font-semibold text-[#24282B]"
              >
                {product.title}
              </span>
            </nav>

            <div className="flex flex-wrap items-center gap-2 text-xs text-[#636A6F]">
              <span className="font-medium text-[#24282B]">
                Editorial Gift Profile
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {BUDGET_BUCKET_LABELS[product.guidePriceBucket] ||
                  `$${product.price} USD`}
              </span>
            </div>
          </div>

          {/* Main Hero Split */}
          <div className="grid grid-cols-1 gap-10 py-8 sm:py-12 lg:grid-cols-12 lg:items-start lg:gap-12">
            {/* Left Column: Editorial Product Gallery (Single or Multi-Image) */}
            <div className="lg:col-span-6">
              <ProductMediaGallery
                images={
                  Array.isArray(product.images) && product.images.length > 0
                    ? product.images
                    : [primaryImage]
                }
                productTitle={product.title}
                productType={product.productType}
              />
            </div>

            {/* Right Column: Title, Standfirst, Verdict Preview & Refined Purchase Box */}
            <div className="lg:col-span-6">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#636A6F]">
                {(primaryGuideAppearance?.awardLabel || product.calloutTag) && (
                  <>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#1B3D5F]">
                      <Award className="h-3.5 w-3.5 text-[#28537D]" />
                      {primaryGuideAppearance?.awardLabel || product.calloutTag}
                    </span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span>{product.productType}</span>
                <span aria-hidden="true">·</span>
                <span>{product.vendor}</span>
              </div>

              <h1 className="theme-page-title mt-2.5 font-serif text-3xl font-semibold leading-[1.14] tracking-tight text-[#24282B] sm:text-4xl lg:text-[2.65rem]">
                {product.title}
              </h1>

              <p className="theme-intro-text mt-3.5 text-base leading-[1.65] text-[#636A6F] sm:text-lg">
                {product.subtitle}
              </p>

              {/* Short Gift Verdict Preview */}
              <div className="mt-5 border-l-2 border-[#1B3D5F] pl-4">
                <div className="theme-kicker text-xs font-semibold text-[#1B3D5F]">
                  Editorial Gift Verdict
                </div>
                <p className="theme-body-sm mt-1 text-sm leading-[1.7] text-[#24282B] sm:text-[0.95rem]">
                  {verdict?.editorialAssessment || product.whyToGiveIt}
                </p>
              </div>

              {/* Compact, Refined Purchase & Save Card */}
              <div className="mt-6 rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-5 sm:p-6">
                <div className="border-b border-[#E3E1DB] pb-4 text-left">
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-3xl font-semibold text-[#24282B] tabular-nums">
                      ${product.price}
                    </span>
                    <span className="text-xs font-medium text-[#636A6F]">
                      {product.currency}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#636A6F]">
                    {product.vendor} ·{' '}
                    <span className="font-medium text-[#24282B]">
                      {product.inStock
                        ? 'In Stock (Catalog Preview)'
                        : 'Out of Stock'}
                    </span>
                  </p>
                </div>

                {/* Best Suited For — Full-width, left-aligned information block */}
                <div className="w-full border-b border-[#E3E1DB] py-4 text-left">
                  <div className="theme-info-label text-left font-semibold text-[#24282B]">
                    Best suited for
                  </div>
                  <p className="theme-body-text mt-1 text-left text-[#24282B]">
                    {product.bestForSummary}
                  </p>
                </div>

                {/* Interactive Save / Merchant Action Area */}
                <div className="pt-4">
                  {renderedActions ? (
                    renderedActions
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-4 py-2.5 text-xs font-semibold text-[#24282B]"
                      >
                        <Heart className="h-3.5 w-3.5" />
                        <span>Save to Gift List</span>
                      </button>
                      <a
                        href={product.purchaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-4 py-2.5 text-xs font-semibold text-[#24282B]"
                      >
                        <span>
                          {product.isPlaceholderLink
                            ? 'Merchant Preview Link (Sample)'
                            : `View at ${product.vendor}`}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-[#636A6F]" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Conspicuous Merchant & Affiliate Disclosure */}
                <div className="mt-4 border-t border-[#E3E1DB] pt-3 text-left text-xs text-[#636A6F]">
                  <p className="theme-caption leading-relaxed">
                    {product.commerceProvider === 'fourthwall'
                      ? 'Offered directly through the Science of Gifts Shop.'
                      : AFFILIATE_DISCLOSURE_CONFIG.shortInlineNotice}{' '}
                    <a
                      href={AFFILIATE_DISCLOSURE_CONFIG.disclosurePageHref}
                      className="font-semibold text-[#28537D] underline underline-offset-2 hover:text-[#1B3D5F]"
                    >
                      Affiliate Disclosure
                    </a>
                    .
                  </p>
                </div>

                {/* Honest Development Placeholder Note + Collapsible Technical Metadata */}
                {product.isPlaceholderLink && (
                  <div className="mt-4 border-t border-[#E3E1DB] pt-3 text-xs text-[#636A6F]">
                    <p className="leading-relaxed">
                      <strong className="font-semibold text-[#24282B]">
                        Sample Catalog Note:
                      </strong>{' '}
                      This editorial gift profile uses a development placeholder merchant URL rather than a live retail checkout.
                    </p>
                    <details className="mt-1.5 text-[11px] text-[#636A6F]">
                      <summary className="cursor-pointer font-medium text-[#28537D] hover:text-[#1B3D5F]">
                        Catalog record metadata
                      </summary>
                      <div className="mt-1.5 rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] p-2.5 font-mono text-[11px] text-[#636A6F]">
                        <div>Canonical ID: {product.id}</div>
                        <div className="truncate">
                          Sample URL: {product.purchaseUrl}
                        </div>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Section Jump Bar */}
          <nav
            aria-label="Gift profile sections"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#E3E1DB] py-3.5 text-xs font-medium text-[#636A6F]"
          >
            <span className="font-semibold text-[#24282B]">
              In this profile:
            </span>
            <a
              href="#gift-verdict"
              className="hover:text-[#28537D] hover:underline underline-offset-4"
            >
              The Gift Verdict
            </a>
            <a
              href="#ideal-recipient"
              className="hover:text-[#28537D] hover:underline underline-offset-4"
            >
              Ideal Recipient
            </a>
            <a
              href="#why-it-works"
              className="hover:text-[#28537D] hover:underline underline-offset-4"
            >
              Why It Makes a Great Gift
            </a>
            <a
              href="#buying-considerations"
              className="hover:text-[#28537D] hover:underline underline-offset-4"
            >
              What to Consider
            </a>
            <a
              href="#specifications"
              className="hover:text-[#28537D] hover:underline underline-offset-4"
            >
              Specifications & Occasions
            </a>
            {similarComparisons.length > 0 && (
              <a
                href="#compare-similar-gifts"
                className="hover:text-[#28537D] hover:underline underline-offset-4"
              >
                Compare Similar Gifts
              </a>
            )}
            {guideAppearances.length > 0 && (
              <a
                href="#featured-gift-guide"
                className="hover:text-[#28537D] hover:underline underline-offset-4"
              >
                Featured Gift Guide
              </a>
            )}
          </nav>
        </div>
      </header>

      {/* =====================================================================
          MAIN EDITORIAL GIFT PROFILE BODY
         ===================================================================== */}
      <div className="mx-auto max-w-[1280px] space-y-16 px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        {/* 1. THE GIFT VERDICT */}
        <section
          id="gift-verdict"
          aria-labelledby="heading-gift-verdict"
          className="scroll-mt-24"
        >
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-12">
            <div className="lg:col-span-4">
              <p className="theme-kicker text-xs font-semibold text-[#28537D]">
                01 · Evaluation
              </p>
              <h2
                id="heading-gift-verdict"
                className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
              >
                The Gift Verdict
              </h2>
              <p className="theme-caption mt-2 text-sm leading-relaxed text-[#636A6F]">
                Our concise curatorial assessment of why this object earns a place on our shortlist, what sets it apart, and when to skip it.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8 lg:col-span-8">
              <p className="font-serif text-lg font-medium leading-[1.6] text-[#24282B] sm:text-xl">
                {verdict?.editorialAssessment || product.whyToGiveIt}
              </p>

              <dl className="mt-6 grid grid-cols-1 gap-6 border-t border-[#E3E1DB] pt-6 sm:grid-cols-2">
                <div>
                  <dt className="theme-info-label text-xs font-semibold text-[#1B3D5F]">
                    What sets it apart from similar gifts
                  </dt>
                  <dd className="theme-body-sm mt-1.5 text-sm leading-[1.7] text-[#24282B]">
                    {verdict?.standoutReason || product.subtitle}
                  </dd>
                </div>

                <div>
                  <dt className="theme-info-label text-xs font-semibold text-[#1B3D5F]">
                    Why someone will enjoy receiving it
                  </dt>
                  <dd className="theme-body-sm mt-1.5 text-sm leading-[1.7] text-[#24282B]">
                    {verdict?.recipientDelight || product.whyToGiveIt}
                  </dd>
                </div>

                {verdict?.importantCaveat && (
                  <div className="border-t border-[#E3E1DB] pt-4 sm:col-span-2">
                    <dt className="theme-info-label text-xs font-semibold text-[#636A6F]">
                      Important caveat before you buy
                    </dt>
                    <dd className="theme-body-sm mt-1 text-sm leading-[1.7] text-[#24282B]">
                      {verdict.importantCaveat}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </section>

        {/* 2. IDEAL RECIPIENT */}
        <section
          id="ideal-recipient"
          aria-labelledby="heading-ideal-recipient"
          className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
        >
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-12">
            <div className="lg:col-span-4">
              <p className="theme-kicker text-xs font-semibold text-[#28537D]">
                02 · Recipient Fit
              </p>
              <h2
                id="heading-ideal-recipient"
                className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
              >
                Ideal Recipient
              </h2>
              <p className="theme-caption mt-2 text-sm leading-relaxed text-[#636A6F]">
                Who will genuinely appreciate unwrapping this gift, and how it fits into their everyday habits.
              </p>
            </div>

            <div className="space-y-6 lg:col-span-8">
              <div className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8">
                <h3 className="theme-subsection-heading font-serif text-xl font-semibold leading-snug text-[#24282B]">
                  {recipientProfile?.headline ||
                    `Best suited for ${product.bestForSummary}`}
                </h3>

                <p className="theme-body-text theme-reading-measure mt-3 max-w-[68ch] text-base leading-[1.8] text-[#24282B]">
                  {recipientProfile?.narrative ||
                    `We recommend the ${product.title} for ${product.bestForSummary.toLowerCase()} Because it focuses on ${product.interests
                      .join(', ')
                      .toLowerCase()}, it integrates smoothly into daily life without feeling like novelty clutter.`}
                </p>

                {recipientProfile?.lifestyleNotes &&
                  recipientProfile.lifestyleNotes.length > 0 && (
                    <div className="mt-6 border-t border-[#E3E1DB] pt-5">
                      <h4 className="theme-info-label text-xs font-semibold text-[#1B3D5F]">
                        Signs this gift matches your person
                      </h4>
                      <ul className="mt-3 space-y-2.5 text-sm text-[#24282B]">
                        {recipientProfile.lifestyleNotes.map((note, idx) => (
                          <li key={idx} className="theme-body-sm flex items-start gap-2.5">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#28537D]" />
                            <span className="leading-relaxed">{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Relationship & Interest Pathways */}
                <div className="mt-6 grid grid-cols-1 gap-4 border-t border-[#E3E1DB] pt-5 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold text-[#636A6F]">
                      Explore more gifts for these relationships
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.recipients.map((rec) => (
                        <a
                          key={rec}
                          href={`/gift-finder/?recipient=${rec}`}
                          className="rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-1.5 text-xs font-medium text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
                        >
                          {RECIPIENT_LABELS[rec] || rec} →
                        </a>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-[#636A6F]">
                      Interests & everyday rituals
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.interests.map((interest) => (
                        <span
                          key={interest}
                          className="rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-1.5 text-xs text-[#636A6F]"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. WHY IT MAKES A GREAT GIFT */}
        <section
          id="why-it-works"
          aria-labelledby="heading-why-it-works"
          className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
        >
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-12">
            <div className="lg:col-span-4">
              <p className="theme-kicker text-xs font-semibold text-[#28537D]">
                03 · Editorial Essay
              </p>
              <h2
                id="heading-why-it-works"
                className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
              >
                Why It Makes a Great Gift
              </h2>
              <p className="theme-caption mt-2 text-sm leading-relaxed text-[#636A6F]">
                The relationship psychology and everyday utility behind why this object stays appreciated months after it is unwrapped.
              </p>
            </div>

            <div className="space-y-6 lg:col-span-8">
              <div className="theme-body-text theme-reading-measure max-w-[68ch] space-y-4 text-base leading-[1.82] text-[#24282B] sm:text-[1.0625rem]">
                {narrativeParagraphs.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>

              {/* Behavioral Research Note (if product references a peer-reviewed citation) */}
              {citations[0] && (
                <aside
                  aria-label="Research perspective"
                  className="rounded-2xl border border-[#C6E4D6] bg-[#E5F3EC]/65 p-6"
                >
                  <div className="theme-kicker text-xs font-semibold text-[#1B3D5F]">
                    Behavioral Science Perspective · {citations[0].authors} (
                    {citations[0].year})
                  </div>
                  <h3 className="theme-subsection-heading mt-1 font-serif text-lg font-semibold text-[#24282B]">
                    {citations[0].title}
                  </h3>
                  <p className="theme-body-sm mt-2 text-sm leading-[1.75] text-[#24282B]">
                    {(citations[0].keyFinding ?? '').replace(/\s*—\s*/g, ', ')}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#C6E4D6] pt-3 text-xs text-[#636A6F]">
                    <span className="italic">{citations[0].publication}</span>
                    <a
                      href={citations[0].doiOrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#28537D] hover:text-[#1B3D5F]"
                    >
                      Verify study DOI
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </aside>
              )}
            </div>
          </div>
        </section>

        {/* 4. WHAT TO CONSIDER BEFORE BUYING */}
        {considerationsList.length > 0 && (
          <section
            id="buying-considerations"
            aria-labelledby="heading-buying-considerations"
            className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
          >
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-12">
              <div className="lg:col-span-4">
                <p className="theme-kicker text-xs font-semibold text-[#28537D]">
                  04 · Practical Notes
                </p>
                <h2
                  id="heading-buying-considerations"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
                >
                  What to Consider Before Buying
                </h2>
                <p className="theme-caption mt-2 text-sm leading-relaxed text-[#636A6F]">
                  Practical details on dimensions, care requirements, and household fit so there are no surprises after gifting.
                </p>
              </div>

              <div className="divide-y divide-[#E3E1DB] rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] lg:col-span-8">
                {considerationsList.map((item, idx) => (
                  <div key={idx} className="p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#28537D]" />
                      <div>
                        <h3 className="theme-info-heading font-serif text-base font-semibold text-[#24282B]">
                          {item.label}
                        </h3>
                        <p className="theme-body-sm mt-1 text-sm leading-[1.7] text-[#24282B]">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 5. SPECIFICATIONS & GIFT OCCASIONS */}
        <section
          id="specifications"
          aria-labelledby="heading-specifications"
          className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
        >
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-12">
            {/* Left 6 Columns: Specifications and Product Details */}
            <div className="lg:col-span-6">
              <p className="theme-kicker text-xs font-semibold text-[#28537D]">
                05 · Specifications
              </p>
              <h2
                id="heading-specifications"
                className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B]"
              >
                Specifications & Product Details
              </h2>
              <p className="theme-caption mt-1.5 text-xs leading-relaxed text-[#636A6F]">
                Verified dimensions, materials, and care instructions from the catalog record.
              </p>

              <dl className="mt-5 divide-y divide-[#E3E1DB] rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF]">
                {specificationRows.map((spec, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 gap-1 px-5 py-3.5 text-sm sm:grid-cols-12 sm:gap-4"
                  >
                    <dt className="theme-info-label font-semibold text-[#636A6F] sm:col-span-4">
                      {spec.label}
                    </dt>
                    <dd className="theme-body-sm text-[#24282B] sm:col-span-8">
                      {spec.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Right 6 Columns: Gift Occasions and Buying Context */}
            <div id="gift-occasions" className="lg:col-span-6">
              <p className="theme-kicker text-xs font-semibold text-[#28537D]">
                06 · Gifting Context
              </p>
              <h2 className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B]">
                Gift Occasions & Buying Context
              </h2>
              <p className="theme-caption mt-1.5 text-xs leading-relaxed text-[#636A6F]">
                When this gift shines brightest and how to present it thoughtfully.
              </p>

              <div className="mt-5 divide-y divide-[#E3E1DB] rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF]">
                {occasionItems.map((occItem, idx) => (
                  <div key={idx} className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="theme-info-heading font-serif text-base font-semibold text-[#24282B]">
                        {occItem.label}
                      </h3>
                      <a
                        href={`/gift-finder/?occasion=${occItem.occasion}`}
                        className="text-xs font-semibold text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                      >
                        More {occItem.label.toLowerCase()} gifts →
                      </a>
                    </div>
                    <p className="theme-body-sm mt-1.5 text-sm leading-relaxed text-[#24282B]">
                      {occItem.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 6. COMPARE WITH SIMILAR GIFTS */}
        {similarComparisons.length > 0 && (
          <section
            id="compare-similar-gifts"
            aria-labelledby="heading-compare-similar"
            className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
          >
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E1DB] pb-4">
              <div>
                <p className="theme-kicker inline-flex items-center gap-1.5 text-xs font-semibold text-[#28537D]">
                  <Scale className="h-3.5 w-3.5" />
                  07 · Comparative Alternatives
                </p>
                <h2
                  id="heading-compare-similar"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
                >
                  Compare With Similar Gifts
                </h2>
              </div>
              <p className="theme-caption max-w-md text-xs leading-relaxed text-[#636A6F]">
                Not sure if the {product.title} is the exact match? Consider these curated alternatives from our catalog depending on your budget and recipient.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              {similarComparisons.map(
                ({ product: altProduct, comparisonAngle, summary }) => {
                  const altImg = altProduct.images[0];
                  return (
                    <article
                      key={altProduct.id}
                      className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF]"
                    >
                      <div>
                        {altImg && (
                          <a
                            href={`/products/${altProduct.slug}/`}
                            className="block aspect-[4/3] w-full overflow-hidden border-b border-[#E3E1DB] bg-[#F6F4EF]"
                          >
                            <PhotoImage
                              image={altImg}
                              preset="card-landscape"
                              aspectRatio="4:3"
                              width={480}
                              height={360}
                              className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                            />
                          </a>
                        )}
                        <div className="p-5">
                          <div className="theme-kicker text-xs font-semibold text-[#1B3D5F]">
                            {comparisonAngle}
                          </div>
                          <h3 className="theme-product-title mt-1 font-serif text-lg font-semibold leading-snug text-[#24282B]">
                            <a
                              href={`/products/${altProduct.slug}/`}
                              className="hover:text-[#28537D]"
                            >
                              {altProduct.title}
                            </a>
                          </h3>
                          <p className="theme-metadata mt-0.5 text-xs text-[#636A6F]">
                            {altProduct.vendor} ·{' '}
                            <span className="font-semibold text-[#24282B] tabular-nums">
                              ${altProduct.price} {altProduct.currency}
                            </span>
                          </p>
                          <p className="theme-body-sm mt-3 text-xs leading-[1.7] text-[#24282B] sm:text-sm">
                            {summary}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-[#E3E1DB] bg-[#FAF9F6] px-5 py-3.5 text-xs font-semibold text-[#28537D]">
                        <a
                          href={`/products/${altProduct.slug}/`}
                          className="inline-flex items-center gap-1 hover:text-[#1B3D5F]"
                        >
                          Read Gift Profile · ${altProduct.price}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </section>
        )}

        {/* 7. FEATURED GIFT GUIDE CONNECTION */}
        {guideAppearances.length > 0 && (
          <section
            id="featured-gift-guide"
            aria-labelledby="heading-featured-guide"
            className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
          >
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E1DB] pb-4">
              <div>
                <p className="theme-kicker text-xs font-semibold text-[#28537D]">
                  08 · Featured Gift Guide
                </p>
                <h2
                  id="heading-featured-guide"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
                >
                  Where This Gift Is Featured
                </h2>
              </div>
              <p className="theme-caption max-w-md text-xs leading-relaxed text-[#636A6F]">
                See how this object compares side by side with other recommendations in our flagship editorial gift guide.
              </p>
            </div>

            <div className="mt-6 space-y-6">
              {guideAppearances.map((app) => (
                <article
                  key={app.guide.id}
                  className="overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF]"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12">
                    <div className="lg:col-span-5">
                      <a
                        href={`/gift-guides/${app.guide.slug}/`}
                        className="block h-full min-h-[220px] w-full overflow-hidden bg-[#F6F4EF]"
                      >
                        <img
                          src={app.guide.heroImageUrl}
                          alt={app.guide.heroImageAlt}
                          width={640}
                          height={420}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </a>
                    </div>

                    <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#1B3D5F]">
                          <Award className="h-3.5 w-3.5 text-[#28537D]" />
                          <span>
                            {app.awardLabel || 'Featured Selection'}
                          </span>
                          {app.sectionTitle && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-normal text-[#636A6F]">
                                {app.sectionTitle}
                              </span>
                            </>
                          )}
                        </div>

                        <h3 className="theme-subsection-heading mt-2 font-serif text-2xl font-semibold leading-snug text-[#24282B]">
                          <a
                            href={`/gift-guides/${app.guide.slug}/`}
                            className="hover:text-[#28537D]"
                          >
                            {app.guide.title}
                          </a>
                        </h3>

                        <p className="theme-body-sm mt-2 text-sm leading-relaxed text-[#636A6F]">
                          {app.guide.subtitle}
                        </p>

                        {app.whyWeChoseIt && (
                          <div className="theme-body-sm mt-4 border-t border-[#E3E1DB] pt-4 text-xs leading-[1.7] text-[#24282B] sm:text-sm">
                            <strong className="font-semibold text-[#1B3D5F]">
                              Why we selected it for this guide:{' '}
                            </strong>
                            {app.whyWeChoseIt}
                          </div>
                        )}
                      </div>

                      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#E3E1DB] pt-4">
                        <a
                          href={`/gift-guides/${app.guide.slug}/`}
                          className="theme-button-text inline-flex items-center gap-2 rounded-lg bg-[#1B3D5F] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#28537D]"
                        >
                          Read Full Gift Guide
                          <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                        {app.sectionId && (
                          <a
                            href={`/gift-guides/${app.guide.slug}/#${app.sectionId}`}
                            className="theme-button-text inline-flex items-center gap-1.5 rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-4 py-2.5 text-xs font-semibold text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
                          >
                            Jump to Guide Section
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 8. RELATED EDITORIAL CONTENT & RESEARCH ESSAYS */}
        <section
          id="related-editorial"
          aria-labelledby="heading-related-editorial"
          className="scroll-mt-24 border-t border-[#E3E1DB] pt-14"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E1DB] pb-4">
            <div>
              <p className="theme-kicker text-xs font-semibold text-[#28537D]">
                09 · Related Reading & Discovery
              </p>
              <h2
                id="heading-related-editorial"
                className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
              >
                Related Editorial Essays & Gift Discovery
              </h2>
            </div>
            <a
              href="/gift-finder/"
              className="text-xs font-semibold text-[#28537D] underline decoration-[#28537D]/35 underline-offset-4 hover:text-[#1B3D5F]"
            >
              Explore Full Catalog in Gift Finder →
            </a>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {relatedArticles.map((article) => (
              <article
                key={article.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF]"
              >
                <div>
                  <a
                    href={`/articles/${article.slug}/`}
                    className="block aspect-[16/9] w-full overflow-hidden border-b border-[#E3E1DB] bg-[#F6F4EF]"
                  >
                    <img
                      src={article.heroImageUrl}
                      alt={article.heroAlt}
                      width={480}
                      height={270}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </a>
                  <div className="p-5">
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#636A6F]">
                      <BookOpen className="h-3.5 w-3.5 text-[#28537D]" />
                      {article.category} · {article.readTimeMinutes} min read
                    </div>
                    <h3 className="mt-1.5 font-serif text-lg font-semibold leading-snug text-[#24282B]">
                      <a
                        href={`/articles/${article.slug}/`}
                        className="hover:text-[#28537D]"
                      >
                        {article.title}
                      </a>
                    </h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#636A6F]">
                      {article.subtitle.replace(/\s*—\s*/g, ', ')}
                    </p>
                  </div>
                </div>
                <div className="border-t border-[#E3E1DB] bg-[#FAF9F6] px-5 py-3 text-xs font-semibold text-[#28537D]">
                  <a
                    href={`/articles/${article.slug}/`}
                    className="inline-flex items-center gap-1 hover:text-[#1B3D5F]"
                  >
                    Read Research Essay
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </article>
            ))}

            {/* Interactive Gift Finder Pathway Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#28537D]">
                  <Compass className="h-3.5 w-3.5" />
                  Interactive Gift Finder
                </div>
                <h3 className="mt-2 font-serif text-xl font-semibold text-[#24282B]">
                  Filter the Full Catalog by Recipient & Budget
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#636A6F] sm:text-sm">
                  Combine recipient relationship, occasion, and exact price ceiling to compare every object in our catalog.
                </p>
              </div>
              <div className="mt-5 border-t border-[#E3E1DB] pt-4">
                <a
                  href={`/gift-finder/?budget=${product.guidePriceBucket}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1B3D5F] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#28537D]"
                >
                  Browse {BUDGET_BUCKET_LABELS[product.guidePriceBucket] || 'Catalog'} Gifts
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
