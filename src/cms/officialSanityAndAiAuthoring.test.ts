import test from 'node:test';
import assert from 'node:assert/strict';
import { createSchema } from 'sanity';
import officialSanityStudioConfig from '../../sanity.config';
import {
  OFFICIAL_SANITY_DOCUMENT_SCHEMAS,
  OFFICIAL_SANITY_OBJECT_SCHEMAS,
  OFFICIAL_SANITY_STUDIO_TYPES,
  verifySchemaRegistryIntegrity,
} from './studio/schemas';
import { buildOfficialSanitySchemaTypes } from './studio/officialSanitySchemaAdapter';
import {
  DEFAULT_PRODUCT_AI_WRITING_PROFILE,
  ensureDefaultAiWritingProfileInSanity,
  ensureEvaluationHoodieCopyInSanity,
  EVALUATION_HOODIE_DRAFT_ID,
  generateCompleteProductProposal,
  generateProductEditorialCopy,
  generateProductSupportingFields,
  listAiWritingProfilesFromSanity,
  polishProductEditorialCopy,
  saveAiWritingProfileToSanity,
} from './studio/productAiAuthoringService';
import { extractProductDetailsFromUrl } from './studio/productUrlExtractor';
import { generateProductAiWritingBrief } from './productAiBriefExporter';
import { importProductInterchangeResponse } from './productUniversalImporter';
import {
  deleteDraftFromSanityContentLake,
  fetchDocumentFromSanityContentLake,
  publishProductDraftInSanityContentLake,
  saveDraftToSanityContentLake,
  unpublishProductInSanityContentLake,
} from './studio/sanityServerClient';
import { loadPublishedSanityProducts } from './sanityPublishedLoader';
import { contentRepository } from './contentRepository';

const REAL_HOODIE_ID = 'prod_emotional_support_psychology_major_hoodie';
const REAL_HOODIE_EXPECTED_REV = 'ycvOVHWviMYg6a2p9ui9av';

test('1 & 2. Official Sanity Studio schema compilation, 10 document types (with aiWritingProfile), and Evaluation Hoodie Copy parity without modifying real Hoodie', async () => {
  // 1. Verify official Sanity schema registry integrity
  const integrity = verifySchemaRegistryIntegrity(OFFICIAL_SANITY_STUDIO_TYPES);
  assert.equal(integrity.valid, true, JSON.stringify(integrity, null, 2));
  assert.equal(integrity.documentCount, 10);
  assert.equal(integrity.objectCount, 44);
  assert.equal(integrity.totalTypesCount, 54);

  // 2. Compile with official Sanity v6 `createSchema`
  const officialTypes = buildOfficialSanitySchemaTypes();
  const compiledSchema = createSchema({
    name: 'science-of-gifts-official-test',
    types: officialTypes,
  });
  assert.equal(
    Array.isArray((compiledSchema as any)._validation)
      ? (compiledSchema as any)._validation.length
      : 0,
    0,
    'Official Sanity createSchema must compile with 0 validation problems'
  );
  assert.ok(compiledSchema.get('product'));
  assert.ok(compiledSchema.get('aiWritingProfile'));
  assert.equal(officialSanityStudioConfig.name, 'science-of-gifts-studio');

  // 3. Ensure Evaluation Copy of Emotional Support Psychology Major Hoodie exists in Sanity
  const hoodieCopyRes = await ensureEvaluationHoodieCopyInSanity();
  assert.equal(hoodieCopyRes.ok, true, hoodieCopyRes.message);
  assert.equal(hoodieCopyRes.originalHoodieRev, REAL_HOODIE_EXPECTED_REV);
  assert.ok(hoodieCopyRes.evaluationCopy);
  assert.equal(hoodieCopyRes.evaluationCopy?._id, EVALUATION_HOODIE_DRAFT_ID);
  assert.ok(
    hoodieCopyRes.evaluationCopy?.giftVerdict?.editorialAssessment?.length > 30,
    'Evaluation hoodie copy must preserve 4-part giftVerdict'
  );
  assert.ok(
    hoodieCopyRes.evaluationCopy?.idealRecipientProfile?.headline?.length > 5,
    'Evaluation hoodie copy must preserve idealRecipientProfile'
  );
  assert.ok(
    Array.isArray(hoodieCopyRes.evaluationCopy?.extendedGiftRationale) &&
      hoodieCopyRes.evaluationCopy.extendedGiftRationale.length >= 2,
    'Evaluation hoodie copy must preserve extendedGiftRationale paragraphs'
  );
  assert.ok(
    Array.isArray(hoodieCopyRes.evaluationCopy?.buyingConsiderationsList) &&
      hoodieCopyRes.evaluationCopy.buyingConsiderationsList.length >= 2,
    'Evaluation hoodie copy must preserve buyingConsiderationsList'
  );
  assert.ok(
    Array.isArray(hoodieCopyRes.evaluationCopy?.occasionContextNotes) &&
      hoodieCopyRes.evaluationCopy.occasionContextNotes.length >= 2,
    'Evaluation hoodie copy must preserve occasionContextNotes'
  );
  assert.equal(
    hoodieCopyRes.evaluationCopy?.images?.[0]?.asset?.asset?._ref,
    'image-bbb9ea3ebd97773c9fbcb86c1a1574acd232d7e9-1122x1402-png',
    'Evaluation hoodie copy must preserve the Sanity image asset reference'
  );
});

test('3. Fetch Product Details retrieves real product information from URL while keeping unconfirmed facts unverified', async () => {
  const url =
    'https://shop.scienceofgifts.com/products/emotional-support-psychology-major-hoodie';
  const extracted = await extractProductDetailsFromUrl(url);
  if (!extracted.ok) {
    assert.fail(extracted.message);
  }
  assert.equal(
    extracted.title,
    'Emotional Support Psychology Major Hoodie'
  );
  assert.equal(extracted.vendor, 'Science of Gifts');
  assert.equal(extracted.price, 39.9);
  assert.equal(extracted.currency, 'USD');
  assert.equal(extracted.inStock, true);
  assert.equal(extracted.priceVerified, false);
  assert.equal(extracted.inventoryVerified, false);
  assert.ok(extracted.images.length >= 1);
  assert.ok((extracted.description || '').length >= 20);
  assert.ok(
    extracted.unverifiedFields.length > 0,
    'Auto-extracted price and stock must be flagged as unverified until editor confirmation'
  );
});

test('4 & 9. AI Writing Profile CRUD in Sanity Content Lake and integration with Export AI Writing Brief & Import Structured AI Response', async () => {
  const defaultProfile = await ensureDefaultAiWritingProfileInSanity();
  assert.equal(
    defaultProfile.profileId,
    'ai_profile_science_of_gifts_product_editorial'
  );

  // Edit the profile in Sanity with a distinctive marker instruction
  const customMarker =
    'CUSTOM_PROFILE_VERIFICATION_MARKER: Emphasize tactile warmth and campus library study rituals.';
  const updatedRes = await saveAiWritingProfileToSanity({
    ...defaultProfile,
    additionalCustomInstructions: customMarker,
  });
  assert.equal(updatedRes.ok, true, updatedRes.message);
  assert.equal(
    updatedRes.savedProfile.additionalCustomInstructions,
    customMarker
  );

  const allProfiles = await listAiWritingProfilesFromSanity();
  const loadedProfile = allProfiles.find(
    (p) => p.profileId === 'ai_profile_science_of_gifts_product_editorial'
  );
  assert.ok(loadedProfile);
  assert.equal(loadedProfile?.additionalCustomInstructions, customMarker);

  // Verify Export AI Writing Brief incorporates the edited Sanity AI Writing Profile
  const brief = generateProductAiWritingBrief({
    productUrl:
      'https://shop.scienceofgifts.com/products/emotional-support-psychology-major-hoodie',
    mode: 'create',
    knownTitle: 'Emotional Support Psychology Major Hoodie',
    writingProfile: loadedProfile,
  });
  assert.equal(
    brief.writingProfileUsed.profileId,
    'ai_profile_science_of_gifts_product_editorial'
  );
  assert.ok(
    brief.markdownBrief.includes(customMarker),
    'Exported AI Writing Brief must include the updated custom instruction from the Sanity AI Writing Profile'
  );

  // Verify Import Structured AI Response (Optional Tool) validates and applies cleanly
  const importValidation = importProductInterchangeResponse(
    JSON.stringify(brief.templatePayload)
  );
  assert.equal(
    importValidation.ok,
    true,
    JSON.stringify(importValidation.errors)
  );
  assert.ok(importValidation.candidateSanityDraft);
  assert.equal(importValidation.candidateSanityDraft?._type, 'product');

  // Restore clean default profile instructions
  await saveAiWritingProfileToSanity(DEFAULT_PRODUCT_AI_WRITING_PROFILE);
});

test('5, 6, 7 & 8. Live Gemini AI Authoring: Supporting Fields, Editorial Copy, Complete Product, and Editorial Polish & Regeneration', async () => {
  const sampleUrl =
    'https://shop.scienceofgifts.com/products/emotional-support-psychology-major-hoodie';
  const retrieved = await extractProductDetailsFromUrl(sampleUrl);
  if (!retrieved.ok) {
    assert.fail(retrieved.message);
  }

  const initialShellDoc: Record<string, any> = {
    _id: 'drafts.prod_ai_authoring_test_shell',
    _type: 'product',
    productId: 'prod_ai_authoring_test_shell',
    title: retrieved.title || 'Emotional Support Psychology Major Hoodie',
    purchaseUrl: sampleUrl,
    status: 'draft',
  };

  // Action 2: Generate Supporting Fields (single bulk operation)
  const supportingRes = await generateProductSupportingFields({
    productUrl: sampleUrl,
    retrievedDetails: retrieved,
    currentDocument: initialShellDoc,
  });
  assert.equal(supportingRes.ok, true, supportingRes.message);
  assert.ok(supportingRes.proposedSupportingFields.title.length >= 5);
  assert.equal(
    supportingRes.proposedSupportingFields.productType,
    'Apparel & Wearables'
  );
  assert.ok(supportingRes.proposedSupportingFields.subtitle.length >= 15);
  assert.ok(supportingRes.proposedSupportingFields.bestForSummary.length >= 15);
  assert.ok(supportingRes.proposedSupportingFields.detailsAndCare.length >= 15);
  assert.ok(supportingRes.proposedSupportingFields.recipients.length >= 1);
  assert.ok(supportingRes.proposedSupportingFields.occasions.length >= 1);
  assert.ok(supportingRes.proposedSupportingFields.interests.length >= 1);
  assert.ok(supportingRes.proposedSupportingFields.seo?.seoTitle?.length >= 15);
  assert.equal(
    supportingRes.proposedSupportingFields.priceVerified,
    false,
    'Unconfirmed extracted price must remain priceVerified: false'
  );
  assert.equal(
    supportingRes.validationIssues.filter((i) => i.level === 'error').length,
    0,
    `Supporting fields must pass schema validation: ${JSON.stringify(
      supportingRes.validationIssues
    )}`
  );

  // Action 3: Generate Editorial Copy (coherent central angle)
  const docWithSupporting = {
    ...initialShellDoc,
    ...supportingRes.proposedSupportingFields,
  };
  const editorialRes = await generateProductEditorialCopy({
    productUrl: sampleUrl,
    retrievedDetails: retrieved,
    currentDocument: docWithSupporting,
  });
  assert.equal(editorialRes.ok, true, editorialRes.message);
  assert.ok(
    editorialRes.centralObservation.length >= 25,
    'Must formulate a central editorial observation'
  );
  assert.ok(editorialRes.proposedEditorialFields.whyToGiveIt.length >= 50);
  assert.ok(
    editorialRes.proposedEditorialFields.giftVerdict.editorialAssessment
      .length >= 40
  );
  assert.ok(
    editorialRes.proposedEditorialFields.giftVerdict.standoutReason.length >= 25
  );
  assert.ok(
    editorialRes.proposedEditorialFields.giftVerdict.recipientDelight.length >=
      25
  );
  assert.ok(
    editorialRes.proposedEditorialFields.giftVerdict.importantCaveat.length >=
      20
  );
  assert.ok(
    editorialRes.proposedEditorialFields.idealRecipientProfile.headline.length >=
      8
  );
  assert.ok(
    editorialRes.proposedEditorialFields.extendedGiftRationale.length >= 2
  );
  assert.ok(
    editorialRes.proposedEditorialFields.buyingConsiderationsList.length >= 2
  );
  assert.ok(
    editorialRes.proposedEditorialFields.occasionContextNotes.length >= 2
  );
  assert.equal(
    editorialRes.validationIssues.filter((i) => i.level === 'error').length,
    0,
    `Editorial copy must pass schema validation: ${JSON.stringify(
      editorialRes.validationIssues
    )}`
  );

  // Action 8: Review and Improve with AI (targeted polish & rejection safety)
  const docWithEditorial = {
    ...docWithSupporting,
    ...editorialRes.proposedEditorialFields,
  };
  const originalWhyToGiveIt = docWithEditorial.whyToGiveIt;

  const polishRes = await polishProductEditorialCopy({
    action: 'more_distinctive',
    targetSection: 'whyToGiveIt',
    productUrl: sampleUrl,
    retrievedDetails: retrieved,
    currentDocument: docWithEditorial,
    customInstructions:
      'Make the opening sentence more witty about psychology lecture halls.',
  });
  assert.equal(polishRes.ok, true, polishRes.message);
  assert.equal(polishRes.targetSection, 'whyToGiveIt');
  assert.equal(polishRes.originalFields.whyToGiveIt, originalWhyToGiveIt);
  assert.ok(polishRes.proposedFields.whyToGiveIt.length >= 40);
  assert.notEqual(
    polishRes.proposedFields.whyToGiveIt,
    originalWhyToGiveIt,
    'Polished replacement must offer revised prose'
  );
  // Confirm original document is untouched until editor explicitly applies the proposal
  assert.equal(docWithEditorial.whyToGiveIt, originalWhyToGiveIt);
});

test('10 & 11. End-to-End Generate Complete Product -> Save Draft -> Publish to Astro Website -> Cleanup & Verify Original Hoodie Untouched', async () => {
  const uniqueSuffix = Date.now().toString(36).slice(-5);
  const slugCurrent = `official-studio-ai-product-${uniqueSuffix}`;
  const canonicalId = `prod_${slugCurrent.replace(/-/g, '_')}`;
  const draftId = `drafts.${canonicalId}`;
  const sampleUrl =
    'https://shop.scienceofgifts.com/products/emotional-support-psychology-major-hoodie';

  try {
    // 1. Run Generate Complete Product
    const completeRes = await generateCompleteProductProposal({
      productUrl: sampleUrl,
      currentDocument: {
        _id: draftId,
        _type: 'product',
        productId: canonicalId,
        slug: { _type: 'slug', current: slugCurrent },
        title: `Campus Psychology Embroidered Fleece (${uniqueSuffix})`,
        status: 'draft',
      },
    });
    assert.equal(completeRes.ok, true, completeRes.message);
    assert.equal(completeRes.validForDraftSave, true);

    // 2. Save Draft to Sanity Content Lake
    const draftDocToSave: Record<string, any> & {
      _id: string;
      _type: string;
    } = {
      ...completeRes.combinedProposedFields,
      _id: draftId,
      _type: 'product',
      productId: canonicalId,
      slug: { _type: 'slug', current: slugCurrent },
      title: `Campus Psychology Embroidered Fleece (${uniqueSuffix})`,
      status: 'draft',
      // Editor verifies price and stock before publishing
      price: 40,
      currency: 'USD',
      priceVerified: true,
      priceVerificationSource: 'manual-editorial-check',
      priceVerifiedAt: new Date().toISOString(),
      inStock: true,
      inventoryVerified: true,
      inventoryVerificationSource: 'manual-editorial-check',
      inventoryVerifiedAt: new Date().toISOString(),
      seo: {
        ...completeRes.combinedProposedFields.seo,
        _type: 'seoMetadata',
        canonicalPath: `/products/${slugCurrent}`,
        indexing: 'index,follow',
      },
    };

    const saveRes = await saveDraftToSanityContentLake(draftDocToSave);
    assert.equal(saveRes.ok, true, saveRes.message);

    // 3. Publish Product in Sanity Content Lake
    const publishRes = await publishProductDraftInSanityContentLake({
      canonicalId,
      draftId,
    });
    assert.equal(publishRes.ok, true, publishRes.message);

    // 4. Verify Astro Website Catalog Loader immediately includes the published product
    const publishedLoad = await loadPublishedSanityProducts({
      forceRefresh: true,
    });
    const matchedPublished = publishedLoad.products.find(
      (p) => p.id === canonicalId
    );
    assert.ok(
      matchedPublished,
      'Published Sanity products loader must include the newly published AI-authored product'
    );
    await contentRepository.ensureSyncedFromSanity({ forceRefresh: true });
    const bySlug = contentRepository.getProductBySlug(slugCurrent);
    assert.ok(bySlug, 'Astro product route lookup by slug must resolve');
    assert.equal(
      bySlug?.giftVerdict?.editorialAssessment,
      completeRes.proposedEditorialFields.giftVerdict.editorialAssessment
    );
  } finally {
    // Clean up disposable published & draft documents
    await unpublishProductInSanityContentLake({ canonicalId }).catch(() => {});
    await deleteDraftFromSanityContentLake(draftId).catch(() => {});
  }

  // 5. Verify original Emotional Support Psychology Major Hoodie was NEVER modified
  const realHoodieAfter = await fetchDocumentFromSanityContentLake(
    REAL_HOODIE_ID
  );
  assert.ok(realHoodieAfter, 'Original Hoodie must exist in Sanity');
  assert.equal(
    realHoodieAfter?._rev,
    REAL_HOODIE_EXPECTED_REV,
    'Original Hoodie _rev must remain completely untouched'
  );
});
