/**
 * Checkpoint 1 Verification Suite: Data Integrity & Studio Editorial Review Parity
 *
 * SAFETY GUARANTEE:
 * - Reads `drafts.prod_emotional_support_psychology_major_hoodie` strictly READ-ONLY
 *   to verify its schema shape and assert its `_rev` is NEVER modified.
 * - Executes all live Sanity mutations strictly on a disposable fixture ID
 *   (`drafts.prod_cp1_hoodie_fixture_<timestamp>`) and deletes it in `finally`.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { IncomingMessage } from 'node:http';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  applyProductInterchangeRevision,
  mapExistingProductToInterchangeV1,
  mapInterchangeToSanityProductDraft,
  validateAndNormalizeProductInterchange,
} from './productInterchangeSchema';
import {
  deleteDraftFromSanityContentLake,
  fetchDocumentFromSanityContentLake,
  saveDraftToSanityContentLake,
  validateSanityDraftBeforeServerMutation,
} from './studio/sanityServerClient';
import {
  isStudioDevelopmentEnvironmentAllowed,
  issueStudioEditorSessionCredentials,
  verifyStudioApiRequestAuthorization,
} from './studio/sanityStudioAuth';
import { sanityStudioApiPlugin } from './studio/sanityStudioApiPlugin';
import {
  EditorialProductReviewView,
  applyEditorialDocumentPatch,
  buildCanonicalGiftVerdictUpdate,
  buildCanonicalRecipientProfileUpdate,
  resolveBuyingConsiderationsForEditor,
  resolveExtendedRationaleParagraphsForEditor,
  resolveGiftVerdictForEditor,
  resolveOccasionNotesForEditor,
  resolveRecipientProfileForEditor,
  resolveSpecificationsForEditor,
} from '../components/studio/EditorialProductReviewView';
import { ProductCard } from '../components/ProductCard';
import { ProductDetailModal } from '../components/ProductDetailAndSavedModal';
import { EditorialProductProfile } from '../components/product/EditorialProductProfile';
import type { SanityStudioDocument } from '../components/studio/SanityStudioWorkspace';
import type { Product } from '../types/content';
import createExampleJson from './examples/product-interchange-v1-create.example.json';

const REAL_HOODIE_DRAFT_ID = 'drafts.prod_emotional_support_psychology_major_hoodie';

function buildFallbackHoodieFixtureTemplate(): Record<string, any> {
  return {
    _type: 'product',
    title: 'Emotional Support Psychology Major Hoodie (Disposable CP1 Fixture)',
    slug: {
      _type: 'slug',
      current: 'cp1-hoodie-disposable-fixture',
    },
    productId: 'prod_cp1_hoodie_disposable_fixture',
    vendor: 'Science of Gifts',
    productType: 'Apparel & Wearables',
    merchandiseType: 'hoodie',
    subtitle: 'Heavyweight fleece pullover for late-night psych study sessions.',
    calloutTag: 'Campus Favorite',
    whyToGiveIt:
      'Turns an inside joke among psychology students into a genuinely cozy daily study layer.',
    bestForSummary:
      'Psychology majors, graduate researchers, and friends spending long hours in the library.',
    detailsAndCare: 'Machine wash cold inside out; tumble dry low.',
    commerceProvider: 'fourthwall',
    fulfillmentClassification: 'owned-fourthwall-merch',
    purchaseUrl:
      'https://shop.scienceofgifts.com/products/emotional-support-psychology-major-hoodie',
    fourthwallUrl:
      'https://shop.scienceofgifts.com/products/emotional-support-psychology-major-hoodie',
    currency: 'USD',
    priceVerified: false,
    priceVerificationSource: 'unverified',
    inventoryVerified: false,
    inventoryVerificationSource: 'unverified',
    recipients: ['friend', 'partner'],
    interests: ['Psychology & Human Behavior', 'Reading & Reflection'],
    occasions: ['birthday', 'just-because'],
    personalityTraits: ['playful-clever', 'everyday-ritual'],
    ageRanges: ['college-grad', 'young-adult'],
    images: [],
    giftVerdict: {
      _type: 'productGiftVerdict',
      editorialAssessment:
        'A genuinely practical heavyweight layer wrapped in a sly, relatable nod to psychology coursework.',
      standoutReason:
        'Balances tongue-in-cheek department humor with clean typography suited for everyday campus wear.',
      recipientDelight:
        'Feels immediately personal for anyone deep in research methods, stats exams, or thesis writing.',
      importantCaveat:
        'Verify sizing preferences before ordering if the recipient prefers an oversized fit.',
    },
    idealRecipientProfile: {
      _type: 'productRecipientProfile',
      headline: 'The over-caffeinated psychology student living out of the library',
      narrative:
        'Best appreciated by undergrad or grad psychology students who treat cozy fleece as essential study armor.',
      lifestyleNotes: [
        'Spends evenings highlighting journal articles and prepping stats labs',
        'Appreciates dry academic humor without loud novelty graphics',
      ],
      relationshipFit: ['Close friend', 'Study partner', 'Sibling in college'],
    },
    extendedGiftRationale: [
      'Paragraph 1: Everyday campus wearability makes academic pride feel effortless rather than kitschy.',
      'Paragraph 2: Soft fleece warmth pairs comfort with social signaling among fellow psych majors.',
    ],
    buyingConsiderationsList: [
      {
        _key: 'bc_01',
        _type: 'productBuyingConsideration',
        label: 'Fit & Sizing',
        detail: 'Unisex sizing; size up one step for a relaxed study-lounge silhouette.',
      },
      {
        _key: 'bc_02',
        _type: 'productBuyingConsideration',
        label: 'Fabric Care',
        detail: 'Wash cold inside out to preserve print crispness.',
      },
    ],
    occasionContextNotes: [
      {
        _key: 'occ_01',
        _type: 'productOccasionNote',
        occasion: 'birthday',
        label: 'Birthday Gift',
        note: 'Pair with a fresh pack of highlighters or coffee beans.',
      },
    ],
    specifications: [
      {
        _key: 'spec_01',
        _type: 'productSpecificationItem',
        label: 'Product Form',
        value: 'Pullover Fleece Hoodie',
      },
      {
        _key: 'spec_02',
        _type: 'productSpecificationItem',
        label: 'Collection',
        value: 'Science of Gifts Shop Apparel',
      },
    ],
    seo: {
      _type: 'seoMetadata',
      seoTitle: 'Psychology Major Hoodie Gift Review | Science of Gifts',
      metaDescription:
        'Editorial gift review covering fit, warmth, recipient profile, and care details for psychology majors.',
      canonicalPath: '/products/cp1-hoodie-disposable-fixture/',
      indexing: 'index,follow',
    },
    status: 'draft',
  };
}

function cloneHoodieStructureToDisposableFixture(
  sourceDoc: Record<string, any> | null,
  disposableDraftId: string
): SanityStudioDocument {
  const canonicalId = disposableDraftId.replace(/^drafts\./, '');
  const slugCurrent = canonicalId.replace(/^prod_/, '').replace(/_/g, '-');
  const template = sourceDoc
    ? JSON.parse(JSON.stringify(sourceDoc))
    : buildFallbackHoodieFixtureTemplate();

  delete template._rev;
  delete template._createdAt;
  delete template._updatedAt;
  delete template._sourceOrigin;

  return {
    ...template,
    _id: disposableDraftId,
    _type: 'product',
    productId: canonicalId,
    slug: {
      _type: 'slug',
      current: slugCurrent,
    },
    title: `${template.title || 'Hoodie Fixture'} [Disposable CP1 Verification]`,
    status: 'draft',
    seo: {
      ...(template.seo && typeof template.seo === 'object' ? template.seo : {}),
      _type: 'seoMetadata',
      canonicalPath: `/products/${slugCurrent}/`,
    },
  };
}

export async function runCheckpoint1DataIntegrityTests(): Promise<{
  passed: number;
  results: string[];
  hoodieObservedReadOnly: {
    foundInSanity: boolean;
    initialRev?: string;
    finalRev?: string;
    unmodifiedConfirmed: boolean;
    hadNestedGiftVerdict: boolean;
    hadObjectIdealRecipientProfile: boolean;
    priceValue: unknown;
    inStockValue: unknown;
  };
  fidelityReport: Record<string, any>;
}> {
  const results: string[] = [];
  let passed = 0;

  const recordPass = (label: string) => {
    passed += 1;
    results.push(`PASS [${passed}]: ${label}`);
  };

  // =========================================================================
  // 0. READ-ONLY INSPECTION OF REAL HOODIE DRAFT (BEFORE TESTS)
  // =========================================================================
  const realHoodieInitial = await fetchDocumentFromSanityContentLake(
    REAL_HOODIE_DRAFT_ID
  );
  const initialHoodieRev = realHoodieInitial?._rev;

  const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const disposableDraftId = `drafts.prod_cp1_hoodie_fixture_${uniqueSuffix}`;
  const disposableFixture = cloneHoodieStructureToDisposableFixture(
    realHoodieInitial,
    disposableDraftId
  );

  // =========================================================================
  // 1. GIFT VERDICT & IDEAL RECIPIENT PROFILE EDITOR STATE HELPERS
  // =========================================================================
  {
    const resolvedVerdict = resolveGiftVerdictForEditor(disposableFixture);
    assert.ok(
      resolvedVerdict.editorialAssessment.length > 0,
      'Nested giftVerdict.editorialAssessment should resolve cleanly'
    );
    assert.ok(
      resolvedVerdict.standoutReason.length > 0,
      'Nested giftVerdict.standoutReason should resolve cleanly'
    );
    assert.ok(
      resolvedVerdict.recipientDelight.length > 0,
      'Nested giftVerdict.recipientDelight should resolve cleanly'
    );

    // Updating standoutReason must preserve siblings and omit empty caveat cleanly
    const updatedVerdict = buildCanonicalGiftVerdictUpdate(
      disposableFixture,
      'standoutReason',
      'Updated standout reason preserving sibling verdict fields.'
    );
    assert.equal(updatedVerdict._type, 'productGiftVerdict');
    assert.equal(
      updatedVerdict.editorialAssessment,
      resolvedVerdict.editorialAssessment
    );
    assert.equal(
      updatedVerdict.recipientDelight,
      resolvedVerdict.recipientDelight
    );
    assert.equal(
      updatedVerdict.standoutReason,
      'Updated standout reason preserving sibling verdict fields.'
    );

    const clearedCaveatVerdict = buildCanonicalGiftVerdictUpdate(
      { ...disposableFixture, giftVerdict: updatedVerdict },
      'importantCaveat',
      ''
    );
    assert.equal('importantCaveat' in clearedCaveatVerdict, false);

    // Legacy flat verdict fallback
    const legacyResolved = resolveGiftVerdictForEditor({
      giftVerdictAssessment: 'Legacy assessment',
      giftVerdictTactileQuality: 'Legacy standout',
      giftVerdictBehavioralLogic: 'Legacy delight',
      giftVerdictPracticalCaveats: 'Legacy caveat',
    });
    assert.equal(legacyResolved.editorialAssessment, 'Legacy assessment');
    assert.equal(legacyResolved.standoutReason, 'Legacy standout');
    assert.equal(legacyResolved.recipientDelight, 'Legacy delight');
    assert.equal(legacyResolved.importantCaveat, 'Legacy caveat');

    // Ideal Recipient Profile object + legacy string lifting
    const resolvedProfile = resolveRecipientProfileForEditor(disposableFixture);
    assert.ok(resolvedProfile.headline.length > 0);
    assert.ok(resolvedProfile.narrative.length > 0);
    assert.equal(resolvedProfile.headline.includes('[object Object]'), false);
    assert.equal(resolvedProfile.narrative.includes('[object Object]'), false);

    const updatedProfile = buildCanonicalRecipientProfileUpdate(
      disposableFixture,
      {
        lifestyleNotes: ['Custom note A', 'Custom note B'],
      }
    );
    assert.equal(updatedProfile._type, 'productRecipientProfile');
    assert.equal(updatedProfile.headline, resolvedProfile.headline);
    assert.deepEqual(updatedProfile.lifestyleNotes, [
      'Custom note A',
      'Custom note B',
    ]);

    const liftedLegacyProfile = resolveRecipientProfileForEditor({
      idealRecipientProfile: 'Legacy plain string recipient description',
    });
    assert.equal(
      liftedLegacyProfile.narrative,
      'Legacy plain string recipient description'
    );

    recordPass(
      'Gift Verdict nested/legacy resolution & sibling-preserving updates + Ideal Recipient Profile structured handling work without [object Object] coercion'
    );
  }

  // =========================================================================
  // 2. EXTENDED RATIONALE, CONSIDERATIONS, OCCASIONS, SPECS & ATOMIC PATCHES
  // =========================================================================
  {
    const paragraphs = resolveExtendedRationaleParagraphsForEditor(disposableFixture);
    assert.ok(paragraphs.length >= 2);

    const legacyParagraphs = resolveExtendedRationaleParagraphsForEditor({
      extendedGiftRationale: 'Paragraph One.\n\nParagraph Two.',
    });
    assert.deepEqual(legacyParagraphs, ['Paragraph One.', 'Paragraph Two.']);

    const specs = resolveSpecificationsForEditor({
      specifications: [
        { _key: 'k_existing', label: 'Fabric', value: '80/20 Fleece' },
        { _key: 'k_legacy', key: 'Weight', value: '400 GSM' },
      ],
    });
    assert.equal(specs[0]._key, 'k_existing');
    assert.equal(specs[0].label, 'Fabric');
    assert.equal(specs[1]._key, 'k_legacy');
    assert.equal(specs[1].label, 'Weight');
    assert.equal(specs[1].value, '400 GSM');

    const considerations = resolveBuyingConsiderationsForEditor(disposableFixture);
    assert.ok(considerations.length >= 1);
    assert.ok(considerations[0]._key);
    assert.equal(considerations[0]._type, 'productBuyingConsideration');

    const occasionNotes = resolveOccasionNotesForEditor(disposableFixture);
    assert.ok(occasionNotes.length >= 1);
    assert.ok(occasionNotes[0]._key);
    assert.equal(occasionNotes[0]._type, 'productOccasionNote');

    // Atomic clearing & re-populating via applyEditorialDocumentPatch
    const withPrice = applyEditorialDocumentPatch(
      { ...disposableFixture, _id: disposableDraftId, _type: 'product' },
      {
        price: 54,
        budgetTier: '50-to-100',
        guidePriceBucket: '25-to-75',
      }
    );
    assert.equal(withPrice.price, 54);
    assert.equal(withPrice._clearFields, undefined);

    const clearedPrice = applyEditorialDocumentPatch(
      withPrice,
      {
        priceVerified: false,
        priceVerificationSource: 'unverified',
      },
      {
        clearFields: [
          'price',
          'budgetTier',
          'guidePriceBucket',
          'priceVerifiedAt',
          'priceVerificationEvidenceNote',
        ],
      }
    );
    assert.equal('price' in clearedPrice, false);
    assert.equal('budgetTier' in clearedPrice, false);
    assert.equal('guidePriceBucket' in clearedPrice, false);
    assert.ok(clearedPrice._clearFields?.includes('price'));
    assert.ok(clearedPrice._clearFields?.includes('budgetTier'));

    const repopulatedPrice = applyEditorialDocumentPatch(clearedPrice, {
      price: 62,
      budgetTier: '50-to-100',
    });
    assert.equal(repopulatedPrice.price, 62);
    assert.ok(!repopulatedPrice._clearFields?.includes('price'));
    assert.ok(!repopulatedPrice._clearFields?.includes('budgetTier'));

    recordPass(
      'Extended rationale paragraphs, specifications (label/key fallback), considerations/occasions _key preservation, and atomic _clearFields patches behave accurately'
    );
  }

  // =========================================================================
  // 3. SSR RENDER VERIFICATION: STUDIO EDITOR + PUBLIC STOREFRONT GUARDS
  // =========================================================================
  {
    const hoodieForEditor: SanityStudioDocument = {
      ...disposableFixture,
      price: null,
      inStock: null,
      budgetTier: undefined,
      guidePriceBucket: undefined,
      seo: {
        _type: 'seoMetadata',
        seoTitle: '',
        metaDescription: '',
        canonicalPath: `/products/${disposableFixture.slug.current}/`,
        indexing: 'index,follow',
      },
    };

    const editorHtml = renderToStaticMarkup(
      React.createElement(EditorialProductReviewView, {
        document: hoodieForEditor,
        persistenceState: 'saved',
        persistenceError: null,
        serverValidationIssues: [],
        workspaceDocuments: [hoodieForEditor],
        onBackToLibrary: () => {},
        onUpdateDocument: () => {},
        onSaveDraftToSanity: async () => {},
        onReloadDocumentFromSanity: async () => {},
        onCloneReferenceToDraft: () => {},
      })
    );

    assert.equal(
      editorHtml.includes('[object Object]'),
      false,
      'EditorialProductReviewView must never render [object Object]'
    );
    assert.equal(
      editorHtml.includes('$0.00'),
      false,
      'EditorialProductReviewView must never render $0.00 for null price'
    );
    assert.ok(
      editorHtml.includes(
        disposableFixture.giftVerdict.editorialAssessment.slice(0, 30)
      ),
      'EditorialProductReviewView must display nested giftVerdict.editorialAssessment'
    );
    assert.ok(
      editorHtml.includes('Unknown / Unverified'),
      'EditorialProductReviewView must display Unknown / Unverified for null stock'
    );

    // Public storefront components with unverified / 0 price and unknown stock
    const unverifiedPublicProduct: Product = {
      id: 'prod_unverified_public_test',
      slug: 'unverified-public-test',
      title: 'Unverified Price Hoodie',
      vendor: 'Science of Gifts',
      productType: 'Apparel & Wearables',
      subtitle: 'Test subtitle',
      whyToGiveIt: 'Test rationale',
      bestForSummary: 'Test recipients',
      detailsAndCare: 'Wash cold',
      commerceProvider: 'fourthwall',
      purchaseUrl: 'https://shop.scienceofgifts.com/products/test',
      price: undefined as unknown as number,
      currency: 'USD',
      budgetTier: 'under-50',
      guidePriceBucket: '' as any,
      inStock: undefined as unknown as boolean,
      recipients: ['friend'],
      interests: ['Psychology & Human Behavior'],
      occasions: ['birthday'],
      personalityTraits: ['curious-creative'],
      ageRanges: ['young-adult'],
      citationIds: [],
      images: [
        {
          id: 'img_1',
          url: '',
          fallbackColor: '#EBF3FE',
          alt: 'Test hoodie',
        },
      ],
      giftVerdict: {
        editorialAssessment: 'Assessment',
        standoutReason: 'Standout',
        recipientDelight: 'Delight',
      },
      idealRecipientProfile: {
        headline: 'Headline',
        narrative: 'Narrative',
        lifestyleNotes: [],
        relationshipFit: [],
      },
      extendedGiftRationale: ['Paragraph 1'],
    };

    const cardHtmlOpen = renderToStaticMarkup(
      React.createElement(ProductCard, {
        product: unverifiedPublicProduct,
        isSaved: false,
        onToggleSave: () => {},
        onSelectProduct: () => {},
        variant: 'open',
      })
    );
    const cardHtmlFeature = renderToStaticMarkup(
      React.createElement(ProductCard, {
        product: { ...unverifiedPublicProduct, price: 0 },
        isSaved: false,
        onToggleSave: () => {},
        onSelectProduct: () => {},
        variant: 'guide-feature',
      })
    );
    const modalHtml = renderToStaticMarkup(
      React.createElement(ProductDetailModal, {
        product: { ...unverifiedPublicProduct, price: 0 },
        isSaved: false,
        onToggleSave: () => {},
        onClose: () => {},
      })
    );
    const profileHtml = renderToStaticMarkup(
      React.createElement(EditorialProductProfile, {
        product: { ...unverifiedPublicProduct, price: 0 },
        guideAppearances: [],
        similarComparisons: [],
        relatedArticles: [],
        citations: [],
      })
    );

    for (const [name, html] of [
      ['ProductCard(open)', cardHtmlOpen],
      ['ProductCard(guide-feature)', cardHtmlFeature],
      ['ProductDetailModal', modalHtml],
      ['EditorialProductProfile', profileHtml],
    ] as const) {
      assert.ok(
        html.includes('Price unverified'),
        `${name} must display "Price unverified" instead of $0`
      );
      assert.equal(
        /\$0(\.00)?\s*USD|\$undefined|\$null/.test(html),
        false,
        `${name} must never render $0 USD or $undefined/$null`
      );
    }
    assert.ok(
      profileHtml.includes('Availability unverified'),
      'EditorialProductProfile must display "Availability unverified" when inStock is undefined'
    );
    assert.equal(
      profileHtml.includes('Out of Stock'),
      false,
      'EditorialProductProfile must not display "Out of Stock" when inStock is undefined'
    );

    recordPass(
      'SSR renders confirm EditorialProductReviewView displays structured Hoodie fields without [object Object]/$0.00 and storefront views guard missing/zero price & stock'
    );
  }

  // =========================================================================
  // 4. INTERCHANGE MAPPER & REVISION NULL-PRICE / BUDGET EXCLUSION TESTS
  // =========================================================================
  {
    const clonedCreate = JSON.parse(JSON.stringify(createExampleJson));
    clonedCreate.factualContext.price = null;
    clonedCreate.factualContext.inStock = null;
    clonedCreate.taxonomy.budgetTier = undefined;
    clonedCreate.taxonomy.guidePriceBucket = undefined;

    const validated = validateAndNormalizeProductInterchange(clonedCreate);
    assert.equal(validated.valid, true);
    assert.ok(validated.normalized && validated.normalized.mode === 'create');

    const mappedSanity = mapInterchangeToSanityProductDraft(validated.normalized);
    assert.equal(mappedSanity.price, undefined);
    assert.equal(mappedSanity.budgetTier, undefined);
    assert.equal(mappedSanity.guidePriceBucket, undefined);
    assert.equal(mappedSanity.inStock, undefined);
    assert.equal(mappedSanity.priceVerified, false);
    assert.equal(mappedSanity.inventoryVerified, false);

    // Revision clearing price & stock
    const pricedDraft = {
      ...disposableFixture,
      price: 58,
      budgetTier: '50-to-100',
      guidePriceBucket: '25-to-75',
      inStock: true,
      priceVerified: true,
      priceVerificationSource: 'manual-merchant-check',
      inventoryVerified: true,
      inventoryVerificationSource: 'manual-merchant-check',
    };
    const revResult = applyProductInterchangeRevision(pricedDraft, {
      schemaVersion: '1.0',
      format: 'science-of-gifts/product-interchange',
      mode: 'revision',
      targetProduct: {
        canonicalProductId: disposableFixture.productId,
      },
      factualContext: {
        price: null,
        inStock: null,
      },
      revisionControl: {
        allowOverwriteVerifiedFacts: true,
        clearFields: ['identity.calloutTag'],
      },
    });
    assert.equal(revResult.valid, true, JSON.stringify(revResult.errors));
    assert.equal(revResult.mergedSanityDraft?.price, undefined);
    assert.equal(revResult.mergedSanityDraft?.budgetTier, undefined);
    assert.equal(revResult.mergedSanityDraft?.guidePriceBucket, undefined);
    assert.equal(revResult.mergedSanityDraft?.inStock, undefined);
    assert.equal(revResult.mergedSanityDraft?.priceVerified, false);
    assert.equal(revResult.mergedSanityDraft?.inventoryVerified, false);

    // mapExistingProductToInterchangeV1 on legacy flat fixture
    const interchangeFromLegacy = mapExistingProductToInterchangeV1({
      _id: 'drafts.prod_legacy_shape',
      productId: 'prod_legacy_shape',
      title: 'Legacy Shape Item',
      slug: { current: 'legacy-shape-item' },
      giftVerdictAssessment: 'Flat assessment',
      giftVerdictTactileQuality: 'Flat standout',
      giftVerdictBehavioralLogic: 'Flat delight',
      idealRecipientProfile: 'Plain recipient string',
      extendedGiftRationale: 'Para A\n\nPara B',
      specifications: [{ key: 'Material', value: 'Cotton' }],
    });
    assert.equal(
      interchangeFromLegacy.editorialProfile.giftVerdict.editorialAssessment,
      'Flat assessment'
    );
    assert.equal(
      interchangeFromLegacy.editorialProfile.idealRecipientProfile.narrative,
      'Plain recipient string'
    );
    assert.deepEqual(
      interchangeFromLegacy.editorialProfile.extendedGiftRationale,
      ['Para A', 'Para B']
    );
    assert.equal(
      interchangeFromLegacy.factualContext.specifications[0].label,
      'Material'
    );
    assert.equal(interchangeFromLegacy.taxonomy.budgetTier, null);

    recordPass(
      'Interchange create/revision mappers exclude fake budget tiers when price is null and lift legacy Sanity shapes accurately'
    );
  }

  // =========================================================================
  // 5. SERVER VALIDATION TRUTHINESS & CLEAR-FIELDS + SECURITY ISOLATION CHECKS
  // =========================================================================
  {
    const badPriceVerified = validateSanityDraftBeforeServerMutation({
      ...disposableFixture,
      price: null,
      priceVerified: true,
    });
    assert.equal(badPriceVerified.validForDraftSave, false);

    const badStockVerified = validateSanityDraftBeforeServerMutation({
      ...disposableFixture,
      inStock: null,
      inventoryVerified: true,
    });
    assert.equal(badStockVerified.validForDraftSave, false);

    const badClearImmutable = validateSanityDraftBeforeServerMutation({
      ...disposableFixture,
      _clearFields: ['title'],
    });
    assert.equal(badClearImmutable.validForDraftSave, false);

    const badClearNonAllowlisted = validateSanityDraftBeforeServerMutation({
      ...disposableFixture,
      _clearFields: ['giftVerdict'],
    });
    assert.equal(badClearNonAllowlisted.validForDraftSave, false);

    const clearPreparedDoc = applyEditorialDocumentPatch(
      { ...disposableFixture, calloutTag: 'Temp', price: 45, budgetTier: 'under-50' },
      {},
      { clearFields: ['calloutTag', 'price', 'budgetTier'] }
    );
    const validClearAllowlisted =
      validateSanityDraftBeforeServerMutation(clearPreparedDoc);
    assert.equal(validClearAllowlisted.validForDraftSave, true);
    assert.ok(validClearAllowlisted.normalizedDraftDocument);
    assert.equal('_clearFields' in validClearAllowlisted.normalizedDraftDocument, false);
    assert.equal(validClearAllowlisted.clearFields?.length, 3);

    // Non-empty field present simultaneously on doc overrides stale clear flag safely
    const repopulatedOverride = validateSanityDraftBeforeServerMutation({
      ...disposableFixture,
      calloutTag: undefined,
      price: 65,
      _clearFields: ['price', 'calloutTag'],
    });
    assert.equal(repopulatedOverride.validForDraftSave, true);
    assert.equal(repopulatedOverride.clearFields?.includes('price'), false);
    assert.equal(repopulatedOverride.clearFields?.includes('calloutTag'), true);

    // Production security isolation checks
    assert.equal(
      isStudioDevelopmentEnvironmentAllowed({ NODE_ENV: 'production' }),
      false
    );
    assert.equal(
      issueStudioEditorSessionCredentials({ NODE_ENV: 'production' }),
      null
    );

    const fakeReq = {
      method: 'POST',
      url: '/api/studio/sanity/save-draft',
      headers: {
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
    } as unknown as IncomingMessage;
    const missingAuthResult = verifyStudioApiRequestAuthorization(fakeReq, {
      requireCsrf: true,
      envOverride: { NODE_ENV: 'development' },
    });
    assert.equal(missingAuthResult.authorized, false);
    assert.equal(missingAuthResult.httpStatus, 401);

    const creds = issueStudioEditorSessionCredentials({
      NODE_ENV: 'development',
    });
    assert.ok(creds);

    const crossSiteReq = {
      method: 'POST',
      url: '/api/studio/sanity/save-draft',
      headers: {
        host: 'localhost:3000',
        'content-type': 'application/json',
        'sec-fetch-site': 'cross-site',
        'x-sanity-studio-token': creds.sessionToken,
        'x-sanity-studio-csrf': creds.csrfToken,
      },
    } as unknown as IncomingMessage;
    const crossSiteResult = verifyStudioApiRequestAuthorization(crossSiteReq, {
      requireCsrf: true,
      envOverride: { NODE_ENV: 'development' },
    });
    assert.equal(crossSiteResult.authorized, false);
    assert.equal(crossSiteResult.httpStatus, 403);

    // Verify plugin closeBundle strips dist/studio on build
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sog-cp1-build-'));
    const origCwd = process.cwd();
    try {
      const distStudioDir = path.join(tmpRoot, 'dist', 'studio');
      fs.mkdirSync(distStudioDir, { recursive: true });
      fs.writeFileSync(path.join(distStudioDir, 'index.html'), '<html></html>');
      process.chdir(tmpRoot);
      const plugin = sanityStudioApiPlugin();
      plugin.configResolved({ command: 'build' });
      plugin.closeBundle();
      assert.equal(fs.existsSync(distStudioDir), false);
    } finally {
      process.chdir(origCwd);
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }

    recordPass(
      'Server-side validation rejects falsified verification & unsafe _clearFields, while Studio auth/CSRF & production bundle stripping remain fail-closed'
    );
  }

  // =========================================================================
  // 6. LIVE SANITY CONTENT LAKE DISPOSABLE FIXTURE ROUND-TRIP & FIDELITY DIFF
  // =========================================================================
  let createTxId: string | undefined;
  let createdRev: string | undefined;
  let patchTxId: string | undefined;
  let patchedRev: string | undefined;
  let clearTxId: string | undefined;
  let clearedRev: string | undefined;
  let deleteTxId: string | undefined;
  const fidelityReport: Record<string, any> = {
    realHoodieDraftId: REAL_HOODIE_DRAFT_ID,
    realHoodieObserved: Boolean(realHoodieInitial),
    realHoodieInitialRev: initialHoodieRev ?? null,
    disposableFixtureId: disposableDraftId,
  };

  try {
    // 6A. Create disposable Hoodie-structured fixture with null price & null stock
    const initialCandidate: SanityStudioDocument = {
      ...disposableFixture,
      price: null,
      inStock: null,
      budgetTier: undefined,
      guidePriceBucket: undefined,
      priceVerified: false,
      priceVerificationSource: 'unverified',
      inventoryVerified: false,
      inventoryVerificationSource: 'unverified',
    };
    const createRes = await saveDraftToSanityContentLake(initialCandidate);
    assert.equal(
      createRes.ok,
      true,
      `Expected disposable fixture create to succeed: ${createRes.message}`
    );
    assert.equal(createRes.mutationOperation, 'create');
    createTxId = createRes.transactionId;
    createdRev = createRes.persistedDocument?._rev;
    assert.ok(createdRev);

    const reloadedAfterCreate = (await fetchDocumentFromSanityContentLake(
      disposableDraftId
    )) as SanityStudioDocument | null;
    assert.ok(reloadedAfterCreate);
    assert.equal(reloadedAfterCreate._rev, createdRev);
    assert.equal(
      reloadedAfterCreate.giftVerdict?.editorialAssessment,
      disposableFixture.giftVerdict.editorialAssessment
    );
    assert.equal(
      reloadedAfterCreate.idealRecipientProfile?.headline,
      disposableFixture.idealRecipientProfile.headline
    );
    assert.equal(reloadedAfterCreate.price ?? null, null);
    assert.equal(reloadedAfterCreate.inStock ?? null, null);
    assert.equal(reloadedAfterCreate.budgetTier ?? null, null);

    // 6B. Editor mutations: edit giftVerdict sibling, add lifestyle note, add spec, set price & stock, update SEO
    const existingSpecs = resolveSpecificationsForEditor(reloadedAfterCreate);
    const editedDoc = applyEditorialDocumentPatch(reloadedAfterCreate, {
      calloutTag: 'CP1 Verified Badge',
      price: 58,
      budgetTier: '50-to-100',
      guidePriceBucket: '25-to-75',
      inStock: true,
      priceVerified: true,
      priceVerificationSource: 'manual-merchant-check',
      inventoryVerified: true,
      inventoryVerificationSource: 'manual-merchant-check',
      giftVerdict: buildCanonicalGiftVerdictUpdate(
        reloadedAfterCreate,
        'standoutReason',
        'CP1 edited standout reason while preserving siblings.'
      ),
      idealRecipientProfile: buildCanonicalRecipientProfileUpdate(
        reloadedAfterCreate,
        {
          lifestyleNotes: [
            ...resolveRecipientProfileForEditor(reloadedAfterCreate).lifestyleNotes,
            'CP1 appended lifestyle cue',
          ],
        }
      ),
      specifications: [
        ...existingSpecs,
        {
          _type: 'productSpecificationItem',
          _key: 'spec_cp1_added',
          label: 'Fabric Weight',
          value: '400 GSM',
        },
      ],
      seo: {
        ...(reloadedAfterCreate.seo || {}),
        _type: 'seoMetadata',
        seoTitle: 'CP1 Edited SEO Title for Fixture',
      },
    });

    const patchRes = await saveDraftToSanityContentLake(editedDoc);
    assert.equal(
      patchRes.ok,
      true,
      `Expected partial patch to succeed: ${patchRes.message}`
    );
    assert.equal(patchRes.mutationOperation, 'patch');
    patchTxId = patchRes.transactionId;
    patchedRev = patchRes.persistedDocument?._rev;
    assert.ok(patchedRev && patchedRev !== createdRev);

    const reloadedAfterPatch = (await fetchDocumentFromSanityContentLake(
      disposableDraftId
    )) as SanityStudioDocument | null;
    assert.ok(reloadedAfterPatch);
    assert.equal(
      reloadedAfterPatch.giftVerdict?.editorialAssessment,
      disposableFixture.giftVerdict.editorialAssessment
    );
    assert.equal(
      reloadedAfterPatch.giftVerdict?.standoutReason,
      'CP1 edited standout reason while preserving siblings.'
    );
    assert.equal(
      reloadedAfterPatch.idealRecipientProfile?.lifestyleNotes?.at(-1),
      'CP1 appended lifestyle cue'
    );
    assert.equal(reloadedAfterPatch.price, 58);
    assert.equal(reloadedAfterPatch.inStock, true);
    assert.equal(reloadedAfterPatch.calloutTag, 'CP1 Verified Badge');
    assert.equal(
      reloadedAfterPatch.seo?.seoTitle,
      'CP1 Edited SEO Title for Fixture'
    );
    if (existingSpecs[0]?._key) {
      assert.equal(
        reloadedAfterPatch.specifications[0]._key,
        existingSpecs[0]._key,
        'Existing specification _key must remain intact across patch/reload'
      );
    }

    // 6C. Verify optimistic-locking REVISION_CONFLICT on stale _rev
    const staleRevAttempt = await saveDraftToSanityContentLake({
      ...reloadedAfterPatch,
      _rev: createdRev,
      title: 'Should Fail Optimistic Lock',
    });
    assert.equal(staleRevAttempt.ok, false);
    assert.equal(staleRevAttempt.status, 409);
    assert.equal(staleRevAttempt.blockerCode, 'REVISION_CONFLICT');

    // 6D. Verify unset clearing of calloutTag, price, budgetTier, guidePriceBucket, inStock, and importantCaveat
    const clearedDoc = applyEditorialDocumentPatch(
      reloadedAfterPatch,
      {
        priceVerified: false,
        priceVerificationSource: 'unverified',
        inventoryVerified: false,
        inventoryVerificationSource: 'unverified',
        giftVerdict: buildCanonicalGiftVerdictUpdate(
          reloadedAfterPatch,
          'importantCaveat',
          ''
        ),
      },
      {
        clearFields: [
          'calloutTag',
          'price',
          'budgetTier',
          'guidePriceBucket',
          'inStock',
        ],
      }
    );

    const clearRes = await saveDraftToSanityContentLake(clearedDoc);
    assert.equal(
      clearRes.ok,
      true,
      `Expected unset clear patch to succeed: ${clearRes.message}`
    );
    clearTxId = clearRes.transactionId;
    clearedRev = clearRes.persistedDocument?._rev;

    const reloadedAfterClear = await fetchDocumentFromSanityContentLake(
      disposableDraftId
    );
    assert.ok(reloadedAfterClear);
    assert.equal('calloutTag' in reloadedAfterClear, false);
    assert.equal('price' in reloadedAfterClear, false);
    assert.equal('budgetTier' in reloadedAfterClear, false);
    assert.equal('guidePriceBucket' in reloadedAfterClear, false);
    assert.equal('inStock' in reloadedAfterClear, false);
    assert.equal(
      'importantCaveat' in (reloadedAfterClear.giftVerdict || {}),
      false
    );
    // Untouched sibling content survived unset cleanly
    assert.equal(
      reloadedAfterClear.giftVerdict?.editorialAssessment,
      disposableFixture.giftVerdict.editorialAssessment
    );
    assert.equal(
      reloadedAfterClear.seo?.seoTitle,
      'CP1 Edited SEO Title for Fixture'
    );

    fidelityReport.sanityRoundTrip = {
      createTxId,
      createdRev,
      patchTxId,
      patchedRev,
      staleRevConflictStatus: staleRevAttempt.status,
      staleRevConflictCode: staleRevAttempt.blockerCode,
      clearTxId,
      clearedRev,
      verifiedAfterReload: {
        giftVerdictAssessmentPreserved:
          reloadedAfterClear.giftVerdict?.editorialAssessment ===
          disposableFixture.giftVerdict.editorialAssessment,
        giftVerdictStandoutEdited:
          reloadedAfterClear.giftVerdict?.standoutReason ===
          'CP1 edited standout reason while preserving siblings.',
        giftVerdictCaveatUnset:
          !('importantCaveat' in (reloadedAfterClear.giftVerdict || {})),
        idealRecipientLifestyleCount:
          reloadedAfterClear.idealRecipientProfile?.lifestyleNotes?.length ?? 0,
        specificationsCount: reloadedAfterClear.specifications?.length ?? 0,
        calloutTagUnset: !('calloutTag' in reloadedAfterClear),
        priceUnset: !('price' in reloadedAfterClear),
        budgetTierUnset: !('budgetTier' in reloadedAfterClear),
        inStockUnset: !('inStock' in reloadedAfterClear),
        seoTitlePersisted: reloadedAfterClear.seo?.seoTitle,
      },
    };

    recordPass(
      'Live Sanity disposable Hoodie-structured fixture round-trip (create -> reload -> patch -> 409 conflict -> unset clear -> reload) succeeded losslessly'
    );
  } finally {
    // Cleanup disposable draft unconditionally
    const existingDisposable = await fetchDocumentFromSanityContentLake(
      disposableDraftId
    );
    if (existingDisposable) {
      const delRes = await deleteDraftFromSanityContentLake(disposableDraftId);
      deleteTxId = delRes.transactionId;
      assert.equal(
        delRes.ok,
        true,
        `Disposable draft cleanup failed for ${disposableDraftId}: ${delRes.message}`
      );
      const afterDelete = await fetchDocumentFromSanityContentLake(
        disposableDraftId
      );
      assert.equal(afterDelete, null, 'Disposable draft must be completely deleted');
    }
    fidelityReport.deleteTxId = deleteTxId ?? null;
  }

  // =========================================================================
  // 7. CONFIRM REAL HOODIE DRAFT WAS COMPLETELY UNTOUCHED
  // =========================================================================
  const realHoodieFinal = await fetchDocumentFromSanityContentLake(
    REAL_HOODIE_DRAFT_ID
  );
  const finalHoodieRev = realHoodieFinal?._rev;
  assert.equal(
    finalHoodieRev,
    initialHoodieRev,
    `CRITICAL: Real hoodie draft _rev must remain ${initialHoodieRev}, got ${finalHoodieRev}`
  );
  recordPass(
    `Verified real Sanity draft "${REAL_HOODIE_DRAFT_ID}" remained completely untouched (_rev: ${finalHoodieRev})`
  );

  return {
    passed,
    results,
    hoodieObservedReadOnly: {
      foundInSanity: Boolean(realHoodieInitial),
      initialRev: initialHoodieRev,
      finalRev: finalHoodieRev,
      unmodifiedConfirmed: initialHoodieRev === finalHoodieRev,
      hadNestedGiftVerdict: Boolean(
        realHoodieInitial?.giftVerdict &&
          typeof realHoodieInitial.giftVerdict === 'object'
      ),
      hadObjectIdealRecipientProfile: Boolean(
        realHoodieInitial?.idealRecipientProfile &&
          typeof realHoodieInitial.idealRecipientProfile === 'object'
      ),
      priceValue:
        realHoodieInitial && 'price' in realHoodieInitial
          ? realHoodieInitial.price
          : '<omitted>',
      inStockValue:
        realHoodieInitial && 'inStock' in realHoodieInitial
          ? realHoodieInitial.inStock
          : '<omitted>',
    },
    fidelityReport,
  };
}

const isDirectExecution =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.endsWith('productCheckpoint1DataIntegrity.test.ts');

if (isDirectExecution) {
  runCheckpoint1DataIntegrityTests()
    .then((outcome) => {
      console.log(
        `\n=== Science of Gifts Checkpoint 1 Data Integrity Tests (${outcome.passed} passed) ===`
      );
      for (const line of outcome.results) {
        console.log(`  ✓ ${line}`);
      }
      console.log('\n=== Read-Only Real Hoodie Observation ===');
      console.log(JSON.stringify(outcome.hoodieObservedReadOnly, null, 2));
      console.log('\n=== Disposable Fixture Round-Trip Fidelity Report ===');
      console.log(JSON.stringify(outcome.fidelityReport, null, 2));
    })
    .catch((err) => {
      console.error('\n✗ Checkpoint 1 Data Integrity Tests Failed:', err);
      process.exit(1);
    });
}
