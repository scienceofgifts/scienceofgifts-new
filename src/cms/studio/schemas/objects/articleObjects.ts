import { defineArrayMember, defineField, defineType } from '../../sanityCore';

export const citationAnnotationObject = defineType({
  name: 'citationAnnotation',
  title: 'Research Citation Annotation',
  type: 'object',
  fields: [
    defineField({
      name: 'citationRef',
      title: 'Cited Study Reference',
      type: 'reference',
      to: [{ type: 'researchCitation' }],
    }),
    defineField({
      name: 'citationId',
      title: 'Citation ID (e.g. cit_peng_2020_gift_emotion)',
      type: 'string',
      description:
        'Canonical citation ID rendered as an interactive superscript badge on the article page.',
    }),
  ],
});

export const ARTICLE_PORTABLE_TEXT_MEMBERS = [
  defineArrayMember({
    type: 'block',
    styles: [
      { title: 'Normal Paragraph', value: 'normal' },
      { title: 'H2 Section Heading', value: 'h2' },
      { title: 'H3 Sub-heading', value: 'h3' },
      { title: 'Blockquote', value: 'blockquote' },
    ],
    marks: {
      decorators: [
        { title: 'Bold', value: 'strong' },
        { title: 'Italic', value: 'em' },
      ],
      annotations: [
        {
          name: 'link',
          type: 'object',
          title: 'Editorial Link',
          fields: [
            defineField({
              name: 'href',
              title: 'Link URL (https:// or /path/)',
              type: 'string',
              description:
                'Full HTTPS URL (e.g. https://doi.org/...) or internal site path (e.g. /guides/).',
              validation: (Rule) => Rule.required(),
            }),
          ],
        },
        {
          name: 'citationAnnotation',
          type: 'object',
          title: 'Research Citation',
          fields: [
            defineField({
              name: 'citationRef',
              title: 'Cited Study Reference',
              type: 'reference',
              to: [{ type: 'researchCitation' }],
            }),
            defineField({
              name: 'citationId',
              title: 'Citation ID (e.g. cit_peng_2020_gift_emotion)',
              type: 'string',
              description:
                'Canonical citation ID rendered as an interactive superscript badge on the article page.',
            }),
          ],
        },
      ],
    },
  }),
  defineArrayMember({
    type: 'editorialImage',
    title: 'Inline Image with Caption & Alt Text',
  }),
  defineArrayMember({
    type: 'articleCallout',
    title: 'Editorial Callout Box',
  }),
];

export const articlePullQuoteObject = defineType({
  name: 'articlePullQuote',
  title: 'Editorial Pull Quote',
  type: 'object',
  fields: [
    defineField({
      name: 'text',
      title: 'Quote Text',
      type: 'text',
      rows: 2,
      validation: (Rule) => Rule.required().min(15).max(320),
    }),
    defineField({
      name: 'attribution',
      title: 'Attribution / Context',
      type: 'string',
      validation: (Rule) => Rule.max(120),
    }),
  ],
});

export const articleCalloutObject = defineType({
  name: 'articleCallout',
  title: 'Article Callout Box',
  type: 'object',
  fields: [
    defineField({
      name: 'kicker',
      title: 'Kicker Label',
      type: 'string',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'label',
      title: 'Label (Optional Alias)',
      type: 'string',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'title',
      title: 'Callout Title',
      type: 'string',
      validation: (Rule) => Rule.required().max(140),
    }),
    defineField({
      name: 'body',
      title: 'Callout Body',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required().min(15).max(650),
    }),
    defineField({
      name: 'tone',
      title: 'Visual Tone',
      type: 'string',
      initialValue: 'sand',
      options: {
        list: [
          { title: 'Sand (Neutral Warm)', value: 'sand' },
          { title: 'Mint (Fresh Insight)', value: 'mint' },
          { title: 'Butter (Warm Highlight)', value: 'butter' },
          { title: 'Blue (Research Note)', value: 'blue' },
        ],
      },
    }),
  ],
});

export const articleComparisonRowObject = defineType({
  name: 'articleComparisonRow',
  title: 'Article Comparison Row',
  type: 'object',
  fields: [
    defineField({
      name: 'dimension',
      title: 'Comparison Dimension',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'giverExpectation',
      title: 'Giver Expectation',
      type: 'text',
      rows: 2,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'recipientReality',
      title: 'Recipient Reality',
      type: 'text',
      rows: 2,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'practicalTakeaway',
      title: 'Practical Takeaway',
      type: 'text',
      rows: 2,
    }),
  ],
});

export const articleComparisonTableObject = defineType({
  name: 'articleComparisonTable',
  title: 'Article Comparison Table',
  type: 'object',
  fields: [
    defineField({
      name: 'caption',
      title: 'Table Caption',
      type: 'string',
    }),
    defineField({
      name: 'columns',
      title: 'Column Headers',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'rows',
      title: 'Comparison Rows',
      type: 'array',
      of: [defineArrayMember({ type: 'articleComparisonRow' })],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
});

export const articleSubSectionObject = defineType({
  name: 'articleSubSection',
  title: 'Article H3 Sub-Section',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Sub-Section Heading (H3)',
      type: 'string',
      validation: (Rule) => Rule.required().min(3).max(160),
    }),
    defineField({
      name: 'paragraphs',
      title: 'Sub-Section Paragraphs',
      type: 'array',
      of: [defineArrayMember({ type: 'text' })],
    }),
  ],
});

export const articleBulletListObject = defineType({
  name: 'articleBulletList',
  title: 'Article Bullet List',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'List Heading',
      type: 'string',
    }),
    defineField({
      name: 'items',
      title: 'Bullet Items',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
});

export const articleExpandableNoteObject = defineType({
  name: 'articleExpandableNote',
  title: 'Expandable Research Note',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Trigger Label',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Note Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'paragraphs',
      title: 'Note Paragraphs',
      type: 'array',
      of: [defineArrayMember({ type: 'text' })],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
});

export const articleExpandableAdviceItemObject = defineType({
  name: 'articleExpandableAdviceItem',
  title: 'Expandable Advice Item',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Advice Item Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Advice Item Body',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
  ],
});

export const articleExpandableAdviceObject = defineType({
  name: 'articleExpandableAdvice',
  title: 'Expandable Advice Accordion',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Accordion Group Heading',
      type: 'string',
    }),
    defineField({
      name: 'items',
      title: 'Expandable Items',
      type: 'array',
      of: [defineArrayMember({ type: 'articleExpandableAdviceItem' })],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
});

export const articleContextualProductsObject = defineType({
  name: 'articleContextualProducts',
  title: 'Contextual Product Examples',
  type: 'object',
  description:
    'Optional contextual product examples when an article section touches a giftable category. References canonical Product documents without duplicating product copy.',
  fields: [
    defineField({
      name: 'heading',
      title: 'Box Heading',
      type: 'string',
      validation: (Rule) => Rule.required().max(110),
    }),
    defineField({
      name: 'editorialContext',
      title: 'Editorial Context Note',
      type: 'text',
      rows: 2,
      validation: (Rule) => Rule.required().max(320),
    }),
    defineField({
      name: 'products',
      title: 'Referenced Canonical Products',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'product' }],
        }),
      ],
      validation: (Rule) => Rule.required().min(1).max(6).unique(),
    }),
  ],
});

export const articleContextualProductGroupObject = articleContextualProductsObject;

export const articleContentSectionObject = defineType({
  name: 'articleContentSection',
  title: 'Article Content Section',
  type: 'object',
  fields: [
    defineField({
      name: 'id',
      title: 'Section Anchor ID',
      type: 'string',
      description: 'Stable anchor ID used by the sticky Table of Contents.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heading',
      title: 'Section Heading (H2)',
      type: 'string',
      validation: (Rule) => Rule.required().min(3).max(160),
    }),
    defineField({
      name: 'subheading',
      title: 'Optional Sub-heading (H3)',
      type: 'string',
      validation: (Rule) => Rule.max(180),
    }),
    defineField({
      name: 'portableTextBody',
      title: 'Section Rich-Text Body (Portable Text)',
      type: 'array',
      description:
        'Native Sanity Portable Text editor supporting H2/H3 headings, paragraphs, bold, italic, links, inline images with captions & alt text, research citations, and callout boxes.',
      of: ARTICLE_PORTABLE_TEXT_MEMBERS,
    }),
    defineField({
      name: 'paragraphs',
      title: 'Section Paragraphs (Auto-Synced with Portable Text)',
      type: 'array',
      description:
        'Paragraph strings with inline [cite:cit_id], **bold**, *italic*, and [label](url) formatting. Synchronized automatically with Portable Text.',
      of: [defineArrayMember({ type: 'text' })],
    }),
    defineField({
      name: 'images',
      title: 'Section Inline Images (with Captions & Alt Text)',
      type: 'array',
      description:
        'Optional photographs or diagrams displayed within this article section, each with alt text and editorial caption.',
      of: [defineArrayMember({ type: 'editorialImage' })],
    }),
    defineField({
      name: 'subSections',
      title: 'Optional H3 Sub-Sections',
      type: 'array',
      of: [defineArrayMember({ type: 'articleSubSection' })],
    }),
    defineField({
      name: 'bulletList',
      title: 'Optional Bullet List',
      type: 'articleBulletList',
    }),
    defineField({
      name: 'comparisonTable',
      title: 'Optional Comparison Table',
      type: 'articleComparisonTable',
    }),
    defineField({
      name: 'pullQuote',
      title: 'Optional Section Pull Quote',
      type: 'articlePullQuote',
    }),
    defineField({
      name: 'callout',
      title: 'Optional Section Callout Box',
      type: 'articleCallout',
    }),
    defineField({
      name: 'expandableNote',
      title: 'Optional Expandable Research Note',
      type: 'articleExpandableNote',
    }),
    defineField({
      name: 'expandableAdvice',
      title: 'Optional Expandable Advice Accordion',
      type: 'articleExpandableAdvice',
    }),
    defineField({
      name: 'contextualProducts',
      title: 'Optional Contextual Product Examples',
      type: 'articleContextualProducts',
    }),
  ],
});
