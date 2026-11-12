/**
 * Science of Gifts — Product Editorial Profile Object Schemas
 *
 * Implements the six structured editorial sub-objects required by `Product`
 * (`src/types/content.ts` lines 110–152) and rendered by `EditorialProductProfile.tsx`:
 * 1. `productGiftVerdict` (`ProductGiftVerdict`)
 * 2. `productRecipientProfile` (`ProductIdealRecipientProfile`)
 * 3. `productBuyingConsideration` (`ProductBuyingConsideration`)
 * 4. `productOccasionNote` (`ProductOccasionNote`)
 * 5. `productSpecificationItem` (`ProductSpecificationItem`)
 * 6. `productSimilarComparison` (`ProductSimilarComparison`)
 */

import { defineArrayMember, defineField, defineType } from '../../sanityCore';
import { OCCASION_OPTIONS } from '../../taxonomyRegistry';

export const productGiftVerdictObject = defineType({
  name: 'productGiftVerdict',
  title: 'Product Editorial Gift Verdict',
  type: 'object',
  description:
    'Structured editorial evaluation rendered at the top of `/products/[slug]/` explaining why this object succeeds as a gift, what sets it apart, and any important caveats.',
  fields: [
    defineField({
      name: 'editorialAssessment',
      title: 'Editorial Assessment (Lead Verdict)',
      type: 'text',
      description:
        'Primary 2–3 sentence synthesis of how this item performs as a gift.',
      validation: (Rule) => Rule.required().min(20).max(550),
    }),
    defineField({
      name: 'standoutReason',
      title: 'Why It Stands Out From Generic Alternatives',
      type: 'text',
      description:
        'What makes this specific maker, material, or format superior to standard options.',
      validation: (Rule) => Rule.required().min(15).max(400),
    }),
    defineField({
      name: 'recipientDelight',
      title: 'Why Recipients Enjoy Receiving It',
      type: 'text',
      description:
        'How the gift feels to unwrap and use during the recipient’s daily routine.',
      validation: (Rule) => Rule.required().min(15).max(400),
    }),
    defineField({
      name: 'importantCaveat',
      title: 'Important Caveat / Who Should Skip It (Optional)',
      type: 'text',
      description:
        'Honest practical limitation (e.g., hand-wash only, requires counter space, unscented).',
      validation: (Rule) => Rule.optional().max(350),
    }),
  ],
});

export const productRecipientProfileObject = defineType({
  name: 'productRecipientProfile',
  title: 'Ideal Recipient Profile',
  type: 'object',
  description:
    'Detailed recipient persona breakdown displayed on the product profile page.',
  fields: [
    defineField({
      name: 'headline',
      title: 'Recipient Profile Headline',
      type: 'string',
      description:
        'E.g. "Built for Morning Tea Drinkers, Design-Minded Partners, and Gracious Hosts".',
      validation: (Rule) => Rule.required().min(8).max(160),
    }),
    defineField({
      name: 'narrative',
      title: 'Recipient Fit Narrative',
      type: 'text',
      description:
        'Explains the habits, sensibilities, and relationship contexts where this gift resonates most.',
      validation: (Rule) => Rule.required().min(25).max(600),
    }),
    defineField({
      name: 'lifestyleNotes',
      title: 'Lifestyle & Personality Signals',
      type: 'array',
      description:
        'Concrete everyday habits that signal this person will love the gift (2–5 bullets).',
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.optional().max(6),
    }),
    defineField({
      name: 'relationshipFit',
      title: 'Best Relationship Contexts',
      type: 'array',
      description:
        'Specific relationships where the price and intimacy level feel right (e.g. "Spouse or partner", "Close friend’s birthday").',
      of: [defineArrayMember({ type: 'string' })],
      validation: (Rule) => Rule.optional().max(6),
    }),
  ],
});

export const productBuyingConsiderationObject = defineType({
  name: 'productBuyingConsideration',
  title: 'Product Buying Consideration',
  type: 'object',
  description:
    'Labeled practical note covering sizing, care, shipping lead time, or presentation.',
  fields: [
    defineField({
      name: 'label',
      title: 'Consideration Label',
      type: 'string',
      description: 'E.g. "Care & Maintenance", "Presentation", or "Dietary Note".',
      validation: (Rule) => Rule.required().min(2).max(80),
    }),
    defineField({
      name: 'detail',
      title: 'Practical Detail',
      type: 'text',
      validation: (Rule) => Rule.required().min(10).max(360),
    }),
  ],
  preview: {
    select: {
      title: 'label',
      subtitle: 'detail',
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Buying Consideration',
        subtitle: subtitle || '',
      };
    },
  },
});

export const productOccasionNoteObject = defineType({
  name: 'productOccasionNote',
  title: 'Product Occasion Context Note',
  type: 'object',
  description:
    'Explains why and how to give this product for a specific occasion.',
  fields: [
    defineField({
      name: 'occasion',
      title: 'Occasion Key',
      type: 'string',
      options: {
        list: OCCASION_OPTIONS,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Display Label',
      type: 'string',
      description: 'E.g. "Housewarming & First Apartment" or "Milestone Birthday".',
      validation: (Rule) => Rule.required().max(90),
    }),
    defineField({
      name: 'note',
      title: 'Occasion Gifting Note',
      type: 'text',
      description:
        'How to present or pair this gift for the selected occasion.',
      validation: (Rule) => Rule.required().min(15).max(360),
    }),
  ],
  preview: {
    select: {
      title: 'label',
      subtitle: 'note',
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Occasion Context',
        subtitle: subtitle || '',
      };
    },
  },
});

export const productSpecificationItemObject = defineType({
  name: 'productSpecificationItem',
  title: 'Product Specification Row',
  type: 'object',
  description:
    'Key-value physical specification (materials, dimensions, origin, capacity, care).',
  fields: [
    defineField({
      name: 'label',
      title: 'Specification Label',
      type: 'string',
      description: 'E.g. "Materials", "Dimensions", "Origin", or "Care".',
      validation: (Rule) => Rule.required().min(2).max(60),
    }),
    defineField({
      name: 'value',
      title: 'Specification Value',
      type: 'string',
      description: 'E.g. "Lead-free borosilicate glass; 750 ml capacity".',
      validation: (Rule) => Rule.required().min(2).max(220),
    }),
  ],
  preview: {
    select: {
      title: 'label',
      subtitle: 'value',
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Specification',
        subtitle: subtitle || '',
      };
    },
  },
});

export const productSimilarComparisonObject = defineType({
  name: 'productSimilarComparison',
  title: 'Similar Gift Comparison Entry',
  type: 'object',
  description:
    'References another canonical product in the catalog and explains how it compares (e.g., lower-budget alternative, higher-budget upgrade, or different material style).',
  fields: [
    defineField({
      name: 'product',
      title: 'Compared Product (Canonical Reference)',
      type: 'reference',
      to: [{ type: 'product' }],
      description:
        'Select the canonical product to compare against. Its title, price, and photo are pulled automatically.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'comparisonAngle',
      title: 'Comparison Angle / Role',
      type: 'string',
      description:
        'E.g. "Higher-Budget Textile Upgrade ($115)" or "Compact Under-$25 Alternative".',
      validation: (Rule) => Rule.required().min(4).max(110),
    }),
    defineField({
      name: 'summary',
      title: 'Comparative Summary',
      type: 'text',
      description:
        'When an editor or shopper should choose the compared product instead of this one.',
      validation: (Rule) => Rule.required().min(15).max(360),
    }),
    defineField({
      name: 'distinctionLabel',
      title: 'Short Distinction Badge (Optional)',
      type: 'string',
      validation: (Rule) => Rule.optional().max(60),
    }),
  ],
  preview: {
    select: {
      title: 'comparisonAngle',
      productTitle: 'product.title',
      subtitle: 'summary',
      media: 'product.images.0.asset',
    },
    prepare({ title, productTitle, subtitle, media }) {
      return {
        title: productTitle ? `${productTitle} — ${title || 'Comparison'}` : title || 'Product Comparison',
        subtitle: subtitle || '',
        media,
      };
    },
  },
});
