import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PRODUCTS } from '../data/catalog';
import { buildProductJsonLd, generateXmlSitemap } from '../utils/seoAndValidation';
import { buildSiteSearchIndex } from '../utils/siteSearchEngine';
import { contentRepository } from './contentRepository';
import {
  SanityContentFetchError,
  loadPublishedSanityProducts,
} from './sanityPublishedLoader';
import {
  convertLocalProductToSanityDraft,
  mapSanityProductDocumentToAstroProduct,
} from './studio/productDocumentMapper';
import {
  deleteDisposableTestProductFromSanity,
  ensureEditableDraftInSanityContentLake,
  fetchDocumentFromSanityContentLake,
  fetchPublishedProductFromSanityContentLake,
  saveDraftToSanityContentLake,
  publishProductDraftInSanityContentLake,
  unpublishProductInSanityContentLake,
  validateSanityDraftBeforeServerMutation,
} from './studio/sanityServerClient';
import {
  extractProductDetailsFromUrl,
  validateSafeExternalProductUrl,
} from './studio/productUrlExtractor';
import { generateProductAiWritingBrief } from './productAiBriefExporter';
import { handleSanityStudioApiRequest } from './studio/sanityStudioApiPlugin';
import {
  isStudioDevelopmentEnvironmentAllowed,
  issueStudioEditorSessionCredentials,
  issueStudioPreviewTicket,
} from './studio/sanityStudioAuth';

const PROTECTED_HOODIE_DRAFT_ID =
  'drafts.prod_emotional_support_psychology_major_hoodie';

interface MockHttpCapture {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

async function invokeStudioMiddleware(input: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  jsonBody?: unknown;
}): Promise<MockHttpCapture> {
  const req = new EventEmitter() as unknown as IncomingMessage;
  req.method = input.method;
  req.url = input.url;
  req.headers = {
    host: 'localhost:3000',
    ...(input.headers ?? {}),
  };

  const capturedHeaders: Record<string, string> = {};
  let capturedBody = '';
  let resolved = false;

  return new Promise<MockHttpCapture>((resolve, reject) => {
    const res = {
      statusCode: 200,
      setHeader(name: string, value: string | string[]) {
        capturedHeaders[name.toLowerCase()] = Array.isArray(value)
          ? value.join(', ')
          : String(value);
      },
      getHeader(name: string) {
        return capturedHeaders[name.toLowerCase()];
      },
      end(chunk?: unknown) {
        if (chunk !== undefined && chunk !== null) {
          capturedBody += Buffer.isBuffer(chunk)
            ? chunk.toString('utf8')
            : String(chunk);
        }
        if (!resolved) {
          resolved = true;
          resolve({
            statusCode: res.statusCode,
            headers: capturedHeaders,
            body: capturedBody,
          });
        }
      },
    } as unknown as ServerResponse;

    handleSanityStudioApiRequest(req, res, () => {
      if (!resolved) {
        resolved = true;
        resolve({
          statusCode: 404,
          headers: capturedHeaders,
          body: '',
        });
      }
    }).catch(reject);

    queueMicrotask(() => {
      if (input.jsonBody !== undefined) {
        const raw =
          typeof input.jsonBody === 'string'
            ? input.jsonBody
            : JSON.stringify(input.jsonBody);
        (req as unknown as EventEmitter).emit('data', Buffer.from(raw, 'utf8'));
      }
      (req as unknown as EventEmitter).emit('end');
    });
  });
}

export async function runProductPublishingWorkflowTests(): Promise<{
  passed: number;
  results: string[];
}> {
  const results: string[] = [];
  let passed = 0;
  const disposableIdsToCleanup = new Set<string>();

  const recordPass = (label: string) => {
    passed += 1;
    results.push(`PASS [${passed}]: ${label}`);
  };

  const PROTECTED_HOODIE_PUBLISHED_ID =
    'prod_emotional_support_psychology_major_hoodie';
  const uniqueSuffix = Date.now().toString(36);
  const [hoodieDraftBefore, hoodiePublishedBefore] = await Promise.all([
    fetchDocumentFromSanityContentLake(PROTECTED_HOODIE_DRAFT_ID),
    fetchDocumentFromSanityContentLake(PROTECTED_HOODIE_PUBLISHED_ID),
  ]);
  const hoodieActiveBefore = hoodieDraftBefore || hoodiePublishedBefore;
  assert.ok(
    hoodieActiveBefore,
    `Expected protected hoodie "${PROTECTED_HOODIE_PUBLISHED_ID}" (draft or published) to exist in Sanity Content Lake`
  );
  assert.ok(
    hoodieActiveBefore._rev,
    'Expected protected hoodie document to have a valid _rev'
  );
  const hoodieDraftRevBefore = hoodieDraftBefore?._rev ? String(hoodieDraftBefore._rev) : null;
  const hoodiePubRevBefore = hoodiePublishedBefore?._rev
    ? String(hoodiePublishedBefore._rev)
    : null;
  const hoodieActiveRevBefore = String(hoodieActiveBefore._rev);
  const hoodieActiveUpdatedAtBefore = String(hoodieActiveBefore._updatedAt || '');

  try {
    // =========================================================================
    // Scenario A: All 13 Local Reference Products Normalize Cleanly & Disposable
    //             Local->Draft->Edit->Publish->Astro Repository Sync Round-Trip
    // =========================================================================
    {
      const allLocalProducts = Object.values(PRODUCTS);
      assert.ok(allLocalProducts.length >= 13);

      for (const localProd of allLocalProducts) {
        const converted = convertLocalProductToSanityDraft(localProd);
        const serverCheck = validateSanityDraftBeforeServerMutation(converted);
        assert.equal(
          serverCheck.validForDraftSave,
          true,
          `Expected local product "${localProd.id}" (${localProd.productType}) to pass Sanity draft validation without 422 taxonomy errors, got: ${JSON.stringify(
            serverCheck.blockingDraftErrors
          )}`
        );
      }

      const templateLocal = PRODUCTS['prod_hinoki_bath_block'] || allLocalProducts[0];
      const disposableId = `prod_e2e_verify_local_${uniqueSuffix}`;
      const disposableSlug = `e2e-verify-local-${uniqueSuffix}`;
      disposableIdsToCleanup.add(disposableId);

      const localClone = {
        ...templateLocal,
        id: disposableId,
        slug: disposableSlug,
        title: `[E2E Local Test] ${templateLocal.title} (${uniqueSuffix})`,
        vendor: 'Atelier Kiso Studio',
        purchaseUrl: `https://atelier-kiso-fictional-test.jp/products/${disposableSlug}`,
        isSampleProduct: false,
        isPlaceholderLink: false,
        priceVerified: true,
        priceVerificationSource: 'retailer_live_check' as const,
        priceVerifiedAt: '2026-11-12',
        priceVerificationEvidenceNote: `Verified $${templateLocal.price} USD during E2E test`,
        inventoryVerified: true,
        inventoryVerificationSource: 'retailer_live_check' as const,
        inventoryVerifiedAt: '2026-11-12',
        inStock: true,
      };

      const createDraftRes = await ensureEditableDraftInSanityContentLake({
        canonicalId: disposableId,
        localProductFallback: localClone,
      });
      assert.equal(
        createDraftRes.ok,
        true,
        `Expected ensureEditableDraftInSanityContentLake to convert local clone, got: ${createDraftRes.message}`
      );
      assert.equal(createDraftRes.action, 'converted_local_to_draft');
      assert.ok(createDraftRes.draftDocument?._rev);

      // Idempotent second call opens the existing draft instead of creating a duplicate
      const openAgainRes = await ensureEditableDraftInSanityContentLake({
        canonicalId: disposableId,
        localProductFallback: localClone,
      });
      assert.equal(openAgainRes.ok, true);
      assert.equal(openAgainRes.action, 'opened_existing_draft');
      assert.equal(
        openAgainRes.draftDocument?._rev,
        createDraftRes.draftDocument?._rev
      );

      // Edit draft and verify new _rev
      assert.ok(openAgainRes.draftDocument);
      const editedDraftRes = await saveDraftToSanityContentLake({
        ...(openAgainRes.draftDocument as Record<string, any> & {
          _id: string;
          _type: string;
        }),
        subtitle: `Updated E2E editorial subtitle (${uniqueSuffix})`,
      });
      assert.equal(
        editedDraftRes.ok,
        true,
        `Expected draft edit save to succeed, got: ${editedDraftRes.message}`
      );
      assert.notEqual(
        editedDraftRes.persistedDocument?._rev,
        createDraftRes.draftDocument?._rev
      );

      // Publish draft atomically
      const publishRes = await publishProductDraftInSanityContentLake({
        document: editedDraftRes.persistedDocument!,
        canonicalId: disposableId,
        expectedRev: editedDraftRes.persistedDocument?._rev,
      });
      assert.equal(
        publishRes.ok,
        true,
        `Expected publishProductDraftInSanityContentLake to succeed, got: ${publishRes.message}`
      );
      assert.equal(publishRes.publishedDocument?.status, 'published');
      assert.equal(publishRes.publishedDocument?._id, disposableId);

      // Confirm draft was consumed/deleted and published doc is readable via perspective=published
      const leftoverDraft = await fetchDocumentFromSanityContentLake(
        `drafts.${disposableId}`
      );
      assert.equal(leftoverDraft, null);
      const livePublishedDoc =
        await fetchPublishedProductFromSanityContentLake(disposableId);
      assert.ok(livePublishedDoc);
      assert.equal(
        livePublishedDoc.subtitle,
        `Updated E2E editorial subtitle (${uniqueSuffix})`
      );

      // Sync into contentRepository and verify deduplication & Astro visibility
      await contentRepository.ensureSyncedFromSanity({ forceRefresh: true });
      const syncedProduct = contentRepository.getProductBySlug(disposableSlug);
      assert.ok(
        syncedProduct,
        'Expected published Sanity product to appear in contentRepository.getProductBySlug'
      );
      assert.equal(syncedProduct.id, disposableId);
      assert.equal(
        contentRepository
          .getAllProducts()
          .filter((p) => p.id === disposableId || p.slug === disposableSlug)
          .length,
        1
      );

      // Forking published product back into draft works cleanly
      const forkRes = await ensureEditableDraftInSanityContentLake({
        canonicalId: disposableId,
      });
      assert.equal(forkRes.ok, true);
      assert.equal(forkRes.action, 'forked_published_to_draft');
      assert.equal(forkRes.hasPublishedPartner, true);

      recordPass(
        'Scenario A: All 13 local products pass Sanity validation, and idempotent local->draft->edit->publish->Astro repo sync succeeds without duplicates'
      );
    }

    // =========================================================================
    // Scenario B: Unverified Commerce Editorial Product Publishing & Guardrails
    // =========================================================================
    {
      const unverifiedId = `prod_e2e_verify_unverified_${uniqueSuffix}`;
      const unverifiedSlug = `e2e-verify-unverified-${uniqueSuffix}`;
      disposableIdsToCleanup.add(unverifiedId);

      const unverifiedDraftDoc = {
        _id: `drafts.${unverifiedId}`,
        _type: 'product' as const,
        productId: unverifiedId,
        slug: { _type: 'slug', current: unverifiedSlug },
        title: `[E2E Unverified Commerce] Tactile Stoneware Vessel (${uniqueSuffix})`,
        subtitle:
          'Hand-thrown ceramic pour-over vessel evaluated strictly on tactile gifting craft.',
        vendor: 'Kyoto Kiln Workshop',
        productType: 'Tea & Coffee Rituals',
        commerceProvider: 'affiliate',
        fulfillmentClassification: 'affiliate-partner',
        purchaseUrl: `https://kyoto-kiln-workshop.jp/products/${unverifiedSlug}`,
        currency: 'USD',
        priceVerified: false,
        priceVerificationSource: 'unverified',
        inventoryVerified: false,
        inventoryVerificationSource: 'unverified',
        isSampleProduct: false,
        isPlaceholderLink: false,
        whyToGiveIt:
          'Its unglazed stoneware foot and balanced pouring spout reward unhurried morning coffee rituals.',
        bestForSummary:
          'For home brewers who appreciate quiet weight, tactile glaze variation, and daily durability.',
        detailsAndCare:
          'Wheel-thrown stoneware clay. Hand wash with warm water after brewing.',
        recipients: ['friend', 'partner'],
        interests: ['Home Decor', 'Coffee & Tea'],
        occasions: ['birthday', 'housewarming'],
        personalityTraits: ['curious-creative', 'everyday-ritual'],
        ageRanges: ['adult'],
        images: [
          {
            _key: 'img_01',
            _type: 'productImage',
            id: 'img_01',
            url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1200&q=80',
            alt: 'Matte ceramic pour-over stoneware coffee vessel on timber counter',
            fitMode: 'cover',
            fallbackColor: '#F6F4EF',
            sourceType: 'external-url',
          },
        ],
        giftVerdict: {
          _type: 'productGiftVerdict',
          editorialAssessment:
            'A genuinely tactile centerpiece that earns countertop space through daily utility.',
          standoutReason:
            'Substantial stoneware walls retain heat longer than thin porcelain drippers.',
          recipientDelight:
            'Recipients immediately notice the satisfying thumb rest and balanced pour.',
          importantCaveat:
            'Merchant retail price and stock are currently unverified; confirm pricing on merchant page.',
        },
        idealRecipientProfile: {
          _type: 'productRecipientProfile',
          headline: 'Slow-Morning Pour-Over Traditionalists',
          narrative:
            'Ideal for friends who enjoy tactile kitchenware and never rush their first cup of coffee.',
          lifestyleNotes: [
            'Brews single-origin pour-over at home',
            'Prefers matte natural glazes over glossy kitchen gadgets',
          ],
          relationshipFit: ['Close friends', 'Long-term partners'],
        },
        extendedGiftRationale: [
          'Handmade stoneware introduces pleasant sensory friction into ordinary weekday mornings.',
          'Because sizing is standard, it pairs smoothly with common paper filters without guesswork.',
        ],
        buyingConsiderationsList: [
          {
            _key: 'bc_01',
            _type: 'productBuyingConsideration',
            label: 'Confirm Current Pricing',
            detail:
              'Retail pricing fluctuates seasonally; verify on Kyoto Kiln Workshop before ordering.',
          },
        ],
        status: 'draft' as const,
      };

      const saveUnverifiedRes = await saveDraftToSanityContentLake(
        unverifiedDraftDoc
      );
      assert.equal(
        saveUnverifiedRes.ok,
        true,
        `Expected unverified draft save to succeed, got: ${saveUnverifiedRes.message}`
      );

      // Publish with missing price & missing inStock -> MUST SUCCEED with noindex & suppressed Offer
      const publishUnverifiedRes = await publishProductDraftInSanityContentLake({
        document: saveUnverifiedRes.persistedDocument!,
        canonicalId: unverifiedId,
        expectedRev: saveUnverifiedRes.persistedDocument?._rev,
      });
      assert.equal(
        publishUnverifiedRes.ok,
        true,
        `Expected editorial product with unverified commerce to publish, got: ${publishUnverifiedRes.message}`
      );
      assert.equal(publishUnverifiedRes.publishedDocument?.status, 'published');
      assert.equal(
        publishUnverifiedRes.lifecycle?.robotsDirective,
        'noindex,follow'
      );
      assert.equal(publishUnverifiedRes.lifecycle?.hasVerifiedCommerce, false);

      const mappedAstro = mapSanityProductDocumentToAstroProduct(
        publishUnverifiedRes.publishedDocument!
      );
      assert.equal(mappedAstro.budgetTier, undefined);
      assert.equal(mappedAstro.guidePriceBucket, undefined);
      assert.equal(mappedAstro.inStock, undefined);
      assert.equal(mappedAstro.priceVerified, false);
      assert.equal(mappedAstro.inventoryVerified, false);
      assert.equal(mappedAstro.seo?.noindex, true);

      const jsonLd = buildProductJsonLd(mappedAstro, undefined, false) as unknown as {
        '@graph': ReadonlyArray<Record<string, any>>;
      };
      const productNode = jsonLd['@graph'].find(
        (node) => node['@type'] === 'Product'
      );
      assert.ok(productNode);
      assert.equal(
        productNode.offers,
        undefined,
        'Expected Schema.org Product JSON-LD to omit `offers` when price is unverified'
      );

      // Guardrail 1: Claiming priceVerified: true without positive price MUST block
      const fakeVerifiedRes = await publishProductDraftInSanityContentLake({
        document: {
          ...publishUnverifiedRes.publishedDocument!,
          priceVerified: true,
          priceVerificationSource: 'manual-merchant-check',
        },
        canonicalId: unverifiedId,
      });
      assert.equal(fakeVerifiedRes.ok, false);
      assert.equal(fakeVerifiedRes.status, 422);

      // Guardrail 2: isSampleProduct: true or placeholder example.com URL MUST block
      const samplePublishRes = await publishProductDraftInSanityContentLake({
        document: {
          ...unverifiedDraftDoc,
          _rev: undefined,
          isSampleProduct: true,
          purchaseUrl: 'https://example.com/dev-placeholder/sample-item',
        },
        canonicalId: unverifiedId,
      });
      assert.equal(samplePublishRes.ok, false);
      assert.equal(samplePublishRes.status, 422);

      recordPass(
        'Scenario B: Unverified commerce product publishes safely as editorial-only (noindex,follow, omitted Offer/stock), while fabricated verification or sample/placeholder URLs block with 422'
      );
    }

    // =========================================================================
    // Scenario C: Authenticated Draft Preview & Read-Only Hoodie Verification
    // =========================================================================
    {
      const hoodiePreviewTargetId = hoodieActiveBefore._id;

      // Production fail-closed checks
      assert.equal(
        isStudioDevelopmentEnvironmentAllowed({ NODE_ENV: 'production' }),
        false
      );
      assert.equal(
        issueStudioPreviewTicket(hoodiePreviewTargetId, {
          NODE_ENV: 'production',
        }),
        null
      );

      // Unauthenticated request without ticket or token -> HTTP 401
      const unauthPreview = await invokeStudioMiddleware({
        method: 'GET',
        url: `/api/studio/sanity/preview-product?id=${encodeURIComponent(
          hoodiePreviewTargetId
        )}`,
      });
      assert.equal(unauthPreview.statusCode, 401);

      // Issued preview ticket -> HTTP 200 SSR preview of real hoodie doc (strictly read-only GET)
      const issuedTicket = issueStudioPreviewTicket(hoodiePreviewTargetId);
      assert.ok(issuedTicket);

      const previewRes = await invokeStudioMiddleware({
        method: 'GET',
        url: `/api/studio/sanity/preview-product?id=${encodeURIComponent(
          hoodiePreviewTargetId
        )}&ticket=${encodeURIComponent(issuedTicket.ticket)}`,
      });
      assert.equal(previewRes.statusCode, 200);
      assert.equal(previewRes.headers['x-robots-tag'], 'noindex, nofollow');
      assert.ok(
        previewRes.headers['cache-control']?.includes('no-store'),
        'Expected Cache-Control: no-store on draft preview response'
      );
      assert.ok(
        previewRes.body.includes('<meta name="robots" content="noindex, nofollow"')
      );
      const expectedHoodieBadge = hoodieDraftBefore
        ? 'DRAFT PREVIEW'
        : 'PUBLISHED RECORD PREVIEW';
      assert.ok(
        previewRes.body.includes(expectedHoodieBadge),
        `Expected ${expectedHoodieBadge} in SSR preview for ${hoodiePreviewTargetId}`
      );
      assert.ok(
        previewRes.body.includes(hoodieActiveBefore.title),
        'Expected hoodie title in SSR draft preview'
      );
      assert.ok(
        previewRes.body.includes('The Gift Verdict'),
        'Expected The Gift Verdict section in SSR draft preview'
      );
      assert.equal(
        previewRes.body.includes('[object Object]'),
        false,
        'SSR preview must never render [object Object]'
      );

      // Confirm open-or-create-draft idempotency & DRAFT PREVIEW badge via middleware on a disposable draft
      const previewDraftId = `prod_e2e_verify_preview_${uniqueSuffix}`;
      const previewSlug = `e2e-verify-preview-${uniqueSuffix}`;
      disposableIdsToCleanup.add(previewDraftId);

      const disposableDraftSeed = convertLocalProductToSanityDraft(
        Object.values(PRODUCTS)[0]
      );
      const createdPreviewDraft = await saveDraftToSanityContentLake({
        ...disposableDraftSeed,
        _id: `drafts.${previewDraftId}`,
        productId: previewDraftId,
        slug: { _type: 'slug', current: previewSlug },
        title: `[E2E Preview Check] ${uniqueSuffix}`,
        purchaseUrl: `https://atelier-kiso-fictional-test.jp/products/${previewSlug}`,
      });
      assert.equal(createdPreviewDraft.ok, true);
      const createdRev = createdPreviewDraft.persistedDocument?._rev;
      assert.ok(createdRev);

      const disposableDraftTicket = issueStudioPreviewTicket(
        `drafts.${previewDraftId}`
      );
      assert.ok(disposableDraftTicket);
      const disposablePreviewRes = await invokeStudioMiddleware({
        method: 'GET',
        url: `/api/studio/sanity/preview-product?id=${encodeURIComponent(
          `drafts.${previewDraftId}`
        )}&ticket=${encodeURIComponent(disposableDraftTicket.ticket)}`,
      });
      assert.equal(disposablePreviewRes.statusCode, 200);
      assert.ok(disposablePreviewRes.body.includes('DRAFT PREVIEW'));

      const creds = issueStudioEditorSessionCredentials();
      assert.ok(creds);
      const openDisposableRes = await invokeStudioMiddleware({
        method: 'POST',
        url: '/api/studio/sanity/open-or-create-draft',
        headers: {
          'content-type': 'application/json',
          'x-sanity-studio-token': creds.sessionToken,
          'x-sanity-studio-csrf': creds.csrfToken,
        },
        jsonBody: {
          canonicalId: previewDraftId,
        },
      });
      assert.equal(openDisposableRes.statusCode, 200);
      const openDisposableJson = JSON.parse(openDisposableRes.body);
      assert.equal(openDisposableJson.action, 'opened_existing_draft');
      assert.equal(openDisposableJson.draftDocument?._rev, createdRev);

      recordPass(
        'Scenario C: Authenticated SSR draft/published preview renders cleanly (noindex, nofollow, no [object Object]), unauthenticated returns 401, and open-or-create-draft is idempotent'
      );
    }

    // =========================================================================
    // Scenario D: Draft Isolation From Public Catalog, Sitemap, and Search Index
    // =========================================================================
    {
      const draftOnlyId = `prod_e2e_verify_draftonly_${uniqueSuffix}`;
      const draftOnlySlug = `e2e-verify-draftonly-${uniqueSuffix}`;
      disposableIdsToCleanup.add(draftOnlyId);

      const draftOnlyBase = convertLocalProductToSanityDraft(
        Object.values(PRODUCTS)[0]
      );
      const draftOnlySave = await saveDraftToSanityContentLake({
        ...draftOnlyBase,
        _id: `drafts.${draftOnlyId}`,
        productId: draftOnlyId,
        slug: { _type: 'slug', current: draftOnlySlug },
        title: `[E2E Unpublished Draft Only] ${uniqueSuffix}`,
        purchaseUrl: `https://atelier-kiso-fictional-test.jp/products/${draftOnlySlug}`,
        isSampleProduct: false,
        isPlaceholderLink: false,
      });
      assert.equal(draftOnlySave.ok, true);

      await contentRepository.ensureSyncedFromSanity({ forceRefresh: true });

      const allPublicProducts = contentRepository.getAllProducts();
      assert.equal(
        allPublicProducts.some(
          (p) => p.id === draftOnlyId || p.slug === draftOnlySlug
        ),
        false,
        'Unpublished Sanity draft must NEVER appear in public contentRepository.getAllProducts()'
      );

      const xmlSitemap = generateXmlSitemap({
        catalog: contentRepository.getCatalogSnapshot(),
        categoryEntries: contentRepository.getAllCategorySeoEntries(),
        editorialHubs: contentRepository.getAllEditorialHubs({
          includeDrafts: true,
        }),
      });
      assert.equal(xmlSitemap.includes(draftOnlySlug), false);

      const searchItems = buildSiteSearchIndex({
        includeDevSampleProducts: true,
        includeDevEditorialHubs: false,
      });
      assert.equal(
        searchItems.some((item) => item.url.includes(draftOnlySlug)),
        false
      );

      recordPass(
        'Scenario D: Unpublished Sanity drafts never leak into contentRepository, sitemap.xml, or search-index.json'
      );
    }

    // =========================================================================
    // Scenario E: Explicit Sanity Outage Error Surfacing (Never Silent Empty)
    // =========================================================================
    {
      await assert.rejects(
        () =>
          loadPublishedSanityProducts({
            forceRefresh: true,
            envOverride: {
              SANITY_STUDIO_PROJECT_ID: 'invalid_nonexistent_proj_xyz99',
              SANITY_STUDIO_DATASET: 'production',
            },
          }),
        (err: unknown) => err instanceof SanityContentFetchError
      );

      recordPass(
        'Scenario E: Sanity Content Lake outages throw SanityContentFetchError explicitly instead of silently serving stale/empty data'
      );
    }

    // =========================================================================
    // Scenario G: URL Product Details Extractor (SSRF, JSON-LD, Shopify, OG)
    //             + Exported AI Writing Brief Provenance & Missing Fact Markers
    // =========================================================================
    {
      // 1. SSRF URL validation checks
      const blockedUrls = [
        'http://127.0.0.1:8080/admin',
        'http://localhost:3000/api/studio/sanity/status',
        'http://169.254.169.254/latest/meta-data/',
        'http://10.0.0.5/products/secret',
        'http://192.168.1.1/router',
        'http://[::1]/products/test',
        'file:///etc/passwd',
        'https://user:pass@merchant.example.org/products/item',
      ];
      for (const badUrl of blockedUrls) {
        const check = validateSafeExternalProductUrl(badUrl);
        assert.equal(
          check.ok,
          false,
          `Expected SSRF validator to block unsafe URL: ${badUrl}`
        );
      }

      // 2. Redirect-to-internal SSRF test with mock fetcher
      const redirectSsrfRes = await extractProductDetailsFromUrl(
        'https://store-test.example.org/products/redirect-trap',
        {
          skipDnsCheck: true,
          fetchImpl: async () =>
            new Response('', {
              status: 302,
              headers: { Location: 'http://169.254.169.254/latest/meta-data/' },
            }),
        }
      );
      assert.equal(redirectSsrfRes.ok, false);
      if (!redirectSsrfRes.ok) {
        assert.equal(redirectSsrfRes.errorCode, 'UNSAFE_URL_BLOCKED');
      }

      // 3. Combined JSON-LD + Shopify `.json` extraction
      const mockHtml = `<!doctype html><html><head>
        <title>Kiso Hinoki Cypress Bath Tray</title>
        <meta property="og:site_name" content="Atelier Kiso" />
        <script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: 'Kiso Hinoki Cypress Bath Tray',
          description: 'Milled Japanese hinoki wood tray shaped for deep soaking tubs.',
          brand: { '@type': 'Brand', name: 'Atelier Kiso Studio' },
          material: 'Japanese Hinoki Cypress Wood',
          width: { '@type': 'QuantitativeValue', value: '72', unitText: 'cm' },
          weight: { '@type': 'QuantitativeValue', value: '840', unitText: 'g' },
          image: ['https://cdn.atelierkiso.jp/hinoki-tray-main.jpg'],
          offers: {
            '@type': 'Offer',
            price: '74.00',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
          },
          additionalProperty: [
            { '@type': 'PropertyValue', name: 'Finish', value: 'Unvarnished raw wood' },
          ],
        })}</script>
      </head><body></body></html>`;

      const mockShopifyJson = {
        product: {
          title: 'Kiso Hinoki Cypress Bath Tray',
          vendor: 'Atelier Kiso Studio',
          product_type: 'Bath & Rituals',
          body_html: '<p>Crafted in Nagano from fragrant hinoki cypress.</p>',
          options: [
            { name: 'Size', values: ['Standard', 'Wide Tub'] },
            { name: 'Finish', values: ['Natural'] },
          ],
          variants: [
            {
              id: 101,
              title: 'Standard / Natural',
              sku: 'KISO-72',
              price: '74.00',
              available: true,
              option1: 'Standard',
              option2: 'Natural',
            },
            {
              id: 102,
              title: 'Wide Tub / Natural',
              sku: 'KISO-85',
              price: '88.00',
              available: true,
              option1: 'Wide Tub',
              option2: 'Natural',
            },
          ],
          images: [
            {
              src: 'https://cdn.atelierkiso.jp/hinoki-tray-main.jpg',
              alt: 'Kiso Hinoki Cypress Bath Tray',
              width: 1600,
              height: 1600,
            },
            {
              src: 'https://cdn.atelierkiso.jp/hinoki-tray-grain.jpg',
              alt: 'Hinoki wood grain closeup',
              width: 1600,
              height: 1600,
            },
          ],
        },
      };

      const extracted = await extractProductDetailsFromUrl(
        'https://atelier-kiso-fictional-test.jp/products/kiso-hinoki-bath-tray',
        {
          skipDnsCheck: true,
          fetchImpl: async (reqUrl) => {
            const urlStr = String(reqUrl);
            if (urlStr.endsWith('.json')) {
              return new Response(JSON.stringify(mockShopifyJson), {
                status: 200,
                headers: { 'content-type': 'application/json' },
              });
            }
            return new Response(mockHtml, {
              status: 200,
              headers: { 'content-type': 'text/html' },
            });
          },
        }
      );

      assert.equal(extracted.ok, true);
      if (extracted.ok) {
        assert.equal(extracted.title, 'Kiso Hinoki Cypress Bath Tray');
        assert.equal(extracted.vendor, 'Atelier Kiso Studio');
        assert.equal(extracted.price, 74);
        assert.equal(extracted.currency, 'USD');
        assert.equal(extracted.inStock, true);
        assert.equal(extracted.priceVerified, false);
        assert.equal(extracted.inventoryVerified, false);
        assert.ok(extracted.extractionSources.includes('json-ld'));
        assert.ok(extracted.extractionSources.includes('shopify-json'));
        assert.equal(extracted.images.length, 2);
        assert.deepEqual(extracted.sizes, ['Standard', 'Wide Tub']);
        assert.equal(extracted.variants.length, 2);
        assert.ok(extracted.materials.includes('Japanese Hinoki Cypress Wood'));
        assert.ok(extracted.dimensions?.includes('72 cm'));

        // Feed extracted details directly into AI brief exporter
        const briefFromExtracted = generateProductAiWritingBrief({
          mode: 'create',
          productUrl: extracted.sourceUrl,
          knownTitle: extracted.title || undefined,
          knownVendor: extracted.vendor || undefined,
          knownPrice: extracted.price,
          knownCurrency: extracted.currency,
          knownInStock: extracted.inStock,
          knownAvailabilityLabel: extracted.availabilityLabel || undefined,
          knownDescription: extracted.description || undefined,
          knownMaterials: extracted.materials,
          knownDimensions: extracted.dimensions || undefined,
          knownSpecifications: extracted.specifications,
          knownVariants: extracted.variants,
          knownSizes: extracted.sizes,
          knownColors: extracted.colors,
          knownImageUrls: extracted.images.map((i) => i.url),
          retrievedFromUrl: true,
          knownPriceConfirmed: false,
          knownStockConfirmed: false,
          missingRetrievedFields: extracted.missingFields,
          unverifiedRetrievedFields: extracted.unverifiedFields,
          extractionSources: extracted.extractionSources,
        });

        const jsonMatches =
          briefFromExtracted.markdownBrief.match(/```json[\s\S]*?```/g) || [];
        assert.equal(
          jsonMatches.length,
          1,
          'Brief built from URL extraction must still contain exactly ONE ```json block'
        );
        assert.ok(
          briefFromExtracted.markdownBrief.includes('Japanese Hinoki Cypress Wood')
        );
        assert.ok(
          briefFromExtracted.markdownBrief.includes('Wide Tub')
        );
        assert.ok(
          briefFromExtracted.markdownBrief.includes('Retrieved Retail Price (UNVERIFIED)')
        );
        if (briefFromExtracted.templatePayload.mode === 'create') {
          assert.equal(
            briefFromExtracted.templatePayload.factualContext.priceVerification.verified,
            false,
            'Auto-extracted price must stay priceVerification.verified=false in template until confirmed'
          );
        }
      }

      // 4. Studio API endpoint SSRF guard check via middleware
      const creds = issueStudioEditorSessionCredentials();
      assert.ok(creds);
      const apiSsrfRes = await invokeStudioMiddleware({
        method: 'POST',
        url: '/api/studio/sanity/fetch-product-details',
        headers: {
          'content-type': 'application/json',
          'x-sanity-studio-token': creds.sessionToken,
          'x-sanity-studio-csrf': creds.csrfToken,
        },
        jsonBody: { url: 'http://169.254.169.254/latest/meta-data/' },
      });
      assert.equal(apiSsrfRes.statusCode, 403);
      const apiSsrfJson = JSON.parse(apiSsrfRes.body);
      assert.equal(apiSsrfJson.errorCode, 'UNSAFE_URL_BLOCKED');

      recordPass(
        'Scenario G: Product URL extractor blocks SSRF targets, merges JSON-LD + Shopify + OpenGraph specs/variants/images cleanly without fabricating verification, and enriches AI brief exports'
      );
    }

    // =========================================================================
    // Scenario H: Full Middleware Publish -> Edit -> Republish -> Unpublish
    //             Lifecycle (Preserves Draft, Clears Public Routes & Search)
    // =========================================================================
    {
      const lifecycleId = `prod_e2e_verify_lifecycle_${uniqueSuffix}`;
      const lifecycleSlug = `e2e-verify-lifecycle-${uniqueSuffix}`;
      disposableIdsToCleanup.add(lifecycleId);

      const creds = issueStudioEditorSessionCredentials();
      assert.ok(creds);
      const authHeaders = {
        'content-type': 'application/json',
        'x-sanity-studio-token': creds.sessionToken,
        'x-sanity-studio-csrf': creds.csrfToken,
      };

      const draftBase = convertLocalProductToSanityDraft(
        PRODUCTS['prod_hinoki_bath_block'] || Object.values(PRODUCTS)[0]
      );
      const initialDraftDoc = {
        ...draftBase,
        _id: `drafts.${lifecycleId}`,
        productId: lifecycleId,
        slug: { _type: 'slug', current: lifecycleSlug },
        title: `[E2E Lifecycle] Cypress Ritual Tray (${uniqueSuffix})`,
        subtitle: 'Initial verified draft subtitle for lifecycle check.',
        vendor: 'Atelier Kiso Studio',
        purchaseUrl: `https://atelier-kiso-fictional-test.jp/products/${lifecycleSlug}`,
        price: 68,
        currency: 'USD',
        budgetTier: '50-to-100',
        guidePriceBucket: '25-to-75',
        priceVerified: true,
        priceVerificationSource: 'manual-merchant-check',
        priceVerifiedAt: '2026-11-13',
        priceVerificationEvidenceNote: `Verified $68 USD for ${lifecycleSlug}`,
        inStock: true,
        inventoryVerified: true,
        inventoryVerificationSource: 'manual-merchant-check',
        inventoryVerifiedAt: '2026-11-13',
        isSampleProduct: false,
        isPlaceholderLink: false,
        seo: {
          ...(draftBase.seo || { _type: 'seoMetadata' }),
          canonicalPath: `/products/${lifecycleSlug}/`,
        },
      };

      // Save draft via middleware
      const saveRes = await invokeStudioMiddleware({
        method: 'POST',
        url: '/api/studio/sanity/save-draft',
        headers: authHeaders,
        jsonBody: { document: initialDraftDoc },
      });
      assert.equal(saveRes.statusCode, 200, `save-draft failed: ${saveRes.body}`);
      const savedDraft = JSON.parse(saveRes.body).persistedDocument;
      assert.ok(savedDraft?._rev);

      // Publish via middleware
      const pubRes = await invokeStudioMiddleware({
        method: 'POST',
        url: '/api/studio/sanity/publish-product',
        headers: authHeaders,
        jsonBody: {
          document: savedDraft,
          canonicalId: lifecycleId,
          expectedRev: savedDraft._rev,
        },
      });
      assert.equal(pubRes.statusCode, 200, `publish-product failed: ${pubRes.body}`);
      const pubJson = JSON.parse(pubRes.body);
      assert.equal(pubJson.ok, true);
      assert.equal(pubJson.livePath, `/products/${lifecycleSlug}/`);

      // Verify visibility in contentRepository, sitemap, search index
      await contentRepository.ensureSyncedFromSanity({ forceRefresh: true });
      assert.ok(contentRepository.getProductBySlug(lifecycleSlug));
      const sitemapWhilePublished = generateXmlSitemap({
        catalog: contentRepository.getCatalogSnapshot(),
        categoryEntries: contentRepository.getAllCategorySeoEntries(),
        editorialHubs: contentRepository.getAllEditorialHubs({ includeDrafts: true }),
      });
      assert.ok(sitemapWhilePublished.includes(lifecycleSlug));
      const searchWhilePublished = buildSiteSearchIndex({
        includeDevSampleProducts: true,
        includeDevEditorialHubs: false,
      });
      assert.ok(searchWhilePublished.some((item) => item.url.includes(lifecycleSlug)));

      // Open back as draft -> edit -> save -> republish
      const forkRes = await invokeStudioMiddleware({
        method: 'POST',
        url: '/api/studio/sanity/open-or-create-draft',
        headers: authHeaders,
        jsonBody: { canonicalId: lifecycleId },
      });
      assert.equal(forkRes.statusCode, 200);
      const forkedDraft = JSON.parse(forkRes.body).draftDocument;
      assert.ok(forkedDraft?._rev);

      const editedSaveRes = await invokeStudioMiddleware({
        method: 'POST',
        url: '/api/studio/sanity/save-draft',
        headers: authHeaders,
        jsonBody: {
          document: {
            ...forkedDraft,
            subtitle: `Republished editorial subtitle (${uniqueSuffix})`,
          },
          expectedRevision: forkedDraft._rev,
        },
      });
      assert.equal(editedSaveRes.statusCode, 200);
      const editedDraft = JSON.parse(editedSaveRes.body).persistedDocument;

      const repubRes = await invokeStudioMiddleware({
        method: 'POST',
        url: '/api/studio/sanity/publish-product',
        headers: authHeaders,
        jsonBody: {
          document: editedDraft,
          canonicalId: lifecycleId,
          expectedRev: editedDraft._rev,
        },
      });
      assert.equal(repubRes.statusCode, 200);
      const repubDoc = JSON.parse(repubRes.body).publishedDocument;
      assert.equal(repubDoc.subtitle, `Republished editorial subtitle (${uniqueSuffix})`);

      // Unpublish via middleware
      const unpubRes = await invokeStudioMiddleware({
        method: 'POST',
        url: '/api/studio/sanity/unpublish-product',
        headers: authHeaders,
        jsonBody: {
          document: repubDoc,
          canonicalId: lifecycleId,
          expectedRev: repubDoc._rev,
        },
      });
      assert.equal(unpubRes.statusCode, 200);
      const unpubJson = JSON.parse(unpubRes.body);
      assert.equal(unpubJson.ok, true);
      assert.equal(unpubJson.draftDocument?._id, `drafts.${lifecycleId}`);
      assert.equal(unpubJson.draftDocument?.status, 'draft');
      assert.equal(unpubJson.draftDocument?.editorialApproved, false);
      assert.equal(
        unpubJson.draftDocument?.subtitle,
        `Republished editorial subtitle (${uniqueSuffix})`,
        'Unpublish must preserve all edited editorial content in drafts.<id>'
      );

      // Confirm published document is gone and public Astro repository/sitemap/search remove it
      const pubAfterUnpub =
        await fetchPublishedProductFromSanityContentLake(lifecycleId);
      assert.equal(pubAfterUnpub, null);

      await contentRepository.ensureSyncedFromSanity({ forceRefresh: true });
      assert.equal(contentRepository.getProductBySlug(lifecycleSlug), undefined);
      const sitemapAfterUnpub = generateXmlSitemap({
        catalog: contentRepository.getCatalogSnapshot(),
        categoryEntries: contentRepository.getAllCategorySeoEntries(),
        editorialHubs: contentRepository.getAllEditorialHubs({ includeDrafts: true }),
      });
      assert.equal(sitemapAfterUnpub.includes(lifecycleSlug), false);
      const searchAfterUnpub = buildSiteSearchIndex({
        includeDevSampleProducts: true,
        includeDevEditorialHubs: false,
      });
      assert.equal(
        searchAfterUnpub.some((item) => item.url.includes(lifecycleSlug)),
        false
      );

      // Verify idempotent second call when already unpublished
      const secondUnpub = await unpublishProductInSanityContentLake({
        canonicalId: lifecycleId,
      });
      assert.equal(secondUnpub.ok, true);
      assert.equal(secondUnpub.alreadyUnpublished, true);

      recordPass(
        'Scenario H: Complete middleware Publish -> Edit -> Republish -> Unpublish workflow preserves editorial draft, deletes published doc, and removes product from Astro catalog, sitemap, and search index'
      );
    }
  } finally {
    // Cleanup every disposable prod_e2e_verify_* fixture
    for (const id of disposableIdsToCleanup) {
      await deleteDisposableTestProductFromSanity(id);
    }
    await contentRepository.ensureSyncedFromSanity({ forceRefresh: true });

    // Scenario F: Confirm real hoodie (draft & published) is 100% untouched
    const [hoodieDraftAfter, hoodiePublishedAfter] = await Promise.all([
      fetchDocumentFromSanityContentLake(PROTECTED_HOODIE_DRAFT_ID),
      fetchDocumentFromSanityContentLake(PROTECTED_HOODIE_PUBLISHED_ID),
    ]);
    assert.equal(
      hoodieDraftAfter?._rev ? String(hoodieDraftAfter._rev) : null,
      hoodieDraftRevBefore,
      'CRITICAL: Protected hoodie draft state or _rev changed during test!'
    );
    assert.equal(
      hoodiePublishedAfter?._rev ? String(hoodiePublishedAfter._rev) : null,
      hoodiePubRevBefore,
      'CRITICAL: Protected hoodie published state or _rev changed during test!'
    );
    const hoodieActiveAfter = hoodieDraftAfter || hoodiePublishedAfter;
    assert.ok(hoodieActiveAfter);
    assert.equal(
      String(hoodieActiveAfter._rev),
      hoodieActiveRevBefore,
      `CRITICAL: Protected hoodie _rev changed from ${hoodieActiveRevBefore} to ${hoodieActiveAfter._rev}!`
    );
    assert.equal(
      String(hoodieActiveAfter._updatedAt || ''),
      hoodieActiveUpdatedAtBefore,
      'CRITICAL: Protected hoodie _updatedAt changed during test!'
    );
    recordPass(
      `Scenario F: Disposable fixtures cleaned up and protected hoodie document verified untouched (_rev: ${hoodieActiveAfter._rev})`
    );
  }

  return { passed, results };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.endsWith('productPublishingWorkflow.test.ts');

if (isDirectRun) {
  runProductPublishingWorkflowTests()
    .then((outcome) => {
      console.log(
        `\n=== Science of Gifts Publishing & Editable Catalog E2E Tests (${outcome.passed}/8 Passed) ===`
      );
      for (const line of outcome.results) {
        console.log(`  ✓ ${line}`);
      }
    })
    .catch((err) => {
      console.error('Publishing workflow test failure:', err);
      process.exit(1);
    });
}
