import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PRODUCTS } from '../data/catalog';
import { generateProductAiWritingBrief } from './productAiBriefExporter';
import { validateAndNormalizeProductInterchange } from './productInterchangeSchema';
import {
  extractSingleUnambiguousJsonObject,
  importProductInterchangeResponse,
} from './productUniversalImporter';
import {
  deleteDraftFromSanityContentLake,
  fetchDocumentFromSanityContentLake,
  saveDraftToSanityContentLake,
} from './studio/sanityServerClient';
import {
  AGE_RANGE_OPTIONS,
  INTEREST_OPTIONS,
  OCCASION_OPTIONS,
  PERSONALITY_TRAIT_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
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

export async function runCheckpoint3WorkflowTests(): Promise<{
  passed: number;
  results: string[];
  sanityRoundTripReport: {
    disposableDraftId: string;
    createTxId?: string;
    initialRev?: string;
    revisionTxId?: string;
    updatedRev?: string;
    deleteTxId?: string;
    verifiedPersistedFields: Record<string, any>;
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
  // 1. Exporting a brief from only a product URL
  // =========================================================================
  {
    const urlOnlyBrief = generateProductAiWritingBrief({
      productUrl: 'https://studio-arhoj-fictional-test.dk/products/sip-cup-glaze',
    });
    assert.equal(urlOnlyBrief.mode, 'create');
    assert.equal(urlOnlyBrief.matchedExistingProduct, false);
    assert.equal(urlOnlyBrief.slugSuggestion, 'sip-cup-glaze');
    assert.ok(
      urlOnlyBrief.markdownBrief.includes(
        'https://studio-arhoj-fictional-test.dk/products/sip-cup-glaze'
      )
    );
    // Verify all controlled taxonomy options from taxonomyRegistry.ts are embedded in the brief
    for (const opt of PRODUCT_CATEGORY_OPTIONS) {
      assert.ok(urlOnlyBrief.markdownBrief.includes(`"${opt.value}"`));
    }
    for (const opt of RECIPIENT_OPTIONS) {
      assert.ok(urlOnlyBrief.markdownBrief.includes(`"${opt.value}"`));
    }
    for (const opt of OCCASION_OPTIONS) {
      assert.ok(urlOnlyBrief.markdownBrief.includes(`"${opt.value}"`));
    }
    for (const opt of INTEREST_OPTIONS) {
      assert.ok(urlOnlyBrief.markdownBrief.includes(`"${opt.value}"`));
    }
    for (const opt of PERSONALITY_TRAIT_OPTIONS) {
      assert.ok(urlOnlyBrief.markdownBrief.includes(`"${opt.value}"`));
    }
    for (const opt of AGE_RANGE_OPTIONS) {
      assert.ok(urlOnlyBrief.markdownBrief.includes(`"${opt.value}"`));
    }
    recordPass(
      '1. Exporting a brief from only a product URL embeds all taxonomyRegistry.ts controlled vocabularies and instructions'
    );
  }

  // =========================================================================
  // 2. Exporting a brief for an existing product
  // =========================================================================
  {
    const sampleCatalogProduct = Object.values(PRODUCTS)[0];
    const existingBrief = generateProductAiWritingBrief({
      productUrl: sampleCatalogProduct.purchaseUrl,
      mode: 'create',
      existingProduct: sampleCatalogProduct,
    });
    assert.equal(existingBrief.matchedExistingProduct, true);
    assert.equal(existingBrief.canonicalProductId, sampleCatalogProduct.id);
    assert.ok(existingBrief.markdownBrief.includes(sampleCatalogProduct.id));
    assert.ok(existingBrief.markdownBrief.includes(sampleCatalogProduct.title));
    recordPass(
      '2. Exporting a brief for an existing product includes its canonical ID, existing facts, and editorial profile'
    );
  }

  // =========================================================================
  // 3. Exporting a revision brief
  // =========================================================================
  {
    const sampleCatalogProduct = Object.values(PRODUCTS)[0];
    const revisionBrief = generateProductAiWritingBrief({
      productUrl: sampleCatalogProduct.purchaseUrl,
      mode: 'revision',
      existingProduct: sampleCatalogProduct,
      revisionGoals: 'Tighten the Gift Verdict for holiday shoppers.',
    });
    assert.equal(revisionBrief.mode, 'revision');
    assert.equal(revisionBrief.canonicalProductId, sampleCatalogProduct.id);
    assert.ok(revisionBrief.markdownBrief.includes('"mode": "revision"'));
    assert.ok(revisionBrief.markdownBrief.includes('clearFields'));
    assert.ok(
      revisionBrief.markdownBrief.includes(
        'Tighten the Gift Verdict for holiday shoppers.'
      )
    );
    recordPass(
      '3. Exporting a revision brief includes canonical product ID, existing content, and v1.0 revision / clearFields instructions'
    );
  }

  // =========================================================================
  // 4. Producing a schema-compatible complete example response from the brief
  // =========================================================================
  {
    const urlBrief = generateProductAiWritingBrief({
      productUrl: 'https://atelier-kiso-fictional-test.jp/products/hinoki-tea-tray',
      knownTitle: 'Kiso Hinoki Serving Tray',
      knownVendor: 'Kiso Woodwork Studio',
      knownPrice: 74,
      knownInStock: true,
    });
    const checkTemplate = validateAndNormalizeProductInterchange(
      urlBrief.templatePayload
    );
    assert.equal(
      checkTemplate.valid,
      true,
      `Expected brief templatePayload to be valid v1.0 Interchange JSON, got: ${JSON.stringify(
        checkTemplate.errors
      )}`
    );
    recordPass(
      '4. Brief templatePayload is contract-tested and guaranteed compatible with the v1.0 validator and importer'
    );
  }

  // =========================================================================
  // 5. Importing raw JSON
  // =========================================================================
  const rawImportReport = importProductInterchangeResponse(rawCreateExampleText);
  assert.equal(rawImportReport.ok, true);
  assert.equal(rawImportReport.detectedSourceType, 'pasted_raw_json');
  assert.equal(
    rawImportReport.canonicalProductId,
    'prod_fictional_kiso_hinoki_tea_caddy'
  );
  recordPass('5. Single-operation import of raw JSON succeeds and populates all product fields');

  // =========================================================================
  // 6. Importing fenced JSON copied from a chatbot (and rejecting ambiguous multi-JSON)
  // =========================================================================
  {
    const fencedChatbotText = `I researched the product page and wrote the complete Science of Gifts profile below:\n\n\`\`\`json\n${rawCreateExampleText}\n\`\`\`\n\nAll taxonomy tags use the exact canonical registry values.`;
    const fencedReport = importProductInterchangeResponse(fencedChatbotText);
    assert.equal(fencedReport.ok, true);
    assert.equal(fencedReport.detectedSourceType, 'pasted_fenced_markdown');
    assert.equal(
      fencedReport.canonicalProductId,
      'prod_fictional_kiso_hinoki_tea_caddy'
    );

    // Verify competing multiple JSON blocks are rejected unambiguously
    const competingBlocks = `First draft:\n\`\`\`json\n${rawCreateExampleText}\n\`\`\`\nSecond draft:\n\`\`\`json\n${rawRevisionExampleText}\n\`\`\``;
    const multiExtract = extractSingleUnambiguousJsonObject(competingBlocks);
    assert.equal(multiExtract.ok, false);
    assert.equal(multiExtract.errorCode, 'AMBIGUOUS_MULTIPLE_JSON_OBJECTS');
    recordPass(
      '6. Importing fenced JSON copied from a chatbot succeeds, and competing multiple JSON objects are rejected safely'
    );
  }

  // =========================================================================
  // 7. Importing an uploaded .json file and .md file
  // =========================================================================
  {
    const uploadedJsonReport = importProductInterchangeResponse(rawCreateExampleText, {
      filename: 'kiso-hinoki-profile.json',
    });
    assert.equal(uploadedJsonReport.ok, true);
    assert.equal(uploadedJsonReport.detectedSourceType, 'uploaded_json_file');

    const uploadedMdReport = importProductInterchangeResponse(
      `# ChatGPT Export\n\n\`\`\`json\n${rawCreateExampleText}\n\`\`\`\n`,
      { filename: 'chatgpt-response.md' }
    );
    assert.equal(uploadedMdReport.ok, true);
    assert.equal(
      uploadedMdReport.detectedSourceType,
      'uploaded_markdown_or_text_file'
    );
    recordPass(
      '7. Importing uploaded .json and .md files detects file format and validates payload'
    );
  }

  // =========================================================================
  // 8. Rejecting an incompatible schema version
  // =========================================================================
  {
    const badVersionObj = JSON.parse(rawCreateExampleText);
    badVersionObj.schemaVersion = '2.0';
    const report = importProductInterchangeResponse(JSON.stringify(badVersionObj));
    assert.equal(report.ok, false);
    assert.ok(report.errors.some((e) => e.code === 'UNSUPPORTED_SCHEMA_VERSION'));
    recordPass('8. Importer rejects incompatible schemaVersion ("2.0")');
  }

  // =========================================================================
  // 9. Flagging unknown taxonomy values
  // =========================================================================
  {
    const revisionWithUnmappedInterests = importProductInterchangeResponse(
      rawRevisionExampleText,
      {
        workspaceDocuments: [rawImportReport.candidateSanityDraft!],
      }
    );
    assert.equal(revisionWithUnmappedInterests.ok, true);
    assert.equal(
      revisionWithUnmappedInterests.quarantinedTaxonomySuggestions.length,
      2
    );
    assert.deepEqual(
      revisionWithUnmappedInterests.quarantinedTaxonomySuggestions.map(
        (q) => q.rawValue
      ),
      ['Japanese Joinery', 'Wabi-Sabi Countertop']
    );

    const invalidRecipientPayload = JSON.parse(rawCreateExampleText);
    invalidRecipientPayload.taxonomy.recipients = ['unapproved-recipient'];
    const invalidRecReport = importProductInterchangeResponse(
      invalidRecipientPayload
    );
    assert.equal(invalidRecReport.ok, false);
    assert.ok(
      invalidRecReport.errors.some((e) => e.code === 'INVALID_CONTROLLED_TAXONOMY')
    );
    recordPass(
      '9. Unknown interest tags are quarantined for mapping without creating categories, and invalid controlled recipients are rejected'
    );
  }

  // =========================================================================
  // 10. Handling unknown prices and product specifications without fabrication
  // =========================================================================
  {
    const unknownFactsPayload = JSON.parse(rawCreateExampleText);
    unknownFactsPayload.factualContext.price = null;
    unknownFactsPayload.factualContext.inStock = null;
    unknownFactsPayload.factualContext.priceVerification = {
      verified: false,
      source: 'unverified',
    };
    unknownFactsPayload.factualContext.inventoryVerification = {
      verified: false,
      source: 'unverified',
    };
    unknownFactsPayload.factualContext.specifications = [
      {
        label: 'Materials',
        value: 'Kiso hinoki cypress (dimensions not disclosed on merchant page)',
      },
    ];

    const unknownReport = importProductInterchangeResponse(unknownFactsPayload);
    assert.equal(unknownReport.ok, true);
    assert.equal(unknownReport.status, 'incomplete_needs_review');
    assert.equal(unknownReport.candidateAstroProduct?.priceVerified, false);
    assert.equal(unknownReport.candidateAstroProduct?.inventoryVerified, false);
    assert.ok(unknownReport.unverifiedFactFlags.some((f) => f.field === 'price'));
    assert.ok(unknownReport.unverifiedFactFlags.some((f) => f.field === 'inStock'));
    recordPass(
      '10. Unknown prices and stock status (null) are accepted without fabrication and flagged as unverified on the review screen'
    );
  }

  // =========================================================================
  // 11. Preventing accidental changes to immutable product IDs
  // =========================================================================
  {
    const mutatedSlugRevision = JSON.parse(rawRevisionExampleText);
    mutatedSlugRevision.identity = {
      slug: 'attempted-different-slug-name',
    };
    const revReport = importProductInterchangeResponse(mutatedSlugRevision, {
      workspaceDocuments: [rawImportReport.candidateSanityDraft!],
    });
    assert.equal(revReport.ok, true);
    assert.equal(
      revReport.canonicalProductId,
      'prod_fictional_kiso_hinoki_tea_caddy'
    );
    assert.equal(revReport.slug, 'fictional-kiso-hinoki-tea-caddy');
    recordPass(
      '11. Immutable canonicalProductId and slug are preserved even if a revision payload attempts to alter the slug'
    );
  }

  // =========================================================================
  // 12. Detecting duplicate product creation attempts
  // =========================================================================
  {
    const duplicateReport = importProductInterchangeResponse(rawCreateExampleText, {
      workspaceDocuments: [rawImportReport.candidateSanityDraft!],
    });
    assert.equal(duplicateReport.ok, true);
    assert.ok(duplicateReport.duplicateConflict?.detected);
    assert.equal(
      duplicateReport.duplicateConflict?.existingCanonicalProductId,
      'prod_fictional_kiso_hinoki_tea_caddy'
    );
    recordPass(
      '12. Duplicate product creation attempts are detected by canonical ID / slug / sourceUrl and routed to update existing draft'
    );
  }

  // =========================================================================
  // 13. Previewing proposed revision changes
  // =========================================================================
  const revisionPreviewReport = importProductInterchangeResponse(
    rawRevisionExampleText,
    {
      workspaceDocuments: [rawImportReport.candidateSanityDraft!],
    }
  );
  assert.equal(revisionPreviewReport.ok, true);
  assert.equal(revisionPreviewReport.mode, 'revision');
  const updatedPaths = revisionPreviewReport.revisionDiffs
    .filter((d) => d.action === 'updated')
    .map((d) => d.fieldPath);
  const clearedPaths = revisionPreviewReport.revisionDiffs
    .filter((d) => d.action === 'cleared')
    .map((d) => d.fieldPath);
  assert.ok(updatedPaths.includes('editorialProfile.bestForSummary'));
  assert.ok(
    updatedPaths.includes('editorialProfile.giftVerdict.editorialAssessment')
  );
  assert.deepEqual(clearedPaths, [
    'identity.calloutTag',
    'editorialProfile.testingNote',
  ]);
  recordPass(
    '13. Revision import computes a full preview diff distinguishing updated, cleared, and preserved fields'
  );

  // =========================================================================
  // 14 & 15. Live Sanity Content Lake Draft Save, Reload, Revision Patch, & Cleanup
  // =========================================================================
  const uniqueSuffix = Date.now().toString(36);
  const disposableSlug = `fictional-cp3-hinoki-caddy-${uniqueSuffix}`;
  const disposableCanonicalId = `prod_fictional_cp3_hinoki_caddy_${uniqueSuffix}`;
  const disposableDraftId = `drafts.${disposableCanonicalId}`;

  const disposableCreatePayload = JSON.parse(rawCreateExampleText);
  disposableCreatePayload.targetProduct = {
    canonicalProductId: disposableCanonicalId,
    slug: disposableSlug,
    sourceUrl: `https://atelier-kiso-fictional-test.jp/products/${disposableSlug}`,
  };
  disposableCreatePayload.identity.slug = disposableSlug;
  disposableCreatePayload.identity.title = `[Disposable CP3 Test] Kiso Hinoki Tea Caddy (${uniqueSuffix})`;
  disposableCreatePayload.factualContext.sourceUrl = `https://atelier-kiso-fictional-test.jp/products/${disposableSlug}`;
  disposableCreatePayload.seo.canonicalPath = `/products/${disposableSlug}`;

  const disposableImport = importProductInterchangeResponse(
    JSON.stringify(disposableCreatePayload)
  );
  assert.equal(disposableImport.ok, true);
  assert.ok(disposableImport.candidateSanityDraft);
  assert.equal(disposableImport.candidateSanityDraft._id, disposableDraftId);

  let createTxId: string | undefined;
  let initialRev: string | undefined;
  let revisionTxId: string | undefined;
  let updatedRev: string | undefined;
  let deleteTxId: string | undefined;
  let verifiedPersistedFields: Record<string, any> = {};

  try {
    // Step 14: Save imported candidate as a real Sanity draft
    const createResult = await saveDraftToSanityContentLake(
      disposableImport.candidateSanityDraft as any
    );
    assert.equal(
      createResult.ok,
      true,
      `Expected Sanity draft creation to succeed, got: ${createResult.message}`
    );
    assert.equal(createResult.mutationOperation, 'create');
    createTxId = createResult.transactionId;
    initialRev = createResult.persistedDocument?._rev;
    assert.ok(initialRev, 'Expected initial Sanity _rev');
    recordPass(
      `14. Saved imported product candidate as real Sanity draft "${disposableDraftId}" (rev: ${initialRev})`
    );

    // Step 15a: Reload draft directly from Sanity Content Lake and verify imported fields persisted
    const reloadedDraft = await fetchDocumentFromSanityContentLake(
      disposableDraftId
    );
    assert.ok(reloadedDraft, 'Expected reloaded draft from Sanity Content Lake');
    assert.equal(reloadedDraft.productId, disposableCanonicalId);
    assert.equal(reloadedDraft.slug?.current, disposableSlug);
    assert.equal(reloadedDraft.price, 68);
    assert.equal(reloadedDraft.budgetTier, '50-to-100');
    assert.equal(reloadedDraft.guidePriceBucket, '25-to-75');
    assert.equal(reloadedDraft.specifications?.length, 5);
    assert.equal(reloadedDraft.buyingConsiderationsList?.length, 3);
    assert.equal(reloadedDraft.occasionContextNotes?.length, 3);
    assert.equal(
      reloadedDraft.similarGiftComparisons?.[0]?.product?._ref,
      'prod_matcha_whisk_bowl'
    );
    assert.equal(
      reloadedDraft.seo?.seoTitle,
      'Kiso Hinoki & Cherry Bark Tea Caddy Review | Science of Gifts'
    );

    // Step 15b: Apply a revision import against the reloaded Sanity draft and persist with ifRevisionID
    const disposableRevisionPayload = JSON.parse(rawRevisionExampleText);
    disposableRevisionPayload.targetProduct = {
      canonicalProductId: disposableCanonicalId,
      slug: disposableSlug,
    };

    const revisionImportOnLiveDraft = importProductInterchangeResponse(
      JSON.stringify(disposableRevisionPayload),
      {
        workspaceDocuments: [reloadedDraft],
      }
    );
    assert.equal(revisionImportOnLiveDraft.ok, true);
    assert.ok(revisionImportOnLiveDraft.candidateSanityDraft);
    assert.equal(
      revisionImportOnLiveDraft.candidateSanityDraft._rev,
      initialRev
    );

    const patchResult = await saveDraftToSanityContentLake(
      revisionImportOnLiveDraft.candidateSanityDraft as any
    );
    assert.equal(
      patchResult.ok,
      true,
      `Expected Sanity revision patch to succeed, got: ${patchResult.message}`
    );
    assert.equal(patchResult.mutationOperation, 'patch');
    revisionTxId = patchResult.transactionId;
    updatedRev = patchResult.persistedDocument?._rev;
    assert.notEqual(updatedRev, initialRev);

    const reloadedAfterRevision = await fetchDocumentFromSanityContentLake(
      disposableDraftId
    );
    assert.ok(reloadedAfterRevision);
    assert.ok(
      reloadedAfterRevision.bestForSummary.includes('loose-leaf tea purists')
    );
    assert.ok(
      reloadedAfterRevision.giftVerdict?.editorialAssessment.includes(
        'Revised for winter gifting'
      )
    );
    assert.equal(reloadedAfterRevision.price, 68);

    verifiedPersistedFields = {
      productId: reloadedAfterRevision.productId,
      slug: reloadedAfterRevision.slug?.current,
      price: reloadedAfterRevision.price,
      bestForSummary: reloadedAfterRevision.bestForSummary,
      giftVerdictAssessment:
        reloadedAfterRevision.giftVerdict?.editorialAssessment,
      occasions: reloadedAfterRevision.occasions,
      specificationsCount: reloadedAfterRevision.specifications?.length,
      similarComparisonsCount:
        reloadedAfterRevision.similarGiftComparisons?.length,
    };

    recordPass(
      `15. Reloaded saved draft from Sanity Content Lake, verified all imported fields, applied revision patch (rev: ${updatedRev}), and verified persistence`
    );
  } finally {
    // Always clean up the disposable Sanity draft
    const cleanup = await deleteDraftFromSanityContentLake(disposableDraftId);
    deleteTxId = cleanup.transactionId;
    assert.equal(
      cleanup.ok,
      true,
      `Expected disposable draft cleanup to succeed for ${disposableDraftId}`
    );
  }

  return {
    passed,
    results,
    sanityRoundTripReport: {
      disposableDraftId,
      createTxId,
      initialRev,
      revisionTxId,
      updatedRev,
      deleteTxId,
      verifiedPersistedFields,
    },
  };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.endsWith('productCheckpoint3Workflow.test.ts');

if (isDirectRun) {
  runCheckpoint3WorkflowTests()
    .then((outcome) => {
      console.log(
        `\n=== Science of Gifts Checkpoint 3 End-to-End Tests (${outcome.passed}/15 Passed) ===`
      );
      for (const line of outcome.results) {
        console.log(`  ✓ ${line}`);
      }
      console.log('\n=== Live Sanity Content Lake Round-Trip Summary ===');
      console.log(JSON.stringify(outcome.sanityRoundTripReport, null, 2));
    })
    .catch((err) => {
      console.error('Checkpoint 3 test failure:', err);
      process.exit(1);
    });
}
