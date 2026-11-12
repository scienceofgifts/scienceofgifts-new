import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Compass,
  Copy,
  Database,
  FileCode2,
  FileText,
  FolderOpen,
  HelpCircle,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  ALL_SANITY_STUDIO_TYPES,
  SANITY_DOCUMENT_SCHEMAS,
} from '../../cms/studio/schemas';
import {
  DeskListNode,
  buildScienceOfGiftsDeskStructure,
} from '../../cms/studio/deskStructure';
import {
  ResolvedSanityEnvironmentConfig,
  SanityFieldSpec,
  SanityTypeSpec,
  evaluateDocumentPreview,
  isSanityStudioEnvConfigured,
  validateDocumentWithSchema,
} from '../../cms/studio/sanityCore';
import {
  evaluateEditorialDocumentLifecycle,
  evaluateProductPublicationLifecycle,
} from '../../cms/studio/publicationWorkflow';
import { SITE_SETTINGS_SINGLETON_ID } from '../../cms/studio/schemas/documents/siteSettings';
import {
  ARTICLES,
  AUTHORS,
  CITATIONS,
  GIFT_GUIDES,
  PRODUCTS,
} from '../../data/catalog';
import { contentRepository } from '../../cms/contentRepository';

export type SanityStudioDocument = Record<string, any> & {
  _id: string;
  _type: string;
  _rev?: string;
  _createdAt?: string;
  _updatedAt?: string;
  _sourceOrigin?: 'sanity-content-lake' | 'local-catalog-reference' | 'unsaved-local-draft';
};

export type DraftPersistenceState =
  | 'idle'
  | 'unsaved'
  | 'saving'
  | 'saved'
  | 'reloading'
  | 'error';

interface SanityStudioWorkspaceProps {
  envConfig: ResolvedSanityEnvironmentConfig;
}

function slugifyText(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function snakeCaseText(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

/**
 * Seeds the Studio workspace with existing reference records (Products, Guides, Articles,
 * Authors, Citations, Hubs, Info Pages, and Site Settings) converted into Sanity document
 * structure so editors can browse the desk structure and select references immediately.
 * Note: This only populates the Studio editing workspace; the public Astro website
 * remains on its local catalog.
 */
function buildInitialSeededStudioDocuments(): SanityStudioDocument[] {
  const docs: SanityStudioDocument[] = [];

  // 1. Authors
  for (const author of Object.values(AUTHORS)) {
    docs.push({
      _id: author.id,
      _type: 'author',
      _updatedAt: '2026-11-01T10:00:00Z',
      id: author.id,
      name: author.name,
      slug: { _type: 'slug', current: slugifyText(author.name) },
      role: author.role,
      bio: author.bio,
      avatarUrl: author.avatarUrl,
    });
  }

  // 2. Research Citations
  for (const citation of Object.values(CITATIONS)) {
    docs.push({
      _id: citation.id,
      _type: 'researchCitation',
      _updatedAt: '2026-11-01T10:00:00Z',
      id: citation.id,
      authors: citation.authors,
      year: citation.year,
      title: citation.title,
      publication: citation.publication,
      keyFinding: citation.keyFinding,
      doiOrUrl: citation.doiOrUrl,
    });
  }

  // 3. Canonical Products
  for (const product of Object.values(PRODUCTS)) {
    docs.push({
      _id: product.id,
      _type: 'product',
      _updatedAt: '2026-11-10T12:00:00Z',
      title: product.title,
      slug: { _type: 'slug', current: product.slug },
      productId: product.id,
      vendor: product.vendor,
      productType: product.productType,
      subtitle: product.subtitle,
      calloutTag: product.calloutTag ?? '',
      whyToGiveIt: product.whyToGiveIt,
      bestForSummary: product.bestForSummary,
      detailsAndCare: product.detailsAndCare,
      commerceProvider: product.commerceProvider,
      fulfillmentClassification:
        product.commerceProvider === 'fourthwall'
          ? 'owned-fourthwall-merch'
          : 'affiliate-partner',
      purchaseUrl: product.purchaseUrl,
      price: product.price,
      currency: product.currency,
      budgetTier: product.budgetTier,
      guidePriceBucket: product.guidePriceBucket,
      inStock: product.inStock,
      priceVerified: Boolean(product.priceVerified),
      priceVerificationSource: product.priceVerified
        ? 'manual-merchant-check'
        : 'unverified',
      priceVerificationEvidenceNote: product.priceVerified
        ? 'Verified against merchant product page'
        : '',
      inventoryVerified: Boolean(product.inventoryVerified),
      inventoryVerificationSource: 'unverified',
      isSampleProduct: Boolean(product.isSampleProduct),
      isPlaceholderLink: Boolean(product.isPlaceholderLink),
      recipients: product.recipients,
      interests: product.interests,
      occasions: product.occasions,
      personalityTraits: product.personalityTraits,
      ageRanges: product.ageRanges,
      images: product.images.map((img, idx) => ({
        _key: `img_${idx}`,
        _type: 'productImage',
        externalUrl: img.url,
        alt: img.alt,
        fitMode: img.fitMode ?? 'cover',
      })),
      status: product.status ?? 'published',
      editorialApproved: true,
      seo: {
        _type: 'seoMetadata',
        seoTitle: product.seo?.seoTitle ?? product.title,
        metaDescription: product.seo?.metaDescription ?? product.subtitle,
        canonicalPath:
          product.seo?.canonicalPath ?? `/products/${product.slug}/`,
        indexing: product.seo?.noindex ? 'noindex,follow' : 'index,follow',
      },
    });
  }

  // 4. Gift Guides
  for (const guide of GIFT_GUIDES) {
    docs.push({
      _id: guide.id,
      _type: 'giftGuide',
      _updatedAt: `${guide.updatedAt}T12:00:00Z`,
      id: guide.id,
      title: guide.title,
      slug: { _type: 'slug', current: guide.slug },
      subtitle: guide.subtitle,
      editorialIssueNumber: guide.editorialIssueNumber ?? '',
      curationSummary: guide.curationSummary ?? '',
      author: { _type: 'reference', _ref: guide.authorId },
      publishedAt: guide.publishedAt,
      updatedAt: guide.updatedAt,
      readTimeMinutes: guide.readTimeMinutes,
      accentTone: guide.accentTone,
      heroImage: {
        _type: 'editorialImage',
        externalUrl: guide.heroImageUrl,
        alt: guide.heroImageAlt,
      },
      introParagraphs: guide.introParagraphs ?? [],
      whoThisGuideIsFor: guide.whoThisGuideIsFor ?? [],
      editorsPick: guide.editorsPick
        ? {
            _type: 'guideEditorsPick',
            product: { _type: 'reference', _ref: guide.editorsPick.productId },
            awardLabel:
              guide.editorsPick.awardLabel ?? guide.editorsPick.kicker,
            editorialHook:
              guide.editorsPick.editorialHeadline ?? guide.editorsPick.headline,
            whyItStandsOut:
              guide.editorsPick.whyItStoodOut ??
              guide.editorsPick.editorialRationale,
            bestForCallout:
              guide.editorsPick.whoItFitsBest ??
              guide.editorsPick.intendedRecipientAndSituation,
          }
        : undefined,
      quickPicks: (guide.quickPicks ?? []).map((qp, idx) => ({
        _key: `qp_${idx}`,
        _type: 'guideQuickPick',
        label: qp.label,
        product: { _type: 'reference', _ref: qp.productId },
        oneLineReason: qp.reason,
        anchorId: qp.targetSectionId ?? '',
      })),
      sections: guide.sections.map((sec, sIdx) => ({
        _key: sec.id || `sec_${sIdx}`,
        _type: 'guideSection',
        id: sec.id,
        title: sec.title,
        navLabel: sec.shortNavTitle ?? sec.title,
        intro: sec.summary,
        recommendations: sec.recommendations.map((pick, pIdx) => ({
          _key: `rec_${sIdx}_${pIdx}`,
          _type: 'guideProductRecommendation',
          product: { _type: 'reference', _ref: pick.productId },
          presentationStyle: pick.presentationStyle ?? 'standard',
          editorialBadge: pick.awardLabel ?? '',
          whyWePickedIt: pick.customEditorialNote,
          bestForOverride: pick.idealFor ?? '',
          occasionFitOverride: pick.goodToKnow ?? '',
        })),
      })),
      buyingAdvice: (guide.buyingAdvice ?? []).map((ba, idx) => ({
        _key: `ba_${idx}`,
        _type: 'guideBuyingAdvice',
        title: ba.heading,
        body: ba.body,
      })),
      faqs: (guide.faqs ?? []).map((f, idx) => ({
        _key: `faq_${idx}`,
        _type: 'guideFaq',
        question: f.question,
        answer: f.answer,
      })),
      category: guide.category,
      recipients: guide.recipients ?? ['friend', 'partner'],
      occasions: guide.occasions ?? ['birthday', 'just-because'],
      interests: guide.interests ?? ['Daily Rituals'],
      personalityTraits: guide.personalityTraits ?? ['everyday-ritual'],
      budgetTiers: guide.budgetTiers ?? ['under-50', '50-to-100'],
      status: guide.status ?? 'published',
      featured: Boolean(guide.featured),
      affiliateDisclosure: guide.affiliateDisclosure,
      seo: {
        _type: 'seoMetadata',
        seoTitle: guide.seo.seoTitle ?? guide.title,
        metaDescription: guide.seo.metaDescription,
        canonicalPath: `/gift-guides/${guide.slug}/`,
        indexing: guide.seo.noindex ? 'noindex,follow' : 'index,follow',
      },
    });
  }

  // 5. Articles
  for (const article of ARTICLES) {
    docs.push({
      _id: article.id,
      _type: 'article',
      _updatedAt: `${article.updatedAt ?? article.publishedAt}T12:00:00Z`,
      id: article.id,
      title: article.title,
      slug: { _type: 'slug', current: article.slug },
      subtitle: article.subtitle,
      category: article.category,
      topics: article.topics ?? ['gift-giving-psychology'],
      author: { _type: 'reference', _ref: article.authorId },
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt ?? article.publishedAt,
      readTimeMinutes: article.readTimeMinutes ?? 6,
      heroImage: {
        _type: 'editorialImage',
        externalUrl: article.heroImageUrl,
        alt: article.heroAlt,
      },
      keyTakeaways: article.executiveSummary,
      introParagraphs: article.executiveSummary,
      sections: article.sections.map((sec, idx) => ({
        _key: `art_sec_${idx}`,
        _type: 'articleContentSection',
        id: sec.id,
        heading: sec.heading,
        paragraphs: sec.paragraphs,
      })),
      status: article.status ?? 'published',
      featured: Boolean(article.featured),
      seo: {
        _type: 'seoMetadata',
        seoTitle: article.seo.seoTitle ?? article.title,
        metaDescription: article.seo.metaDescription,
        canonicalPath: `/articles/${article.slug}/`,
        indexing: article.seo.noindex ? 'noindex,follow' : 'index,follow',
      },
    });
  }

  // 6. Editorial Discovery Hubs
  for (const hub of contentRepository.getAllEditorialHubs({
    includeDrafts: true,
  })) {
    docs.push({
      _id: hub.id,
      _type: 'editorialHub',
      _updatedAt: '2026-11-10T12:00:00Z',
      id: hub.id,
      title: hub.title,
      slug: { _type: 'slug', current: hub.slug },
      heroKicker: hub.kicker ?? hub.editorialKicker ?? '',
      subtitle: hub.subtitle,
      editorialIntro: hub.editorialPositioning,
      status: hub.status,
      seo: {
        _type: 'seoMetadata',
        seoTitle: hub.seo.seoTitle,
        metaDescription: hub.seo.metaDescription,
        canonicalPath: hub.routePath,
        indexing: hub.seo.noindex ? 'noindex,follow' : 'index,follow',
      },
    });
  }

  // 7. Taxonomy & Category Archives
  for (const cat of contentRepository.getAllCategorySeoEntries()) {
    const dim = cat.routePath.includes('/recipients/')
      ? 'recipient'
      : cat.routePath.includes('/occasions/')
      ? 'occasion'
      : cat.routePath.includes('/interests/')
      ? 'interest'
      : 'article-topic';
    docs.push({
      _id: `tax_${dim}_${cat.slug.replace(/[^a-z0-9]+/g, '_')}`,
      _type: 'taxonomyArchive',
      _updatedAt: '2026-11-10T12:00:00Z',
      dimension: dim,
      taxonomyKey: cat.slug,
      slug: { _type: 'slug', current: cat.slug },
      title: cat.title,
      subtitle: cat.subtitle,
      status: cat.status ?? 'published',
      seo: {
        _type: 'seoMetadata',
        seoTitle: cat.seo?.seoTitle ?? cat.title,
        metaDescription: cat.seo?.metaDescription ?? cat.subtitle,
        canonicalPath: cat.routePath,
        indexing: 'index,follow',
      },
    });
  }

  // 8. Publication Information Pages
  const infoPagesSeed = [
    {
      id: 'pub_info_about',
      slug: 'about',
      kicker: 'About the Publication',
      title: 'About Science of Gifts',
      subtitle:
        'An editorial gift publication grounded in behavioral research, material craft, and recipient suitability.',
    },
    {
      id: 'pub_info_contact',
      slug: 'contact',
      kicker: 'Contact & Editorial Inquiries',
      title: 'Contact Science of Gifts',
      subtitle:
        'How to reach our editorial team for gift guide inquiries, maker submissions, and corrections.',
    },
    {
      id: 'pub_info_editorial_policy',
      slug: 'editorial-policy',
      kicker: 'Standards & Independence',
      title: 'Editorial Policy & Curation Standards',
      subtitle:
        'How we evaluate gifts, verify commercial claims, cite academic research, and maintain editorial independence.',
    },
    {
      id: 'pub_info_affiliate_disclosure',
      slug: 'affiliate-disclosure',
      kicker: 'Reader Transparency',
      title: 'Affiliate & Commerce Disclosure',
      subtitle:
        'How reader-supported affiliate commissions and our Fourthwall shop work alongside independent editorial curation.',
    },
    {
      id: 'pub_info_privacy_policy',
      slug: 'privacy-policy',
      kicker: 'Privacy & Data',
      title: 'Privacy Policy',
      subtitle:
        'How Science of Gifts handles browser-stored saved gift lists, analytics, and reader privacy.',
    },
    {
      id: 'pub_info_terms_of_use',
      slug: 'terms-of-use',
      kicker: 'Publication Terms',
      title: 'Terms of Use',
      subtitle:
        'Terms governing the use of Science of Gifts editorial content, guides, and external merchant links.',
    },
  ];

  for (const page of infoPagesSeed) {
    docs.push({
      _id: page.id,
      _type: 'publicationInfoPage',
      _updatedAt: '2026-11-10T12:00:00Z',
      slug: { _type: 'slug', current: page.slug },
      kicker: page.kicker,
      title: page.title,
      subtitle: page.subtitle,
      lastUpdated: '2026-11-10',
      status: 'published',
      seo: {
        _type: 'seoMetadata',
        seoTitle: `${page.title} — Science of Gifts`,
        metaDescription: page.subtitle,
        canonicalPath: `/${page.slug}/`,
        indexing: 'index,follow',
      },
    });
  }

  // 8. Singleton Site Settings
  docs.push({
    _id: SITE_SETTINGS_SINGLETON_ID,
    _type: 'siteSettings',
    _updatedAt: '2026-11-12T12:00:00Z',
    publicationTitle: 'Science of Gifts',
    publicationTagline:
      'Behavioral research, tactile craft, and thoughtful gift discovery.',
    canonicalDomain: 'https://www.scienceofgifts.com',
    shopExternalUrl: 'https://shop.scienceofgifts.com',
      shortInlineAffiliateNotice:
      'Science of Gifts is reader-supported. When you buy through links on our site, we may earn an affiliate commission.',
  });

  return docs.map((d) => ({
    ...d,
    _sourceOrigin: 'local-catalog-reference',
  }));
}

/**
 * Evaluates whether a SanityStudioDocument matches a DeskListNode filter string.
 */
function matchesDeskFilter(
  doc: SanityStudioDocument,
  node: DeskListNode
): boolean {
  if (node.schemaType && doc._type !== node.schemaType) {
    return false;
  }
  const f = node.filter ?? '';
  if (!f) return true;

  if (f.includes('status == "draft"')) {
    return doc.status === 'draft' || doc._id.startsWith('drafts.');
  }
  if (
    f.includes(
      'status == "published" && priceVerified == true && isSampleProduct != true'
    )
  ) {
    return (
      doc.status === 'published' &&
      doc.priceVerified === true &&
      !doc.isSampleProduct
    );
  }
  if (f.includes('status == "published"')) {
    return doc.status === 'published' && !doc._id.startsWith('drafts.');
  }
  if (f.includes('featured == true')) {
    return Boolean(doc.featured);
  }
  if (
    f.includes(
      '(priceVerified != true || inventoryVerified != true) && isSampleProduct != true'
    )
  ) {
    return (
      (!doc.priceVerified || !doc.inventoryVerified) && !doc.isSampleProduct
    );
  }
  if (f.includes('isSampleProduct == true || isPlaceholderLink == true')) {
    return Boolean(doc.isSampleProduct || doc.isPlaceholderLink);
  }
  if (f.includes('productType == $category') && node.params?.category) {
    return doc.productType === node.params.category;
  }
  if (f.includes('$topic in topics') && node.params?.topic) {
    return Array.isArray(doc.topics) && doc.topics.includes(node.params.topic);
  }
  if (f.includes('dimension == "recipient"')) {
    return doc.dimension === 'recipient';
  }
  if (f.includes('dimension == "interest"')) {
    return doc.dimension === 'interest';
  }
  if (f.includes('dimension == "occasion"')) {
    return doc.dimension === 'occasion';
  }
  if (f.includes('dimension == "article-topic"')) {
    return doc.dimension === 'article-topic';
  }
  if (f.includes('slug in ["about", "contact"]')) {
    const slugVal =
      typeof doc.slug === 'string' ? doc.slug : doc.slug?.current ?? '';
    return slugVal === 'about' || slugVal === 'contact';
  }
  return true;
}

/**
 * Creates a fresh blank draft document for a given Sanity schema type using its `initialValue`.
 */
function createBlankDraftDocument(schema: SanityTypeSpec): SanityStudioDocument {
  const randomSuffix = Math.random().toString(36).slice(2, 7);
  const initialObj =
    typeof schema.initialValue === 'function'
      ? schema.initialValue()
      : schema.initialValue
      ? { ...schema.initialValue }
      : {};

  const baseDoc: SanityStudioDocument = {
    _id: `drafts.${schema.name}_${randomSuffix}`,
    _type: schema.name,
    _updatedAt: new Date().toISOString(),
    ...initialObj,
  };

  for (const field of schema.fields) {
    if (baseDoc[field.name] !== undefined) continue;
    if (field.initialValue !== undefined) {
      baseDoc[field.name] =
        typeof field.initialValue === 'function'
          ? field.initialValue()
          : field.initialValue;
      continue;
    }
    if (field.type === 'slug') {
      baseDoc[field.name] = { _type: 'slug', current: '' };
    } else if (field.type === 'array') {
      baseDoc[field.name] = [];
    } else if (field.type === 'boolean') {
      baseDoc[field.name] = false;
    }
  }

  if (schema.name === 'product' && !baseDoc.productId) {
    baseDoc.productId = `prod_draft_${randomSuffix}`;
  }
  if (schema.name === 'giftGuide' && !baseDoc.id) {
    baseDoc.id = `guide_draft_${randomSuffix}`;
    baseDoc.publishedAt = '2026-11-12';
    baseDoc.updatedAt = '2026-11-12';
  }

  return baseDoc;
}

/**
 * Generates realistic starter values for a Draft Product or Draft Gift Guide
 * so a first-time Sanity user can test editing, reference linking, and validation immediately.
 */
function buildExampleStarterDraft(
  schemaName: string,
  existingDocs: SanityStudioDocument[]
): Partial<SanityStudioDocument> {
  if (schemaName === 'product') {
    return {
      title: 'Hasami Porcelain Stacking Mug & Ash Lid',
      slug: {
        _type: 'slug',
        current: 'hasami-porcelain-stacking-mug-ash-lid',
      },
      productId: 'prod_hasami_porcelain_mug_lid',
      vendor: 'Hasami Porcelain (Nagasaki, Japan)',
      productType: 'Tea & Coffee Rituals',
      subtitle:
        'Matte sandstone-clay mug with a fitted wooden coaster lid that keeps morning tea warm.',
      calloutTag: 'Daily Ritual Upgrade',
      whyToGiveIt:
        'Fired in Nagasaki from a proprietary blend of porcelain and Amakusa natural stone, this tactile mug solves the lukewarm-coffee problem with a turned ash-wood lid that doubles as a saucer or coaster.',
      bestForSummary:
        'Remote workers, tea drinkers, and design-minded friends who savor quiet mornings.',
      detailsAndCare:
        '385 ml capacity. 8.5 cm diameter × 8.9 cm height. Mug is dishwasher and microwave safe; hand-wash wooden lid.',
      commerceProvider: 'affiliate',
      fulfillmentClassification: 'affiliate-partner',
      purchaseUrl: 'https://www.tortoisegeneralstore.com/products/hasami-mug',
      price: 42,
      currency: 'USD',
      budgetTier: 'under-50',
      guidePriceBucket: '25-to-75',
      inStock: true,
      priceVerified: false,
      priceVerificationSource: 'unverified',
      inventoryVerified: false,
      inventoryVerificationSource: 'unverified',
      isSampleProduct: false,
      isPlaceholderLink: false,
      recipients: ['friend', 'partner', 'coworker'],
      interests: ['Coffee & Tea', 'Slow Mornings'],
      occasions: ['birthday', 'housewarming', 'thank-you'],
      personalityTraits: ['everyday-ritual', 'cozy-homebody'],
      ageRanges: ['adult'],
      images: [
        {
          _key: 'img_starter_1',
          _type: 'productImage',
          externalUrl: '/assets/products/carafe-primary.svg',
          alt: 'Matte black Hasami porcelain mug with natural ash wood lid on linen surface',
          aspectRatio: '1:1',
          fitMode: 'cover',
        },
      ],
      status: 'draft',
      editorialApproved: false,
      seo: {
        _type: 'seoMetadata',
        seoTitle:
          'Hasami Porcelain Stacking Mug Gift Review — Science of Gifts',
        metaDescription:
          'Why the tactile Hasami Porcelain Mug & Ash Wood Lid makes an unforgettable under-$50 gift for tea and coffee lovers.',
        canonicalPath: '/products/hasami-porcelain-stacking-mug-ash-lid/',
        indexing: 'noindex,follow',
      },
    };
  }

  if (schemaName === 'giftGuide') {
    // Prefer picking any user-created draft product first so they see their own draft product linked!
    const draftProduct = existingDocs.find(
      (d) => d._type === 'product' && d._id.startsWith('drafts.')
    );
    const firstProduct =
      draftProduct ||
      existingDocs.find((d) => d._type === 'product') || {
        _id: 'prod_fluted_bedside_carafe_09',
      };
    const secondProduct =
      existingDocs.find(
        (d) => d._type === 'product' && d._id !== firstProduct._id
      ) || firstProduct;
    const firstAuthor = existingDocs.find((d) => d._type === 'author') || {
      _id: 'author_clara_vance',
    };

    return {
      title: 'The Quiet Morning Edit: 7 Tactile Gifts for Slow Coffee & Tea Rituals',
      slug: {
        _type: 'slug',
        current: 'quiet-morning-coffee-tea-ritual-gifts',
      },
      id: 'guide_quiet_morning_rituals',
      subtitle:
        'Thoughtful, tactile pieces that elevate the first twenty minutes of every day—without cluttering their kitchen counter.',
      editorialIssueNumber: 'Guide No. 05 · Morning Rituals',
      curationSummary:
        'Evaluated across 30+ independent ceramic studios and Japanese tableware makers.',
      author: { _type: 'reference', _ref: firstAuthor._id },
      publishedAt: '2026-11-12',
      updatedAt: '2026-11-12',
      readTimeMinutes: 7,
      accentTone: 'mint',
      heroImage: {
        _type: 'editorialImage',
        externalUrl: '/assets/products/carafe-primary.svg',
        alt: 'Morning ceramic drinkware arranged on warm travertine stone',
      },
      introParagraphs: [
        'Behavioral gifting research shows that the most appreciated gifts are those integrated into an existing daily habit. Because almost everyone has a morning beverage routine, upgrading the vessel they reach for at 7:30 a.m. delivers a daily moment of warmth.',
      ],
      whoThisGuideIsFor: [
        'Friends or partners who treasure their morning pour-over or matcha ritual',
        'Remote workers who keep a mug on their desk all morning',
      ],
      editorsPick: {
        _type: 'guideEditorsPick',
        product: { _type: 'reference', _ref: firstProduct._id },
        awardLabel: "Editor's Top Ritual Upgrade",
        editorialHook:
          'A museum-worthy everyday object that feels custom-chosen without guessing personal clothing sizes.',
        whyItStandsOut:
          'Combines architectural proportions with everyday durability so it never sits unused in a cabinet.',
        bestForCallout:
          'Best for partners, close friends, and thoughtful housewarming gestures.',
      },
      quickPicks: [
        {
          _key: 'qp_1',
          _type: 'guideQuickPick',
          label: 'Best Overall Morning Vessel',
          product: { _type: 'reference', _ref: firstProduct._id },
          oneLineReason: 'Tactile craftsmanship that elevates every morning brew.',
          anchorId: 'daily-vessels',
        },
        {
          _key: 'qp_2',
          _type: 'guideQuickPick',
          label: 'Best Companion Tableware',
          product: { _type: 'reference', _ref: secondProduct._id },
          oneLineReason: 'Pairs effortlessly with slow weekend breakfasts.',
          anchorId: 'daily-vessels',
        },
      ],
      sections: [
        {
          _key: 'sec_daily_vessels',
          _type: 'guideSection',
          id: 'daily-vessels',
          title: 'Tactile Vessels for the First Cup of the Day',
          navLabel: 'Daily Vessels',
          intro:
            'Objects with weight, texture, and thermal retention that make an ordinary Tuesday morning feel unhurried.',
          recommendations: [
            {
              _key: 'rec_1',
              _type: 'guideProductRecommendation',
              product: { _type: 'reference', _ref: firstProduct._id },
              presentationStyle: 'featured',
              editorialBadge: 'Top Ritual Pick',
              whyWePickedIt:
                'Every time they lift this piece, the balanced weight and satin finish turn a routine habit into a grounding pause.',
              bestForOverride: 'Tea & coffee devotees who appreciate quiet craft',
              occasionFitOverride: 'Birthday, Housewarming, or Thank-You Gift',
            },
            {
              _key: 'rec_2',
              _type: 'guideProductRecommendation',
              product: { _type: 'reference', _ref: secondProduct._id },
              presentationStyle: 'standard',
              editorialBadge: 'Editor Favorite',
              whyWePickedIt:
                'An heirloom-grade companion piece that anchors a bedside table or breakfast nook.',
              bestForOverride: 'Design lovers and gracious hosts',
              occasionFitOverride: 'Anniversary or Holidays',
            },
          ],
        },
      ],
      buyingAdvice: [
        {
          _key: 'ba_1',
          _type: 'guideBuyingAdvice',
          title: 'Prioritize Tactile Weight and Easy Care',
          body: 'A daily ritual gift only succeeds if it is effortless to clean and pleasant to hold. Look for stoneware or borosilicate glass that transitions seamlessly into daily use.',
        },
      ],
      faqs: [
        {
          _key: 'faq_1',
          _type: 'guideFaq',
          question: 'Can I link a Draft Product inside a Draft Gift Guide?',
          answer:
            'Yes! In Sanity Studio, you can reference your unpublished Draft Product while assembling a Draft Gift Guide, and validate both before publishing.',
        },
      ],
      category: 'Everyday Rituals & Under $100',
      recipients: ['friend', 'partner', 'host'],
      occasions: ['birthday', 'housewarming', 'thank-you'],
      interests: ['Coffee, Tea & Drinkware', 'Daily Rituals'],
      personalityTraits: ['everyday-ritual', 'cozy-homebody'],
      budgetTiers: ['under-50', '50-to-100'],
      status: 'draft',
      featured: false,
      affiliateDisclosure:
        'Science of Gifts is an independent editorial publication. We select every item based on behavioral research and tactile craft; when you buy through our links, we may earn an affiliate commission at no extra cost to you.',
      seo: {
        _type: 'seoMetadata',
        seoTitle:
          '7 Tactile Coffee & Tea Ritual Gifts (2026 Guide) — Science of Gifts',
        metaDescription:
          'Discover editor-curated morning coffee and tea gifts grounded in behavioral gifting research.',
        canonicalPath: '/gift-guides/quiet-morning-coffee-tea-ritual-gifts/',
        indexing: 'noindex,follow',
      },
    };
  }

  return {};
}

export const SanityStudioWorkspace: React.FC<SanityStudioWorkspaceProps> = ({
  envConfig,
}) => {
  const deskRoot = useMemo(() => buildScienceOfGiftsDeskStructure(), []);
  const schemaMap = useMemo(() => {
    const map = new Map<string, SanityTypeSpec>();
    for (const s of ALL_SANITY_STUDIO_TYPES) {
      map.set(s.name, s);
    }
    return map;
  }, []);

  // Studio documents state:
  // - Real drafts (`drafts.*`) are loaded directly from Sanity Content Lake via `/api/studio/sanity/drafts`
  // - Local catalog items are kept as read-only reference records (`_sourceOrigin: 'local-catalog-reference'`)
  // - Never uses localStorage for draft storage or fallback.
  const [documents, setDocuments] = useState<SanityStudioDocument[]>(() =>
    buildInitialSeededStudioDocuments()
  );

  // Explicit Persistence Lifecycle State for the Active Document
  const [persistenceStateByDocId, setPersistenceStateByDocId] = useState<
    Record<string, DraftPersistenceState>
  >({});
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [serverValidationIssues, setServerValidationIssues] = useState<
    Array<{ path: string; message: string }>
  >([]);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(
    null
  );

  // Live Sanity Content Lake Status via Server API
  const [cloudStatus, setCloudStatus] = useState<{
    checking: boolean;
    reachable: boolean | null;
    hasWriteToken: boolean;
    draftCount: number | null;
    publishedCount: number | null;
    message: string;
  }>({
    checking: false,
    reachable: null,
    hasWriteToken: false,
    draftCount: null,
    publishedCount: null,
    message: 'Verifying server-side Sanity Content Lake connection...',
  });

  const syncDraftsFromSanityContentLake = async () => {
    setCloudStatus((prev) => ({ ...prev, checking: true }));
    try {
      const [statusRes, draftsRes] = await Promise.all([
        fetch('/api/studio/sanity/status', { cache: 'no-store' }),
        fetch('/api/studio/sanity/drafts', { cache: 'no-store' }),
      ]);

      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        setCloudStatus({
          checking: false,
          reachable: Boolean(statusJson.reachable),
          hasWriteToken: Boolean(statusJson.hasWriteToken),
          draftCount:
            typeof statusJson.draftCount === 'number'
              ? statusJson.draftCount
              : 0,
          publishedCount:
            typeof statusJson.publishedCount === 'number'
              ? statusJson.publishedCount
              : 0,
          message:
            statusJson.message ||
            `Connected to ${envConfig.projectId} (${envConfig.dataset})`,
        });
      }

      if (draftsRes.ok) {
        const draftsJson = await draftsRes.json();
        const remoteDrafts: SanityStudioDocument[] = Array.isArray(
          draftsJson?.drafts
        )
          ? draftsJson.drafts.map((d: SanityStudioDocument) => ({
              ...d,
              _sourceOrigin: 'sanity-content-lake' as const,
            }))
          : [];

        setDocuments((prev) => {
          const remoteIds = new Set(remoteDrafts.map((d) => d._id));
          // Keep unsaved local drafts that haven't been saved yet, plus read-only local catalog references
          const remaining = prev.filter(
            (doc) =>
              !remoteIds.has(doc._id) &&
              doc._sourceOrigin !== 'sanity-content-lake'
          );
          return [...remoteDrafts, ...remaining];
        });

        setPersistenceStateByDocId((prev) => {
          const next = { ...prev };
          for (const d of remoteDrafts) {
            next[d._id] = 'saved';
          }
          return next;
        });
      }
    } catch (err: any) {
      setCloudStatus({
        checking: false,
        reachable: false,
        hasWriteToken: false,
        draftCount: null,
        publishedCount: null,
        message: `Failed to reach server Sanity API: ${
          err?.message ?? String(err)
        }`,
      });
    }
  };

  useEffect(() => {
    syncDraftsFromSanityContentLake();
  }, [envConfig.projectId, envConfig.dataset]);

  // Desk Navigation State
  const [expandedDeskNodeIds, setExpandedDeskNodeIds] = useState<string[]>([
    'editorial-content',
    'products-menu',
    'gift-guides-menu',
    'discovery-and-organization',
    'publication-settings',
  ]);
  const [selectedDeskNodeId, setSelectedDeskNodeId] =
    useState<string>('products-all');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(
    'prod_fluted_bedside_carafe_09'
  );
  const [activeGroupTab, setActiveGroupTab] = useState<string>('identity');
  const [docSearchQuery, setDocSearchQuery] = useState<string>('');
  const [showBeginnerGuide, setShowBeginnerGuide] = useState<boolean>(true);
  const [saveToastMessage, setSaveToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setSaveToastMessage(msg);
    setTimeout(() => {
      setSaveToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  // Find DeskListNode by ID recursively
  const findDeskNode = (
    node: DeskListNode,
    targetId: string
  ): DeskListNode | null => {
    if (node.id === targetId) return node;
    for (const child of node.items ?? []) {
      const found = findDeskNode(child, targetId);
      if (found) return found;
    }
    return null;
  };

  const activeDeskNode = useMemo(
    () =>
      findDeskNode(deskRoot, selectedDeskNodeId) ??
      deskRoot.items?.[0]?.items?.[1]?.items?.[0] ??
      deskRoot,
    [deskRoot, selectedDeskNodeId]
  );

  // Filtered documents for the active Desk Node
  const filteredDeskDocuments = useMemo(() => {
    if (activeDeskNode.type === 'document' && activeDeskNode.documentId) {
      return documents.filter((d) => d._id === activeDeskNode.documentId);
    }
    if (!activeDeskNode.schemaType) return [];
    const q = docSearchQuery.trim().toLowerCase();
    return documents.filter((doc) => {
      if (!matchesDeskFilter(doc, activeDeskNode)) return false;
      if (!q) return true;
      const hay = [
        doc.title,
        doc.name,
        doc.vendor,
        doc.productId,
        doc.id,
        doc._id,
        typeof doc.slug === 'string' ? doc.slug : doc.slug?.current,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [documents, activeDeskNode, docSearchQuery]);

  // Currently active document in the editor
  const activeDocument = useMemo(() => {
    if (activeDeskNode.type === 'document' && activeDeskNode.documentId) {
      return (
        documents.find((d) => d._id === activeDeskNode.documentId) ?? null
      );
    }
    return documents.find((d) => d._id === selectedDocumentId) ?? null;
  }, [documents, activeDeskNode, selectedDocumentId]);

  const activeSchema = useMemo(() => {
    if (!activeDocument) return null;
    return schemaMap.get(activeDocument._type) ?? null;
  }, [activeDocument, schemaMap]);

  // Ensure activeGroupTab stays valid when switching document types
  useEffect(() => {
    if (!activeSchema) return;
    const groups = activeSchema.groups ?? [];
    if (groups.length === 0) {
      setActiveGroupTab('all');
      return;
    }
    if (
      activeGroupTab !== 'all' &&
      activeGroupTab !== 'json' &&
      !groups.some((g) => g.name === activeGroupTab)
    ) {
      const defaultGrp = groups.find((g) => g.default) ?? groups[0];
      setActiveGroupTab(defaultGrp.name);
    }
  }, [activeSchema, activeDocument?._id]);

  // Live Schema & Publication Lifecycle Validation for activeDocument
  const validationResult = useMemo(() => {
    if (!activeDocument || !activeSchema) {
      return { valid: true, errors: [], warnings: [] };
    }
    return validateDocumentWithSchema(activeSchema, activeDocument);
  }, [activeDocument, activeSchema]);

  const lifecycleEvaluation = useMemo(() => {
    if (!activeDocument) return null;
    if (activeDocument._type === 'product') {
      return evaluateProductPublicationLifecycle(activeDocument);
    }
    return evaluateEditorialDocumentLifecycle(activeDocument);
  }, [activeDocument]);

  // Reopen / Load a draft directly from Sanity Content Lake when selected
  const loadDraftFromSanityById = async (docId: string) => {
    if (!docId.startsWith('drafts.')) return;
    setPersistenceError(null);
    setServerValidationIssues([]);
    setPersistenceStateByDocId((prev) => ({
      ...prev,
      [docId]: 'reloading',
    }));

    try {
      const res = await fetch(
        `/api/studio/sanity/document?id=${encodeURIComponent(docId)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) {
        // If this is a brand-new local draft not yet saved to Sanity Content Lake
        setPersistenceStateByDocId((prev) => ({
          ...prev,
          [docId]: 'unsaved',
        }));
        return;
      }
      const data = await res.json();
      if (data?.ok && data.document) {
        const remoteDoc: SanityStudioDocument = {
          ...data.document,
          _sourceOrigin: 'sanity-content-lake',
        };
        setDocuments((prev) => {
          const exists = prev.some((d) => d._id === docId);
          if (!exists) return [remoteDoc, ...prev];
          return prev.map((d) => (d._id === docId ? remoteDoc : d));
        });
        setPersistenceStateByDocId((prev) => ({
          ...prev,
          [docId]: 'saved',
        }));
      }
    } catch (err: any) {
      setPersistenceStateByDocId((prev) => ({
        ...prev,
        [docId]: 'error',
      }));
      setPersistenceError(
        `Failed to reload draft "${docId}" from Sanity Content Lake: ${
          err?.message ?? String(err)
        }`
      );
    }
  };

  const handleSelectDocument = (docId: string) => {
    setSelectedDocumentId(docId);
    setPersistenceError(null);
    setServerValidationIssues([]);
    const targetDoc = documents.find((d) => d._id === docId);
    if (
      docId.startsWith('drafts.') &&
      targetDoc?._sourceOrigin === 'sanity-content-lake'
    ) {
      loadDraftFromSanityById(docId);
    }
  };

  // Handlers to create, update, save, and delete documents
  const handleCreateNewDocument = (schemaTypeName: string) => {
    const schema = schemaMap.get(schemaTypeName);
    if (!schema || schema.singleton) return;

    const newDraft: SanityStudioDocument = {
      ...createBlankDraftDocument(schema),
      _sourceOrigin: 'unsaved-local-draft',
    };
    setDocuments((prev) => [newDraft, ...prev]);
    setSelectedDocumentId(newDraft._id);
    setPersistenceError(null);
    setServerValidationIssues([]);
    setPersistenceStateByDocId((prev) => ({
      ...prev,
      [newDraft._id]: 'unsaved',
    }));

    if (schemaTypeName === 'product') {
      setSelectedDeskNodeId('products-drafts');
      setActiveGroupTab('identity');
      triggerToast(
        'Created new unsaved Draft Product. Fill in fields (or click "Fill Example Draft Values"), then click "Save Draft to Sanity".'
      );
    } else if (schemaTypeName === 'giftGuide') {
      setSelectedDeskNodeId('gift-guides-drafts');
      setActiveGroupTab('overview');
      triggerToast(
        'Created new unsaved Draft Gift Guide. Fill in fields, then click "Save Draft to Sanity".'
      );
    } else {
      const defaultGrp = schema.groups?.[0]?.name ?? 'all';
      setActiveGroupTab(defaultGrp);
      triggerToast(
        `Created new unsaved Draft ${schema.title}. Click "Save Draft to Sanity" to persist.`
      );
    }
  };

  const handleLoadStarterValues = () => {
    if (!activeDocument) return;
    const starter = buildExampleStarterDraft(activeDocument._type, documents);
    setDocuments((prev) =>
      prev.map((doc) =>
        doc._id === activeDocument._id
          ? {
              ...doc,
              ...starter,
              _updatedAt: new Date().toISOString(),
            }
          : doc
      )
    );
    setPersistenceError(null);
    setServerValidationIssues([]);
    setPersistenceStateByDocId((prev) => ({
      ...prev,
      [activeDocument._id]: 'unsaved',
    }));
    triggerToast(
      `Loaded example ${
        activeDocument._type === 'product'
          ? 'Draft Product'
          : 'Draft Gift Guide'
      } values (State: Unsaved). Click "Save Draft to Sanity" to persist to Sanity Content Lake.`
    );
  };

  const updateActiveDocumentField = (fieldName: string, value: any) => {
    if (!activeDocument) return;
    setDocuments((prev) =>
      prev.map((doc) =>
        doc._id === activeDocument._id
          ? {
              ...doc,
              [fieldName]: value,
              _updatedAt: new Date().toISOString(),
            }
          : doc
      )
    );
    setPersistenceError(null);
    setPersistenceStateByDocId((prev) => ({
      ...prev,
      [activeDocument._id]: 'unsaved',
    }));
  };

  const handleSaveDraftToSanity = async () => {
    if (!activeDocument) return;
    const currentId = activeDocument._id;
    const targetDraftId = currentId.startsWith('drafts.')
      ? currentId
      : `drafts.${currentId}`;

    setPersistenceError(null);
    setServerValidationIssues([]);
    setPersistenceStateByDocId((prev) => ({
      ...prev,
      [currentId]: 'saving',
      [targetDraftId]: 'saving',
    }));

    try {
      const res = await fetch('/api/studio/sanity/save-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: {
            ...activeDocument,
            _id: targetDraftId,
            status: 'draft',
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.persistedDocument) {
        const blockingErrors = Array.isArray(
          data?.serverValidation?.blockingDraftErrors
        )
          ? data.serverValidation.blockingDraftErrors
          : [];
        setServerValidationIssues(blockingErrors);
        setPersistenceError(
          data?.message ||
            `Sanity Content Lake rejected the draft save (HTTP ${res.status}).`
        );
        setPersistenceStateByDocId((prev) => ({
          ...prev,
          [currentId]: 'error',
          [targetDraftId]: 'error',
        }));
        return;
      }

      const persistedDoc: SanityStudioDocument = {
        ...data.persistedDocument,
        _sourceOrigin: 'sanity-content-lake',
      };

      setDocuments((prev) => {
        // If saving a draft created from a local reference item, keep the reference item untouched and add/replace the `drafts.*` document
        const withoutTargetDraft = prev.filter((d) => d._id !== targetDraftId);
        if (currentId !== targetDraftId) {
          return [persistedDoc, ...withoutTargetDraft];
        }
        return prev.map((d) => (d._id === currentId ? persistedDoc : d));
      });

      setSelectedDocumentId(persistedDoc._id);
      setLastTransactionId(data.transactionId ?? null);
      setPersistenceStateByDocId((prev) => ({
        ...prev,
        [persistedDoc._id]: 'saved',
      }));
      syncDraftsFromSanityContentLake();
      triggerToast(
        `Saved "${
          persistedDoc.title || persistedDoc.name || persistedDoc._id
        }" to Sanity Content Lake (rev: ${persistedDoc._rev}).`
      );
    } catch (err: any) {
      setPersistenceError(
        `Network error while saving draft to Sanity Content Lake: ${
          err?.message ?? String(err)
        }`
      );
      setPersistenceStateByDocId((prev) => ({
        ...prev,
        [currentId]: 'error',
      }));
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (docId === SITE_SETTINGS_SINGLETON_ID) return;
    if (!docId.startsWith('drafts.')) {
      setPersistenceError(
        'Refusing to delete published or local reference catalog record. Only `drafts.*` documents can be deleted.'
      );
      return;
    }

    const target = documents.find((d) => d._id === docId);
    if (target?._sourceOrigin === 'sanity-content-lake') {
      setPersistenceStateByDocId((prev) => ({
        ...prev,
        [docId]: 'saving',
      }));
      try {
        const res = await fetch('/api/studio/sanity/delete-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: docId }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setPersistenceError(
            data?.message || `Failed to delete draft "${docId}" from Sanity.`
          );
          setPersistenceStateByDocId((prev) => ({
            ...prev,
            [docId]: 'error',
          }));
          return;
        }
      } catch (err: any) {
        setPersistenceError(
          `Network error deleting draft from Sanity: ${
            err?.message ?? String(err)
          }`
        );
        setPersistenceStateByDocId((prev) => ({
          ...prev,
          [docId]: 'error',
        }));
        return;
      }
    }

    setDocuments((prev) => {
      const next = prev.filter((d) => d._id !== docId);
      if (selectedDocumentId === docId) {
        setSelectedDocumentId(next[0]?._id ?? '');
      }
      return next;
    });
    syncDraftsFromSanityContentLake();
    triggerToast(`Deleted draft "${docId}" from Sanity Content Lake.`);
  };

  const toggleDeskExpand = (nodeId: string) => {
    setExpandedDeskNodeIds((prev) =>
      prev.includes(nodeId)
        ? prev.filter((id) => id !== nodeId)
        : [...prev, nodeId]
    );
  };

  // Recursive renderer for Desk Structure nodes
  const renderDeskNode = (node: DeskListNode, depth = 0) => {
    const hasChildren = Boolean(node.items && node.items.length > 0);
    const isExpanded = expandedDeskNodeIds.includes(node.id);
    const isSelected = selectedDeskNodeId === node.id;

    const matchingCount =
      node.type === 'documentList'
        ? documents.filter((d) => matchesDeskFilter(d, node)).length
        : null;

    return (
      <div key={node.id} className="select-none">
        <button
          type="button"
          onClick={() => {
            if (hasChildren) {
              toggleDeskExpand(node.id);
            } else {
              setSelectedDeskNodeId(node.id);
              if (node.type === 'document' && node.documentId) {
                setSelectedDocumentId(node.documentId);
              } else {
                const matching = documents.filter((d) =>
                  matchesDeskFilter(d, node)
                );
                if (
                  matching.length > 0 &&
                  !matching.some((m) => m._id === selectedDocumentId)
                ) {
                  setSelectedDocumentId(matching[0]._id);
                }
              }
            }
          }}
          style={{ paddingLeft: `${Math.max(12, depth * 14 + 12)}px` }}
          className={`w-full flex items-center justify-between gap-2 pr-3 py-2 text-left text-xs rounded-lg transition-colors cursor-pointer ${
            isSelected
              ? 'bg-[#1B3D5F] text-white font-semibold'
              : depth === 0
              ? 'font-semibold text-[#1E293B] hover:bg-[#F1F5F9]'
              : 'text-[#334155] hover:bg-[#F1F5F9]'
          }`}
        >
          <span className="flex items-center gap-2 min-w-0 truncate">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-75" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-75" />
              )
            ) : node.schemaType === 'product' ? (
              <Package className="w-3.5 h-3.5 shrink-0 opacity-75" />
            ) : node.schemaType === 'giftGuide' ? (
              <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-75" />
            ) : node.schemaType === 'siteSettings' ? (
              <Settings className="w-3.5 h-3.5 shrink-0 opacity-75" />
            ) : (
              <FileText className="w-3.5 h-3.5 shrink-0 opacity-75" />
            )}
            <span className="truncate">{node.title}</span>
          </span>

          {matchingCount !== null && (
            <span
              className={`text-[11px] font-mono tabular-nums shrink-0 ${
                isSelected ? 'text-[#E2E8F0]' : 'text-[#64748B]'
              }`}
            >
              {matchingCount}
            </span>
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {node.items!.map((child) => renderDeskNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Recursive Field Input Renderer
  const renderFieldControl = (
    field: SanityFieldSpec,
    value: any,
    onChange: (nextVal: any) => void,
    parentDoc: Record<string, any>
  ) => {
    // 1. String with options.list (Dropdown or Radio)
    if (field.type === 'string' && Array.isArray(field.options?.list)) {
      const optionsList: Array<{ title: string; value: string }> =
        field.options.list.map((item: any) =>
          typeof item === 'string' ? { title: item, value: item } : item
        );
      return (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-2 focus:outline-[#1B3D5F]"
        >
          <option value="">— Select {field.title} —</option>
          {optionsList.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.title}
            </option>
          ))}
        </select>
      );
    }

    // 2. Plain String / Date / Datetime / URL
    if (
      field.type === 'string' ||
      field.type === 'url' ||
      field.type === 'date' ||
      field.type === 'datetime'
    ) {
      const isCanonicalIdField =
        field.name === 'productId' ||
        (field.name === 'id' && parentDoc._type === 'giftGuide');
      return (
        <div className="flex items-center gap-2">
          <input
            type={field.type === 'date' ? 'date' : 'text'}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              field.type === 'url'
                ? 'https://...'
                : field.type === 'date'
                ? 'YYYY-MM-DD'
                : `Enter ${field.title}...`
            }
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-2 focus:outline-[#1B3D5F]"
          />
          {isCanonicalIdField && (
            <button
              type="button"
              onClick={() => {
                const prefix =
                  field.name === 'productId' ? 'prod_' : 'guide_';
                const base = snakeCaseText(
                  String(parentDoc.title || parentDoc.name || 'new_item')
                );
                onChange(`${prefix}${base || 'draft_item'}`);
              }}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#1B3D5F] hover:bg-[#E2E8F0] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Generate ID
            </button>
          )}
        </div>
      );
    }

    // 3. Slug Field (`{ _type: 'slug', current: '...' }`)
    if (field.type === 'slug') {
      const currentSlug =
        typeof value === 'string' ? value : value?.current ?? '';
      return (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={currentSlug}
            onChange={(e) =>
              onChange({ _type: 'slug', current: e.target.value })
            }
            placeholder="kebab-case-url-slug"
            className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-2 focus:outline-[#1B3D5F]"
          />
          <button
            type="button"
            onClick={() => {
              const sourceText = String(
                parentDoc.title || parentDoc.name || ''
              );
              onChange({
                _type: 'slug',
                current: slugifyText(sourceText || 'new-draft-item'),
              });
            }}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#1B3D5F] hover:bg-[#E2E8F0] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Generate from Title
          </button>
        </div>
      );
    }

    // 4. Multiline Text
    if (field.type === 'text') {
      const strVal = String(value ?? '');
      return (
        <div className="space-y-1">
          <textarea
            rows={3}
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Write ${field.title.toLowerCase()}...`}
            className="w-full px-3 py-2 text-xs leading-relaxed rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-2 focus:outline-[#1B3D5F]"
          />
          <div className="text-[11px] text-[#64748B] font-mono tabular-nums text-right">
            {strVal.length} chars
          </div>
        </div>
      );
    }

    // 5. Number
    if (field.type === 'number') {
      return (
        <input
          type="number"
          step="any"
          value={value ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === '' ? undefined : Number(raw));
          }}
          placeholder="0"
          className="w-full max-w-xs px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-2 focus:outline-[#1B3D5F]"
        />
      );
    }

    // 6. Boolean
    if (field.type === 'boolean') {
      const checked = Boolean(value);
      return (
        <label className="inline-flex items-center gap-2.5 text-xs font-medium text-[#0F172A] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-[#CBD5E1] text-[#1B3D5F] focus:ring-[#1B3D5F]"
          />
          <span>{checked ? 'Enabled (true)' : 'Disabled (false)'}</span>
        </label>
      );
    }

    // 7. Reference (`{ _type: 'reference', _ref: '...' }`)
    if (field.type === 'reference') {
      const allowedTargetTypes = (field.to ?? []).map((t) => t.type);
      const candidateDocs = documents.filter((d) =>
        allowedTargetTypes.includes(d._type)
      );
      const currentRef = value?._ref ?? '';
      return (
        <div className="space-y-1.5">
          <select
            value={currentRef}
            onChange={(e) => {
              const nextRef = e.target.value;
              onChange(
                nextRef ? { _type: 'reference', _ref: nextRef } : undefined
              );
            }}
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-2 focus:outline-[#1B3D5F]"
          >
            <option value="">
              — Select referenced {allowedTargetTypes.join(' / ')} —
            </option>
            {candidateDocs.map((cand) => {
              const candSchema = schemaMap.get(cand._type);
              const prev = candSchema
                ? evaluateDocumentPreview(candSchema, cand)
                : { title: cand.title || cand.name || cand._id };
              const isDraft =
                cand._id.startsWith('drafts.') || cand.status === 'draft';
              return (
                <option key={cand._id} value={cand._id}>
                  {isDraft ? '★ [NEW DRAFT] ' : ''}
                  {prev.title} ({cand._id})
                </option>
              );
            })}
          </select>
          {currentRef && (
            <div className="text-[11px] text-[#475569] font-mono">
              Linked `_ref`: {currentRef}
            </div>
          )}
        </div>
      );
    }

    // 8. Array Field
    if (field.type === 'array') {
      const arrValue: any[] = Array.isArray(value) ? value : [];

      // 8a. Controlled Multi-Select Taxonomy Array (`options.list`)
      if (Array.isArray(field.options?.list)) {
        const optionsList: Array<{ title: string; value: string }> =
          field.options.list.map((item: any) =>
            typeof item === 'string' ? { title: item, value: item } : item
          );
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
            {optionsList.map((opt) => {
              const isChecked = arrValue.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-xs text-[#1E293B] cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        onChange(arrValue.filter((v) => v !== opt.value));
                      } else {
                        onChange([...arrValue, opt.value]);
                      }
                    }}
                    className="h-3.5 w-3.5 rounded border-[#CBD5E1] text-[#1B3D5F]"
                  />
                  <span className="truncate">{opt.title}</span>
                </label>
              );
            })}
          </div>
        );
      }

      const memberDef = field.of?.[0];
      const memberType = memberDef?.type ?? 'string';

      const moveItem = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= arrValue.length) return;
        const copy = [...arrValue];
        const [moved] = copy.splice(index, 1);
        copy.splice(target, 0, moved);
        onChange(copy);
      };

      const removeItem = (index: number) => {
        onChange(arrValue.filter((_, idx) => idx !== index));
      };

      // 8b. Array of Strings or Text Paragraphs
      if (memberType === 'string' || memberType === 'text') {
        return (
          <div className="space-y-2">
            {arrValue.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                {memberType === 'text' ? (
                  <textarea
                    rows={2}
                    value={String(item ?? '')}
                    onChange={(e) => {
                      const next = [...arrValue];
                      next[idx] = e.target.value;
                      onChange(next);
                    }}
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A]"
                  />
                ) : (
                  <input
                    type="text"
                    value={String(item ?? '')}
                    onChange={(e) => {
                      const next = [...arrValue];
                      next[idx] = e.target.value;
                      onChange(next);
                    }}
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A]"
                  />
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveItem(idx, -1)}
                    disabled={idx === 0}
                    title="Move Up"
                    className="p-1.5 rounded border border-[#CBD5E1] bg-white text-[#475569] disabled:opacity-40 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(idx, 1)}
                    disabled={idx === arrValue.length - 1}
                    title="Move Down"
                    className="p-1.5 rounded border border-[#CBD5E1] bg-white text-[#475569] disabled:opacity-40 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    title="Remove"
                    className="p-1.5 rounded border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => onChange([...arrValue, ''])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#1B3D5F] hover:bg-[#E2E8F0] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          </div>
        );
      }

      // 8c. Array of References
      if (memberType === 'reference') {
        const targetTypes = (memberDef?.to ?? []).map((t) => t.type);
        const candidates = documents.filter((d) =>
          targetTypes.includes(d._type)
        );
        return (
          <div className="space-y-2">
            {arrValue.map((refItem, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={refItem?._ref ?? ''}
                  onChange={(e) => {
                    const next = [...arrValue];
                    next[idx] = {
                      _key: refItem?._key || `ref_${idx}`,
                      _type: 'reference',
                      _ref: e.target.value,
                    };
                    onChange(next);
                  }}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A]"
                >
                  <option value="">— Select {targetTypes.join(' / ')} —</option>
                  {candidates.map((cand) => (
                    <option key={cand._id} value={cand._id}>
                      {cand._id.startsWith('drafts.') ? '★ [NEW DRAFT] ' : ''}
                      {cand.title || cand.name || cand._id} ({cand._id})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => moveItem(idx, -1)}
                  disabled={idx === 0}
                  className="p-1.5 rounded border border-[#CBD5E1] bg-white text-[#475569] disabled:opacity-40 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(idx, 1)}
                  disabled={idx === arrValue.length - 1}
                  className="p-1.5 rounded border border-[#CBD5E1] bg-white text-[#475569] disabled:opacity-40 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="p-1.5 rounded border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onChange([
                  ...arrValue,
                  {
                    _key: `ref_${Date.now()}`,
                    _type: 'reference',
                    _ref: candidates[0]?._id ?? '',
                  },
                ])
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#1B3D5F] hover:bg-[#E2E8F0] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Reference</span>
            </button>
          </div>
        );
      }

      // 8d. Array of Registered Reusable Objects (e.g., `guideSection`, `guideProductRecommendation`, `productImage`, `guideQuickPick`, etc.)
      const itemObjectSchema = schemaMap.get(memberType);
      if (itemObjectSchema) {
        return (
          <div className="space-y-3">
            {arrValue.map((itemObj, idx) => {
              const previewVal = evaluateDocumentPreview(
                itemObjectSchema,
                itemObj ?? {}
              );
              return (
                <div
                  key={itemObj?._key || idx}
                  className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                    <div className="text-xs font-semibold text-[#0F172A]">
                      <span className="font-mono text-[#475569] mr-2 tabular-nums">
                        #{idx + 1}
                      </span>
                      <span>
                        {previewVal.title || itemObjectSchema.title}
                      </span>
                      {previewVal.subtitle && (
                        <span className="text-[#64748B] font-normal ml-2">
                          · {previewVal.subtitle}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveItem(idx, -1)}
                        disabled={idx === 0}
                        title="Move Up in Order"
                        className="px-2 py-1 text-[11px] font-medium rounded border border-[#CBD5E1] bg-white text-[#1E293B] hover:bg-[#F1F5F9] disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                        <span>Up</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(idx, 1)}
                        disabled={idx === arrValue.length - 1}
                        title="Move Down in Order"
                        className="px-2 py-1 text-[11px] font-medium rounded border border-[#CBD5E1] bg-white text-[#1E293B] hover:bg-[#F1F5F9] disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                        <span>Down</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        title="Remove Item"
                        className="px-2 py-1 text-[11px] font-medium rounded border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {itemObjectSchema.fields.map((subField) => (
                      <div key={subField.name} className="space-y-1">
                        <label className="block text-xs font-semibold text-[#1E293B]">
                          {subField.title}{' '}
                          <span className="font-mono text-[11px] font-normal text-[#64748B]">
                            ({subField.name})
                          </span>
                        </label>
                        {subField.description && (
                          <p className="text-[11px] text-[#64748B]">
                            {subField.description}
                          </p>
                        )}
                        {renderFieldControl(
                          subField,
                          itemObj?.[subField.name],
                          (nextSubVal) => {
                            const nextArr = [...arrValue];
                            nextArr[idx] = {
                              ...(itemObj ?? {}),
                              _key: itemObj?._key || `item_${idx}`,
                              _type: itemObjectSchema.name,
                              [subField.name]: nextSubVal,
                            };
                            onChange(nextArr);
                          },
                          parentDoc
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => {
                const newItem: Record<string, any> = {
                  _key: `${itemObjectSchema.name}_${Date.now().toString(36)}`,
                  _type: itemObjectSchema.name,
                };
                for (const f of itemObjectSchema.fields) {
                  if (f.initialValue !== undefined) {
                    newItem[f.name] =
                      typeof f.initialValue === 'function'
                        ? f.initialValue()
                        : f.initialValue;
                  }
                }
                onChange([...arrValue, newItem]);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#1B3D5F] bg-white text-[#1B3D5F] hover:bg-[#F1F5F9] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add {itemObjectSchema.title}</span>
            </button>
          </div>
        );
      }
    }

    // 9. Registered Nested Object (`seoMetadata`, `editorialImage`, `guideEditorsPick`, `productGiftVerdict`, etc.)
    const nestedObjectSchema = schemaMap.get(field.type);
    if (nestedObjectSchema) {
      const objVal =
        value && typeof value === 'object'
          ? value
          : { _type: nestedObjectSchema.name };
      return (
        <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] space-y-3">
          {nestedObjectSchema.fields.map((subField) => (
            <div key={subField.name} className="space-y-1">
              <label className="block text-xs font-semibold text-[#1E293B]">
                {subField.title}{' '}
                <span className="font-mono text-[11px] font-normal text-[#64748B]">
                  ({subField.name})
                </span>
              </label>
              {subField.description && (
                <p className="text-[11px] text-[#64748B]">
                  {subField.description}
                </p>
              )}
              {renderFieldControl(
                subField,
                objVal[subField.name],
                (nextSubVal) => {
                  onChange({
                    ...objVal,
                    _type: nestedObjectSchema.name,
                    [subField.name]: nextSubVal,
                  });
                },
                parentDoc
              )}
            </div>
          ))}
        </div>
      );
    }

    // Fallback JSON editor for any complex or raw block structure
    return (
      <textarea
        rows={3}
        value={
          typeof value === 'string'
            ? value
            : JSON.stringify(value ?? null, null, 2)
        }
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            onChange(e.target.value);
          }
        }}
        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A]"
      />
    );
  };

  const isConfigured = isSanityStudioEnvConfigured(envConfig);
  const visibleFieldsForActiveTab = useMemo(() => {
    if (!activeSchema) return [];
    if (activeGroupTab === 'all' || !activeSchema.groups?.length) {
      return activeSchema.fields;
    }
    return activeSchema.fields.filter((f) => {
      if (!f.group) return activeGroupTab === activeSchema.groups![0].name;
      return Array.isArray(f.group)
        ? f.group.includes(activeGroupTab)
        : f.group === activeGroupTab;
    });
  }, [activeSchema, activeGroupTab]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
      {/* =====================================================================
          TOP STUDIO HEADER (3-Zone Workspace Contract)
          ===================================================================== */}
      <header className="sticky top-0 z-30 bg-[#0F172A] text-white border-b border-[#1E293B] px-6 py-3.5">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-6">
          {/* Zone 1: Brand Title */}
          <div className="flex items-center gap-4 shrink-0">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Website</span>
            </a>
            <span className="text-[#334155]" aria-hidden="true">
              |
            </span>
            <span className="text-base font-serif font-semibold tracking-tight text-white whitespace-nowrap shrink-0">
              Science of Gifts — Sanity Editorial Studio
            </span>
          </div>

          {/* Zone 2: Environment & Connection Summary */}
          <div className="hidden xl:flex items-center gap-2 text-xs text-[#CBD5E1] font-mono tabular-nums">
            <span>
              Project:{' '}
              <strong className="text-white">
                {envConfig.projectId || 'Not Set'}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Dataset:{' '}
              <strong className="text-white">
                {envConfig.dataset || 'Not Set'}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>API: {envConfig.apiVersion}</span>
            <span aria-hidden="true">·</span>
            <span>
              Preview Drafts: {String(envConfig.usePreviewDrafts)}
            </span>
            <span aria-hidden="true">·</span>
            <span>Website Source: Local Catalog</span>
          </div>

          {/* Zone 3: Quick Create Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleCreateNewDocument('product')}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#10B981] text-[#0F172A] hover:bg-[#34D399] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Draft Product</span>
            </button>
            <button
              type="button"
              onClick={() => handleCreateNewDocument('giftGuide')}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#38BDF8] text-[#0F172A] hover:bg-[#7DD3FC] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Draft Gift Guide</span>
            </button>
            <button
              type="button"
              onClick={() => setShowBeginnerGuide((prev) => !prev)}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-[#334155] text-[#E2E8F0] hover:bg-[#1E293B] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showBeginnerGuide ? 'Hide Guide' : 'Editor Guide'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification Bar */}
      {saveToastMessage && (
        <div
          role="status"
          className="bg-[#065F46] text-white px-6 py-2.5 text-xs font-medium flex items-center justify-between"
        >
          <span>{saveToastMessage}</span>
          <button
            type="button"
            onClick={() => setSaveToastMessage(null)}
            className="underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =====================================================================
          BEGINNER WALKTHROUGH & CONNECTION STATUS BAR
          ===================================================================== */}
      {showBeginnerGuide && (
        <section className="bg-white border-b border-[#E2E8F0] px-6 py-4">
          <div className="max-w-[1600px] mx-auto space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
                <Database className="w-4 h-4 text-[#1B3D5F]" />
                <span>
                  Sanity Studio Connection Verified:{' '}
                  {isConfigured
                    ? `Project "${envConfig.projectId}" · Dataset "${envConfig.dataset}" (${cloudStatus.message})`
                    : 'Environment variables not detected'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {cloudStatus.draftCount !== null && (
                  <span className="font-mono text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-1 rounded-md">
                    Sanity Drafts in Cloud: {cloudStatus.draftCount}
                  </span>
                )}
                <button
                  type="button"
                  onClick={syncDraftsFromSanityContentLake}
                  className="inline-flex items-center gap-1 text-[#1B3D5F] hover:underline font-medium cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Drafts from Sanity Content Lake</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
              <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1.5">
                <div className="font-semibold text-[#0F172A]">
                  01. How Sanity Studio Works
                </div>
                <p className="text-[#475569] leading-relaxed">
                  The left column is your <strong>Publishing Desk</strong>{' '}
                  (organized into <em>Editorial Content</em>,{' '}
                  <em>Discovery &amp; Organization</em>, and{' '}
                  <em>Publication Settings</em>). The middle column lists
                  documents, and the right pane is the form editor with tabs for
                  each section of the document.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1.5">
                <div className="font-semibold text-[#0F172A]">
                  02. Test Step 1: Create a Draft Product
                </div>
                <p className="text-[#475569] leading-relaxed">
                  Click <strong>+ New Draft Product</strong> in the top-right
                  bar. Every new product starts safely as a{' '}
                  <code>draft</code>. You can type into the 6 tabs manually—or
                  click <strong>Fill Example Draft Values</strong> in the editor
                  header to pre-fill a realistic product and customize it.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1.5">
                <div className="font-semibold text-[#0F172A]">
                  03. Test Step 2: Create a Draft Gift Guide
                </div>
                <p className="text-[#475569] leading-relaxed">
                  Click <strong>+ New Draft Gift Guide</strong>. Open Tab{' '}
                  <strong>2. Picks &amp; Product Sections</strong> and select
                  your newly created Draft Product (marked{' '}
                  <code>★ [NEW DRAFT]</code>) from the searchable dropdown—no
                  manual product IDs needed!
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          MAIN 3-PANE SANITY STUDIO WORKSPACE
          ===================================================================== */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-64px)]">
        {/* PANE 1: LEFT DESK STRUCTURE NAVIGATION (3 columns) */}
        <aside
          aria-label="Sanity Studio Desk Structure"
          className="lg:col-span-3 border-r border-[#E2E8F0] bg-white p-4 space-y-4 overflow-y-auto"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <span className="text-xs font-semibold text-[#0F172A]">
              Publishing Desk (3 Pillars)
            </span>
            <span className="text-[11px] font-mono text-[#64748B] tabular-nums">
              {SANITY_DOCUMENT_SCHEMAS.length} Doc Types ·{' '}
              {ALL_SANITY_STUDIO_TYPES.length} Schemas
            </span>
          </div>

          <div className="space-y-1">
            {deskRoot.items?.map((topGroup) => renderDeskNode(topGroup, 0))}
          </div>
        </aside>

        {/* PANE 2: MIDDLE DOCUMENT LIST (3 columns) */}
        <section
          aria-label="Document List"
          className="lg:col-span-3 border-r border-[#E2E8F0] bg-[#F8FAFC] flex flex-col overflow-hidden"
        >
          <div className="p-4 bg-white border-b border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[#0F172A] truncate">
                  {activeDeskNode.title}
                </h2>
                <p className="text-[11px] text-[#64748B] font-mono tabular-nums">
                  {filteredDeskDocuments.length} document
                  {filteredDeskDocuments.length === 1 ? '' : 's'}
                </p>
              </div>

              {activeDeskNode.schemaType &&
                activeDeskNode.schemaType !== 'siteSettings' && (
                  <button
                    type="button"
                    onClick={() =>
                      handleCreateNewDocument(activeDeskNode.schemaType!)
                    }
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#1B3D5F] text-white hover:bg-[#28537D] transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Draft</span>
                  </button>
                )}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                placeholder="Filter documents in this view..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] focus:bg-white focus:outline-2 focus:outline-[#1B3D5F]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#E2E8F0]">
            {filteredDeskDocuments.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <FolderOpen className="w-7 h-7 text-[#64748B] mx-auto opacity-75" />
                <div className="text-xs font-semibold text-[#0F172A]">
                  No documents match this filter yet
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {activeDeskNode.id.includes('drafts')
                    ? 'You have no unpublished drafts in this category yet. Click the button below to create your first draft!'
                    : 'Create a new draft document or clear the search filter.'}
                </p>
                {activeDeskNode.schemaType &&
                  activeDeskNode.schemaType !== 'siteSettings' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleCreateNewDocument(activeDeskNode.schemaType!)
                      }
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1B3D5F] text-white hover:bg-[#28537D] inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create First Draft</span>
                    </button>
                  )}
              </div>
            ) : (
              filteredDeskDocuments.map((doc) => {
                const docSchema = schemaMap.get(doc._type);
                const preview = docSchema
                  ? evaluateDocumentPreview(docSchema, doc)
                  : {
                      title: doc.title || doc.name || doc._id,
                      subtitle: doc._type,
                    };
                const isSelected = activeDocument?._id === doc._id;
                const isDraft =
                  doc._id.startsWith('drafts.') || doc.status === 'draft';
                const docSaveState = persistenceStateByDocId[doc._id];

                return (
                  <button
                    key={doc._id}
                    type="button"
                    onClick={() => handleSelectDocument(doc._id)}
                    className={`w-full text-left p-3.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#EFF6FF] border-l-2 border-l-[#1B3D5F]'
                        : 'bg-white hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-semibold text-[#0F172A] leading-snug line-clamp-2">
                        {preview.title}
                      </div>
                      <span
                        className={`text-[10px] font-mono uppercase shrink-0 ${
                          doc._sourceOrigin === 'sanity-content-lake' &&
                          docSaveState !== 'unsaved'
                            ? 'text-[#059669] font-semibold'
                            : isDraft
                            ? 'text-[#D97706] font-semibold'
                            : 'text-[#64748B]'
                        }`}
                      >
                        {doc._sourceOrigin === 'sanity-content-lake' &&
                        docSaveState !== 'unsaved'
                          ? 'Sanity Draft'
                          : isDraft
                          ? 'Unsaved Draft'
                          : 'Local Ref'}
                      </span>
                    </div>
                    {preview.subtitle && (
                      <div className="text-[11px] text-[#64748B] mt-1 truncate">
                        {preview.subtitle}
                      </div>
                    )}
                    <div className="text-[10px] font-mono text-[#94A3B8] mt-1 truncate">
                      _id: {doc._id}
                      {doc._rev ? ` · rev: ${String(doc._rev).slice(0, 8)}` : ''}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* PANE 3: RIGHT SCHEMA-DRIVEN DOCUMENT EDITOR & LIVE VALIDATOR (6 columns) */}
        <main
          aria-label="Document Editor"
          className="lg:col-span-6 bg-white flex flex-col overflow-hidden"
        >
          {!activeDocument || !activeSchema ? (
            <div className="p-12 text-center space-y-3 my-auto">
              <Layers className="w-8 h-8 text-[#64748B] mx-auto" />
              <h2 className="text-base font-semibold text-[#0F172A]">
                Select a Document or Create a New Draft
              </h2>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Choose any item from the middle list, or use the{' '}
                <strong>+ New Draft Product</strong> or{' '}
                <strong>+ New Draft Gift Guide</strong> buttons in the top bar.
              </p>
            </div>
          ) : (
            <>
              {/* Document Editor Top Bar */}
              <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#475569] font-mono">
                      <span>Schema: {activeSchema.name}</span>
                      <span aria-hidden="true">·</span>
                      <span>_id: {activeDocument._id}</span>
                      {activeDocument._rev && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>_rev: {activeDocument._rev}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      {(() => {
                        const docState =
                          persistenceStateByDocId[activeDocument._id];
                        if (docState === 'saving') {
                          return (
                            <span className="text-[#1D4ED8] font-semibold">
                              STATUS: SAVING TO SANITY CONTENT LAKE...
                            </span>
                          );
                        }
                        if (docState === 'reloading') {
                          return (
                            <span className="text-[#1D4ED8] font-semibold">
                              STATUS: RELOADING FROM SANITY CONTENT LAKE...
                            </span>
                          );
                        }
                        if (docState === 'error') {
                          return (
                            <span className="text-[#DC2626] font-semibold">
                              STATUS: SAVE FAILED (NOT SAVED TO SANITY)
                            </span>
                          );
                        }
                        if (docState === 'unsaved') {
                          return (
                            <span className="text-[#D97706] font-semibold">
                              STATUS: UNSAVED CHANGES (IN-MEMORY ONLY)
                            </span>
                          );
                        }
                        if (
                          docState === 'saved' ||
                          activeDocument._sourceOrigin === 'sanity-content-lake'
                        ) {
                          return (
                            <span className="text-[#059669] font-semibold">
                              STATUS: SAVED IN SANITY CONTENT LAKE
                              {lastTransactionId
                                ? ` (tx: ${lastTransactionId.slice(0, 8)})`
                                : ''}
                            </span>
                          );
                        }
                        return (
                          <span className="text-[#64748B] font-semibold">
                            STATUS: LOCAL CATALOG REFERENCE (READ-ONLY UNTIL SAVED AS DRAFT)
                          </span>
                        );
                      })()}
                    </div>
                    <h1 className="text-lg font-serif font-semibold text-[#0F172A] truncate">
                      {activeDocument.title ||
                        activeDocument.name ||
                        activeDocument.publicationTitle ||
                        `Untitled ${activeSchema.title}`}
                    </h1>
                  </div>

                  {/* Document Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {(activeDocument._type === 'product' ||
                      activeDocument._type === 'giftGuide') &&
                      (activeDocument.status === 'draft' ||
                        activeDocument._id.startsWith('drafts.')) && (
                        <button
                          type="button"
                          onClick={handleLoadStarterValues}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#1B3D5F] bg-white text-[#1B3D5F] hover:bg-[#EFF6FF] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Fill Example Draft Values</span>
                        </button>
                      )}

                    {activeDocument._id.startsWith('drafts.') &&
                      activeDocument._sourceOrigin ===
                        'sanity-content-lake' && (
                        <button
                          type="button"
                          onClick={() =>
                            loadDraftFromSanityById(activeDocument._id)
                          }
                          disabled={
                            persistenceStateByDocId[activeDocument._id] ===
                            'reloading'
                          }
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reload from Sanity</span>
                        </button>
                      )}

                    <button
                      type="button"
                      onClick={handleSaveDraftToSanity}
                      disabled={
                        persistenceStateByDocId[activeDocument._id] === 'saving'
                      }
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#1B3D5F] text-white hover:bg-[#28537D] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {persistenceStateByDocId[activeDocument._id] === 'saving'
                        ? 'Saving to Sanity...'
                        : activeDocument._id.startsWith('drafts.')
                        ? 'Save Draft to Sanity'
                        : 'Save as New Sanity Draft'}
                    </button>

                    {!activeSchema.singleton &&
                      activeDocument._id.startsWith('drafts.') && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteDocument(activeDocument._id)
                          }
                          title="Delete Draft from Sanity"
                          className="p-1.5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                  </div>
                </div>

                {/* Server Persistence Error & Validation Banner */}
                {persistenceError && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] text-xs text-[#991B1B] space-y-1.5"
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                      <span>{persistenceError}</span>
                    </div>
                    {serverValidationIssues.length > 0 && (
                      <ul className="list-disc list-inside space-y-0.5 pl-1">
                        {serverValidationIssues.map((issue, idx) => (
                          <li key={idx}>
                            <strong>{issue.path}:</strong> {issue.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Group Tabs (`schema.groups`) */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  {(activeSchema.groups ?? []).map((grp) => (
                    <button
                      key={grp.name}
                      type="button"
                      onClick={() => setActiveGroupTab(grp.name)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        activeGroupTab === grp.name
                          ? 'bg-[#1B3D5F] text-white font-semibold'
                          : 'bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {grp.title}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setActiveGroupTab('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeGroupTab === 'all'
                        ? 'bg-[#1B3D5F] text-white font-semibold'
                        : 'bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    All Fields ({activeSchema.fields.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveGroupTab('json')}
                    className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeGroupTab === 'json'
                        ? 'bg-[#0F172A] text-white font-semibold'
                        : 'bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    Sanity JSON
                  </button>
                </div>
              </div>

              {/* Editor Form Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeGroupTab === 'json' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-[#0F172A] flex items-center gap-2">
                        <FileCode2 className="w-4 h-4 text-[#1B3D5F]" />
                        <span>
                          Raw Sanity Document JSON (Compatible with{' '}
                          <code>sanity dataset import</code>)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(
                            JSON.stringify(activeDocument, null, 2)
                          );
                          triggerToast('Copied Sanity JSON to clipboard.');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#1B3D5F] hover:bg-[#E2E8F0] inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy JSON</span>
                      </button>
                    </div>
                    <pre className="p-4 rounded-xl bg-[#0F172A] text-[#E2E8F0] font-mono text-xs overflow-x-auto leading-relaxed">
                      {JSON.stringify(activeDocument, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <>
                    {/* Active Group Description */}
                    {activeSchema.groups?.find(
                      (g) => g.name === activeGroupTab
                    )?.description && (
                      <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#475569]">
                        {
                          activeSchema.groups.find(
                            (g) => g.name === activeGroupTab
                          )?.description
                        }
                      </div>
                    )}

                    {/* Fields for Active Group */}
                    <div className="space-y-5">
                      {visibleFieldsForActiveTab.map((field) => {
                        const fieldErrors = validationResult.errors.filter(
                          (e) => e.path === field.name
                        );
                        const fieldWarnings = validationResult.warnings.filter(
                          (w) => w.path === field.name
                        );

                        return (
                          <div
                            key={field.name}
                            className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-2"
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <label className="text-xs font-semibold text-[#0F172A]">
                                {field.title}
                              </label>
                              <span className="text-[11px] font-mono text-[#64748B]">
                                {field.name} · {field.type}
                              </span>
                            </div>

                            {field.description && (
                              <p className="text-xs text-[#475569] leading-relaxed">
                                {field.description}
                              </p>
                            )}

                            <div className="pt-1">
                              {renderFieldControl(
                                field,
                                activeDocument[field.name],
                                (nextVal) =>
                                  updateActiveDocumentField(
                                    field.name,
                                    nextVal
                                  ),
                                activeDocument
                              )}
                            </div>

                            {fieldErrors.map((err, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-1.5 text-xs text-[#DC2626] font-medium pt-1"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>{err.message}</span>
                              </div>
                            ))}

                            {fieldWarnings.map((warn, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-1.5 text-xs text-[#D97706] pt-1"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>{warn.message}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* =============================================================
                    LIVE PUBLICATION-READINESS & VALIDATION PANEL
                    ============================================================= */}
                {lifecycleEvaluation && (
                  <div className="p-5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
                        {validationResult.valid &&
                        lifecycleEvaluation.blockingErrors.length === 0 ? (
                          <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                        )}
                        <span>
                          Live Schema &amp; Publication-Readiness Validation
                        </span>
                      </div>
                      <span className="text-xs font-mono text-[#475569]">
                        Resolved Robots: {lifecycleEvaluation.robotsDirective}
                      </span>
                    </div>

                    {/* 5-Stage Lifecycle Summary */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#334155] font-mono">
                      <span>
                        1. Sanity Draft:{' '}
                        <strong>
                          {lifecycleEvaluation.isSanityDraft ? 'Yes' : 'No'}
                        </strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        2. Published Doc:{' '}
                        <strong>
                          {lifecycleEvaluation.isSanityPublishedDocument
                            ? 'Yes'
                            : 'No'}
                        </strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        3. Approved for Site:{' '}
                        <strong>
                          {lifecycleEvaluation.isApprovedForPublicWebsite
                            ? 'Yes'
                            : 'No'}
                        </strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        4. Verified Commerce:{' '}
                        <strong>
                          {lifecycleEvaluation.hasVerifiedCommerce
                            ? 'Yes'
                            : 'No'}
                        </strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        5. Indexable Page:{' '}
                        <strong>
                          {lifecycleEvaluation.isIndexablePublicPage
                            ? 'Yes'
                            : 'No'}
                        </strong>
                      </span>
                    </div>

                    {(validationResult.errors.length > 0 ||
                      lifecycleEvaluation.blockingErrors.length > 0) && (
                      <div className="space-y-1 text-xs text-[#DC2626]">
                        <div className="font-semibold">
                          Items Required Before Publishing ({' '}
                          {validationResult.errors.length +
                            lifecycleEvaluation.blockingErrors.length}{' '}
                          ):
                        </div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {lifecycleEvaluation.blockingErrors.map((b, i) => (
                            <li key={`block_${i}`}>{b}</li>
                          ))}
                          {validationResult.errors.map((e, i) => (
                            <li key={`err_${i}`}>
                              <strong>{e.path}:</strong> {e.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {lifecycleEvaluation.warnings.length > 0 && (
                      <div className="space-y-1 text-xs text-[#B45309]">
                        <div className="font-semibold">
                          Editorial Notes &amp; Non-Blocking Safeguards:
                        </div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {lifecycleEvaluation.warnings.map((w, i) => (
                            <li key={`warn_${i}`}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
