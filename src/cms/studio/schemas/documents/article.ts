import { defineArrayMember, defineField, defineType } from '../../sanityCore';
import {
  ARTICLE_CATEGORY_OPTIONS,
  ARTICLE_TOPIC_OPTIONS,
  OCCASION_OPTIONS,
  RECIPIENT_OPTIONS,
} from '../../taxonomyRegistry';
import { ARTICLE_PORTABLE_TEXT_MEMBERS } from '../objects/articleObjects';

export const articleDocument = defineType({
  name: 'article',
  title: 'Editorial Article (Story)',
  type: 'document',
  groups: [
    { name: 'editorial', title: 'Editorial & Story Copy', default: true },
    { name: 'body', title: 'Article Body & Sections' },
    { name: 'research', title: 'Citations & Related Content' },
    { name: 'taxonomy', title: 'Topics & Taxonomy' },
    { name: 'publishing', title: 'Publication & SEO' },
  ],
  fields: [
    defineField({
      name: 'id',
      title: 'Canonical Article ID',
      type: 'string',
      group: 'editorial',
      description: 'Immutable canonical identifier (e.g., `art_science_of_thoughtful_gifting_2026`).',
      initialValue: () => `art_story_${Date.now().toString(36)}`,
      validation: (Rule) =>
        Rule.required()
          .regex(/^art_[a-z0-9_]+$/)
          .error('Article ID must start with "art_"'),
    }),
    defineField({
      name: 'title',
      title: 'Article Title (On-Page H1)',
      type: 'string',
      group: 'editorial',
      validation: (Rule) => Rule.required().min(8).max(160),
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle / Editorial Dek (Excerpt)',
      type: 'text',
      rows: 3,
      group: 'editorial',
      description:
        'Editorial subtitle and article excerpt displayed below the title and in directory cards.',
      validation: (Rule) => Rule.required().min(20).max(420),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug (`/articles/[slug]/`)',
      type: 'slug',
      group: 'editorial',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Publication Lifecycle State',
      type: 'string',
      group: 'publishing',
      initialValue: 'draft',
      options: {
        list: [
          { title: 'Draft (Preview Only — Excluded from Public Build)', value: 'draft' },
          { title: 'Published (Approved for Public Website)', value: 'published' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'featured',
      title: 'Featured Lead Story on `/articles/`',
      type: 'boolean',
      group: 'publishing',
      initialValue: false,
    }),
    defineField({
      name: 'category',
      title: 'Primary Editorial Category Label',
      type: 'string',
      group: 'taxonomy',
      initialValue: 'Gift-Giving Psychology',
      options: {
        list: [...ARTICLE_CATEGORY_OPTIONS],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'topics',
      title: 'Article Topic Archives (`/articles/topics/[topic]/`)',
      type: 'array',
      group: 'taxonomy',
      initialValue: ['gift-giving-psychology'],
      of: [
        defineArrayMember({
          type: 'string',
          options: { list: [...ARTICLE_TOPIC_OPTIONS] },
        }),
      ],
      validation: (Rule) => Rule.required().min(1).unique(),
    }),
    defineField({
      name: 'recipients',
      title: 'Relevant Recipients (Optional Cross-Linking)',
      type: 'array',
      group: 'taxonomy',
      of: [
        defineArrayMember({
          type: 'string',
          options: { list: [...RECIPIENT_OPTIONS] },
        }),
      ],
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: 'occasions',
      title: 'Relevant Occasions (Optional Cross-Linking)',
      type: 'array',
      group: 'taxonomy',
      of: [
        defineArrayMember({
          type: 'string',
          options: { list: [...OCCASION_OPTIONS] },
        }),
      ],
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: 'author',
      title: 'Article Author',
      type: 'reference',
      group: 'editorial',
      to: [{ type: 'author' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Original Publication Date (ISO YYYY-MM-DD)',
      type: 'date',
      group: 'publishing',
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'updatedAt',
      title: 'Last Updated Date (ISO YYYY-MM-DD)',
      type: 'date',
      group: 'publishing',
    }),
    defineField({
      name: 'readTimeMinutes',
      title: 'Estimated Reading Time Override (Minutes)',
      type: 'number',
      group: 'editorial',
      validation: (Rule) => Rule.min(1).max(60),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Photograph & Caption',
      type: 'editorialImage',
      group: 'editorial',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'executiveSummary',
      title: 'Key Takeaways / Executive Summary Bullets',
      type: 'array',
      group: 'editorial',
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.required().min(2).max(6),
    }),
    defineField({
      name: 'pullQuote',
      title: 'Featured Pull Quote',
      type: 'articlePullQuote',
      group: 'editorial',
    }),
    defineField({
      name: 'bodyPortableText',
      title: 'Unified Rich-Text Article Body (Portable Text)',
      type: 'array',
      group: 'body',
      description:
        'Write and edit the entire article naturally using Sanity Portable Text (H2 section headings, H3 sub-headings, paragraphs, bold, italic, links, inline images with captions & alt text, citations, and editorial callouts). Automatically syncs with Article Body Sections below.',
      of: ARTICLE_PORTABLE_TEXT_MEMBERS,
    }),
    defineField({
      name: 'sections',
      title: 'Article Body Sections (Reorder, Insert & Delete Sections)',
      type: 'array',
      group: 'body',
      description:
        'Structured H2/H3 sections powering the sticky Table of Contents and rich-text article body. Drag to reorder, insert new sections, or delete sections.',
      of: [defineArrayMember({ type: 'articleContentSection' })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'citations',
      title: 'Referenced Research Citations',
      type: 'array',
      group: 'research',
      description:
        'Ordered list of academic or behavioral studies cited in this article. Maps to numbered badges [1], [2], etc.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'researchCitation' }],
        }),
      ],
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: 'relatedGuides',
      title: 'Related Gift Guides',
      type: 'array',
      group: 'research',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'giftGuide' }],
        }),
      ],
      validation: (Rule) => Rule.max(6).unique(),
    }),
    defineField({
      name: 'seo',
      title: 'SEO & Indexing Metadata',
      type: 'seoMetadata',
      group: 'publishing',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'category',
      status: 'status',
    },
  },
});

export const articleDocumentSchema = articleDocument;

