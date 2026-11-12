/**
 * Science of Gifts — Gift Guide Modular Object Schemas
 *
 * Implements all reusable object types required by `GiftGuide` (`src/types/content.ts` lines 193–358)
 * and rendered by `GiftGuideReaderView.tsx` and `/src/components/guide/*`:
 * - `guideEditorsPick` (Featured top recommendation referencing canonical `product`)
 * - `guideQuickPick` (At-a-glance quick picks bar referencing canonical `product`)
 * - `guideRecipientPathway` (Recipient archetype discovery cards)
 * - `guideCuratorNote` (Editorial curator notes)
 * - `guideProductRecommendation` (Individual recommendation referencing canonical `product` + guide-specific framing)
 * - `guideSection` (Ordered thematic/budget sections with drag-and-drop recommendations)
 * - `guideComparisonRow` & `guideComparison` (Side-by-side product comparison matrix)
 * - `guideBuyingAdvice` (How-to-choose buying advice blocks)
 * - `guideFaq` (Structured FAQ items used by `GuideFAQ.tsx` and Schema.org `FAQPage` JSON-LD)
 */

import { defineArrayMember, defineField, defineType } from '../../sanityCore';
import {
  GUIDE_PRESENTATION_STYLE_OPTIONS,
  OCCASION_OPTIONS,
  PERSONALITY_TRAIT_OPTIONS,
  RECIPIENT_OPTIONS,
} from '../../taxonomyRegistry';

export const guideEditorsPickObject = defineType({
  name: 'guideEditorsPick',
  title: 'Guide Featured Editor’s Pick',
  type: 'object',
  description:
    'Top-of-guide spotlight card referencing a single canonical product and adding guide-specific headline, rationale, and recipient context.',
  fieldsets: [
    {
      name: 'extendedFields',
      title: 'Optional Extended Framing & Overrides',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: 'product',
      title: 'Canonical Product Reference',
      type: 'reference',
      to: [{ type: 'product' }],
      description:
        'Select an existing product from the catalog. Title, maker, price, purchase link, and photography are supplied automatically from the product record.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kicker',
      title: 'Eyebrow Kicker / Award Label',
      type: 'string',
      initialValue: 'Editor’s Pick · Best Overall',
      description: 'E.g. "Editor’s Pick · Most Universal Upgrade".',
      validation: (Rule) => Rule.required().max(80),
    }),
    defineField({
      name: 'headline',
      title: 'Guide-Specific Spotlight Headline',
      type: 'string',
      description:
        'Explains in one compelling line why this product leads this specific guide.',
      validation: (Rule) => Rule.required().min(10).max(150),
    }),
    defineField({
      name: 'editorialRationale',
      title: 'Why It Earned the Top Spot in This Guide',
      type: 'text',
      description:
        '2–4 sentences tailored to this guide’s theme or recipient.',
      validation: (Rule) => Rule.required().min(30).max(650),
    }),
    defineField({
      name: 'intendedRecipientAndSituation',
      title: 'Who It Fits Best & Ideal Situation',
      type: 'string',
      description:
        'E.g. "Close friends, partners, and anyone who keeps water on their nightstand."',
      validation: (Rule) => Rule.required().min(10).max(240),
    }),
    defineField({
      name: 'targetSectionId',
      title: 'Jump-Link Target Section ID',
      type: 'string',
      description:
        'Anchor ID of the guide section where this product appears in full (e.g. "under-50").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'buyingConsiderations',
      title: 'Practical Note / Keep in Mind (Optional)',
      type: 'text',
      fieldset: 'extendedFields',
      validation: (Rule) => Rule.optional().max(320),
    }),
    defineField({
      name: 'awardLabel',
      title: 'Short Badge Label Override (Optional)',
      type: 'string',
      fieldset: 'extendedFields',
      validation: (Rule) => Rule.optional().max(60),
    }),
    defineField({
      name: 'editorialHeadline',
      title: 'Alternate Editorial Headline (Optional)',
      type: 'string',
      fieldset: 'extendedFields',
      validation: (Rule) => Rule.optional().max(150),
    }),
    defineField({
      name: 'whyItStoodOut',
      title: 'Testing / Evaluation Standout Note (Optional)',
      type: 'text',
      fieldset: 'extendedFields',
      validation: (Rule) => Rule.optional().max(400),
    }),
    defineField({
      name: 'whoItFitsBest',
      title: 'Recipient Fit Override (Optional)',
      type: 'string',
      fieldset: 'extendedFields',
      validation: (Rule) => Rule.optional().max(220),
    }),
    defineField({
      name: 'practicalNotes',
      title: 'Care, Sizing or Shipping Note (Optional)',
      type: 'text',
      fieldset: 'extendedFields',
      validation: (Rule) => Rule.optional().max(300),
    }),
  ],
  preview: {
    select: {
      title: 'product.title',
      kicker: 'kicker',
      headline: 'headline',
      media: 'product.images.0.asset',
    },
    prepare({ title, kicker, headline, media }) {
      return {
        title: title ? `${title} (${kicker || 'Editor’s Pick'})` : kicker || 'Editor’s Pick',
        subtitle: headline || '',
        media,
      };
    },
  },
});

export const guideQuickPickObject = defineType({
  name: 'guideQuickPick',
  title: 'Guide Quick Pick Item',
  type: 'object',
  description:
    'Scannable top-of-guide summary row linking a superlative label ("Best Under $25", "Best for Hosts") to a canonical product.',
  fields: [
    defineField({
      name: 'id',
      title: 'Quick Pick Identifier',
      type: 'string',
      description: 'Short stable key within the guide (e.g. "qp_under_25").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Superlative Award Label',
      type: 'string',
      description: 'E.g. "Best Under $25", "Most Personal", or "Best Consumable".',
      validation: (Rule) => Rule.required().min(3).max(70),
    }),
    defineField({
      name: 'product',
      title: 'Canonical Product Reference',
      type: 'reference',
      to: [{ type: 'product' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'reason',
      title: 'One-Line Verdict',
      type: 'string',
      description: 'Concise 1-sentence reason why this pick wins its superlative.',
      validation: (Rule) => Rule.required().min(10).max(200),
    }),
    defineField({
      name: 'bestFor',
      title: 'Best For Tag (Optional)',
      type: 'string',
      validation: (Rule) => Rule.optional().max(120),
    }),
    defineField({
      name: 'targetSectionId',
      title: 'Target Section ID for Smooth Scroll',
      type: 'string',
      description: 'Matches the `id` of the guide section containing this recommendation.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      label: 'label',
      productTitle: 'product.title',
      reason: 'reason',
      media: 'product.images.0.asset',
    },
    prepare({ label, productTitle, reason, media }) {
      return {
        title: `${label || 'Quick Pick'}: ${productTitle || 'Select a product'}`,
        subtitle: reason || '',
        media,
      };
    },
  },
});

export const guideRecipientPathwayObject = defineType({
  name: 'guideRecipientPathway',
  title: 'Guide Recipient Pathway Card',
  type: 'object',
  description:
    'Helps readers navigate the guide by recipient persona or gifting situation, highlighting matching products from the guide.',
  fields: [
    defineField({
      name: 'id',
      title: 'Pathway ID',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Recipient Persona Label',
      type: 'string',
      description: 'E.g. "For the Minimalist Who Says They Need Nothing".',
      validation: (Rule) => Rule.required().min(4).max(100),
    }),
    defineField({
      name: 'description',
      title: 'Persona & Gifting Strategy Description',
      type: 'text',
      validation: (Rule) => Rule.required().min(15).max(320),
    }),
    defineField({
      name: 'editorialTip',
      title: 'Short Editorial Tip (Optional)',
      type: 'string',
      validation: (Rule) => Rule.optional().max(200),
    }),
    defineField({
      name: 'recipientFilter',
      title: 'Recipient Filter Tag (Optional)',
      type: 'string',
      options: { list: RECIPIENT_OPTIONS },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'personalityFilter',
      title: 'Personality Archetype Filter (Optional)',
      type: 'string',
      options: { list: PERSONALITY_TRAIT_OPTIONS },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'occasionFilter',
      title: 'Occasion Filter (Optional)',
      type: 'string',
      options: { list: OCCASION_OPTIONS },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'maxPrice',
      title: 'Maximum Price Filter (Optional USD)',
      type: 'number',
      validation: (Rule) => Rule.optional().positive(),
    }),
    defineField({
      name: 'recommendedProducts',
      title: 'Recommended Products for This Persona',
      type: 'array',
      description: 'Select 1–3 canonical products from this guide that fit this persona.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'product' }],
        }),
      ],
      validation: (Rule) => Rule.optional().unique(),
    }),
  ],
  preview: {
    select: {
      title: 'label',
      subtitle: 'description',
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Recipient Pathway',
        subtitle: subtitle || '',
      };
    },
  },
});

export const guideCuratorNoteObject = defineType({
  name: 'guideCuratorNote',
  title: 'Guide Curator’s Note Callout',
  type: 'object',
  description:
    'Editorial aside or behavioral insight box inserted within a guide section or between sections.',
  fields: [
    defineField({
      name: 'id',
      title: 'Note ID',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kicker',
      title: 'Eyebrow Kicker (Optional)',
      type: 'string',
      initialValue: 'Curator’s Note',
      validation: (Rule) => Rule.optional().max(80),
    }),
    defineField({
      name: 'title',
      title: 'Callout Heading',
      type: 'string',
      validation: (Rule) => Rule.required().min(5).max(140),
    }),
    defineField({
      name: 'body',
      title: 'Curator Note Body',
      type: 'text',
      validation: (Rule) => Rule.required().min(20).max(650),
    }),
    defineField({
      name: 'takeaway',
      title: 'Key Takeaway Sentence (Optional)',
      type: 'string',
      validation: (Rule) => Rule.optional().max(240),
    }),
    defineField({
      name: 'authorAttribution',
      title: 'Author Attribution Line (Optional)',
      type: 'string',
      description: 'E.g. "— Dr. Clara Vance, Senior Behavioral Editor".',
      validation: (Rule) => Rule.optional().max(120),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      kicker: 'kicker',
      subtitle: 'body',
    },
    prepare({ title, kicker, subtitle }) {
      return {
        title: `${kicker || 'Curator’s Note'}: ${title || 'Untitled'}`,
        subtitle: subtitle || '',
      };
    },
  },
});

export const guideProductRecommendationObject = defineType({
  name: 'guideProductRecommendation',
  title: 'Guide Product Recommendation',
  type: 'object',
  description:
    'Pairs a canonical Product reference with guide-specific editorial commentary. Drag and drop items in the parent section to reorder recommendations.',
  fieldsets: [
    {
      name: 'extendedCommentary',
      title: 'Optional Deep-Dive Framing & Presentation Overrides',
      description:
        'Expand to customize presentation style, alternative notes, or deep-dive editorial hooks.',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: 'product',
      title: 'Canonical Product (Searchable Reference)',
      type: 'reference',
      to: [{ type: 'product' }],
      description:
        'Choose an existing product record. Its canonical title, maker, price, merchant URL, and photography are automatically inherited.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'awardLabel',
      title: 'Guide Superlative / Award Badge (Optional)',
      type: 'string',
      description:
        'E.g. "Best Under $25", "Most Tactile Ritual", or "Best Host Upgrade".',
      validation: (Rule) => Rule.optional().max(80),
    }),
    defineField({
      name: 'editorialHeadline',
      title: 'Guide-Specific Editorial Headline (Optional)',
      type: 'string',
      description:
        'Short contextual sub-headline framed specifically for this guide’s reader.',
      validation: (Rule) => Rule.optional().max(160),
    }),
    defineField({
      name: 'customEditorialNote',
      title: 'Why We Recommend It in This Guide',
      type: 'text',
      description:
        'Primary guide-specific explanation of why this product fits this guide’s theme, recipient, or occasion.',
      validation: (Rule) => Rule.required().min(25).max(750),
    }),
    defineField({
      name: 'idealFor',
      title: 'Who It’s Best For',
      type: 'string',
      description:
        'Specific recipient type or daily habit within this guide’s context.',
      validation: (Rule) => Rule.required().min(8).max(240),
    }),
    defineField({
      name: 'goodToKnow',
      title: 'Practical Considerations / Good to Know',
      type: 'string',
      description:
        'Care instructions, lead times, sizing, or presentation advice.',
      validation: (Rule) => Rule.required().min(8).max(280),
    }),
    defineField({
      name: 'presentationStyle',
      title: 'Card Presentation Variant',
      type: 'string',
      fieldset: 'extendedCommentary',
      initialValue: 'standard',
      description:
        'Controls approved editorial card treatment within the guide without breaking page layout.',
      options: {
        list: GUIDE_PRESENTATION_STYLE_OPTIONS,
      },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'layoutHighlight',
      title: 'Legacy Layout Highlight Token (Optional)',
      type: 'string',
      fieldset: 'extendedCommentary',
      options: {
        list: [
          { title: 'Standard (standard)', value: 'standard' },
          { title: 'Feature Horizontal (feature-horizontal)', value: 'feature-horizontal' },
          { title: 'Special Editorial (special-editorial)', value: 'special-editorial' },
          { title: 'Compact (compact)', value: 'compact' },
        ],
      },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'editorialHook',
      title: 'Opening Editorial Hook Sentence (Optional)',
      type: 'string',
      fieldset: 'extendedCommentary',
      validation: (Rule) => Rule.optional().max(220),
    }),
    defineField({
      name: 'whyItWorks',
      title: 'Behavioral Rationale — Why It Works (Optional)',
      type: 'text',
      fieldset: 'extendedCommentary',
      validation: (Rule) => Rule.optional().max(500),
    }),
    defineField({
      name: 'whyWeChoseIt',
      title: 'Curation Note — Why We Chose It (Optional)',
      type: 'text',
      fieldset: 'extendedCommentary',
      validation: (Rule) => Rule.optional().max(500),
    }),
    defineField({
      name: 'whoItsBestFor',
      title: 'Extended Recipient Fit (Optional)',
      type: 'string',
      fieldset: 'extendedCommentary',
      validation: (Rule) => Rule.optional().max(240),
    }),
    defineField({
      name: 'keepInMind',
      title: 'Keep in Mind / Caveat (Optional)',
      type: 'string',
      fieldset: 'extendedCommentary',
      validation: (Rule) => Rule.optional().max(260),
    }),
    defineField({
      name: 'buyingConsiderations',
      title: 'Buying Considerations Note (Optional)',
      type: 'text',
      fieldset: 'extendedCommentary',
      validation: (Rule) => Rule.optional().max(320),
    }),
    defineField({
      name: 'betterAlternativeNote',
      title: 'When to Choose an Alternative Instead (Optional)',
      type: 'string',
      fieldset: 'extendedCommentary',
      description:
        'E.g. "If they prefer coffee over loose-leaf tea, see the Hasami mug above."',
      validation: (Rule) => Rule.optional().max(240),
    }),
  ],
  preview: {
    select: {
      productTitle: 'product.title',
      vendor: 'product.vendor',
      price: 'product.price',
      awardLabel: 'awardLabel',
      style: 'presentationStyle',
      note: 'customEditorialNote',
      media: 'product.images.0.asset',
    },
    prepare({ productTitle, vendor, price, awardLabel, style, note, media }) {
      const priceTag = typeof price === 'number' ? `$${price}` : '';
      const badgePrefix = awardLabel ? `[${awardLabel}] ` : '';
      const title = `${badgePrefix}${productTitle || 'Select a Product'}${vendor ? ` — ${vendor}` : ''}`;
      const subtitle = [priceTag, style && style !== 'standard' ? `Style: ${style}` : '', note]
        .filter(Boolean)
        .join(' · ');
      return {
        title,
        subtitle,
        media,
      };
    },
  },
});

export const guideSectionObject = defineType({
  name: 'guideSection',
  title: 'Gift Guide Thematic / Budget Section',
  type: 'object',
  description:
    'A navigable chapter in the gift guide containing an ordered list of product recommendations and an optional Curator’s Note.',
  fields: [
    defineField({
      name: 'id',
      title: 'Section Anchor ID',
      type: 'string',
      description:
        'Lowercase kebab-case ID used by the sticky section navigation bar (e.g. "under-25" or "edible-flights").',
      validation: (Rule) =>
        Rule.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
          name: 'kebab-case anchor ID',
        }),
    }),
    defineField({
      name: 'shortNavTitle',
      title: 'Sticky Jump-Nav Label',
      type: 'string',
      description: 'Concise 1–3 word label for the sticky section pill bar (e.g. "Under $25").',
      validation: (Rule) => Rule.required().min(2).max(40),
    }),
    defineField({
      name: 'editorialKicker',
      title: 'Section Eyebrow Kicker (Optional)',
      type: 'string',
      description: 'E.g. "Section 01 · Tactile Daily Upgrades".',
      validation: (Rule) => Rule.optional().max(80),
    }),
    defineField({
      name: 'title',
      title: 'Section H2 Heading',
      type: 'string',
      validation: (Rule) => Rule.required().min(5).max(120),
    }),
    defineField({
      name: 'priceRangeLabel',
      title: 'Section Price Range / Subtitle Tag',
      type: 'string',
      description: 'E.g. "$18–$28 USD" or "Zero-Clutter Consumables".',
      validation: (Rule) => Rule.required().max(60),
    }),
    defineField({
      name: 'summary',
      title: 'Section Introduction Paragraph',
      type: 'text',
      validation: (Rule) => Rule.required().min(20).max(550),
    }),
    defineField({
      name: 'accentSurface',
      title: 'Section Background Tint',
      type: 'string',
      initialValue: 'cream',
      options: {
        list: [
          { title: 'Warm Alabaster Cream (cream)', value: 'cream' },
          { title: 'Warm Sand (sand)', value: 'sand' },
          { title: 'Soft Botanical Mint (mint)', value: 'mint' },
          { title: 'Calm Coastal Blue (blue)', value: 'blue' },
        ],
      },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'recommendations',
      title: 'Ordered Product Recommendations (Drag to Reorder)',
      type: 'array',
      description:
        'Select canonical products and write guide-specific commentary. Drag and drop items to change their order in this section.',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'guideProductRecommendation' })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'curatorNote',
      title: 'Section Curator’s Note (Optional)',
      type: 'guideCuratorNote',
      description:
        'Optional editorial callout rendered at the end of this section.',
      validation: (Rule) => Rule.optional(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      nav: 'shortNavTitle',
      priceRange: 'priceRangeLabel',
      recs: 'recommendations',
    },
    prepare({ title, nav, priceRange, recs }) {
      const count = Array.isArray(recs) ? recs.length : 0;
      return {
        title: title || nav || 'Guide Section',
        subtitle: `${nav ? `[${nav}] ` : ''}${priceRange ? `${priceRange} · ` : ''}${count} recommendation${count === 1 ? '' : 's'}`,
      };
    },
  },
});

export const guideComparisonRowObject = defineType({
  name: 'guideComparisonRow',
  title: 'Guide Comparison Table Row',
  type: 'object',
  description:
    'Links a canonical product to structured comparison columns for the guide’s side-by-side comparison table.',
  fields: [
    defineField({
      name: 'product',
      title: 'Canonical Product Reference',
      type: 'reference',
      to: [{ type: 'product' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'bestSuitedRecipient',
      title: 'Best Suited Recipient',
      type: 'string',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'giftStyle',
      title: 'Gift Style / Vibe',
      type: 'string',
      validation: (Rule) => Rule.required().max(100),
    }),
    defineField({
      name: 'practicalUsefulness',
      title: 'Practical Usefulness / Ritual',
      type: 'string',
      validation: (Rule) => Rule.required().max(140),
    }),
    defineField({
      name: 'personalizationOption',
      title: 'Personalization / Custom Touch',
      type: 'string',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'mainAppeal',
      title: 'Primary Standout Appeal',
      type: 'string',
      validation: (Rule) => Rule.required().max(140),
    }),
    defineField({
      name: 'keyConsideration',
      title: 'Key Consideration / Care Note',
      type: 'string',
      validation: (Rule) => Rule.required().max(140),
    }),
    defineField({
      name: 'bestOccasion',
      title: 'Best Occasion',
      type: 'string',
      validation: (Rule) => Rule.required().max(100),
    }),
  ],
  preview: {
    select: {
      title: 'product.title',
      recipient: 'bestSuitedRecipient',
      appeal: 'mainAppeal',
      media: 'product.images.0.asset',
    },
    prepare({ title, recipient, appeal, media }) {
      return {
        title: title || 'Comparison Product Row',
        subtitle: [recipient, appeal].filter(Boolean).join(' · '),
        media,
      };
    },
  },
});

export const guideComparisonObject = defineType({
  name: 'guideComparison',
  title: 'Guide Side-by-Side Product Comparison Table',
  type: 'object',
  description:
    'Optional structured comparison matrix helping readers compare the top gifts in this guide.',
  fields: [
    defineField({
      name: 'title',
      title: 'Comparison Section Heading',
      type: 'string',
      initialValue: 'At-a-Glance Gift Comparison',
      validation: (Rule) => Rule.optional().max(120),
    }),
    defineField({
      name: 'subtitle',
      title: 'Comparison Subtitle / Instructions',
      type: 'string',
      validation: (Rule) => Rule.optional().max(240),
    }),
    defineField({
      name: 'rows',
      title: 'Compared Products (Drag to Reorder)',
      type: 'array',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'guideComparisonRow' })],
      validation: (Rule) => Rule.required().min(2),
    }),
  ],
});

export const guideBuyingAdviceObject = defineType({
  name: 'guideBuyingAdvice',
  title: 'Editorial Buying Advice Pillar',
  type: 'object',
  description:
    'Actionable buying advice block explaining how to choose the right gift (used in Gift Guides and Editorial Discovery Hubs).',
  fields: [
    defineField({
      name: 'id',
      title: 'Advice Pillar ID',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heading',
      title: 'Advice Heading',
      type: 'string',
      description: 'E.g. "Why Daily Ritual Upgrades Beat One-Time Novelty".',
      validation: (Rule) => Rule.required().min(5).max(140),
    }),
    defineField({
      name: 'body',
      title: 'Advice Explanation',
      type: 'text',
      validation: (Rule) => Rule.required().min(20).max(650),
    }),
    defineField({
      name: 'expandablePrompt',
      title: 'Expandable Drawer Prompt (Optional)',
      type: 'string',
      description: 'Optional interactive toggle prompt (e.g. "How to add a personal note").',
      validation: (Rule) => Rule.optional().max(140),
    }),
    defineField({
      name: 'expandableDetails',
      title: 'Expandable Drawer Details (Optional)',
      type: 'text',
      validation: (Rule) => Rule.optional().max(500),
    }),
  ],
  preview: {
    select: {
      title: 'heading',
      subtitle: 'body',
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Buying Advice Pillar',
        subtitle: subtitle || '',
      };
    },
  },
});

export const guideFaqObject = defineType({
  name: 'guideFaq',
  title: 'Guide FAQ Question & Answer',
  type: 'object',
  description:
    'Frequently asked question rendered in `GuideFAQ.tsx` and emitted as Schema.org `FAQPage` structured data when valid.',
  fields: [
    defineField({
      name: 'id',
      title: 'FAQ Item ID',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
      validation: (Rule) => Rule.required().min(10).max(200),
    }),
    defineField({
      name: 'answer',
      title: 'Answer',
      type: 'text',
      validation: (Rule) => Rule.required().min(20).max(750),
    }),
    defineField({
      name: 'relatedProduct',
      title: 'Related Canonical Product (Optional)',
      type: 'reference',
      to: [{ type: 'product' }],
      description:
        'Optional product link displayed beneath the FAQ answer.',
      validation: (Rule) => Rule.optional(),
    }),
  ],
  preview: {
    select: {
      title: 'question',
      subtitle: 'answer',
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'FAQ Item',
        subtitle: subtitle || '',
      };
    },
  },
});
