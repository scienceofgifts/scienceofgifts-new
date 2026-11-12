/**
 * Science of Gifts — Gift Guide Document Schema (`giftGuide`)
 *
 * Implements Section 5 (Gift Guide Editing Experience):
 * - Allows editors to create and manage complete Gift Guides without entering manual product IDs.
 * - Uses searchable `reference` fields to canonical `product` records for Editor's Pick,
 *   Quick Picks, Recipient Pathways, Ordered Sections, Comparisons, and FAQs.
 * - Preserves independent guide-specific commentary on every recommendation.
 * - Supports intuitive drag-and-drop ordering (`sortable: true`) for sections and recommendations.
 */

import { defineArrayMember, defineField, defineType } from '../../sanityCore';
import {
  ALL_BUDGET_TIER_OPTIONS,
  GUIDE_ACCENT_TONE_OPTIONS,
  INTEREST_OPTIONS,
  OCCASION_OPTIONS,
  PERSONALITY_TRAIT_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  RECIPIENT_OPTIONS,
} from '../../taxonomyRegistry';
import { evaluateEditorialDocumentLifecycle } from '../../publicationWorkflow';

export const giftGuideDocument = defineType({
  name: 'giftGuide',
  title: 'Gift Guide',
  type: 'document',
  icon: 'BookOpen',
  description:
    'Curated editorial gift guide combining an Editor’s Pick, Quick Picks, Recipient Pathways, ordered product sections with guide-specific commentary, Curator’s Notes, comparison tables, buying advice, and FAQs.',
  groups: [
    {
      name: 'overview',
      title: '1. Headline, Intro & Hero',
      description: 'Title, URL slug, issue number, author, hero image, introduction, and who this guide is for.',
      default: true,
    },
    {
      name: 'picksAndSections',
      title: '2. Picks & Product Sections',
      description: 'Editor’s Pick, Quick Picks, Recipient Pathways, ordered recommendation sections, and Curator’s Notes.',
    },
    {
      name: 'adviceAndComparison',
      title: '3. Comparisons, Buying Advice & FAQs',
      description: 'Side-by-side product comparison matrix, how-to-choose buying advice, and structured FAQs.',
    },
    {
      name: 'discoveryAndRelated',
      title: '4. Taxonomy & Related Content',
      description: 'Recipients, occasions, interests, personality traits, budget tiers, related guides/articles, and citations.',
    },
    {
      name: 'seoPublishing',
      title: '5. SEO & Publishing',
      description: 'Publication status, featured directory toggle, affiliate disclosure, and SEO metadata.',
    },
  ],
  initialValue: {
    status: 'draft',
    featured: false,
    accentTone: 'mint',
    readTimeMinutes: 8,
    affiliateDisclosure:
      'Science of Gifts is an independent editorial publication. We select every item based on behavioral research and tactile craft; when you buy through our links, we may earn an affiliate commission or revenue from our shop at no extra cost to you.',
  },
  fields: [
    // =========================================================================
    // GROUP 1: HEADLINE, INTRO & HERO
    // =========================================================================
    defineField({
      name: 'title',
      title: 'Guide Title (On-Page H1)',
      type: 'string',
      group: 'overview',
      description:
        'Visible H1 headline (decoupled from the SEO <title> tag).',
      validation: (Rule) => Rule.required().min(10).max(120),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug (/gift-guides/[slug]/)',
      type: 'slug',
      group: 'overview',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) =>
        Rule.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
          name: 'kebab-case URL slug',
        }),
    }),
    defineField({
      name: 'id',
      title: 'Canonical Guide ID (Immutable After Creation)',
      type: 'string',
      group: 'overview',
      description:
        'Stable identifier (e.g. "guide_little_things_2026"). Locked once saved to preserve cross-references.',
      readOnly: ({ document, value }) =>
        Boolean(value && document && (document._createdAt || document._rev)),
      validation: (Rule) =>
        Rule.required().regex(/^guide_[a-z0-9_]+$/, {
          name: 'guide_<snake_case_id>',
        }),
    }),
    defineField({
      name: 'subtitle',
      title: 'Editorial Deck / Subtitle',
      type: 'text',
      group: 'overview',
      description:
        'Standfirst summary displayed beneath the H1 and on Gift Guide directory cards.',
      validation: (Rule) => Rule.required().min(20).max(280),
    }),
    defineField({
      name: 'editorialIssueNumber',
      title: 'Editorial Issue / Guide Kicker (Optional)',
      type: 'string',
      group: 'overview',
      description: 'E.g. "Guide No. 01 · Everyday Rituals".',
      validation: (Rule) => Rule.optional().max(80),
    }),
    defineField({
      name: 'curationSummary',
      title: 'Curation Methodology Summary Line (Optional)',
      type: 'string',
      group: 'overview',
      description:
        'E.g. "10 lasting objects and small-batch consumables evaluated across 40+ makers".',
      validation: (Rule) => Rule.optional().max(180),
    }),
    defineField({
      name: 'author',
      title: 'Lead Author / Curator',
      type: 'reference',
      group: 'overview',
      to: [{ type: 'author' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Original Publication Date',
      type: 'date',
      group: 'overview',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'updatedAt',
      title: 'Last Reviewed / Updated Date',
      type: 'date',
      group: 'overview',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'readTimeMinutes',
      title: 'Estimated Reading Time (Minutes)',
      type: 'number',
      group: 'overview',
      initialValue: 8,
      validation: (Rule) => Rule.required().min(1).max(45).integer(),
    }),
    defineField({
      name: 'accentTone',
      title: 'Editorial Hero Accent Tone',
      type: 'string',
      group: 'overview',
      initialValue: 'mint',
      options: {
        list: GUIDE_ACCENT_TONE_OPTIONS,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heroImage',
      title: 'Guide Hero Photograph',
      type: 'editorialImage',
      group: 'overview',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'introParagraphs',
      title: 'Editorial Introduction Paragraphs',
      type: 'array',
      group: 'overview',
      description:
        '1–4 framing paragraphs explaining the behavioral philosophy behind this guide’s selections.',
      of: [defineArrayMember({ type: 'text' })],
      validation: (Rule) => Rule.required().min(1).max(6),
    }),
    defineField({
      name: 'whoThisGuideIsFor',
      title: 'Who This Guide Is For (Bullet Summary)',
      type: 'array',
      group: 'overview',
      description:
        '2–5 scannable bullets helping readers confirm they are in the right guide.',
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.optional().min(2).max(5),
    }),

    // =========================================================================
    // GROUP 2: PICKS & PRODUCT SECTIONS
    // =========================================================================
    defineField({
      name: 'editorsPick',
      title: 'Featured Editor’s Pick (Top Callout)',
      type: 'guideEditorsPick',
      group: 'picksAndSections',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'quickPicks',
      title: 'At-a-Glance Quick Picks (Drag to Reorder)',
      type: 'array',
      group: 'picksAndSections',
      description:
        '3–8 superlative quick picks linking directly to canonical products and section anchors.',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'guideQuickPick' })],
      validation: (Rule) => Rule.required().min(2).max(8),
    }),
    defineField({
      name: 'recipientPathways',
      title: 'Shop by Recipient Persona Pathways (Optional)',
      type: 'array',
      group: 'picksAndSections',
      description:
        'Optional persona cards helping readers jump to the best gifts for specific personalities within this guide.',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'guideRecipientPathway' })],
      validation: (Rule) => Rule.optional().max(6),
    }),
    defineField({
      name: 'sections',
      title: 'Ordered Recommendation Sections (Drag to Reorder Sections & Products)',
      type: 'array',
      group: 'picksAndSections',
      description:
        'Add thematic or budget sections, select canonical products via searchable references, write guide-specific commentary, and drag-and-drop to reorder.',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'guideSection' })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'curatorNotes',
      title: 'Standalone Curator’s Notes (Optional)',
      type: 'array',
      group: 'picksAndSections',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'guideCuratorNote' })],
      validation: (Rule) => Rule.optional(),
    }),

    // =========================================================================
    // GROUP 3: COMPARISONS, BUYING ADVICE & FAQS
    // =========================================================================
    defineField({
      name: 'comparison',
      title: 'Side-by-Side Gift Comparison Table (Optional)',
      type: 'guideComparison',
      group: 'adviceAndComparison',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'buyingAdviceIntro',
      title: 'Buying Advice Section Lead-In (Optional)',
      type: 'text',
      group: 'adviceAndComparison',
      validation: (Rule) => Rule.optional().max(400),
    }),
    defineField({
      name: 'buyingAdvice',
      title: 'How to Choose / Buying Advice Pillars (Drag to Reorder)',
      type: 'array',
      group: 'adviceAndComparison',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'guideBuyingAdvice' })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'faqs',
      title: 'Frequently Asked Questions (Emits Schema.org FAQPage JSON-LD)',
      type: 'array',
      group: 'adviceAndComparison',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'guideFaq' })],
      validation: (Rule) => Rule.optional(),
    }),

    // =========================================================================
    // GROUP 4: TAXONOMY & RELATED CONTENT
    // =========================================================================
    defineField({
      name: 'category',
      title: 'Primary Guide Category Label',
      type: 'string',
      group: 'discoveryAndRelated',
      description:
        'E.g. "Everyday Rituals & Under $100" or "Hosting & Gatherings".',
      options: {
        list: [
          ...PRODUCT_CATEGORY_OPTIONS,
          { title: 'Everyday Rituals & Under $100', value: 'Everyday Rituals & Under $100' },
          { title: 'Hosting & Gatherings', value: 'Hosting & Gatherings' },
          { title: 'Recipient & Milestone Guides', value: 'Recipient & Milestone Guides' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'recipients',
      title: 'Recipients Covered',
      type: 'array',
      group: 'discoveryAndRelated',
      description:
        'Includes this guide on matching `/gift-guides/recipients/[slug]/` archive pages.',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: RECIPIENT_OPTIONS },
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'occasions',
      title: 'Occasions Covered',
      type: 'array',
      group: 'discoveryAndRelated',
      description:
        'Includes this guide on matching `/gift-guides/occasions/[slug]/` archive pages.',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: OCCASION_OPTIONS },
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'interests',
      title: 'Interests Covered',
      type: 'array',
      group: 'discoveryAndRelated',
      description:
        'Includes this guide on matching `/gift-guides/interests/[slug]/` archive pages.',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: INTEREST_OPTIONS },
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'personalityTraits',
      title: 'Personality & Gift Style Archetypes Covered',
      type: 'array',
      group: 'discoveryAndRelated',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: PERSONALITY_TRAIT_OPTIONS },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'budgetTiers',
      title: 'Budget Tiers Covered',
      type: 'array',
      group: 'discoveryAndRelated',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: ALL_BUDGET_TIER_OPTIONS },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'topics',
      title: 'Additional Editorial Theme Tags (Optional)',
      type: 'array',
      group: 'discoveryAndRelated',
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'relatedGuides',
      title: 'Related Gift Guides',
      type: 'array',
      group: 'discoveryAndRelated',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'giftGuide' }],
        }),
      ],
      validation: (Rule) => Rule.optional().unique(),
    }),
    defineField({
      name: 'relatedArticles',
      title: 'Related Editorial Stories & Articles',
      type: 'array',
      group: 'discoveryAndRelated',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'article' }],
        }),
      ],
      validation: (Rule) => Rule.optional().unique(),
    }),
    defineField({
      name: 'citations',
      title: 'Referenced Research Citations',
      type: 'array',
      group: 'discoveryAndRelated',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'researchCitation' }],
        }),
      ],
      validation: (Rule) => Rule.optional().unique(),
    }),

    // =========================================================================
    // GROUP 5: SEO & PUBLISHING
    // =========================================================================
    defineField({
      name: 'status',
      title: 'Publication Status',
      type: 'string',
      group: 'seoPublishing',
      initialValue: 'draft',
      options: {
        list: [
          { title: 'Draft — In Editorial Progress (draft)', value: 'draft' },
          { title: 'Published — Live on Site (published)', value: 'published' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'featured',
      title: 'Feature in Gift Guides Directory Lead Slot',
      type: 'boolean',
      group: 'seoPublishing',
      initialValue: false,
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'affiliateDisclosure',
      title: 'Affiliate & Editorial Independence Disclosure Copy',
      type: 'text',
      group: 'seoPublishing',
      validation: (Rule) => Rule.required().min(20),
    }),
    defineField({
      name: 'seo',
      title: 'SEO, Canonical URL & Social Sharing Metadata',
      type: 'seoMetadata',
      group: 'seoPublishing',
      validation: (Rule) => Rule.required(),
    }),
  ],
  validation: (Rule) =>
    Rule.custom((doc: Record<string, any> | undefined) => {
      if (!doc) return true;
      const lifecycle = evaluateEditorialDocumentLifecycle(doc);
      if (lifecycle.blockingErrors.length > 0) {
        return lifecycle.blockingErrors[0];
      }
      if (doc.status === 'published') {
        const sections = Array.isArray(doc.sections) ? doc.sections : [];
        if (sections.length === 0) {
          return 'A published Gift Guide must include at least one recommendation section.';
        }
      }
      return true;
    }),
  orderings: [
    {
      title: 'Last Updated (Newest First)',
      name: 'updatedDesc',
      by: [{ field: 'updatedAt', direction: 'desc' }],
    },
    {
      title: 'Title (A–Z)',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      status: 'status',
      category: 'category',
      updatedAt: 'updatedAt',
      sections: 'sections',
      media: 'heroImage.asset',
    },
    prepare({ title, status, category, updatedAt, sections, media }) {
      const secCount = Array.isArray(sections) ? sections.length : 0;
      const badge = status === 'published' ? 'PUBLISHED' : 'DRAFT';
      return {
        title: title || 'Untitled Gift Guide',
        subtitle: `[${badge}] ${category || 'Gift Guide'} · ${secCount} section${secCount === 1 ? '' : 's'}${updatedAt ? ` · Updated ${updatedAt}` : ''}`,
        media,
      };
    },
  },
});
