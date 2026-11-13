import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PRODUCT_FIELD_COVERAGE_MAP,
  PRODUCT_INTERCHANGE_FORMAT_ID,
  PRODUCT_INTERCHANGE_JSON_SCHEMA_V1,
  PRODUCT_INTERCHANGE_SCHEMA_VERSION,
  PRODUCT_MODEL_INCONSISTENCY_REPORT,
  applyProductInterchangeRevision,
  mapExistingProductToInterchangeV1,
  mapInterchangeToAstroProduct,
  mapInterchangeToSanityProductDraft,
  parseJsonFromChatbotResponse,
  validateAndNormalizeProductInterchange,
} from './productInterchangeSchema';
import { validateSanityDraftBeforeServerMutation } from './studio/sanityServerClient';

const createExamplePath = path.resolve(
  process.cwd(),
  'src/cms/examples/product-interchange-v1-create.example.json'
);
const revisionExamplePath = path.resolve(
  process.cwd(),
  'src/cms/examples/product-interchange-v1-revision.example.json'
);
const jsonSchemaPath = path.resolve(
  process.cwd(),
  'src/cms/schemas/product-interchange.v1.schema.json'
);

export function runProductInterchangeSchemaTests(): {
  passed: number;
  results: string[];
} {
  const results: string[] = [];
  let passed = 0;

  const recordPass = (name: string) => {
    passed += 1;
    results.push(`PASS: ${name}`);
  };

  // Test 1: Standalone JSON Schema file matches exported constant and schemaVersion 1.0
  {
    const rawSchemaFile = JSON.parse(fs.readFileSync(jsonSchemaPath, 'utf-8'));
    assert.equal(
      rawSchemaFile.properties.schemaVersion.const,
      PRODUCT_INTERCHANGE_SCHEMA_VERSION
    );
    assert.equal(rawSchemaFile.properties.format.const, PRODUCT_INTERCHANGE_FORMAT_ID);
    assert.equal(
      PRODUCT_INTERCHANGE_JSON_SCHEMA_V1.properties.schemaVersion.const,
      '1.0'
    );
    assert.ok(PRODUCT_FIELD_COVERAGE_MAP.length >= 30);
    assert.ok(PRODUCT_MODEL_INCONSISTENCY_REPORT.length >= 7);
    recordPass(
      'Standalone JSON Schema v1.0, field coverage map, and model inconsistency report are complete and synchronized'
    );
  }

  // Test 2: Validate complete New Product example ("create" mode) & map to Astro + Sanity draft
  const rawCreateJson = fs.readFileSync(createExamplePath, 'utf-8');
  const rawRevisionJson = fs.readFileSync(revisionExamplePath, 'utf-8');
  const createValidation = validateAndNormalizeProductInterchange(rawCreateJson);
  assert.equal(
    createValidation.valid,
    true,
    `Expected create example to be valid, got errors: ${JSON.stringify(
      createValidation.errors
    )}`
  );
  assert.equal(createValidation.mode, 'create');
  assert.equal(createValidation.schemaVersion, '1.0');
  assert.equal(createValidation.errors.length, 0);
  assert.ok(createValidation.normalized && createValidation.normalized.mode === 'create');

  const astroProduct = mapInterchangeToAstroProduct(createValidation.normalized);
  assert.equal(astroProduct.id, 'prod_fictional_kiso_hinoki_tea_caddy');
  assert.equal(astroProduct.slug, 'fictional-kiso-hinoki-tea-caddy');
  assert.equal(astroProduct.price, 68);
  assert.equal(astroProduct.budgetTier, '50-to-100');
  assert.equal(astroProduct.guidePriceBucket, '25-to-75');
  assert.equal(astroProduct.priceVerified, true);
  assert.equal(astroProduct.inventoryVerified, true);
  assert.equal(astroProduct.specifications?.length, 5);
  assert.equal(astroProduct.buyingConsiderationsList?.length, 3);
  assert.equal(astroProduct.occasionContextNotes?.length, 3);
  assert.equal(astroProduct.similarGiftComparisons?.length, 1);

  const sanityDraft = mapInterchangeToSanityProductDraft(createValidation.normalized);
  assert.equal(sanityDraft._id, 'drafts.prod_fictional_kiso_hinoki_tea_caddy');
  assert.equal(sanityDraft.productId, 'prod_fictional_kiso_hinoki_tea_caddy');
  assert.equal(sanityDraft.status, 'draft');
  assert.equal(sanityDraft.slug.current, 'fictional-kiso-hinoki-tea-caddy');
  assert.equal(
    sanityDraft.similarGiftComparisons[0].product._ref,
    'prod_matcha_whisk_bowl'
  );
  assert.equal(sanityDraft.citationRefs[0]._ref, 'cit_experiential_material_2016');

  // Verify the mapped Sanity draft passes server-side Sanity draft validation
  const serverDraftCheck = validateSanityDraftBeforeServerMutation(sanityDraft);
  assert.equal(
    serverDraftCheck.validForDraftSave,
    true,
    `Expected mapped Sanity draft to pass server-side validation, got: ${JSON.stringify(
      serverDraftCheck.blockingDraftErrors
    )}`
  );
  recordPass(
    'Complete fictional New Product JSON ("create" mode) validates and maps losslessly to Astro Product and Sanity draft'
  );

  // Test 3: Round-trip existing Sanity draft back to Interchange v1.0
  {
    const roundTripped = mapExistingProductToInterchangeV1(sanityDraft);
    const revalidated = validateAndNormalizeProductInterchange(roundTripped);
    assert.equal(revalidated.valid, true);
    assert.equal(
      roundTripped.targetProduct?.canonicalProductId,
      'prod_fictional_kiso_hinoki_tea_caddy'
    );
    assert.equal(roundTripped.identity.slug, 'fictional-kiso-hinoki-tea-caddy');
    assert.equal(roundTripped.factualContext.price, 68);
    assert.equal(roundTripped.relationships?.similarGiftComparisons?.length, 1);
    recordPass('Round-trip mapping from Sanity draft back to Interchange v1.0 is lossless');
  }

  // Test 4: Apply Existing Product Revision example ("revision" mode)
  {
    const revisionCheck = validateAndNormalizeProductInterchange(rawRevisionJson);
    assert.equal(
      revisionCheck.valid,
      true,
      `Expected revision example to be valid, got: ${JSON.stringify(revisionCheck.errors)}`
    );
    // Verify that the two non-canonical interest tags in the revision example were quarantined with warnings
    assert.equal(revisionCheck.quarantinedTaxonomySuggestions.length, 2);
    assert.deepEqual(
      revisionCheck.quarantinedTaxonomySuggestions.map((q) => q.rawValue),
      ['Japanese Joinery', 'Wabi-Sabi Countertop']
    );
    assert.ok(
      revisionCheck.normalized &&
        revisionCheck.normalized.mode === 'revision' &&
        !revisionCheck.normalized.taxonomy?.interests?.includes('Japanese Joinery' as any)
    );

    const mergeResult = applyProductInterchangeRevision(sanityDraft, rawRevisionJson);
    assert.equal(mergeResult.valid, true);
    assert.equal(
      mergeResult.canonicalProductId,
      'prod_fictional_kiso_hinoki_tea_caddy'
    );
    assert.equal(mergeResult.slug, 'fictional-kiso-hinoki-tea-caddy');

    // Omitted fields must be preserved
    assert.equal(mergeResult.mergedAstroProduct?.price, 68);
    assert.equal(mergeResult.mergedAstroProduct?.inStock, true);
    assert.equal(
      mergeResult.mergedAstroProduct?.purchaseUrl,
      'https://atelier-kiso-fictional-test.jp/products/hinoki-bark-tea-caddy'
    );
    assert.equal(mergeResult.mergedAstroProduct?.images.length, 1);
    assert.equal(mergeResult.mergedAstroProduct?.similarGiftComparisons?.length, 1);
    assert.equal(mergeResult.mergedAstroProduct?.specifications?.length, 5);

    // Updated fields must reflect new values
    assert.ok(
      mergeResult.mergedAstroProduct?.bestForSummary.includes('loose-leaf tea purists')
    );
    assert.ok(
      mergeResult.mergedAstroProduct?.giftVerdict?.editorialAssessment.includes(
        'Revised for winter gifting'
      )
    );
    assert.ok(mergeResult.mergedAstroProduct?.occasions.includes('anniversary'));
    assert.ok(
      mergeResult.mergedAstroProduct?.personalityTraits.includes('nostalgic-sentimental')
    );

    // Explicitly cleared fields in revisionControl.clearFields must be cleared
    assert.equal(mergeResult.mergedAstroProduct?.calloutTag, undefined);
    assert.equal(mergeResult.mergedAstroProduct?.testingNote, undefined);

    const clearedDiffs = mergeResult.fieldDiffs.filter((d) => d.action === 'cleared');
    assert.deepEqual(
      clearedDiffs.map((d) => d.fieldPath),
      ['identity.calloutTag', 'editorialProfile.testingNote']
    );

    recordPass(
      'Existing Product Revision JSON ("revision" mode) preserves canonical ID, verified facts, images, and relationships while applying partial updates, explicit clearFields, and quarantining non-canonical tags'
    );
  }

  // Test 5: Verified commerce facts are protected against accidental AI overwrite during revision
  {
    const unauthorizedFactOverwriteRevision = {
      schemaVersion: '1.0',
      format: 'science-of-gifts/product-interchange',
      mode: 'revision',
      targetProduct: {
        canonicalProductId: 'prod_fictional_kiso_hinoki_tea_caddy',
      },
      factualContext: {
        price: 199,
        inStock: false,
        sourceUrl: 'https://different-merchant.jp/products/other-link',
      },
    };

    const mergeResult = applyProductInterchangeRevision(
      sanityDraft,
      unauthorizedFactOverwriteRevision
    );
    assert.equal(mergeResult.valid, true);
    // Verified facts must remain untouched because allowOverwriteVerifiedFacts defaults to false
    assert.equal(mergeResult.mergedAstroProduct?.price, 68);
    assert.equal(mergeResult.mergedAstroProduct?.inStock, true);
    assert.equal(
      mergeResult.mergedAstroProduct?.purchaseUrl,
      'https://atelier-kiso-fictional-test.jp/products/hinoki-bark-tea-caddy'
    );
    const blockedDiffs = mergeResult.fieldDiffs.filter(
      (d) => d.action === 'blocked_verified_fact'
    );
    assert.equal(blockedDiffs.length, 3);
    assert.ok(
      mergeResult.warnings.some((w) => w.code === 'VERIFIED_FACT_OVERWRITE_BLOCKED')
    );
    recordPass(
      'Verified commerce facts (price, inStock, sourceUrl) are protected against accidental AI overwrite when allowOverwriteVerifiedFacts is false'
    );
  }

  // Test 6: Unverified / null price and stock from chatbot are flagged and locked to verified=false
  {
    const clonedCreate = JSON.parse(rawCreateJson);
    clonedCreate.factualContext.price = null;
    clonedCreate.factualContext.inStock = null;
    // Simulate a chatbot mistakenly claiming verified=true while leaving price/inStock null
    clonedCreate.factualContext.priceVerification = {
      verified: true,
      source: 'retailer_live_check',
    };
    clonedCreate.factualContext.inventoryVerification = {
      verified: true,
      source: 'retailer_live_check',
    };

    const check = validateAndNormalizeProductInterchange(clonedCreate);
    assert.equal(check.valid, true);
    assert.ok(check.normalized && check.normalized.mode === 'create');
    assert.equal(check.normalized.factualContext.price, null);
    assert.equal(check.normalized.factualContext.priceVerification.verified, false);
    assert.equal(check.normalized.factualContext.priceVerification.source, 'unverified');
    assert.equal(check.normalized.factualContext.inventoryVerification.verified, false);
    assert.equal(
      check.normalized.factualContext.inventoryVerification.source,
      'unverified'
    );
    assert.ok(check.unverifiedFactFlags.some((f) => f.field === 'price'));
    assert.ok(check.unverifiedFactFlags.some((f) => f.field === 'inStock'));

    const mappedAstro = mapInterchangeToAstroProduct(check.normalized);
    assert.equal(mappedAstro.priceVerified, false);
    assert.equal(mappedAstro.inventoryVerified, false);
    recordPass(
      'Null/unknown price and stock values are safely accepted without hallucination and locked to verified=false with unverifiedFactFlags'
    );
  }

  // Test 7: Reject incompatible schemaVersion, invalid taxonomy values, placeholder URLs, and self-references
  {
    const badPayload = JSON.parse(rawCreateJson);
    badPayload.schemaVersion = '2.0';
    badPayload.identity.productType = 'Luxury Watches & Jewelry';
    badPayload.taxonomy.recipients = ['boss', 'neighbor'];
    badPayload.factualContext.sourceUrl = 'https://example.com/placeholder-link';
    badPayload.relationships.similarGiftComparisons = [
      {
        productId: 'prod_fictional_kiso_hinoki_tea_caddy',
        comparisonAngle: 'Self comparison should fail',
        summary: 'A product should never compare against its own canonical ID.',
      },
    ];

    const check = validateAndNormalizeProductInterchange(badPayload);
    assert.equal(check.valid, false);
    const codes = new Set(check.errors.map((e) => e.code));
    assert.ok(codes.has('UNSUPPORTED_SCHEMA_VERSION'));
    assert.ok(codes.has('INVALID_CONTROLLED_TAXONOMY'));
    assert.ok(codes.has('PLACEHOLDER_URL_FORBIDDEN'));
    assert.ok(codes.has('SELF_REFERENCE_FORBIDDEN'));
    recordPass(
      'Validator rejects incompatible schemaVersion, unapproved controlled taxonomy, placeholder URLs, and self-references'
    );
  }

  // Test 8: Extract fenced JSON block from conversational chatbot output
  {
    const chatbotWrappedResponse = `Here is the completed Science of Gifts product profile in the canonical v1.0 format:\n\n\`\`\`json\n${rawRevisionJson}\n\`\`\`\n\nLet me know if you'd like any adjustments!`;
    const parsedWrap = parseJsonFromChatbotResponse(chatbotWrappedResponse);
    assert.equal(parsedWrap.error, null);
    const check = validateAndNormalizeProductInterchange(chatbotWrappedResponse);
    assert.equal(check.valid, true);
    assert.equal(check.mode, 'revision');
    recordPass(
      'Chatbot response parser cleanly extracts and validates fenced ```json blocks surrounded by conversational text'
    );
  }

  return { passed, results };
}

// Allow direct CLI execution via `node --import tsx src/cms/productInterchangeSchema.test.ts`
const isDirectExecution =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.endsWith('productInterchangeSchema.test.ts');

if (isDirectExecution) {
  const outcome = runProductInterchangeSchemaTests();
  console.log(`\n=== Science of Gifts Checkpoint 2 Schema & Mapper Tests (${outcome.passed} passed) ===`);
  for (const line of outcome.results) {
    console.log(`  ✓ ${line}`);
  }
}
