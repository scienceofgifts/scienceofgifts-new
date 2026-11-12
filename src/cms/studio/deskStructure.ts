/**
 * Science of Gifts — Sanity Studio Editorial Desk Structure
 *
 * Implements Section 3 (Design the Studio Around Editorial Workflows):
 * Organizes the Studio sidebar into three intuitive publishing pillars rather
 * than a generic alphabetical database table list:
 *
 * 1. Editorial Content
 *    - Gift Guides (All, Published, Drafts, Featured)
 *    - Products (All, Published & Verified, Drafts, Needs Commerce Verification, Sample/Placeholder Records, By Category)
 *    - Stories & Articles (All, Published, Drafts, By Topic)
 *    - Authors
 *    - Research Citations
 *
 * 2. Discovery & Organization
 *    - Gifts for Him and Gifts for Her (`editorialHub` documents for `/gifts-for-men/` & `/gifts-for-women/`)
 *    - Recipient Categories (`taxonomyArchive` filtered by `dimension == "recipient"`)
 *    - Interests (`taxonomyArchive` filtered by `dimension == "interest"`)
 *    - Occasions (`taxonomyArchive` filtered by `dimension == "occasion"`)
 *    - Article Topics (`taxonomyArchive` filtered by `dimension == "article-topic"`)
 *
 * 3. Publication Settings
 *    - Global Site Settings (Singleton `siteSettings`)
 *    - Homepage Features (Singleton `siteSettings` view)
 *    - Directory SEO (Singleton `siteSettings` view for `/gift-guides/`, `/articles/`, `/gift-finder/`)
 *    - About and Contact (`publicationInfoPage` for `/about/` & `/contact/`)
 *    - Editorial Policy (`publicationInfoPage` for `/editorial-policy/`)
 *    - Affiliate Disclosure (`publicationInfoPage` for `/affiliate-disclosure/`)
 *    - Other Publication Information Pages (`/privacy-policy/`, `/terms-of-use/`, and all info pages)
 */

import {
  ARTICLE_TOPIC_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
} from './taxonomyRegistry';
import { SITE_SETTINGS_SINGLETON_ID } from './schemas/documents/siteSettings';

export interface DeskListNode {
  id: string;
  title: string;
  type: 'list' | 'documentList' | 'document';
  icon?: string;
  description?: string;
  schemaType?: string;
  documentId?: string;
  filter?: string;
  params?: Record<string, unknown>;
  items?: DeskListNode[];
}

/**
 * Compatible with Sanity v3 `StructureBuilder` (`S`) API while also returning a
 * serializable, inspectable tree for automated verification.
 */
export function buildScienceOfGiftsDeskStructure(): DeskListNode {
  return {
    id: 'root',
    title: 'Science of Gifts Publishing Desk',
    type: 'list',
    items: [
      // =======================================================================
      // GROUP 1: EDITORIAL CONTENT
      // =======================================================================
      {
        id: 'editorial-content',
        title: 'Editorial Content',
        type: 'list',
        icon: 'BookOpen',
        description:
          'Curated gift guides, canonical product profiles, behavioral gifting stories, authors, and academic citations.',
        items: [
          {
            id: 'gift-guides-menu',
            title: 'Gift Guides',
            type: 'list',
            icon: 'BookOpen',
            items: [
              {
                id: 'gift-guides-all',
                title: 'All Gift Guides',
                type: 'documentList',
                schemaType: 'giftGuide',
                filter: '_type == "giftGuide"',
              },
              {
                id: 'gift-guides-published',
                title: 'Published Gift Guides',
                type: 'documentList',
                schemaType: 'giftGuide',
                filter: '_type == "giftGuide" && status == "published"',
              },
              {
                id: 'gift-guides-drafts',
                title: 'Draft Gift Guides (In Progress)',
                type: 'documentList',
                schemaType: 'giftGuide',
                filter: '_type == "giftGuide" && status == "draft"',
              },
              {
                id: 'gift-guides-featured',
                title: 'Featured in Directory Lead Slot',
                type: 'documentList',
                schemaType: 'giftGuide',
                filter: '_type == "giftGuide" && featured == true',
              },
            ],
          },
          {
            id: 'products-menu',
            title: 'Products',
            type: 'list',
            icon: 'Package',
            items: [
              {
                id: 'products-all',
                title: 'All Canonical Products',
                type: 'documentList',
                schemaType: 'product',
                filter: '_type == "product"',
              },
              {
                id: 'products-published-verified',
                title: 'Published & Commerce-Verified Products',
                type: 'documentList',
                schemaType: 'product',
                filter:
                  '_type == "product" && status == "published" && priceVerified == true && isSampleProduct != true',
              },
              {
                id: 'products-drafts',
                title: 'Draft Products (Unpublished)',
                type: 'documentList',
                schemaType: 'product',
                filter: '_type == "product" && status == "draft"',
              },
              {
                id: 'products-needs-verification',
                title: 'Needs Attention — Unverified Price or Inventory',
                type: 'documentList',
                schemaType: 'product',
                description:
                  'Products missing verified retail pricing or inventory confirmation.',
                filter:
                  '_type == "product" && (priceVerified != true || inventoryVerified != true) && isSampleProduct != true',
              },
              {
                id: 'products-samples',
                title: 'Sample & Placeholder Records (Non-Indexable)',
                type: 'documentList',
                schemaType: 'product',
                filter:
                  '_type == "product" && (isSampleProduct == true || isPlaceholderLink == true)',
              },
              {
                id: 'products-by-category',
                title: 'Products by Category',
                type: 'list',
                items: PRODUCT_CATEGORY_OPTIONS.map((cat) => ({
                  id: `products-cat-${cat.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                  title: cat.title,
                  type: 'documentList',
                  schemaType: 'product',
                  filter: '_type == "product" && productType == $category',
                  params: { category: cat.value },
                })),
              },
            ],
          },
          {
            id: 'stories-articles-menu',
            title: 'Stories & Articles',
            type: 'list',
            icon: 'FileText',
            items: [
              {
                id: 'articles-all',
                title: 'All Stories & Articles',
                type: 'documentList',
                schemaType: 'article',
                filter: '_type == "article"',
              },
              {
                id: 'articles-published',
                title: 'Published Stories',
                type: 'documentList',
                schemaType: 'article',
                filter: '_type == "article" && status == "published"',
              },
              {
                id: 'articles-drafts',
                title: 'Draft Stories (In Progress)',
                type: 'documentList',
                schemaType: 'article',
                filter: '_type == "article" && status == "draft"',
              },
              {
                id: 'articles-by-topic',
                title: 'Stories by Editorial Topic',
                type: 'list',
                items: ARTICLE_TOPIC_OPTIONS.map((topic) => ({
                  id: `articles-topic-${topic.value}`,
                  title: topic.title,
                  type: 'documentList',
                  schemaType: 'article',
                  filter: '_type == "article" && $topic in topics',
                  params: { topic: topic.value },
                })),
              },
            ],
          },
          {
            id: 'authors-list',
            title: 'Authors',
            type: 'documentList',
            icon: 'User',
            schemaType: 'author',
            filter: '_type == "author"',
          },
          {
            id: 'research-citations-list',
            title: 'Research Citations',
            type: 'documentList',
            icon: 'GraduationCap',
            schemaType: 'researchCitation',
            filter: '_type == "researchCitation"',
          },
        ],
      },

      // =======================================================================
      // GROUP 2: DISCOVERY & ORGANIZATION
      // =======================================================================
      {
        id: 'discovery-and-organization',
        title: 'Discovery & Organization',
        type: 'list',
        icon: 'Compass',
        description:
          'Flagship Gifts for Him / Gifts for Her discovery hubs and Recipient, Interest, Occasion, and Topic category archives.',
        items: [
          {
            id: 'editorial-hubs-menu',
            title: 'Gifts for Him and Gifts for Her',
            type: 'list',
            icon: 'Compass',
            items: [
              {
                id: 'hub-gifts-for-him-doc',
                title: 'Gifts for Him (/gifts-for-men/)',
                type: 'document',
                schemaType: 'editorialHub',
                documentId: 'hub_gifts_for_him',
              },
              {
                id: 'hub-gifts-for-her-doc',
                title: 'Gifts for Her (/gifts-for-women/)',
                type: 'document',
                schemaType: 'editorialHub',
                documentId: 'hub_gifts_for_her',
              },
              {
                id: 'editorial-hubs-all',
                title: 'All Editorial Discovery Hubs',
                type: 'documentList',
                schemaType: 'editorialHub',
                filter: '_type == "editorialHub"',
              },
            ],
          },
          {
            id: 'recipient-categories-list',
            title: 'Recipient Categories',
            type: 'documentList',
            icon: 'Users',
            schemaType: 'taxonomyArchive',
            description:
              'Archives at /gift-guides/recipients/[slug]/ (Partner, Parent, Friend, Host, Kids, Coworker).',
            filter: '_type == "taxonomyArchive" && dimension == "recipient"',
          },
          {
            id: 'interests-list',
            title: 'Interests',
            type: 'documentList',
            icon: 'Sparkles',
            schemaType: 'taxonomyArchive',
            description:
              'Archives at /gift-guides/interests/[slug]/ (Coffee & Tea, Cooking & Hosting, Cozy Sanctuary, etc.).',
            filter: '_type == "taxonomyArchive" && dimension == "interest"',
          },
          {
            id: 'occasions-list',
            title: 'Occasions',
            type: 'documentList',
            icon: 'Calendar',
            schemaType: 'taxonomyArchive',
            description:
              'Archives at /gift-guides/occasions/[slug]/ (Birthday, Housewarming, Anniversary, Thank You, Holidays, Just Because).',
            filter: '_type == "taxonomyArchive" && dimension == "occasion"',
          },
          {
            id: 'article-topics-list',
            title: 'Article Topics',
            type: 'documentList',
            icon: 'Tags',
            schemaType: 'taxonomyArchive',
            description:
              'Archives at /articles/topics/[slug]/ (Gift-Giving Psychology, Relationships, Decision-Making, Gift Etiquette, Practical Advice, Culture).',
            filter: '_type == "taxonomyArchive" && dimension == "article-topic"',
          },
        ],
      },

      // =======================================================================
      // GROUP 3: PUBLICATION SETTINGS
      // =======================================================================
      {
        id: 'publication-settings',
        title: 'Publication Settings',
        type: 'list',
        icon: 'Settings',
        description:
          'Global site configuration, homepage featured content, directory SEO, and publication policy pages.',
        items: [
          {
            id: 'global-site-settings',
            title: 'Global Site Settings',
            type: 'document',
            icon: 'Settings',
            schemaType: 'siteSettings',
            documentId: SITE_SETTINGS_SINGLETON_ID,
          },
          {
            id: 'homepage-features',
            title: 'Homepage Features',
            type: 'document',
            icon: 'Home',
            description:
              'Configure homepage featured product, featured guides, featured stories, and hero copy.',
            schemaType: 'siteSettings',
            documentId: SITE_SETTINGS_SINGLETON_ID,
          },
          {
            id: 'directory-seo',
            title: 'Directory SEO',
            type: 'document',
            icon: 'Globe',
            description:
              'Manage titles, subtitles, and SEO metadata for /gift-guides/, /articles/, and /gift-finder/.',
            schemaType: 'siteSettings',
            documentId: SITE_SETTINGS_SINGLETON_ID,
          },
          {
            id: 'about-and-contact',
            title: 'About and Contact',
            type: 'documentList',
            icon: 'Info',
            schemaType: 'publicationInfoPage',
            filter:
              '_type == "publicationInfoPage" && slug in ["about", "contact"]',
          },
          {
            id: 'editorial-policy-doc',
            title: 'Editorial Policy',
            type: 'document',
            icon: 'ShieldCheck',
            schemaType: 'publicationInfoPage',
            documentId: 'pub_info_editorial_policy',
          },
          {
            id: 'affiliate-disclosure-doc',
            title: 'Affiliate Disclosure',
            type: 'document',
            icon: 'FileCheck',
            schemaType: 'publicationInfoPage',
            documentId: 'pub_info_affiliate_disclosure',
          },
          {
            id: 'other-publication-pages',
            title: 'Other Publication Information Pages',
            type: 'documentList',
            icon: 'FileText',
            description:
              'Privacy Policy (/privacy-policy/), Terms of Use (/terms-of-use/), and all publication transparency pages.',
            schemaType: 'publicationInfoPage',
            filter: '_type == "publicationInfoPage"',
          },
        ],
      },
    ],
  };
}
