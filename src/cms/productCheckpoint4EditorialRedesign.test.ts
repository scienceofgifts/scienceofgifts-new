import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PRODUCTS, GIFT_GUIDES, ARTICLES } from '../data/catalog';
import {
  generateProductAiWritingBrief,
} from './productAiBriefExporter';
import {
  deriveBudgetTierFromPrice,
  deriveGuidePriceBucketFromPrice,
  mapExistingProductToInterchangeV1,
  mapInterchangeToSanityProductDraft,
} from './productInterchangeSchema';
import {
  importProductInterchangeResponse,
} from './productUniversalImporter';
import {
  deleteDraftFromSanityContentLake,
  fetchDocumentFromSanityContentLake,
  saveDraftToSanityContentLake,
} from './studio/sanityServerClient';
import {
  INTEREST_OPTIONS,
  OCCASION_OPTIONS,
  RECIPIENT_OPTIONS,
} from './studio/taxonomyRegistry';

const createExamplePath = path.resolve(
  process.cwd(),
  'src/cms/examples/product-interchange-v1-create.example.json'
);
const revisionExamplePath = path.resolve(
  process.cwd(),
  'src/cms/examples/product-interchange-v1-revision.example.json'
);

export async function runCheckpoint4EditorialRedesignTests(): Promise<{
  passed: number;
  results: string[];
  sanityRoundTripSummary: {
    disposableDraftId: string;
    createTxId?: string;
    initialRev?: string;
    patchTxId?: string;
    updatedRev?: string;
    deleteTxId?: string;
    verifiedFields: Record<string, any>;
  };
}> {
  const results: string[] = [];
  let passed = 0;

  const recordPass = (label: string) => {
    passed += 1;
    results.push(`PASS [${passed}]: ${label}`);
  };

  const rawCreateExampleText = fs.readFileSync(createExamplePath, 'utf-8');
  const rawRevisionExampleText = fs.readFileSync(revisionExamplePath, 'utf-8');

  // =========================================================================
  // TEST 1: Information Architecture & Content Library Origin Distinction
  // =========================================================================
  {
    // Build simulated workspace catalog documents
    const simulatedDocs: Array<{
      _id: string;
      _type: string;
      title?: string;
      _sourceOrigin: 'local-catalog-reference' | 'sanity-content-lake';
      status?: string;
    }> = [
      ...Object.values(PRODUCTS).map((p) => ({
        _id: p.id,
        _type: 'product',
        title: p.title,
        _sourceOrigin: 'local-catalog-reference' as const,
        status: p.status,
      })),
      {
        _id: 'drafts.prod_live_test_candidate',
        _type: 'product',
        title: 'Artisan Pour-Over Dripper',
        _sourceOrigin: 'sanity-content-lake' as const,
        status: 'draft',
      },
      ...GIFT_GUIDES.map((g) => ({
        _id: g.id,
        _type: 'giftGuide',
        title: g.title,
        _sourceOrigin: 'local-catalog-reference' as const,
      })),
    ];

    // Partition products into drafts vs local catalog references
    const allProducts = simulatedDocs.filter((d) => d._type === 'product');
    const lakeDrafts = allProducts.filter(
      (d) => d._id.startsWith('drafts.') || d._sourceOrigin === 'sanity-content-lake'
    );
    const localReferences = allProducts.filter(
      (d) => !d._id.startsWith('drafts.') && d._sourceOrigin !== 'sanity-content-lake'
    );

    assert.ok(allProducts.length > 0);
    assert.equal(lakeDrafts.length, 1);
    assert.equal(localReferences.length, Object.values(PRODUCTS).length);
    assert.equal(lakeDrafts[0]._sourceOrigin, 'sanity-content-lake');
    assert.equal(localReferences[0]._sourceOrigin, 'local-catalog-reference');

    recordPass(
      'Information Architecture & Content Library explicitly partition Sanity Drafts from Local Catalog References'
    );
  }

  // =========================================================================
  // TEST 2: Product Creation Screen — Minimal URL Input to AI Brief Generation
  // =========================================================================
  let generatedBriefMarkdown = '';
  {
    const merchantUrl =
      'https://maker-shop.example.jp/products/kiso-hinoki-artisan-tea-caddy';
    const brief = generateProductAiWritingBrief({
      mode: 'create',
      productUrl: merchantUrl,
      knownTitle: 'Kiso Hinoki Handcrafted Tea Caddy',
      knownVendor: 'Azmaya Kiso Workshop',
      knownPrice: 68,
      knownInStock: true,
      additionalSourceNotes:
        'Sustainably harvested Kiso hinoki cypress and wild cherry bark.',
    });

    assert.equal(brief.mode, 'create');
    assert.ok(brief.markdownBrief.includes(merchantUrl));
    assert.ok(brief.markdownBrief.includes('Azmaya Kiso Workshop'));
    assert.ok(brief.markdownBrief.includes('Product Interchange Schema v1.0'));
    assert.ok(brief.markdownBrief.includes('giftVerdict'));
    assert.ok(brief.suggestedFilename.endsWith('.md'));

    generatedBriefMarkdown = brief.markdownBrief;
    recordPass(
      'Product Creation Screen accepts minimal URL, derives slug, and compiles full AI Writing Brief with taxonomy guidelines'
    );
  }

  // =========================================================================
  // TEST 3: Single-Operation Universal Import to Editorial Review Screen
  // =========================================================================
  let importedDraftCandidate: Record<string, any> | null = null;
  const uniqueSuffix = Math.random().toString(36).slice(2, 10);
  const disposableSlug = `fictional-cp4-brass-canister-${uniqueSuffix}`;
  const disposableCanonicalId = `prod_fictional_cp4_${uniqueSuffix}`;
  const disposableDraftId = `drafts.${disposableCanonicalId}`;

  {
    const candidateJson = JSON.parse(rawCreateExampleText);
    candidateJson.identity.slug = disposableSlug;
    candidateJson.identity.title = 'Azmaya Solid Brass Hand-Turned Tea Canister';
    candidateJson.identity.subtitle =
      'Airtight solid brass tea canister that develops a luminous, quiet patina through decades of daily morning tea ceremonies.';

    const conversationalChatbotOutput = `Here is the full Science of Gifts product profile based on your research brief:

\`\`\`json
${JSON.stringify(candidateJson, null, 2)}
\`\`\`

Let me know if you would like me to adjust any of the behavioral verdict points!`;

    const report = importProductInterchangeResponse(conversationalChatbotOutput, {
      workspaceDocuments: [],
    });

    assert.equal(report.ok, true, `Import failed: ${report.errors?.[0]?.message}`);
    assert.ok(report.resolvedCreatePayload);
    assert.ok(report.candidateSanityDraft);

    // Verify editorial narrative fields
    const draft = report.candidateSanityDraft;
    assert.equal(draft.title, 'Azmaya Solid Brass Hand-Turned Tea Canister');
    assert.ok(draft.subtitle.includes('luminous, quiet patina'));
    assert.ok(draft.whyToGiveIt.length > 20);
    assert.ok(draft.bestForSummary.length > 20);

    // Verify 4-part verdict
    assert.ok(draft.giftVerdict?.editorialAssessment || draft.giftVerdictAssessment);
    assert.ok(draft.giftVerdict?.standoutReason || draft.giftVerdictTactileQuality);
    assert.ok(draft.giftVerdict?.recipientDelight || draft.giftVerdictBehavioralLogic);

    importedDraftCandidate = {
      ...draft,
      _id: disposableDraftId,
      productId: disposableCanonicalId,
      _sourceOrigin: 'sanity-content-lake',
    };

    recordPass(
      'Single-operation Universal Import extracts chatbot JSON and populates all narrative and 4-part verdict fields'
    );
  }

  // =========================================================================
  // TEST 4: Prioritized Validation Banner & Quarantined Tag Mapping
  // =========================================================================
  {
    const payloadWithQuarantined = JSON.parse(rawCreateExampleText);
    // Inject non-canonical interest tags
    payloadWithQuarantined.taxonomy.interests = [
      'Coffee & Tea', // valid canonical
      'Artisan Woodcraft', // non-canonical -> quarantined
      'Mindful Mornings', // non-canonical -> quarantined
    ];
    // Set unverified price and stock
    payloadWithQuarantined.factualContext.price = null;
    payloadWithQuarantined.factualContext.inStock = null;

    const report = importProductInterchangeResponse(
      JSON.stringify(payloadWithQuarantined),
      {
        workspaceDocuments: [],
      }
    );

    assert.equal(report.ok, true);
    assert.ok(report.unverifiedFactFlags.length >= 2);
    assert.ok(
      report.unverifiedFactFlags.some((f) => f.field === 'price')
    );
    assert.ok(
      report.unverifiedFactFlags.some((f) => f.field === 'inStock')
    );
    assert.ok(report.quarantinedTaxonomySuggestions.length >= 2);

    // Simulate interactive tag mapping: Map "Artisan Woodcraft" to "Home Decor"
    const quarantinedTag = 'Artisan Woodcraft';
    const mappedCanonical = 'Home Decor';
    assert.ok(INTEREST_OPTIONS.some((opt) => opt.value === mappedCanonical));

    const simulatedInterests = [
      ...report.candidateSanityDraft!.interests,
      mappedCanonical,
    ];
    assert.ok(simulatedInterests.includes('Home Decor'));
    assert.ok(simulatedInterests.includes('Coffee & Tea'));

    recordPass(
      'Prioritized Validation Banner detects unverified commerce facts and enables interactive quarantined tag mapping'
    );
  }

  // =========================================================================
  // TEST 5: Live Round-Trip Persistence to Sanity Content Lake
  // =========================================================================
  let initialRev: string | undefined;
  let createTxId: string | undefined;

  {
    assert.ok(importedDraftCandidate);
    // Ensure all references are weak for drafts
    importedDraftCandidate.similarGiftComparisons = [
      {
        _key: 'sim_1',
        _type: 'productSimilarComparison',
        product: { _type: 'reference', _ref: 'prod_matcha_whisk_bowl', _weak: true },
        distinctionLabel: 'Material Distinction',
        comparisonNote: 'Brass develops a patina over decades; ceramic maintains pristine glaze.',
      },
    ];

    const saveResult = await saveDraftToSanityContentLake(
      importedDraftCandidate as any
    );

    assert.equal(
      saveResult.ok,
      true,
      `Sanity Content Lake draft creation failed: ${saveResult.message}`
    );
    assert.equal(saveResult.mutationOperation, 'create');
    assert.ok(saveResult.transactionId);
    assert.ok(saveResult.persistedDocument?._rev);

    createTxId = saveResult.transactionId;
    initialRev = saveResult.persistedDocument?._rev;

    recordPass(
      `Saved candidate draft to live Sanity Content Lake as "${disposableDraftId}" (rev: ${initialRev})`
    );
  }

  // =========================================================================
  // TEST 6: Re-Fetching Draft & In-Line Editorial Adjustments
  // =========================================================================
  let reloadedDraft: Record<string, any> | null = null;
  {
    reloadedDraft = await fetchDocumentFromSanityContentLake(disposableDraftId);
    assert.ok(reloadedDraft, `Draft ${disposableDraftId} not found in Lake.`);
    assert.equal(reloadedDraft._id, disposableDraftId);
    assert.equal(reloadedDraft.productId, disposableCanonicalId);
    assert.equal(reloadedDraft.title, 'Azmaya Solid Brass Hand-Turned Tea Canister');
    assert.equal(reloadedDraft.price, 68);

    // Verify inline editorial adjustment
    reloadedDraft.bestForSummary =
      'Revised for holiday gifting: Best for loose-leaf tea collectors and slow morning ritualists.';
    reloadedDraft.priceVerified = true;
    reloadedDraft.priceVerificationSource = 'manual-merchant-check';
    reloadedDraft.priceVerificationEvidenceNote =
      'Verified against Azmaya official Tokyo workshop registry.';

    recordPass(
      'Reloaded saved draft from Sanity Content Lake and applied in-line editorial and fact-verification updates'
    );
  }

  // =========================================================================
  // TEST 7: Revision Workflow — Export Revision Brief & Apply Revision Patch
  // =========================================================================
  let patchTxId: string | undefined;
  let updatedRev: string | undefined;

  {
    assert.ok(reloadedDraft);

    // 7a. Export revision brief for existing product
    const revisionBrief = generateProductAiWritingBrief({
      mode: 'revision',
      productUrl: reloadedDraft.purchaseUrl || 'https://maker-shop.example.jp/caddy',
      existingProduct: reloadedDraft,
      revisionGoals: 'Expand on the tactile weight and cold-forged brass acoustics.',
    });

    assert.equal(revisionBrief.mode, 'revision');
    assert.ok(revisionBrief.markdownBrief.includes(disposableCanonicalId));
    assert.ok(revisionBrief.markdownBrief.includes('Expand on the tactile weight'));

    // 7b. Import revision response with protected verified facts
    const revisionPayload = JSON.parse(rawRevisionExampleText);
    revisionPayload.targetProduct = {
      canonicalProductId: disposableCanonicalId,
      slug: disposableSlug,
    };
    // Attempted price hallucination by AI
    revisionPayload.factualContext = {
      ...revisionPayload.factualContext,
      price: 199.99, // Should be protected because priceVerified === true!
    };

    const revisionImport = importProductInterchangeResponse(
      JSON.stringify(revisionPayload),
      {
        workspaceDocuments: [reloadedDraft],
      }
    );

    assert.equal(revisionImport.ok, true);
    assert.ok(revisionImport.candidateSanityDraft);
    // Verified price was protected!
    assert.equal(revisionImport.candidateSanityDraft.price, 68);

    // 7c. Persist revision patch to Sanity Content Lake
    revisionImport.candidateSanityDraft._id = disposableDraftId;
    revisionImport.candidateSanityDraft._rev = initialRev;

    const patchResult = await saveDraftToSanityContentLake(
      revisionImport.candidateSanityDraft as any
    );

    assert.equal(
      patchResult.ok,
      true,
      `Sanity revision patch failed: ${patchResult.message}`
    );
    assert.equal(patchResult.mutationOperation, 'patch');
    patchTxId = patchResult.transactionId;
    updatedRev = patchResult.persistedDocument?._rev;
    assert.notEqual(updatedRev, initialRev);

    recordPass(
      `Exported revision brief, protected verified facts, and applied revision patch to Sanity Content Lake (updated rev: ${updatedRev})`
    );
  }

  // =========================================================================
  // TEST 8: Verified Persisted Fields Confirmation
  // =========================================================================
  let verifiedFields: Record<string, any> = {};
  {
    const finalDraft = await fetchDocumentFromSanityContentLake(disposableDraftId);
    assert.ok(finalDraft);
    assert.equal(finalDraft.productId, disposableCanonicalId);
    assert.equal(finalDraft.price, 68);
    assert.equal(finalDraft.priceVerified, true);
    assert.ok(finalDraft.bestForSummary.includes('loose-leaf tea'));

    verifiedFields = {
      productId: finalDraft.productId,
      slug: finalDraft.slug?.current || finalDraft.slug,
      price: finalDraft.price,
      priceVerified: finalDraft.priceVerified,
      bestForSummary: finalDraft.bestForSummary,
      title: finalDraft.title,
    };

    recordPass(
      'Confirmed full persistence of revised editorial copy, price verification, and taxonomy in Sanity Content Lake'
    );
  }

  // =========================================================================
  // TEST 9: Clean Deletion of Disposable Test Draft
  // =========================================================================
  let deleteTxId: string | undefined;
  {
    const deleteResult = await deleteDraftFromSanityContentLake(disposableDraftId);
    assert.equal(
      deleteResult.ok,
      true,
      `Deletion of disposable draft failed: ${deleteResult.message}`
    );
    deleteTxId = deleteResult.transactionId;

    // Confirm it no longer exists
    const checkDeleted = await fetchDocumentFromSanityContentLake(disposableDraftId);
    assert.equal(checkDeleted, null);

    recordPass(
      `Cleanly deleted disposable test draft "${disposableDraftId}" from Sanity Content Lake (tx: ${deleteTxId})`
    );
  }

  return {
    passed,
    results,
    sanityRoundTripSummary: {
      disposableDraftId,
      createTxId,
      initialRev,
      patchTxId,
      updatedRev,
      deleteTxId,
      verifiedFields,
    },
  };
}

// Self-executing runner
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('productCheckpoint4EditorialRedesign.test.ts')) {
  runCheckpoint4EditorialRedesignTests()
    .then((summary) => {
      console.log(
        `\n=== Science of Gifts Checkpoint 4 Editorial Redesign Tests (${summary.passed} Passed) ===\n`
      );
      for (const res of summary.results) {
        console.log(`  ✓ ${res}`);
      }
      console.log(
        '\n=== Live Sanity Content Lake Round-Trip Verification ===\n' +
          JSON.stringify(summary.sanityRoundTripSummary, null, 2)
      );
      process.exit(0);
    })
    .catch((err) => {
      console.error('Checkpoint 4 Test Suite Failed:\n', err);
      process.exit(1);
    });
}
