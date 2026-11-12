/**
 * Science of Gifts — Editorial Discovery Hub & Publication Page Object Schemas
 *
 * Implements the reusable objects required by:
 * - `EditorialHubConfig` (`src/types/content.ts` lines 479–594) for `/gifts-for-men/` and `/gifts-for-women/`
 * - `PublicationInfoPageViewProps` (`src/components/PublicationInfoPageView.tsx`) for `/about/`, `/editorial-policy/`, etc.
 * - `RecipientSpotlight` (`src/types/content.ts` lines 451–461)
 */

import { defineArrayMember, defineField, defineType } from '../../sanityCore';
import {
  AGE_RANGE_OPTIONS,
  OCCASION_OPTIONS,
  PERSONALITY_TRAIT_OPTIONS,
  PRODUCT_BUDGET_TIER_OPTIONS,
  RECIPIENT_OPTIONS,
} from '../../taxonomyRegistry';

export const editorialHubRelationshipPathwayObject = defineType({
  name: 'editorialHubRelationshipPathway',
  title: 'Editorial Hub Relationship Pathway',
  type: 'object',
  description:
    'Relationship entry point card on Gifts for Him / Gifts for Her (e.g., "For Dad & Fathers-in-Law", "For a Wife or Spouse") linking to recipient archives and filtered Gift Finder views.',
  fields: [
    defineField({
      name: 'id',
      title: 'Pathway ID',
      type: 'string',
      description: 'E.g. "him-dad" or "her-mom".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Full Relationship Heading',
      type: 'string',
      description: 'E.g. "For Dad & Fathers-in-Law".',
      validation: (Rule) => Rule.required().min(4).max(80),
    }),
    defineField({
      name: 'shortLabel',
      title: 'Short Pill Label',
      type: 'string',
      description: 'E.g. "Dad" or "Wife".',
      validation: (Rule) => Rule.optional().max(35),
    }),
    defineField({
      name: 'relationshipSlug',
      title: 'Relationship Slug',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'iconKey',
      title: 'Icon Key',
      type: 'string',
      options: {
        list: [
          { title: 'Users / Family (users)', value: 'users' },
          { title: 'Heart / Spouse (heart)', value: 'heart' },
          { title: 'Heart Handshake / Partner (heart-handshake)', value: 'heart-handshake' },
          { title: 'User Round / Sibling (user-round)', value: 'user-round' },
          { title: 'Landmark / Grandparent (landmark)', value: 'landmark' },
          { title: 'Utensils / Host & Friends (utensils)', value: 'utensils' },
        ],
      },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'description',
      title: 'Relationship Gifting Description',
      type: 'text',
      validation: (Rule) => Rule.required().min(20).max(320),
    }),
    defineField({
      name: 'editorialTip',
      title: 'Optional Editorial Tip',
      type: 'string',
      validation: (Rule) => Rule.optional().max(200),
    }),
    defineField({
      name: 'recipientFilter',
      title: 'Mapped Recipient Tag',
      type: 'string',
      options: { list: RECIPIENT_OPTIONS },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'ageRangeFilter',
      title: 'Optional Age Range Filter',
      type: 'string',
      options: { list: AGE_RANGE_OPTIONS },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'personalityFilter',
      title: 'Optional Personality Trait Filter',
      type: 'string',
      options: { list: PERSONALITY_TRAIT_OPTIONS },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'recipientArchiveHref',
      title: 'Recipient Archive Path',
      type: 'string',
      description: 'E.g. "/gift-guides/recipients/parent/".',
      validation: (Rule) => Rule.required().regex(/^\/gift-guides\/recipients\/[a-z0-9-]+\/$/),
    }),
    defineField({
      name: 'giftFinderHref',
      title: 'Pre-Filtered Gift Finder Path',
      type: 'string',
      description: 'E.g. "/gift-finder/?recipient=parent".',
      validation: (Rule) => Rule.required().regex(/^\/gift-finder\//),
    }),
  ],
  preview: {
    select: {
      title: 'label',
      shortLabel: 'shortLabel',
      subtitle: 'description',
    },
    prepare({ title, shortLabel, subtitle }) {
      return {
        title: `${title || 'Relationship Pathway'}${shortLabel ? ` (${shortLabel})` : ''}`,
        subtitle: subtitle || '',
      };
    },
  },
});

export const editorialHubBudgetBracketObject = defineType({
  name: 'editorialHubBudgetBracket',
  title: 'Editorial Hub Budget Bracket',
  type: 'object',
  description:
    'Budget discovery card on Gifts for Him / Gifts for Her ("Under $25", "$25 to $50", "$50 to $100", "$100 and Above").',
  fields: [
    defineField({
      name: 'id',
      title: 'Bracket ID',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Bracket Heading',
      type: 'string',
      description: 'E.g. "Under $25" or "$50 to $100".',
      validation: (Rule) => Rule.required().max(60),
    }),
    defineField({
      name: 'priceRangeLabel',
      title: 'Price Range Subtitle Badge',
      type: 'string',
      description: 'E.g. "Up to $25 USD" or "$50–$100 USD".',
      validation: (Rule) => Rule.required().max(60),
    }),
    defineField({
      name: 'minPrice',
      title: 'Minimum Price (USD, Optional)',
      type: 'number',
      validation: (Rule) => Rule.optional().min(0),
    }),
    defineField({
      name: 'maxPrice',
      title: 'Maximum Price (USD, Optional)',
      type: 'number',
      validation: (Rule) => Rule.optional().positive(),
    }),
    defineField({
      name: 'description',
      title: 'Budget Tier Editorial Summary',
      type: 'text',
      validation: (Rule) => Rule.required().min(20).max(320),
    }),
    defineField({
      name: 'giftFinderHref',
      title: 'Filtered Gift Finder Path',
      type: 'string',
      description: 'E.g. "/gift-finder/?minPrice=25&maxPrice=50".',
      validation: (Rule) => Rule.required().regex(/^\/gift-finder\//),
    }),
    defineField({
      name: 'featuredGuide',
      title: 'Highlighted Gift Guide for This Budget (Optional)',
      type: 'reference',
      to: [{ type: 'giftGuide' }],
      validation: (Rule) => Rule.optional(),
    }),
  ],
  preview: {
    select: {
      title: 'label',
      range: 'priceRangeLabel',
      subtitle: 'description',
    },
    prepare({ title, range, subtitle }) {
      return {
        title: `${title || 'Budget Bracket'}${range ? ` (${range})` : ''}`,
        subtitle: subtitle || '',
      };
    },
  },
});

export const editorialHubProductSelectionObject = defineType({
  name: 'editorialHubProductSelection',
  title: 'Editorial Hub Curated Product Selection',
  type: 'object',
  description:
    'References a canonical product for the hub’s featured gifts grid and adds relationship-specific editorial framing.',
  fields: [
    defineField({
      name: 'product',
      title: 'Canonical Product Reference',
      type: 'reference',
      to: [{ type: 'product' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'selectionSource',
      title: 'Selection Provenance',
      type: 'string',
      initialValue: 'editorial-curation',
      options: {
        list: [
          { title: 'Explicit Editorial Curation (editorial-curation)', value: 'editorial-curation' },
          { title: 'Deterministic Catalog Match (catalog-match)', value: 'catalog-match' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'editorialNote',
      title: 'Hub-Specific Editorial Rationale',
      type: 'text',
      description:
        'Explains why this product stands out for Him or for Her.',
      validation: (Rule) => Rule.required().min(20).max(400),
    }),
    defineField({
      name: 'bestForRelationship',
      title: 'Best For Relationships Label',
      type: 'string',
      description: 'E.g. "Husbands, Boyfriends & Design-Loving Friends".',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'featuredGuide',
      title: 'Primary Companion Gift Guide Reference (Optional)',
      type: 'reference',
      to: [{ type: 'giftGuide' }],
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'highlightFormat',
      title: 'Card Display Format (Optional)',
      type: 'string',
      initialValue: 'supporting-card',
      options: {
        list: [
          { title: 'Lead Feature Card (lead-feature)', value: 'lead-feature' },
          { title: 'Supporting Grid Card (supporting-card)', value: 'supporting-card' },
          { title: 'Compact Row (compact-row)', value: 'compact-row' },
        ],
      },
      validation: (Rule) => Rule.optional(),
    }),
  ],
  preview: {
    select: {
      title: 'product.title',
      rel: 'bestForRelationship',
      note: 'editorialNote',
      media: 'product.images.0.asset',
    },
    prepare({ title, rel, note, media }) {
      return {
        title: title || 'Curated Hub Product',
        subtitle: [rel, note].filter(Boolean).join(' — '),
        media,
      };
    },
  },
});

export const editorialHubPresetLinkObject = defineType({
  name: 'editorialHubPresetLink',
  title: 'Gift Finder Quick Preset Link',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Preset Button Label',
      type: 'string',
      description: 'E.g. "Gifts for Dad Under $50".',
      validation: (Rule) => Rule.required().max(70),
    }),
    defineField({
      name: 'href',
      title: 'Filtered Gift Finder Path',
      type: 'string',
      description: 'E.g. "/gift-finder/?recipient=parent&maxPrice=50".',
      validation: (Rule) => Rule.required().regex(/^\/gift-finder\//),
    }),
  ],
  preview: {
    select: {
      title: 'label',
      subtitle: 'href',
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Preset Link',
        subtitle: subtitle || '',
      };
    },
  },
});

export const editorialHubFinderCtaObject = defineType({
  name: 'editorialHubFinderCta',
  title: 'Editorial Hub Interactive Gift Finder CTA',
  type: 'object',
  description:
    'Configures the mid-page interactive Gift Finder banner and quick-filter preset chips on Gifts for Him / Gifts for Her.',
  fields: [
    defineField({
      name: 'kicker',
      title: 'Eyebrow Kicker',
      type: 'string',
      initialValue: 'Interactive Gift Discovery',
      validation: (Rule) => Rule.optional().max(80),
    }),
    defineField({
      name: 'heading',
      title: 'CTA Heading',
      type: 'string',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'body',
      title: 'CTA Description',
      type: 'text',
      validation: (Rule) => Rule.required().max(340),
    }),
    defineField({
      name: 'primaryLabel',
      title: 'Primary Button Label',
      type: 'string',
      initialValue: 'Open the Gift Finder',
      validation: (Rule) => Rule.required().max(60),
    }),
    defineField({
      name: 'primaryHref',
      title: 'Primary Button Path',
      type: 'string',
      initialValue: '/gift-finder/',
      validation: (Rule) => Rule.required().regex(/^\/gift-finder\//),
    }),
    defineField({
      name: 'secondaryLabel',
      title: 'Secondary Quiz Button Label',
      type: 'string',
      initialValue: 'Take the 5-Step Guided Quiz',
      validation: (Rule) => Rule.optional().max(60),
    }),
    defineField({
      name: 'secondaryHref',
      title: 'Secondary Quiz Path',
      type: 'string',
      initialValue: '/gift-finder/?mode=quiz',
      validation: (Rule) => Rule.optional().regex(/^\/gift-finder\//),
    }),
    defineField({
      name: 'presetLinks',
      title: 'Quick-Start Filter Preset Links',
      type: 'array',
      of: [defineArrayMember({ type: 'editorialHubPresetLink' })],
      validation: (Rule) => Rule.optional().max(6),
    }),
  ],
});

export const editorialHubSeasonalCalloutObject = defineType({
  name: 'editorialHubSeasonalCallout',
  title: 'Editorial Hub Seasonal Gifting Callout',
  type: 'object',
  description:
    'Editable seasonal or occasion spotlight block on Gifts for Him / Gifts for Her (replaces hardcoded seasonal callouts in `EditorialDiscoveryHubView.tsx`).',
  fields: [
    defineField({
      name: 'enabled',
      title: 'Show Seasonal Editorial Callout',
      type: 'boolean',
      initialValue: true,
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'kicker',
      title: 'Seasonal Eyebrow Kicker',
      type: 'string',
      description: 'E.g. "Seasonal Focus · Father’s Day, Graduations & Summer Hosting".',
      validation: (Rule) => Rule.required().max(90),
    }),
    defineField({
      name: 'heading',
      title: 'Seasonal Callout Heading',
      type: 'string',
      validation: (Rule) => Rule.required().max(140),
    }),
    defineField({
      name: 'body',
      title: 'Seasonal Editorial Guidance',
      type: 'text',
      validation: (Rule) => Rule.required().max(480),
    }),
    defineField({
      name: 'featuredOccasion',
      title: 'Highlighted Occasion Archive',
      type: 'string',
      options: { list: OCCASION_OPTIONS },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'ctaLabel',
      title: 'Seasonal CTA Label',
      type: 'string',
      validation: (Rule) => Rule.optional().max(70),
    }),
    defineField({
      name: 'ctaHref',
      title: 'Seasonal CTA Path',
      type: 'string',
      validation: (Rule) => Rule.optional().regex(/^\//),
    }),
  ],
});

export const recipientSpotlightObject = defineType({
  name: 'recipientSpotlight',
  title: 'Recipient Spotlight Card',
  type: 'object',
  description:
    'Visual persona card used on taxonomy archives and discovery directories.',
  fields: [
    defineField({
      name: 'id',
      title: 'Spotlight ID',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Spotlight Title',
      type: 'string',
      validation: (Rule) => Rule.required().max(90),
    }),
    defineField({
      name: 'subtitle',
      title: 'Spotlight Description',
      type: 'text',
      validation: (Rule) => Rule.required().max(240),
    }),
    defineField({
      name: 'recipientFilter',
      title: 'Recipient Filter',
      type: 'string',
      options: { list: RECIPIENT_OPTIONS },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'personalityFilter',
      title: 'Personality Trait Filter',
      type: 'string',
      options: { list: PERSONALITY_TRAIT_OPTIONS },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'budgetFilter',
      title: 'Budget Tier Filter',
      type: 'string',
      options: { list: PRODUCT_BUDGET_TIER_OPTIONS },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'image',
      title: 'Spotlight Photograph',
      type: 'editorialImage',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'accentBg',
      title: 'Accent Surface Class / Hex',
      type: 'string',
      initialValue: '#E5F5EE',
      validation: (Rule) => Rule.optional(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'subtitle',
      media: 'image.asset',
    },
    prepare({ title, subtitle, media }) {
      return {
        title: title || 'Recipient Spotlight',
        subtitle: subtitle || '',
        media,
      };
    },
  },
});

export const publicationInfoSectionObject = defineType({
  name: 'publicationInfoSection',
  title: 'Publication Information Section',
  type: 'object',
  description:
    'Structured content section for About, Editorial Policy, Affiliate Disclosure, Privacy Policy, Terms of Use, and Contact pages (`PublicationInfoPageView.tsx`).',
  fields: [
    defineField({
      name: 'id',
      title: 'Section Anchor ID',
      type: 'string',
      description: 'Kebab-case anchor ID used in the page’s side navigation.',
      validation: (Rule) =>
        Rule.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
          name: 'kebab-case anchor ID',
        }),
    }),
    defineField({
      name: 'heading',
      title: 'Section H2 Heading',
      type: 'string',
      validation: (Rule) => Rule.required().min(3).max(140),
    }),
    defineField({
      name: 'paragraphs',
      title: 'Section Paragraphs',
      type: 'array',
      of: [defineArrayMember({ type: 'text' })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'bullets',
      title: 'Optional Bullet Points',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'ownerReviewNote',
      title: 'Internal / Editorial Governance Review Note (Optional)',
      type: 'text',
      description:
        'Optional transparency or legal review callout displayed inside the section.',
      validation: (Rule) => Rule.optional().max(400),
    }),
  ],
  preview: {
    select: {
      title: 'heading',
      paragraphs: 'paragraphs',
    },
    prepare({ title, paragraphs }) {
      const first = Array.isArray(paragraphs) && paragraphs[0] ? String(paragraphs[0]) : '';
      return {
        title: title || 'Policy / Info Section',
        subtitle: first,
      };
    },
  },
});
