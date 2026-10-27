import test from 'node:test';
import assert from 'node:assert/strict';
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
import { SANITY_SCHEMA_TYPES, GROQ_QUERIES } from '../cms/sanitySchemas';
import { LocalCMSContentStore } from '../cms/cmsContentStore';
import { contentRepository } from '../cms/contentRepository';
import {
  buildSuggestedProductDraftFromInput,
  runSafeProductImportPipeline,
  validateProductDraftForPublish,
} from '../cms/productDraftValidator';
import {
  buildArticleJsonLd,
  buildGiftGuideJsonLd,
  buildProductJsonLd,
} from './seoAndValidation';

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

test('6. ArticleReaderView applies the refined citation section palette (#FAF8F3 page, #FFFFFF reference cards, #D9DFE2 borders, #1B3D5F/#294B68/#405B70 text, #E5F5EE mint accents)', () => {
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

  // Page background (#FAF8F3) and mint "The Short Version" summary panel preserved
  assert.match(html, /bg-\[#FAF8F3\]/);
  assert.match(html, /id="the-short-version"[^>]*class="[^"]*bg-\[#E8F8F0\]/);

  // "In This Story" contents panel uses #F5F4F0 with subtle border
  assert.match(
    html,
    /aria-label="Table of contents"\s+class="[^"]*bg-\[#F5F4F0\]\s+border\s+border-\[#1B3D5F\]\/10/
  );

  // Reference cards use #FFFFFF background and #D9DFE2 border
  assert.match(
    html,
    /id="ref-cit_flynn_adams_2009"\s+class="[^"]*bg-\[#FFFFFF\]\s+border\s+border-\[#D9DFE2\]/
  );

  // Selected occurrence control uses #1B3D5F with #FFFFFF text; unselected uses #E5F5EE with #1B3D5F text
  assert.match(html, /bg-\[#1B3D5F\]\s+text-\[#FFFFFF\]/);
  assert.match(html, /bg-\[#E5F5EE\]\s+text-\[#1B3D5F\]/);
  assert.match(html, /text-\[#294B68\]/);
  assert.match(html, /text-\[#405B70\]/);
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
    ['Headings (#1B3D5F) on Page (#FAF8F3)', '#1B3D5F', '#FAF8F3'],
    ['Body text (#294B68) on Page (#FAF8F3)', '#294B68', '#FAF8F3'],
    ['Secondary text (#405B70) on Page (#FAF8F3)', '#405B70', '#FAF8F3'],
    ['Headings (#1B3D5F) on Reference Card (#FFFFFF)', '#1B3D5F', '#FFFFFF'],
    ['Body text (#294B68) on Reference Card (#FFFFFF)', '#294B68', '#FFFFFF'],
    ['Secondary text (#405B70) on Reference Card (#FFFFFF)', '#405B70', '#FFFFFF'],
    ['Primary text (#1B3D5F) on Soft Mint (#E5F5EE)', '#1B3D5F', '#E5F5EE'],
    ['Body text (#294B68) on Soft Mint (#E5F5EE)', '#294B68', '#E5F5EE'],
    ['Secondary text (#405B70) on Soft Mint (#E5F5EE)', '#405B70', '#E5F5EE'],
    ['Selected control text (#FFFFFF) on Selected Control (#1B3D5F)', '#FFFFFF', '#1B3D5F'],
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
    ['Citation badge border (#405B70) on Card (#FFFFFF)', '#405B70', '#FFFFFF'],
    ['Selected control fill (#1B3D5F) on Card (#FFFFFF)', '#1B3D5F', '#FFFFFF'],
    ['Highlighted card border/ring (#1B3D5F) on Page (#FAF8F3)', '#1B3D5F', '#FAF8F3'],
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
    'https://scienceofgifts.com/articles/why-daily-ritual-objects-build-closer-bonds'
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

  const productJsonLd = buildProductJsonLd(product);
  assert.equal(productJsonLd['@graph'][1]['@type'], 'Product');
  assert.equal(
    productJsonLd['@graph'][1]['@id'],
    'https://scienceofgifts.com/products/hand-blown-two-tone-bedside-water-carafe-and-glass/'
  );
  assert.equal(productJsonLd['@graph'][1].offers.price, 48);
  assert.equal(productJsonLd['@graph'][1].offers.priceCurrency, 'USD');
});

