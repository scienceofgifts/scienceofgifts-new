/**
 * Science of Gifts — Editorial Article Reusable Object Schemas
 *
 * Implements all structured section and comparison objects required by `Article`
 * (`src/types/content.ts` lines 360–449) and rendered by `ArticleReaderView.tsx`:
 * - `citationAnnotation` (Portable Text inline academic citation reference mark)
 * - `articleBulletList` (Intro + bullet items inside subsections)
 * - `articleSubSection` (H3 subheadings with paragraphs/Portable Text and bullets)
 * - `articlePullQuote` (Editorial pull quote with attribution)
 * - `articleCallout` (Tinted behavioral research or etiquette callout box)
 * - `articleExpandableNote` (Expandable methodology note)
 * - `articleExpandableAdviceItem` & `articleExpandableAdvice` (Interactive checklist accordion)
 * - `articleContextualProducts` (Contextual gift recommendations referencing canonical `product` records)
 * - `articleContentSection` (Main H2 section supporting both `[cite:cit_id]` paragraphs and Portable Text blocks)
 * - `articleComparisonRow` & `articleComparisonTable` (Empirical/practical comparison matrix)
 */

import { defineArrayMember, defineField, defineType } from '../../sanityCore';

export const citationAnnotationObject = defineType({
  name: 'citationAnnotation',
  title: 'Inline Research Citation Reference',
  type: 'object',
  description:
    'Links highlighted text in Portable Text to a verified `researchCitation` document. Serializes deterministically to `[cite:cit_id]` for the article citation popover and reference list.',
  fields: [
    defineField({
      name: 'citation',
      title: 'Referenced Study / Research Citation',
      type: 'reference',
      to: [{ type: 'researchCitation' }],
      validation: (Rule) => Rule.required(),
    }),
  ],
});

export const articleBulletListObject = defineType({
  name: 'articleBulletList',
  title: 'Subsection Bullet List',
  type: 'object',
  fields: [
    defineField({
      name: 'intro',
      title: 'Lead-in Sentence (Optional)',
      type: 'string',
      validation: (Rule) => Rule.optional().max(240),
    }),
    defineField({
      name: 'items',
      title: 'Bullet Points',
      type: 'array',
      description: 'Supports inline `[cite:cit_id]` markers.',
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
});

export const articleSubSectionObject = defineType({
  name: 'articleSubSection',
  title: 'Article H3 Subsection',
  type: 'object',
  description:
    'Secondary H3 subheading block inside an H2 article section.',
  fields: [
    defineField({
      name: 'id',
      title: 'Subsection Anchor ID',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subheading',
      title: 'H3 Subheading',
      type: 'string',
      validation: (Rule) => Rule.required().min(4).max(140),
    }),
    defineField({
      name: 'paragraphs',
      title: 'Subsection Paragraphs',
      type: 'array',
      description:
        'Each item renders as a paragraph. Supports inline `[cite:cit_id]` citation tokens.',
      of: [defineArrayMember({ type: 'text' })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'bulletList',
      title: 'Structured Bullet List (Optional)',
      type: 'articleBulletList',
      validation: (Rule) => Rule.optional(),
    }),
  ],
  preview: {
    select: {
      title: 'subheading',
      paragraphs: 'paragraphs',
    },
    prepare({ title, paragraphs }) {
      const first = Array.isArray(paragraphs) && paragraphs[0] ? String(paragraphs[0]) : '';
      return {
        title: title || 'H3 Subsection',
        subtitle: first,
      };
    },
  },
});

export const articlePullQuoteObject = defineType({
  name: 'articlePullQuote',
  title: 'Editorial Pull Quote',
  type: 'object',
  fields: [
    defineField({
      name: 'text',
      title: 'Pull Quote Text',
      type: 'text',
      validation: (Rule) => Rule.required().min(15).max(360),
    }),
    defineField({
      name: 'attribution',
      title: 'Attribution / Context',
      type: 'string',
      validation: (Rule) => Rule.required().max(160),
    }),
  ],
});

export const articleCalloutObject = defineType({
  name: 'articleCallout',
  title: 'Article Behavioral Insight / Etiquette Callout',
  type: 'object',
  fields: [
    defineField({
      name: 'kicker',
      title: 'Eyebrow Kicker (Optional)',
      type: 'string',
      initialValue: 'Research Takeaway',
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
      title: 'Callout Body',
      type: 'text',
      validation: (Rule) => Rule.required().min(20).max(600),
    }),
    defineField({
      name: 'tone',
      title: 'Surface Tint',
      type: 'string',
      initialValue: 'mint',
      options: {
        list: [
          { title: 'Soft Mint (mint)', value: 'mint' },
          { title: 'Calm Blue (blue)', value: 'blue' },
          { title: 'Warm Butter (butter)', value: 'butter' },
          { title: 'Warm Sand (sand)', value: 'sand' },
        ],
      },
      validation: (Rule) => Rule.optional(),
    }),
  ],
});

export const articleExpandableNoteObject = defineType({
  name: 'articleExpandableNote',
  title: 'Expandable Research Methodology Note',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Drawer Toggle Heading',
      type: 'string',
      validation: (Rule) => Rule.required().max(140),
    }),
    defineField({
      name: 'methodologyDetail',
      title: 'Methodology / Study Context Detail',
      type: 'text',
      validation: (Rule) => Rule.required().min(20).max(700),
    }),
  ],
});

export const articleExpandableAdviceItemObject = defineType({
  name: 'articleExpandableAdviceItem',
  title: 'Expandable Advice Item',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Scenario / Rule Label',
      type: 'string',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'detail',
      title: 'Actionable Guidance (Supports `[cite:cit_id]`)',
      type: 'text',
      validation: (Rule) => Rule.required().min(10).max(450),
    }),
  ],
  preview: {
    select: {
      title: 'label',
      subtitle: 'detail',
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Advice Item',
        subtitle: subtitle || '',
      };
    },
  },
});

export const articleExpandableAdviceObject = defineType({
  name: 'articleExpandableAdvice',
  title: 'Article Expandable Practical Advice Block',
  type: 'object',
  fields: [
    defineField({
      name: 'id',
      title: 'Advice Block ID',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Accordion Heading',
      type: 'string',
      validation: (Rule) => Rule.required().max(140),
    }),
    defineField({
      name: 'summaryPreview',
      title: 'Collapsed Preview Summary',
      type: 'string',
      validation: (Rule) => Rule.required().max(220),
    }),
    defineField({
      name: 'items',
      title: 'Advice Scenarios / Checklist Items',
      type: 'array',
      of: [defineArrayMember({ type: 'articleExpandableAdviceItem' })],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
});

export const articleContextualProductsObject = defineType({
  name: 'articleContextualProducts',
  title: 'Contextual Product Recommendations Block',
  type: 'object',
  description:
    'Embeds 1–4 canonical products inside an article section with an editorial explanation of how they exemplify the research principle.',
  fields: [
    defineField({
      name: 'heading',
      title: 'Module Heading',
      type: 'string',
      initialValue: 'Objects That Put This Research Into Practice',
      validation: (Rule) => Rule.required().max(140),
    }),
    defineField({
      name: 'editorialContext',
      title: 'Editorial Context Sentence',
      type: 'text',
      validation: (Rule) => Rule.required().max(360),
    }),
    defineField({
      name: 'products',
      title: 'Referenced Canonical Products (Drag to Reorder)',
      type: 'array',
      options: { sortable: true },
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'product' }],
        }),
      ],
      validation: (Rule) => Rule.required().min(1).max(4).unique(),
    }),
  ],
});

export const articleContentSectionObject = defineType({
  name: 'articleContentSection',
  title: 'Article H2 Content Section',
  type: 'object',
  description:
    'Primary H2 article chapter. Supports structured paragraphs with `[cite:cit_id]` markers, Portable Text blocks with inline `citationAnnotation` references, H3 subsections, pull quotes, callouts, expandable advice, and inline product recommendations.',
  fieldsets: [
    {
      name: 'editorialModules',
      title: 'Optional Pull Quote, Callout, Expandable Advice & Inline Products',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: 'id',
      title: 'Section Anchor ID (For Table of Contents)',
      type: 'string',
      description: 'Kebab-case anchor ID (e.g. "smile-seeking-trap").',
      validation: (Rule) =>
        Rule.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
          name: 'kebab-case section anchor ID',
        }),
    }),
    defineField({
      name: 'shortNavTitle',
      title: 'Short TOC Sidebar Title (Optional)',
      type: 'string',
      description: 'Concise label for the sticky Table of Contents.',
      validation: (Rule) => Rule.optional().max(55),
    }),
    defineField({
      name: 'heading',
      title: 'Section H2 Heading',
      type: 'string',
      validation: (Rule) => Rule.required().min(5).max(140),
    }),
    defineField({
      name: 'paragraphs',
      title: 'Section Paragraphs (Supports Inline `[cite:cit_id]` Markers)',
      type: 'array',
      description:
        'Canonical paragraph array consumed directly by `ArticleReaderView.tsx` and `citationNavigation.ts`. Each paragraph may include `[cite:cit_id]` markers.',
      of: [defineArrayMember({ type: 'text' })],
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'portableTextBody',
      title: 'Rich-Text Portable Text Editor (Optional Alternative to Paragraphs)',
      type: 'array',
      description:
        'Write long-form prose and highlight phrases with the `citationAnnotation` mark to link a `researchCitation` document. Automatically serialized to `paragraphs` with `[cite:cit_id]` markers via `serializePortableTextToParagraphs()`.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Normal Paragraph', value: 'normal' },
            { title: 'H3 Subheading', value: 'h3' },
            { title: 'Blockquote', value: 'blockquote' },
          ],
          lists: [{ title: 'Bullet List', value: 'bullet' }],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
            ],
            annotations: [defineArrayMember({ type: 'citationAnnotation' })],
          },
        }),
      ],
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'subSections',
      title: 'H3 Subsections (Optional)',
      type: 'array',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'articleSubSection' })],
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'pullQuote',
      title: 'Section Pull Quote (Optional)',
      type: 'articlePullQuote',
      fieldset: 'editorialModules',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'callout',
      title: 'Section Callout Box (Optional)',
      type: 'articleCallout',
      fieldset: 'editorialModules',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'expandableNote',
      title: 'Expandable Methodology Note (Optional)',
      type: 'articleExpandableNote',
      fieldset: 'editorialModules',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'expandableAdvice',
      title: 'Expandable Practical Checklist (Optional)',
      type: 'articleExpandableAdvice',
      fieldset: 'editorialModules',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'contextualProducts',
      title: 'Contextual Product Recommendations Card (Optional)',
      type: 'articleContextualProducts',
      fieldset: 'editorialModules',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'recommendedProducts',
      title: 'Additional Inline Product References (Optional)',
      type: 'array',
      fieldset: 'editorialModules',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'product' }],
        }),
      ],
      validation: (Rule) => Rule.optional().unique(),
    }),
  ],
  validation: (Rule) =>
    Rule.custom((sec: Record<string, any> | undefined) => {
      if (!sec) return true;
      const hasParagraphs =
        Array.isArray(sec.paragraphs) && sec.paragraphs.length > 0;
      const hasPortableText =
        Array.isArray(sec.portableTextBody) && sec.portableTextBody.length > 0;
      if (!hasParagraphs && !hasPortableText) {
        return 'Each article section must include at least one paragraph in `paragraphs` or `portableTextBody`.';
      }
      return true;
    }),
  preview: {
    select: {
      title: 'heading',
      nav: 'shortNavTitle',
      paragraphs: 'paragraphs',
    },
    prepare({ title, nav, paragraphs }) {
      const count = Array.isArray(paragraphs) ? paragraphs.length : 0;
      return {
        title: title || nav || 'Article Section',
        subtitle: `${nav ? `[${nav}] · ` : ''}${count} paragraph${count === 1 ? '' : 's'}`,
      };
    },
  },
});

export const articleComparisonRowObject = defineType({
  name: 'articleComparisonRow',
  title: 'Article Comparison Table Row',
  type: 'object',
  fields: [
    defineField({
      name: 'dimension',
      title: 'Comparison Dimension',
      type: 'string',
      description: 'E.g. "Unwrapping Reaction vs. Month-Six Utility".',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'noveltyGift',
      title: 'Column 1 — Novelty / Smile-Seeking Gift',
      type: 'string',
      validation: (Rule) => Rule.required().max(220),
    }),
    defineField({
      name: 'ritualObject',
      title: 'Column 2 — Tactile Ritual / Thoughtful Gift',
      type: 'string',
      validation: (Rule) => Rule.required().max(220),
    }),
    defineField({
      name: 'empiricalEffect',
      title: 'Column 3 — Empirical / Behavioral Outcome',
      type: 'string',
      validation: (Rule) => Rule.required().max(240),
    }),
  ],
  preview: {
    select: {
      title: 'dimension',
      subtitle: 'empiricalEffect',
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Comparison Dimension',
        subtitle: subtitle || '',
      };
    },
  },
});

export const articleComparisonTableObject = defineType({
  name: 'articleComparisonTable',
  title: 'Article Empirical / Practical Comparison Table',
  type: 'object',
  description:
    'Structured 4-column comparison table contrasting gifting frameworks.',
  fields: [
    defineField({
      name: 'title',
      title: 'Table Heading',
      type: 'string',
      validation: (Rule) => Rule.required().max(140),
    }),
    defineField({
      name: 'caption',
      title: 'Table Caption / Footnote',
      type: 'string',
      validation: (Rule) => Rule.required().max(260),
    }),
    defineField({
      name: 'headers',
      title: 'Column Headers (4 Columns)',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.required().min(2).max(5),
    }),
    defineField({
      name: 'rows',
      title: 'Comparison Rows',
      type: 'array',
      options: { sortable: true },
      of: [defineArrayMember({ type: 'articleComparisonRow' })],
      validation: (Rule) => Rule.required().min(2),
    }),
  ],
});
