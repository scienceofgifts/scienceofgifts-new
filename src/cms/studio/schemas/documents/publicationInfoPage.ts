/**
 * Science of Gifts — Publication Information Page Document Schema (`publicationInfoPage`)
 *
 * Manages editorial and legal transparency pages rendered by `PublicationInfoPageView.tsx`:
 * - About Science of Gifts (`/about/`)
 * - Contact (`/contact/`)
 * - Editorial Policy (`/editorial-policy/`)
 * - Affiliate Disclosure (`/affiliate-disclosure/`)
 * - Privacy Policy (`/privacy-policy/`)
 * - Terms of Use (`/terms-of-use/`)
 */

import { defineArrayMember, defineField, defineType } from '../../sanityCore';

export const publicationInfoPageDocument = defineType({
  name: 'publicationInfoPage',
  title: 'Publication Information & Policy Page',
  type: 'document',
  icon: 'ShieldCheck',
  description:
    'Manages the structured sections, review dates, and SEO metadata for About, Contact, Editorial Policy, Affiliate Disclosure, Privacy Policy, and Terms of Use pages.',
  groups: [
    {
      name: 'headerAndContent',
      title: '1. Header & Structured Sections',
      default: true,
    },
    {
      name: 'seoPublishing',
      title: '2. SEO & Governance',
    },
  ],
  initialValue: {
    status: 'published',
  },
  fields: [
    defineField({
      name: 'slug',
      title: 'Page Slug',
      type: 'string',
      group: 'headerAndContent',
      options: {
        list: [
          { title: 'About Science of Gifts (about)', value: 'about' },
          { title: 'Contact (contact)', value: 'contact' },
          { title: 'Editorial Policy (editorial-policy)', value: 'editorial-policy' },
          { title: 'Affiliate Disclosure (affiliate-disclosure)', value: 'affiliate-disclosure' },
          { title: 'Privacy Policy (privacy-policy)', value: 'privacy-policy' },
          { title: 'Terms of Use (terms-of-use)', value: 'terms-of-use' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'currentPath',
      title: 'Canonical Route Path',
      type: 'string',
      group: 'headerAndContent',
      options: {
        list: [
          { title: '/about/', value: '/about/' },
          { title: '/contact/', value: '/contact/' },
          { title: '/editorial-policy/', value: '/editorial-policy/' },
          { title: '/affiliate-disclosure/', value: '/affiliate-disclosure/' },
          { title: '/privacy-policy/', value: '/privacy-policy/' },
          { title: '/terms-of-use/', value: '/terms-of-use/' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kicker',
      title: 'Eyebrow Kicker',
      type: 'string',
      group: 'headerAndContent',
      description: 'E.g. "The Publication · Editorial Independence & Methodology".',
      validation: (Rule) => Rule.required().max(100),
    }),
    defineField({
      name: 'title',
      title: 'Visible On-Page H1 Title',
      type: 'string',
      group: 'headerAndContent',
      validation: (Rule) => Rule.required().min(3).max(110),
    }),
    defineField({
      name: 'subtitle',
      title: 'Lead Subtitle Paragraph',
      type: 'text',
      group: 'headerAndContent',
      validation: (Rule) => Rule.required().min(20).max(360),
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last Reviewed Date Label',
      type: 'string',
      group: 'headerAndContent',
      description: 'E.g. "November 2026".',
      validation: (Rule) => Rule.optional().max(60),
    }),
    defineField({
      name: 'ownerReviewSummary',
      title: 'Owner / Legal Review Summary Callout (Optional)',
      type: 'text',
      group: 'headerAndContent',
      validation: (Rule) => Rule.optional().max(450),
    }),
    defineField({
      name: 'sections',
      title: 'Ordered Page Sections (Drag to Reorder)',
      type: 'array',
      group: 'headerAndContent',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'publicationInfoSection' })],
      validation: (Rule) => Rule.required().min(1),
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
      title: 'SEO Metadata',
      type: 'seoMetadata',
      group: 'seoPublishing',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      currentPath: 'currentPath',
      lastUpdated: 'lastUpdated',
    },
    prepare({ title, currentPath, lastUpdated }) {
      return {
        title: title || 'Publication Info Page',
        subtitle: `${currentPath || '/'}${lastUpdated ? ` · Reviewed ${lastUpdated}` : ''}`,
      };
    },
  },
});
