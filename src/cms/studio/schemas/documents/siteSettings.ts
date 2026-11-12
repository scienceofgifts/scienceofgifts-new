/**
 * Science of Gifts — Global Site Settings Singleton Document Schema (`siteSettings`)
 *
 * Implements Section 12 (Site Settings Singleton):
 * - Manages publication identity, homepage featured content, editorial directory metadata,
 *   default social metadata, footer information, and relevant site configuration.
 * - Protected against creating multiple conflicting `siteSettings` documents via
 *   `singleton: true`, fixed document ID (`siteSettings`), and restricted `__experimental_actions`
 *   (`['update', 'publish']`).
 */

import { defineArrayMember, defineField, defineType } from '../../sanityCore';

export const SITE_SETTINGS_SINGLETON_ID = 'siteSettings';

export const siteSettingsDocument = defineType({
  name: 'siteSettings',
  title: 'Global Site Settings & Homepage Curation',
  type: 'document',
  icon: 'Settings',
  singleton: true,
  // Prevents creating duplicate siteSettings documents or deleting the singleton in Studio
  __experimental_actions: ['update', 'publish'],
  description:
    'Singleton configuration managing publication identity, homepage featured content, directory SEO metadata (/gift-guides/, /articles/, /gift-finder/), default social sharing fallbacks, and editorial footer copy.',
  groups: [
    {
      name: 'identity',
      title: '1. Publication Identity & Footer',
      description: 'Publication name, canonical origin, tagline, mission statement, and affiliate disclosures.',
      default: true,
    },
    {
      name: 'homepage',
      title: '2. Homepage Featured Content',
      description: 'Curated lead guide, featured stories, featured product spotlight, and homepage pull quote.',
    },
    {
      name: 'directorySeo',
      title: '3. Directory & Landing Page SEO',
      description: 'SEO metadata and deck copy for /gift-guides/, /articles/, and /gift-finder/.',
    },
    {
      name: 'socialDefaults',
      title: '4. Default Social & SEO Fallbacks',
      description: 'Default OpenGraph image and homepage SEO configuration.',
    },
  ],
  initialValue: {
    siteName: 'Science of Gifts',
    siteOrigin: 'https://www.scienceofgifts.com',
    tagline: 'Editorial Gift Guides & Behavioral Discovery',
    defaultAffiliateDisclosure:
      'Science of Gifts is an independent editorial publication. When you purchase through links in our guides, we may earn an affiliate commission or revenue from our shop at no extra cost to you.',
  },
  fields: [
    // =========================================================================
    // GROUP 1: PUBLICATION IDENTITY & FOOTER
    // =========================================================================
    defineField({
      name: 'siteName',
      title: 'Publication Name',
      type: 'string',
      group: 'identity',
      initialValue: 'Science of Gifts',
      validation: (Rule) => Rule.required().min(3).max(80),
    }),
    defineField({
      name: 'siteOrigin',
      title: 'Canonical Site Origin (HTTPS)',
      type: 'url',
      group: 'identity',
      initialValue: 'https://www.scienceofgifts.com',
      description:
        'Must remain https://www.scienceofgifts.com in production.',
      validation: (Rule) =>
        Rule.required().uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'tagline',
      title: 'Publication Tagline',
      type: 'string',
      group: 'identity',
      validation: (Rule) => Rule.required().max(140),
    }),
    defineField({
      name: 'editorialMissionStatement',
      title: 'Footer Editorial Mission Summary',
      type: 'text',
      group: 'identity',
      description:
        'Displayed in the publication footer and About summary blocks.',
      validation: (Rule) => Rule.optional().max(420),
    }),
    defineField({
      name: 'defaultAffiliateDisclosure',
      title: 'Default Affiliate & Shop Disclosure Text',
      type: 'text',
      group: 'identity',
      validation: (Rule) => Rule.required().min(20).max(500),
    }),
    defineField({
      name: 'footerCopyrightNotice',
      title: 'Footer Copyright / Colophon Line (Optional)',
      type: 'string',
      group: 'identity',
      validation: (Rule) => Rule.optional().max(160),
    }),
    defineField({
      name: 'shopExternalUrl',
      title: 'Fourthwall Shop Storefront URL',
      type: 'url',
      group: 'identity',
      initialValue: 'https://shop.scienceofgifts.com',
      validation: (Rule) => Rule.optional().uri({ scheme: ['https'] }),
    }),

    // =========================================================================
    // GROUP 2: HOMEPAGE FEATURED CONTENT
    // =========================================================================
    defineField({
      name: 'homepageHeroKicker',
      title: 'Homepage Hero Eyebrow Kicker',
      type: 'string',
      group: 'homepage',
      initialValue: 'Behavioral Gifting & Tactile Craft',
      validation: (Rule) => Rule.optional().max(90),
    }),
    defineField({
      name: 'homepageHeroTitle',
      title: 'Homepage H1 Headline (Optional Override)',
      type: 'string',
      group: 'homepage',
      validation: (Rule) => Rule.optional().max(140),
    }),
    defineField({
      name: 'homepageHeroSubtitle',
      title: 'Homepage Hero Lead Paragraph (Optional Override)',
      type: 'text',
      group: 'homepage',
      validation: (Rule) => Rule.optional().max(340),
    }),
    defineField({
      name: 'homepageFeaturedProduct',
      title: 'Homepage Spotlight Product Reference',
      type: 'reference',
      group: 'homepage',
      to: [{ type: 'product' }],
      description:
        'Replaces the hardcoded product ID on the homepage with a curated canonical product reference.',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'homepageFeaturedGuides',
      title: 'Homepage Featured Gift Guides (Drag to Reorder)',
      type: 'array',
      group: 'homepage',
      options: { sortable: true },
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'giftGuide' }],
        }),
      ],
      validation: (Rule) => Rule.optional().unique(),
    }),
    defineField({
      name: 'homepageFeaturedArticles',
      title: 'Homepage Featured Behavioral Stories (Drag to Reorder)',
      type: 'array',
      group: 'homepage',
      options: { sortable: true },
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'article' }],
        }),
      ],
      validation: (Rule) => Rule.optional().unique(),
    }),
    defineField({
      name: 'homepagePullQuote',
      title: 'Homepage Editorial Pull Quote (Optional)',
      type: 'articlePullQuote',
      group: 'homepage',
      validation: (Rule) => Rule.optional(),
    }),

    // =========================================================================
    // GROUP 3: DIRECTORY & LANDING PAGE SEO
    // =========================================================================
    defineField({
      name: 'directorySeoEntries',
      title: 'Top-Level Directory SEO Entries (/gift-guides/, /articles/, /gift-finder/)',
      type: 'array',
      group: 'directorySeo',
      description:
        'Manages H1 headings, subtitles, and SEO metadata for the main directory and Gift Finder landing pages.',
      of: [defineArrayMember({ type: 'directorySeoEntry' })],
      validation: (Rule) => Rule.optional(),
    }),

    // =========================================================================
    // GROUP 4: DEFAULT SOCIAL & SEO FALLBACKS
    // =========================================================================
    defineField({
      name: 'defaultOgImageUrl',
      title: 'Default Social Share Image URL (og:image Fallback)',
      type: 'url',
      group: 'socialDefaults',
      validation: (Rule) => Rule.optional().uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'homepageSeo',
      title: 'Homepage (/) SEO Metadata',
      type: 'seoMetadata',
      group: 'socialDefaults',
      validation: (Rule) => Rule.optional(),
    }),
  ],
  preview: {
    select: {
      title: 'siteName',
      subtitle: 'siteOrigin',
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Science of Gifts — Site Settings',
        subtitle: `${subtitle || 'https://www.scienceofgifts.com'} (Singleton Configuration)`,
      };
    },
  },
});
