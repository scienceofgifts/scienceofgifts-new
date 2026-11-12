/**
 * Science of Gifts — Editorial Discovery Hub Document Schema (`editorialHub`)
 *
 * Implements Section 8 (Editorial Hubs):
 * - Dedicated editing experience for "Gifts for Him" (`/gifts-for-men/`) and
 *   "Gifts for Her" (`/gifts-for-women/`).
 * - Preserves canonical routes (`/gifts-for-men/`, `/gifts-for-women/`) while
 *   making the visible H1 headline, introduction, hero image, relationship pathways,
 *   interests, budget brackets, occasions, curated guides, curated products,
 *   seasonal editorial callouts, buying advice, related articles, and SEO editable.
 */

import { defineArrayMember, defineField, defineType } from '../../sanityCore';
import {
  INTEREST_SLUG_OPTIONS,
  OCCASION_OPTIONS,
} from '../../taxonomyRegistry';
import { evaluateEditorialDocumentLifecycle } from '../../publicationWorkflow';

export const editorialHubDocument = defineType({
  name: 'editorialHub',
  title: 'Editorial Discovery Hub (Gifts for Him / Gifts for Her)',
  type: 'document',
  icon: 'Compass',
  description:
    'Flagship editorial discovery hub (/gifts-for-men/ "Gifts for Him" and /gifts-for-women/ "Gifts for Her") organizing gifts by relationship closeness, daily interests, budget brackets, occasions, curated guides, and curated products.',
  groups: [
    {
      name: 'heroAndFraming',
      title: '1. Headline, Intro & Hero',
      description: 'Canonical route slug, visible H1 heading, intro paragraphs, and hero image.',
      default: true,
    },
    {
      name: 'browsePathways',
      title: '2. Pathways, Interests, Budgets & Occasions',
      description: 'Relationship pathways, interest slugs, budget brackets, and occasion keys.',
    },
    {
      name: 'curationAndSeasonal',
      title: '3. Featured Guides, Products & Seasonal Callout',
      description: 'Curated gift guides, curated individual gifts, interactive Gift Finder CTA, and seasonal editorial content.',
    },
    {
      name: 'adviceAndRelated',
      title: '4. Buying Advice & Related Stories',
      description: 'Editorial buying advice blocks, related stories, and companion hub link.',
    },
    {
      name: 'seoAndReadiness',
      title: '5. SEO, Readiness & Publishing',
      description: 'Publication status, readiness thresholds, and SEO metadata.',
    },
  ],
  initialValue: {
    status: 'draft',
    minimumRequiredGuides: 3,
    minimumRequiredProducts: 8,
  },
  fields: [
    // =========================================================================
    // GROUP 1: HEADLINE, INTRO & HERO
    // =========================================================================
    defineField({
      name: 'id',
      title: 'Canonical Hub ID (Immutable After Creation)',
      type: 'string',
      group: 'heroAndFraming',
      description: 'E.g. "hub_gifts_for_him" or "hub_gifts_for_her".',
      readOnly: ({ document, value }) =>
        Boolean(value && document && (document._createdAt || document._rev)),
      validation: (Rule) =>
        Rule.required().regex(/^hub_[a-z0-9_]+$/, {
          name: 'hub_<snake_case_id>',
        }),
    }),
    defineField({
      name: 'slug',
      title: 'Canonical Route Slug (Preserves Live URLs)',
      type: 'string',
      group: 'heroAndFraming',
      description:
        'Must preserve existing production URLs: "gifts-for-men" (/gifts-for-men/) and "gifts-for-women" (/gifts-for-women/).',
      options: {
        list: [
          { title: 'Gifts for Him — Canonical Route /gifts-for-men/ (gifts-for-men)', value: 'gifts-for-men' },
          { title: 'Gifts for Her — Canonical Route /gifts-for-women/ (gifts-for-women)', value: 'gifts-for-women' },
        ],
      },
      readOnly: ({ document, value }) =>
        Boolean(value && document && (document._createdAt || document._rev)),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'routePath',
      title: 'Normalized Canonical Route Path',
      type: 'string',
      group: 'heroAndFraming',
      description:
        'E.g. "/gifts-for-men/" or "/gifts-for-women/". Always starts and ends with "/".',
      validation: (Rule) =>
        Rule.required().regex(/^\/[a-z0-9-]+\/$/, {
          name: 'normalized hub route path',
        }),
    }),
    defineField({
      name: 'editorialKicker',
      title: 'Hero Eyebrow Kicker',
      type: 'string',
      group: 'heroAndFraming',
      description: 'E.g. "Editorial Discovery Hub · Gifts for Him".',
      validation: (Rule) => Rule.optional().max(90),
    }),
    defineField({
      name: 'title',
      title: 'Visible On-Page H1 Heading',
      type: 'string',
      group: 'heroAndFraming',
      description:
        'Decoupled from the URL slug and SEO <title> tag (e.g. "Gifts for Him" on /gifts-for-men/ and "Gifts for Her" on /gifts-for-women/).',
      validation: (Rule) => Rule.required().min(5).max(90),
    }),
    defineField({
      name: 'subtitle',
      title: 'Hero Lead Paragraph / Subtitle',
      type: 'text',
      group: 'heroAndFraming',
      validation: (Rule) => Rule.required().min(20).max(300),
    }),
    defineField({
      name: 'editorialLeadParagraphs',
      title: 'Editorial Introduction Paragraphs',
      type: 'array',
      group: 'heroAndFraming',
      description:
        'Framing paragraphs explaining how this hub organizes gifts by relationship closeness and daily routines rather than clichés.',
      of: [defineArrayMember({ type: 'text' })],
      validation: (Rule) => Rule.required().min(1).max(4),
    }),
    defineField({
      name: 'editorialPositioning',
      title: 'Internal Editorial Positioning Note',
      type: 'text',
      group: 'heroAndFraming',
      validation: (Rule) => Rule.required().max(320),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hub Hero Photograph (Optional)',
      type: 'editorialImage',
      group: 'heroAndFraming',
      description:
        'If omitted, the hub hero renders a clean typography-led editorial header.',
      validation: (Rule) => Rule.optional(),
    }),

    // =========================================================================
    // GROUP 2: PATHWAYS, INTERESTS, BUDGETS & OCCASIONS
    // =========================================================================
    defineField({
      name: 'relationshipPathways',
      title: 'Browse by Relationship Pathways (Drag to Reorder)',
      type: 'array',
      group: 'browsePathways',
      description:
        'E.g. Dad, Husband, Boyfriend, Brother, Grandpa, Male Friends (or Mom, Wife, Girlfriend, Sister, Grandma, Female Friends). Minimum 4 required.',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'editorialHubRelationshipPathway' })],
      validation: (Rule) => Rule.required().min(4),
    }),
    defineField({
      name: 'interestSlugs',
      title: 'Browse by Interest Slugs',
      type: 'array',
      group: 'browsePathways',
      description:
        'Controlled interest archive slugs highlighted on this hub.',
      of: [defineArrayMember({ type: 'string' })],
      options: {
        list: INTEREST_SLUG_OPTIONS,
      },
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'budgetBrackets',
      title: 'Browse by Budget Brackets (Drag to Reorder)',
      type: 'array',
      group: 'browsePathways',
      description:
        'Structured budget sections (Under $25, $25 to $50, $50 to $100, $100 and Above). Minimum 3 required.',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'editorialHubBudgetBracket' })],
      validation: (Rule) => Rule.required().min(3),
    }),
    defineField({
      name: 'occasionKeys',
      title: 'Browse by Occasions',
      type: 'array',
      group: 'browsePathways',
      of: [defineArrayMember({ type: 'string' })],
      options: {
        list: OCCASION_OPTIONS,
      },
      validation: (Rule) => Rule.required().min(1),
    }),

    // =========================================================================
    // GROUP 3: FEATURED GUIDES, PRODUCTS & SEASONAL CALLOUT
    // =========================================================================
    defineField({
      name: 'curatedGuides',
      title: 'Featured Editorial Gift Guides (Drag to Reorder)',
      type: 'array',
      group: 'curationAndSeasonal',
      description:
        'The first guide renders in the Lead Featured Guide spotlight; remaining guides render as supporting cards.',
      options: { sortable: true },
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'giftGuide' }],
        }),
      ],
      validation: (Rule) => Rule.required().min(1).unique(),
    }),
    defineField({
      name: 'curatedProductPicks',
      title: 'Curated Individual Gift Selections (Drag to Reorder)',
      type: 'array',
      group: 'curationAndSeasonal',
      description:
        'Select canonical products and add hub-specific relationship framing.',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'editorialHubProductSelection' })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'finderCta',
      title: 'Interactive Gift Finder Callout & Quick Presets',
      type: 'editorialHubFinderCta',
      group: 'curationAndSeasonal',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'seasonalCallout',
      title: 'Seasonal Editorial Spotlight Callout (Optional)',
      type: 'editorialHubSeasonalCallout',
      group: 'curationAndSeasonal',
      description:
        'Editable seasonal gifting guidance (e.g. Father’s Day, Mother’s Day, Winter Holidays, Summer Hosting).',
      validation: (Rule) => Rule.optional(),
    }),

    // =========================================================================
    // GROUP 4: BUYING ADVICE & RELATED STORIES
    // =========================================================================
    defineField({
      name: 'buyingAdviceIntro',
      title: 'Buying Advice Section Lead-In (Optional)',
      type: 'text',
      group: 'adviceAndRelated',
      validation: (Rule) => Rule.optional().max(400),
    }),
    defineField({
      name: 'buyingAdvice',
      title: 'Editorial Buying Advice Blocks (Minimum 3)',
      type: 'array',
      group: 'adviceAndRelated',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'guideBuyingAdvice' })],
      validation: (Rule) => Rule.required().min(3),
    }),
    defineField({
      name: 'relatedArticles',
      title: 'Related Behavioral Stories & Articles',
      type: 'array',
      group: 'adviceAndRelated',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'article' }],
        }),
      ],
      validation: (Rule) => Rule.optional().unique(),
    }),
    defineField({
      name: 'companionHubSlug',
      title: 'Companion Hub Slug',
      type: 'string',
      group: 'adviceAndRelated',
      options: {
        list: [
          { title: 'Gifts for Her (gifts-for-women)', value: 'gifts-for-women' },
          { title: 'Gifts for Him (gifts-for-men)', value: 'gifts-for-men' },
        ],
      },
      validation: (Rule) => Rule.optional(),
    }),

    // =========================================================================
    // GROUP 5: SEO, READINESS & PUBLISHING
    // =========================================================================
    defineField({
      name: 'status',
      title: 'Publication Status',
      type: 'string',
      group: 'seoAndReadiness',
      initialValue: 'draft',
      description:
        'Hubs remain in "draft" (`noindex,follow`) until minimum guide and product readiness thresholds are satisfied.',
      options: {
        list: [
          { title: 'Draft — In Review / Non-Indexed (draft)', value: 'draft' },
          { title: 'Published — Live Discovery Hub (published)', value: 'published' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'minimumRequiredGuides',
      title: 'Minimum Published Guides Required Before Indexing',
      type: 'number',
      group: 'seoAndReadiness',
      initialValue: 3,
      validation: (Rule) => Rule.required().min(1).integer(),
    }),
    defineField({
      name: 'minimumRequiredProducts',
      title: 'Minimum Verified Products Required Before Indexing',
      type: 'number',
      group: 'seoAndReadiness',
      initialValue: 8,
      validation: (Rule) => Rule.required().min(1).integer(),
    }),
    defineField({
      name: 'seo',
      title: 'SEO, Canonical Path & Indexing Metadata',
      type: 'seoMetadata',
      group: 'seoAndReadiness',
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
      if (
        doc.slug === 'gifts-for-men' &&
        doc.routePath &&
        doc.routePath !== '/gifts-for-men/'
      ) {
        return 'The "gifts-for-men" hub must preserve its canonical routePath "/gifts-for-men/".';
      }
      if (
        doc.slug === 'gifts-for-women' &&
        doc.routePath &&
        doc.routePath !== '/gifts-for-women/'
      ) {
        return 'The "gifts-for-women" hub must preserve its canonical routePath "/gifts-for-women/".';
      }
      return true;
    }),
  preview: {
    select: {
      title: 'title',
      routePath: 'routePath',
      status: 'status',
      media: 'heroImage.asset',
    },
    prepare({ title, routePath, status, media }) {
      const badge = status === 'published' ? 'PUBLISHED' : 'DRAFT';
      return {
        title: `${title || 'Editorial Hub'} (${routePath || '/'})`,
        subtitle: `[${badge}] Flagship Editorial Discovery Hub`,
        media,
      };
    },
  },
});
