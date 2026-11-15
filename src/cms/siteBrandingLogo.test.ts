import test from 'node:test';
import assert from 'node:assert/strict';
import { siteSettingsDocument } from './studio/schemas/documents/siteSettings';
import { buildOfficialSanitySchemaTypes } from './studio/officialSanitySchemaAdapter';
import { LocalCMSContentStore } from './cmsContentStore';
import { createContentRepository } from './contentRepository';
import { GROQ_QUERIES } from './sanitySchemas';

test('siteSettings schema exposes Branding group with PNG/WebP/SVG logo & size controls', () => {
  const brandingGroup = (siteSettingsDocument.groups ?? []).find(
    (g) => g.name === 'branding'
  );
  assert.ok(brandingGroup, 'siteSettings should have a branding group');
  assert.equal(brandingGroup.title, 'Branding');

  const fields = siteSettingsDocument.fields ?? [];
  const logoField = fields.find((f) => f.name === 'logo');
  const logoAltField = fields.find((f) => f.name === 'logoAlt');
  const desktopHeightField = fields.find((f) => f.name === 'logoDesktopHeight');
  const mobileHeightField = fields.find((f) => f.name === 'logoMobileHeight');

  assert.ok(logoField, 'logo field should exist');
  assert.equal(logoField.type, 'image');
  assert.equal(logoField.group, 'branding');
  const logoOptions = (logoField as { options?: { hotspot?: boolean; accept?: string } }).options;
  assert.equal(logoOptions?.hotspot, false);
  assert.ok(
    String(logoOptions?.accept || '').includes('image/png') &&
      String(logoOptions?.accept || '').includes('image/webp') &&
      String(logoOptions?.accept || '').includes('image/svg+xml'),
    'logo field should accept PNG, WebP, and SVG formats'
  );

  assert.ok(logoAltField, 'logoAlt field should exist');
  assert.equal(logoAltField.type, 'string');
  assert.equal(logoAltField.group, 'branding');

  assert.ok(desktopHeightField, 'logoDesktopHeight field should exist');
  assert.equal(desktopHeightField.type, 'number');
  assert.equal(desktopHeightField.group, 'branding');

  assert.ok(mobileHeightField, 'logoMobileHeight field should exist');
  assert.equal(mobileHeightField.type, 'number');
  assert.equal(mobileHeightField.group, 'branding');
});

test('siteSettings schema validates PNG/WebP/SVG image assets and rejects unsupported formats', async () => {
  const { validateDocumentWithSchema } = await import('./studio/sanityCore');
  const baseDoc = {
    _type: 'siteSettings',
    siteName: 'Science of Gifts',
    siteOrigin: 'https://www.scienceofgifts.com',
    tagline: 'Editorial Gift Guides & Behavioral Discovery',
    defaultAffiliateDisclosure:
      'Science of Gifts is an independent editorial publication.',
    logoAlt: 'Science of Gifts',
    logoDesktopHeight: 34,
    logoMobileHeight: 26,
  };

  for (const ext of ['png', 'webp', 'svg']) {
    const result = validateDocumentWithSchema(siteSettingsDocument, {
      ...baseDoc,
      logo: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: `image-b030e67dd01bdb1cec2353dcc665ccc015033b66-120x32-${ext}`,
        },
      },
    });
    const logoErrors = result.errors.filter((e) => e.path === 'logo');
    assert.equal(
      logoErrors.length,
      0,
      `Expected ${ext} asset ref to pass validation`
    );
  }

  const jpgResult = validateDocumentWithSchema(siteSettingsDocument, {
    ...baseDoc,
    logo: {
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: 'image-b030e67dd01bdb1cec2353dcc665ccc015033b66-120x32-jpg',
      },
    },
  });
  assert.ok(
    jpgResult.errors.some((e) => e.path === 'logo'),
    'Expected unsupported jpg asset ref to fail logo validation'
  );

  const tooTallDesktop = validateDocumentWithSchema(siteSettingsDocument, {
    ...baseDoc,
    logoDesktopHeight: 90,
  });
  assert.ok(
    tooTallDesktop.errors.some((e) => e.path === 'logoDesktopHeight')
  );

  const tooSmallMobile = validateDocumentWithSchema(siteSettingsDocument, {
    ...baseDoc,
    logoMobileHeight: 10,
  });
  assert.ok(
    tooSmallMobile.errors.some((e) => e.path === 'logoMobileHeight')
  );
});

test('Official Sanity adapter preserves siteSettings Branding fields cleanly', () => {
  const adaptedTypes = buildOfficialSanitySchemaTypes();
  const adaptedSiteSettings = adaptedTypes.find(
    (t) => t.name === 'siteSettings'
  );
  assert.ok(adaptedSiteSettings);
  assert.ok(
    adaptedSiteSettings.groups.some((g: any) => g.name === 'branding')
  );
  const adaptedLogo = adaptedSiteSettings.fields.find(
    (f: any) => f.name === 'logo'
  );
  assert.equal(adaptedLogo?.type, 'image');
  assert.equal(adaptedLogo?.options?.hotspot, false);
  assert.ok(String(adaptedLogo?.options?.accept || '').includes('image/svg+xml'));
});

test('GROQ siteSettingsSingleton query projects logo URL, MIME type, dimensions, and size controls', () => {
  assert.ok(GROQ_QUERIES.siteSettingsSingleton.includes('"url": asset->url'));
  assert.ok(
    GROQ_QUERIES.siteSettingsSingleton.includes('"dimensions": asset->metadata.dimensions')
  );
  assert.ok(GROQ_QUERIES.siteSettingsSingleton.includes('logoAlt'));
  assert.ok(GROQ_QUERIES.siteSettingsSingleton.includes('logoDesktopHeight'));
  assert.ok(GROQ_QUERIES.siteSettingsSingleton.includes('logoMobileHeight'));
});

test('LocalCMSContentStore and contentRepository synchronize uploaded, replaced, and removed Sanity logos cleanly', () => {
  const store = new LocalCMSContentStore(false);
  const repo = createContentRepository(store);

  // Default baseline without Sanity siteSettings -> wordmark fallback (no logoUrl)
  const initial = repo.getSiteSettings();
  assert.equal(initial.siteName, 'Science of Gifts');
  assert.equal(initial.branding.logoUrl, undefined);
  assert.equal(initial.branding.logoAlt, 'Science of Gifts');
  assert.equal(initial.branding.logoDesktopHeight, 32);
  assert.equal(initial.branding.logoMobileHeight, 26);

  // Upload SVG logo with custom sizing & alt text
  repo.applyPublishedSanitySiteSettings({
    _id: 'siteSettings',
    _type: 'siteSettings',
    siteName: 'Science of Gifts',
    logo: {
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: 'image-b030e67dd01bdb1cec2353dcc665ccc015033b66-120x32-svg',
      },
    },
    logoUrl:
      'https://cdn.sanity.io/images/c1y2qdje/production/b030e67dd01bdb1cec2353dcc665ccc015033b66-120x32.svg',
    logoMimeType: 'image/svg+xml',
    logoDimensions: { width: 120, height: 32, aspectRatio: 3.75 },
    logoAlt: 'Science of Gifts Editorial Brand Mark',
    logoDesktopHeight: 40,
    logoMobileHeight: 28,
  });

  const withSvg = repo.getSiteSettings();
  assert.equal(
    withSvg.branding.logoUrl,
    'https://cdn.sanity.io/images/c1y2qdje/production/b030e67dd01bdb1cec2353dcc665ccc015033b66-120x32.svg'
  );
  assert.equal(withSvg.branding.logoAlt, 'Science of Gifts Editorial Brand Mark');
  assert.equal(withSvg.branding.logoDesktopHeight, 40);
  assert.equal(withSvg.branding.logoMobileHeight, 28);
  assert.deepEqual(withSvg.branding.logoDimensions, {
    width: 120,
    height: 32,
    aspectRatio: 3.75,
  });

  // Replace with WebP logo resolving via _ref fallback (no expanded logoUrl)
  repo.applyPublishedSanitySiteSettings(
    {
      _id: 'siteSettings',
      _type: 'siteSettings',
      logo: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: 'image-1234567890abcdef1234567890abcdef12345678-400x100-webp',
        },
      },
      logoDesktopHeight: 99, // should clamp to 56
      logoMobileHeight: 8, // should clamp to 16
    },
    { projectId: 'c1y2qdje', dataset: 'production' }
  );

  const withWebp = repo.getSiteSettings();
  assert.equal(
    withWebp.branding.logoUrl,
    'https://cdn.sanity.io/images/c1y2qdje/production/1234567890abcdef1234567890abcdef12345678-400x100.webp'
  );
  assert.equal(withWebp.branding.logoDesktopHeight, 56);
  assert.equal(withWebp.branding.logoMobileHeight, 16);

  // Remove logo and publish -> cleanly falls back to wordmark (logoUrl undefined)
  repo.applyPublishedSanitySiteSettings({
    _id: 'siteSettings',
    _type: 'siteSettings',
    siteName: 'Science of Gifts',
    logoAlt: '',
    logoDesktopHeight: 32,
    logoMobileHeight: 26,
  });

  const removed = repo.getSiteSettings();
  assert.equal(removed.branding.logoUrl, undefined);
  assert.equal(removed.branding.logoAlt, 'Science of Gifts');
});
