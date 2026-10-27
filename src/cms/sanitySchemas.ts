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
    ],
  },
];

/**
 * Reference GROQ projections demonstrating how Gift Guides and Articles join
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
        images[]{ "id": _key, "url": asset->url, alt, caption, fallbackColor }
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
          images[]{ "id": _key, "url": asset->url, alt, caption, fallbackColor }
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
          images[]{ "id": _key, "url": asset->url, alt, fallbackColor }
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
};
