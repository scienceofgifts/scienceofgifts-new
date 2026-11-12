/**
 * Science of Gifts — Sanity v3 Content Model & GROQ Query Specification
 *
 * This module defines the normalized Sanity Studio v3 document & object schemas
 * and the corresponding GROQ projections for static generation / hybrid rendering.
 *
 * Design principles:
 * 1. Single Canonical Product Record (`product`): Products are stored once and referenced
 *    by `giftGuide` and `article` documents. Guide-specific copy (`customEditorialNote`,
 *    `awardLabel`, `idealFor`, `goodToKnow`) lives on the `guideProductEntry` object
 *    wrapper so editorial framing never overwrites the canonical product record.
 * 2. Reusable Research Bibliography (`researchCitation`): Peer-reviewed studies are
 *    first-class documents referenced both in article inline Portable Text annotations
 *    and in article/guide reference lists.
 * 3. Pragmatic Taxonomy Consolidation: Controlled vocabularies (recipients, occasions,
 *    personality traits, budget tiers, age ranges) are defined as validated string/array
 *    options and managed centrally in `siteSettings` + `interestTag` rather than
 *    fragmenting the studio into dozens of micro-document types.
 */

export interface SanityFieldDefinition {
  name: string;
  title: string;
  type: string;
  description?: string;
  validationRule: string;
  of?: Array<{ type: string; to?: Array<{ type: string }> }>;
  to?: Array<{ type: string }>;
  options?: Record<string, unknown>;
  fields?: SanityFieldDefinition[];
}

export interface SanitySchemaDefinition {
  name: string;
  title: string;
  type: 'document' | 'object';
  singleton?: boolean;
  description: string;
  fields: SanityFieldDefinition[];
}

export const SANITY_SCHEMA_TYPES: SanitySchemaDefinition[] = [
  // ===========================================================================
  // 1. CANONICAL PRODUCT DOCUMENT (`product`)
  // ===========================================================================
  {
    name: 'product',
    title: 'Product (Canonical Catalog Record)',
    type: 'document',
    description:
      'Single source of truth for a giftable product. Referenced by multiple gift guides and editorial articles without duplicating core commerce or taxonomy data.',
    fields: [
      {
        name: 'productId',
        title: 'Stable Product ID',
        type: 'string',
        description:
          'Immutable canonical identifier (e.g., "prod_fluted_bedside_carafe_09").',
        validationRule: 'Rule.required().regex(/^prod_[a-z0-9_]+$/)',
      },
      {
        name: 'title',
        title: 'Product Name',
        type: 'string',
        validationRule: 'Rule.required().min(3).max(120)',
      },
      {
        name: 'slug',
        title: 'URL Slug',
        type: 'slug',
        options: { source: 'title', maxLength: 96 },
        validationRule: 'Rule.required()',
      },
      {
        name: 'subtitle',
        title: 'Short Tagline / Subtitle',
        type: 'string',
        description: 'Concise 1-line summary used in product cards and quick views.',
        validationRule: 'Rule.required().max(160)',
      },
      {
        name: 'whyToGiveIt',
        title: 'Why To Give It (Default Editorial Rationale)',
        type: 'text',
        description:
          'Canonical description of why this object makes a meaningful gift. Guides can display this default or supply a guide-specific override.',
        validationRule: 'Rule.required().min(30).max(600)',
      },
      {
        name: 'detailsAndCare',
        title: 'Materials, Dimensions & Care',
        type: 'text',
        validationRule: 'Rule.required().max(500)',
      },
      {
        name: 'bestForSummary',
        title: 'Best For (One-Line Recipient Fit)',
        type: 'string',
        validationRule: 'Rule.required().max(180)',
      },
      {
        name: 'images',
        title: 'Product Images',
        type: 'array',
        description:
          'Sanity image assets with hotspot/crop and mandatory accessible alt text.',
        validationRule: 'Rule.required().min(1)',
        of: [{ type: 'productImage' }],
      },
      {
        name: 'price',
        title: 'Price',
        type: 'number',
        description: 'Verified retail price at time of editorial review.',
        validationRule: 'Rule.required().positive()',
      },
      {
        name: 'currency',
        title: 'Currency',
        type: 'string',
        options: { list: ['USD', 'EUR', 'GBP', 'CAD'] },
        validationRule: 'Rule.required()',
      },
      {
        name: 'budgetTier',
        title: 'Discovery Budget Tier',
        type: 'string',
        options: { list: ['under-50', '50-to-100', '100-plus'] },
        validationRule: 'Rule.required()',
      },
      {
        name: 'guidePriceBucket',
        title: 'Guide Price Bucket',
        type: 'string',
        options: { list: ['under-25', '25-to-75', 'over-75'] },
        validationRule: 'Rule.required()',
      },
      {
        name: 'productType',
        title: 'Primary Product Category',
        type: 'string',
        options: {
          list: [
            'Tabletop & Glassware',
            'Kitchen & Pantry',
            'Tea & Coffee Rituals',
            'Keepsakes & Stationery',
            'Home & Textiles',
            'Games & Gathering',
            'Print & Custom Art',
          ],
        },
        validationRule: 'Rule.required()',
      },
      {
        name: 'recipients',
        title: 'Suitable Recipients',
        type: 'array',
        of: [{ type: 'string' }],
        options: {
          list: ['partner', 'parent', 'friend', 'host', 'kids', 'coworker'],
        },
        validationRule: 'Rule.required().min(1)',
      },
      {
        name: 'ageRanges',
        title: 'Suitable Age Ranges',
        type: 'array',
        of: [{ type: 'string' }],
        options: {
          list: [
            'kids',
            'young-adult',
            'adult',
            'parents-grandparents',
            'all-ages',
          ],
        },
        validationRule: 'Rule.required().min(1)',
      },
      {
        name: 'occasions',
        title: 'Occasions',
        type: 'array',
        of: [{ type: 'string' }],
        options: {
          list: [
            'birthday',
            'housewarming',
            'anniversary',
            'thank-you',
            'holidays',
            'just-because',
          ],
        },
        validationRule: 'Rule.required().min(1)',
      },
      {
        name: 'personalityTraits',
        title: 'Personality & Gift Style Archetypes',
        type: 'array',
        of: [{ type: 'string' }],
        options: {
          list: [
            'foodie-host',
            'cozy-homebody',
            'curious-creative',
            'outdoors-nature',
            'nostalgic-sentimental',
            'everyday-ritual',
          ],
        },
        validationRule: 'Rule.required().min(1)',
      },
      {
        name: 'interests',
        title: 'Interest Tags',
        type: 'array',
        of: [{ type: 'string' }],
        validationRule: 'Rule.required().min(1)',
      },
      {
        name: 'vendor',
        title: 'Merchant / Maker / Brand Name',
        type: 'string',
        validationRule: 'Rule.required()',
      },
      {
        name: 'purchaseUrl',
        title: 'Canonical Purchase / Merchant URL',
        type: 'url',
        validationRule: 'Rule.required().uri({ scheme: ["https"] })',
      },
      {
        name: 'commerceProvider',
        title: 'Commerce Provider Adapter',
        type: 'string',
        description:
          'Distinguishes external affiliate links from Fourthwall merchandise, digital downloads, or direct checkout.',
        options: { list: ['affiliate', 'fourthwall', 'digital', 'direct'] },
        validationRule: 'Rule.required()',
      },
      {
        name: 'fulfillmentClassification',
        title: 'Affiliate or Owned-Product Classification',
        type: 'string',
        options: {
          list: [
            'affiliate-partner',
            'owned-fourthwall-merch',
            'owned-digital-product',
            'editorial-non-monetized',
          ],
        },
        validationRule: 'Rule.required()',
      },
      {
        name: 'inStock',
        title: 'Currently Available / In Stock',
        type: 'boolean',
        validationRule: 'Rule.required()',
      },
      {
        name: 'availabilityNote',
        title: 'Availability / Lead-Time Note',
        type: 'string',
        description: 'Optional seasonal or made-to-order lead time note.',
        validationRule: 'Rule.max(140)',
      },
      {
        name: 'citationRefs',
        title: 'Supporting Research Citations',
        type: 'array',
        of: [{ type: 'reference', to: [{ type: 'researchCitation' }] }],
        validationRule: 'Rule.unique()',
      },
      {
        name: 'seo',
        title: 'Dedicated Product Page SEO (Optional)',
        type: 'seoMetadata',
        validationRule: 'Rule.optional()',
      },
      {
        name: 'aiExtractionProvenance',
        title: 'AI Extraction & Human Review Audit Log',
        type: 'object',
        description:
          'Tracks source URL, timestamp, and whether human editor verified price and merchant metadata.',
        validationRule: 'Rule.optional()',
      },
    ],
  },

  // ===========================================================================
  // 2. GIFT GUIDE DOCUMENT (`giftGuide`)
  // ===========================================================================
  {
    name: 'giftGuide',
    title: 'Gift Guide',
    type: 'document',
    description:
      'Curated shopping guide with Editor’s Pick, Quick Picks, ordered product sections, guide-specific product framing, and expandable buying advice.',
    fields: [
      {
        name: 'title',
        title: 'Guide H1 Title',
        type: 'string',
        validationRule: 'Rule.required().min(10).max(120)',
      },
      {
        name: 'slug',
        title: 'URL Slug (/guides/[slug])',
        type: 'slug',
        options: { source: 'title', maxLength: 96 },
        validationRule: 'Rule.required()',
      },
      {
        name: 'subtitle',
        title: 'Dek / Subtitle',
        type: 'text',
        validationRule: 'Rule.required().max(260)',
      },
      {
        name: 'introParagraphs',
        title: 'Introduction Paragraphs',
        type: 'array',
        of: [{ type: 'text' }],
        validationRule: 'Rule.required().min(1)',
      },
      {
        name: 'whoThisGuideIsFor',
        title: 'Who This Guide Is For (Bullet Summary)',
        type: 'array',
        of: [{ type: 'string' }],
        validationRule: 'Rule.min(2).max(5)',
      },
      {
        name: 'heroImage',
        title: 'Hero Image & Alt Text',
        type: 'editorialImage',
        validationRule: 'Rule.optional()',
      },
      {
        name: 'seo',
        title: 'SEO & OpenGraph Metadata',
        type: 'seoMetadata',
        validationRule: 'Rule.required()',
      },
      {
        name: 'author',
        title: 'Author',
        type: 'reference',
        to: [{ type: 'author' }],
        validationRule: 'Rule.required()',
      },
      {
        name: 'publishedAt',
        title: 'Publication Date',
        type: 'date',
        validationRule: 'Rule.required()',
      },
      {
        name: 'updatedAt',
        title: 'Last Updated Date',
        type: 'date',
        validationRule: 'Rule.required()',
      },
      {
        name: 'affiliateDisclosure',
        title: 'Affiliate Disclosure Copy',
        type: 'text',
        validationRule: 'Rule.required()',
      },
      {
        name: 'editorsPick',
        title: 'Featured Editor’s Pick',
        type: 'guideEditorsPick',
        description:
          'References a canonical product and adds guide-specific headline, rationale, and recipient context.',
        validationRule: 'Rule.required()',
      },
      {
        name: 'quickPicks',
        title: 'At-a-Glance Quick Picks',
        type: 'array',
        of: [{ type: 'guideQuickPick' }],
        validationRule: 'Rule.required().min(3).max(8)',
      },
      {
        name: 'sections',
        title: 'Ordered Guide Sections (By Budget or Theme)',
        type: 'array',
        of: [{ type: 'guideSection' }],
        validationRule: 'Rule.required().min(1)',
      },
      {
        name: 'buyingAdvice',
        title: 'How to Choose / Expandable Buying Advice',
        type: 'array',
        of: [{ type: 'guideBuyingTip' }],
        validationRule: 'Rule.optional()',
      },
      {
        name: 'relatedGuides',
        title: 'Related Gift Guides',
        type: 'array',
        of: [{ type: 'reference', to: [{ type: 'giftGuide' }] }],
        validationRule: 'Rule.unique()',
      },
      {
        name: 'relatedArticles',
        title: 'Related Editorial Articles',
        type: 'array',
        of: [{ type: 'reference', to: [{ type: 'article' }] }],
        validationRule: 'Rule.unique()',
      },
      {
        name: 'featured',
        title: 'Featured in Gift Guides Directory',
        type: 'boolean',
        description:
          'When enabled, highlights this guide in the Featured Gift Guides section of /gift-guides/.',
        validationRule: 'Rule.optional()',
      },
      {
        name: 'recipients',
        title: 'Primary Recipients Covered',
        type: 'array',
        of: [{ type: 'string' }],
        options: {
          list: ['partner', 'parent', 'friend', 'host', 'kids', 'coworker'],
        },
        validationRule: 'Rule.optional()',
      },
      {
        name: 'occasions',
        title: 'Primary Occasions Covered',
        type: 'array',
        of: [{ type: 'string' }],
        options: {
          list: [
            'birthday',
            'housewarming',
            'anniversary',
            'thank-you',
            'holidays',
            'just-because',
          ],
        },
        validationRule: 'Rule.optional()',
      },
      {
        name: 'interests',
        title: 'Interest Tags Covered',
        type: 'array',
        of: [{ type: 'string' }],
        validationRule: 'Rule.optional()',
      },
      {
        name: 'citations',
        title: 'Referenced Research Citations',
        type: 'array',
        of: [{ type: 'reference', to: [{ type: 'researchCitation' }] }],
        validationRule: 'Rule.unique()',
      },
    ],
  },

  // ===========================================================================
  // 3. EDITORIAL ARTICLE DOCUMENT (`article`)
  // ===========================================================================
  {
    name: 'article',
    title: 'Editorial Article',
    type: 'document',
    description:
      'Long-form editorial essay with key takeaways, automatic TOC headings, inline research citations, pull quotes, callouts, comparison tables, expandable advice, and contextual product blocks.',
    fields: [
      {
        name: 'title',
        title: 'Article H1 Headline',
        type: 'string',
        validationRule: 'Rule.required().min(10).max(120)',
      },
      {
        name: 'slug',
        title: 'URL Slug (/articles/[slug])',
        type: 'slug',
        options: { source: 'title', maxLength: 96 },
        validationRule: 'Rule.required()',
      },
      {
        name: 'subtitle',
        title: 'Dek / Subtitle',
        type: 'text',
        validationRule: 'Rule.required().max(280)',
      },
      {
        name: 'category',
        title: 'Editorial Section / Category',
        type: 'string',
        validationRule: 'Rule.required()',
      },
      {
        name: 'author',
        title: 'Author',
        type: 'reference',
        to: [{ type: 'author' }],
        validationRule: 'Rule.required()',
      },
      {
        name: 'publishedAt',
        title: 'Publication Date',
        type: 'date',
        validationRule: 'Rule.required()',
      },
      {
        name: 'updatedAt',
        title: 'Last Updated Date',
        type: 'date',
        validationRule: 'Rule.optional()',
      },
      {
        name: 'heroImage',
        title: 'Hero Image, Alt Text & Caption',
        type: 'editorialImage',
        validationRule: 'Rule.required()',
      },
      {
        name: 'summaryTitle',
        title: 'Summary Box Heading',
        type: 'string',
        description: 'Defaults to "The Short Version".',
        validationRule: 'Rule.optional()',
      },
      {
        name: 'executiveSummary',
        title: 'Article Summary / Key Takeaways',
        type: 'array',
        of: [{ type: 'string' }],
        validationRule: 'Rule.required().min(2).max(5)',
      },
      {
        name: 'sections',
        title: 'Structured Article Sections & Custom Editorial Blocks',
        type: 'array',
        description:
          'H2/H3 hierarchy with Portable Text paragraphs (supporting inline citationAnnotation marks), pullQuote, editorialCallout, expandableAdvice, and contextualProducts.',
        of: [{ type: 'articleSectionBlock' }],
        validationRule: 'Rule.required().min(1)',
      },
      {
        name: 'comparisonTable',
        title: 'Empirical / Practical Comparison Table',
        type: 'articleComparisonTable',
        validationRule: 'Rule.optional()',
      },
      {
        name: 'citations',
        title: 'Ordered Bibliography References',
        type: 'array',
        description:
          'Determines the [1], [2], [3] numbering order for inline citations and renders the full reference list.',
        of: [{ type: 'reference', to: [{ type: 'researchCitation' }] }],
        validationRule: 'Rule.required().unique()',
      },
      {
        name: 'relatedGuides',
        title: 'Related Gift Guides',
        type: 'array',
        of: [{ type: 'reference', to: [{ type: 'giftGuide' }] }],
        validationRule: 'Rule.unique()',
      },
      {
        name: 'relatedArticles',
        title: 'Related Editorial Articles',
        type: 'array',
        of: [{ type: 'reference', to: [{ type: 'article' }] }],
        validationRule: 'Rule.unique()',
      },
      {
        name: 'featured',
        title: 'Featured in Stories Directory',
        type: 'boolean',
        description:
          'When enabled, highlights this story in the Featured Story lead slot of /articles/.',
        validationRule: 'Rule.optional()',
      },
      {
        name: 'topics',
        title: 'Editorial Topic Taxonomy',
        type: 'array',
        of: [{ type: 'string' }],
        options: {
          list: [
            'psychology-of-gifting',
            'hosting-and-gatherings',
            'everyday-rituals',
            'thoughtful-living',
            'craft-and-design',
          ],
        },
        validationRule: 'Rule.optional()',
      },
      {
        name: 'recipients',
        title: 'Related Recipient Archetypes',
        type: 'array',
        of: [{ type: 'string' }],
        options: {
          list: ['partner', 'parent', 'friend', 'host', 'kids', 'coworker'],
        },
        validationRule: 'Rule.optional()',
      },
      {
        name: 'occasions',
        title: 'Related Occasions',
        type: 'array',
        of: [{ type: 'string' }],
        options: {
          list: [
            'birthday',
            'housewarming',
            'anniversary',
            'thank-you',
            'holidays',
            'just-because',
          ],
        },
        validationRule: 'Rule.optional()',
      },
      {
        name: 'interests',
        title: 'Related Interest Tags',
        type: 'array',
        of: [{ type: 'string' }],
        validationRule: 'Rule.optional()',
      },
      {
        name: 'seo',
        title: 'SEO, Canonical URL & Social Metadata',
        type: 'seoMetadata',
        validationRule: 'Rule.required()',
      },
    ],
  },

  // ===========================================================================
  // 4. RESEARCH CITATION DOCUMENT (`researchCitation`)
  // ===========================================================================
  {
    name: 'researchCitation',
    title: 'Research Source & Citation',
    type: 'document',
    description:
      'Verified academic study or empirical paper reusable across articles and gift guides. Fabricated citations are strictly prohibited.',
    fields: [
      {
        name: 'citationId',
        title: 'Stable Citation ID',
        type: 'string',
        description: 'Stable identifier (e.g., "cit_flynn_adams_2009").',
        validationRule: 'Rule.required().regex(/^cit_[a-z0-9_]+$/)',
      },
      {
        name: 'title',
        title: 'Study Title',
        type: 'string',
        validationRule: 'Rule.required()',
      },
      {
        name: 'authors',
        title: 'Authors',
        type: 'string',
        description: 'Formatted author list (e.g., "Flynn, F. J., & Adams, G. S.").',
        validationRule: 'Rule.required()',
      },
      {
        name: 'year',
        title: 'Publication Year',
        type: 'number',
        validationRule: 'Rule.required().min(1900).max(2030)',
      },
      {
        name: 'publication',
        title: 'Journal / Publication & Bibliographic Details',
        type: 'string',
        description:
          'Journal name, volume, issue, and page range (e.g., "Journal of Experimental Social Psychology, 45(2), 404–409").',
        validationRule: 'Rule.required()',
      },
      {
        name: 'doiOrUrl',
        title: 'DOI or Canonical Source URL',
        type: 'url',
        validationRule: 'Rule.required().uri({ scheme: ["https"] })',
      },
      {
        name: 'keyFinding',
        title: 'Plain-Language Study Finding Summary',
        type: 'text',
        validationRule: 'Rule.required().min(30).max(500)',
      },
      {
        name: 'limitations',
        title: 'Context, Scope & Limitations',
        type: 'text',
        description:
          'Clarifies sample context or boundaries so editorial claims do not overstate laboratory findings.',
        validationRule: 'Rule.optional().max(450)',
      },
      {
        name: 'verificationStatus',
        title: 'Verification Status',
        type: 'string',
        options: { list: ['verified-doi', 'sample-fixture'] },
        validationRule: 'Rule.required()',
      },
    ],
  },

  // ===========================================================================
  // 5. AUTHOR DOCUMENT (`author`)
  // ===========================================================================
  {
    name: 'author',
    title: 'Editorial Author',
    type: 'document',
    description: 'Writer, editor, or reviewer profile.',
    fields: [
      {
        name: 'authorId',
        title: 'Stable Author ID',
        type: 'string',
        validationRule: 'Rule.required()',
      },
      {
        name: 'name',
        title: 'Full Name',
        type: 'string',
        validationRule: 'Rule.required()',
      },
      {
        name: 'slug',
        title: 'Slug',
        type: 'slug',
        options: { source: 'name' },
        validationRule: 'Rule.required()',
      },
      {
        name: 'role',
        title: 'Editorial Role',
        type: 'string',
        validationRule: 'Rule.required()',
      },
      {
        name: 'bio',
        title: 'Author Bio',
        type: 'text',
        validationRule: 'Rule.required().max(400)',
      },
      {
        name: 'avatar',
        title: 'Portrait Image',
        type: 'editorialImage',
        validationRule: 'Rule.required()',
      },
      {
        name: 'isSampleAuthor',
        title: 'Sample / Development Profile Flag',
        type: 'boolean',
        validationRule: 'Rule.optional()',
      },
    ],
  },

  // ===========================================================================
  // 6. SITE SETTINGS & TAXONOMY SINGLETON (`siteSettings`)
  // ===========================================================================
  {
    name: 'siteSettings',
    title: 'Site Settings, Navigation & Taxonomy Registry',
    type: 'document',
    singleton: true,
    description:
      'Singleton configuration for global navigation, default SEO/OpenGraph fallbacks, standard affiliate disclosures, and controlled taxonomy labels.',
    fields: [
      {
        name: 'siteName',
        title: 'Publication Name',
        type: 'string',
        validationRule: 'Rule.required()',
      },
      {
        name: 'siteOrigin',
        title: 'Canonical Site Origin',
        type: 'url',
        validationRule: 'Rule.required()',
      },
      {
        name: 'primaryNavLinks',
        title: 'Top Bar Navigation Items (Max 5 Links + 1 Primary CTA)',
        type: 'array',
        of: [{ type: 'object' }],
        validationRule: 'Rule.required().max(5)',
      },
      {
        name: 'defaultAffiliateDisclosure',
        title: 'Default Affiliate Disclosure Text',
        type: 'text',
        validationRule: 'Rule.required()',
      },
      {
        name: 'taxonomyRegistry',
        title: 'Controlled Taxonomy Labels (Recipients, Occasions, Traits, Budgets)',
        type: 'object',
        description:
          'Centralized human-readable labels and filter descriptions for recipients, occasions, personality traits, and budget buckets.',
        validationRule: 'Rule.required()',
      },
      {
        name: 'editorialHubs',
        title: 'Editorial Discovery Hubs (Gifts for Him, Gifts for Her, & Future Hubs)',
        type: 'array',
        description:
          'Structured configuration for major editorial discovery hubs (/gifts-for-men/, /gifts-for-women/) with decoupled H1 title, SEO metadata, relationship pathways, interest slugs, budget brackets, curated guides, curated products, and publication readiness thresholds.',
        of: [{ type: 'editorialHubConfig' }],
        validationRule: 'Rule.optional()',
      },
    ],
  },
];

export const SANITY_OBJECT_SCHEMA_TYPES: SanitySchemaDefinition[] = [
  {
    name: 'productImage',
    title: 'Product Master Image (2400×2400 Square Standard)',
    type: 'object',
    description:
      'Standardized 1:1 square master product photograph (2400×2400px recommended) with Sanity hotspot focal-point cropping, optional fitMode ("cover" or "contain"), and optional manual landscape/portrait override URLs.',
    fields: [
      {
        name: 'asset',
        title: 'Master Square Image Asset (2400×2400px 1:1)',
        type: 'image',
        options: { hotspot: true },
        validationRule: 'Rule.required()',
      },
      {
        name: 'alt',
        title: 'Accessible Alt Text',
        type: 'string',
        description:
          'Descriptive alt text required for screen readers and SEO.',
        validationRule: 'Rule.required().min(10).max(220)',
      },
      {
        name: 'caption',
        title: 'Editorial Caption (Optional)',
        type: 'string',
        validationRule: 'Rule.optional().max(200)',
      },
      {
        name: 'fallbackColor',
        title: 'Warm Surface Fallback Color (Hex)',
        type: 'string',
        description:
          'Used as background placeholder while loading or when fitMode is "contain" (defaults to #F6F4EF).',
        validationRule: 'Rule.optional().regex(/^#[0-9A-Fa-f]{6}$/)',
      },
      {
        name: 'fitMode',
        title: 'Image Fit Mode',
        type: 'string',
        description:
          'Defaults to "cover" (fills frame using hotspot focal point). Choose "contain" for tall bottles, lamps, or irregular objects that must not be cropped.',
        options: { list: ['cover', 'contain'] },
        validationRule: 'Rule.optional()',
      },
      {
        name: 'landscapeOverrideUrl',
        title: 'Landscape Override URL (Optional 4:3 / 16:10 Composition)',
        type: 'url',
        description:
          'Optional manually composed landscape photograph used for 4:3 product page heroes and featured guide cards instead of auto-cropping the 1:1 master.',
        validationRule: 'Rule.optional().uri({ scheme: ["https"] })',
      },
      {
        name: 'portraitOverrideUrl',
        title: 'Portrait Override URL (Optional 4:5 Composition)',
        type: 'url',
        description:
          'Optional manually composed portrait photograph used for 4:5 Gift Finder cards and Quick View modals instead of auto-cropping the 1:1 master.',
        validationRule: 'Rule.optional().uri({ scheme: ["https"] })',
      },
      {
        name: 'isSampleAsset',
        title: 'Sample / Preview Asset Flag',
        type: 'boolean',
        description:
          'Set to true only for temporary development sample photographs.',
        validationRule: 'Rule.optional()',
      },
    ],
  },
  {
    name: 'seoMetadata',
    title: 'SEO, Canonical URL, Social Sharing & Indexing Controls',
    type: 'object',
    description:
      'Reusable SEO configuration object shared across Gift Guides, Editorial Articles, Product Profiles, Category Archives, and Editorial Hubs. Decouples the search <title> from the visible on-page H1 and uses non-blocking length warnings rather than hard character caps.',
    fields: [
      {
        name: 'seoTitle',
        title: 'SEO Title (HTML <title> Tag)',
        type: 'string',
        description:
          'Custom search engine title tag. Leave blank to auto-generate a clean default from the visible on-page H1 title and site name. Changing this never modifies the visible H1.',
        validationRule:
          'Rule.optional().max(70).warning("Recommended 35–65 characters for optimal search display; longer titles may be truncated in search results.")',
      },
      {
        name: 'metaDescription',
        title: 'Meta Description',
        type: 'text',
        description:
          'Custom search result snippet description. Leave blank to derive a clean whole-sentence summary from the subtitle or editorial intro.',
        validationRule:
          'Rule.optional().max(165).warning("Recommended 110–160 characters for search snippets; longer descriptions may be truncated.")',
      },
      {
        name: 'canonicalPath',
        title: 'Canonical Path or URL Override',
        type: 'string',
        description:
          'Normalized path starting and ending with "/" (e.g. "/gift-guides/thoughtful-host-and-gathering-gifts-under-100/"). Cross-domain URLs (such as shop.scienceofgifts.com or external merchants) are rejected automatically.',
        validationRule: 'Rule.optional().regex(/^\\/.*\\/$|^\\/$/)',
      },
      {
        name: 'ogTitle',
        title: 'Social Sharing Title (og:title / twitter:title)',
        type: 'string',
        description:
          'Optional social card headline override. Defaults to seoTitle when left blank.',
        validationRule: 'Rule.optional()',
      },
      {
        name: 'ogDescription',
        title: 'Social Sharing Description (og:description / twitter:description)',
        type: 'text',
        description:
          'Optional social card description override. Defaults to metaDescription when left blank.',
        validationRule: 'Rule.optional()',
      },
      {
        name: 'ogImage',
        title: 'Social Sharing Image URL (og:image / twitter:image)',
        type: 'url',
        description:
          'Optional social preview image override. Defaults to the guide/article hero image or primary product image.',
        validationRule: 'Rule.optional().uri({ scheme: ["https"] })',
      },
      {
        name: 'ogType',
        title: 'OpenGraph Type',
        type: 'string',
        options: { list: ['website', 'article', 'product'] },
        validationRule: 'Rule.optional()',
      },
      {
        name: 'schemaType',
        title: 'Primary Structured Data Schema Type',
        type: 'string',
        options: {
          list: [
            'WebSite',
            'Article',
            'ItemList',
            'Product',
            'CollectionPage',
          ],
        },
        validationRule: 'Rule.optional()',
      },
      {
        name: 'indexing',
        title: 'Search Engine Indexing Directive',
        type: 'string',
        description:
          'Defaults to "index,follow" for published pages. Choose "noindex,follow" to exclude a specific page from search indexing and XML sitemaps.',
        options: { list: ['index,follow', 'noindex,follow'] },
        validationRule: 'Rule.optional()',
      },
      {
        name: 'noindex',
        title: 'Exclude From Search Indexing (noindex)',
        type: 'boolean',
        description:
          'When enabled, renders <meta name="robots" content="noindex, follow"> and excludes the page from /sitemap.xml.',
        validationRule: 'Rule.optional()',
      },
    ],
  },
  {
    name: 'editorialHubConfig',
    title: 'Editorial Discovery Hub Configuration (Gifts for Him / Gifts for Her)',
    type: 'object',
    description:
      'Reusable configuration for major editorial discovery hubs (/gifts-for-men/, /gifts-for-women/) combining relationship pathways, interest taxonomy, budget tiers, occasion discovery, curated guides, curated products, and buying advice.',
    fields: [
      {
        name: 'slug',
        title: 'Canonical Route Slug (e.g. "gifts-for-men", "gifts-for-women")',
        type: 'string',
        validationRule: 'Rule.required()',
      },
      {
        name: 'routePath',
        title: 'Normalized Canonical Route Path (e.g. "/gifts-for-men/")',
        type: 'string',
        validationRule: 'Rule.required().regex(/^\\/[a-z0-9-]+\\/$/)',
      },
      {
        name: 'title',
        title: 'Visible H1 Heading (e.g. "Gifts for Him", "Gifts for Her")',
        type: 'string',
        description:
          'Decoupled from the URL slug and SEO <title> tag so existing production URLs (/gifts-for-men/, /gifts-for-women/) can display editorial H1 headings ("Gifts for Him", "Gifts for Her").',
        validationRule: 'Rule.required().min(5).max(90)',
      },
      {
        name: 'subtitle',
        title: 'Editorial Lead / Subtitle',
        type: 'text',
        validationRule: 'Rule.required().max(280)',
      },
      {
        name: 'editorialLeadParagraphs',
        title: 'Editorial Introduction Paragraphs',
        type: 'array',
        of: [{ type: 'text' }],
        validationRule: 'Rule.optional()',
      },
      {
        name: 'status',
        title: 'Publication Status',
        type: 'string',
        options: { list: ['draft', 'published'] },
        validationRule: 'Rule.required()',
      },
      {
        name: 'seo',
        title: 'SEO, Canonical URL & Indexing Metadata',
        type: 'seoMetadata',
        validationRule: 'Rule.required()',
      },
      {
        name: 'relationshipPathways',
        title: 'Browse by Relationship Pathways',
        type: 'array',
        of: [{ type: 'object' }],
        validationRule: 'Rule.required().min(4)',
      },
      {
        name: 'interestSlugs',
        title: 'Browse by Interest Slugs',
        type: 'array',
        of: [{ type: 'string' }],
        validationRule: 'Rule.required().min(1)',
      },
      {
        name: 'budgetBrackets',
        title: 'Browse by Budget Brackets',
        type: 'array',
        of: [{ type: 'object' }],
        validationRule: 'Rule.required().min(3)',
      },
      {
        name: 'curatedGuides',
        title: 'Curated Editorial Gift Guides',
        type: 'array',
        of: [{ type: 'reference', to: [{ type: 'giftGuide' }] }],
        validationRule: 'Rule.unique()',
      },
      {
        name: 'curatedProductPicks',
        title: 'Curated Individual Gift Selections',
        type: 'array',
        of: [{ type: 'object' }],
        validationRule: 'Rule.optional()',
      },
      {
        name: 'buyingAdvice',
        title: 'Editorial Buying Advice Blocks',
        type: 'array',
        of: [{ type: 'object' }],
        validationRule: 'Rule.required().min(3)',
      },
    ],
  },
];

/**
 * Reference GROQ projections demonstrating how Gift Guides, Articles, and Editorial Hubs join
 * canonical `product` and `researchCitation` documents without duplicating records.
 */
export const GROQ_QUERIES = {
  giftGuideBySlug: `*[_type == "giftGuide" && slug.current == $slug][0]{
    "id": _id,
    "slug": slug.current,
    title,
    subtitle,
    introParagraphs,
    whoThisGuideIsFor,
    affiliateDisclosure,
    seo,
    category,
    publishedAt,
    updatedAt,
    readTimeMinutes,
    "author": author->{ authorId, name, role, bio, "avatarUrl": avatar.asset->url, isSampleAuthor },
    editorsPick {
      kicker,
      headline,
      editorialRationale,
      intendedRecipientAndSituation,
      targetSectionId,
      "product": product->{
        "id": productId,
        "slug": slug.current,
        title,
        subtitle,
        vendor,
        price,
        currency,
        commerceProvider,
        purchaseUrl,
        inStock,
        whyToGiveIt,
        detailsAndCare,
        images[]{
          "id": _key,
          "url": asset->url,
          alt,
          caption,
          fallbackColor,
          fitMode,
          landscapeOverrideUrl,
          portraitOverrideUrl,
          isSampleAsset,
          "focalPoint": select(defined(hotspot) => { "x": hotspot.x, "y": hotspot.y }, { "x": 0.5, "y": 0.5 }),
          crop
        }
      }
    },
    sections[]{
      id,
      shortNavTitle,
      title,
      priceRangeLabel,
      summary,
      accentSurface,
      recommendations[]{
        awardLabel,
        customEditorialNote,
        idealFor,
        goodToKnow,
        layoutHighlight,
        "product": product->{
          "id": productId,
          "slug": slug.current,
          title,
          subtitle,
          vendor,
          price,
          currency,
          commerceProvider,
          purchaseUrl,
          inStock,
          whyToGiveIt,
          detailsAndCare,
          images[]{
            "id": _key,
            "url": asset->url,
            alt,
            caption,
            fallbackColor,
            fitMode,
            landscapeOverrideUrl,
            portraitOverrideUrl,
            isSampleAsset,
            "focalPoint": select(defined(hotspot) => { "x": hotspot.x, "y": hotspot.y }, { "x": 0.5, "y": 0.5 }),
            crop
          }
        }
      }
    },
    "citations": citations[]->{
      "id": citationId,
      authors,
      year,
      title,
      publication,
      doiOrUrl,
      keyFinding,
      limitations,
      verificationStatus
    }
  }`,

  articleBySlug: `*[_type == "article" && slug.current == $slug][0]{
    "id": _id,
    "slug": slug.current,
    title,
    subtitle,
    category,
    publishedAt,
    updatedAt,
    summaryTitle,
    executiveSummary,
    seo,
    "author": author->{ authorId, name, role, bio, "avatarUrl": avatar.asset->url, isSampleAuthor },
    sections[]{
      id,
      shortNavTitle,
      heading,
      paragraphs,
      subSections,
      pullQuote,
      callout,
      expandableAdvice,
      contextualProducts {
        heading,
        editorialContext,
        "products": products[]->{
          "id": productId,
          "slug": slug.current,
          title,
          vendor,
          price,
          currency,
          purchaseUrl,
          whyToGiveIt,
          images[]{
            "id": _key,
            "url": asset->url,
            alt,
            fallbackColor,
            fitMode,
            landscapeOverrideUrl,
            portraitOverrideUrl,
            isSampleAsset,
            "focalPoint": select(defined(hotspot) => { "x": hotspot.x, "y": hotspot.y }, { "x": 0.5, "y": 0.5 }),
            crop
          }
        }
      }
    },
    comparisonTable,
    "citations": citations[]->{
      "id": citationId,
      authors,
      year,
      title,
      publication,
      doiOrUrl,
      keyFinding,
      limitations,
      verificationStatus
    },
    "relatedGuides": relatedGuides[]->{ "id": _id, "slug": slug.current, title, subtitle, readTimeMinutes, heroImageUrl },
    "relatedArticles": relatedArticles[]->{ "id": _id, "slug": slug.current, title, subtitle, category, heroImageUrl }
  }`,

  editorialHubBySlug: `*[_type == "siteSettings"][0].editorialHubs[slug == $slug][0]{
    id,
    slug,
    routePath,
    title,
    editorialKicker,
    subtitle,
    editorialLeadParagraphs,
    editorialPositioning,
    status,
    seo,
    relationshipPathways,
    interestSlugs,
    budgetBrackets,
    occasionKeys,
    "curatedGuideIds": curatedGuides[]->_id,
    curatedProductPicks[]{
      selectionSource,
      editorialNote,
      bestForRelationship,
      "productId": product->productId,
      "featuredGuideId": featuredGuide->_id
    },
    finderCta,
    buyingAdvice,
    "relatedArticleIds": relatedArticles[]->_id,
    companionHubSlug,
    minimumRequiredGuides,
    minimumRequiredProducts
  }`,
};
