/**
 * Science of Gifts — Taxonomy Archive Document Schema (`taxonomyArchive`)
 *
 * Manages editorial headline, short label, description, intro copy, spotlight card,
 * and SEO metadata for all four archive dimensions:
 * 1. Recipient Categories (`/gift-guides/recipients/[slug]/`)
 * 2. Interests (`/gift-guides/interests/[slug]/`)
 * 3. Occasions (`/gift-guides/occasions/[slug]/`)
 * 4. Article Topics (`/articles/topics/[slug]/`)
 */

import { defineArrayMember, defineField, defineType } from '../../sanityCore';
import {
  ARTICLE_TOPIC_OPTIONS,
  INTEREST_SLUG_OPTIONS,
  OCCASION_OPTIONS,
  RECIPIENT_OPTIONS,
} from '../../taxonomyRegistry';

export const taxonomyArchiveDocument = defineType({
  name: 'taxonomyArchive',
  title: 'Category / Taxonomy Archive Page',
  type: 'document',
  icon: 'Tags',
  description:
    'Manages the editorial title, intro description, icon, spotlight card, and SEO overrides for Recipient, Interest, Occasion, and Article Topic archive pages.',
  groups: [
    {
      name: 'identityAndCopy',
      title: '1. Classification & Editorial Copy',
      default: true,
    },
    {
      name: 'curationAndSpotlight',
      title: '2. Featured Spotlight & Pinned Content',
    },
    {
      name: 'seoPublishing',
      title: '3. SEO & Publishing',
    },
  ],
  initialValue: {
    status: 'published',
    dimension: 'recipient',
  },
  fields: [
    defineField({
      name: 'dimension',
      title: 'Archive Taxonomy Dimension',
      type: 'string',
      group: 'identityAndCopy',
      options: {
        list: [
          { title: 'Recipient Category (/gift-guides/recipients/[slug]/)', value: 'recipient' },
          { title: 'Interest Category (/gift-guides/interests/[slug]/)', value: 'interest' },
          { title: 'Occasion Category (/gift-guides/occasions/[slug]/)', value: 'occasion' },
          { title: 'Article Topic (/articles/topics/[slug]/)', value: 'article-topic' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'taxonomyKey',
      title: 'Controlled Taxonomy Key / Slug',
      type: 'string',
      group: 'identityAndCopy',
      description:
        'Must match one of the canonical recipient, interest, occasion, or article-topic keys (e.g. "partner", "parent", "coffee-and-tea", "birthday", "gift-giving-psychology").',
      options: {
        list: [
          ...RECIPIENT_OPTIONS,
          ...INTEREST_SLUG_OPTIONS,
          ...OCCASION_OPTIONS,
          ...ARTICLE_TOPIC_OPTIONS,
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'routePath',
      title: 'Canonical Archive Route Path',
      type: 'string',
      group: 'identityAndCopy',
      description:
        'E.g. "/gift-guides/recipients/parent/" or "/articles/topics/gift-giving-psychology/".',
      validation: (Rule) =>
        Rule.required().regex(
          /^\/(gift-guides\/(recipients|interests|occasions)|articles\/topics)\/[a-z0-9-]+\/$/,
          { name: 'canonical archive route path' }
        ),
    }),
    defineField({
      name: 'label',
      title: 'Archive Title / H1 Label',
      type: 'string',
      group: 'identityAndCopy',
      description: 'E.g. "Parents & In-Laws" or "Gift-Giving Psychology".',
      validation: (Rule) => Rule.required().min(2).max(90),
    }),
    defineField({
      name: 'shortLabel',
      title: 'Short Navigation Label (Optional)',
      type: 'string',
      group: 'identityAndCopy',
      description: 'E.g. "Parents" or "Hosts".',
      validation: (Rule) => Rule.optional().max(45),
    }),
    defineField({
      name: 'description',
      title: 'Archive Lead Description',
      type: 'text',
      group: 'identityAndCopy',
      description:
        'Displayed in the archive header and on directory category cards.',
      validation: (Rule) => Rule.required().min(20).max(320),
    }),
    defineField({
      name: 'editorialIntroParagraphs',
      title: 'Extended Archive Intro Paragraphs (Optional)',
      type: 'array',
      group: 'identityAndCopy',
      of: [defineArrayMember({ type: 'text' })],
      validation: (Rule) => Rule.optional().max(3),
    }),
    defineField({
      name: 'spotlight',
      title: 'Recipient / Category Spotlight Card (Optional)',
      type: 'recipientSpotlight',
      group: 'curationAndSpotlight',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'pinnedGuides',
      title: 'Pinned Gift Guides (Optional)',
      type: 'array',
      group: 'curationAndSpotlight',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'giftGuide' }],
        }),
      ],
      validation: (Rule) => Rule.optional().unique(),
    }),
    defineField({
      name: 'pinnedProducts',
      title: 'Pinned Canonical Products (Optional)',
      type: 'array',
      group: 'curationAndSpotlight',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'product' }],
        }),
      ],
      validation: (Rule) => Rule.optional().unique(),
    }),
    defineField({
      name: 'status',
      title: 'Publication Status',
      type: 'string',
      group: 'seoPublishing',
      initialValue: 'published',
      options: {
        list: [
          { title: 'Published (published)', value: 'published' },
          { title: 'Draft (draft)', value: 'draft' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'seo',
      title: 'Archive SEO Metadata Override (Optional)',
      type: 'seoMetadata',
      group: 'seoPublishing',
      validation: (Rule) => Rule.optional(),
    }),
  ],
  orderings: [
    {
      title: 'Dimension & Label',
      name: 'dimensionLabelAsc',
      by: [
        { field: 'dimension', direction: 'asc' },
        { field: 'label', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: {
      title: 'label',
      dimension: 'dimension',
      routePath: 'routePath',
      description: 'description',
    },
    prepare({ title, dimension, routePath, description }) {
      const dimLabel =
        dimension === 'recipient'
          ? 'Recipient'
          : dimension === 'interest'
          ? 'Interest'
          : dimension === 'occasion'
          ? 'Occasion'
          : dimension === 'article-topic'
          ? 'Article Topic'
          : 'Archive';
      return {
        title: `${title || 'Untitled Archive'} [${dimLabel}]`,
        subtitle: routePath ? `${routePath} — ${description || ''}` : description || '',
      };
    },
  },
});
