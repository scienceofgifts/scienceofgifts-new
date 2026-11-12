/**
 * Science of Gifts — SEO, Product Photography & Editorial Image Object Schemas
 *
 * Implements standardized reusable objects for:
 * - `seoMetadata` (Section 10: decoupled SEO title vs H1, non-blocking length guidance, canonical protection)
 * - `productImage` (Section 9: 2400×2400 square master image, Sanity hotspot/crop, fitMode cover/contain, portrait/landscape overrides)
 * - `imageFocalPoint` & `imageCropBox` (Normalized focal point & crop coordinates compatible with Sanity hotspot)
 * - `editorialImage` (Hero and section photography for Gift Guides, Articles, and Discovery Hubs)
 * - `directorySeoEntry` (Directory & landing page SEO entries managed in Site Settings)
 */

import { defineField, defineType } from '../../sanityCore';

export const imageFocalPointObject = defineType({
  name: 'imageFocalPoint',
  title: 'Normalized Focal Point (0.0 to 1.0)',
  type: 'object',
  description:
    'Normalized focal coordinates (0 = left/top, 0.5 = center, 1 = right/bottom) aligned directly with Sanity image hotspot.x and hotspot.y.',
  fields: [
    defineField({
      name: 'x',
      title: 'Horizontal Focal Coordinate (x)',
      type: 'number',
      initialValue: 0.5,
      description: '0.0 (left edge) to 1.0 (right edge). Defaults to 0.5 (center).',
      validation: (Rule) => Rule.optional().min(0).max(1),
    }),
    defineField({
      name: 'y',
      title: 'Vertical Focal Coordinate (y)',
      type: 'number',
      initialValue: 0.5,
      description: '0.0 (top edge) to 1.0 (bottom edge). Defaults to 0.5 (center).',
      validation: (Rule) => Rule.optional().min(0).max(1),
    }),
  ],
});

export const imageCropBoxObject = defineType({
  name: 'imageCropBox',
  title: 'Normalized Image Crop Bounds',
  type: 'object',
  description:
    'Sanity-compatible normalized crop inset bounds (0.0 to 1.0 from each edge).',
  fields: [
    defineField({
      name: 'top',
      title: 'Top Crop Inset',
      type: 'number',
      initialValue: 0,
      validation: (Rule) => Rule.optional().min(0).max(1),
    }),
    defineField({
      name: 'bottom',
      title: 'Bottom Crop Inset',
      type: 'number',
      initialValue: 0,
      validation: (Rule) => Rule.optional().min(0).max(1),
    }),
    defineField({
      name: 'left',
      title: 'Left Crop Inset',
      type: 'number',
      initialValue: 0,
      validation: (Rule) => Rule.optional().min(0).max(1),
    }),
    defineField({
      name: 'right',
      title: 'Right Crop Inset',
      type: 'number',
      initialValue: 0,
      validation: (Rule) => Rule.optional().min(0).max(1),
    }),
  ],
});

export const productImageObject = defineType({
  name: 'productImage',
  title: 'Product Photograph (2400×2400 Square Master Standard)',
  type: 'object',
  description:
    'Standardized 1:1 square master product photograph (2400×2400px recommended) with native Sanity hotspot/crop, accessible alt text, cover vs. contain fit mode, and optional portrait/landscape override URLs.',
  fieldsets: [
    {
      name: 'framingAndOverrides',
      title: 'Framing, Fit Mode & Aspect-Ratio Overrides',
      description:
        'Control how this image scales in 4:3, 4:5, and 16:10 frames or provide dedicated portrait/landscape compositions.',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: 'asset',
      title: 'Sanity Master Square Image Asset (2400×2400px 1:1)',
      type: 'image',
      description:
        'Upload the square master product photograph here and set the visual hotspot/crop in Sanity Studio.',
      options: { hotspot: true },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'url',
      title: 'External or CDN Master Image URL (Optional / Fallback)',
      type: 'url',
      description:
        'Used when referencing an external CDN image or before uploading a binary asset to Sanity.',
      validation: (Rule) => Rule.optional().uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'alt',
      title: 'Accessible Alt Text',
      type: 'string',
      description:
        'Required for screen readers and image SEO. Describe the physical object, material, and setting accurately.',
      validation: (Rule) =>
        Rule.required()
          .min(10)
          .max(220)
          .error('Provide descriptive accessible alt text (10–220 characters).'),
    }),
    defineField({
      name: 'caption',
      title: 'Editorial Caption (Optional)',
      type: 'string',
      description:
        'Displayed below product gallery photographs on editorial product profile pages.',
      validation: (Rule) => Rule.optional().max(240),
    }),
    defineField({
      name: 'fitMode',
      title: 'Frame Fit Mode (Cover vs. Contain)',
      type: 'string',
      fieldset: 'framingAndOverrides',
      initialValue: 'cover',
      description:
        'Defaults to "cover" (fills the frame using the hotspot focal point). Choose "contain" for tall bottles, lamps, or irregular silhouettes that must never be cropped at the edges.',
      options: {
        list: [
          { title: 'Cover — Fill Frame Using Hotspot (cover)', value: 'cover' },
          { title: 'Contain — Show Entire Object With Warm Margin (contain)', value: 'contain' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'fallbackColor',
      title: 'Warm Surface Fallback Color (Hex)',
      type: 'string',
      fieldset: 'framingAndOverrides',
      initialValue: '#F6F4EF',
      description:
        'Background surface tint displayed while loading or around "contain" mode photography (e.g. #F6F4EF or #E5F5EE).',
      validation: (Rule) =>
        Rule.optional().regex(/^#[0-9A-Fa-f]{6}$/, { name: 'hex color' }),
    }),
    defineField({
      name: 'focalPoint',
      title: 'Explicit Focal Point Override (x, y)',
      type: 'imageFocalPoint',
      fieldset: 'framingAndOverrides',
      description:
        'Automatically populated from Sanity image hotspot when uploaded; can also be specified for external CDN URLs.',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'crop',
      title: 'Explicit Crop Inset Bounds',
      type: 'imageCropBox',
      fieldset: 'framingAndOverrides',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'landscapeOverrideUrl',
      title: 'Landscape Override URL (Optional 4:3 / 16:10 Composition)',
      type: 'url',
      fieldset: 'framingAndOverrides',
      description:
        'Optional manually composed landscape photograph used for 4:3 product page heroes and featured guide cards instead of auto-cropping the 1:1 master.',
      validation: (Rule) => Rule.optional().uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'portraitOverrideUrl',
      title: 'Portrait Override URL (Optional 4:5 Composition)',
      type: 'url',
      fieldset: 'framingAndOverrides',
      description:
        'Optional manually composed portrait photograph used for 4:5 Gift Finder cards and Quick View modals.',
      validation: (Rule) => Rule.optional().uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'width',
      title: 'Intrinsic Pixel Width',
      type: 'number',
      fieldset: 'framingAndOverrides',
      initialValue: 2400,
      validation: (Rule) => Rule.optional().positive().integer(),
    }),
    defineField({
      name: 'height',
      title: 'Intrinsic Pixel Height',
      type: 'number',
      fieldset: 'framingAndOverrides',
      initialValue: 2400,
      validation: (Rule) => Rule.optional().positive().integer(),
    }),
    defineField({
      name: 'isSampleAsset',
      title: 'Sample / Temporary Development Asset Flag',
      type: 'boolean',
      fieldset: 'framingAndOverrides',
      initialValue: false,
      description:
        'Enable only for temporary development sample photography.',
      validation: (Rule) => Rule.optional(),
    }),
  ],
  validation: (Rule) =>
    Rule.custom((val: Record<string, any> | undefined) => {
      if (!val) return true;
      const hasAsset = Boolean(val.asset);
      const hasUrl = typeof val.url === 'string' && val.url.trim().length > 0;
      if (!hasAsset && !hasUrl) {
        return 'Provide either a Sanity image asset or a valid HTTPS master image URL.';
      }
      return true;
    }),
  preview: {
    select: {
      title: 'alt',
      subtitle: 'fitMode',
      media: 'asset',
      caption: 'caption',
    },
    prepare({ title, subtitle, media, caption }) {
      return {
        title: title || 'Untitled Product Image',
        subtitle: `${subtitle === 'contain' ? 'Contain mode' : 'Cover mode'}${caption ? ` · ${caption}` : ''}`,
        media,
      };
    },
  },
});

export const editorialImageObject = defineType({
  name: 'editorialImage',
  title: 'Editorial Image (Hero & Feature Photography)',
  type: 'object',
  description:
    'Editorial photograph with Sanity hotspot/crop, mandatory accessible alt text, optional caption, and photography credit.',
  fields: [
    defineField({
      name: 'asset',
      title: 'Sanity Image Asset',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'url',
      title: 'External Image URL (Optional / Fallback)',
      type: 'url',
      description:
        'HTTPS image URL used when referencing external editorial photography.',
      validation: (Rule) => Rule.optional().uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'alt',
      title: 'Accessible Alt Text',
      type: 'string',
      description:
        'Required accessible description of the photograph for screen readers and search engines.',
      validation: (Rule) => Rule.required().min(8).max(220),
    }),
    defineField({
      name: 'caption',
      title: 'Editorial Caption (Optional)',
      type: 'string',
      validation: (Rule) => Rule.optional().max(260),
    }),
    defineField({
      name: 'credit',
      title: 'Photographer / Studio Credit (Optional)',
      type: 'string',
      validation: (Rule) => Rule.optional().max(120),
    }),
    defineField({
      name: 'aspectRatio',
      title: 'Preferred Aspect Ratio',
      type: 'string',
      initialValue: '16:10',
      options: {
        list: [
          { title: '16:10 Editorial Widescreen', value: '16:10' },
          { title: '4:3 Classic Editorial', value: '4:3' },
          { title: '1:1 Square', value: '1:1' },
          { title: '4:5 Vertical Portrait', value: '4:5' },
        ],
      },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'isSampleAsset',
      title: 'Sample / Development Photography Flag',
      type: 'boolean',
      initialValue: false,
      validation: (Rule) => Rule.optional(),
    }),
  ],
  preview: {
    select: {
      title: 'alt',
      subtitle: 'caption',
      media: 'asset',
    },
    prepare({ title, subtitle, media }) {
      return {
        title: title || 'Editorial Image',
        subtitle: subtitle || 'Hero / Section Photograph',
        media,
      };
    },
  },
});

export const seoMetadataObject = defineType({
  name: 'seoMetadata',
  title: 'SEO, Canonical URL, Social Sharing & Indexing Controls',
  type: 'object',
  description:
    'Decouples the HTML <title> tag from the visible on-page H1 heading, provides non-blocking length guidance, protects canonical URLs against cross-domain overrides, and manages search indexing.',
  fieldsets: [
    {
      name: 'socialSharing',
      title: 'OpenGraph & Social Card Overrides (Optional)',
      description:
        'Leave blank to inherit automatically from the SEO title, meta description, and hero/product image.',
      options: { collapsible: true, collapsed: true },
    },
    {
      name: 'indexingAndSchema',
      title: 'Canonical URL, Indexing & Structured Data Controls',
      options: { collapsible: true, collapsed: false },
    },
  ],
  fields: [
    defineField({
      name: 'seoTitle',
      title: 'SEO Title (HTML <title> Tag)',
      type: 'string',
      description:
        'Independent of the on-page H1 heading. Leave blank to auto-generate from the on-page title and "| Science of Gifts". Recommended: 35–65 characters (non-blocking guidance).',
      validation: (Rule) =>
        Rule.optional()
          .max(70)
          .warning(
            'Recommended 35–65 characters for optimal search display; longer titles may be truncated in search results, but saving is never blocked.'
          ),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      description:
        'Search snippet summary. Leave blank to auto-derive a clean whole-sentence summary from the subtitle or introduction. Recommended: 110–160 characters (non-blocking guidance).',
      validation: (Rule) =>
        Rule.optional()
          .max(165)
          .warning(
            'Recommended 110–160 characters for search snippets; longer descriptions may be truncated, but saving is never blocked.'
          ),
    }),
    defineField({
      name: 'canonicalPath',
      title: 'Canonical Path Override',
      type: 'string',
      fieldset: 'indexingAndSchema',
      description:
        'Normalized internal path starting and ending with "/" (e.g. "/gift-guides/thoughtful-host-and-gathering-gifts-under-100/"). Cross-domain URLs (such as external merchants) are rejected.',
      validation: (Rule) =>
        Rule.optional()
          .regex(/^\/([a-z0-9-/]*\/)?$/, {
            name: 'normalized internal path starting and ending with /',
          })
          .error(
            'Canonical path must be an internal path starting and ending with "/" (without query parameters or external domains).'
          ),
    }),
    defineField({
      name: 'indexing',
      title: 'Robots Indexing Directive',
      type: 'string',
      fieldset: 'indexingAndSchema',
      initialValue: 'noindex,follow',
      description:
        'New records default to "noindex,follow" until ready for public search indexing.',
      options: {
        list: [
          { title: 'Index & Follow — Public Search Indexing (index,follow)', value: 'index,follow' },
          { title: 'Noindex & Follow — Exclude From Search & Sitemap (noindex,follow)', value: 'noindex,follow' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'noindex',
      title: 'Exclude From Search Engines & XML Sitemap (noindex)',
      type: 'boolean',
      fieldset: 'indexingAndSchema',
      initialValue: true,
      description:
        'When enabled, outputs <meta name="robots" content="noindex, follow"> and omits this URL from /sitemap.xml.',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'ogTitle',
      title: 'Open Graph Title (og:title)',
      type: 'string',
      fieldset: 'socialSharing',
      description: 'Defaults to the resolved SEO Title when left blank.',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'ogDescription',
      title: 'Open Graph Description (og:description)',
      type: 'text',
      fieldset: 'socialSharing',
      description: 'Defaults to the resolved Meta Description when left blank.',
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'ogImage',
      title: 'Social Share Image URL (og:image)',
      type: 'url',
      fieldset: 'socialSharing',
      description:
        'Optional HTTPS social card image override (1200×630px recommended). Defaults to the hero or primary product image.',
      validation: (Rule) => Rule.optional().uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'ogType',
      title: 'Open Graph Object Type',
      type: 'string',
      fieldset: 'indexingAndSchema',
      options: {
        list: [
          { title: 'Article (article)', value: 'article' },
          { title: 'Product (product)', value: 'product' },
          { title: 'Website / Collection (website)', value: 'website' },
        ],
      },
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: 'schemaType',
      title: 'Primary Schema.org Structured Data Type',
      type: 'string',
      fieldset: 'indexingAndSchema',
      options: {
        list: [
          { title: 'ItemList (Gift Guide)', value: 'ItemList' },
          { title: 'Article (Editorial Essay)', value: 'Article' },
          { title: 'Product (Product Profile)', value: 'Product' },
          { title: 'CollectionPage (Hub or Archive)', value: 'CollectionPage' },
          { title: 'WebSite (Homepage)', value: 'WebSite' },
        ],
      },
      validation: (Rule) => Rule.optional(),
    }),
  ],
});

export const directorySeoEntryObject = defineType({
  name: 'directorySeoEntry',
  title: 'Directory or Landing Page SEO Entry',
  type: 'object',
  description:
    'Configures headline, deck copy, and SEO metadata for top-level directories (/gift-guides/, /articles/, /gift-finder/).',
  fields: [
    defineField({
      name: 'slug',
      title: 'Directory Slug',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'routePath',
      title: 'Canonical Route Path',
      type: 'string',
      description: 'E.g. "/gift-guides/", "/articles/", or "/gift-finder/".',
      validation: (Rule) =>
        Rule.required().regex(/^\/[a-z0-9-]+\/$/, {
          name: 'normalized directory path',
        }),
    }),
    defineField({
      name: 'title',
      title: 'Visible Directory H1 Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Directory Lead Subtitle',
      type: 'text',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      initialValue: 'published',
      options: {
        list: [
          { title: 'Published', value: 'published' },
          { title: 'Draft', value: 'draft' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'seo',
      title: 'SEO Metadata',
      type: 'seoMetadata',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'routePath',
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Directory SEO Entry',
        subtitle: subtitle || '/',
      };
    },
  },
});
