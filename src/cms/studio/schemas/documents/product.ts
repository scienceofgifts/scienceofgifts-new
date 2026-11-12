/**
 * Science of Gifts — Canonical Product Document Schema (`product`)
 *
 * Implements Section 4 (Product Editing Experience) & Section 11 (Publication Safeguards):
 * - Single source of truth referenced across Gift Guides, Articles, Discovery Hubs, Gift Finder, and Search.
 * - Organized into 6 clear Studio editing tabs:
 *   1. Identity
 *   2. Editorial Gift Profile
 *   3. Commerce
 *   4. Discovery
 *   5. Images
 *   6. SEO & Publishing
 * - Enforces canonical ID immutability once created, defaults new records to `status: "draft"`,
 *   blocks publishing sample/placeholder records, requires evidence for price verification,
 *   keeps ratings/testing notes strictly optional (never fabricated), and treats missing
 *   inventory verification as a non-blocking structured-data suppression warning.
 */

import { defineArrayMember, defineField, defineType } from '../../sanityCore';
import {
  AGE_RANGE_OPTIONS,
  COMMERCE_PROVIDER_OPTIONS,
  GUIDE_PRICE_BUCKET_OPTIONS,
  INTEREST_OPTIONS,
  OCCASION_OPTIONS,
  PERSONALITY_TRAIT_OPTIONS,
  PRODUCT_BUDGET_TIER_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  RECIPIENT_OPTIONS,
} from '../../taxonomyRegistry';
import {
  evaluateProductPublicationLifecycle,
  isPlaceholderOrSamplePurchaseUrl,
} from '../../publicationWorkflow';

export const productDocument = defineType({
  name: 'product',
  title: 'Product (Canonical Catalog Record)',
  type: 'document',
  icon: 'Package',
  description:
    'Single canonical source of truth for a giftable object. Referenced across Gift Guides, Editorial Hubs, Articles, Gift Finder, and Product Profiles without duplicating commerce or taxonomy records.',
  groups: [
    {
      name: 'identity',
      title: '1. Identity',
      description: 'Title, URL slug, immutable canonical ID, maker, category, and summary descriptions.',
      default: true,
    },
    {
      name: 'editorialProfile',
      title: '2. Editorial Gift Profile',
      description: 'Gift verdict, why to give it, ideal recipient profile, buying considerations, specifications, occasion notes, and comparisons.',
    },
    {
      name: 'commerce',
      title: '3. Commerce',
      description: 'Commerce provider, merchant, external IDs, purchase URLs, pricing, and evidence-backed verification metadata.',
    },
    {
      name: 'discovery',
      title: '4. Discovery',
      description: 'Recipients, interests, occasions, personality/gift style archetypes, and related content.',
    },
    {
      name: 'images',
      title: '5. Images',
      description: 'Primary 2400×2400 square master photograph, gallery images, hotspot/crop, fitMode, and portrait/landscape overrides.',
    },
    {
      name: 'seoPublishing',
      title: '6. SEO & Publishing',
      description: 'Publication lifecycle status, editorial approval, SEO metadata, canonical path, and indexing controls.',
    },
  ],
  fieldsets: [
    {
      name: 'commerceVerification',
      title: 'Price, Merchant & Inventory Verification Evidence',
      description:
        'Price verification requires a documented verification source and evidence note. Leaving inventory unverified suppresses Schema.org InStock/OutOfStock claims without invalidating editorial copy.',
      options: { collapsible: false, collapsed: false },
    },
    {
      name: 'optionalTesting',
      title: 'Optional Hands-On Evaluation Notes (Never Fabricate)',
      description:
        'Only populate these fields when genuine hands-on testing or verified editorial scoring exists.',
      options: { collapsible: true, collapsed: true },
    },
  ],
  initialValue: {
    status: 'draft',
    editorialApproved: false,
    currency: 'USD',
    commerceProvider: 'affiliate',
    fulfillmentClassification: 'affiliate-partner',
    inStock: true,
    priceVerified: false,
    priceVerificationSource: 'unverified',
    inventoryVerified: false,
    inventoryVerificationSource: 'unverified',
    isSampleProduct: false,
    isPlaceholderLink: false,
  },
  fields: [
    // =========================================================================
    // GROUP 1: IDENTITY
    // =========================================================================
    defineField({
      name: 'title',
      title: 'Product Title (On-Page H1)',
      type: 'string',
      group: 'identity',
      description:
        'Clean, accurate name of the product (e.g. "Hand-Blown Rippled Bedside Carafe & Tumbler").',
      validation: (Rule) => Rule.required().min(3).max(120),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug (/products/[slug]/)',
      type: 'slug',
      group: 'identity',
      description:
        'Lowercase kebab-case URL slug used for `/products/[slug]/`.',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) =>
        Rule.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
          name: 'kebab-case URL slug',
        }),
    }),
    defineField({
      name: 'productId',
      title: 'Canonical Product ID (Immutable After Creation)',
      type: 'string',
      group: 'identity',
      description:
        'Stable canonical identifier (e.g. "prod_fluted_bedside_carafe_09"). Locked automatically once saved so Gift Guide references and user Saved Gifts lists never break.',
      readOnly: ({ document, value }) =>
        Boolean(value && document && (document._createdAt || document._rev)),
      validation: (Rule) =>
        Rule.required()
          .regex(/^prod_[a-z0-9_]+$/, { name: 'prod_<snake_case_id>' })
          .error('Canonical Product ID must start with "prod_" followed by lowercase letters, numbers, or underscores.'),
    }),
    defineField({
      name: 'vendor',
      title: 'Brand / Maker / Studio Name',
      type: 'string',
      group: ['identity', 'commerce'],
      description:
        'Name of the maker, ceramic studio, publisher, or merchant (e.g. "Kinto Japan" or "East Fork Pottery").',
      validation: (Rule) => Rule.required().min(2).max(100),
    }),
    defineField({
      name: 'productType',
      title: 'Primary Product Category',
      type: 'string',
      group: 'identity',
      options: {
        list: PRODUCT_CATEGORY_OPTIONS,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Short Tagline / Card Subtitle',
      type: 'string',
      group: 'identity',
      description:
        'Concise 1-line summary displayed on Product Cards, Quick Views, and Gift Finder results (max 160 characters).',
      validation: (Rule) => Rule.required().min(10).max(160),
    }),
    defineField({
      name: 'calloutTag',
      title: 'Editorial Callout Badge (Optional)',
      type: 'string',
      group: 'identity',
      description:
        'Short badge displayed on product cards (e.g. "Daily Ritual Upgrade" or "Zero-Clutter Consumable").',
      validation: (Rule) => Rule.optional().max(55),
    }),

    // =========================================================================
    // GROUP 2: EDITORIAL GIFT PROFILE
    // =========================================================================
    defineField({
      name: 'whyToGiveIt',
      title: 'Why It Makes a Great Gift (Canonical Editorial Rationale)',
      type: 'text',
      group: 'editorialProfile',
      description:
        'Default behavioral and tactile explanation of why this object makes a meaningful gift. Gift Guides can display this rationale or supply guide-specific overrides.',
      validation: (Rule) => Rule.required().min(30).max(650),
    }),
    defineField({
      name: 'bestForSummary',
      title: 'Ideal Recipient Summary (One-Line Fit)',
      type: 'string',
      group: 'editorialProfile',
      description:
        'E.g. "Remote workers, tea lovers, and close friends who appreciate quiet morning rituals."',
      validation: (Rule) => Rule.required().min(10).max(200),
    }),
    defineField({
      name: 'detailsAndCare',
      title: 'Materials, Dimensions & Care Summary',
      type: 'text',
      group: 'editorialProfile',
      description:
        'Concise overview of materials, dimensions, origin, and care instructions.',
      validation: (Rule) => Rule.required().min(15).max(550),
    }),
    defineField({
      name: 'giftVerdict',
      title: 'Structured Gift Verdict Block (Optional)',
      type: 'productGiftVerdict',
      group: 'editorialProfile',
      description:
        'Powers the top Editorial Verdict callout on `/products/[slug]/` (assessment, standout reason, recipient delight, and important caveat).',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'idealRecipientProfile',
      title: 'Deep Ideal Recipient Profile (Optional)',
      type: 'productRecipientProfile',
      group: 'editorialProfile',
      description:
        'Detailed recipient narrative, lifestyle personality signals, and best relationship contexts.',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'extendedGiftRationale',
      title: 'Extended Editorial Rationale Paragraphs (Optional)',
      type: 'array',
      group: 'editorialProfile',
      description:
        'Multi-paragraph deep dive rendered on dedicated Product Profile pages.',
      of: [defineArrayMember({ type: 'text' })],
      validation: (Rule) => Rule.optional().max(6),
    }),
    defineField({
      name: 'buyingConsiderationsList',
      title: 'Structured Buying Considerations List (Optional)',
      type: 'array',
      group: 'editorialProfile',
      description:
        'Labeled practical notes (Care, Sizing, Lead Time, Presentation) for `/products/[slug]/`.',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'productBuyingConsideration' })],
      validation: (Rule) => Rule.optional().max(8),
    }),
    defineField({
      name: 'specifications',
      title: 'Structured Product Specifications Table (Optional)',
      type: 'array',
      group: 'editorialProfile',
      description:
        'Key-value rows (Materials, Dimensions, Weight, Origin, Care) for `/products/[slug]/`.',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'productSpecificationItem' })],
      validation: (Rule) => Rule.optional().max(12),
    }),
    defineField({
      name: 'occasionContextNotes',
      title: 'Occasion-Specific Gifting Notes (Optional)',
      type: 'array',
      group: 'editorialProfile',
      description:
        'Explains how this product fits specific occasions (Birthday, Housewarming, Anniversary, Host Gift).',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'productOccasionNote' })],
      validation: (Rule) => Rule.optional().max(6),
    }),
    defineField({
      name: 'similarGiftComparisons',
      title: 'Similar Gift Comparisons (Canonical Product References)',
      type: 'array',
      group: 'editorialProfile',
      description:
        'Compare this product against other canonical products in the catalog (e.g., lower-budget alternative or higher-budget upgrade).',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'productSimilarComparison' })],
      validation: (Rule) => Rule.optional().max(4),
    }),
    defineField({
      name: 'editorialRating',
      title: 'Verified Editorial Score (Optional — Do Not Fabricate)',
      type: 'number',
      group: 'editorialProfile',
      fieldset: 'optionalTesting',
      description:
        'Strictly optional (1.0 to 5.0). Leave blank unless a formal editorial evaluation score was assigned. Never emitted as fake customer AggregateRating schema.',
      validation: (Rule) => Rule.optional().min(1).max(5),
    }),
    defineField({
      name: 'testingNote',
      title: 'Hands-On Evaluation / Testing Note (Optional — Do Not Fabricate)',
      type: 'text',
      group: 'editorialProfile',
      fieldset: 'optionalTesting',
      description:
        'Strictly optional. Only populate with genuine hands-on inspection or long-term use observations.',
      validation: (Rule) => Rule.optional().max(500),
    }),

    // =========================================================================
    // GROUP 3: COMMERCE & VERIFICATION
    // =========================================================================
    defineField({
      name: 'commerceProvider',
      title: 'Commerce Source / Provider',
      type: 'string',
      group: 'commerce',
      description:
        'Determines checkout destination and seller attribution (Affiliate Partner, Fourthwall Shop, Digital Download, or Direct Maker).',
      options: {
        list: COMMERCE_PROVIDER_OPTIONS,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'fulfillmentClassification',
      title: 'Monetization & Fulfillment Classification',
      type: 'string',
      group: 'commerce',
      initialValue: 'affiliate-partner',
      options: {
        list: [
          { title: 'Affiliate Partner Link (affiliate-partner)', value: 'affiliate-partner' },
          { title: 'Owned Fourthwall Storefront Merch (owned-fourthwall-merch)', value: 'owned-fourthwall-merch' },
          { title: 'Owned Digital Product (owned-digital-product)', value: 'owned-digital-product' },
          { title: 'Editorial Non-Monetized Pick (editorial-non-monetized)', value: 'editorial-non-monetized' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'externalProductId',
      title: 'External Merchant / Fourthwall Product ID (Optional)',
      type: 'string',
      group: 'commerce',
      description:
        'Optional external SKU, affiliate network product ID, or future Fourthwall storefront product handle.',
      validation: (Rule) => Rule.optional().max(120),
    }),
    defineField({
      name: 'purchaseUrl',
      title: 'Primary Purchase / Merchant URL (HTTPS)',
      type: 'url',
      group: 'commerce',
      description:
        'Canonical HTTPS destination URL used on product CTAs.',
      validation: (Rule) =>
        Rule.required().uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'affiliateUrl',
      title: 'Dedicated Affiliate Tracking URL Override (Optional)',
      type: 'url',
      group: 'commerce',
      description:
        'Optional tracked affiliate URL if distinct from the clean merchant product URL.',
      validation: (Rule) => Rule.optional().uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'fourthwallUrl',
      title: 'Fourthwall Storefront Product URL (Optional)',
      type: 'url',
      group: 'commerce',
      description:
        'Optional URL on `shop.scienceofgifts.com` when `commerceProvider` is `fourthwall`.',
      validation: (Rule) => Rule.optional().uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'price',
      title: 'Retail Price (USD)',
      type: 'number',
      group: 'commerce',
      description:
        'Retail price in USD. Never guess or fabricate prices; leave unverified until confirmed against the merchant page.',
      validation: (Rule) => Rule.required().positive(),
    }),
    defineField({
      name: 'currency',
      title: 'Currency Code',
      type: 'string',
      group: 'commerce',
      initialValue: 'USD',
      options: {
        list: [{ title: 'US Dollar (USD)', value: 'USD' }],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'budgetTier',
      title: 'Discovery Budget Tier',
      type: 'string',
      group: 'commerce',
      description:
        'Must align with retail price: Under $50 (< $50), $50 to $100 ($50–$100), or $100+ (> $100).',
      options: {
        list: PRODUCT_BUDGET_TIER_OPTIONS,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'guidePriceBucket',
      title: 'Guide Price Bucket',
      type: 'string',
      group: 'commerce',
      description:
        'Must align with retail price: Under $25 (< $25), $25 to $75 ($25–$75), or Over $75 (> $75).',
      options: {
        list: GUIDE_PRICE_BUCKET_OPTIONS,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'inStock',
      title: 'Currently Available / In Stock at Merchant',
      type: 'boolean',
      group: 'commerce',
      initialValue: true,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'availabilityNote',
      title: 'Lead-Time or Seasonal Availability Note (Optional)',
      type: 'string',
      group: 'commerce',
      description: 'E.g. "Made to order in 3–5 business days" or "Limited seasonal batch".',
      validation: (Rule) => Rule.optional().max(160),
    }),

    // Verification & Sample Protection Metadata
    defineField({
      name: 'priceVerified',
      title: 'Price Verified Against Merchant Source',
      type: 'boolean',
      group: 'commerce',
      fieldset: 'commerceVerification',
      initialValue: false,
      description:
        'Requires selecting a valid `priceVerificationSource` and providing a verification note or timestamp below.',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'priceVerificationSource',
      title: 'Price Verification Source',
      type: 'string',
      group: 'commerce',
      fieldset: 'commerceVerification',
      initialValue: 'unverified',
      options: {
        list: [
          { title: 'Unverified — Needs Check (unverified)', value: 'unverified' },
          { title: 'Deterministic Merchant Schema.org JSON-LD (merchant-json-ld)', value: 'merchant-json-ld' },
          { title: 'Manual Editor Check on Merchant Page (manual-merchant-check)', value: 'manual-merchant-check' },
          { title: 'Verified Fourthwall Storefront Catalog (fourthwall-catalog)', value: 'fourthwall-catalog' },
        ],
      },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'priceVerifiedAt',
      title: 'Price Last Verified Date',
      type: 'date',
      group: 'commerce',
      fieldset: 'commerceVerification',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'priceVerificationEvidenceNote',
      title: 'Price Verification Evidence / Audit Note',
      type: 'string',
      group: 'commerce',
      fieldset: 'commerceVerification',
      description:
        'Document how the price was verified (e.g. "Checked $48 retail on kinto-usa.com PDP on 2026-11-12"). Required when `priceVerified` is enabled.',
      validation: (Rule) => Rule.optional().max(240),
    }),
    defineField({
      name: 'inventoryVerified',
      title: 'Stock Availability Explicitly Verified',
      type: 'boolean',
      group: 'commerce',
      fieldset: 'commerceVerification',
      initialValue: false,
      description:
        'When false, Schema.org InStock/OutOfStock claims are suppressed automatically without invalidating the product’s editorial review.',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'inventoryVerificationSource',
      title: 'Inventory Verification Source',
      type: 'string',
      group: 'commerce',
      fieldset: 'commerceVerification',
      initialValue: 'unverified',
      options: {
        list: [
          { title: 'Unverified — Suppress Schema.org Availability (unverified)', value: 'unverified' },
          { title: 'Deterministic Merchant Schema.org Offer (merchant-json-ld)', value: 'merchant-json-ld' },
          { title: 'Manual Editor Check on Merchant Page (manual-merchant-check)', value: 'manual-merchant-check' },
          { title: 'Live Fourthwall Inventory Feed (fourthwall-catalog)', value: 'fourthwall-catalog' },
        ],
      },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'inventoryVerifiedAt',
      title: 'Inventory Last Verified Date',
      type: 'date',
      group: 'commerce',
      fieldset: 'commerceVerification',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'isSampleProduct',
      title: 'Development Sample Product Flag (`isSampleProduct`)',
      type: 'boolean',
      group: 'commerce',
      fieldset: 'commerceVerification',
      initialValue: false,
      description:
        'Sample products are strictly blocked from public publication and forced to `noindex,follow`.',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'isPlaceholderLink',
      title: 'Placeholder Purchase URL Flag (`isPlaceholderLink`)',
      type: 'boolean',
      group: 'commerce',
      fieldset: 'commerceVerification',
      initialValue: false,
      description:
        'Products with placeholder links cannot be published as public indexed pages.',
      validation: (Rule) => Rule.optional(),
    }),

    // =========================================================================
    // GROUP 4: DISCOVERY TAXONOMY & RELATIONSHIPS
    // =========================================================================
    defineField({
      name: 'recipients',
      title: 'Suitable Recipients',
      type: 'array',
      group: 'discovery',
      description:
        'Powers Gift Finder recipient filtering and `/gift-guides/recipients/[slug]/` archives.',
      of: [defineArrayMember({ type: 'string' })],
      options: {
        list: RECIPIENT_OPTIONS,
      },
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'interests',
      title: 'Interests & Daily Rituals',
      type: 'array',
      group: 'discovery',
      description:
        'Select one or more controlled interest categories (powers `/gift-guides/interests/[slug]/` and Gift Finder).',
      of: [defineArrayMember({ type: 'string' })],
      options: {
        list: INTEREST_OPTIONS,
      },
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'occasions',
      title: 'Suitable Occasions',
      type: 'array',
      group: 'discovery',
      description:
        'Powers Gift Finder occasion filtering and `/gift-guides/occasions/[slug]/` archives.',
      of: [defineArrayMember({ type: 'string' })],
      options: {
        list: OCCASION_OPTIONS,
      },
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'personalityTraits',
      title: 'Gift Style & Personality Archetypes',
      type: 'array',
      group: 'discovery',
      description:
        'Powers Gift Finder personality matching and guided quiz recommendations.',
      of: [defineArrayMember({ type: 'string' })],
      options: {
        list: PERSONALITY_TRAIT_OPTIONS,
      },
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'ageRanges',
      title: 'Suitable Age Ranges',
      type: 'array',
      group: 'discovery',
      of: [defineArrayMember({ type: 'string' })],
      options: {
        list: AGE_RANGE_OPTIONS,
      },
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'relatedProducts',
      title: 'Related Canonical Products (Optional)',
      type: 'array',
      group: 'discovery',
      description:
        'Optional manual related product references.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'product' }],
        }),
      ],
      validation: (Rule) => Rule.optional().unique(),
    }),
    defineField({
      name: 'relatedGuides',
      title: 'Related Gift Guides (Optional)',
      type: 'array',
      group: 'discovery',
      description:
        'Note: Guides that recommend this product are also linked automatically via reverse lookup.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'giftGuide' }],
        }),
      ],
      validation: (Rule) => Rule.optional().unique(),
    }),
    defineField({
      name: 'citationRefs',
      title: 'Supporting Research Citations (Optional)',
      type: 'array',
      group: 'discovery',
      description:
        'Link behavioral psychology studies that support why this category of gift works.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'researchCitation' }],
        }),
      ],
      validation: (Rule) => Rule.optional().unique(),
    }),

    // =========================================================================
    // GROUP 5: IMAGES
    // =========================================================================
    defineField({
      name: 'images',
      title: 'Product Photography (Primary Square Master + Gallery)',
      type: 'array',
      group: 'images',
      description:
        'The first image is the primary 1:1 square master photograph (2400×2400px recommended). Additional items render in the product profile gallery.',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'productImage' })],
      validation: (Rule) => Rule.required().min(1),
    }),

    // =========================================================================
    // GROUP 6: SEO & PUBLISHING
    // =========================================================================
    defineField({
      name: 'status',
      title: 'Publication Lifecycle Status',
      type: 'string',
      group: 'seoPublishing',
      initialValue: 'draft',
      description:
        'New products default to "draft". Setting to "published" requires passing sample/placeholder and price-verification checks.',
      options: {
        list: [
          { title: 'Draft — Unpublished / In Review (draft)', value: 'draft' },
          { title: 'Published — Live in Public Catalog (published)', value: 'published' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'editorialApproved',
      title: 'Editorial & Fact-Check Approval Sign-Off',
      type: 'boolean',
      group: 'seoPublishing',
      initialValue: false,
      description:
        'Confirms an editor has reviewed the product copy, taxonomy tags, and merchant link.',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'seo',
      title: 'SEO, Canonical URL & Indexing Settings',
      type: 'seoMetadata',
      group: 'seoPublishing',
      validation: (Rule) => Rule.optional(),
    }),
  ],
  validation: (Rule) =>
    Rule.custom((doc: Record<string, any> | undefined) => {
      if (!doc) return true;
      const lifecycle = evaluateProductPublicationLifecycle(doc);
      if (lifecycle.blockingErrors.length > 0) {
        return lifecycle.blockingErrors[0];
      }

      // Check price vs budgetTier consistency
      if (typeof doc.price === 'number' && doc.price > 0) {
        const expectedTier =
          doc.price < 50 ? 'under-50' : doc.price <= 100 ? '50-to-100' : '100-plus';
        if (doc.budgetTier && doc.budgetTier !== expectedTier) {
          return {
            level: 'warning',
            message: `Retail price $${doc.price} normally maps to budgetTier "${expectedTier}" (currently set to "${doc.budgetTier}").`,
          };
        }
      }

      if (
        doc.priceVerified === true &&
        doc.priceVerificationSource === 'manual-merchant-check' &&
        (!doc.priceVerificationEvidenceNote ||
          String(doc.priceVerificationEvidenceNote).trim().length < 8)
      ) {
        return 'When marking priceVerified = true via manual merchant check, provide a brief `priceVerificationEvidenceNote` (minimum 8 characters) documenting the check.';
      }

      if (
        doc.status === 'published' &&
        isPlaceholderOrSamplePurchaseUrl(doc.purchaseUrl)
      ) {
        return 'Cannot publish a product with a placeholder or non-HTTPS merchant URL.';
      }

      return true;
    }),
  orderings: [
    {
      title: 'Title (A–Z)',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
    {
      title: 'Price (Low to High)',
      name: 'priceAsc',
      by: [{ field: 'price', direction: 'asc' }],
    },
    {
      title: 'Price (High to Low)',
      name: 'priceDesc',
      by: [{ field: 'price', direction: 'desc' }],
    },
    {
      title: 'Category & Title',
      name: 'categoryAsc',
      by: [
        { field: 'productType', direction: 'asc' },
        { field: 'title', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      vendor: 'vendor',
      price: 'price',
      status: 'status',
      priceVerified: 'priceVerified',
      isSampleProduct: 'isSampleProduct',
      category: 'productType',
      media: 'images.0.asset',
    },
    prepare({
      title,
      vendor,
      price,
      status,
      priceVerified,
      isSampleProduct,
      category,
      media,
    }) {
      const statusBadge = isSampleProduct
        ? 'SAMPLE'
        : status === 'published'
        ? priceVerified
          ? 'PUBLISHED · VERIFIED'
          : 'PUBLISHED · UNVERIFIED PRICE'
        : 'DRAFT';
      const priceText = typeof price === 'number' ? `$${price}` : 'No price';
      return {
        title: title || 'Untitled Product',
        subtitle: `[${statusBadge}] ${vendor || 'Unknown Maker'} · ${priceText}${category ? ` · ${category}` : ''}`,
        media,
      };
    },
  },
});
