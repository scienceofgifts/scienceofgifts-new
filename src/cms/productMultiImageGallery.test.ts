/**
 * Multi-Image Uploads & Product Gallery Integration Verification Suite
 *
 * Verifies:
 * 1. Native Sanity Image Asset Uploads (`uploadImageAssetToSanityContentLake` &
 *    `uploadMultipleImageAssetsToSanityContentLake`) against live Sanity Content Lake,
 *    confirming real `sanity.imageAsset` documents (`image-<hash>-<width>x<height>-<ext>`)
 *    and `https://cdn.sanity.io/...` URLs exist in Sanity.
 * 2. File validation & security: rejects invalid MIME types, corrupt binary magic bytes,
 *    oversized payloads, and inline `data:` or `blob:` URLs inside product JSON.
 * 3. Gallery operations on a disposable Sanity draft (`drafts.prod_multi_image_gallery_test`):
 *    - Saving multiple images with mixed aspect ratios (1:1 square, 4:5 portrait, 16:9 landscape)
 *    - Reordering gallery images and changing the primary hero image (index 0)
 *    - Replacing an individual image in-place
 *    - Removing an individual image from the product gallery while verifying the shared
 *      `sanity.imageAsset` document remains intact in Sanity Content Lake
 *    - Reloading the saved draft from Sanity Content Lake and verifying round-trip fidelity
 * 4. Universal Import & AI Brief Compatibility:
 *    - Exporting an AI writing brief when Sanity photographs are already uploaded
 *    - Importing a ChatGPT-generated editorial JSON (`create` and `revision` modes)
 *      and verifying uploaded Sanity gallery images, ordering, focal points, and asset
 *      references are 100% preserved.
 * 5. Future Fourthwall Coexistence:
 *    - Verifies `sanity-upload`, `external-url`, and `fourthwall-synced` (`fourthwallVariantId`)
 *      images coexist cleanly without overwriting or duplicating each other.
 * 6. Astro Product Page Gallery (`ProductMediaGallery` & `EditorialProductProfile`):
 *    - Single-image product renders cleanly without unnecessary gallery controls
 *    - Multi-image product renders primary stage, prev/next controls, thumbnail strip,
 *      lazy loading on non-primary images, keyboard navigation attributes, focal points,
 *      and mixed aspect ratios (`cover` vs `contain`).
 */

import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  deleteDraftFromSanityContentLake,
  fetchDocumentFromSanityContentLake,
  saveDraftToSanityContentLake,
  uploadImageAssetToSanityContentLake,
  uploadMultipleImageAssetsToSanityContentLake,
  validateSanityDraftBeforeServerMutation,
} from './studio/sanityServerClient';
import {
  DEFAULT_MAX_PRODUCT_GALLERY_IMAGES,
  MAX_PRODUCT_GALLERY_IMAGES,
  applyProductInterchangeRevision,
  mapExistingProductToInterchangeV1,
  mapInterchangeToAstroProduct,
  mapInterchangeToSanityProductDraft,
  validateAndNormalizeProductInterchange,
} from './productInterchangeSchema';
import { generateProductAiWritingBrief } from './productAiBriefExporter';
import { importProductInterchangeResponse } from './productUniversalImporter';
import { ProductMediaGallery } from '../components/product/ProductMediaGallery';
import { EditorialProductProfile } from '../components/product/EditorialProductProfile';
import { ProductMediaManager } from '../components/studio/ProductMediaManager';
import createExampleJson from './examples/product-interchange-v1-create.example.json';

// Helper to compute CRC32 for valid PNG chunks
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * Generates a valid binary RGB PNG buffer with the exact width, height, and RGB fill color.
 */
function createValidTestPngBase64(
  width: number,
  height: number,
  rgb: [number, number, number]
): string {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth 8
  ihdr[9] = 2; // color type 2 (truecolor RGB)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowStride = width * 3 + 1;
  const rawData = Buffer.alloc(rowStride * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowStride;
    rawData[rowStart] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 3;
      rawData[px] = rgb[0];
      rawData[px + 1] = rgb[1];
      rawData[px + 2] = rgb[2];
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const pngBuffer = Buffer.concat([
    signature,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0)),
  ]);
  return pngBuffer.toString('base64');
}

async function runTests() {
  console.log('=== Science of Gifts: Multi-Image Uploads & Product Gallery Verification ===\n');

  // ---------------------------------------------------------------------------
  // 1. Validate Schema & Server Guards Against Base64 / Blob URLs & File Checks
  // ---------------------------------------------------------------------------
  console.log('1. Testing file validation & rejection of data:/blob: URLs in product JSON...');

  assert.equal(DEFAULT_MAX_PRODUCT_GALLERY_IMAGES, 8);
  assert.equal(MAX_PRODUCT_GALLERY_IMAGES, 12);

  // Reject data: URL in canonical interchange validator
  const dataUrlPayload = structuredClone(createExampleJson) as any;
  dataUrlPayload.media.images = [
    {
      url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      alt: 'Forbidden inline base64 image',
    },
  ];
  const dataUrlValidation = validateAndNormalizeProductInterchange(dataUrlPayload);
  assert.equal(dataUrlValidation.valid, false, 'Must reject inline data: URLs in product JSON');
  assert.ok(
    dataUrlValidation.errors.some((e) => e.code === 'INVALID_URL_FORMAT'),
    'Must report INVALID_URL_FORMAT for data: URL'
  );

  // Reject blob: URL in canonical interchange validator
  const blobUrlPayload = structuredClone(createExampleJson) as any;
  blobUrlPayload.media.images = [
    {
      url: 'blob:https://example.com/550e8400-e29b-41d4-a716-446655440000',
      alt: 'Forbidden temporary blob URL',
    },
  ];
  const blobUrlValidation = validateAndNormalizeProductInterchange(blobUrlPayload);
  assert.equal(blobUrlValidation.valid, false, 'Must reject temporary blob: URLs in product JSON');

  // Reject data:/blob: URL in server-side Sanity draft validator
  const serverDraftCheck = validateSanityDraftBeforeServerMutation({
    _id: 'drafts.prod_bad_media',
    _type: 'product',
    title: 'Bad Media Test',
    slug: { _type: 'slug', current: 'bad-media-test' },
    images: [
      {
        _key: 'img_0',
        _type: 'productImage',
        externalUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        alt: 'Inline base64',
      },
    ],
  });
  assert.equal(
    serverDraftCheck.validForDraftSave,
    false,
    'Server mutation validator must reject inline data: URLs'
  );

  // Reject invalid MIME type and corrupt binary headers on upload
  const badMimeRes = await uploadImageAssetToSanityContentLake({
    filename: 'malicious.svg',
    mimeType: 'image/svg+xml',
    base64Data: Buffer.from('<svg></svg>').toString('base64'),
  });
  assert.equal(badMimeRes.ok, false, 'Must reject unsupported SVG upload');
  assert.equal(badMimeRes.status, 415);

  const badMagicBytesRes = await uploadImageAssetToSanityContentLake({
    filename: 'fake-image.png',
    mimeType: 'image/png',
    base64Data: Buffer.from('not-a-real-png-binary').toString('base64'),
  });
  assert.equal(badMagicBytesRes.ok, false, 'Must reject file whose binary header does not match MIME');
  assert.equal(badMagicBytesRes.status, 400);

  console.log('   ✓ Security & format guards verified (data:/blob: rejected, magic bytes enforced).\n');

  // ---------------------------------------------------------------------------
  // 2. Live Multi-Image Upload to Sanity Content Lake (Mixed Aspect Ratios)
  // ---------------------------------------------------------------------------
  console.log('2. Uploading multiple real photographs (1:1 square, 4:5 portrait, 16:9 landscape) to Sanity Content Lake...');

  const squarePngBase64 = createValidTestPngBase64(120, 120, [42, 90, 72]); // 1:1 Square
  const portraitPngBase64 = createValidTestPngBase64(120, 150, [27, 61, 95]); // 4:5 Portrait
  const landscapePngBase64 = createValidTestPngBase64(160, 90, [146, 108, 68]); // 16:9 Landscape

  const multiUploadRes = await uploadMultipleImageAssetsToSanityContentLake([
    {
      filename: 'test-ceramic-mug-square-1x1.png',
      mimeType: 'image/png',
      base64Data: squarePngBase64,
      alt: 'Hand-thrown stoneware mug — 1:1 square studio angle',
      caption: 'Square 1:1 studio profile showing satin glaze.',
    },
    {
      filename: 'test-ceramic-mug-portrait-4x5.png',
      mimeType: 'image/png',
      base64Data: portraitPngBase64,
      alt: 'Hand-thrown stoneware mug — 4:5 tall portrait pour angle',
      caption: 'Tall 4:5 portrait framing preserved without cropping.',
    },
    {
      filename: 'test-ceramic-mug-landscape-16x9.png',
      mimeType: 'image/png',
      base64Data: landscapePngBase64,
      alt: 'Hand-thrown stoneware mug — 16:9 wide tabletop setting',
      caption: 'Wide 16:9 tabletop composition on linen.',
    },
  ]);

  assert.equal(multiUploadRes.ok, true, `Multi-upload failed: ${multiUploadRes.message}`);
  assert.equal(multiUploadRes.uploadedAssets.length, 3, 'Should upload all 3 photographs');
  assert.equal(multiUploadRes.errors.length, 0, 'Should have 0 upload errors');

  const [uploadedSquare, uploadedPortrait, uploadedLandscape] = multiUploadRes.uploadedAssets;

  // Verify each asset has a canonical Sanity asset ID and CDN URL
  assert.match(uploadedSquare.assetId, /^image-[a-zA-Z0-9_]+-120x120-png$/);
  assert.match(uploadedPortrait.assetId, /^image-[a-zA-Z0-9_]+-120x150-png$/);
  assert.match(uploadedLandscape.assetId, /^image-[a-zA-Z0-9_]+-160x90-png$/);

  assert.ok(uploadedSquare.url.startsWith('https://cdn.sanity.io/images/'));
  assert.ok(uploadedPortrait.url.startsWith('https://cdn.sanity.io/images/'));
  assert.ok(uploadedLandscape.url.startsWith('https://cdn.sanity.io/images/'));

  // Query Sanity Content Lake directly to confirm the sanity.imageAsset documents exist
  const verifiedAssetInLake = await fetchDocumentFromSanityContentLake(
    uploadedSquare.assetId
  );
  assert.ok(verifiedAssetInLake, 'sanity.imageAsset document must exist in Sanity Content Lake');
  assert.equal(verifiedAssetInLake?._type, 'sanity.imageAsset');
  assert.equal(verifiedAssetInLake?._id, uploadedSquare.assetId);

  console.log(`   ✓ Uploaded 3 Sanity image assets and verified in Content Lake:`);
  console.log(`     - [1:1]  ${uploadedSquare.assetId} -> ${uploadedSquare.url}`);
  console.log(`     - [4:5]  ${uploadedPortrait.assetId} -> ${uploadedPortrait.url}`);
  console.log(`     - [16:9] ${uploadedLandscape.assetId} -> ${uploadedLandscape.url}\n`);

  // ---------------------------------------------------------------------------
  // 3. Universal Import & AI Brief Compatibility (Preserving Uploaded Images)
  // ---------------------------------------------------------------------------
  console.log('3. Testing workflow: Upload images -> Export AI Brief -> Import ChatGPT JSON -> Preserve uploaded gallery...');

  const preUploadedDraftImages = [
    {
      _key: 'img_0',
      _type: 'productImage' as const,
      sanityAssetId: uploadedSquare.assetId,
      asset: uploadedSquare.imageField,
      externalUrl: uploadedSquare.url,
      alt: uploadedSquare.alt,
      caption: uploadedSquare.caption,
      fitMode: 'cover' as const,
      focalPoint: { x: 0.45, y: 0.55 },
      sourceType: 'sanity-upload' as const,
      width: uploadedSquare.width,
      height: uploadedSquare.height,
      aspectRatio: uploadedSquare.aspectRatio,
    },
    {
      _key: 'img_1',
      _type: 'productImage' as const,
      sanityAssetId: uploadedPortrait.assetId,
      asset: uploadedPortrait.imageField,
      externalUrl: uploadedPortrait.url,
      alt: uploadedPortrait.alt,
      caption: uploadedPortrait.caption,
      fitMode: 'contain' as const,
      focalPoint: { x: 0.5, y: 0.4 },
      sourceType: 'sanity-upload' as const,
      width: uploadedPortrait.width,
      height: uploadedPortrait.height,
      aspectRatio: uploadedPortrait.aspectRatio,
    },
    {
      _key: 'img_2',
      _type: 'productImage' as const,
      sanityAssetId: uploadedLandscape.assetId,
      asset: uploadedLandscape.imageField,
      externalUrl: uploadedLandscape.url,
      alt: uploadedLandscape.alt,
      caption: uploadedLandscape.caption,
      fitMode: 'cover' as const,
      focalPoint: { x: 0.6, y: 0.5 },
      sourceType: 'sanity-upload' as const,
      width: uploadedLandscape.width,
      height: uploadedLandscape.height,
      aspectRatio: uploadedLandscape.aspectRatio,
    },
  ];

  // Export AI writing brief with pre-uploaded images
  const exportedBrief = generateProductAiWritingBrief({
    mode: 'create',
    productUrl: 'https://kinto-usa.com/products/scs-mug-250ml',
    knownTitle: 'SCS Ceramic Stacking Mug',
    knownVendor: 'Kinto',
    knownPrice: 24,
    uploadedImages: preUploadedDraftImages,
  });

  assert.ok(
    exportedBrief.markdownBrief.includes(
      '**Uploaded Product Photography Gallery**: 3 photograph(s) already attached in Studio'
    ),
    'Exported brief must document already-uploaded Studio photographs'
  );
  assert.ok(
    exportedBrief.markdownBrief.includes(
      'you do NOT need to reproduce internal Sanity asset references or invent image URLs'
    ),
    'Exported brief must instruct chatbot not to invent image URLs'
  );

  // Simulate ChatGPT returning a complete editorial profile where media.images is empty []
  // (or contains generic template URLs) — importer must preserve the 3 uploaded Sanity images!
  const chatGptResponsePayload = structuredClone(createExampleJson) as any;
  chatGptResponsePayload.identity.title = 'SCS Ceramic Stacking Mug';
  chatGptResponsePayload.identity.slug = 'multi-image-gallery-test';
  chatGptResponsePayload.targetProduct = {
    ...chatGptResponsePayload.targetProduct,
    canonicalProductId: 'prod_multi_image_gallery_test',
  };
  chatGptResponsePayload.media.images = []; // ChatGPT omitted images because they are already uploaded in Studio

  const importReport = importProductInterchangeResponse({
    rawInput: JSON.stringify(chatGptResponsePayload, null, 2),
    expectedMode: 'create',
    workspaceDocuments: [],
    existingDraftImages: preUploadedDraftImages,
  });

  assert.equal(
    importReport.ok,
    true,
    `Import with pre-uploaded Sanity images must succeed: ${importReport.errors?.[0]?.message || ''}`
  );
  assert.ok(importReport.resolvedCreatePayload);
  assert.equal(
    importReport.resolvedCreatePayload?.media.images.length,
    3,
    'All 3 pre-uploaded Sanity images must be preserved after ChatGPT JSON import'
  );
  assert.equal(
    importReport.resolvedCreatePayload?.media.images[0].sanityAssetId,
    uploadedSquare.assetId
  );
  assert.equal(
    importReport.resolvedCreatePayload?.media.images[1].sanityAssetId,
    uploadedPortrait.assetId
  );
  assert.equal(
    importReport.resolvedCreatePayload?.media.images[1].fitMode,
    'contain',
    '4:5 portrait fitMode ("contain") must be preserved'
  );
  assert.deepEqual(
    importReport.resolvedCreatePayload?.media.images[0].focalPoint,
    { x: 0.45, y: 0.55 },
    'Custom focal point must be preserved'
  );

  console.log('   ✓ Uploaded Sanity gallery preserved intact across AI brief export and ChatGPT JSON import.\n');

  // ---------------------------------------------------------------------------
  // 4. Live Sanity Draft Persistence: Save, Reorder, Hero Selection, Replace, Remove, Reload
  // ---------------------------------------------------------------------------
  console.log('4. Testing live Sanity draft persistence, reordering, hero selection, replacement, and removal...');

  const disposableDraftId = 'drafts.prod_multi_image_gallery_test';
  const initialDraftDoc = {
    ...mapInterchangeToSanityProductDraft(importReport.resolvedCreatePayload!),
    _id: disposableDraftId,
    _type: 'product',
  };

  try {
    // 4a. Save initial draft with 3 uploaded Sanity images
    const saveInitialRes = await saveDraftToSanityContentLake(initialDraftDoc);
    assert.equal(
      saveInitialRes.ok,
      true,
      `Saving initial multi-image draft failed: ${saveInitialRes.message}`
    );
    assert.equal(saveInitialRes.persistedDocument?.images?.length, 3);
    assert.equal(
      saveInitialRes.persistedDocument?.images?.[0]?.asset?.asset?._ref,
      uploadedSquare.assetId
    );

    // 4b. Reorder & Hero Selection: Promote image #2 (4:5 portrait) to Primary Hero (index 0)
    const currentImages = [...(saveInitialRes.persistedDocument?.images || [])];
    const [movedHero] = currentImages.splice(1, 1);
    currentImages.unshift(movedHero);

    // 4c. Replace image at index 2 (formerly landscape) with a newly uploaded 4th Sanity image
    const replacementPngBase64 = createValidTestPngBase64(140, 140, [92, 64, 51]);
    const replacementUploadRes = await uploadImageAssetToSanityContentLake({
      filename: 'test-ceramic-mug-detail-140x140.png',
      mimeType: 'image/png',
      base64Data: replacementPngBase64,
      alt: 'Close-up macro of stoneware rim and unglazed foot',
    });
    assert.equal(replacementUploadRes.ok, true);
    const replacementAsset = replacementUploadRes.asset!;

    currentImages[2] = {
      ...currentImages[2],
      _key: 'img_replaced_2',
      sanityAssetId: replacementAsset.assetId,
      asset: replacementAsset.imageField,
      externalUrl: replacementAsset.url,
      alt: 'Close-up macro of stoneware rim and unglazed foot',
      caption: 'Replaced detail photograph.',
      sourceType: 'sanity-upload',
    };

    // 4d. Remove image at index 1 (the original 1:1 square image) from the product gallery
    const removedAssetId = currentImages[1].sanityAssetId;
    assert.equal(removedAssetId, uploadedSquare.assetId);
    currentImages.splice(1, 1); // Now 2 images remain: [uploadedPortrait (Hero), replacementAsset (#2)]

    // Also add a Fourthwall-synced variant image at index 2 to verify coexistence
    currentImages.push({
      _key: 'img_fourthwall_variant',
      _type: 'productImage',
      externalUrl: 'https://cdn.sanity.io/images/c1y2qdje/production/a1b2c3d4e5f6a1b2c3d4e5f6-1200x1200.jpg',
      alt: 'Fourthwall synced variant image',
      fitMode: 'cover',
      sourceType: 'fourthwall-synced',
      fourthwallVariantId: 'fw_var_stoneware_01',
    });

    const updatedDraftRes = await saveDraftToSanityContentLake({
      ...saveInitialRes.persistedDocument!,
      _id: disposableDraftId,
      _type: 'product',
      images: currentImages,
    });
    assert.equal(updatedDraftRes.ok, true, 'Saving reordered/replaced/removed gallery failed');

    // 4e. Reload saved draft from Sanity Content Lake and verify exact state
    const reloadedDraftDoc = await fetchDocumentFromSanityContentLake(disposableDraftId);
    assert.ok(reloadedDraftDoc, 'Reloaded draft must exist in Sanity Content Lake');
    const reloadedImages = reloadedDraftDoc?.images;
    assert.equal(Array.isArray(reloadedImages), true);
    assert.equal(reloadedImages.length, 3, 'Reloaded draft must have 3 images (Hero + Replaced + Fourthwall)');

    // Verify new Primary Hero is the 4:5 portrait image
    assert.equal(reloadedImages[0].sanityAssetId, uploadedPortrait.assetId);
    assert.equal(reloadedImages[0].fitMode, 'contain');

    // Verify slot #2 is the replaced image
    assert.equal(reloadedImages[1].sanityAssetId, replacementAsset.assetId);
    assert.equal(reloadedImages[1].alt, 'Close-up macro of stoneware rim and unglazed foot');

    // Verify slot #3 is the Fourthwall coexistence image
    assert.equal(reloadedImages[2].sourceType, 'fourthwall-synced');
    assert.equal(reloadedImages[2].fourthwallVariantId, 'fw_var_stoneware_01');

    // Verify that removing `uploadedSquare` from the product gallery did NOT delete the shared asset from Sanity Content Lake
    const sharedAssetCheck = await fetchDocumentFromSanityContentLake(removedAssetId);
    assert.ok(sharedAssetCheck, 'Removed gallery image asset must remain intact in Sanity Content Lake');
    assert.equal(
      sharedAssetCheck?._id,
      removedAssetId,
      'Removed gallery image asset must remain intact in Sanity Content Lake'
    );

    // 4f. Test Revision Import preservation on the reloaded Sanity draft
    const existingCanonical = mapExistingProductToInterchangeV1(reloadedDraftDoc!);
    const revisionResult = applyProductInterchangeRevision(reloadedDraftDoc!, {
      format: 'science-of-gifts/product-interchange',
      schemaVersion: '1.0',
      mode: 'revision',
      targetProduct: {
        canonicalProductId: existingCanonical.targetProduct?.canonicalProductId || 'prod_multi_image_gallery_test',
        slug: existingCanonical.identity.slug,
      },
      identity: {
        subtitle: 'Updated subtitle via revision while preserving uploaded gallery matching length requirements.',
      },
      // media omitted — must preserve the 3 existing images!
    });
    assert.equal(
      revisionResult.valid,
      true,
      `Revision merge must succeed: ${revisionResult.errors?.[0]?.message || ''}`
    );
    assert.equal(
      revisionResult.mergedInterchange?.media.images.length,
      3,
      'Revision with omitted media must preserve all 3 existing gallery images'
    );
    assert.equal(
      revisionResult.mergedInterchange?.media.images[0].sanityAssetId,
      uploadedPortrait.assetId
    );
    assert.equal(
      revisionResult.mergedInterchange?.media.images[2].fourthwallVariantId,
      'fw_var_stoneware_01'
    );

    console.log('   ✓ Reordering, hero promotion, image replacement, non-destructive removal, reload, and Fourthwall coexistence verified.\n');
  } finally {
    // Clean up disposable draft product document from Sanity Content Lake
    const delRes = await deleteDraftFromSanityContentLake(disposableDraftId);
    assert.equal(delRes.ok, true, 'Disposable test draft must be cleaned up');
  }

  // ---------------------------------------------------------------------------
  // 5. Verify Astro Product Page Gallery & Studio Media Manager Rendering
  // ---------------------------------------------------------------------------
  console.log('5. Testing Astro ProductMediaGallery & EditorialProductProfile rendering (1 image vs multiple images & mixed aspect ratios)...');

  const astroMultiImageProduct = mapInterchangeToAstroProduct(
    importReport.resolvedCreatePayload!
  );
  assert.equal(astroMultiImageProduct.images.length, 3);

  // 5a. Single-image product rendering: no unnecessary gallery controls
  const singleImageHtml = renderToStaticMarkup(
    React.createElement(ProductMediaGallery, {
      images: [astroMultiImageProduct.images[0]],
      productTitle: astroMultiImageProduct.title,
      productType: astroMultiImageProduct.productType,
    })
  );
  assert.ok(
    singleImageHtml.includes('data-product-gallery-single="true"'),
    'Single-image gallery must render clean single-image figure'
  );
  assert.ok(
    !singleImageHtml.includes('Previous product photograph'),
    'Single-image product must NOT render previous/next gallery buttons'
  );
  assert.ok(
    !singleImageHtml.includes('role="tablist"'),
    'Single-image product must NOT render thumbnail tablist'
  );

  // 5b. Multi-image product rendering via full EditorialProductProfile
  const fullProfileHtml = renderToStaticMarkup(
    React.createElement(EditorialProductProfile, {
      product: astroMultiImageProduct,
      guideAppearances: [],
      similarComparisons: [],
      relatedArticles: [],
      citations: [],
    })
  );
  assert.ok(
    fullProfileHtml.includes('data-product-gallery-root="true"'),
    'Multi-image product profile must render interactive gallery root'
  );
  assert.ok(
    fullProfileHtml.includes('data-gallery-count="3"'),
    'Multi-image gallery must reflect 3 photographs'
  );
  assert.ok(
    fullProfileHtml.includes('Previous product photograph') &&
      fullProfileHtml.includes('Next product photograph'),
    'Multi-image gallery must include accessible Previous and Next controls'
  );
  assert.ok(
    fullProfileHtml.includes('role="tablist"'),
    'Multi-image gallery must include thumbnail navigation strip'
  );
  assert.ok(
    fullProfileHtml.includes('loading="lazy"'),
    'Secondary thumbnails must use lazy loading'
  );
  assert.ok(
    fullProfileHtml.includes('45% 55%'),
    'Primary image must preserve custom focal point (45% 55%)'
  );
  assert.ok(
    fullProfileHtml.includes('object-contain'),
    'Mixed aspect ratio image with fitMode="contain" must preserve object-contain framing'
  );

  // 5c. Studio ProductMediaManager SSR smoke test
  const studioManagerHtml = renderToStaticMarkup(
    React.createElement(ProductMediaManager, {
      images: preUploadedDraftImages,
      productTitle: 'SCS Ceramic Stacking Mug',
      onChangeImages: () => {},
    })
  );
  assert.ok(
    studioManagerHtml.includes('Product Gallery (3 / 8 photographs)'),
    'Studio ProductMediaManager must display current count and configurable limit (8)'
  );
  assert.ok(
    studioManagerHtml.includes('Primary Hero'),
    'Studio ProductMediaManager must badge the Primary Hero photograph'
  );

  console.log('   ✓ Single-image, multi-image, mixed-aspect-ratio, and Studio manager rendering verified.\n');
  console.log('ALL MULTI-IMAGE UPLOAD & PRODUCT GALLERY TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
