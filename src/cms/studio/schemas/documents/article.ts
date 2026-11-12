/**
 * Science of Gifts — Editorial Article Document Schema (`article`)
 *
 * Implements Section 6 (Article Editing Experience) & Section 7 (Taxonomy Consistency):
 * - Uses the exact `ArticleTopicId` taxonomy values (`gift-giving-psychology`, `relationships`,
 *   `decision-making`, `gift-etiquette`, `practical-gifting-advice`, `culture`) matching
 *   `src/types/content.ts` and `/articles/topics/[slug]/` routes.
 * - Preserves 100% compatibility with inline `[cite:cit_id]` citations and `citationNavigation.ts`
 *   while also supporting Portable Text with `citationAnnotation` references via `portableTextSerializer.ts`.
 */

import { defineArrayMember, defineField, defineType } from '../../sanityCore';
import {
  ARTICLE_TOPIC_OPTIONS,
  INTEREST_OPTIONS,
  OCCASION_OPTIONS,
  RECIPIENT_OPTIONS,
} from '../../taxonomyRegistry';
import { evaluateEditorialDocumentLifecycle } from '../../publicationWorkflow';

export const articleDocument = defineType({
  name: 'article',
  title: 'Story / Editorial Article',
  type: 'document',
  icon: 'FileText',
  description:
    'Research-backed behavioral psychology essay or gifting etiquette story with executive summary takeaways, structured H2/H3 sections, academic citations, pull quotes, comparison tables, and inline product recommendations.',
  groups: [
    {
      name: 'headlineAndHero',
      title: '1. Headline, Author & Hero',
      description: 'H1 headline, deck subtitle, author, publication dates, hero image, and key takeaways.',
      default: true,
    },
    {
      name: 'bodyAndCitations',
      title: '2. Long-Form Sections, Citations & Tables',
      description: 'Structured H2/H3 sections, Portable Text / [cite:cit_id] paragraphs, comparison table, and ordered bibliography references.',
    },
    {
      name: 'taxonomyAndRelated',
      title: '3. Topics, Taxonomy & Related Content',
      description: 'Canonical article topics, recipients, occasions, and related guides/articles.',
    },
    {
      name: 'seoPublishing',
      title: '4. SEO & Publishing',
      description: 'Publication status, featured story toggle, and SEO metadata.',
    },
  ],
  initialValue: {
    status: 'draft',
    featured: false,
    summaryTitle: 'The Short Version',
  },
  fields: [
    // =========================================================================
    // GROUP 1: HEADLINE, AUTHOR & HERO
    // =========================================================================
    defineField({
      name: 'title',
      title: 'Article Headline (On-Page H1)',
      type: 'string',
      group: 'headlineAndHero',
      description:
        'Visible H1 headline (decoupled from the HTML <title> tag in the SEO tab).',
      validation: (Rule) => Rule.required().min(10).max(130),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug (/articles/[slug]/)',
      type: 'slug',
      group: 'headlineAndHero',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) =>
        Rule.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
          name: 'kebab-case URL slug',
        }),
    }),
    defineField({
      name: 'id',
      title: 'Canonical Article ID (Immutable After Creation)',
      type: 'string',
      group: 'headlineAndHero',
      description:
        'Stable identifier (e.g. "art_price_vs_thoughtfulness_2026"). Locked once saved.',
      readOnly: ({ document, value }) =>
        Boolean(value && document && (document._createdAt || document._rev)),
      validation: (Rule) =>
        Rule.required().regex(/^art_[a-z0-9_]+$/, {
          name: 'art_<snake_case_id>',
        }),
    }),
    defineField({
      name: 'subtitle',
      title: 'Editorial Deck / Standfirst',
      type: 'text',
      group: 'headlineAndHero',
      validation: (Rule) => Rule.required().min(20).max(280),
    }),
    defineField({
      name: 'category',
      title: 'Editorial Section Label',
      type: 'string',
      group: 'headlineAndHero',
      initialValue: 'Behavioral Psychology',
      options: {
        list: [
          { title: 'Behavioral Psychology', value: 'Behavioral Psychology' },
          { title: 'Modern Etiquette & Hosting', value: 'Modern Etiquette & Hosting' },
          { title: 'Relationship Dynamics', value: 'Relationship Dynamics' },
          { title: 'Material Craft & Rituals', value: 'Material Craft & Rituals' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      group: 'headlineAndHero',
      to: [{ type: 'author' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Publication Date',
      type: 'date',
      group: 'headlineAndHero',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'updatedAt',
      title: 'Last Updated Date (Optional)',
      type: 'date',
      group: 'headlineAndHero',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'readTimeMinutes',
      title: 'Reading Time Override (Minutes, Optional)',
      type: 'number',
      group: 'headlineAndHero',
      description:
        'Automatically calculated from word count if left blank.',
      validation: (Rule) => Rule.optional().min(1).max(45).integer(),
    }),
    defineField({
      name: 'heroImage',
      title: 'Article Hero Photograph, Alt Text & Caption',
      type: 'editorialImage',
      group: 'headlineAndHero',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'summaryTitle',
      title: 'Key Takeaways Box Heading',
      type: 'string',
      group: 'headlineAndHero',
      initialValue: 'The Short Version',
      validation: (Rule) => Rule.optional().max(80),
    }),
    defineField({
      name: 'executiveSummary',
      title: 'Executive Summary / Key Takeaways (2–5 Bullets)',
      type: 'array',
      group: 'headlineAndHero',
      description:
        'Scannable research takeaways rendered at the top of the article.',
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.required().min(2).max(5),
    }),

    // =========================================================================
    // GROUP 2: LONG-FORM SECTIONS, CITATIONS & TABLES
    // =========================================================================
    defineField({
      name: 'sections',
      title: 'Ordered Article Sections (Drag to Reorder)',
      type: 'array',
      group: 'bodyAndCitations',
      description:
        'Each section generates an H2 heading in the Table of Contents and supports structured paragraphs (with `[cite:cit_id]` markers) or Portable Text with `citationAnnotation` marks, H3 subsections, pull quotes, callouts, expandable checklists, and inline product recommendations.',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'articleContentSection' })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'comparisonTable',
      title: 'Empirical / Practical Comparison Table (Optional)',
      type: 'articleComparisonTable',
      group: 'bodyAndCitations',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'citations',
      title: 'Ordered Research Bibliography References',
      type: 'array',
      group: 'bodyAndCitations',
      description:
        'Select the verified `researchCitation` records cited in this article. Inline citations (`[cite:cit_id]`) are automatically numbered [1], [2], [3] in order of first appearance by `citationNavigation.ts`.',
      options: { sortable: true },
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'researchCitation' }],
        }),
      ],
      validation: (Rule) => Rule.required().min(1).unique(),
    }),

    // =========================================================================
    // GROUP 3: TOPICS, TAXONOMY & RELATED CONTENT
    // =========================================================================
    defineField({
      name: 'topics',
      title: 'Canonical Article Topics (/articles/topics/[slug]/)',
      type: 'array',
      group: 'taxonomyAndRelated',
      description:
        'Controlled topic IDs aligned with `ArticleTopicId` in `src/types/content.ts` and `/articles/topics/[slug]/` routes.',
      of: [defineArrayMember({ type: 'string' })],
      options: {
        list: ARTICLE_TOPIC_OPTIONS,
      },
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'recipients',
      title: 'Related Recipient Archetypes (Optional)',
      type: 'array',
      group: 'taxonomyAndRelated',
      of: [defineArrayMember({ type: 'string' })],
      options: {
        list: RECIPIENT_OPTIONS,
      },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'occasions',
      title: 'Related Occasions (Optional)',
      type: 'array',
      group: 'taxonomyAndRelated',
      of: [defineArrayMember({ type: 'string' })],
      options: {
        list: OCCASION_OPTIONS,
      },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'interests',
      title: 'Related Interests (Optional)',
      type: 'array',
      group: 'taxonomyAndRelated',
      of: [defineArrayMember({ type: 'string' })],
      options: {
        list: INTEREST_OPTIONS,
      },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'relatedGuides',
      title: 'Related Gift Guides',
      type: 'array',
      group: 'taxonomyAndRelated',
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
      title: 'Related Editorial Stories',
      type: 'array',
      group: 'taxonomyAndRelated',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'article' }],
        }),
      ],
      validation: (Rule) => Rule.optional().unique(),
    }),

    // =========================================================================
    // GROUP 4: SEO & PUBLISHING
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
      title: 'Feature in Stories Directory Lead Slot',
      type: 'boolean',
      group: 'seoPublishing',
      initialValue: false,
      validation: (Rule) => Rule.optional(),
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
      return true;
    }),
  orderings: [
    {
      title: 'Publication Date (Newest First)',
      name: 'publishedDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
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
      publishedAt: 'publishedAt',
      media: 'heroImage.asset',
    },
    prepare({ title, status, category, publishedAt, media }) {
      const badge = status === 'published' ? 'PUBLISHED' : 'DRAFT';
      return {
        title: title || 'Untitled Story',
        subtitle: `[${badge}] ${category || 'Story'}${publishedAt ? ` · ${publishedAt}` : ''}`,
        media,
      };
    },
  },
});
