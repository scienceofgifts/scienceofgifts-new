import assert from 'node:assert/strict';
import {
  generateProductAiWritingBrief,
  isPlaceholderUrlOrLink,
} from './productAiBriefExporter';
import {
  applyProductInterchangeRevision,
  deriveCanonicalProductIdFromSlug,
  validateAndNormalizeProductInterchange,
  validateProductPublicationReadiness,
  ProductInterchangeCreatePayloadV1,
  ProductInterchangeRevisionPayloadV1,
} from './productInterchangeSchema';
import { importProductInterchangeResponse } from './productUniversalImporter';
import {
  INTEREST_OPTIONS,
  MERCHANDISE_TYPE_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  normalizeProductCategory,
  normalizeTaxonomyInterestTag,
} from './studio/taxonomyRegistry';
import { PRODUCTS } from '../data/catalog';

export function runProductTaxonomyAndBriefExporterTests(): {
  passed: number;
  results: string[];
} {
  const results: string[] = [];
  let passed = 0;

  const recordPass = (name: string) => {
    passed += 1;
    results.push(`PASS: ${name}`);
    console.log(`  ✓ PASS [${passed}]: ${name}`);
  };

  console.log('\n=== Science of Gifts: Taxonomy & AI Writing Brief Verification ===\n');

  // =========================================================================
  // WORKFLOW A: Fourthwall Merchandise Product (Psychology Hoodie)
  // =========================================================================
  {
    const hoodieUrl = 'https://scienceofgifts.fourthwall.com/products/cognitive-bias-heavyweight-pullover-hoodie';
    const brief = generateProductAiWritingBrief({
      productUrl: hoodieUrl,
      knownTitle: 'Cognitive Bias Heavyweight Pullover Hoodie',
      knownVendor: 'Science of Gifts Studio',
      commerceProvider: 'fourthwall',
      purchaseDestinationUrl: hoodieUrl,
      knownPrice: 78,
      knownInStock: true,
      additionalSourceNotes: '100% combed organic cotton fleece (400 GSM). Features subtle typographic debossing of 12 foundational cognitive biases on the interior lining.',
    });

    assert.equal(brief.mode, 'create');
    assert.equal(brief.matchedExistingProduct, false);
    assert.equal(brief.slugSuggestion, 'cognitive-bias-heavyweight-pullover-hoodie');
    assert.equal(brief.canonicalProductId, null);
    assert.equal(brief.templatePayload.targetProduct?.canonicalProductId, 'prod_cognitive_bias_heavyweight_pullover_hoodie');

    // Verify brief markdown contains exactly ONE ```json code block
    const jsonBlockMatches = brief.markdownBrief.match(/```json[\s\S]*?```/g);
    assert.ok(jsonBlockMatches, 'Brief must contain a JSON output code block');
    assert.equal(jsonBlockMatches.length, 1, 'Brief must contain EXACTLY ONE JSON code block');

    // Verify Section 1, 2, 3, 4 structure
    assert.ok(brief.markdownBrief.includes('## 1. Product Source Facts & Research Audit'));
    assert.ok(brief.markdownBrief.includes('## 2. Editorial Writing Assignment (Writer-First Guidance)'));
    assert.ok(brief.markdownBrief.includes('## 3. Classification & SEO Instructions'));
    assert.ok(brief.markdownBrief.includes('## 4. Exact JSON Output Requirements'));

    // Verify dual-axis merchandise classification guidance
    assert.ok(brief.markdownBrief.includes('Apparel & Wearables'));
    assert.ok(brief.markdownBrief.includes('Hoodie'));
    assert.ok(brief.markdownBrief.includes('Psychology & Human Behavior'));

    // Verify writer-first anti-cliché guidance
    assert.ok(brief.markdownBrief.includes('Never use "the perfect gift for anyone"'));
    assert.ok(brief.markdownBrief.includes('Do not claim "we tested this in our studio kitchen"'));

    // Construct realistic chatbot response conforming to brief
    const simulatedChatbotResponse = {
      schemaVersion: '1.0',
      format: 'science-of-gifts/product-interchange',
      mode: 'create',
      targetProduct: {
        canonicalProductId: 'prod_cognitive_bias_heavyweight_pullover_hoodie',
        slug: 'cognitive-bias-heavyweight-pullover-hoodie',
        sourceUrl: hoodieUrl,
      },
      factualContext: {
        sourceUrl: hoodieUrl,
        vendor: 'Science of Gifts Studio',
        price: 78,
        currency: 'USD',
        inStock: true,
        commerceProvider: 'fourthwall',
        fulfillmentClassification: 'fourthwall_merch',
        fourthwallUrl: hoodieUrl,
        priceVerification: {
          verified: true,
          source: 'fourthwall_api',
          verifiedAt: '2026-11-12T12:00:00Z',
          evidenceNote: 'Verified directly against Fourthwall commerce dashboard.',
        },
        inventoryVerification: {
          verified: true,
          source: 'fourthwall_stock_feed',
          verifiedAt: '2026-11-12T12:00:00Z',
        },
        specifications: [
          { label: 'Material', value: '400 GSM 100% organic ring-spun combed cotton fleece' },
          { label: 'Origin', value: 'Milled in Portugal; printed in Brooklyn, NY' },
          { label: 'Care', value: 'Machine wash cold inside-out; line dry or tumble dry low' },
        ],
      },
      identity: {
        title: 'The Cognitive Bias Heavyweight Pullover',
        slug: 'cognitive-bias-heavyweight-pullover-hoodie',
        subtitle: 'Substantial 400 GSM combed cotton fleece with interior debossed heuristic taxonomy',
        productType: 'Apparel & Wearables',
        merchandiseType: 'Hoodie',
        calloutTag: 'Editorial Merchandise',
      },
      editorialProfile: {
        whyToGiveIt:
          'A remarkably substantial heavyweight fleece that treats behavioral science with design restraint, making it an affectionate inside gesture for psychologists, data scientists, and keen observers of human quirkiness.',
        bestForSummary:
          'Best for psychologists, behavioral economists, and lovers of heavy Portuguese fleece.',
        detailsAndCare:
          'Custom 400 GSM French terry with double-needle flatlock stitching, rib side gussets, and interior pocket taxonomy debossing.',
        giftVerdict: {
          editorialAssessment:
            'A quiet triumph of merchandise design: thick, comforting Portuguese fleece that rewards close inspection rather than broadcasting loud branding.',
          standoutReason:
            'Rather than a loud front graphic, the twelve cognitive heuristics are debossed inside the kangaroo pocket lining as a tactile reminder.',
          recipientDelight:
            'The sheer physical heft of the 400 GSM terry when first pulling it over the head on chilly mornings.',
          importantCaveat:
            'Cut slightly boxy in the chest; size down for recipients who prefer a tailored modern silhouette.',
        },
        idealRecipientProfile: {
          headline: 'The Behavioral Thinker Who Appreciates Substantial Fleece',
          narrative:
            'The friend who quotes Daniel Kahneman at dinner, observes everyday decision traps with warmth, and refuses to wear flimsy fast-fashion sweatshirts.',
          lifestyleNotes: [
            'Spends cold Sunday mornings with dense non-fiction and freshly ground black coffee',
            'Prefers subtle conceptual design over overt branded merchandise',
          ],
          relationshipFit: [
            'Close friend or sibling working in behavioral research, product design, or software',
            'College graduation or milestone promotion gift',
          ],
        },
        extendedGiftRationale: [
          'Most thematic apparel feels cheap and disposable after two cycles through the wash. Here, the Portuguese cotton mill produces a dense weave that holds its shape through years of heavy rotation.',
          'Giving clothing is inherently high-stakes; giving a piece with tactile luxury and an intellectual wink communicates that you understand both their mind and their standard of comfort.',
        ],
        buyingConsiderations: [
          { label: 'Fabric Weight', detail: 'At 400 GSM, this is an authentic heavyweight winter layer suited for cool weather.' },
          { label: 'Lead Time', detail: 'Custom fulfillment through Fourthwall takes approximately 5–7 business days to ship.' },
        ],
        occasionContextNotes: [
          { occasion: 'birthday', label: 'Milestone Celebration', note: 'Pairs beautifully with a hardcover behavioral economics title.' },
          { occasion: 'holidays', label: 'Winter Warmth', note: 'An immediate favorite for lounging through late December holiday downtime.' },
        ],
        editorialRating: 4.9,
      },
      taxonomy: {
        recipients: ['friend', 'partner'],
        occasions: ['birthday', 'holidays'],
        interests: ['Psychology & Human Behavior', 'Cognitive Science & Neuroscience'],
        personalityTraits: ['curious-creative', 'cozy-homebody'],
        ageRanges: ['young-adult', 'adult'],
      },
      media: {
        images: [
          {
            id: 'img_cognitive_bias_hoodie_01',
            url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=2400&q=85',
            alt: 'Cognitive bias heavyweight pullover hoodie on natural wood hanger',
            fitMode: 'cover',
            fallbackColor: '#F2EFEB',
            focalPoint: { x: 0.5, y: 0.5 },
          },
        ],
      },
      seo: {
        seoTitle: 'The Cognitive Bias Heavyweight Pullover | Science of Gifts',
        metaDescription:
          'Heavyweight 400 GSM Portuguese organic cotton fleece celebrating behavioral science and human heuristics.',
        canonicalPath: '/products/cognitive-bias-heavyweight-pullover-hoodie',
        indexing: 'index,follow',
      },
    };

    // Import into Studio
    const report = importProductInterchangeResponse(simulatedChatbotResponse);
    assert.equal(report.ok, true, `Import failed: ${report.errors.map((e) => e.message).join('; ')}`);
    assert.equal(report.resolvedCreatePayload?.identity.productType, 'Apparel & Wearables');
    assert.equal(report.resolvedCreatePayload?.identity.merchandiseType, 'Hoodie');
    assert.deepEqual(report.resolvedCreatePayload?.taxonomy.interests, [
      'Psychology & Human Behavior',
      'Cognitive Science & Neuroscience',
    ]);
    assert.equal(report.candidateSanityDraft?.vendor, 'Science of Gifts Studio');
    assert.equal(report.candidateSanityDraft?.price, 78);
    assert.equal(report.candidateSanityDraft?.priceVerified, true);

    // Verify publication readiness
    const pubCheck = validateProductPublicationReadiness(report.resolvedCreatePayload!);
    assert.equal(pubCheck.ready, true, `Expected ready for publication, got blockers: ${JSON.stringify(pubCheck.blockers)}`);

    recordPass('Workflow A: Fourthwall merchandise hoodie exported, classified by psychology taxonomy, imported, and validated');
  }

  // =========================================================================
  // WORKFLOW B: Niche-Interest Product (Roman History Mug)
  // =========================================================================
  {
    const mugUrl = 'https://artisanhistory.shop/products/aqueduct-of-claudius-ceramic-mug';
    const brief = generateProductAiWritingBrief({
      productUrl: mugUrl,
      knownTitle: 'Aqueduct of Claudius 15oz Ceramic Mug',
      knownVendor: 'Artisan Antiquities',
      knownPrice: 34,
      knownInStock: true,
      additionalSourceNotes: 'Stoneware mug with hand-carved Roman aqueduct arcade relief and unglazed terracotta wash base.',
    });

    // Verify brief instructions accommodate dual-axis classification
    assert.ok(brief.markdownBrief.includes('Drinkware & Mugs'));
    assert.ok(brief.markdownBrief.includes('Ceramic Mug'));
    assert.ok(brief.markdownBrief.includes('History & Antiquity'));

    // Only one JSON block in brief
    const jsonBlocks = brief.markdownBrief.match(/```json[\s\S]*?```/g);
    assert.equal(jsonBlocks?.length, 1);

    const simulatedMugPayload = {
      schemaVersion: '1.0',
      format: 'science-of-gifts/product-interchange',
      mode: 'create',
      targetProduct: {
        canonicalProductId: 'prod_aqueduct_of_claudius_ceramic_mug',
        slug: 'aqueduct-of-claudius-ceramic-mug',
        sourceUrl: mugUrl,
      },
      factualContext: {
        sourceUrl: mugUrl,
        vendor: 'Artisan Antiquities',
        price: 34,
        currency: 'USD',
        inStock: true,
        commerceProvider: 'affiliate',
        fulfillmentClassification: 'affiliate_redirect',
        priceVerification: {
          verified: true,
          source: 'retailer_live_check',
          verifiedAt: '2026-11-12T12:00:00Z',
          evidenceNote: 'Checked live on artisan merchant store.',
        },
        inventoryVerification: {
          verified: true,
          source: 'retailer_live_check',
          verifiedAt: '2026-11-12T12:00:00Z',
        },
        specifications: [
          { label: 'Capacity', value: '15 fluid ounces (440 ml)' },
          { label: 'Material', value: 'High-fire stoneware with unglazed terracotta slip foot' },
          { label: 'Care', value: 'Dishwasher and microwave safe' },
        ],
      },
      identity: {
        title: 'Aqueduct of Claudius Stoneware Mug',
        slug: 'aqueduct-of-claudius-ceramic-mug',
        subtitle: 'Hand-thrown 15oz stoneware with dimensional arcade arches and mineral terracotta wash',
        productType: 'Drinkware & Mugs',
        merchandiseType: 'Ceramic Mug',
        calloutTag: 'Antiquity Craft',
      },
      editorialProfile: {
        whyToGiveIt:
          'A quietly magnificent daily vessel that translates Roman monumental civil engineering into a tactile morning ritual, making it an irresistible gesture for ancient history enthusiasts and espresso lovers alike.',
        bestForSummary:
          'Best for classical history buffs, civil engineers, and morning coffee ritualists.',
        detailsAndCare:
          'Wheel-thrown dense stoneware with deeply carved arcade arches and an ergonomic thumb-rest handle.',
        giftVerdict: {
          editorialAssessment:
            'Remarkably satisfying in hand: substantial thermal mass that keeps pour-overs piping hot through an hour of long-form reading.',
          standoutReason:
            'The carved arcade relief aligns with architectural elevations of Rome’s Aqua Claudia, offering authentic historical texture without tourist kitsch.',
          recipientDelight:
            'The warm contrast between the satin eggshell glaze rim and the textured terracotta slip foot.',
          importantCaveat:
            'Weighs a substantial 490 grams empty; best suited for sit-down morning contemplation rather than active commuting.',
        },
        idealRecipientProfile: {
          headline: 'The Classical History Enthusiast Who Re-Reads The Gallic Wars',
          narrative:
            'The friend who plans vacations around aqueduct ruins, appreciates classical architecture, and starts every morning with fifteen unhurried minutes of espresso.',
          lifestyleNotes: [
            'Bookshelves filled with Mary Beard, Tom Holland, and Penguin Classics paperbacks',
            'Favors heavyweight ceramic objects that hold heat and feel grounded',
          ],
          relationshipFit: [
            'History nerd friend or colleague birthday',
            'Thoughtful holiday gift for a parent fascinated by antiquity',
          ],
        },
        extendedGiftRationale: [
          'History lovers are inundated with cheaply printed graphic mugs that fade after three dishwasher runs. This piece is different: real ceramic craft with dimensional stoneware carvings.',
          'Drinking from a vessel that honors Roman hydraulic mastery adds a quiet layer of intellectual pleasure to an ordinary morning coffee.',
        ],
        buyingConsiderations: [
          { label: 'Thermal Retention', detail: 'Heavy stoneware walls retain heat significantly longer than standard porcelain.' },
        ],
        occasionContextNotes: [
          { occasion: 'birthday', label: 'Enthusiast Birthday', note: 'Pairs naturally with a bag of single-origin beans.' },
        ],
        editorialRating: 4.8,
      },
      taxonomy: {
        recipients: ['friend', 'parent', 'coworker'],
        occasions: ['birthday', 'holidays', 'thank-you'],
        interests: ['History & Antiquity', 'Coffee & Tea'],
        personalityTraits: ['curious-creative', 'everyday-ritual'],
        ageRanges: ['young-adult', 'adult', 'parents-grandparents'],
      },
      media: {
        images: [
          {
            id: 'img_aqueduct_mug_01',
            url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=2400&q=85',
            alt: 'Aqueduct of Claudius ceramic mug on rustic oak desk next to open history monograph',
            fitMode: 'cover',
            fallbackColor: '#F7F3EE',
            focalPoint: { x: 0.5, y: 0.5 },
          },
        ],
      },
      seo: {
        seoTitle: 'Aqueduct of Claudius Stoneware Mug | Science of Gifts',
        metaDescription:
          'Hand-thrown 15oz stoneware mug celebrating classical Roman aqueduct engineering and morning coffee rituals.',
        canonicalPath: '/products/aqueduct-of-claudius-ceramic-mug',
        indexing: 'index,follow',
      },
    };

    const report = importProductInterchangeResponse(simulatedMugPayload);
    assert.equal(report.ok, true);
    assert.equal(report.resolvedCreatePayload?.identity.productType, 'Drinkware & Mugs');
    assert.equal(report.resolvedCreatePayload?.identity.merchandiseType, 'Ceramic Mug');
    assert.deepEqual(report.resolvedCreatePayload?.taxonomy.interests, [
      'History & Antiquity',
      'Coffee & Tea',
    ]);
    assert.equal(report.candidateSanityDraft?.price, 34);

    const pubCheck = validateProductPublicationReadiness(report.resolvedCreatePayload!);
    assert.equal(pubCheck.ready, true);

    recordPass('Workflow B: Roman history ceramic mug dual-axis classified as Drinkware & Mugs + History & Antiquity and validated');
  }

  // =========================================================================
  // WORKFLOW C: Controlled Revision of an Existing Sample Product
  // =========================================================================
  {
    const existingSample = Object.values(PRODUCTS)[0];
    assert.ok(existingSample, 'Sample catalog product must exist');

    const revisionBrief = generateProductAiWritingBrief({
      productUrl: existingSample.purchaseUrl,
      mode: 'revision',
      revisionGoals: 'Update bestForSummary and giftVerdict for anniversary gifting; clear calloutTag; do not alter price or slug.',
      existingProduct: existingSample,
    });

    assert.equal(revisionBrief.mode, 'revision');
    assert.equal(revisionBrief.matchedExistingProduct, true);
    assert.equal(revisionBrief.canonicalProductId, existingSample.id);
    assert.equal(revisionBrief.slugSuggestion, existingSample.slug);

    // CRITICAL: The revision brief MUST contain EXACTLY ONE ```json block (the revision template)
    // and must NOT dump an entire create payload block
    const jsonBlocks = revisionBrief.markdownBrief.match(/```json[\s\S]*?```/g);
    assert.ok(jsonBlocks, 'Revision brief must contain output JSON');
    assert.equal(jsonBlocks.length, 1, 'Revision brief must contain EXACTLY ONE JSON block');

    // Verify existing content is present as read-only Markdown context
    assert.ok(revisionBrief.markdownBrief.includes('### Current Editorial Content in CMS (Read-Only Context)'));
    assert.ok(revisionBrief.markdownBrief.includes(existingSample.title));

    // Verify the output template in Section 4 is mode: revision
    assert.equal(revisionBrief.templatePayload.mode, 'revision');
    assert.equal(
      (revisionBrief.templatePayload as ProductInterchangeRevisionPayloadV1).targetProduct.canonicalProductId,
      existingSample.id
    );

    // Apply simulated revision response
    const simulatedRevisionPayload: ProductInterchangeRevisionPayloadV1 = {
      schemaVersion: '1.0',
      format: 'science-of-gifts/product-interchange',
      mode: 'revision',
      targetProduct: {
        canonicalProductId: existingSample.id,
        slug: existingSample.slug,
      },
      revisionControl: {
        clearFields: ['identity.calloutTag'],
        allowOverwriteVerifiedFacts: false,
        revisionNotes: 'Sharpened for anniversary gifting, cleared callout tag, verified facts preserved.',
      },
      editorialProfile: {
        bestForSummary: 'Best for partners celebrating milestone anniversaries who cherish tactile, unhurried morning rituals.',
        giftVerdict: {
          editorialAssessment: 'A serene candlelight ritual that elevates ordinary evenings into a warm shared moment between partners.',
          standoutReason: 'Arrives with its own speckled stoneware pebble holder rather than requiring separate candlesticks.',
          recipientDelight: 'Pure natural apiary beeswax flame with faint wild honey aroma.',
          importantCaveat: 'Open flame; keep clear of curious pets or open windows.',
        },
      },
      taxonomy: {
        occasions: ['anniversary', 'birthday', 'housewarming'],
      },
    };

    const mergeResult = applyProductInterchangeRevision(existingSample, simulatedRevisionPayload);
    assert.equal(mergeResult.valid, true);
    assert.equal(mergeResult.canonicalProductId, existingSample.id);
    assert.equal(mergeResult.slug, existingSample.slug);

    // Verified price ($18) and vendor MUST be preserved
    assert.equal(mergeResult.mergedInterchange?.factualContext.price, existingSample.price);
    assert.equal(mergeResult.mergedInterchange?.factualContext.vendor, existingSample.vendor);

    // Updated fields applied
    assert.equal(
      mergeResult.mergedInterchange?.editorialProfile.bestForSummary,
      'Best for partners celebrating milestone anniversaries who cherish tactile, unhurried morning rituals.'
    );
    assert.ok(mergeResult.mergedInterchange?.taxonomy.occasions.includes('anniversary'));

    // Cleared field
    assert.equal(mergeResult.mergedInterchange?.identity.calloutTag, null);

    recordPass('Workflow C: Controlled revision brief contains exactly 1 JSON block, presents read-only context, and preserves verified facts');
  }

  // =========================================================================
  // WORKFLOW D: Placeholder URL & Draft vs. Publication Validation
  // =========================================================================
  {
    const placeholderUrl = 'https://example.com/mock-gift-item';
    assert.equal(isPlaceholderUrlOrLink(placeholderUrl), true);

    const placeholderBrief = generateProductAiWritingBrief({
      productUrl: placeholderUrl,
      knownTitle: 'Illustrative Draft Desk Organizer',
    });

    // Check that brief prominently flags placeholder URL
    assert.ok(placeholderBrief.markdownBrief.includes('PLACEHOLDER SOURCE URL DETECTED'));
    assert.ok(placeholderBrief.markdownBrief.includes('illustrative placeholder'));

    // Draft payload with missing price (null), missing stock (null), and empty images ([])
    const incompleteDraftPayload: ProductInterchangeCreatePayloadV1 = {
      schemaVersion: '1.0',
      format: 'science-of-gifts/product-interchange',
      mode: 'create',
      targetProduct: {
        canonicalProductId: 'prod_illustrative_draft_desk_organizer',
        slug: 'illustrative-draft-desk-organizer',
      },
      factualContext: {
        sourceUrl: null, // unresolved source URL explicitly marked null
        vendor: null, // unresolved vendor explicitly marked null
        price: null, // unknown price
        currency: 'USD',
        inStock: null, // unknown stock
        commerceProvider: 'direct',
        fulfillmentClassification: 'direct_editorial',
        priceVerification: {
          verified: false,
          source: 'unverified',
          verifiedAt: null,
          evidenceNote: null,
        },
        inventoryVerification: {
          verified: false,
          source: 'unverified',
          verifiedAt: null,
        },
        specifications: [
          { label: 'Material', value: 'Walnut wood' },
        ],
      },
      identity: {
        title: 'Illustrative Draft Desk Organizer',
        slug: 'illustrative-draft-desk-organizer',
        subtitle: 'Preliminary editorial draft exploring solid walnut desk architecture',
        productType: 'Stationery & Desk',
        merchandiseType: 'Desk Accessory',
      },
      editorialProfile: {
        whyToGiveIt:
          'A quiet desktop upgrade that brings order and material warmth to creative workspaces, elevating daily desk routines.',
        bestForSummary: 'Best for remote professionals and writers seeking desk calm.',
        detailsAndCare: 'Solid American walnut with matte food-safe oil finish.',
        giftVerdict: {
          editorialAssessment: 'A handsome, substantial tray system that cleans up workspace clutter without cold industrial steel.',
          standoutReason: 'Carved pencil wells and hidden cable routing channels.',
          recipientDelight: 'The smooth, silky oiled wood grain under fingertips.',
          importantCaveat: 'Requires 18 inches of clear desktop depth.',
        },
        idealRecipientProfile: {
          headline: 'The Dedicated Writer or Designer',
          narrative: 'A focused creative who appreciates warm, organized work surfaces.',
          lifestyleNotes: ['Values analog stationery alongside modern computing'],
          relationshipFit: ['Coworker or partner thank you'],
        },
        extendedGiftRationale: ['A desk accessory is given to make everyday work hours more pleasant and ordered.'],
        buyingConsiderations: [{ label: 'Dimensions', detail: '18 x 6 inches overall desktop footprint' }],
        occasionContextNotes: [{ occasion: 'housewarming', label: 'Home Office', note: 'Great for new home offices and desk setups.' }],
      },
      taxonomy: {
        recipients: ['friend', 'coworker'],
        occasions: ['housewarming', 'thank-you'],
        interests: ['Journaling & Reading', 'Cozy Sanctuary'],
        personalityTraits: ['curious-creative', 'everyday-ritual'],
        ageRanges: ['adult'],
      },
      media: {
        images: [], // EMPTY IMAGES ALLOWED IN DRAFTS
      },
      seo: {
        seoTitle: 'Illustrative Draft Desk Organizer | Science of Gifts',
        metaDescription: 'Preliminary editorial review of solid walnut desk accessories.',
        canonicalPath: '/products/illustrative-draft-desk-organizer',
        indexing: 'noindex,follow',
      },
    };

    // 1. Verify DRAFT validation succeeds with warnings and unverified flags
    const draftValidation = validateAndNormalizeProductInterchange(incompleteDraftPayload);
    assert.equal(draftValidation.valid, true, `Draft should be valid: ${JSON.stringify(draftValidation.errors)}`);
    assert.ok(draftValidation.warnings.some((w) => w.path.includes('media.images')));
    assert.ok(draftValidation.unverifiedFactFlags.some((f) => f.field === 'price'));
    assert.ok(draftValidation.unverifiedFactFlags.some((f) => f.field === 'inStock'));

    // 2. Verify PUBLICATION readiness validator STRICTLY blocks live publishing
    const pubCheck = validateProductPublicationReadiness(incompleteDraftPayload);
    assert.equal(pubCheck.ready, false, 'Incomplete draft must NOT be ready for publication');
    assert.ok(pubCheck.blockers.some((b) => b.field === 'purchaseUrl'), 'Must block placeholder URL');
    assert.ok(pubCheck.blockers.some((b) => b.field === 'price'), 'Must block null price');
    assert.ok(pubCheck.blockers.some((b) => b.field === 'images'), 'Must block empty image collection');

    recordPass('Workflow D: Placeholder URLs detected, draft allows unresolved facts/empty images, and publication validator strictly blocks incomplete drafts');
  }

  // =========================================================================
  // WORKFLOW E: Controlled Taxonomy Registry Completeness & Aliases
  // =========================================================================
  {
    assert.ok(PRODUCT_CATEGORY_OPTIONS.length >= 13, 'Must contain core + expanded categories');
    assert.ok(MERCHANDISE_TYPE_OPTIONS.length >= 20, 'Must contain merchandise type forms');
    assert.ok(INTEREST_OPTIONS.length >= 30, 'Must contain expanded interests');

    // Check normalization aliases
    assert.equal(normalizeProductCategory('Hoodies & Sweatshirts'), 'Apparel & Wearables');
    assert.equal(normalizeProductCategory('Mugs & Glassware'), 'Drinkware & Mugs');
    assert.equal(normalizeProductCategory('Journals & Notebooks'), 'Stationery & Desk');
    assert.equal(normalizeProductCategory('Framed Art Prints'), 'Prints & Wall Art');

    assert.equal(normalizeTaxonomyInterestTag('Roman History'), 'History & Antiquity');
    assert.equal(normalizeTaxonomyInterestTag('Behavioral Economics'), 'Behavioral Economics');
    assert.equal(normalizeTaxonomyInterestTag('Cinema & Directing'), 'Filmmaking & Cinema');
    assert.equal(normalizeTaxonomyInterestTag('Astronomy & Cosmos'), 'Astronomy & Space');

    recordPass('Workflow E: Controlled taxonomy registry covers merchandise forms and intelligent category normalization');
  }

  console.log(`\n=== All ${passed} Taxonomy & AI Writing Brief Tests Passed Successfully! ===\n`);
  return { passed, results };
}

// Auto-run when executed directly via tsx
runProductTaxonomyAndBriefExporterTests();
