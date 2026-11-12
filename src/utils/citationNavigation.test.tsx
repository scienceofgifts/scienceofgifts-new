import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ARTICLES, CITATIONS } from '../data/catalog';
import {
  STICKY_HEADER_SCROLL_OFFSET_PX,
  buildArticleCitationMap,
  calculateCitationPopoverPosition,
  resolveReferenceTargetId,
  resolveReturnMarkerTarget,
  scrollElementIntoViewWithOffset,
} from './citationNavigation';
import {
  ArticleReaderView,
  RichTextWithCitations,
} from '../components/ArticleReaderView';
import { GiftGuideReaderView } from '../components/GiftGuideReaderView';
import { EditorialProductProfile } from '../components/product/EditorialProductProfile';
import { SANITY_SCHEMA_TYPES, GROQ_QUERIES } from '../cms/sanitySchemas';
import { LocalCMSContentStore } from '../cms/cmsContentStore';
import {
  createContentRepository,
  contentRepository,
} from '../cms/contentRepository';
import {
  buildSuggestedProductDraftFromInput,
  runSafeProductImportPipeline,
  validateProductDraftForPublish,
} from '../cms/productDraftValidator';
import {
  PLANNED_LAUNCH_REDIRECT_MAPPINGS,
  SITE_ORIGIN,
  buildArticleJsonLd,
  buildArticlesDirectoryJsonLd,
  buildCategoryArchiveJsonLd,
  buildDefaultMetaDescription,
  buildDefaultSeoTitle,
  buildEditorialHubJsonLd,
  buildGiftGuideJsonLd,
  buildGiftGuidesDirectoryJsonLd,
  buildProductJsonLd,
  buildWebsiteJsonLd,
  buildXmlSitemapEntries,
  evaluateEditorialHubReadiness,
  evaluateProductCommerceReadiness,
  evaluateSeoLengthGuidance,
  generateRobotsTxt,
  generateXmlSitemap,
  normalizeCanonicalPath,
  resolveCanonicalUrl,
  resolvePageSeoMetadata,
  validateCatalogIntegrity,
  validateSeoAndIndexingSafety,
} from './seoAndValidation';
import { EditorialDiscoveryHubView } from '../components/EditorialDiscoveryHubView';
import {
  PRODUCT_PHOTOGRAPHY_STANDARD,
  buildTransformedImageUrl,
  detectImageCdnProvider,
  normalizeFocalPoint,
  resolveFocalPointObjectPosition,
  resolveProductImageDelivery,
  selectProductImageSourceUrl,
  validateProductImagesCatalog,
  validateProductImagesForProduct,
} from './productImageDelivery';
import { PhotoImage } from '../components/ObjectIllustrations';
import { GiftRecommendation } from '../components/guide/GiftRecommendation';
import {
  DEFAULT_FINDER_FILTERS,
  evaluateGiftFinder,
  parseFinderUrlSearchParams,
  parseNaturalLanguageGiftQuery,
  quizAnswersToFinderFilters,
  serializeFinderUrlSearchParams,
} from './giftFinderEngine';
import {
  THINKING_DURATION_SPECS,
  buildThinkingStatusDescriptor,
  computeRemainingThinkingDelay,
  createThinkingCoordinator,
  getTargetThinkingDurationMs,
} from './giftFinderThinking';
import {
  DEFAULT_LIST_ID,
  GIFT_LISTS_STORAGE_KEY,
  RECIPIENT_NOTES_STORAGE_KEY,
  SAVED_GIFTS_STORAGE_KEY,
  clearAllSavedGifts,
  createGiftList,
  deleteGiftList,
  moveProductBetweenLists,
  readGiftLists,
  readRecipientNotes,
  readSavedProductIds,
  removeProductFromList,
  resolveSavedListItems,
  saveProductToList,
  toggleSavedItemPurchased,
  toggleSavedProductId,
  writeRecipientNote,
} from './savedGiftsStore';
import { GiftFinderExperience } from '../components/GiftFinderExperience';
import { GiftThinkingAnimation } from '../components/GiftThinkingAnimation';
import { ThemeLabExperience } from '../components/ThemeLabExperience';
import {
  DEFAULT_THEME_SETTINGS,
  generateSiteThemeCss,
} from '../styles/themeConfig';
import {
  GiftGuidesDirectoryView,
  MAX_CATEGORY_PREVIEW_ITEMS,
} from '../components/GiftGuidesDirectoryView';
import { ArticlesDirectoryView } from '../components/ArticlesDirectoryView';
import {
  HeaderSearchButtonIsland,
  HeaderSavedButtonIsland,
  MobileNavigationIsland,
  FooterSavedLinkIsland,
  FooterSavedActionsIsland,
} from '../components/islands/AstroIslands';
import { CategoryIcon } from '../components/CategoryIcon';
import { CategoryArchiveView } from '../components/CategoryArchiveView';
import { PublicationInfoPageView } from '../components/PublicationInfoPageView';
import { SiteMapView } from '../components/SiteMapView';
import { SiteSearchModal } from '../components/SiteSearchModal';
import {
  AFFILIATE_DISCLOSURE_CONFIG,
  EDITORIAL_FOOTER_COLUMNS,
  PRIMARY_CTA_LINK,
  PRIMARY_NAV_LINKS,
  SHOP_EXTERNAL_URL,
  SHOP_RETURNS_FAQ_URL,
  resolveCategoryIconKey,
  resolveEditorialHubHeaderLinks,
  resolveHeaderEditorialNavLinks,
} from '../config/navigationConfig';
import {
  buildSiteSearchIndex,
  querySiteSearchIndex,
} from './siteSearchEngine';

test('1. buildArticleCitationMap assigns unique markerIds and maps multiple occurrences to the same reference', () => {
  const article = ARTICLES[0];
  const map = buildArticleCitationMap(article, CITATIONS);

  // 5 unique studies in bibliography
  assert.equal(Object.keys(map.citationIndexMap).length, 5);
  assert.equal(map.citationIndexMap['cit_flynn_adams_2009'], 1);
  assert.equal(map.citationIndexMap['cit_galak_2016'], 2);
  assert.equal(map.citationIndexMap['cit_yang_urminsky_2018'], 3);
  assert.equal(map.citationIndexMap['cit_chan_mogilner_2017'], 4);
  assert.equal(map.citationIndexMap['cit_givi_galak_2017'], 5);

  // 15 total inline citations across the article
  assert.equal(map.occurrences.length, 15);

  // All 15 markerIds must be globally unique
  const uniqueMarkerIds = new Set(map.occurrences.map((o) => o.markerId));
  assert.equal(uniqueMarkerIds.size, 15);

  // Flynn & Adams (2009) is cited 4 times; all 4 occurrences must target #ref-cit_flynn_adams_2009
  const flynnOccurrences = map.occurrencesByCitationId['cit_flynn_adams_2009'];
  assert.equal(flynnOccurrences.length, 4);
  assert.deepEqual(
    flynnOccurrences.map((o) => o.markerId),
    [
      'cite-ref-cit_flynn_adams_2009-1',
      'cite-ref-cit_flynn_adams_2009-2',
      'cite-ref-cit_flynn_adams_2009-3',
      'cite-ref-cit_flynn_adams_2009-4',
    ]
  );
  for (const occ of flynnOccurrences) {
    assert.equal(occ.targetRefId, 'ref-cit_flynn_adams_2009');
    assert.equal(occ.citationNumber, 1);
  }
});

test('2. return navigation resolves to the most recently clicked citation occurrence or defaults to the first occurrence', () => {
  const article = ARTICLES[0];
  const map = buildArticleCitationMap(article, CITATIONS);

  // Default (no prior click): returns first occurrence (1a)
  const defaultTarget = resolveReturnMarkerTarget('cit_flynn_adams_2009', map, {});
  assert.ok(defaultTarget);
  assert.equal(defaultTarget.markerId, 'cite-ref-cit_flynn_adams_2009-1');

  // After clicking the 3rd occurrence of [1]: returns the 3rd occurrence (1c)
  const clickedThirdTarget = resolveReturnMarkerTarget(
    'cit_flynn_adams_2009',
    map,
    {
      cit_flynn_adams_2009: 'cite-ref-cit_flynn_adams_2009-3',
    }
  );
  assert.ok(clickedThirdTarget);
  assert.equal(clickedThirdTarget.markerId, 'cite-ref-cit_flynn_adams_2009-3');
  assert.equal(clickedThirdTarget.sectionId, 'rituals-and-sentimental-courage');

  // After clicking the 4th occurrence of [1] (inside expandable advice): returns 4th occurrence and tracks expandableAdviceId
  const clickedFourthTarget = resolveReturnMarkerTarget(
    'cit_flynn_adams_2009',
    map,
    {
      cit_flynn_adams_2009: 'cite-ref-cit_flynn_adams_2009-4',
    }
  );
  assert.ok(clickedFourthTarget);
  assert.equal(clickedFourthTarget.markerId, 'cite-ref-cit_flynn_adams_2009-4');
  assert.equal(clickedFourthTarget.expandableAdviceId, 'advice-five-questions');
});

test('3. missing or unlisted references are handled gracefully without navigating to wrong locations', () => {
  const article = ARTICLES[0];
  const map = buildArticleCitationMap(article, CITATIONS);

  assert.equal(
    resolveReferenceTargetId('cit_non_existent_9999', map, CITATIONS),
    null
  );
  assert.equal(resolveReferenceTargetId('', map, CITATIONS), null);
  assert.equal(
    resolveReturnMarkerTarget('cit_non_existent_9999', map, {}),
    null
  );

  // Rendering RichTextWithCitations with a missing citation ID omits broken link
  const html = renderToStaticMarkup(
    <RichTextWithCitations
      text="Valid citation [cite:cit_flynn_adams_2009] and missing [cite:cit_missing_id]."
      citationIndexMap={map.citationIndexMap}
      onJumpToReference={() => {}}
    />
  );

  assert.match(html, /href="#ref-cit_flynn_adams_2009"/);
  assert.doesNotMatch(html, /cit_missing_id/);
});

test('4. rendered ArticleReaderView markup links every inline citation to its bibliography entry and renders return links', () => {
  const article = ARTICLES[0];
  const html = renderToStaticMarkup(
    <ArticleReaderView
      article={article}
      savedProductIds={[]}
      onToggleSave={() => {}}
      onSelectProduct={() => {}}
      onSelectGuide={() => {}}
      onSelectArticle={() => {}}
      onBackHome={() => {}}
    />
  );

  // Verify bibliography entries exist with stable IDs
  for (const citId of article.citationIds) {
    assert.match(html, new RegExp(`id="ref-${citId}"`));
  }

  // Verify multiple occurrences of [1] have unique IDs and point to #ref-cit_flynn_adams_2009
  assert.match(html, /id="cite-ref-cit_flynn_adams_2009-1"\s+href="#ref-cit_flynn_adams_2009"/);
  assert.match(html, /id="cite-ref-cit_flynn_adams_2009-2"\s+href="#ref-cit_flynn_adams_2009"/);
  assert.match(html, /id="cite-ref-cit_flynn_adams_2009-3"\s+href="#ref-cit_flynn_adams_2009"/);

  // Verify bibliography return links and occurrence back-links exist
  assert.match(html, /href="#cite-ref-cit_flynn_adams_2009-1"/);
  assert.match(html, /href="#cite-ref-cit_flynn_adams_2009-2"/);
  assert.match(html, /href="#cite-ref-cit_flynn_adams_2009-3"/);
  assert.match(html, /href="#cite-ref-cit_flynn_adams_2009-4"/);
  assert.match(html, /Back to citation in text/);
});

test('5. scrollElementIntoViewWithOffset accounts for sticky header offset', () => {
  let scrolledToTop: number | null = null;
  const originalWindow = (globalThis as any).window;

  try {
    (globalThis as any).window = {
      scrollY: 200,
      matchMedia: () => ({ matches: false }),
      scrollTo: (opts: { top: number; behavior: string }) => {
        scrolledToTop = opts.top;
      },
    };

    const fakeElement = {
      getBoundingClientRect: () => ({ top: 500 }),
    } as unknown as HTMLElement;

    const didScroll = scrollElementIntoViewWithOffset(
      fakeElement,
      STICKY_HEADER_SCROLL_OFFSET_PX
    );
    assert.equal(didScroll, true);
    // 200 (scrollY) + 500 (rect.top) - 104 (sticky offset) = 596
    assert.equal(scrolledToTop, 700 - STICKY_HEADER_SCROLL_OFFSET_PX);

    // Null element handled safely
    assert.equal(scrollElementIntoViewWithOffset(null), false);
  } finally {
    (globalThis as any).window = originalWindow;
  }
});

test('6. ArticleReaderView applies the refined editorial typography & citation palette (#FAF7F2 page, #FFFFFF reference cards, #DFDBD3 borders, #222426/#292B2D/#62666A text, #28537D links, #E5F5EE/#E8F8F0 mint accents)', () => {
  const article = ARTICLES[0];
  const html = renderToStaticMarkup(
    <ArticleReaderView
      article={article}
      savedProductIds={[]}
      onToggleSave={() => {}}
      onSelectProduct={() => {}}
      onSelectGuide={() => {}}
      onSelectArticle={() => {}}
      onBackHome={() => {}}
    />
  );

  // Page background (#FAF7F2) and mint "The Short Version" summary panel preserved
  assert.match(html, /bg-\[#FAF7F2\]/);
  assert.match(html, /id="the-short-version"[^>]*class="[^"]*bg-\[#E8F8F0\]/);

  // "In This Story" contents panel uses #F5F4F0 with subtle #DFDBD3 border
  assert.match(
    html,
    /aria-label="Table of contents"\s+class="[^"]*bg-\[#F5F4F0\]\s+border\s+border-\[#DFDBD3\]/
  );

  // Reference cards use #FFFFFF background and #DFDBD3 border
  assert.match(
    html,
    /id="ref-cit_flynn_adams_2009"\s+class="[^"]*bg-\[#FFFFFF\]\s+border\s+border-\[#DFDBD3\]/
  );

  // Selected occurrence control uses #28537D with #FFFFFF text; unselected uses #E5F5EE with #28537D text
  assert.match(html, /bg-\[#28537D\]\s+text-\[#FFFFFF\]/);
  assert.match(html, /bg-\[#E5F5EE\]\s+text-\[#28537D\]/);
  assert.match(html, /text-\[#222426\]/);
  assert.match(html, /text-\[#292B2D\]/);
  assert.match(html, /text-\[#62666A\]/);
  assert.match(html, /text-\[#28537D\]/);
});

test('7. calculateCitationPopoverPosition places popover below when near top of viewport and prefers above in middle/bottom when room exists', () => {
  const viewport = {
    viewportWidth: 1280,
    viewportHeight: 800,
    stickyHeaderBottom: 64,
  };
  const popoverSize = { width: 384, height: 240 };

  // A. Marker near the top of the viewport (just below sticky header at y=95..115)
  // Available space above = 95 - 10 - (64 + 8) = 13px (< 240px) -> must flip BELOW
  const nearTopPos = calculateCitationPopoverPosition(
    { top: 95, bottom: 115, left: 500, right: 524, width: 24, height: 20 },
    popoverSize,
    viewport
  );
  assert.equal(nearTopPos.shouldClose, false);
  assert.equal(nearTopPos.placement, 'below');
  assert.equal(nearTopPos.top, 115 + 10);
  assert.equal(nearTopPos.isHeightConstrained, false);

  // B. Marker in the middle of the viewport (y=420..440)
  // Available space above = 420 - 10 - 72 = 338px (>= 240px) -> must prefer ABOVE
  const middlePos = calculateCitationPopoverPosition(
    { top: 420, bottom: 440, left: 500, right: 524, width: 24, height: 20 },
    popoverSize,
    viewport
  );
  assert.equal(middlePos.shouldClose, false);
  assert.equal(middlePos.placement, 'above');
  assert.equal(middlePos.top, 420 - 10 - 240);
  assert.equal(middlePos.isHeightConstrained, false);

  // C. Marker near the bottom of the viewport (y=730..750)
  // Available space above = 730 - 10 - 72 = 648px (>= 240px) -> opens ABOVE
  const nearBottomPos = calculateCitationPopoverPosition(
    { top: 730, bottom: 750, left: 500, right: 524, width: 24, height: 20 },
    popoverSize,
    viewport
  );
  assert.equal(nearBottomPos.shouldClose, false);
  assert.equal(nearBottomPos.placement, 'above');
  assert.equal(nearBottomPos.top, 730 - 10 - 240);
  assert.equal(nearBottomPos.isHeightConstrained, false);
});

test('8. calculateCitationPopoverPosition chooses the side with more space and constrains height when neither side has full room', () => {
  const shortViewport = {
    viewportWidth: 1024,
    viewportHeight: 380,
    stickyHeaderBottom: 64,
  };
  const tallPopover = { width: 384, height: 280 };

  // Marker at y=150..170:
  // spaceAbove = 150 - 10 - 72 = 68px
  // spaceBelow = (380 - 16) - (170 + 10) = 184px
  // Neither >= 280px; below has more space (184 > 68) -> placement = 'below', maxHeight = 184, isHeightConstrained = true
  const constrainedBelow = calculateCitationPopoverPosition(
    { top: 150, bottom: 170, left: 400, right: 424, width: 24, height: 20 },
    tallPopover,
    shortViewport
  );
  assert.equal(constrainedBelow.shouldClose, false);
  assert.equal(constrainedBelow.placement, 'below');
  assert.equal(constrainedBelow.isHeightConstrained, true);
  assert.equal(constrainedBelow.maxHeight, 184);
  assert.equal(constrainedBelow.top, 180);

  // Marker at y=280..300:
  // spaceAbove = 280 - 10 - 72 = 198px
  // spaceBelow = 364 - 310 = 54px
  // Neither >= 280px; above has more space (198 > 54) -> placement = 'above', maxHeight = 198, isHeightConstrained = true
  const constrainedAbove = calculateCitationPopoverPosition(
    { top: 280, bottom: 300, left: 400, right: 424, width: 24, height: 20 },
    tallPopover,
    shortViewport
  );
  assert.equal(constrainedAbove.shouldClose, false);
  assert.equal(constrainedAbove.placement, 'above');
  assert.equal(constrainedAbove.isHeightConstrained, true);
  assert.equal(constrainedAbove.maxHeight, 198);
  assert.ok(constrainedAbove.top >= 72);
});

test('9. calculateCitationPopoverPosition clamps horizontal coordinates near left/right edges and on narrow mobile screens', () => {
  const desktopViewport = {
    viewportWidth: 1280,
    viewportHeight: 800,
    stickyHeaderBottom: 64,
  };
  const popoverSize = { width: 384, height: 220 };

  // Near left edge (x=10..34): must clamp left to horizontalMargin (16px)
  const leftEdgePos = calculateCitationPopoverPosition(
    { top: 400, bottom: 420, left: 10, right: 34, width: 24, height: 20 },
    popoverSize,
    desktopViewport
  );
  assert.equal(leftEdgePos.left, 16);
  assert.ok(leftEdgePos.left + leftEdgePos.width <= 1280 - 16);

  // Near right edge (x=1250..1274): must clamp right edge to viewportWidth - 16 (left = 1280 - 16 - 384 = 880)
  const rightEdgePos = calculateCitationPopoverPosition(
    { top: 400, bottom: 420, left: 1250, right: 1274, width: 24, height: 20 },
    popoverSize,
    desktopViewport
  );
  assert.equal(rightEdgePos.left, 1280 - 16 - 384);
  assert.equal(rightEdgePos.left + rightEdgePos.width, 1280 - 16);

  // Narrow mobile viewport (320px wide): width must shrink to 320 - 32 = 288px and stay within [16, 304]
  const narrowMobilePos = calculateCitationPopoverPosition(
    { top: 350, bottom: 370, left: 260, right: 284, width: 24, height: 20 },
    { width: 320, height: 200 },
    { viewportWidth: 320, viewportHeight: 640, stickyHeaderBottom: 56 }
  );
  assert.equal(narrowMobilePos.width, 288);
  assert.equal(narrowMobilePos.left, 16);
  assert.equal(narrowMobilePos.left + narrowMobilePos.width, 320 - 16);
});

test('10. calculateCitationPopoverPosition signals shouldClose when citation marker scrolls out of view', () => {
  const viewport = {
    viewportWidth: 1280,
    viewportHeight: 800,
    stickyHeaderBottom: 64,
  };
  const popoverSize = { width: 384, height: 220 };

  // Scrolled above sticky header (bottom = 60 <= stickyHeaderBottom 64)
  const scrolledAbove = calculateCitationPopoverPosition(
    { top: 40, bottom: 60, left: 500, right: 524, width: 24, height: 20 },
    popoverSize,
    viewport
  );
  assert.equal(scrolledAbove.shouldClose, true);

  // Scrolled below viewport bottom (top = 810 >= viewportHeight 800)
  const scrolledBelow = calculateCitationPopoverPosition(
    { top: 810, bottom: 830, left: 500, right: 524, width: 24, height: 20 },
    popoverSize,
    viewport
  );
  assert.equal(scrolledBelow.shouldClose, true);
});

test('11. Citation section foreground/background and control boundary combinations meet WCAG AA contrast ratios', () => {
  const relativeLuminance = (hex: string): number => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    const toLinear = (c: number) =>
      c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };

  const contrastRatio = (fg: string, bg: string): number => {
    const l1 = relativeLuminance(fg);
    const l2 = relativeLuminance(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  // Normal text combinations must be >= 4.5:1
  const textCombinations: Array<[string, string, string]> = [
    ['Headings (#222426) on Page (#FAF7F2)', '#222426', '#FAF7F2'],
    ['Body text (#292B2D) on Page (#FAF7F2)', '#292B2D', '#FAF7F2'],
    ['Secondary text (#62666A) on Page (#FAF7F2)', '#62666A', '#FAF7F2'],
    ['Links (#28537D) on Page (#FAF7F2)', '#28537D', '#FAF7F2'],
    ['Headings (#222426) on Reference Card (#FFFFFF)', '#222426', '#FFFFFF'],
    ['Body text (#292B2D) on Reference Card (#FFFFFF)', '#292B2D', '#FFFFFF'],
    ['Secondary text (#62666A) on Reference Card (#FFFFFF)', '#62666A', '#FFFFFF'],
    ['Links (#28537D) on Reference Card (#FFFFFF)', '#28537D', '#FFFFFF'],
    ['Headings (#222426) on Soft Mint (#E5F5EE)', '#222426', '#E5F5EE'],
    ['Callout body (#292B2D) on Soft Mint (#E5F5EE)', '#292B2D', '#E5F5EE'],
    ['Callout body (#292B2D) on Blue-Gray (#EBF3FE)', '#292B2D', '#EBF3FE'],
    ['Secondary text (#62666A) on Soft Mint (#E5F5EE)', '#62666A', '#E5F5EE'],
    ['Selected TOC text (#FFFFFF) on Brand Blue (#28537D)', '#FFFFFF', '#28537D'],
    ['Selected control text (#FFFFFF) on Primary Control (#1B3D5F)', '#FFFFFF', '#1B3D5F'],
  ];

  for (const [label, fg, bg] of textCombinations) {
    const ratio = contrastRatio(fg, bg);
    assert.ok(
      ratio >= 4.5,
      `${label} contrast ${ratio.toFixed(2)}:1 is below WCAG AA 4.5:1`
    );
  }

  // Interactive control boundary combinations must be >= 3.0:1
  const controlBoundaries: Array<[string, string, string]> = [
    ['Citation badge border (#62666A) on Card (#FFFFFF)', '#62666A', '#FFFFFF'],
    ['Selected TOC fill (#28537D) on Page (#FAF7F2)', '#28537D', '#FAF7F2'],
    ['Selected control fill (#1B3D5F) on Card (#FFFFFF)', '#1B3D5F', '#FFFFFF'],
    ['Highlighted card border/ring (#1B3D5F) on Page (#FAF7F2)', '#1B3D5F', '#FAF7F2'],
  ];

  for (const [label, borderOrControl, surface] of controlBoundaries) {
    const ratio = contrastRatio(borderOrControl, surface);
    assert.ok(
      ratio >= 3.0,
      `${label} contrast ${ratio.toFixed(2)}:1 is below WCAG AA 3.0:1`
    );
  }
});

test('12. Sanity CMS schemas and AI-assisted product draft validator enforce canonical references and non-hallucinated fields', () => {
  // Verify the 6 consolidated Sanity document schemas exist
  const schemaNames = SANITY_SCHEMA_TYPES.map((s) => s.name);
  assert.deepEqual(schemaNames, [
    'product',
    'giftGuide',
    'article',
    'researchCitation',
    'author',
    'siteSettings',
  ]);
  assert.ok(GROQ_QUERIES.giftGuideBySlug.includes('product->'));
  assert.ok(GROQ_QUERIES.articleBySlug.includes('citations[]->'));

  // 1. Sample with missing price in structured data must NOT hallucinate price and must block publish until verified
  const unverifiedDraft = buildSuggestedProductDraftFromInput({
    sourceUrl: 'https://www.artifactuprising.com/photo-gifts/custom-photo-puzzle',
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=85',
    scrapedMetadata: {
      ogTitle: 'Custom 1000-Piece Archival Linen Photo Puzzle',
      ogSiteName: 'Artifact Uprising',
      ogDescription: 'Sturdy recycled chipboard with linen-textured matte finish.',
      // Notice: jsonLdPrice and jsonLdAvailability are intentionally absent
    },
  });
  assert.equal(unverifiedDraft.price, null);
  assert.equal(unverifiedDraft.priceVerified, false);
  assert.equal(
    unverifiedDraft.provenance.price,
    'missing_requires_manual_entry'
  );

  const initialValidation = validateProductDraftForPublish(unverifiedDraft);
  assert.equal(initialValidation.valid, false);
  assert.ok(initialValidation.errors.length >= 2);
  assert.equal(initialValidation.canonicalProduct, undefined);

  // 2. After human editor supplies verified price, stock status, and approves review, canonical Product builds cleanly
  const reviewedDraft = {
    ...unverifiedDraft,
    price: 75,
    priceVerified: true,
    inStock: true,
    humanReviewed: true,
  };
  const approvedValidation = validateProductDraftForPublish(reviewedDraft);
  assert.equal(approvedValidation.valid, true);
  assert.equal(approvedValidation.errors.length, 0);
  assert.ok(approvedValidation.canonicalProduct);
  assert.equal(approvedValidation.canonicalProduct.price, 75);
  assert.equal(
    approvedValidation.canonicalProduct.slug,
    'custom-1000-piece-archival-linen-photo-puzzle'
  );
});

test('13. Central CMS Workflow: Canonical product referenced in GiftGuide and Article propagates single-record updates to both rendered pages and preserves structured headings, citations, and SEO metadata', () => {
  // Start with an isolated development-only CMS content store (no default catalog records)
  const store = new LocalCMSContentStore(false);

  // Create Author and verified ResearchCitation
  store.upsertAuthor({
    id: 'author_clara_vance',
    name: 'Dr. Clara Vance',
    role: 'Behavioral Scientist & Senior Editor',
    bio: 'Studies interpersonal rituals and consumer psychology.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  });

  store.upsertCitation({
    id: 'cit_chan_mogilner_2017',
    authors: 'Chan, C., & Mogilner, C.',
    year: 2017,
    title: 'Experiential Gifts Foster Stronger Social Relationships Than Material Gifts',
    publication: 'Journal of Consumer Research, 43(6), 913–931',
    doiOrUrl: 'https://doi.org/10.1093/jcr/ucw067',
    keyFinding:
      'Gifts that evoke shared or repeated lived experiences strengthen relationship closeness significantly more than purely decorative objects.',
    limitations:
      'Measured perceived relationship closeness across North American adult dyads.',
    verificationStatus: 'verified-doi',
  });

  // 1. Create a canonical product
  store.upsertProduct({
    id: 'prod_kinto_ceramic_mug_01',
    slug: 'kinto-hasami-porcelain-mug',
    title: 'Kinto Hasami Porcelain Mug (Original Title)',
    subtitle: 'Tactile matte porcelain mug crafted in Nagasaki.',
    vendor: 'Kinto Japan',
    price: 34,
    currency: 'USD',
    budgetTier: 'under-50',
    guidePriceBucket: '25-to-75',
    productType: 'Tea & Coffee Rituals',
    commerceProvider: 'affiliate',
    purchaseUrl: 'https://kinto-usa.com/products/hasami-porcelain-mug',
    inStock: true,
    whyToGiveIt:
      'Canonical rationale: turns every morning coffee into a grounded tactile ritual.',
    detailsAndCare: '380ml capacity. Dishwasher and microwave safe.',
    bestForSummary: 'Coffee drinkers and remote workers.',
    recipients: ['friend', 'partner', 'coworker'],
    interests: ['Coffee', 'Ceramics'],
    ageRanges: ['adult'],
    occasions: ['birthday', 'thank-you'],
    personalityTraits: ['everyday-ritual'],
    images: [
      {
        id: 'img_kinto_01',
        url: 'https://images.unsplash.com/photo-initial-kinto-mug.jpg',
        fallbackColor: '#E5F5EE',
        alt: 'Natural matte porcelain Kinto mug on a cedar tray',
      },
    ],
    citationIds: ['cit_chan_mogilner_2017'],
  });

  // 2. Reference that product in a Gift Guide with guide-specific editorial framing
  store.upsertGiftGuide({
    id: 'guide_morning_rituals_test',
    slug: 'morning-coffee-ritual-gifts',
    title: 'Best Gifts for Morning Coffee Rituals',
    subtitle: 'Tactile vessels and tools for better mornings.',
    introParagraphs: ['We tested 18 vessels for heat retention and balance.'],
    whoThisGuideIsFor: ['Pour-over enthusiasts', 'Remote coworkers'],
    affiliateDisclosure: store.getSiteSettings().defaultAffiliateDisclosure,
    seo: {
      seoTitle: 'Morning Coffee Ritual Gifts (2026 Guide) | Science of Gifts',
      metaDescription: 'Curated stoneware and porcelain gifts for daily coffee drinkers.',
      canonicalPath: '/guides/morning-coffee-ritual-gifts',
      ogType: 'article',
      schemaType: 'ItemList',
    },
    category: 'Kitchen & Rituals',
    publishedAt: '2026-10-15',
    updatedAt: '2026-10-27',
    readTimeMinutes: 6,
    authorId: 'author_clara_vance',
    heroImageUrl: 'https://images.unsplash.com/photo-guide-hero.jpg',
    heroImageAlt: 'Morning coffee pour-over setup',
    accentTone: 'mint',
    editorsPick: {
      productId: 'prod_kinto_ceramic_mug_01',
      kicker: 'Editor’s Standout Pick',
      headline: 'Best Overall Daily Vessel',
      editorialRationale: 'Unmatched lip feel and stackable Nagasaki stoneware.',
      intendedRecipientAndSituation: 'Ideal for a close friend or partner.',
      targetSectionId: 'sec-25-to-75',
    },
    quickPicks: [
      {
        id: 'qp_1',
        label: 'Best Everyday Mug',
        productId: 'prod_kinto_ceramic_mug_01',
        reason: 'Warm unglazed rim and generous handle.',
        targetSectionId: 'sec-25-to-75',
      },
    ],
    buyingAdvice: [],
    sections: [
      {
        id: 'sec-25-to-75',
        shortNavTitle: '$25 to $75',
        title: 'Everyday Upgrades ($25–$75)',
        priceRangeLabel: '$25–$75',
        summary: 'Thoughtful daily objects.',
        accentSurface: 'mint',
        recommendations: [
          {
            productId: 'prod_kinto_ceramic_mug_01',
            awardLabel: 'Best Tactile Finish',
            customEditorialNote:
              'Guide-specific override: Pairs beautifully with a bag of single-origin beans.',
            idealFor: 'Daily espresso and filter coffee drinkers.',
            goodToKnow: 'Unglazed exterior patinas gently over time.',
            layoutHighlight: 'feature-horizontal',
          },
        ],
      },
    ],
    relatedGuideIds: [],
    relatedArticleIds: [],
    citationIds: ['cit_chan_mogilner_2017'],
  });

  // 3. Reference the same product in an Article with structured H2/H3 headings, citations, and SEO metadata
  store.upsertArticle({
    id: 'art_ritual_objects_test',
    slug: 'why-daily-ritual-objects-build-closer-bonds',
    title: 'Why Daily Ritual Objects Build Closer Bonds',
    subtitle: 'How repeatable daily utility turns a material object into an experiential gift.',
    seo: {
      seoTitle: 'Why Daily Ritual Gifts Strengthen Relationships (Research) | Science of Gifts',
      metaDescription: 'Peer-reviewed consumer psychology on why ritual objects outperform novelty gifts.',
      canonicalPath: '/articles/why-daily-ritual-objects-build-closer-bonds',
      ogType: 'article',
      schemaType: 'Article',
    },
    category: 'Relationship Psychology',
    publishedAt: '2026-10-20',
    updatedAt: '2026-10-27',
    authorId: 'author_clara_vance',
    heroImageUrl: 'https://images.unsplash.com/photo-article-hero.jpg',
    heroAlt: 'Two hands holding a warm ceramic mug by a window',
    heroCaption: 'Repeated sensory utility anchors relational memory.',
    summaryTitle: 'Key Research Takeaways',
    executiveSummary: [
      'Repeated daily use reactivates gratitude toward the giver.',
      'Experiential framing works on physical objects used in daily rituals.',
    ],
    sections: [
      {
        id: 'sec-habitual-gratitude',
        shortNavTitle: 'Habitual Gratitude',
        heading: 'How Daily Utility Sustains Emotional Closeness',
        paragraphs: [
          'Research by Chan and Mogilner demonstrates that gifts evoking repeated lived experiences strengthen social bonds [cite:cit_chan_mogilner_2017].',
        ],
        subSections: [
          {
            id: 'sub-sensory-cues',
            subheading: 'Tactile Cues and Morning Routines',
            paragraphs: [
              'When an object is held every morning, its physical texture serves as a relational reminder [cite:cit_chan_mogilner_2017].',
            ],
          },
        ],
        contextualProducts: {
          heading: 'Ritual Objects That Anchor Daily Routines',
          editorialContext: 'Selected from our canonical catalog for tactile utility.',
          productIds: ['prod_kinto_ceramic_mug_01'],
        },
      },
    ],
    citationIds: ['cit_chan_mogilner_2017'],
    relatedGuideIds: ['guide_morning_rituals_test'],
    relatedArticleIds: [],
  });

  const initialSnapshot = store.getCatalogSnapshot();
  assert.equal(Object.keys(initialSnapshot.products!).length, 1);
  assert.equal(store.validateIntegrity().passed, true);

  const guide = store.getGiftGuideBySlug('morning-coffee-ritual-gifts')!;
  const article = store.getArticleBySlug('why-daily-ritual-objects-build-closer-bonds')!;

  // Render both pages before canonical product update
  const initialGuideHtml = renderToStaticMarkup(
    <GiftGuideReaderView
      guide={guide}
      savedProductIds={[]}
      onToggleSave={() => {}}
      onSelectProduct={() => {}}
      onSelectGuide={() => {}}
      onSelectArticle={() => {}}
      onBackHome={() => {}}
      catalog={initialSnapshot}
    />
  );
  const initialArticleHtml = renderToStaticMarkup(
    <ArticleReaderView
      article={article}
      savedProductIds={[]}
      onToggleSave={() => {}}
      onSelectProduct={() => {}}
      onSelectGuide={() => {}}
      onSelectArticle={() => {}}
      onBackHome={() => {}}
      catalog={initialSnapshot}
    />
  );

  assert.ok(initialGuideHtml.includes('Kinto Hasami Porcelain Mug (Original Title)'));
  assert.ok(initialGuideHtml.includes('https://images.unsplash.com/photo-initial-kinto-mug.jpg'));
  assert.ok(initialArticleHtml.includes('Kinto Hasami Porcelain Mug (Original Title)'));
  assert.ok(initialArticleHtml.includes('https://images.unsplash.com/photo-initial-kinto-mug.jpg'));

  // 4. Change the canonical product's name and image in ONE place
  store.updateCanonicalProduct('prod_kinto_ceramic_mug_01', {
    title: 'Kinto Hasami Porcelain Mug — Amber Glaze Edition',
    images: [
      {
        id: 'img_kinto_02',
        url: 'https://images.unsplash.com/photo-updated-amber-glaze-mug.jpg',
        fallbackColor: '#E5F5EE',
        alt: 'Updated amber-glazed Kinto Hasami porcelain mug on linen',
      },
    ],
  });

  // 5. Verify both pages and JSON-LD reflect the updated canonical record without duplicating product data
  const updatedSnapshot = store.getCatalogSnapshot();
  assert.equal(
    Object.keys(updatedSnapshot.products!).length,
    1,
    'Canonical product count must remain 1 (no duplicated product records)'
  );

  const updatedGuideHtml = renderToStaticMarkup(
    <GiftGuideReaderView
      guide={store.getGiftGuideBySlug('morning-coffee-ritual-gifts')!}
      savedProductIds={[]}
      onToggleSave={() => {}}
      onSelectProduct={() => {}}
      onSelectGuide={() => {}}
      onSelectArticle={() => {}}
      onBackHome={() => {}}
      catalog={updatedSnapshot}
    />
  );
  const updatedArticleHtml = renderToStaticMarkup(
    <ArticleReaderView
      article={store.getArticleBySlug('why-daily-ritual-objects-build-closer-bonds')!}
      savedProductIds={[]}
      onToggleSave={() => {}}
      onSelectProduct={() => {}}
      onSelectGuide={() => {}}
      onSelectArticle={() => {}}
      onBackHome={() => {}}
      catalog={updatedSnapshot}
    />
  );

  assert.ok(
    !updatedGuideHtml.includes('Kinto Hasami Porcelain Mug (Original Title)'),
    'Old product title must no longer appear in Gift Guide'
  );
  assert.ok(
    updatedGuideHtml.includes('Kinto Hasami Porcelain Mug — Amber Glaze Edition'),
    'Updated canonical product title must appear in Gift Guide'
  );
  assert.ok(
    updatedGuideHtml.includes('https://images.unsplash.com/photo-updated-amber-glaze-mug.jpg'),
    'Updated canonical product image URL must appear in Gift Guide'
  );
  assert.ok(
    updatedGuideHtml.includes('Guide-specific override: Pairs beautifully with a bag of single-origin beans.'),
    'Guide-specific customEditorialNote must remain intact'
  );

  assert.ok(
    !updatedArticleHtml.includes('Kinto Hasami Porcelain Mug (Original Title)'),
    'Old product title must no longer appear in Article'
  );
  assert.ok(
    updatedArticleHtml.includes('Kinto Hasami Porcelain Mug — Amber Glaze Edition'),
    'Updated canonical product title must appear in Article contextual products block'
  );
  assert.ok(
    updatedArticleHtml.includes('https://images.unsplash.com/photo-updated-amber-glaze-mug.jpg'),
    'Updated canonical product image URL must appear in Article'
  );
  assert.ok(
    updatedArticleHtml.includes('Canonical rationale: turns every morning coffee into a grounded tactile ritual.'),
    'Article contextual block uses canonical whyToGiveIt while guide uses its override'
  );

  // 6 & 7. Verify structured H2/H3 headings, citation references, and SEO metadata are preserved
  assert.ok(
    updatedArticleHtml.includes('<h2 id="h2-sec-habitual-gratitude"'),
    'Structured H2 heading with deterministic ID is rendered'
  );
  assert.ok(
    updatedArticleHtml.includes('How Daily Utility Sustains Emotional Closeness</h2>'),
    'H2 heading text is preserved'
  );
  assert.ok(
    updatedArticleHtml.includes('Tactile Cues and Morning Routines</h3>'),
    'Structured H3 subheading is preserved'
  );
  assert.ok(
    updatedArticleHtml.includes('id="cite-ref-cit_chan_mogilner_2017-1"'),
    'First inline citation occurrence ID is preserved'
  );
  assert.ok(
    updatedArticleHtml.includes('id="cite-ref-cit_chan_mogilner_2017-2"'),
    'Second inline citation occurrence ID in H3 subsection is preserved'
  );
  assert.ok(
    updatedArticleHtml.includes('id="ref-cit_chan_mogilner_2017"'),
    'Bibliography reference card ID is preserved'
  );

  const guideJsonLd = buildGiftGuideJsonLd(guide, updatedSnapshot);
  const articleJsonLd = buildArticleJsonLd(article, updatedSnapshot);
  const firstGuideItem = guideJsonLd['@graph'][1].itemListElement?.[0]?.item;
  assert.ok(firstGuideItem && typeof firstGuideItem === 'object');
  assert.equal(
    firstGuideItem.name,
    'Kinto Hasami Porcelain Mug — Amber Glaze Edition'
  );
  assert.equal(
    articleJsonLd['@graph'][1].name,
    'Why Daily Ritual Gifts Strengthen Relationships (Research) | Science of Gifts'
  );
  assert.equal(
    articleJsonLd['@graph'][1].description,
    'Peer-reviewed consumer psychology on why ritual objects outperform novelty gifts.'
  );
  assert.equal(
    articleJsonLd['@graph'][1].mainEntityOfPage,
    'https://www.scienceofgifts.com/articles/why-daily-ritual-objects-build-closer-bonds'
  );
  assert.equal(articleJsonLd['@graph'][1].citation?.length, 1);
  assert.equal(
    articleJsonLd['@graph'][1].citation?.[0].url,
    'https://doi.org/10.1093/jcr/ucw067'
  );
});

test('14. Safe AI Product Import Pipeline verifies all 6 deterministic edge-case fixtures without guessing prices or publishing unreviewed drafts', () => {
  // Fixture 1: Product page with valid Schema.org Product metadata and price
  const validHtmlFixture = `
    <!doctype html>
    <html>
      <head>
        <meta property="og:title" content="Hand-Carved Walnut Espresso Tamper" />
        <meta property="og:site_name" content="Saint Anthony Industries" />
        <meta property="og:description" content="Precision stainless base with American black walnut handle." />
        <meta property="og:image" content="https://images.unsplash.com/photo-tamper.jpg" />
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Hand-Carved Walnut Espresso Tamper",
            "brand": { "@type": "Brand", "name": "Saint Anthony Industries" },
            "offers": {
              "@type": "Offer",
              "price": "68.00",
              "priceCurrency": "USD",
              "availability": "https://schema.org/InStock"
            }
          }
        </script>
      </head>
      <body><h1>Hand-Carved Walnut Espresso Tamper</h1></body>
    </html>
  `;
  const resValid = runSafeProductImportPipeline({
    sourceUrl: 'https://saintanthonyindustries.com/products/walnut-tamper',
    merchantFetchResult: {
      httpStatus: 200,
      ok: true,
      rawHtml: validHtmlFixture,
    },
  });
  assert.equal(resValid.status, 'draft_created');
  assert.ok(resValid.draft);
  assert.equal(resValid.draft.price, 68);
  assert.equal(resValid.draft.priceVerified, true);
  assert.equal(resValid.draft.inStock, true);
  assert.equal(resValid.draft.provenance.price, 'verified_deterministic');
  assert.equal(resValid.draft.humanReviewed, false);
  // Must remain a blocked draft until humanReviewed === true
  assert.equal(resValid.publishValidation?.valid, false);

  // Fixture 2: Page WITHOUT structured price data (mentions $95 in prose, but no Schema.org Offer price)
  const noPriceHtmlFixture = `
    <!doctype html>
    <html>
      <head>
        <meta property="og:title" content="Bespoke Linen Photo Album" />
        <meta property="og:site_name" content="Atelier Bindery" />
      </head>
      <body>
        <p>Our albums start around $95 or $140 depending on embossing options.</p>
      </body>
    </html>
  `;
  const resNoPrice = runSafeProductImportPipeline({
    sourceUrl: 'https://atelierbindery.example.com/products/linen-album',
    merchantFetchResult: {
      httpStatus: 200,
      ok: true,
      rawHtml: noPriceHtmlFixture,
    },
  });
  assert.equal(resNoPrice.status, 'draft_created');
  assert.ok(resNoPrice.draft);
  assert.equal(resNoPrice.draft.price, null);
  assert.equal(resNoPrice.draft.priceVerified, false);
  assert.equal(resNoPrice.draft.inStock, null);
  assert.equal(resNoPrice.draft.provenance.price, 'missing_requires_manual_entry');
  assert.equal(resNoPrice.publishValidation?.valid, false);

  // Fixture 3: Malformed or non-HTTPS URL
  const resMalformedUrl = runSafeProductImportPipeline({
    sourceUrl: 'not-a-valid-url-at-all',
  });
  assert.equal(resMalformedUrl.status, 'failed');
  assert.equal(resMalformedUrl.errorCode, 'MALFORMED_URL');
  assert.equal(resMalformedUrl.draft, undefined);

  const resInsecureUrl = runSafeProductImportPipeline({
    sourceUrl: 'http://insecure-merchant.example.com/product',
  });
  assert.equal(resInsecureUrl.status, 'failed');
  assert.equal(resInsecureUrl.errorCode, 'MALFORMED_URL');
  assert.equal(resInsecureUrl.draft, undefined);

  // Fixture 4: Failed or blocked merchant request (HTTP 403 Bot Challenge)
  const resBlockedMerchant = runSafeProductImportPipeline({
    sourceUrl: 'https://protected-merchant.example.com/products/vase',
    merchantFetchResult: {
      httpStatus: 403,
      ok: false,
      errorMessage: 'HTTP 403 Forbidden (Cloudflare Bot Fight Mode)',
    },
  });
  assert.equal(resBlockedMerchant.status, 'failed');
  assert.equal(resBlockedMerchant.errorCode, 'MERCHANT_REQUEST_FAILED');
  assert.equal(resBlockedMerchant.draft, undefined);

  // Fixture 5: Missing or invalid image alt text
  const draftMissingAlt = {
    ...resValid.draft!,
    imageAlt: '   ',
    humanReviewed: true,
  };
  const altValidation = validateProductDraftForPublish(draftMissingAlt);
  assert.equal(altValidation.valid, false);
  assert.ok(
    altValidation.errors.some((e) => e.toLowerCase().includes('alt text'))
  );

  // Fixture 6: AI response containing missing/invalid fields + attempted price hallucination
  const resBadAi = runSafeProductImportPipeline({
    sourceUrl: 'https://atelierbindery.example.com/products/linen-album',
    merchantFetchResult: {
      httpStatus: 200,
      ok: true,
      rawHtml: noPriceHtmlFixture,
    },
    untrustedAiResponse: {
      price: 95, // Attempted AI price guess from unstructured body text — MUST be stripped!
      inStock: true, // Attempted AI stock guess — MUST be stripped!
      whyToGiveIt: 'Too short', // < 20 chars -> invalid
      bestForSummary: '', // empty -> invalid
      imageAlt: 'album', // < 10 chars -> invalid
      recipients: ['martian_colonist'], // outside RecipientType enum -> rejected
      occasions: [], // empty -> invalid
      personalityTraits: ['invalid_archetype'], // outside PersonalityTrait enum -> rejected
    },
  });
  assert.equal(resBadAi.status, 'draft_created');
  assert.ok(resBadAi.draft);
  assert.equal(
    resBadAi.draft.price,
    null,
    'AI-supplied price must be stripped when deterministic metadata has no price'
  );
  assert.equal(
    resBadAi.draft.inStock,
    null,
    'AI-supplied inStock must be stripped when deterministic metadata has no availability'
  );
  assert.equal(resBadAi.draft.recipients.length, 0);
  assert.equal(resBadAi.draft.personalityTraits.length, 0);
  assert.equal(
    resBadAi.draft.provenance.editorialCopy,
    'invalid_ai_output_rejected'
  );
  assert.equal(
    resBadAi.draft.provenance.taxonomy,
    'invalid_ai_output_rejected'
  );
  assert.equal(
    resBadAi.draft.provenance.imageAlt,
    'invalid_ai_output_rejected'
  );
  assert.equal(resBadAi.publishValidation?.valid, false);
  assert.ok((resBadAi.publishValidation?.errors.length ?? 0) >= 6);
});

test('15. Astro contentRepository resolves routes for gift guides, articles, and products and generates Product Schema.org JSON-LD', () => {
  const allGuides = contentRepository.getAllGiftGuides();
  const allArticles = contentRepository.getAllArticles();
  const allProducts = contentRepository.getAllProducts();

  assert.equal(allGuides.length, 2);
  assert.equal(allArticles.length, 2);
  assert.equal(allProducts.length, 13);

  const guide = contentRepository.getGiftGuideBySlug(
    'thoughtful-gifts-for-people-who-appreciate-the-little-things'
  );
  assert.ok(guide);
  assert.equal(
    guide.seo.canonicalPath,
    '/gift-guides/thoughtful-gifts-for-people-who-appreciate-the-little-things/'
  );

  const article = contentRepository.getArticleBySlug(
    'why-thoughtful-gifts-matter-more-than-expensive-ones'
  );
  assert.ok(article);
  assert.equal(
    article.seo.canonicalPath,
    '/articles/why-thoughtful-gifts-matter-more-than-expensive-ones/'
  );

  const product = contentRepository.getProductBySlug(
    'hand-blown-two-tone-bedside-water-carafe-and-glass'
  );
  assert.ok(product);
  assert.equal(product.id, 'prod_fluted_bedside_carafe_09');

  const guidesWithCarafe = contentRepository.getGuidesFeaturingProduct(product.id);
  const articlesWithCarafe = contentRepository.getArticlesFeaturingProduct(product.id);
  assert.ok(guidesWithCarafe.length >= 1);
  assert.ok(articlesWithCarafe.length >= 1);

  // Sample product from catalog.ts omits structured Offer and stock claims
  const sampleProductJsonLd = buildProductJsonLd(product);
  assert.equal(sampleProductJsonLd['@graph'][1]['@type'], 'Product');
  assert.equal(
    sampleProductJsonLd['@graph'][1]['@id'],
    'https://www.scienceofgifts.com/products/hand-blown-two-tone-bedside-water-carafe-and-glass/'
  );
  assert.equal(
    sampleProductJsonLd['@graph'][1].offers,
    undefined,
    'Development sample product with placeholder link must not emit structured Offer'
  );

  // Verified merchant product emits Offer with price and currency, and only emits availability when inventoryVerified is true
  const verifiedProduct = {
    ...product,
    vendor: 'Atelier Verre',
    purchaseUrl: 'https://atelierverre.com/products/bedside-water-carafe',
    isPlaceholderLink: false,
    isSampleProduct: false,
    priceVerified: true,
  };
  const verifiedProductJsonLd = buildProductJsonLd(verifiedProduct);
  assert.equal(verifiedProductJsonLd['@graph'][1].offers?.price, 48);
  assert.equal(verifiedProductJsonLd['@graph'][1].offers?.priceCurrency, 'USD');
  assert.equal(
    verifiedProductJsonLd['@graph'][1].offers?.availability,
    undefined,
    'Must not assert InStock from sample catalog boolean when inventoryVerified is not true'
  );
});

test('16. Natural-language query parser recognizes recipient synonyms, interests, occasions, gift styles, and explicit budget constraints', () => {
  const q1 = parseNaturalLanguageGiftQuery('tea gifts for mom under $50');
  assert.ok(q1.inferredRecipients.includes('parent'));
  assert.ok(q1.inferredInterests.includes('Coffee & Tea'));
  assert.equal(q1.parsedMaxPrice, 50);
  assert.equal(q1.hasExplicitBudgetConstraint, true);

  const q2 = parseNaturalLanguageGiftQuery(
    'housewarming gift for someone who likes plants'
  );
  assert.ok(q2.inferredOccasions.includes('housewarming'));
  assert.ok(q2.inferredInterests.includes('Gardening'));
  assert.ok(q2.inferredCategories.includes('Plants & Gardening'));
  assert.ok(q2.inferredPersonalityTraits.includes('outdoors-nature'));
  assert.equal(q2.parsedMaxPrice, null);

  const q3 = parseNaturalLanguageGiftQuery('practical gift for dad');
  assert.ok(q3.inferredRecipients.includes('parent'));
  assert.ok(q3.inferredPersonalityTraits.includes('everyday-ritual'));

  const qRange = parseNaturalLanguageGiftQuery(
    'anniversary present for wife between $25 and $75'
  );
  assert.ok(qRange.inferredRecipients.includes('partner'));
  assert.ok(qRange.inferredOccasions.includes('anniversary'));
  assert.equal(qRange.parsedMinPrice, 25);
  assert.equal(qRange.parsedMaxPrice, 75);

  const qBelow = parseNaturalLanguageGiftQuery('hostess gift below $75');
  assert.ok(qBelow.inferredRecipients.includes('host'));
  assert.equal(qBelow.parsedMaxPrice, 75);

  const qMax = parseNaturalLanguageGiftQuery('coworker thank you max $40');
  assert.ok(qMax.inferredRecipients.includes('coworker'));
  assert.ok(qMax.inferredOccasions.includes('thank-you'));
  assert.equal(qMax.parsedMaxPrice, 40);
});

test('17. Deterministic ranking engine prioritizes multi-signal matches and enforces hard budget caps', () => {
  const allProducts = contentRepository.getAllProducts();
  const guides = contentRepository.getAllGiftGuides();
  const articles = contentRepository.getAllArticles();

  // A. "tea gifts for mom under $50":
  // Must exclude the $58 Matcha Bowl because $58 > $50, and rank tea-suitable parent gifts <= $50 first
  const evalMomTeaUnder50 = evaluateGiftFinder(
    allProducts,
    { query: 'tea gifts for mom under $50' },
    { guides, articles }
  );
  assert.equal(evalMomTeaUnder50.effectiveMaxPrice, 50);
  assert.ok(evalMomTeaUnder50.results.length >= 1);
  for (const res of evalMomTeaUnder50.results) {
    assert.ok(
      res.product.price <= 50,
      `Product ${res.product.id} ($${res.product.price}) exceeded $50 cap`
    );
  }
  assert.ok(
    !evalMomTeaUnder50.results.some(
      (r) => r.product.id === 'prod_kyoto_matcha_bowl_03'
    ),
    '$58 Matcha Bowl must be excluded from under-$50 search'
  );
  assert.equal(
    evalMomTeaUnder50.results[0].product.id,
    'prod_chili_honey_flight_01'
  );

  // B. "tea gifts for mom under $75":
  // Now the $58 Matcha Bowl is within budget and matches Coffee & Tea + parent + tea keyword -> ranks #1
  const evalMomTeaUnder75 = evaluateGiftFinder(
    allProducts,
    { query: 'tea gifts for mom under $75' },
    { guides, articles }
  );
  assert.equal(
    evalMomTeaUnder75.results[0].product.id,
    'prod_kyoto_matcha_bowl_03'
  );

  // C. "housewarming gift for someone who likes plants":
  // Self-Watering Terracotta Windowsill Herb Trio ($45) matches housewarming + Plants & Gardening + Gardening + plant keyword -> ranks #1
  const evalHousewarmingPlants = evaluateGiftFinder(
    allProducts,
    { query: 'housewarming gift for someone who likes plants' },
    { guides, articles }
  );
  assert.ok(evalHousewarmingPlants.results.length >= 1);
  assert.equal(
    evalHousewarmingPlants.results[0].product.id,
    'prod_terracotta_herb_kit_06'
  );

  // D. "practical gift for dad":
  // Prioritizes parent + everyday-ritual / practical items
  const evalPracticalDad = evaluateGiftFinder(
    allProducts,
    { query: 'practical gift for dad' },
    { guides, articles }
  );
  assert.ok(evalPracticalDad.results.length >= 1);
  const topDadProduct = evalPracticalDad.results[0].product;
  assert.ok(topDadProduct.recipients.includes('parent'));
  assert.ok(topDadProduct.personalityTraits.includes('everyday-ritual'));
  // French Butter Crock explicitly mentions "practical minimalists" in bestForSummary
  assert.equal(topDadProduct.id, 'prod_french_butter_crock_12');
});

test('18. Hard budget constraints exclude products with missing, null, NaN, or zero prices and sort handles missing prices safely', () => {
  const baseProducts = contentRepository.getAllProducts();
  const productWithMissingPrice = {
    ...structuredClone(baseProducts[0]),
    id: 'prod_unpriced_test_99',
    slug: 'unpriced-mystery-vessel',
    title: 'Unpriced Ceramic Tea Vessel',
    price: undefined as unknown as number,
  };
  const productWithZeroPrice = {
    ...structuredClone(baseProducts[0]),
    id: 'prod_zero_price_98',
    slug: 'zero-priced-vessel',
    title: 'Zero Priced Tea Vessel',
    price: 0,
  };

  const mixedCatalog = [
    ...baseProducts,
    productWithMissingPrice,
    productWithZeroPrice,
  ];

  // When a budget cap is active (via query or filter), unpriced and zero-priced products MUST be excluded
  const under50Eval = evaluateGiftFinder(mixedCatalog, {
    query: 'tea under $50',
  });
  assert.ok(
    !under50Eval.results.some(
      (r) =>
        r.product.id === 'prod_unpriced_test_99' ||
        r.product.id === 'prod_zero_price_98'
    ),
    'Missing or zero price products must never be included in verified under-budget results'
  );

  const filterMaxEval = evaluateGiftFinder(mixedCatalog, {
    maxPrice: 100,
  });
  assert.ok(
    !filterMaxEval.results.some(
      (r) =>
        r.product.id === 'prod_unpriced_test_99' ||
        r.product.id === 'prod_zero_price_98'
    )
  );

  // When no budget cap is active and sorting by price-asc, missing-price products sort to the very end (not treated as $0 first)
  const sortAscNoCap = evaluateGiftFinder(mixedCatalog, {
    sort: 'price-asc',
  });
  assert.equal(
    sortAscNoCap.results[0].product.price,
    18,
    'Lowest verified price ($18) must appear first in price-asc sort, not missing/0 price'
  );
  const lastIds = sortAscNoCap.results.slice(-2).map((r) => r.product.id);
  assert.ok(lastIds.includes('prod_unpriced_test_99'));
  assert.ok(lastIds.includes('prod_zero_price_98'));
});

test('19. Combined faceted filters, guided quiz mapping, and truthful match explanations work without fabricating signals', () => {
  const allProducts = contentRepository.getAllProducts();

  // Guided quiz answers -> shared filter evaluation
  const quizFilters = quizAnswersToFinderFilters({
    recipient: 'host',
    interest: 'Dinner Parties',
    occasion: 'housewarming',
    maxPrice: 40,
    personalityTrait: 'foodie-host',
  });

  const quizResult = evaluateGiftFinder(allProducts, quizFilters);
  assert.ok(quizResult.results.length >= 2);

  for (const item of quizResult.results) {
    assert.ok(item.product.recipients.includes('host'));
    assert.ok(item.product.interests.includes('Dinner Parties'));
    assert.ok(item.product.occasions.includes('housewarming'));
    assert.ok(item.product.personalityTraits.includes('foodie-host'));
    assert.ok(item.product.price <= 40);

    // Match explanation must reflect actual matched signals and never claim an unmatched attribute
    assert.match(item.matchExplanation, /dinner host/i);
    assert.match(item.matchExplanation, /Dinner Parties/i);
    assert.match(item.matchExplanation, /under \$40/i);
    assert.doesNotMatch(item.matchExplanation, /astronomy/i);
  }
});

test('20. Zero-result queries return empty results and actionable refinement suggestions', () => {
  const allProducts = contentRepository.getAllProducts();

  // Impossible keyword query
  const zeroKeywordEval = evaluateGiftFinder(allProducts, {
    query: 'quantum surfboard for martians',
  });
  assert.equal(zeroKeywordEval.results.length, 0);
  assert.ok(zeroKeywordEval.suggestions.length > 0);

  // Over-constrained budget query ("matcha bowl under $25" where matcha bowl is $58)
  const narrowBudgetEval = evaluateGiftFinder(allProducts, {
    query: 'matcha bowl under $25',
  });
  assert.equal(narrowBudgetEval.results.length, 0);
  const relaxBudgetSuggestion = narrowBudgetEval.suggestions.find(
    (s) => s.id === 'remove-budget-cap'
  );
  assert.ok(
    relaxBudgetSuggestion,
    'Should suggest removing the $25 budget cap to unlock the $58 matcha bowl'
  );
});

test('21. URL query parameter parsing and serialization preserve valid finder state, ignore malformed values, and exclude private saved lists', () => {
  const allProducts = contentRepository.getAllProducts();

  const serialized = serializeFinderUrlSearchParams({
    ...DEFAULT_FINDER_FILTERS,
    query: 'tea gifts for mom',
    recipient: 'parent',
    occasion: 'birthday',
    personalityTrait: 'everyday-ritual',
    maxPrice: 50,
    sort: 'price-asc',
  });

  assert.equal(
    serialized,
    '?q=tea+gifts+for+mom&recipient=parent&occasion=birthday&style=everyday-ritual&maxPrice=50&sort=price-asc'
  );

  const reparsed = parseFinderUrlSearchParams(serialized, allProducts);
  assert.equal(reparsed.query, 'tea gifts for mom');
  assert.equal(reparsed.recipient, 'parent');
  assert.equal(reparsed.occasion, 'birthday');
  assert.equal(reparsed.personalityTrait, 'everyday-ritual');
  assert.equal(reparsed.maxPrice, 50);
  assert.equal(reparsed.sort, 'price-asc');

  // Malformed parameters are safely sanitized to defaults
  const malformed = parseFinderUrlSearchParams(
    '?recipient=alien&occasion=never&maxPrice=-999&minPrice=abc&sort=random&category=NonExistentCategory&privateNote=secret',
    allProducts
  );
  assert.equal(malformed.recipient, 'all');
  assert.equal(malformed.occasion, 'all');
  assert.equal(malformed.maxPrice, null);
  assert.equal(malformed.minPrice, null);
  assert.equal(malformed.sort, 'relevance');
  assert.equal(malformed.category, 'all');
});

test('22. Saved Gifts multi-list store migrates legacy v2 keys, supports multiple named lists, notes, purchased status, item moves, and missing catalog products', () => {
  const originalWindow = (globalThis as any).window;
  const mockStorage: Record<string, string> = {};

  try {
    (globalThis as any).window = {
      localStorage: {
        getItem: (key: string) => mockStorage[key] ?? null,
        setItem: (key: string, val: string) => {
          mockStorage[key] = val;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
      },
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    // 1. Seed legacy v2 keys in localStorage
    mockStorage[SAVED_GIFTS_STORAGE_KEY] = JSON.stringify([
      'prod_french_butter_crock_12',
      'prod_beeswax_taper_pair_10',
    ]);
    mockStorage[RECIPIENT_NOTES_STORAGE_KEY] = JSON.stringify({
      prod_french_butter_crock_12: 'For Aunt Sarah — Sourdough baker',
    });

    // 2. Reading gift lists automatically migrates legacy v2 items & notes into default list
    const initialLists = readGiftLists();
    assert.equal(initialLists.length, 1);
    assert.equal(initialLists[0].id, DEFAULT_LIST_ID);
    assert.equal(initialLists[0].items.length, 2);
    assert.equal(
      initialLists[0].items[0].note,
      'For Aunt Sarah — Sourdough baker'
    );

    // 3. Create a new named recipient list
    const momList = createGiftList({
      name: 'Mom’s Birthday',
      recipientLabel: 'Parent',
      occasionLabel: 'Birthday',
    });
    assert.equal(momList.name, 'Mom’s Birthday');
    assert.equal(momList.recipientLabel, 'Parent');
    assert.equal(momList.occasionLabel, 'Birthday');
    assert.equal(readGiftLists().length, 2);

    // 4. Save a product directly to the new list with a note
    saveProductToList(
      'prod_kyoto_matcha_bowl_03',
      momList.id,
      'Pair with ceremonial Uji tin'
    );
    assert.ok(readSavedProductIds().includes('prod_kyoto_matcha_bowl_03'));
    assert.equal(
      readRecipientNotes()['prod_kyoto_matcha_bowl_03'],
      'Pair with ceremonial Uji tin'
    );

    // 5. Mark item as purchased and verify state
    toggleSavedItemPurchased('prod_kyoto_matcha_bowl_03', momList.id);
    const updatedMomList = readGiftLists().find((l) => l.id === momList.id)!;
    assert.equal(updatedMomList.items[0].purchased, true);

    // 6. Move an item from Default List to Mom's Birthday List (preserving note!)
    moveProductBetweenLists(
      'prod_french_butter_crock_12',
      DEFAULT_LIST_ID,
      momList.id
    );
    const afterMoveLists = readGiftLists();
    const defaultAfterMove = afterMoveLists.find(
      (l) => l.id === DEFAULT_LIST_ID
    )!;
    const momAfterMove = afterMoveLists.find((l) => l.id === momList.id)!;
    assert.ok(
      !defaultAfterMove.items.some(
        (i) => i.productId === 'prod_french_butter_crock_12'
      )
    );
    const movedCrock = momAfterMove.items.find(
      (i) => i.productId === 'prod_french_butter_crock_12'
    );
    assert.ok(movedCrock);
    assert.equal(movedCrock.note, 'For Aunt Sarah — Sourdough baker');

    // 7. Update note via writeRecipientNote and verify v2 sync
    writeRecipientNote(
      'prod_french_butter_crock_12',
      'Updated note for Mom & Aunt Sarah',
      momList.id
    );
    assert.equal(
      JSON.parse(mockStorage[RECIPIENT_NOTES_STORAGE_KEY])[
        'prod_french_butter_crock_12'
      ],
      'Updated note for Mom & Aunt Sarah'
    );

    // 8. Graceful handling of a saved product ID that is missing from the catalog
    saveProductToList('prod_deleted_from_catalog_999', momList.id);
    const resolved = resolveSavedListItems(
      readGiftLists().find((l) => l.id === momList.id)!,
      contentRepository.getProductsMap()
    );
    assert.equal(resolved.validProductsCount, 2);
    assert.equal(resolved.missingProductsCount, 1);
    assert.equal(resolved.purchasedCount, 1);
    // $58 (matcha bowl) + $24 (butter crock) = $82
    assert.equal(resolved.totalVerifiedPrice, 82);

    // 9. Remove item, toggle save, delete list, and clear all
    removeProductFromList('prod_deleted_from_catalog_999', momList.id);
    toggleSavedProductId('prod_beeswax_taper_pair_10');
    assert.ok(!readSavedProductIds().includes('prod_beeswax_taper_pair_10'));

    deleteGiftList(momList.id);
    assert.equal(readGiftLists().length, 1);

    clearAllSavedGifts();
    assert.equal(readSavedProductIds().length, 0);
  } finally {
    (globalThis as any).window = originalWindow;
  }
});

test('23. GiftFinderExperience renders static markup with search bar, example prompts, facet filters, and canonical product links', () => {
  const html = renderToStaticMarkup(
    <GiftFinderExperience
      products={contentRepository.getAllProducts()}
      guides={contentRepository.getAllGiftGuides()}
      articles={contentRepository.getAllArticles()}
      initialSearchString="?q=tea+gifts+for+mom+under+%2450"
    />
  );

  assert.match(html, /Search &amp; Filter/);
  assert.match(html, /Take 5-Step Guided Quiz/);
  assert.match(html, /Saved Lists/);
  assert.match(html, /Hard Budget Cap: ≤ \$50 USD/);
  assert.match(
    html,
    /Small-Batch Chili Crisp &amp; Infused Wildflower Honey Flight/
  );
  assert.doesNotMatch(
    html,
    /Hand-Thrown Speckled Stoneware Matcha Bowl &amp; Bamboo Whisk Set/
  );
});

test('24. Gift Finder Thinking Durations: enforces action-specific minimum duration ranges and subtracts actual computation time', () => {
  // Verify configured minimum/maximum/default bounds match specification:
  // search: 1,200–1,800 ms; quiz: 1,800–2,500 ms; filter: 300–500 ms; sort: 250–400 ms
  assert.equal(THINKING_DURATION_SPECS.search.minMs, 1200);
  assert.equal(THINKING_DURATION_SPECS.search.maxMs, 1800);
  assert.ok(
    getTargetThinkingDurationMs('search') >= 1200 &&
      getTargetThinkingDurationMs('search') <= 1800
  );

  assert.equal(THINKING_DURATION_SPECS.quiz.minMs, 1800);
  assert.equal(THINKING_DURATION_SPECS.quiz.maxMs, 2500);
  assert.ok(
    getTargetThinkingDurationMs('quiz') >= 1800 &&
      getTargetThinkingDurationMs('quiz') <= 2500
  );

  assert.equal(THINKING_DURATION_SPECS.filter.minMs, 300);
  assert.equal(THINKING_DURATION_SPECS.filter.maxMs, 500);
  assert.ok(
    getTargetThinkingDurationMs('filter') >= 300 &&
      getTargetThinkingDurationMs('filter') <= 500
  );

  assert.equal(THINKING_DURATION_SPECS.sort.minMs, 250);
  assert.equal(THINKING_DURATION_SPECS.sort.maxMs, 400);
  assert.ok(
    getTargetThinkingDurationMs('sort') >= 250 &&
      getTargetThinkingDurationMs('sort') <= 400
  );

  // Elapsed computation time is subtracted from the minimum display duration
  const searchTarget = getTargetThinkingDurationMs('search'); // 1400ms
  assert.equal(computeRemainingThinkingDelay('search', 150), searchTarget - 150);
  assert.equal(computeRemainingThinkingDelay('search', 2500), 0);

  const quizTarget = getTargetThinkingDurationMs('quiz'); // 2100ms
  assert.equal(computeRemainingThinkingDelay('quiz', 200), quizTarget - 200);
});

test('25. Thinking Coordinator Lifecycle: executes 2-phase status progression for search and quiz and reveals results only after minimum duration', () => {
  let fakeNow = 1000;
  const scheduledTimers: Array<{
    id: number;
    ms: number;
    fireAt: number;
    cb: () => void;
    cleared: boolean;
  }> = [];
  let nextTimerId = 1;

  const coordinator = createThinkingCoordinator({
    now: () => fakeNow,
    setTimer: (cb, ms) => {
      const id = nextTimerId++;
      scheduledTimers.push({
        id,
        ms,
        fireAt: fakeNow + ms,
        cb,
        cleared: false,
      });
      return id;
    },
    clearTimer: (handle) => {
      const found = scheduledTimers.find((t) => t.id === handle);
      if (found) found.cleared = true;
    },
  });

  const events: string[] = [];
  let revealedResult: string | null = null;

  // Simulate a 5-step Guided Quiz completion where evaluation takes 50ms
  coordinator.startOperation({
    actionType: 'quiz',
    filters: {
      ...DEFAULT_FINDER_FILTERS,
      recipient: 'parent',
      interest: 'Coffee & Tea',
      occasion: 'birthday',
      maxPrice: 50,
      personalityTrait: 'everyday-ritual',
    },
    quizAnswers: {
      recipient: 'parent',
      interest: 'Coffee & Tea',
      occasion: 'birthday',
      maxPrice: 50,
      personalityTrait: 'everyday-ritual',
    },
    computeResult: () => {
      fakeNow += 50; // 50ms spent evaluating
      return 'QUIZ_RECOMMENDATIONS_PAYLOAD';
    },
    onStart: (state) => {
      events.push(`start:phase${state.phase}:${state.statusMessage}`);
    },
    onPhaseChange: (state) => {
      events.push(`phase:phase${state.phase}:${state.statusMessage}`);
    },
    onComplete: (result, state) => {
      revealedResult = result;
      events.push(`complete:phase${state.phase}:${result}`);
    },
  });

  // Immediately after starting: result is NOT yet revealed, phase 1 status is active
  assert.equal(revealedResult, null);
  assert.equal(events.length, 1);
  assert.match(events[0], /Matching gift ideas for parents & in-laws/);

  // Remaining delay should be 2100 - 50 = 2050ms
  const activeTimers = scheduledTimers.filter((t) => !t.cleared);
  assert.equal(activeTimers.length, 2); // phase 2 timer + completion timer
  const phaseTimer = activeTimers[0];
  const completeTimer = activeTimers[1];
  assert.equal(completeTimer.ms, 2050);

  // Advance clock to phase 2 switch (~984ms)
  fakeNow = phaseTimer.fireAt;
  phaseTimer.cb();
  assert.equal(revealedResult, null);
  assert.equal(events.length, 2);
  assert.match(
    events[1],
    /phase:phase2:Cross-checking interests, occasion tone, and strict price limits/
  );

  // Advance clock to completion (2050ms after compute finished = 2100ms total)
  fakeNow = completeTimer.fireAt;
  completeTimer.cb();
  assert.equal(revealedResult, 'QUIZ_RECOMMENDATIONS_PAYLOAD');
  assert.equal( coordinator.getActiveState(), null);
});

test('26. Stale-Operation & Rapid-Click Protection: newer filter or search action cancels prior timers and prevents stale results from overwriting latest state', () => {
  let fakeNow = 5000;
  const scheduledTimers: Array<{
    id: number;
    ms: number;
    cb: () => void;
    cleared: boolean;
  }> = [];
  let nextTimerId = 1;

  const coordinator = createThinkingCoordinator({
    now: () => fakeNow,
    setTimer: (cb, ms) => {
      const id = nextTimerId++;
      scheduledTimers.push({ id, ms, cb, cleared: false });
      return id;
    },
    clearTimer: (handle) => {
      const found = scheduledTimers.find((t) => t.id === handle);
      if (found) found.cleared = true;
    },
  });

  const completedPayloads: string[] = [];

  // 1. User submits an initial search ("tea gifts for mom") -> 1400ms thinking duration
  coordinator.startOperation({
    actionType: 'search',
    filters: { ...DEFAULT_FINDER_FILTERS, query: 'tea gifts for mom' },
    computeResult: () => 'STALE_SEARCH_RESULT_TEA',
    onComplete: (res) => {
      completedPayloads.push(res);
    },
  });

  const firstOpTimers = [...scheduledTimers];
  assert.equal(firstOpTimers.every((t) => !t.cleared), true);

  // 2. 200ms later, user rapidly clicks a Category filter ("Plants & Gardening") -> 380ms filter duration
  fakeNow += 200;
  coordinator.startOperation({
    actionType: 'filter',
    filters: {
      ...DEFAULT_FINDER_FILTERS,
      query: 'tea gifts for mom',
      category: 'Plants & Gardening',
    },
    actionLabel: 'Category: Plants & Gardening',
    computeResult: () => 'INTERMEDIATE_FILTER_RESULT_PLANTS',
    onComplete: (res) => {
      completedPayloads.push(res);
    },
  });

  // All timers from operation #1 must be marked cleared immediately
  assert.equal(firstOpTimers.every((t) => t.cleared), true);

  // Even if an old timer callback were somehow invoked, operationId guard blocks it
  firstOpTimers.forEach((t) => t.cb());
  assert.equal(completedPayloads.length, 0);

  // 3. 100ms later, user changes sort order to "Price: Low to High" -> 300ms sort duration
  fakeNow += 100;
  coordinator.startOperation({
    actionType: 'sort',
    filters: {
      ...DEFAULT_FINDER_FILTERS,
      query: 'tea gifts for mom',
      category: 'Plants & Gardening',
      sort: 'price-asc',
    },
    actionLabel: 'Price: Low to High',
    computeResult: () => 'LATEST_SORTED_RESULT_PRICE_ASC',
    onComplete: (res) => {
      completedPayloads.push(res);
    },
  });

  // Only the latest sort timer should remain active
  const activeTimers = scheduledTimers.filter((t) => !t.cleared);
  assert.equal(activeTimers.length, 1);
  assert.equal(activeTimers[0].ms, 300);

  // Fire the latest timer -> reveals ONLY the latest result
  activeTimers[0].cleared = true;
  activeTimers[0].cb();
  assert.deepEqual(completedPayloads, ['LATEST_SORTED_RESULT_PRICE_ASC']);

  // Verify dispose() cleans up any subsequent in-flight operation on unmount
  coordinator.startOperation({
    actionType: 'search',
    filters: { ...DEFAULT_FINDER_FILTERS, query: 'unmount test' },
    computeResult: () => 'SHOULD_NEVER_FIRE_AFTER_UNMOUNT',
    onComplete: (res) => {
      completedPayloads.push(res);
    },
  });
  assert.equal(
    scheduledTimers.filter((t) => !t.cleared).length,
    2,
    'In-flight search operation schedules phase + completion timers'
  );
  coordinator.dispose();
  assert.equal(
    scheduledTimers.filter((t) => !t.cleared).length,
    0,
    'All timers must be cleared when coordinator is disposed on unmount'
  );
});

test('27. GiftThinkingAnimation renders accessible status region, submitted query/quiz tags, and honors prefers-reduced-motion', () => {
  const searchDescriptor = buildThinkingStatusDescriptor({
    actionType: 'search',
    filters: {
      ...DEFAULT_FINDER_FILTERS,
      query: 'housewarming gift for someone who likes plants',
      maxPrice: 50,
    },
  });

  const searchHtml = renderToStaticMarkup(
    <GiftThinkingAnimation
      actionType="search"
      phase={1}
      statusMessage={searchDescriptor.primaryMessage}
      descriptor={searchDescriptor}
      prefersReducedMotion={false}
    />
  );

  assert.match(searchHtml, /role="status"/);
  assert.match(searchHtml, /aria-live="polite"/);
  assert.match(
    searchHtml,
    /Finding gifts that fit “housewarming gift for someone who likes plants”/
  );
  assert.match(searchHtml, /Under \$50/);
  assert.match(searchHtml, /data-reduced-motion="false"/);

  const quizDescriptor = buildThinkingStatusDescriptor({
    actionType: 'quiz',
    filters: DEFAULT_FINDER_FILTERS,
    quizAnswers: {
      recipient: 'friend',
      interest: 'Ceramics',
      occasion: 'housewarming',
      maxPrice: 75,
      personalityTrait: 'cozy-homebody',
    },
  });

  const reducedMotionQuizHtml = renderToStaticMarkup(
    <GiftThinkingAnimation
      actionType="quiz"
      phase={2}
      statusMessage={quizDescriptor.secondaryMessage}
      descriptor={quizDescriptor}
      prefersReducedMotion={true}
    />
  );

  assert.match(reducedMotionQuizHtml, /data-reduced-motion="true"/);
  assert.match(reducedMotionQuizHtml, /Curating Your Tailored Gift Shortlist/);
  assert.match(reducedMotionQuizHtml, /Close Friend/);
  assert.match(reducedMotionQuizHtml, /Ceramics/);
  assert.match(reducedMotionQuizHtml, /Housewarming/);
  assert.match(reducedMotionQuizHtml, /≤ \$75 USD/);
});

test('28. Refined Filter Sidebar renders sections in exact hierarchy with Clear All, active filter chips, and standardized selectable rows', () => {
  const html = renderToStaticMarkup(
    <GiftFinderExperience
      products={contentRepository.getAllProducts()}
      guides={contentRepository.getAllGiftGuides()}
      articles={contentRepository.getAllArticles()}
      initialSearchString="?q=tea+gifts&recipient=parent&occasion=birthday&interest=Coffee+%26+Tea&style=everyday-ritual&category=Plants+%26+Gardening&budget=25-to-75"
    />
  );

  // Verify exact order of sidebar headings inside the desktop filter aside
  const asideStart = html.indexOf('aria-label="Gift Finder Filters"');
  assert.ok(asideStart !== -1, 'Desktop Gift Finder Filters aside must exist');
  const asideHtml = html.slice(asideStart, html.indexOf('</aside>', asideStart));

  const idxFilterGifts = asideHtml.indexOf('Filter Gifts');
  const idxClearAll = asideHtml.indexOf('Clear All');
  const idxBudget = asideHtml.indexOf('id="desktop-heading-budget"');
  const idxRecipient = asideHtml.indexOf('id="desktop-heading-recipient"');
  const idxOccasion = asideHtml.indexOf('id="desktop-heading-occasion"');
  const idxInterests = asideHtml.indexOf('id="desktop-heading-interests"');
  const idxStyle = asideHtml.indexOf('id="desktop-heading-style"');
  const idxCategory = asideHtml.indexOf('id="desktop-heading-category"');
  const idxEditorial = asideHtml.indexOf('Editorial Curation');

  assert.ok(idxFilterGifts !== -1, '1. Filter Gifts header must appear');
  assert.ok(idxClearAll > idxFilterGifts, 'Contextual Clear All action must appear when filters are active');
  assert.ok(idxBudget > idxFilterGifts, '2. Budget & Price must follow Filter Gifts header');
  assert.ok(idxRecipient > idxBudget, '3. Who Is It For? must follow Budget & Price');
  assert.ok(idxOccasion > idxRecipient, '4. Occasion must follow Who Is It For?');
  assert.ok(idxInterests > idxOccasion, '5. Interests must follow Occasion');
  assert.ok(idxStyle > idxInterests, '6. Gift Style & Vibe must follow Interests');
  assert.ok(idxCategory > idxStyle, '7. Product Category must follow Gift Style & Vibe');
  assert.ok(idxEditorial > idxCategory, 'Editorial Curation must follow Product Category');

  // Verify Budget & Price and Who Is It For? start collapsed on initial load while showing active filter badges and chips
  assert.match(
    asideHtml,
    /data-testid="desktop-badge-budget"[^>]*>\$25 – \$75<\/span>/
  );
  assert.match(
    asideHtml,
    /data-testid="desktop-badge-recipient"[^>]*>Parents &amp; In-Laws<\/span>/
  );
  assert.match(asideHtml, /Active filters \(6\)/);
});

test('29. Coherent Budget Selection: quick-select ranges, boundary prices ($25 and $75), custom max price, and missing-price exclusion stay synchronized', () => {
  const baseProducts = contentRepository.getAllProducts();

  // Add synthetic boundary products at $25.00, $75.00, $75.50, and a missing-price product
  const boundary25 = {
    ...structuredClone(baseProducts[0]),
    id: 'prod_boundary_25',
    price: 25,
  };
  const boundary75 = {
    ...structuredClone(baseProducts[0]),
    id: 'prod_boundary_75',
    price: 75,
  };
  const boundary76 = {
    ...structuredClone(baseProducts[0]),
    id: 'prod_boundary_76',
    price: 76,
  };
  const unpricedProduct = {
    ...structuredClone(baseProducts[0]),
    id: 'prod_boundary_unpriced',
    price: NaN,
  };

  const testCatalog = [
    ...baseProducts,
    boundary25,
    boundary75,
    boundary76,
    unpricedProduct,
  ];

  // Evaluate unfiltered catalog facet counts for budget tiers
  const baseEval = evaluateGiftFinder(testCatalog, DEFAULT_FINDER_FILTERS);

  for (const tier of ['under-25', '25-to-75', 'over-75'] as const) {
    const facetCount =
      baseEval.facets.budgetTiers.find((b) => b.value === tier)?.count ?? -1;
    const tierEval = evaluateGiftFinder(testCatalog, {
      ...DEFAULT_FINDER_FILTERS,
      budgetTier: tier,
    });

    assert.equal(
      facetCount,
      tierEval.totalEligibleCount,
      `Facet count for ${tier} (${facetCount}) must exactly equal rendered result count (${tierEval.totalEligibleCount})`
    );

    // Unpriced product must never appear in any budget tier
    assert.ok(
      !tierEval.results.some((r) => r.product.id === 'prod_boundary_unpriced'),
      `Unpriced product must be excluded from ${tier}`
    );
  }

  // Verify boundary behavior at $75: $75 is in '25-to-75' and NOT in 'over-75'; $76 is in 'over-75'
  const midTierEval = evaluateGiftFinder(testCatalog, {
    budgetTier: '25-to-75',
  });
  const over75Eval = evaluateGiftFinder(testCatalog, {
    budgetTier: 'over-75',
  });
  assert.ok(
    midTierEval.results.some((r) => r.product.id === 'prod_boundary_75'),
    '$75 product must be included in $25–$75 range'
  );
  assert.ok(
    !over75Eval.results.some((r) => r.product.id === 'prod_boundary_75'),
    '$75 product must not overlap into Over $75 range'
  );
  assert.ok(
    over75Eval.results.some((r) => r.product.id === 'prod_boundary_76'),
    '$76 product must be included in Over $75 range'
  );
});

test('30. Contextual Facet Counts & Individual Filter Removal: facet counts match actual results across search + filters and individual filter removal preserves other state', () => {
  const allProducts = contentRepository.getAllProducts();
  const guides = contentRepository.getAllGiftGuides();
  const articles = contentRepository.getAllArticles();

  const activeFilters = {
    ...DEFAULT_FINDER_FILTERS,
    query: 'tea gifts',
    recipient: 'parent' as const,
    maxPrice: 60,
  };

  const contextEval = evaluateGiftFinder(allProducts, activeFilters, {
    guides,
    articles,
  });
  assert.ok(contextEval.totalEligibleCount >= 1);

  // 1. Every occasion facet count must equal the actual result count if that occasion is selected
  for (const occFacet of contextEval.facets.occasions) {
    const withOccasion = evaluateGiftFinder(
      allProducts,
      { ...activeFilters, occasion: occFacet.value },
      { guides, articles }
    );
    assert.equal(
      occFacet.count,
      withOccasion.totalEligibleCount,
      `Contextual occasion count for "${occFacet.value}" (${occFacet.count}) must match actual results (${withOccasion.totalEligibleCount})`
    );
  }

  // 2. Every recipient facet count must equal the actual result count if switching to that recipient
  for (const recFacet of contextEval.facets.recipients) {
    const withRecipient = evaluateGiftFinder(
      allProducts,
      { ...activeFilters, recipient: recFacet.value },
      { guides, articles }
    );
    assert.equal(
      recFacet.count,
      withRecipient.totalEligibleCount,
      `Contextual recipient count for "${recFacet.value}" (${recFacet.count}) must match actual results (${withRecipient.totalEligibleCount})`
    );
  }

  // 3. Every interest facet count must equal the actual result count if selecting that interest
  for (const intFacet of contextEval.facets.interests) {
    const withInterest = evaluateGiftFinder(
      allProducts,
      { ...activeFilters, interest: intFacet.value },
      { guides, articles }
    );
    assert.equal(
      intFacet.count,
      withInterest.totalEligibleCount,
      `Contextual interest count for "${intFacet.value}" (${intFacet.count}) must match actual results (${withInterest.totalEligibleCount})`
    );
  }

  // 4. Every gift style (personalityTrait) facet count must equal the actual result count if selecting that style
  for (const styleFacet of contextEval.facets.personalityTraits) {
    const withStyle = evaluateGiftFinder(
      allProducts,
      { ...activeFilters, personalityTrait: styleFacet.value },
      { guides, articles }
    );
    assert.equal(
      styleFacet.count,
      withStyle.totalEligibleCount,
      `Contextual style count for "${styleFacet.value}" (${styleFacet.count}) must match actual results (${withStyle.totalEligibleCount})`
    );
  }

  // 5. Removing an individual filter (e.g., maxPrice) preserves search query and recipient filter and broadens results
  const afterRemovingMaxPrice = {
    ...activeFilters,
    maxPrice: null,
  };
  const broadenedEval = evaluateGiftFinder(
    allProducts,
    afterRemovingMaxPrice,
    { guides, articles }
  );
  assert.equal(afterRemovingMaxPrice.query, 'tea gifts');
  assert.equal(afterRemovingMaxPrice.recipient, 'parent');
  assert.ok(
    broadenedEval.totalEligibleCount >= contextEval.totalEligibleCount
  );

  // 6. Contradictory or zero-result query ("quantum surfboard") yields 0 results AND 0 contextual facet counts
  const zeroEval = evaluateGiftFinder(
    allProducts,
    { ...DEFAULT_FINDER_FILTERS, query: 'quantum surfboard' },
    { guides, articles }
  );
  assert.equal(zeroEval.totalEligibleCount, 0);
  assert.ok(zeroEval.facets.recipients.every((r) => r.count === 0));
  assert.ok(zeroEval.facets.occasions.every((o) => o.count === 0));
  assert.ok(zeroEval.facets.interests.every((i) => i.count === 0));
});

test('31. Every Gift Finder sidebar filter section starts collapsed by default, preserves active filters and badges when collapsed, and exposes full controls when expanded', () => {
  // 1. Default initial load: ALL 7 filter sections are collapsed (aria-expanded="false")
  const defaultHtml = renderToStaticMarkup(
    <GiftFinderExperience
      products={contentRepository.getAllProducts()}
      guides={contentRepository.getAllGiftGuides()}
      articles={contentRepository.getAllArticles()}
      initialSearchString="?recipient=friend&maxPrice=45"
    />
  );

  for (const sectionId of [
    'budget',
    'recipient',
    'occasion',
    'interests',
    'style',
    'category',
    'editorial',
  ]) {
    assert.match(
      defaultHtml,
      new RegExp(
        `id="desktop-heading-${sectionId}"[^>]*aria-expanded="false"[^>]*aria-controls="desktop-panel-${sectionId}"`
      ),
      `Section "${sectionId}" must start collapsed by default with aria-expanded="false"`
    );
    assert.doesNotMatch(
      defaultHtml,
      new RegExp(`id="desktop-panel-${sectionId}"`),
      `Panel for "${sectionId}" must be hidden when collapsed`
    );
  }

  // Selected filters in collapsed sections remain active and show badges beside the headings
  assert.match(
    defaultHtml,
    /data-testid="desktop-badge-budget"[^>]*>≤ \$45<\/span>/
  );
  assert.match(
    defaultHtml,
    /data-testid="desktop-badge-recipient"[^>]*>Close Friend<\/span>/
  );
  assert.match(defaultHtml, /Active filters \(2\)/);

  // 2. Expanded state: expanding Budget & Price and Who Is It For? reveals quick-select price ranges, custom max input, and recipient option rows
  const expandedHtml = renderToStaticMarkup(
    <GiftFinderExperience
      products={contentRepository.getAllProducts()}
      guides={contentRepository.getAllGiftGuides()}
      articles={contentRepository.getAllArticles()}
      initialSearchString="?recipient=friend&budget=25-to-75"
      initialCollapsedSections={{ budget: false, recipient: false }}
    />
  );

  assert.match(
    expandedHtml,
    /id="desktop-heading-budget"[^>]*aria-expanded="true"[^>]*aria-controls="desktop-panel-budget"/
  );
  assert.match(
    expandedHtml,
    /id="desktop-heading-recipient"[^>]*aria-expanded="true"[^>]*aria-controls="desktop-panel-recipient"/
  );
  assert.match(expandedHtml, /id="desktop-panel-budget"/);
  assert.match(expandedHtml, /id="desktop-panel-recipient"/);
  assert.match(expandedHtml, /Active range:/);
  assert.match(expandedHtml, /Custom max replaces range/);
});

test('32. Flagship Editorial Gift Guide Redesign renders all 11 modular editorial sections, 4 recommendation presentation styles, and degrades gracefully when optional fields are omitted', () => {
  const flagshipGuide = contentRepository.getGiftGuideBySlug(
    'thoughtful-gifts-for-people-who-appreciate-the-little-things'
  );
  assert.ok(flagshipGuide, 'Flagship guide must exist in contentRepository');

  const html = renderToStaticMarkup(
    <GiftGuideReaderView
      guide={flagshipGuide}
      savedProductIds={['prod_fluted_bedside_carafe_09']}
      onToggleSaveProduct={() => {}}
      onSelectProduct={() => {}}
    />
  );

  // 1. Verify all major editorial section anchors and landmarks exist
  assert.match(html, /Flagship Edition · Guide No\. 01/);
  assert.match(html, /Curated by Clara Vance/);
  assert.match(html, /Who This Guide Is Written For/);
  assert.match(html, /id="quick-picks"/);
  assert.match(html, /id="find-the-right-gift"/);
  assert.match(html, /id="editors-pick"/);
  assert.match(html, /id="sec-under-25"/);
  assert.match(html, /id="sec-25-to-75"/);
  assert.match(html, /id="sec-over-75"/);
  assert.match(html, /id="gift-comparison"/);
  assert.match(html, /id="buying-advice"/);
  assert.match(html, /id="guide-faq"/);
  assert.match(html, /id="related-discoveries"/);

  // 2. Verify all 4 GiftRecommendation presentation styles render in the flagship guide
  assert.match(html, /data-presentation-style="featured"/);
  assert.match(html, /data-presentation-style="editorial-feature"/);
  assert.match(html, /data-presentation-style="standard"/);
  assert.match(html, /data-presentation-style="compact"/);

  // 3. Verify Curator's Notes, Recipient Pathways, Qualitative Comparison, and FAQ render cleanly
  assert.match(html, /Curator’s Field Note · No\. 01/);
  assert.match(html, /Why a \$24 Upgrade to a Daily Habit Beats a \$100 Novelty/);
  assert.match(html, /For the Morning Ritualist/);
  assert.match(html, /Comparing the Standout Gifts in This Guide/);
  assert.match(
    html,
    /Is an under-\$25 gift appropriate for a milestone birthday or holiday\?/
  );
  assert.match(
    html,
    /aria-expanded="true"[^>]*aria-controls="faq-answer-faq-under-25-appropriateness"/
  );

  // 4. Verify no em dashes or double hyphens appear in the rendered flagship guide HTML
  assert.ok(
    !html.includes('—'),
    'Flagship Gift Guide copy and UI must not contain em dashes (—)'
  );

  // 5. Verify refined Phase 1 editorial palette (#FAF9F6 canvas, #FFFFFF paper surfaces, #E3E1DB hairlines, natural index labels, and restored Lucide outline icons)
  assert.match(html, /bg-\[#FAF9F6\]/);
  assert.match(html, /bg-\[#FFFFFF\]/);
  assert.match(html, /border-\[#E3E1DB\]/);
  assert.match(html, />Quick Picks</);
  assert.match(html, />Compare the Gifts</);
  assert.match(html, />Common Questions</);
  assert.match(html, /lucide-list-checks/);
  assert.match(html, /lucide-compass/);
  assert.match(html, /lucide-award/);
  assert.match(html, /lucide-scale/);
  assert.match(html, /lucide-sparkles/);
  assert.match(
    html,
    /lucide-circle-help|lucide-circle-question-mark|lucide-help-circle/
  );
  assert.match(html, /lucide-layers/);
  assert.match(html, /lucide-bookmark/);
});

test('33. Editorial Product Profile Redesign renders all 10 editorial sections, accurate carafe photography, honest placeholder disclosure, and graceful fallback when optional fields are omitted', () => {
  const carafe = contentRepository.getProductBySlug(
    'hand-blown-two-tone-bedside-water-carafe-and-glass'
  );
  assert.ok(carafe, 'Carafe product must exist in contentRepository');

  // 1. Verify mismatched orange cocktail image is replaced with accurate clear glass carafe photo
  assert.ok(
    !carafe.images[0].url.includes('1546173159-315724a31696'),
    'Mismatched orange beverage image URL must be removed'
  );
  assert.match(carafe.images[0].url, /1548839140-29a749e1cf4d/);

  const carafeHtml = renderToStaticMarkup(
    <EditorialProductProfile
      product={carafe}
      guideAppearances={contentRepository.getProductGuideAppearances(carafe.id)}
      similarComparisons={contentRepository.getSimilarProductComparisons(carafe)}
      relatedArticles={contentRepository.getAllArticles().slice(0, 2)}
      citations={[CITATIONS.cit_yang_urminsky_2018]}
    />
  );

  // 2. Verify all required Editorial Gift Profile sections exist
  assert.match(carafeHtml, /id="product-hero"/);
  assert.match(carafeHtml, /id="gift-verdict"/);
  assert.match(carafeHtml, /id="ideal-recipient"/);
  assert.match(carafeHtml, /id="why-it-works"/);
  assert.match(carafeHtml, /id="buying-considerations"/);
  assert.match(carafeHtml, /id="specifications"/);
  assert.match(carafeHtml, /id="gift-occasions"/);
  assert.match(carafeHtml, /id="compare-similar-gifts"/);
  assert.match(carafeHtml, /id="featured-gift-guide"/);
  assert.match(carafeHtml, /id="related-editorial"/);

  // 3. Verify editorial content depth, sample preview photography note, and honest placeholder purchase disclosure
  assert.match(carafeHtml, /Sample preview photography/);
  assert.match(carafeHtml, /Merchant Preview Link \(Sample\)/);
  assert.match(carafeHtml, /Sample Catalog Note:/);
  assert.match(
    carafeHtml,
    /Our flagship Editor’s Pick under \$50: a hand-blown borosilicate bedside carafe/
  );
  assert.match(carafeHtml, /More Affordable Kitchen Ritual \(\$24\)/);
  assert.match(
    carafeHtml,
    /Thoughtful Gifts for People Who Appreciate the Little Things/
  );
  assert.ok(
    !carafeHtml.includes('—'),
    'Editorial Product Profile must not contain em dashes (—)'
  );

  // 4. Test a second product (prod_terracotta_herb_kit_06) with omitted optional profile fields to verify graceful fallback
  const herbKit = contentRepository.getProductBySlug(
    'self-watering-terracotta-windowsill-herb-garden-trio'
  );
  assert.ok(herbKit, 'Herb kit product must exist in contentRepository');
  assert.equal(herbKit.idealRecipientProfile, undefined);
  assert.equal(herbKit.similarGiftComparisons, undefined);

  const herbHtml = renderToStaticMarkup(
    <EditorialProductProfile
      product={herbKit}
      guideAppearances={contentRepository.getProductGuideAppearances(herbKit.id)}
      similarComparisons={contentRepository.getSimilarProductComparisons(herbKit)}
      relatedArticles={contentRepository.getAllArticles().slice(0, 2)}
      citations={[CITATIONS.cit_galak_2016]}
    />
  );

  assert.match(herbHtml, /id="gift-verdict"/);
  assert.match(herbHtml, /id="ideal-recipient"/);
  assert.match(herbHtml, /id="compare-similar-gifts"/);
  assert.match(
    herbHtml,
    /Best suited for New homeowners, apartment cooks, and plant lovers\./
  );
  assert.ok(!herbHtml.includes('—'));
});

test('34. Centralized visual design configuration (site-theme.css), semantic typography hierarchy, and development-only Theme Lab (/dev/theme-lab/)', () => {
  const siteThemePath = path.resolve(process.cwd(), 'src/styles/site-theme.css');
  const indexCssPath = path.resolve(process.cwd(), 'src/index.css');
  const baseLayoutPath = path.resolve(process.cwd(), 'src/layouts/BaseLayout.astro');
  const homePagePath = path.resolve(process.cwd(), 'src/pages/index.astro');
  const themeLabAstroPath = path.resolve(
    process.cwd(),
    'src/pages/dev/theme-lab/index.astro'
  );

  assert.ok(fs.existsSync(siteThemePath), 'src/styles/site-theme.css must exist');
  assert.ok(
    fs.existsSync(themeLabAstroPath),
    'src/pages/dev/theme-lab/index.astro must exist'
  );

  const siteThemeCss = fs.readFileSync(siteThemePath, 'utf-8');
  const indexCss = fs.readFileSync(indexCssPath, 'utf-8');
  const baseLayoutContent = fs.readFileSync(baseLayoutPath, 'utf-8');
  const homePageContent = fs.readFileSync(homePagePath, 'utf-8');

  // 1. Verify all 5 required configuration groups exist in site-theme.css
  assert.match(siteThemeCss, /--theme-font-display:\s*'Fraunces'/);
  assert.match(siteThemeCss, /--theme-font-body:\s*'Plus Jakarta Sans'/);
  assert.match(siteThemeCss, /--theme-font-ui:\s*'Plus Jakarta Sans'/);
  assert.match(siteThemeCss, /--theme-font-mono:\s*'JetBrains Mono'/);

  assert.match(siteThemeCss, /--theme-size-display-heading:/);
  assert.match(siteThemeCss, /--theme-size-page-title:/);
  assert.match(siteThemeCss, /--theme-size-section-heading:/);
  assert.match(siteThemeCss, /--theme-size-subsection-heading:/);
  assert.match(siteThemeCss, /--theme-size-info-heading:/);
  assert.match(siteThemeCss, /--theme-size-product-title:/);
  assert.match(siteThemeCss, /--theme-size-product-title-featured:/);
  assert.match(siteThemeCss, /--theme-size-body:\s*[^;]+;/);
  assert.match(siteThemeCss, /--theme-size-intro:/);
  assert.match(siteThemeCss, /--theme-size-caption:\s*[^;]+;/);
  assert.match(siteThemeCss, /--theme-size-metadata:\s*[^;]+;/);
  assert.match(siteThemeCss, /--theme-size-nav:\s*[^;]+;/);
  assert.match(siteThemeCss, /--theme-size-button:\s*[^;]+;/);
  assert.match(siteThemeCss, /--theme-size-sidebar-link:\s*[^;]+;/);

  assert.match(siteThemeCss, /--theme-color-page-bg:\s*#[0-9A-Fa-f]{3,6}/);
  assert.match(siteThemeCss, /--theme-color-surface:\s*#[0-9A-Fa-f]{3,6}/);
  assert.match(siteThemeCss, /--theme-color-text-primary:\s*#[0-9A-Fa-f]{3,6}/);
  assert.match(siteThemeCss, /--theme-color-text-secondary:\s*#[0-9A-Fa-f]{3,6}/);
  assert.match(siteThemeCss, /--theme-color-brand-primary:\s*#[0-9A-Fa-f]{3,6}/);
  assert.match(siteThemeCss, /--theme-color-link:\s*#[0-9A-Fa-f]{3,6}/);
  assert.match(siteThemeCss, /--theme-color-border:\s*#[0-9A-Fa-f]{3,6}/);
  assert.match(siteThemeCss, /--theme-width-reading-measure:\s*68ch/);

  // 2. Verify index.css imports site-theme.css and avoids !important
  assert.match(indexCss, /@import\s+"\.\/styles\/site-theme\.css";/);
  assert.ok(
    !indexCss.includes('!important'),
    'src/index.css must not use !important declarations'
  );
  assert.ok(
    !siteThemeCss.includes('!important'),
    'src/styles/site-theme.css must not use !important declarations'
  );

  // 3. Verify GiftGuideReaderView, EditorialProductProfile, and ArticleReaderView emit semantic typography classes
  const guide = contentRepository.getGiftGuideBySlug(
    'thoughtful-gifts-for-people-who-appreciate-the-little-things'
  )!;
  const guideHtml = renderToStaticMarkup(
    <GiftGuideReaderView guide={guide} savedProductIds={[]} />
  );
  assert.match(guideHtml, /theme-display-heading/);
  assert.match(guideHtml, /theme-section-heading/);
  assert.match(guideHtml, /theme-subsection-heading/);
  assert.match(guideHtml, /theme-info-heading/);
  assert.match(guideHtml, /theme-product-title-featured/);
  assert.match(guideHtml, /theme-product-title/);
  assert.match(guideHtml, /theme-body-text/);
  assert.match(guideHtml, /theme-sidebar-link/);

  const carafe = contentRepository.getProductBySlug(
    'hand-blown-two-tone-bedside-water-carafe-and-glass'
  )!;
  const profileHtml = renderToStaticMarkup(
    <EditorialProductProfile
      product={carafe}
      guideAppearances={contentRepository.getProductGuideAppearances(carafe.id)}
      similarComparisons={contentRepository.getSimilarProductComparisons(carafe)}
      relatedArticles={contentRepository.getAllArticles().slice(0, 1)}
      citations={[CITATIONS.cit_yang_urminsky_2018]}
    />
  );
  assert.match(profileHtml, /theme-page-title/);
  assert.match(profileHtml, /theme-section-heading/);
  assert.match(profileHtml, /theme-subsection-heading/);
  assert.match(profileHtml, /theme-info-heading/);
  assert.match(profileHtml, /theme-info-label/);
  assert.ok(
    !profileHtml.includes('max-w-[230px]'),
    'Purchase panel Best suited for must not be constrained to max-w-[230px]'
  );

  const articleHtml = renderToStaticMarkup(
    <ArticleReaderView
      article={ARTICLES[0]}
      savedProductIds={[]}
      onToggleSave={() => {}}
      onSelectProduct={() => {}}
    />
  );
  assert.match(articleHtml, /theme-page-title/);
  assert.match(articleHtml, /theme-section-heading/);
  assert.match(articleHtml, /theme-subsection-heading/);
  assert.match(articleHtml, /theme-body-text/);

  // 4. Verify ThemeLabExperience renders all 7 required specimens & controls, and is not linked from production pages
  const themeLabHtml = renderToStaticMarkup(<ThemeLabExperience />);
  assert.match(themeLabHtml, /Specimen 01 · Gift Guide Headline/);
  assert.match(themeLabHtml, /Specimen 02 · Major Editorial Section/);
  assert.match(themeLabHtml, /Specimen 03 · Information Heading/);
  assert.match(themeLabHtml, /Specimen 04 · Product Recommendation/);
  assert.match(themeLabHtml, /Specimen 05 · Product Profile Section/);
  assert.match(themeLabHtml, /Specimen 06 &amp; 07 · Sidebar Navigation Items/);
  assert.match(themeLabHtml, /Copy site-theme\.css/);
  assert.match(themeLabHtml, /Reset to Source Defaults/);

  const exportedCss = generateSiteThemeCss({
    ...DEFAULT_THEME_SETTINGS,
    colorBrandPrimary: '#14324E',
    sizeSectionHeading: 'clamp(1.75rem, 1.45rem + 1.1vw, 2.25rem)',
  });
  assert.match(exportedCss, /--theme-color-brand-primary:\s*#14324E;/);
  assert.match(
    exportedCss,
    /--theme-size-section-heading:\s*clamp\(1\.75rem, 1\.45rem \+ 1\.1vw, 2\.25rem\);/
  );

  // Verify production navigation/pages do not expose links to /dev/theme-lab/
  assert.ok(
    !baseLayoutContent.includes('/dev/theme-lab'),
    'Production BaseLayout must not expose /dev/theme-lab/'
  );
  assert.ok(
    !homePageContent.includes('/dev/theme-lab'),
    'Production homepage must not expose /dev/theme-lab/'
  );
});

test('35. Global Navigation Simplification, Gift Guides & Stories Directories, Taxonomy & Breadcrumbs', () => {
  // 1. Verify simplified desktop and mobile navigation in BaseLayout.astro and AstroIslands.tsx
  const baseLayoutPath = path.resolve(process.cwd(), 'src/layouts/BaseLayout.astro');
  const baseLayoutContent = fs.readFileSync(baseLayoutPath, 'utf-8');

  assert.match(baseLayoutContent, /href="\/gift-guides\/"/);
  assert.match(baseLayoutContent, /href="\/articles\/"/);
  assert.match(baseLayoutContent, /href="\/gift-finder\/"/);
  assert.match(baseLayoutContent, /Find a Gift/);
  assert.ok(
    !baseLayoutContent.includes('href="/gift-finder/?maxPrice=50"'),
    'Primary navigation must not include redundant Under $50 header link'
  );

  const savedBtnHtml = renderToStaticMarkup(<HeaderSavedButtonIsland />);
  assert.match(savedBtnHtml, /Saved Gifts/);

  const mobileNavHtml = renderToStaticMarkup(
    <MobileNavigationIsland activeSection="guides" />
  );
  assert.match(mobileNavHtml, /aria-expanded="false"/);
  assert.match(mobileNavHtml, /aria-controls="mobile-primary-navigation-panel"/);

  // 2. Verify Gift Guides Directory (/gift-guides/) renders all 8 required sections from contentRepository
  const guidesDirData = contentRepository.getGiftGuidesDirectoryData();
  assert.equal(guidesDirData.allGuides.length, 2);
  assert.ok(guidesDirData.primaryFeaturedGuide);
  assert.equal(guidesDirData.supportingFeaturedGuides.length, 0);
  assert.ok(guidesDirData.recipientDiscovery.length >= 6);
  assert.ok(guidesDirData.interestDiscovery.length >= 6);
  assert.ok(guidesDirData.occasionDiscovery.length >= 6);
  assert.equal(guidesDirData.budgetDiscovery.length, 4);

  const guidesDirHtml = renderToStaticMarkup(
    <GiftGuidesDirectoryView {...guidesDirData} />
  );
  assert.match(guidesDirHtml, /Gift Guides/);
  assert.match(guidesDirHtml, /Featured Gift Guide/);
  assert.match(guidesDirHtml, /Browse Gift Guides/);
  assert.match(guidesDirHtml, /Browse by Recipient/);
  assert.match(guidesDirHtml, /Browse by Interest/);
  assert.match(guidesDirHtml, /Browse by Occasion/);
  assert.match(guidesDirHtml, /Browse by Budget/);
  assert.match(
    guidesDirHtml,
    /Looking for a Specific Combination of Recipient, Interest, and Budget\?/
  );
  assert.match(guidesDirHtml, /href="\/gift-finder\/\?maxPrice=25"/);
  assert.match(guidesDirHtml, /href="\/gift-finder\/\?maxPrice=50"/);
  assert.match(guidesDirHtml, /href="\/gift-finder\/\?minPrice=50&amp;maxPrice=100"/);
  assert.match(guidesDirHtml, /href="\/gift-finder\/\?minPrice=100"/);

  const guidesDirJsonLd = buildGiftGuidesDirectoryJsonLd(
    contentRepository.getAllGiftGuides()
  );
  assert.equal(guidesDirJsonLd['@graph'][1]['@type'], 'CollectionPage');

  // 3. Verify Stories Directory (/articles/) renders Featured Story, Recent Stories without duplication, Browse by Topic, and Editorial Discovery
  const articlesDirData = contentRepository.getArticlesDirectoryData();
  assert.equal(articlesDirData.allArticles.length, 2);
  assert.ok(articlesDirData.featuredArticle);
  assert.equal(
    articlesDirData.featuredArticle.article.id,
    'art_thoughtful_over_expensive'
  );
  assert.equal(articlesDirData.recentArticles.length, 1);
  assert.equal(articlesDirData.recentArticles[0].article.id, 'art_host_etiquette');
  assert.ok(
    !articlesDirData.recentArticles.some(
      (a) => a.article.id === articlesDirData.featuredArticle?.article.id
    ),
    'Featured story must never be duplicated in Recent Stories'
  );

  const articlesDirHtml = renderToStaticMarkup(
    <ArticlesDirectoryView {...articlesDirData} />
  );
  assert.match(articlesDirHtml, /Stories/);
  assert.match(articlesDirHtml, /Featured Story/);
  assert.match(articlesDirHtml, /Recent Stories/);
  assert.match(articlesDirHtml, /Browse by Topic/);
  assert.match(articlesDirHtml, /Gift-Giving Psychology/);
  assert.match(articlesDirHtml, /Gift Etiquette/);
  assert.match(articlesDirHtml, /Companion Gift Guides/);

  const articlesDirJsonLd = buildArticlesDirectoryJsonLd(
    contentRepository.getAllArticles()
  );
  assert.equal(articlesDirJsonLd['@graph'][1]['@type'], 'CollectionPage');

  // 4. Verify dynamic repository scaling: adding a new guide or article updates directory data automatically without hardcoding
  const isolatedStore = new LocalCMSContentStore(true);
  const isolatedRepo = createContentRepository(isolatedStore);
  const baseGuides = isolatedRepo.getAllGiftGuides();
  isolatedStore.upsertGiftGuide({
    ...baseGuides[0],
    id: 'guide_creative_rituals_2026',
    slug: 'gifts-for-curious-creatives-and-makers',
    title: 'Gifts for Curious Creatives and Makers',
    featured: true,
    recipients: ['friend', 'partner'],
    occasions: ['birthday', 'just-because'],
  });
  const baseArticles = isolatedRepo.getAllArticles();
  isolatedStore.upsertArticle({
    ...baseArticles[0],
    id: 'art_ritual_longevity',
    slug: 'how-daily-rituals-shape-gift-longevity',
    title: 'How Daily Rituals Shape Gift Longevity',
    featured: false,
    topics: ['culture', 'gift-giving-psychology'],
  });

  const expandedGuidesDir = isolatedRepo.getGiftGuidesDirectoryData();
  assert.equal(expandedGuidesDir.allGuides.length, 3);
  assert.equal(expandedGuidesDir.supportingFeaturedGuides.length, 1);
  const expandedGuidesHtml = renderToStaticMarkup(
    <GiftGuidesDirectoryView {...expandedGuidesDir} />
  );
  assert.match(expandedGuidesHtml, /Gifts for Curious Creatives and Makers/);

  const expandedArticlesDir = isolatedRepo.getArticlesDirectoryData();
  assert.equal(expandedArticlesDir.allArticles.length, 3);
  assert.equal(expandedArticlesDir.recentArticles.length, 2);
  const expandedArticlesHtml = renderToStaticMarkup(
    <ArticlesDirectoryView {...expandedArticlesDir} />
  );
  assert.match(expandedArticlesHtml, /How Daily Rituals Shape Gift Longevity/);

  // 5. Verify budget URLs parse accurately in Gift Finder engine
  const under25Parsed = parseFinderUrlSearchParams('?maxPrice=25');
  assert.equal(under25Parsed.maxPrice, 25);
  const under50Parsed = parseFinderUrlSearchParams('?maxPrice=50');
  assert.equal(under50Parsed.maxPrice, 50);
  const fiftyTo100Parsed = parseFinderUrlSearchParams('?minPrice=50&maxPrice=100');
  assert.equal(fiftyTo100Parsed.minPrice, 50);
  assert.equal(fiftyTo100Parsed.maxPrice, 100);
  const hundredPlusParsed = parseFinderUrlSearchParams('?minPrice=100');
  assert.equal(hundredPlusParsed.minPrice, 100);

  // 6. Verify breadcrumb structures across Gift Guide, Article, and Product pages
  const guide = contentRepository.getGiftGuideBySlug(
    'thoughtful-gifts-for-people-who-appreciate-the-little-things'
  )!;
  const guideHtml = renderToStaticMarkup(
    <GiftGuideReaderView guide={guide} savedProductIds={[]} />
  );
  assert.match(guideHtml, /href="\/gift-guides\/"/);
  assert.match(
    guideHtml,
    /aria-current="page"[^>]*>Thoughtful Gifts for People Who Appreciate the Little Things<\/span>/
  );

  const articleHtml = renderToStaticMarkup(
    <ArticleReaderView
      article={ARTICLES[0]}
      savedProductIds={[]}
      onToggleSave={() => {}}
      onSelectProduct={() => {}}
    />
  );
  assert.match(articleHtml, /href="\/articles\/"[^>]*>Stories<\/a>/);
  assert.match(
    articleHtml,
    /aria-current="page"[^>]*>Why Thoughtful Gifts Matter More Than Expensive Ones<\/li>/
  );

  // Product in single/Editor's Pick guide -> Home / Gift Guides / Relevant Guide / Product
  const carafe = contentRepository.getProductBySlug(
    'hand-blown-two-tone-bedside-water-carafe-and-glass'
  )!;
  const carafeAppearances = contentRepository.getProductGuideAppearances(carafe.id);
  const carafeHtml = renderToStaticMarkup(
    <EditorialProductProfile
      product={carafe}
      guideAppearances={carafeAppearances}
      similarComparisons={contentRepository.getSimilarProductComparisons(carafe)}
      relatedArticles={contentRepository.getAllArticles().slice(0, 1)}
      citations={[CITATIONS.cit_yang_urminsky_2018]}
    />
  );
  assert.match(carafeHtml, /href="\/gift-guides\/"[^>]*>Gift Guides<\/a>/);
  assert.match(
    carafeHtml,
    /href="\/gift-guides\/thoughtful-gifts-for-people-who-appreciate-the-little-things\/"/
  );

  // Product in multiple guides equally -> Home / Gift Guides / Product
  const multiGuideProduct = contentRepository
    .getAllProducts()
    .find(
      (p) =>
        contentRepository.getProductGuideAppearances(p.id).length > 1 &&
        contentRepository.resolvePrimaryGuideForProduct(p.id) === undefined
    )!;
  assert.ok(multiGuideProduct, 'At least one product appears in multiple guides equally');
  const multiGuideAppearances = contentRepository.getProductGuideAppearances(
    multiGuideProduct.id
  );
  const multiGuideHtml = renderToStaticMarkup(
    <EditorialProductProfile
      product={multiGuideProduct}
      guideAppearances={multiGuideAppearances}
      similarComparisons={contentRepository.getSimilarProductComparisons(
        multiGuideProduct
      )}
      relatedArticles={contentRepository.getAllArticles().slice(0, 1)}
      citations={[]}
    />
  );
  assert.match(multiGuideHtml, /href="\/gift-guides\/"[^>]*>Gift Guides<\/a>/);
});

test('36. Category icons, scalable category cards, category archive templates, Shop navigation, editorial footer, supporting pages, affiliate disclosures, and site map', () => {
  // 1. Centralized category icon mappings & fallback behavior
  assert.equal(resolveCategoryIconKey('topic', 'gift-giving-psychology'), 'brain');
  assert.equal(resolveCategoryIconKey('topic', 'relationships'), 'heart-handshake');
  assert.equal(resolveCategoryIconKey('topic', 'decision-making'), 'brain-circuit');
  assert.equal(resolveCategoryIconKey('topic', 'gift-etiquette'), 'handshake');
  assert.equal(resolveCategoryIconKey('topic', 'practical-gifting-advice'), 'clipboard-check');
  assert.equal(resolveCategoryIconKey('topic', 'culture'), 'landmark');

  assert.equal(resolveCategoryIconKey('recipient', 'parent'), 'users');
  assert.equal(resolveCategoryIconKey('recipient', 'partner'), 'heart');
  assert.equal(resolveCategoryIconKey('recipient', 'friend'), 'user-round');
  assert.equal(resolveCategoryIconKey('recipient', 'host'), 'utensils');
  assert.equal(resolveCategoryIconKey('recipient', 'coworker'), 'graduation-cap');
  assert.equal(resolveCategoryIconKey('recipient', 'kids'), 'baby');

  assert.equal(
    resolveCategoryIconKey('interest', 'newly-added-future-category'),
    'compass',
    'Newly created categories must receive a clean default outline icon'
  );

  const iconMarkup = renderToStaticMarkup(
    <CategoryIcon iconKey="brain" sizeClass="h-6 w-6" />
  );
  assert.match(iconMarkup, /aria-hidden="true"/, 'Decorative category icons must be hidden from screen readers');

  // 2. Scalable category cards (MAX_CATEGORY_PREVIEW_ITEMS = 3) + accurate counts + "View all" link when > 3 items exist
  assert.equal(MAX_CATEGORY_PREVIEW_ITEMS, 3);
  const isolatedStore = new LocalCMSContentStore(true);
  const isolatedRepo = createContentRepository(isolatedStore);
  const seedGuide = isolatedRepo.getAllGiftGuides()[0];
  for (let i = 1; i <= 4; i++) {
    isolatedStore.upsertGiftGuide({
      ...seedGuide,
      id: `guide_scale_test_${i}`,
      slug: `scale-test-guide-${i}`,
      title: `Scale Test Guide ${i}`,
      recipients: ['friend'],
      occasions: ['birthday'],
    });
  }

  const scaledGuidesDir = isolatedRepo.getGiftGuidesDirectoryData();
  const friendCategory = scaledGuidesDir.recipientDiscovery.find(
    (r) => r.recipient === 'friend'
  )!;
  assert.ok(
    friendCategory.matchingGuides.length >= 5,
    'Total guide count must reflect all matching guides in the category'
  );
  assert.ok(
    friendCategory.matchingProducts.length > 0,
    'Product count must remain distinct and tracked separately from guide count'
  );
  assert.equal(
    friendCategory.archiveHref,
    '/gift-guides/recipients/friend/'
  );

  const scaledGuidesHtml = renderToStaticMarkup(
    <GiftGuidesDirectoryView {...scaledGuidesDir} />
  );
  const recipientSectionHtml =
    scaledGuidesHtml.split('id="browse-by-recipient"')[1] || '';
  assert.match(
    recipientSectionHtml,
    new RegExp(`View all ${friendCategory.matchingGuides.length} guides`),
    'Category cards with > 3 guides must display a View all link to the category archive'
  );
  assert.ok(
    !recipientSectionHtml.includes('Scale Test Guide 4'),
    'Category card preview list must cap at 3 guides and not stretch vertically with the 4th+ guide'
  );

  // Also verify Stories topic card scaling when > 3 articles exist in a topic
  const seedArticle = isolatedRepo.getAllArticles()[0];
  for (let i = 1; i <= 4; i++) {
    isolatedStore.upsertArticle({
      ...seedArticle,
      id: `art_scale_test_${i}`,
      slug: `scale-test-article-${i}`,
      title: `Scale Test Story ${i}`,
      topics: ['gift-giving-psychology'],
    });
  }
  const scaledArticlesDir = isolatedRepo.getArticlesDirectoryData();
  const psychTopic = scaledArticlesDir.topicDiscovery.find(
    (t) => t.id === 'gift-giving-psychology'
  )!;
  assert.ok(psychTopic.matchingArticles.length >= 5);
  assert.equal(
    psychTopic.archiveHref,
    '/articles/topics/gift-giving-psychology/'
  );
  const scaledArticlesHtml = renderToStaticMarkup(
    <ArticlesDirectoryView {...scaledArticlesDir} />
  );
  const topicSectionHtml =
    scaledArticlesHtml.split('id="browse-by-topic"')[1] || '';
  assert.match(
    topicSectionHtml,
    new RegExp(`View all ${psychTopic.matchingArticles.length} stories`)
  );
  assert.ok(
    !topicSectionHtml.includes('Scale Test Story 4'),
    'Topic card preview list must cap at 3 stories'
  );

  // 3. Full Category Archive pages (/articles/topics/[slug]/, /gift-guides/recipients/[slug]/, /gift-guides/interests/[slug]/, /gift-guides/occasions/[slug]/)
  const recipientArchive = isolatedRepo.getRecipientCategoryArchive('friend')!;
  assert.ok(recipientArchive);
  assert.equal(recipientArchive.category.iconKey, 'user-round');
  assert.ok(recipientArchive.category.matchingGuides.length >= 5);
  assert.ok(recipientArchive.category.matchingProducts.length > 0);

  const recipientArchiveHtml = renderToStaticMarkup(
    <CategoryArchiveView
      archiveType="guide-category"
      dimensionLabel="Recipient Category"
      parentDirectoryLabel="Gift Guides"
      parentDirectoryHref="/gift-guides/"
      categoryLabel={recipientArchive.category.label}
      categoryDescription={recipientArchive.category.description}
      iconKey={recipientArchive.category.iconKey}
      matchingGuides={recipientArchive.category.matchingGuides}
      matchingProducts={recipientArchive.category.matchingProducts}
      finderHref={recipientArchive.category.finderHref}
      relatedCategories={[]}
      pageSize={3}
    />
  );
  assert.match(recipientArchiveHtml, /Close Friends/);
  assert.match(recipientArchiveHtml, /Featured Guide for Close Friends/);
  assert.match(
    recipientArchiveHtml,
    /Page 1 of /,
    'Archive view must render pagination controls when items exceed pageSize'
  );
  assert.match(
    recipientArchiveHtml,
    /href="\/affiliate-disclosure\/"/,
    'Guide/product category archives must include affiliate disclosure link'
  );

  const topicArchive = isolatedRepo.getArticleTopicArchive('gift-giving-psychology')!;
  assert.ok(topicArchive);
  assert.equal(topicArchive.topic.iconKey, 'brain');
  const topicArchiveHtml = renderToStaticMarkup(
    <CategoryArchiveView
      archiveType="article-topic"
      dimensionLabel="Story Topic Archive"
      parentDirectoryLabel="Stories"
      parentDirectoryHref="/articles/"
      categoryLabel={topicArchive.topic.label}
      categoryDescription={topicArchive.topic.description}
      iconKey={topicArchive.topic.iconKey}
      matchingArticles={topicArchive.topic.matchingArticles}
      companionGuides={topicArchive.companionGuides}
      relatedCategories={[]}
      pageSize={3}
    />
  );
  assert.match(topicArchiveHtml, /Gift-Giving Psychology/);
  assert.match(topicArchiveHtml, /Featured Story in Gift-Giving Psychology/);
  assert.match(topicArchiveHtml, /Page 1 of /);

  // 4. Shop link in desktop and mobile global navigation
  assert.equal(SHOP_EXTERNAL_URL, 'https://shop.scienceofgifts.com/');
  assert.equal(SHOP_RETURNS_FAQ_URL, 'https://shop.scienceofgifts.com/pages/returns-faq');
  const baseLayoutSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/layouts/BaseLayout.astro'),
    'utf8'
  );
  assert.ok(
    baseLayoutSource.includes('href={SHOP_EXTERNAL_URL}') ||
      baseLayoutSource.includes('https://shop.scienceofgifts.com/'),
    'Desktop header must include Shop link'
  );
  const mobileMenuHtml = renderToStaticMarkup(
    <MobileNavigationIsland activeSection="guides" />
  );
  assert.ok(mobileMenuHtml.includes('aria-controls="mobile-primary-navigation-panel"'));

  // 5. Editorial Footer structure & Saved Gifts footer triggers
  const footerSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/EditorialFooter.astro'),
    'utf8'
  );
  assert.ok(footerSource.includes('EDITORIAL_FOOTER_COLUMNS'));
  assert.ok(footerSource.includes('FooterSavedLinkIsland'));
  assert.ok(footerSource.includes('FooterSavedActionsIsland'));
  assert.equal(EDITORIAL_FOOTER_COLUMNS.length, 4);
  assert.deepEqual(
    EDITORIAL_FOOTER_COLUMNS.map((c) => c.heading),
    ['Explore', 'Discover', 'The Publication', 'Information']
  );

  const footerSavedLinkHtml = renderToStaticMarkup(<FooterSavedLinkIsland />);
  assert.match(footerSavedLinkHtml, /Saved Gifts/);
  const footerSavedActionsHtml = renderToStaticMarkup(<FooterSavedActionsIsland />);
  assert.match(footerSavedActionsHtml, /Saved Gifts/);

  // 6. Supporting publication pages (/about/, /contact/, /editorial-policy/, /affiliate-disclosure/, /privacy-policy/, /terms-of-use/)
  for (const routeFile of [
    'src/pages/about/index.astro',
    'src/pages/contact/index.astro',
    'src/pages/editorial-policy/index.astro',
    'src/pages/affiliate-disclosure/index.astro',
    'src/pages/privacy-policy/index.astro',
    'src/pages/terms-of-use/index.astro',
  ]) {
    const source = fs.readFileSync(path.resolve(process.cwd(), routeFile), 'utf8');
    assert.ok(
      source.includes('PublicationInfoPageView'),
      `${routeFile} must render PublicationInfoPageView`
    );
  }
  const contactSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/contact/index.astro'),
    'utf8'
  );
  assert.ok(
    contactSource.includes('SHOP_RETURNS_FAQ_URL'),
    'Contact page must direct Shop & Merchandise order questions to the Fourthwall Returns & FAQ page'
  );
  assert.ok(
    !contactSource.includes('<form'),
    'Contact page must not display a nonfunctional contact form'
  );

  const infoViewHtml = renderToStaticMarkup(
    <PublicationInfoPageView
      currentPath="/about/"
      kicker="The Publication"
      title="About Science of Gifts"
      subtitle="Research-informed gift journalism."
      sections={[
        {
          id: 'mission',
          heading: 'Editorial Purpose',
          paragraphs: ['Helping readers give more thoughtful gifts.'],
        },
      ]}
    />
  );
  assert.match(infoViewHtml, /About Science of Gifts/);

  // 7. Affiliate disclosures on Gift Guide and Product pages
  const sampleGuide = contentRepository.getAllGiftGuides()[0];
  const guideHtml = renderToStaticMarkup(
    <GiftGuideReaderView guide={sampleGuide} savedProductIds={[]} />
  );
  assert.match(guideHtml, /href="\/affiliate-disclosure\/"/);

  const sampleProduct = contentRepository.getAllProducts()[0];
  const productHtml = renderToStaticMarkup(
    <EditorialProductProfile
      product={sampleProduct}
      guideAppearances={contentRepository.getProductGuideAppearances(sampleProduct.id)}
      similarComparisons={contentRepository.getSimilarProductComparisons(sampleProduct)}
      relatedArticles={contentRepository.getAllArticles().slice(0, 1)}
      citations={[]}
    />
  );
  assert.match(productHtml, /href="\/affiliate-disclosure\/"/);
  assert.ok(productHtml.includes(AFFILIATE_DISCLOSURE_CONFIG.shortInlineNotice));

  // 8. Human-readable Site Map (/site-map/)
  const guidesData = contentRepository.getGiftGuidesDirectoryData();
  const articlesData = contentRepository.getArticlesDirectoryData();
  const siteMapHtml = renderToStaticMarkup(
    <SiteMapView
      guides={guidesData.allGuides}
      recipientCategories={guidesData.recipientDiscovery}
      interestCategories={guidesData.interestDiscovery}
      occasionCategories={guidesData.occasionDiscovery}
      budgetBrackets={guidesData.budgetDiscovery}
      articles={articlesData.allArticles}
      storyTopics={articlesData.topicDiscovery}
      products={contentRepository.getAllProducts()}
    />
  );
  assert.match(siteMapHtml, /Main Website Sections/);
  assert.match(siteMapHtml, /Gift Guides/);
  assert.match(siteMapHtml, /Gift Guide Categories/);
  assert.match(siteMapHtml, /Stories/);
  assert.match(siteMapHtml, /Story Topics/);
  assert.match(siteMapHtml, /Product Profiles/);
  assert.match(siteMapHtml, /Publication Information/);
  assert.ok(
    !siteMapHtml.includes('/dev/theme-lab'),
    'Human-readable site map must exclude internal developer tools such as /dev/theme-lab/'
  );
});

test('37. Standardized product photography system: 4:3 aspect-ratio alignment, focalPoint cropping, fitMode contain, override URLs, responsive srcset/sizes, sample label fix, and image validation', () => {
  // 1. Photography standard constants
  assert.equal(PRODUCT_PHOTOGRAPHY_STANDARD.masterAspectRatio, '1:1');
  assert.equal(PRODUCT_PHOTOGRAPHY_STANDARD.preferredMasterWidth, 2400);
  assert.equal(PRODUCT_PHOTOGRAPHY_STANDARD.preferredMasterHeight, 2400);
  assert.equal(PRODUCT_PHOTOGRAPHY_STANDARD.editorialHeroAspectRatio, '16:9');

  // 2. Verify GiftRecommendation 'standard' card and EditorialProductProfile 'Compare With Similar Gifts' use aspect-[4/3] (and never aspect-[16/10])
  const sampleProduct = contentRepository.getAllProducts()[0];
  const standardRecHtml = renderToStaticMarkup(
    <GiftRecommendation
      recommendation={{
        productId: sampleProduct.id,
        presentationStyle: 'standard',
        awardLabel: 'Best Daily Ritual',
        customEditorialNote: sampleProduct.whyToGiveIt,
        idealFor: sampleProduct.bestForSummary,
        goodToKnow: sampleProduct.detailsAndCare,
      }}
      product={sampleProduct}
      rankIndex={0}
      isSaved={false}
      onToggleSaveProduct={() => {}}
    />
  );
  assert.match(
    standardRecHtml,
    /aspect-\[4\/3\]/,
    'Standard GiftRecommendation card must use 4:3 aspect ratio'
  );
  assert.ok(
    !standardRecHtml.includes('aspect-[16/10]'),
    'Standard GiftRecommendation card must no longer use 16:10 aspect ratio'
  );

  const profileHtmlWithSimilar = renderToStaticMarkup(
    <EditorialProductProfile
      product={sampleProduct}
      guideAppearances={contentRepository.getProductGuideAppearances(
        sampleProduct.id
      )}
      similarComparisons={contentRepository.getSimilarProductComparisons(
        sampleProduct
      )}
      relatedArticles={contentRepository.getAllArticles().slice(0, 1)}
      citations={[]}
    />
  );
  assert.ok(
    !profileHtmlWithSimilar.includes('aspect-[16/10]'),
    'EditorialProductProfile Compare With Similar Gifts must use 4:3 and never 16:10'
  );
  assert.match(profileHtmlWithSimilar, /aspect-\[4\/3\]/);

  // 3. Focal-point normalization and CSS object-position across 4:5, 4:3, and 1:1 containers
  assert.deepEqual(normalizeFocalPoint(undefined), { x: 0.5, y: 0.5 });
  assert.equal(resolveFocalPointObjectPosition(undefined), '50% 50%');
  assert.equal(
    resolveFocalPointObjectPosition({ x: 0.25, y: 0.8 }),
    '25% 80%'
  );
  assert.deepEqual(
    normalizeFocalPoint({ x: -0.4, y: 1.7 }),
    { x: 0, y: 1 },
    'Out-of-bounds focal point coordinates must be clamped safely to [0, 1]'
  );

  const customFocalImage = {
    id: 'img_focal_test',
    url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80',
    fallbackColor: '#F6F4EF',
    alt: 'Hand-thrown stoneware mug on linen table',
    focalPoint: { x: 0.3, y: 0.7 },
  };
  const focalHtml = renderToStaticMarkup(
    <PhotoImage
      image={customFocalImage}
      preset="card-portrait"
      aspectRatio="4:5"
    />
  );
  assert.match(
    focalHtml,
    /object-position:30% 70%/,
    'PhotoImage must apply focalPoint as CSS object-position'
  );

  // 4. fitMode: 'contain' support for tall or irregular products
  const containImage = {
    ...customFocalImage,
    fitMode: 'contain' as const,
    fallbackColor: '#FAF7F2',
  };
  const containHtml = renderToStaticMarkup(
    <PhotoImage
      image={containImage}
      preset="card-landscape"
      aspectRatio="4:3"
    />
  );
  assert.match(
    containHtml,
    /object-contain/,
    'fitMode="contain" must render object-contain class'
  );
  assert.match(
    containHtml,
    /data-fit-mode="contain"/,
    'fitMode="contain" must set data-fit-mode="contain"'
  );
  assert.ok(
    !containHtml.includes('object-cover'),
    'fitMode="contain" must not include object-cover'
  );

  // 5. Optional landscapeOverrideUrl and portraitOverrideUrl selection
  const overrideImage = {
    id: 'img_override_test',
    url: 'https://cdn.sanity.io/images/proj/prod/master-square-2400x2400.jpg',
    landscapeOverrideUrl:
      'https://cdn.sanity.io/images/proj/prod/custom-landscape-4x3.jpg',
    portraitOverrideUrl:
      'https://cdn.sanity.io/images/proj/prod/custom-portrait-4x5.jpg',
    fallbackColor: '#F6F4EF',
    alt: 'Artisanal olive oil bottle',
  };
  assert.equal(
    selectProductImageSourceUrl(overrideImage, '1:1'),
    overrideImage.url
  );
  assert.equal(
    selectProductImageSourceUrl(overrideImage, '4:3'),
    overrideImage.landscapeOverrideUrl
  );
  assert.equal(
    selectProductImageSourceUrl(overrideImage, '4:5'),
    overrideImage.portraitOverrideUrl
  );

  const resolvedLandscape = resolveProductImageDelivery(overrideImage, {
    preset: 'hero-landscape',
    aspectRatio: '4:3',
  });
  assert.equal(resolvedLandscape.usedOverrideUrl, 'landscape');
  assert.ok(resolvedLandscape.src.includes('custom-landscape-4x3.jpg'));

  const resolvedPortrait = resolveProductImageDelivery(overrideImage, {
    preset: 'card-portrait',
    aspectRatio: '4:5',
  });
  assert.equal(resolvedPortrait.usedOverrideUrl, 'portrait');
  assert.ok(resolvedPortrait.src.includes('custom-portrait-4x5.jpg'));

  // 6. Responsive derivative URLs & srcset/sizes (thumbnails request small derivatives, unknown hosts are untouched)
  assert.equal(
    detectImageCdnProvider(customFocalImage.url),
    'unsplash'
  );
  assert.equal(
    detectImageCdnProvider(overrideImage.url),
    'sanity'
  );
  assert.equal(
    detectImageCdnProvider('https://merchant.example.org/assets/vase.jpg'),
    'generic'
  );

  const thumbDelivery = resolveProductImageDelivery(customFocalImage, {
    preset: 'thumbnail-xs',
    aspectRatio: '1:1',
  });
  assert.ok(
    thumbDelivery.src.includes('w=120'),
    'Thumbnail preset must request a compact 120px derivative instead of w=900'
  );
  assert.ok(
    thumbDelivery.srcSet &&
      thumbDelivery.srcSet.includes('96w') &&
      thumbDelivery.srcSet.includes('160w'),
    'Thumbnail preset must generate 1x/2x srcset entries'
  );
  assert.equal(thumbDelivery.sizes, '64px');

  const cardDelivery = resolveProductImageDelivery(customFocalImage, {
    preset: 'card-portrait',
    aspectRatio: '4:5',
  });
  assert.ok(cardDelivery.src.includes('w=540'));
  assert.ok(
    cardDelivery.srcSet &&
      cardDelivery.srcSet.includes('360w') &&
      cardDelivery.srcSet.includes('720w')
  );

  const genericUrl = 'https://merchant.example.org/assets/teapot-2400.jpg';
  const genericDelivery = resolveProductImageDelivery(
    {
      id: 'img_generic',
      url: genericUrl,
      fallbackColor: '#F6F4EF',
      alt: 'Cast iron teapot',
    },
    { preset: 'card-landscape', aspectRatio: '4:3' }
  );
  assert.equal(
    genericDelivery.src,
    genericUrl,
    'Unknown image host URLs must never have fabricated query parameters appended'
  );
  assert.equal(genericDelivery.srcSet, undefined);

  // 7. Sample image handling fix in EditorialProductProfile
  const realPhotoProduct = {
    ...sampleProduct,
    images: [
      {
        ...sampleProduct.images[0],
        isSampleAsset: undefined,
      },
    ],
  };
  const realPhotoHtml = renderToStaticMarkup(
    <EditorialProductProfile
      product={realPhotoProduct}
      guideAppearances={[]}
      similarComparisons={[]}
      relatedArticles={[]}
      citations={[]}
    />
  );
  assert.ok(
    !realPhotoHtml.includes('Sample preview photography'),
    'Real product photographs with isSampleAsset undefined or false must not be labeled Sample preview photography'
  );

  const sampleFlaggedProduct = {
    ...sampleProduct,
    images: [
      {
        ...sampleProduct.images[0],
        isSampleAsset: true,
      },
    ],
  };
  const sampleFlaggedHtml = renderToStaticMarkup(
    <EditorialProductProfile
      product={sampleFlaggedProduct}
      guideAppearances={[]}
      similarComparisons={[]}
      relatedArticles={[]}
      citations={[]}
    />
  );
  assert.ok(
    sampleFlaggedHtml.includes('Sample preview photography'),
    'Products explicitly marked isSampleAsset: true must display Sample preview photography'
  );

  // 8. Missing image URL fallback & non-breaking catalog image validation
  const missingUrlHtml = renderToStaticMarkup(
    <PhotoImage
      image={{
        id: 'img_missing',
        url: '',
        fallbackColor: '#EBF3FE',
        alt: 'Missing ceramic pitcher photo',
      }}
      preset="card-portrait"
    />
  );
  assert.match(missingUrlHtml, /role="img"/);
  assert.match(missingUrlHtml, /Missing ceramic pitcher photo/);

  const validationIssues = validateProductImagesForProduct({
    id: 'prod_validation_check',
    title: 'Validation Check Product',
    images: [
      {
        id: 'img_01',
        url: 'https://images.unsplash.com/photo-12345',
        fallbackColor: '#F6F4EF',
        alt: 'Valid alt text here',
        isSampleAsset: true,
        focalPoint: { x: 1.5, y: -0.2 },
        width: 1600,
        height: 1200,
      },
    ],
  });
  const issueCodes = validationIssues.map((i) => i.code);
  assert.ok(issueCodes.includes('PLACEHOLDER_IMAGE_DOMAIN'));
  assert.ok(issueCodes.includes('SAMPLE_IMAGE_ASSET'));
  assert.ok(issueCodes.includes('INVALID_FOCAL_POINT'));
  assert.ok(issueCodes.includes('SUBOPTIMAL_IMAGE_DIMENSIONS'));

  const catalogIntegrity = validateCatalogIntegrity();
  assert.equal(
    catalogIntegrity.passed,
    true,
    'Development catalog validation must pass without breaking the build while surfacing sample/placeholder warnings'
  );
  assert.ok(
    catalogIntegrity.issues.some(
      (i) =>
        i.code === 'PLACEHOLDER_IMAGE_DOMAIN' && i.severity === 'warning'
    )
  );
});

test('38. Complete SEO Infrastructure: decoupled H1 vs SEO titles, intelligent defaults, canonical normalization, robots & anti-site-wide-noindex guardrail, dynamic XML sitemap, JSON-LD, and Editorial Hub readiness', () => {
  const baseGuide = contentRepository.getAllGiftGuides()[0];
  const baseArticle = contentRepository.getAllArticles()[0];
  const baseProduct = contentRepository.getAllProducts()[0];

  // 1. Gift guide with custom SEO title vs on-page H1 (decoupled bidirectional independence)
  const guideCustomSeo = resolvePageSeoMetadata({
    onPageTitle: 'Visible On-Page Guide H1 Headline',
    subtitleOrSummary: baseGuide.subtitle,
    seo: {
      seoTitle: 'Custom Search Title for Gift Guide | Science of Gifts',
      metaDescription: 'Custom guide meta description for search engines.',
      canonicalPath: `/gift-guides/${baseGuide.slug}/`,
      ogType: 'article',
      schemaType: 'ItemList',
    },
    defaultCanonicalPath: `/gift-guides/${baseGuide.slug}/`,
    defaultOgType: 'article',
    contentType: 'guide',
  });
  assert.equal(
    guideCustomSeo.onPageTitle,
    'Visible On-Page Guide H1 Headline',
    'Changing seoTitle must never alter the visible on-page H1'
  );
  assert.equal(
    guideCustomSeo.seoTitle,
    'Custom Search Title for Gift Guide | Science of Gifts',
    'Changing on-page H1 must never overwrite an explicit custom seoTitle'
  );

  // 2. Gift guide without custom SEO title using intelligent default title generation (no injected year or fake counts)
  const guideDefaultSeo = resolvePageSeoMetadata({
    onPageTitle: 'Quiet Morning Rituals for Tea Lovers',
    subtitleOrSummary:
      'Hand-thrown matcha bowls and stoneware vessels that turn the first fifteen minutes of the morning into a calm ritual.',
    seo: {
      seoTitle: '',
      metaDescription: '',
      canonicalPath: '/gift-guides/quiet-morning-rituals/',
      ogType: 'article',
      schemaType: 'ItemList',
    },
    defaultCanonicalPath: '/gift-guides/quiet-morning-rituals/',
    defaultOgType: 'article',
    contentType: 'guide',
  });
  assert.equal(
    guideDefaultSeo.seoTitle,
    'Quiet Morning Rituals for Tea Lovers | Science of Gifts'
  );
  assert.ok(
    !/202\d/.test(guideDefaultSeo.seoTitle),
    'Default SEO title must not automatically inject the current year'
  );
  assert.equal(
    guideDefaultSeo.metaDescription,
    'Hand-thrown matcha bowls and stoneware vessels that turn the first fifteen minutes of the morning into a calm ritual.'
  );

  // 3 & 4. Article with custom SEO title vs on-page H1, and Article without custom SEO title
  const articleCustomSeo = resolvePageSeoMetadata({
    onPageTitle: baseArticle.title,
    subtitleOrSummary: baseArticle.subtitle,
    seo: {
      ...baseArticle.seo,
      seoTitle: 'Custom Behavioral Gifting Essay Title | Science of Gifts',
    },
    defaultCanonicalPath: `/articles/${baseArticle.slug}/`,
    defaultOgType: 'article',
    contentType: 'article',
  });
  assert.equal(articleCustomSeo.onPageTitle, baseArticle.title);
  assert.equal(
    articleCustomSeo.seoTitle,
    'Custom Behavioral Gifting Essay Title | Science of Gifts'
  );

  const articleDefaultSeo = resolvePageSeoMetadata({
    onPageTitle: 'Why Shared Experiences Outlast Novelty Gadgets',
    subtitleOrSummary:
      'Empirical research shows that gifts anchoring a shared ritual build stronger relationship warmth over time. Even a modest kitchen ritual can connect giver and receiver.',
    defaultCanonicalPath: '/articles/shared-experiences-outlast-novelty/',
    defaultOgType: 'article',
    contentType: 'article',
  });
  assert.equal(
    articleDefaultSeo.seoTitle,
    'Why Shared Experiences Outlast Novelty Gadgets | Science of Gifts'
  );
  assert.ok(
    articleDefaultSeo.metaDescription.endsWith('.'),
    'Default meta description should preserve complete sentences without mid-word truncation'
  );

  // 5 & 6. Product page with custom SEO fields vs intelligent defaults
  const productCustomSeo = resolvePageSeoMetadata({
    onPageTitle: baseProduct.title,
    subtitleOrSummary: baseProduct.subtitle,
    seo: {
      seoTitle: 'Custom Carafe SEO Title | Science of Gifts',
      metaDescription: 'Custom Carafe Meta Description.',
      canonicalPath: `/products/${baseProduct.slug}/`,
      ogType: 'product',
      schemaType: 'Product',
    },
    defaultCanonicalPath: `/products/${baseProduct.slug}/`,
    defaultOgType: 'product',
    contentType: 'product',
    vendor: baseProduct.vendor,
  });
  assert.equal(
    productCustomSeo.seoTitle,
    'Custom Carafe SEO Title | Science of Gifts'
  );
  assert.equal(
    productCustomSeo.metaDescription,
    'Custom Carafe Meta Description.'
  );

  const productDefaultSeo = resolvePageSeoMetadata({
    onPageTitle: baseProduct.title,
    subtitleOrSummary: `${baseProduct.subtitle} ${baseProduct.whyToGiveIt}`,
    defaultCanonicalPath: `/products/${baseProduct.slug}/`,
    defaultOgType: 'product',
    contentType: 'product',
    vendor: baseProduct.vendor,
  });
  assert.ok(productDefaultSeo.seoTitle.includes(baseProduct.title));
  assert.ok(productDefaultSeo.seoTitle.includes(baseProduct.vendor));
  assert.ok(productDefaultSeo.seoTitle.endsWith('| Science of Gifts'));

  // Non-blocking length guidance warnings
  const lengthWarnings = evaluateSeoLengthGuidance(
    'Short Title',
    'Short meta desc.'
  );
  assert.equal(lengthWarnings.length, 2);

  // 7 & 8. Category archive & directory SEO metadata and custom override support
  const testRepo = createContentRepository(new LocalCMSContentStore(true));
  const parentsArchiveBefore = testRepo.getRecipientCategoryArchive('parent');
  assert.ok(parentsArchiveBefore);
  assert.equal(
    parentsArchiveBefore.category.seo?.canonicalPath,
    '/gift-guides/recipients/parent/'
  );
  testRepo.setDirectoryOrCategorySeoOverride(
    '/gift-guides/recipients/parent/',
    {
      seoTitle: 'Custom Parents Gift Archive Title | Science of Gifts',
      metaDescription: 'Custom parents archive meta description.',
    }
  );
  const parentsArchiveAfter = testRepo.getRecipientCategoryArchive('parent');
  assert.equal(
    parentsArchiveAfter?.category.seo?.seoTitle,
    'Custom Parents Gift Archive Title | Science of Gifts'
  );
  assert.equal(
    parentsArchiveAfter?.category.label,
    'Parents & In-Laws',
    'Custom category SEO title must not alter visible category label/H1'
  );

  const guidesDirSeo = testRepo.getDirectorySeoEntry('/gift-guides/');
  assert.ok(guidesDirSeo);
  assert.equal(guidesDirSeo.title, 'Gift Guides');
  assert.ok(guidesDirSeo.seo?.seoTitle?.includes('Gift Guides'));

  // 9. Canonical URL generation, trailing slash normalization, query-string stripping, and cross-domain rejection
  assert.equal(
    normalizeCanonicalPath('/gift-guides/slug-without-slash').canonicalPath,
    '/gift-guides/slug-without-slash/'
  );
  assert.equal(
    normalizeCanonicalPath('/gift-finder/?recipient=parent&maxPrice=50')
      .canonicalPath,
    '/gift-finder/'
  );
  const crossDomainShopAttempt = resolveCanonicalUrl(
    'https://shop.scienceofgifts.com/products/some-item',
    '/products/hand-blown-two-tone-bedside-water-carafe-and-glass/'
  );
  assert.equal(
    crossDomainShopAttempt.rejectedCrossDomainOverride,
    true,
    'Must reject cross-domain canonical override to shop.scienceofgifts.com'
  );
  assert.equal(SITE_ORIGIN, 'https://www.scienceofgifts.com');
  assert.equal(
    crossDomainShopAttempt.canonicalUrl,
    'https://www.scienceofgifts.com/products/hand-blown-two-tone-bedside-water-carafe-and-glass/'
  );
  // Non-www input URL on scienceofgifts.com normalizes cleanly to https://www.scienceofgifts.com
  const nonWwwNormalized = resolveCanonicalUrl(
    'https://scienceofgifts.com/gift-guides/',
    '/gift-guides/'
  );
  assert.equal(
    nonWwwNormalized.canonicalUrl,
    'https://www.scienceofgifts.com/gift-guides/'
  );
  assert.equal(nonWwwNormalized.rejectedCrossDomainOverride, false);

  // 10. Open Graph and Twitter metadata output (including independent ogTitle and ogDescription)
  const socialOverrideSeo = resolvePageSeoMetadata({
    onPageTitle: 'On-Page H1 Title',
    subtitleOrSummary: 'Default summary.',
    seo: {
      seoTitle: 'Search Engine Title | Science of Gifts',
      metaDescription: 'Search Engine Meta Description.',
      ogTitle: 'Social Card Headline Override',
      ogDescription: 'Social Card Description Override.',
      ogImage: 'https://cdn.sanity.io/images/social-card.jpg',
      canonicalPath: '/articles/sample-story/',
      ogType: 'article',
      schemaType: 'Article',
    },
    defaultCanonicalPath: '/articles/sample-story/',
    defaultOgType: 'article',
  });
  assert.equal(socialOverrideSeo.ogTitle, 'Social Card Headline Override');
  assert.equal(
    socialOverrideSeo.ogDescription,
    'Social Card Description Override.'
  );
  assert.equal(
    socialOverrideSeo.ogImage,
    'https://cdn.sanity.io/images/social-card.jpg'
  );
  assert.equal(socialOverrideSeo.twitterCard, 'summary_large_image');

  // 11. noindex page behavior, draft page behavior & sample product preview behavior
  const explicitNoindexSeo = resolvePageSeoMetadata({
    onPageTitle: 'Theme Lab',
    defaultCanonicalPath: '/dev/theme-lab/',
    forceNoindex: true,
  });
  assert.equal(explicitNoindexSeo.noindex, true);
  assert.equal(explicitNoindexSeo.robots, 'noindex, follow');
  assert.equal(explicitNoindexSeo.indexing, 'noindex,follow');

  const draftPageSeo = resolvePageSeoMetadata({
    onPageTitle: 'Unpublished Draft Guide',
    defaultCanonicalPath: '/gift-guides/draft-guide/',
    status: 'draft',
  });
  assert.equal(draftPageSeo.noindex, true);
  assert.equal(draftPageSeo.robots, 'noindex, follow');

  // Sample products in catalog.ts resolve to noindex so previews work without indexing fake products
  const sampleProductReadiness = evaluateProductCommerceReadiness(baseProduct);
  assert.equal(sampleProductReadiness.isSampleOrPlaceholderProduct, true);
  assert.equal(sampleProductReadiness.canEmitStructuredOffer, false);
  assert.equal(sampleProductReadiness.canIndexProductPage, false);

  const sampleProductSeo = resolvePageSeoMetadata({
    onPageTitle: baseProduct.title,
    defaultCanonicalPath: `/products/${baseProduct.slug}/`,
    contentType: 'product',
    vendor: baseProduct.vendor,
    product: baseProduct,
  });
  assert.equal(
    sampleProductSeo.noindex,
    true,
    'Sample product preview page must resolve to noindex'
  );
  assert.equal(sampleProductSeo.isSampleProductPreview, true);

  // Verified non-sample product resolves to index, follow and can emit Offer
  const verifiedProdRecord = {
    ...baseProduct,
    vendor: 'Atelier Verre',
    purchaseUrl: 'https://atelierverre.com/products/bedside-carafe',
    isPlaceholderLink: false,
    isSampleProduct: false,
    priceVerified: true,
  };
  const verifiedReadiness = evaluateProductCommerceReadiness(verifiedProdRecord);
  assert.equal(verifiedReadiness.isSampleOrPlaceholderProduct, false);
  assert.equal(verifiedReadiness.canEmitStructuredOffer, true);
  assert.equal(verifiedReadiness.canIndexProductPage, true);
  assert.equal(
    verifiedReadiness.hasVerifiedInventoryAvailability,
    false,
    'Inventory availability must remain false unless inventoryVerified === true'
  );

  // 12. Prevention of accidental site-wide noindex via validateSeoAndIndexingSafety
  const productionSafety = validateSeoAndIndexingSafety({
    catalog: contentRepository.getCatalogSnapshot(),
    categoryEntries: contentRepository.getAllCategorySeoEntries(),
  });
  assert.equal(
    productionSafety.passed,
    true,
    'Normal production catalog must pass SEO & indexing safety check with zero errors'
  );
  assert.equal(productionSafety.noindexPublicRoutes, 0);
  assert.equal(productionSafety.samplePreviewProductsNoindexCount, 13);
  assert.ok(productionSafety.indexablePublicRoutes >= 27);

  const simulatedGlobalNoindex = validateSeoAndIndexingSafety({
    catalog: contentRepository.getCatalogSnapshot(),
    simulateGlobalNoindexOverride: true,
  });
  assert.equal(simulatedGlobalNoindex.passed, false);
  assert.ok(
    simulatedGlobalNoindex.issues.some(
      (i) => i.code === 'GLOBAL_NOINDEX_DEFAULT_DETECTED'
    ),
    'Safety guardrail must detect accidental site-wide noindex'
  );

  // 13. Dynamic XML sitemap excludes sample products, noindex, draft, /dev/, and filter URLs, and includes verified products
  const sitemapEntries = buildXmlSitemapEntries({
    catalog: contentRepository.getCatalogSnapshot(),
    categoryEntries: contentRepository.getAllCategorySeoEntries(),
    editorialHubs: contentRepository.getAllEditorialHubs({
      includeDrafts: true,
    }),
  });
  const sitemapLocs = sitemapEntries.map((e) => e.loc);
  assert.ok(
    sitemapLocs.every((url) => url.startsWith('https://www.scienceofgifts.com/')),
    'All sitemap URLs must use https://www.scienceofgifts.com/'
  );
  // Sample products from seed catalog must NOT be included in production sitemap
  for (const sampleProd of contentRepository.getAllProducts()) {
    assert.ok(
      !sitemapLocs.includes(
        `https://www.scienceofgifts.com/products/${sampleProd.slug}/`
      ),
      `Sample product /products/${sampleProd.slug}/ must be excluded from production sitemap`
    );
  }
  // Verified production product IS included in sitemap
  const sitemapWithVerifiedProduct = buildXmlSitemapEntries({
    catalog: {
      ...contentRepository.getCatalogSnapshot(),
      products: {
        [verifiedProdRecord.id]: verifiedProdRecord,
      },
    },
    categoryEntries: contentRepository.getAllCategorySeoEntries(),
  });
  assert.ok(
    sitemapWithVerifiedProduct.some(
      (e) =>
        e.loc ===
        `https://www.scienceofgifts.com/products/${verifiedProdRecord.slug}/`
    ),
    'Verified production product must be included in XML sitemap'
  );

  assert.ok(
    !sitemapLocs.some((url) => url.includes('/dev/')),
    'Sitemap must never include /dev/ routes'
  );
  assert.ok(
    !sitemapLocs.some((url) => url.includes('?')),
    'Sitemap must never include search or filter query parameter URLs'
  );
  assert.ok(
    !sitemapLocs.some(
      (url) =>
        url.includes('/gifts-for-men/') ||
        url.includes('/gifts-for-women/') ||
        url.includes('/gifts-for-him/') ||
        url.includes('/gifts-for-her/')
    ),
    'Sitemap must exclude draft/unready /gifts-for-men/ and /gifts-for-women/ editorial hubs'
  );

  const xmlString = generateXmlSitemap({
    catalog: contentRepository.getCatalogSnapshot(),
    categoryEntries: contentRepository.getAllCategorySeoEntries(),
    editorialHubs: contentRepository.getAllEditorialHubs({
      includeDrafts: true,
    }),
  });
  assert.ok(
    xmlString.startsWith('<?xml version="1.0" encoding="UTF-8"?>')
  );
  assert.ok(
    xmlString.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
  );

  const prodRobotsTxt = generateRobotsTxt({ allowIndexing: true });
  assert.ok(prodRobotsTxt.includes('Allow: /'));
  assert.ok(prodRobotsTxt.includes('Disallow: /dev/'));
  assert.ok(
    prodRobotsTxt.includes(
      'Sitemap: https://www.scienceofgifts.com/sitemap.xml'
    )
  );
  const stagingRobotsTxt = generateRobotsTxt({ allowIndexing: false });
  assert.ok(stagingRobotsTxt.includes('Disallow: /'));

  // 14. Structured Data (JSON-LD) accuracy across Homepage, Guides, Articles, Products, and Category Archives
  const websiteLd = buildWebsiteJsonLd();
  assert.equal(websiteLd['@graph'].length, 2);
  assert.equal(websiteLd['@graph'][0]['@type'], 'Organization');
  assert.equal(websiteLd['@graph'][1]['@type'], 'WebSite');
  assert.equal(websiteLd.url, 'https://www.scienceofgifts.com');

  const guideLd = buildGiftGuideJsonLd(baseGuide);
  assert.equal(guideLd['@graph'][0]['@type'], 'BreadcrumbList');
  assert.equal(guideLd['@graph'][1]['@type'], 'ItemList');
  assert.equal(guideLd['@graph'][2]['@type'], 'Article');
  assert.equal(guideLd['@graph'][2].headline, baseGuide.title);
  // Sample products inside guide ItemList must not emit fake Offer URLs
  for (const listItem of guideLd['@graph'][1].itemListElement ?? []) {
    assert.equal(
      (listItem.item as Record<string, unknown>).offers,
      undefined,
      'Sample product in Gift Guide ItemList must not emit structured Offer'
    );
  }

  // Sample product JSON-LD omits offers
  const sampleProductLd = buildProductJsonLd(baseProduct);
  assert.equal(
    sampleProductLd['@graph'][1].offers,
    undefined,
    'Sample product JSON-LD must not emit Offer'
  );

  // Verified affiliate product JSON-LD emits Offer without unverified stock availability
  const affiliateProductLd = buildProductJsonLd(verifiedProdRecord);
  assert.equal(
    affiliateProductLd['@graph'][1].offers?.seller?.name,
    'Atelier Verre',
    'Affiliate product JSON-LD must attribute seller to the actual maker/vendor, not Science of Gifts'
  );
  assert.equal(
    affiliateProductLd['@graph'][1].offers?.availability,
    undefined,
    'Verified product without inventoryVerified must not assert InStock'
  );
  assert.equal(
    (affiliateProductLd['@graph'][1] as Record<string, unknown>)
      .aggregateRating,
    undefined,
    'Product JSON-LD must never include fabricated aggregate ratings'
  );

  // Verified Fourthwall product with inventoryVerified === true emits Offer + availability + Science of Gifts Shop seller
  const fourthwallProductLd = buildProductJsonLd({
    ...verifiedProdRecord,
    commerceProvider: 'fourthwall',
    inventoryVerified: true,
    inStock: true,
  });
  assert.equal(
    fourthwallProductLd['@graph'][1].offers?.seller?.name,
    'Science of Gifts Shop',
    'Fourthwall first-party merchandise JSON-LD attributes seller to Science of Gifts Shop'
  );
  assert.equal(
    fourthwallProductLd['@graph'][1].offers?.availability,
    'https://schema.org/InStock'
  );

  const categoryArchiveLd = buildCategoryArchiveJsonLd({
    archiveTitle: 'Gifts for Parents & In-Laws | Science of Gifts',
    archiveDescription: 'Warm, usefulness-first gifts for parents.',
    canonicalPath: '/gift-guides/recipients/parents/',
    parentDirectoryLabel: 'Gift Guides',
    parentDirectoryPath: '/gift-guides/',
    items: [
      {
        name: baseGuide.title,
        url: `/gift-guides/${baseGuide.slug}/`,
        description: baseGuide.subtitle,
      },
    ],
  });
  assert.equal(categoryArchiveLd['@graph'][0]['@type'], 'BreadcrumbList');
  assert.equal(categoryArchiveLd['@graph'][1]['@type'], 'CollectionPage');

  // 15. Search and filter URLs do not create duplicate indexable pages
  const filteredFinderSeo = resolvePageSeoMetadata({
    onPageTitle: 'Interactive Gift Finder',
    defaultCanonicalPath: '/gift-finder/',
    seo: {
      canonicalPath: '/gift-finder/?recipient=parent&maxPrice=50',
    },
    hasSearchOrFilterParams: true,
  });
  assert.equal(
    filteredFinderSeo.canonicalPath,
    '/gift-finder/',
    'Filtered Gift Finder URL must canonicalize to /gift-finder/'
  );
  assert.equal(
    filteredFinderSeo.canonicalUrl,
    'https://www.scienceofgifts.com/gift-finder/'
  );
  assert.equal(
    filteredFinderSeo.noindex,
    true,
    'Filtered Gift Finder query parameter state must resolve to noindex'
  );

  // 16. Editorial Hubs (/gifts-for-men/ and /gifts-for-women/) readiness gating, direct production URL preservation, and no broken nav links
  assert.equal(
    PLANNED_LAUNCH_REDIRECT_MAPPINGS.length,
    0,
    'Because /gifts-for-men/ and /gifts-for-women/ are preserved directly as the canonical hub URLs, no redirect mappings are required'
  );

  const draftHubs = contentRepository.getAllEditorialHubs({
    includeDrafts: true,
  });
  assert.equal(draftHubs.length, 2);
  const publicallyExposedHubs = contentRepository.getAllEditorialHubs();
  assert.equal(
    publicallyExposedHubs.length,
    0,
    'Draft editorial hubs must not be exposed as published hubs until ready'
  );
  assert.equal(
    contentRepository.getPublishedReadyEditorialHubs().length,
    0,
    'getPublishedReadyEditorialHubs must return empty array while hubs are in draft or below readiness threshold'
  );
  for (const hub of draftHubs) {
    const readiness = evaluateEditorialHubReadiness(
      hub,
      contentRepository.getCatalogSnapshot()
    );
    assert.equal(readiness.isReadyToPublish, false);
    assert.equal(readiness.isIndexable, false);
    assert.equal(
      readiness.legacyUrlPreservationConfigured,
      true,
      `Hub ${hub.slug} must preserve existing production URL directly`
    );
    assert.equal(readiness.plannedRedirectMappings.length, 0);
    assert.ok(readiness.missingRequirements.length >= 2);
  }

  const baseLayoutSource = fs.readFileSync(
    path.join(process.cwd(), 'src/layouts/BaseLayout.astro'),
    'utf-8'
  );
  const footerSource = fs.readFileSync(
    path.join(process.cwd(), 'src/components/EditorialFooter.astro'),
    'utf-8'
  );
  assert.ok(
    !baseLayoutSource.includes('/gifts-for-men') &&
      !baseLayoutSource.includes('/gifts-for-women') &&
      !footerSource.includes('/gifts-for-men') &&
      !footerSource.includes('/gifts-for-women'),
    'Navigation and footer must not expose unpublished /gifts-for-men/ or /gifts-for-women/ hubs'
  );
});

test('39. Gifts for Him (/gifts-for-men/) and Gifts for Her (/gifts-for-women/) Editorial Discovery Hubs architecture, sections, SEO, and readiness', () => {
  const himEnriched = contentRepository.getEnrichedEditorialHub(
    'gifts-for-men',
    { includeDrafts: true }
  );
  const herEnriched = contentRepository.getEnrichedEditorialHub(
    'gifts-for-women',
    { includeDrafts: true }
  );

  assert.ok(himEnriched, 'gifts-for-men enriched hub must resolve');
  assert.ok(herEnriched, 'gifts-for-women enriched hub must resolve');

  // Alias lookup also works seamlessly
  const himAlias = contentRepository.getEditorialHubBySlug('gifts-for-him', {
    includeDrafts: true,
  });
  const herAlias = contentRepository.getEditorialHubBySlug('gifts-for-her', {
    includeDrafts: true,
  });
  assert.equal(himAlias?.routePath, '/gifts-for-men/');
  assert.equal(herAlias?.routePath, '/gifts-for-women/');

  // 1. Canonical URLs preserve existing production paths while visible H1s are "Gifts for Him" and "Gifts for Her"
  assert.equal(himEnriched.hub.routePath, '/gifts-for-men/');
  assert.equal(himEnriched.hub.seo.canonicalPath, '/gifts-for-men/');
  assert.equal(himEnriched.hub.title, 'Gifts for Him');
  assert.equal(
    resolveCanonicalUrl(himEnriched.hub.seo.canonicalPath).canonicalUrl,
    'https://www.scienceofgifts.com/gifts-for-men/'
  );

  assert.equal(herEnriched.hub.routePath, '/gifts-for-women/');
  assert.equal(herEnriched.hub.seo.canonicalPath, '/gifts-for-women/');
  assert.equal(herEnriched.hub.title, 'Gifts for Her');
  assert.equal(
    resolveCanonicalUrl(herEnriched.hub.seo.canonicalPath).canonicalUrl,
    'https://www.scienceofgifts.com/gifts-for-women/'
  );

  // 2. Relationship pathways: 6 each covering Dad/Husband/Boyfriend/Brother/Grandpa/Male Friends and Mom/Wife/Girlfriend/Sister/Grandma/Female Friends
  assert.equal(himEnriched.relationships.length, 6);
  assert.deepEqual(
    himEnriched.relationships.map((r) => r.pathway.shortLabel),
    ['Dad', 'Husband', 'Boyfriend', 'Brother', 'Grandpa', 'Male Friends']
  );
  assert.equal(herEnriched.relationships.length, 6);
  assert.deepEqual(
    herEnriched.relationships.map((r) => r.pathway.shortLabel),
    ['Mom', 'Wife', 'Girlfriend', 'Sister', 'Grandma', 'Female Friends']
  );

  // 3. Interests, Budgets, Occasions, Curated Guides, Curated Products, and Buying Advice
  assert.ok(himEnriched.interests.length >= 6);
  assert.equal(himEnriched.budgets.length, 4);
  assert.deepEqual(
    himEnriched.budgets.map((b) => b.bracket.label),
    ['Under $25', '$25 to $50', '$50 to $100', '$100 and Above']
  );
  // Budget product counts strictly reflect valid numeric prices ($18-$24: 3, $25-$50: 5, $50-$100: 4, $100+: 1)
  assert.deepEqual(
    himEnriched.budgets.map((b) => b.matchingProductCount),
    [3, 5, 4, 1]
  );
  assert.equal(himEnriched.occasions.length, 6);
  assert.equal(himEnriched.allCuratedGuides.length, 2);
  assert.equal(himEnriched.curatedProducts.length, 6);
  assert.equal(himEnriched.hub.buyingAdvice.length, 4);
  assert.equal(herEnriched.hub.buyingAdvice.length, 4);

  // 4. Render both hubs to HTML and verify H1s, sections, links, and provenance badges
  const himHtml = renderToStaticMarkup(
    <EditorialDiscoveryHubView enrichedHub={himEnriched} />
  );
  assert.ok(himHtml.includes('<h1'), 'Gifts for Him hub must render H1');
  assert.ok(himHtml.includes('Gifts for Him'));
  assert.ok(himHtml.includes('Browse by Relationship'));
  assert.ok(himHtml.includes('Browse by Interest'));
  assert.ok(himHtml.includes('Browse by Budget'));
  assert.ok(himHtml.includes('Browse by Occasion'));
  assert.ok(himHtml.includes('Featured Gift Guides for Him'));
  assert.ok(himHtml.includes('Featured Individual Gifts'));
  assert.ok(himHtml.includes('Editor’s Selection'));
  assert.ok(himHtml.includes('Still Not Sure What to Choose for Him?'));
  assert.ok(himHtml.includes('How to Choose a Thoughtful Gift for Him'));
  assert.ok(himHtml.includes('href="/gifts-for-women/"'));

  const herHtml = renderToStaticMarkup(
    <EditorialDiscoveryHubView enrichedHub={herEnriched} />
  );
  assert.ok(herHtml.includes('<h1'), 'Gifts for Her hub must render H1');
  assert.ok(herHtml.includes('Gifts for Her'));
  assert.ok(herHtml.includes('Featured Gift Guides for Her'));
  assert.ok(herHtml.includes('Still Not Sure What to Choose for Her?'));
  assert.ok(herHtml.includes('How to Choose a Thoughtful Gift for Her'));
  assert.ok(herHtml.includes('href="/gifts-for-men/"'));

  // 5. JSON-LD structured data for both hubs uses CollectionPage + BreadcrumbList + ItemList without fabricating Offers
  const catalog = contentRepository.getCatalogSnapshot();
  const himJsonLd = buildEditorialHubJsonLd(himEnriched.hub, catalog);
  assert.equal(himJsonLd['@graph'][0]['@type'], 'BreadcrumbList');
  assert.equal(
    himJsonLd['@graph'][0].itemListElement[2]?.item,
    'https://www.scienceofgifts.com/gifts-for-men/'
  );
  assert.equal(himJsonLd['@graph'][1]['@type'], 'CollectionPage');
  assert.equal(
    himJsonLd['@graph'][1].url,
    'https://www.scienceofgifts.com/gifts-for-men/'
  );
  assert.equal(himJsonLd['@graph'][1].mainEntity?.['@type'], 'ItemList');
});

test('40. Premium Global Navigation (Desktop & Mobile 3-group structure, For Him/For Her dev preview visibility) and Site-Wide Search Engine & Modal', () => {
  // 1. Desktop & Mobile Navbar configuration and exact destinations
  const devNavLinks = resolveHeaderEditorialNavLinks({ isDevPreview: true });
  assert.deepEqual(
    devNavLinks.map((l) => ({ label: l.label, href: l.href })),
    [
      { label: 'Gift Guides', href: '/gift-guides/' },
      { label: 'For Him', href: '/gifts-for-men/' },
      { label: 'For Her', href: '/gifts-for-women/' },
      { label: 'Stories', href: '/articles/' },
      { label: 'Shop', href: 'https://shop.scienceofgifts.com/' },
    ]
  );
  assert.equal(PRIMARY_NAV_LINKS.length, 5);
  assert.equal(PRIMARY_CTA_LINK.label, 'Find a Gift');
  assert.equal(PRIMARY_CTA_LINK.href, '/gift-finder/');

  // 2. Safe development preview visibility vs strict public production gating for For Him & For Her
  const strictPublicHubLinksWhenUnready = resolveEditorialHubHeaderLinks({
    isDevPreview: false,
    readyHubSlugs: [],
  });
  assert.equal(
    strictPublicHubLinksWhenUnready.length,
    0,
    'In strict public production mode, unpublished/unready editorial hubs remain gated until ready'
  );
  const strictPublicNavWhenReady = resolveHeaderEditorialNavLinks({
    isDevPreview: false,
    readyHubSlugs: ['gifts-for-men', 'gifts-for-women'],
  });
  assert.equal(strictPublicNavWhenReady.length, 5);

  // Confirm For Him and For Her hubs preserve their draft + noindex status while visible in dev preview nav
  const himHub = contentRepository.getEditorialHubBySlug('gifts-for-men', {
    includeDrafts: true,
  });
  const herHub = contentRepository.getEditorialHubBySlug('gifts-for-women', {
    includeDrafts: true,
  });
  assert.equal(himHub?.status, 'draft');
  assert.equal(himHub?.seo.noindex, true);
  assert.equal(herHub?.status, 'draft');
  assert.equal(herHub?.seo.noindex, true);

  // 3. Header Search button, Saved Gifts button with Bookmark icon & live count, and Mobile Navigation Island
  const searchBtnHtml = renderToStaticMarkup(<HeaderSearchButtonIsland />);
  assert.match(searchBtnHtml, /aria-label="Search gifts, guides, and stories"/);

  const savedBtnHtml = renderToStaticMarkup(<HeaderSavedButtonIsland />);
  assert.match(savedBtnHtml, /Saved Gifts/);
  assert.match(savedBtnHtml, /\(\d+\)/, 'Saved Gifts button must render dynamic count');
  assert.match(savedBtnHtml, /<svg/, 'Saved Gifts button must include bookmark outline icon');

  const mobileNavHtml = renderToStaticMarkup(
    <MobileNavigationIsland activeSection="him" isDevPreview={true} />
  );
  assert.match(mobileNavHtml, /href="\/gift-guides\/"/);
  assert.match(mobileNavHtml, /href="\/gifts-for-men\/"/);
  assert.match(mobileNavHtml, /href="\/gifts-for-women\/"/);
  assert.match(mobileNavHtml, /href="\/articles\/"/);
  assert.match(mobileNavHtml, /https:\/\/shop\.scienceofgifts\.com\//);
  assert.match(mobileNavHtml, /Saved Gifts/);
  assert.match(mobileNavHtml, /href="\/gift-finder\/"/);
  assert.match(mobileNavHtml, /Find a Gift/);
  assert.match(mobileNavHtml, /Search gifts, guides, and stories/);

  // 4. Site-Wide Search Index: Public mode vs Dev Preview mode, and strict exclusion of drafts & sample products in public mode
  const baseCatalog = contentRepository.getCatalogSnapshot({
    includeDrafts: true,
  });
  const sampleSeedProduct = contentRepository.getAllProducts()[0];
  const verifiedRealProduct = {
    ...sampleSeedProduct,
    id: 'prod_verified_artisan_kettle',
    slug: 'verified-artisan-copper-kettle',
    title: 'Artisan Copper Pour-Over Kettle',
    subtitle: 'Hand-hammered copper gooseneck kettle for slow mornings.',
    vendor: 'Kyoto Copperworks',
    productType: 'Tea & Coffee Kettles',
    purchaseUrl: 'https://kyotocopperworks.example.com/kettle',
    isPlaceholderLink: false,
    isSampleProduct: false,
    status: 'published' as const,
  };
  const draftProduct = {
    ...verifiedRealProduct,
    id: 'prod_draft_hidden_item',
    slug: 'draft-secret-unreleased-gift',
    title: 'Unreleased Secret Draft Gift',
    status: 'draft' as const,
  };
  const draftGuide = {
    ...baseCatalog.guides![0],
    id: 'guide_draft_unreleased',
    slug: 'unreleased-draft-gift-guide',
    title: 'Unreleased Draft Gift Guide',
    status: 'draft' as const,
  };
  const draftArticle = {
    ...baseCatalog.articles![0],
    id: 'art_draft_unreleased',
    slug: 'unreleased-draft-story',
    title: 'Unreleased Draft Story',
    status: 'draft' as const,
  };

  const customCatalog = {
    ...baseCatalog,
    guides: [...(baseCatalog.guides ?? []), draftGuide],
    articles: [...(baseCatalog.articles ?? []), draftArticle],
    products: {
      ...(baseCatalog.products ?? {}),
      [verifiedRealProduct.id]: verifiedRealProduct,
      [draftProduct.id]: draftProduct,
    },
  };

  // Public search index (`includeDevSampleProducts: false`)
  const publicSearchIndex = buildSiteSearchIndex({
    catalog: customCatalog,
    includeDevSampleProducts: false,
    includeDevEditorialHubs: false,
  });

  // Never includes draft guide, draft article, or draft product
  assert.ok(
    !publicSearchIndex.some((i) => i.title.includes('Unreleased')),
    'Public search index must strictly exclude draft guides, draft articles, and draft products'
  );
  // Excludes sample/placeholder products from seed catalog in public mode
  assert.ok(
    !publicSearchIndex.some((i) => i.id === `product:${sampleSeedProduct.id}`),
    'Public search index must exclude sample/placeholder products'
  );
  // Includes verified real published product
  assert.ok(
    publicSearchIndex.some((i) => i.id === `product:${verifiedRealProduct.id}`),
    'Public search index must include verified published products'
  );

  // Dev preview search index (`includeDevSampleProducts: true`)
  const devSearchIndex = buildSiteSearchIndex({
    catalog: customCatalog,
    includeDevSampleProducts: true,
    includeDevEditorialHubs: true,
  });
  assert.ok(
    !devSearchIndex.some((i) => i.title.includes('Unreleased')),
    'Dev preview search index must still exclude draft items'
  );
  const sampleInDevIndex = devSearchIndex.find(
    (i) => i.id === `product:${sampleSeedProduct.id}`
  );
  assert.ok(
    sampleInDevIndex && sampleInDevIndex.isSamplePreview === true,
    'Dev preview search index includes sample products clearly flagged with isSamplePreview: true'
  );

  // 5. Querying across Guides, Stories, Products, and Categories + Title-Match Prioritization
  const guideQueryRes = querySiteSearchIndex(publicSearchIndex, 'little things');
  assert.ok(guideQueryRes.guides.length >= 1, 'Must find matching Gift Guide');
  assert.equal(
    guideQueryRes.guides[0].url,
    '/gift-guides/thoughtful-gifts-for-people-who-appreciate-the-little-things/'
  );

  const storyQueryRes = querySiteSearchIndex(publicSearchIndex, 'expensive');
  assert.ok(storyQueryRes.articles.length >= 1, 'Must find matching Story');
  assert.equal(
    storyQueryRes.articles[0].url,
    '/articles/why-thoughtful-gifts-matter-more-than-expensive-ones/'
  );

  const productQueryRes = querySiteSearchIndex(
    publicSearchIndex,
    'copper kettle'
  );
  assert.equal(productQueryRes.products.length, 1);
  assert.equal(
    productQueryRes.products[0].url,
    '/products/verified-artisan-copper-kettle/'
  );

  const categoryQueryRes = querySiteSearchIndex(
    publicSearchIndex,
    'parents'
  );
  assert.ok(
    categoryQueryRes.categories.length >= 1,
    'Must find matching Recipient Category'
  );

  // Title matches rank strictly above description-only matches
  const rankingTestIndex = [
    {
      id: 'product:desc-match',
      type: 'product' as const,
      title: 'Classic Linen Table Runner',
      subtitle: 'Woven Belgian flax linen',
      description: 'Pairs wonderfully with a stoneware mug during breakfast.',
      url: '/products/linen-table-runner/',
      categoryLabel: 'Tabletop',
      keywords: ['linen', 'dining'],
    },
    {
      id: 'product:title-match',
      type: 'product' as const,
      title: 'Hand-Thrown Stoneware Mug',
      subtitle: 'Speckled ceramic vessel',
      description: 'Keeps morning coffee warm.',
      url: '/products/stoneware-mug/',
      categoryLabel: 'Ceramics',
      keywords: ['ceramic', 'coffee'],
    },
  ];
  const rankingRes = querySiteSearchIndex(rankingTestIndex, 'stoneware mug');
  assert.equal(rankingRes.products.length, 2);
  assert.equal(
    rankingRes.products[0].id,
    'product:title-match',
    'Title match must rank ahead of description-only match'
  );

  // Empty query and no-results query handling
  const emptyRes = querySiteSearchIndex(publicSearchIndex, '   ');
  assert.equal(emptyRes.totalCount, 0);
  const noMatchRes = querySiteSearchIndex(
    publicSearchIndex,
    'zzzznonexistentquantumwidget999'
  );
  assert.equal(noMatchRes.totalCount, 0);

  // 6. Search Modal rendering (open state, grouped results, no-results state)
  const openModalWithResultsHtml = renderToStaticMarkup(
    <SiteSearchModal
      isOpen={true}
      onClose={() => {}}
      initialQuery="thoughtful"
      initialIndex={devSearchIndex}
    />
  );
  assert.match(openModalWithResultsHtml, /role="dialog"/);
  assert.match(
    openModalWithResultsHtml,
    /placeholder="Search gifts, guides, and stories\.\.\."/
  );
  assert.match(openModalWithResultsHtml, /Gift Guides/);
  assert.match(openModalWithResultsHtml, /Stories/);

  const openModalNoResultsHtml = renderToStaticMarkup(
    <SiteSearchModal
      isOpen={true}
      onClose={() => {}}
      initialQuery="zzzznonexistentquantumwidget999"
      initialIndex={devSearchIndex}
    />
  );
  assert.match(
    openModalNoResultsHtml,
    /No matching gifts, guides, stories, or categories found/
  );
  assert.match(openModalNoResultsHtml, /href="\/gift-finder\/"/);

  // 7. Search performance with a simulated 1,200-item catalog
  const largeIndex = [...devSearchIndex];
  for (let i = 1; i <= 1200; i++) {
    largeIndex.push({
      id: `product:perf_${i}`,
      type: 'product',
      title: `Catalog Scale Test Item ${i} ${i % 50 === 0 ? 'Matcha Whisk' : 'Ceramic Vessel'}`,
      subtitle: 'Artisanal small-batch object for daily rituals',
      description: 'Thoughtful gift for hosts, parents, and close friends.',
      url: `/products/scale-item-${i}/`,
      categoryLabel: 'Home & Kitchen',
      keywords: ['home', 'ritual', 'craft'],
      price: 45,
      currency: 'USD',
      vendor: 'Atelier Scale',
    });
  }
  const startMs = performance.now();
  const perfRes = querySiteSearchIndex(largeIndex, 'matcha whisk');
  const elapsedMs = performance.now() - startMs;
  assert.ok(perfRes.totalProducts >= 24);
  assert.equal(perfRes.products.length, 6, 'Per-group results cap at limitPerGroup (6)');
  assert.ok(
    elapsedMs < 150,
    `Search across 1,200+ items must complete rapidly (took ${elapsedMs.toFixed(2)}ms)`
  );
});



