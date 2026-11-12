/**
 * Science of Gifts — Sanity v3 Content Model & GROQ Query Specification
 *
 * Re-exports the complete Phase 1 Sanity Studio schema definitions (`defineType`,
 * `defineField`, `defineArrayMember`) from `src/cms/studio/schemas/` and maps them
 * to `SANITY_SCHEMA_TYPES` and `SANITY_OBJECT_SCHEMA_TYPES` for inspection in
 * `ArchitectureAndSeoModal.tsx` and automated tests.
 */

import {
  ALL_SANITY_STUDIO_TYPES,
  SANITY_DOCUMENT_SCHEMAS,
  SANITY_OBJECT_SCHEMAS,
  verifySchemaRegistryIntegrity,
} from './studio/schemas';
import {
  SanityFieldSpec,
  SanityTypeSpec,
  createSanityRule,
} from './studio/sanityCore';

export {
  ALL_SANITY_STUDIO_TYPES,
  SANITY_DOCUMENT_SCHEMAS,
  SANITY_OBJECT_SCHEMAS,
  verifySchemaRegistryIntegrity,
};

export interface SanityFieldDefinition {
  name: string;
  title: string;
  type: string;
  group?: string | string[];
  fieldset?: string;
  description?: string;
  validationRule: string;
  of?: Array<{ type: string; to?: Array<{ type: string }> }>;
  to?: Array<{ type: string }>;
  options?: Record<string, unknown>;
  fields?: SanityFieldDefinition[];
}

export interface SanitySchemaDefinition {
  name: string;
  title: string;
  type: 'document' | 'object';
  singleton?: boolean;
  description: string;
  groups?: Array<{ name: string; title: string; description?: string }>;
  fields: SanityFieldDefinition[];
}

function describeValidationCallback(field: SanityFieldSpec): string {
  if (!field.validation) {
    return 'Rule.optional()';
  }
  const built = field.validation(createSanityRule());
  const rules = Array.isArray(built) ? built : [built];
  return rules.map((r) => r._describe()).join(' & ');
}

function toLegacyFieldDefinition(field: SanityFieldSpec): SanityFieldDefinition {
  return {
    name: field.name,
    title: field.title,
    type: field.type,
    group: field.group,
    fieldset: field.fieldset,
    description: field.description,
    validationRule: describeValidationCallback(field),
    of: field.of?.map((m) => ({
      type: m.type,
      to: m.to,
    })),
    to: field.to,
    options: field.options,
    fields: field.fields?.map(toLegacyFieldDefinition),
  };
}

function toLegacySchemaDefinition(schema: SanityTypeSpec): SanitySchemaDefinition {
  return {
    name: schema.name,
    title: schema.title,
    type: schema.type,
    singleton: schema.singleton,
    description: schema.description ?? '',
    groups: schema.groups?.map((g) => ({
      name: g.name,
      title: g.title,
      description: g.description,
    })),
    fields: schema.fields.map(toLegacyFieldDefinition),
  };
}

/**
 * All 9 canonical Sanity Document schemas (`product`, `giftGuide`, `article`,
 * `editorialHub`, `taxonomyArchive`, `author`, `researchCitation`,
 * `publicationInfoPage`, `siteSettings`).
 */
export const SANITY_SCHEMA_TYPES: SanitySchemaDefinition[] =
  SANITY_DOCUMENT_SCHEMAS.map(toLegacySchemaDefinition);

/**
 * All 34 reusable Sanity Object schemas registered in Studio.
 */
export const SANITY_OBJECT_SCHEMA_TYPES: SanitySchemaDefinition[] =
  SANITY_OBJECT_SCHEMAS.map(toLegacySchemaDefinition);

/**
 * Complete reference GROQ projections joining canonical `product`, `author`,
 * `researchCitation`, `giftGuide`, and `article` documents without duplicating records.
 */
export const GROQ_QUERIES = {
  productBySlug: `*[_type == "product" && slug.current == $slug][0]{
    "id": coalesce(productId, _id),
    "slug": slug.current,
    title,
    subtitle,
    status,
    vendor,
    price,
    currency,
    budgetTier,
    guidePriceBucket,
    productType,
    commerceProvider,
    fulfillmentClassification,
    externalProductId,
    purchaseUrl,
    affiliateUrl,
    fourthwallUrl,
    isPlaceholderLink,
    isSampleProduct,
    priceVerified,
    priceVerificationSource,
    priceVerifiedAt,
    priceVerificationEvidenceNote,
    inventoryVerified,
    inventoryVerificationSource,
    inventoryVerifiedAt,
    inStock,
    availabilityNote,
    calloutTag,
    whyToGiveIt,
    detailsAndCare,
    bestForSummary,
    recipients,
    interests,
    ageRanges,
    occasions,
    personalityTraits,
    editorialRating,
    testingNote,
    giftVerdict,
    idealRecipientProfile,
    extendedGiftRationale,
    buyingConsiderationsList,
    occasionContextNotes,
    specifications,
    similarGiftComparisons[]{
      "productId": product->productId,
      comparisonAngle,
      summary,
      distinctionLabel
    },
    images[]{
      "id": _key,
      "url": coalesce(asset->url, url),
      alt,
      caption,
      fallbackColor,
      fitMode,
      landscapeOverrideUrl,
      portraitOverrideUrl,
      width,
      height,
      isSampleAsset,
      "focalPoint": coalesce(focalPoint, select(defined(asset.hotspot) => { "x": asset.hotspot.x, "y": asset.hotspot.y }, { "x": 0.5, "y": 0.5 })),
      "crop": coalesce(crop, asset.crop)
    },
    "citationIds": citationRefs[]->citationId,
    seo
  }`,

  giftGuideBySlug: `*[_type == "giftGuide" && slug.current == $slug][0]{
    "id": coalesce(id, _id),
    "slug": slug.current,
    title,
    subtitle,
    status,
    editorialIssueNumber,
    curationSummary,
    introParagraphs,
    whoThisGuideIsFor,
    affiliateDisclosure,
    seo,
    category,
    featured,
    recipients,
    occasions,
    interests,
    personalityTraits,
    budgetTiers,
    topics,
    publishedAt,
    updatedAt,
    readTimeMinutes,
    accentTone,
    "authorId": author->authorId,
    "author": author->{ "id": authorId, name, role, bio, "avatarUrl": coalesce(avatar.asset->url, avatar.url), isSampleAuthor },
    "heroImageUrl": coalesce(heroImage.asset->url, heroImage.url),
    "heroImageAlt": heroImage.alt,
    "heroImageCaption": heroImage.caption,
    editorsPick {
      kicker,
      awardLabel,
      headline,
      editorialHeadline,
      editorialRationale,
      whyItStoodOut,
      intendedRecipientAndSituation,
      whoItFitsBest,
      targetSectionId,
      buyingConsiderations,
      practicalNotes,
      "productId": product->productId,
      "product": product->{
        "id": productId,
        "slug": slug.current,
        title,
        subtitle,
        vendor,
        price,
        currency,
        commerceProvider,
        purchaseUrl,
        inStock,
        priceVerified,
        inventoryVerified,
        isSampleProduct,
        isPlaceholderLink,
        whyToGiveIt,
        detailsAndCare,
        images[]{
          "id": _key,
          "url": coalesce(asset->url, url),
          alt,
          caption,
          fallbackColor,
          fitMode,
          landscapeOverrideUrl,
          portraitOverrideUrl,
          isSampleAsset,
          "focalPoint": coalesce(focalPoint, select(defined(asset.hotspot) => { "x": asset.hotspot.x, "y": asset.hotspot.y }, { "x": 0.5, "y": 0.5 })),
          "crop": coalesce(crop, asset.crop)
        }
      }
    },
    quickPicks[]{
      id,
      label,
      reason,
      bestFor,
      targetSectionId,
      "productId": product->productId
    },
    recipientPathways[]{
      id,
      label,
      description,
      editorialTip,
      recipientFilter,
      personalityFilter,
      occasionFilter,
      maxPrice,
      "recommendedProductIds": recommendedProducts[]->productId
    },
    sections[]{
      id,
      shortNavTitle,
      editorialKicker,
      title,
      priceRangeLabel,
      summary,
      accentSurface,
      curatorNote,
      recommendations[]{
        "productId": product->productId,
        awardLabel,
        presentationStyle,
        layoutHighlight,
        editorialHeadline,
        editorialHook,
        customEditorialNote,
        whyItWorks,
        whyWeChoseIt,
        idealFor,
        whoItsBestFor,
        goodToKnow,
        keepInMind,
        buyingConsiderations,
        betterAlternativeNote,
        "product": product->{
          "id": productId,
          "slug": slug.current,
          title,
          subtitle,
          vendor,
          price,
          currency,
          commerceProvider,
          purchaseUrl,
          inStock,
          priceVerified,
          inventoryVerified,
          isSampleProduct,
          isPlaceholderLink,
          whyToGiveIt,
          detailsAndCare,
          images[]{
            "id": _key,
            "url": coalesce(asset->url, url),
            alt,
            caption,
            fallbackColor,
            fitMode,
            landscapeOverrideUrl,
            portraitOverrideUrl,
            isSampleAsset,
            "focalPoint": coalesce(focalPoint, select(defined(asset.hotspot) => { "x": asset.hotspot.x, "y": asset.hotspot.y }, { "x": 0.5, "y": 0.5 })),
            "crop": coalesce(crop, asset.crop)
          }
        }
      }
    },
    curatorNotes,
    comparison {
      title,
      subtitle,
      rows[]{
        "productId": product->productId,
        bestSuitedRecipient,
        giftStyle,
        practicalUsefulness,
        personalizationOption,
        mainAppeal,
        keyConsideration,
        bestOccasion
      }
    },
    buyingAdviceIntro,
    buyingAdvice,
    faqs[]{
      id,
      question,
      answer,
      "relatedProductId": relatedProduct->productId
    },
    "relatedGuideIds": relatedGuides[]->id,
    "relatedArticleIds": relatedArticles[]->id,
    "citationIds": citations[]->citationId,
    "citations": citations[]->{
      "id": citationId,
      authors,
      year,
      title,
      publication,
      doiOrUrl,
      keyFinding,
      limitations,
      verificationStatus
    }
  }`,

  articleBySlug: `*[_type == "article" && slug.current == $slug][0]{
    "id": coalesce(id, _id),
    "slug": slug.current,
    title,
    subtitle,
    status,
    category,
    featured,
    topics,
    recipients,
    occasions,
    publishedAt,
    updatedAt,
    readTimeMinutes,
    summaryTitle,
    executiveSummary,
    seo,
    "authorId": author->authorId,
    "author": author->{ "id": authorId, name, role, bio, "avatarUrl": coalesce(avatar.asset->url, avatar.url), isSampleAuthor },
    "heroImageUrl": coalesce(heroImage.asset->url, heroImage.url),
    "heroAlt": heroImage.alt,
    "heroCaption": heroImage.caption,
    sections[]{
      id,
      shortNavTitle,
      heading,
      paragraphs,
      portableTextBody,
      subSections,
      pullQuote,
      callout,
      expandableNote,
      expandableAdvice,
      contextualProducts {
        heading,
        editorialContext,
        "productIds": products[]->productId,
        "products": products[]->{
          "id": productId,
          "slug": slug.current,
          title,
          vendor,
          price,
          currency,
          purchaseUrl,
          whyToGiveIt,
          images[]{
            "id": _key,
            "url": coalesce(asset->url, url),
            alt,
            fallbackColor,
            fitMode,
            landscapeOverrideUrl,
            portraitOverrideUrl,
            isSampleAsset,
            "focalPoint": coalesce(focalPoint, select(defined(asset.hotspot) => { "x": asset.hotspot.x, "y": asset.hotspot.y }, { "x": 0.5, "y": 0.5 })),
            "crop": coalesce(crop, asset.crop)
          }
        }
      },
      "recommendedProductIds": recommendedProducts[]->productId
    },
    comparisonTable,
    "citationIds": citations[]->citationId,
    "citations": citations[]->{
      "id": citationId,
      authors,
      year,
      title,
      publication,
      doiOrUrl,
      keyFinding,
      limitations,
      verificationStatus
    },
    "relatedGuideIds": relatedGuides[]->id,
    "relatedArticleIds": relatedArticles[]->id,
    "relatedGuides": relatedGuides[]->{ "id": coalesce(id, _id), "slug": slug.current, title, subtitle, readTimeMinutes },
    "relatedArticles": relatedArticles[]->{ "id": coalesce(id, _id), "slug": slug.current, title, subtitle, category }
  }`,

  editorialHubBySlug: `*[_type == "editorialHub" && slug == $slug][0]{
    id,
    slug,
    routePath,
    title,
    editorialKicker,
    subtitle,
    editorialLeadParagraphs,
    editorialPositioning,
    "heroImage": select(defined(heroImage) => {
      "url": coalesce(heroImage.asset->url, heroImage.url),
      "alt": heroImage.alt,
      "caption": heroImage.caption,
      "isSampleAsset": heroImage.isSampleAsset
    }),
    status,
    seo,
    relationshipPathways,
    interestSlugs,
    budgetBrackets[]{
      id,
      label,
      priceRangeLabel,
      minPrice,
      maxPrice,
      description,
      giftFinderHref,
      "featuredGuideId": featuredGuide->id
    },
    occasionKeys,
    "curatedGuideIds": curatedGuides[]->id,
    "featuredProductIds": curatedProductPicks[].product->productId,
    curatedProductPicks[]{
      selectionSource,
      editorialNote,
      bestForRelationship,
      highlightFormat,
      "productId": product->productId,
      "featuredGuideId": featuredGuide->id
    },
    finderCta,
    seasonalCallout,
    buyingAdviceIntro,
    buyingAdvice,
    "relatedArticleIds": relatedArticles[]->id,
    companionHubSlug,
    minimumRequiredGuides,
    minimumRequiredProducts
  }`,

  taxonomyArchiveByPath: `*[_type == "taxonomyArchive" && routePath == $routePath][0]{
    dimension,
    taxonomyKey,
    routePath,
    label,
    shortLabel,
    description,
    editorialIntroParagraphs,
    spotlight,
    "pinnedGuideIds": pinnedGuides[]->id,
    "pinnedProductIds": pinnedProducts[]->productId,
    status,
    seo
  }`,

  publicationInfoPageBySlug: `*[_type == "publicationInfoPage" && slug == $slug][0]{
    slug,
    currentPath,
    kicker,
    title,
    subtitle,
    lastUpdated,
    ownerReviewSummary,
    sections,
    status,
    seo
  }`,

  siteSettingsSingleton: `*[_type == "siteSettings" && _id == "siteSettings"][0]{
    siteName,
    siteOrigin,
    tagline,
    editorialMissionStatement,
    defaultAffiliateDisclosure,
    footerCopyrightNotice,
    shopExternalUrl,
    homepageHeroKicker,
    homepageHeroTitle,
    homepageHeroSubtitle,
    "homepageFeaturedProductId": homepageFeaturedProduct->productId,
    "homepageFeaturedGuideIds": homepageFeaturedGuides[]->id,
    "homepageFeaturedArticleIds": homepageFeaturedArticles[]->id,
    homepagePullQuote,
    directorySeoEntries,
    defaultOgImageUrl,
    homepageSeo
  }`,
};
