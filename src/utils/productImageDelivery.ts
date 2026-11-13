import {
  ImageFocalPoint,
  Product,
  ProductImage,
  ProductImageAspectRatio,
  ProductImageFitMode,
} from '../types/content';

export type ImageCdnProvider = 'unsplash' | 'sanity' | 'generic';

export type ImageDeliveryPreset =
  | 'thumbnail-xs'
  | 'thumbnail-sm'
  | 'spotlight-square'
  | 'card-portrait'
  | 'modal-portrait'
  | 'card-landscape'
  | 'feature-landscape'
  | 'hero-landscape';

export interface ImagePresetConfig {
  preset: ImageDeliveryPreset;
  aspectRatio: ProductImageAspectRatio;
  width: number;
  height: number;
  widths: number[];
  defaultWidth: number;
  quality: number;
  sizes: string;
  loading: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
}

export const IMAGE_DELIVERY_PRESETS: Record<
  ImageDeliveryPreset,
  ImagePresetConfig
> = {
  'thumbnail-xs': {
    preset: 'thumbnail-xs',
    aspectRatio: '1:1',
    width: 96,
    height: 96,
    widths: [96, 160],
    defaultWidth: 120,
    quality: 75,
    sizes: '64px',
    loading: 'lazy',
  },
  'thumbnail-sm': {
    preset: 'thumbnail-sm',
    aspectRatio: '1:1',
    width: 120,
    height: 120,
    widths: [120, 192, 240],
    defaultWidth: 160,
    quality: 76,
    sizes: '96px',
    loading: 'lazy',
  },
  'spotlight-square': {
    preset: 'spotlight-square',
    aspectRatio: '1:1',
    width: 320,
    height: 320,
    widths: [240, 360, 480],
    defaultWidth: 360,
    quality: 80,
    sizes: '(min-width: 640px) 220px, 90vw',
    loading: 'lazy',
  },
  'card-portrait': {
    preset: 'card-portrait',
    aspectRatio: '4:5',
    width: 480,
    height: 600,
    widths: [360, 540, 720, 900],
    defaultWidth: 540,
    quality: 80,
    sizes: '(min-width: 1280px) 300px, (min-width: 640px) 45vw, 92vw',
    loading: 'lazy',
  },
  'modal-portrait': {
    preset: 'modal-portrait',
    aspectRatio: '4:5',
    width: 600,
    height: 750,
    widths: [400, 600, 800],
    defaultWidth: 600,
    quality: 82,
    sizes: '(min-width: 768px) 400px, 92vw',
    loading: 'lazy',
  },
  'card-landscape': {
    preset: 'card-landscape',
    aspectRatio: '4:3',
    width: 560,
    height: 420,
    widths: [400, 600, 800],
    defaultWidth: 600,
    quality: 80,
    sizes: '(min-width: 1024px) 380px, (min-width: 768px) 46vw, 92vw',
    loading: 'lazy',
  },
  'feature-landscape': {
    preset: 'feature-landscape',
    aspectRatio: '4:3',
    width: 760,
    height: 570,
    widths: [480, 720, 960, 1200],
    defaultWidth: 760,
    quality: 82,
    sizes: '(min-width: 1024px) 560px, 92vw',
    loading: 'lazy',
  },
  'hero-landscape': {
    preset: 'hero-landscape',
    aspectRatio: '4:3',
    width: 840,
    height: 630,
    widths: [640, 840, 1120, 1440],
    defaultWidth: 840,
    quality: 85,
    sizes: '(min-width: 1024px) 592px, 94vw',
    loading: 'eager',
    fetchPriority: 'high',
  },
};

export const DEFAULT_FOCAL_POINT: ImageFocalPoint = { x: 0.5, y: 0.5 };
export const DEFAULT_FALLBACK_COLOR = '#F6F4EF';

export const PRODUCT_PHOTOGRAPHY_STANDARD = {
  masterAspectRatio: '1:1' as const,
  preferredMasterWidth: 2400,
  preferredMasterHeight: 2400,
  minimumMasterWidth: 1200,
  minimumMasterHeight: 1200,
  editorialHeroAspectRatio: '16:9' as const,
  preferredEditorialHeroWidth: 2400,
  preferredEditorialHeroHeight: 1350,
};

/**
 * Validates and clamps focal point coordinates to normalized [0, 1] bounds.
 * Falls back safely to { x: 0.5, y: 0.5 } if coordinates are missing or invalid.
 */
export function normalizeFocalPoint(
  focalPoint?: Partial<ImageFocalPoint> | null
): ImageFocalPoint {
  if (!focalPoint || typeof focalPoint !== 'object') {
    return { ...DEFAULT_FOCAL_POINT };
  }
  const rawX = focalPoint.x;
  const rawY = focalPoint.y;
  const x =
    typeof rawX === 'number' && Number.isFinite(rawX)
      ? Math.min(1, Math.max(0, rawX))
      : DEFAULT_FOCAL_POINT.x;
  const y =
    typeof rawY === 'number' && Number.isFinite(rawY)
      ? Math.min(1, Math.max(0, rawY))
      : DEFAULT_FOCAL_POINT.y;
  return { x, y };
}

/**
 * Checks whether a raw focal point object has valid [0, 1] numeric coordinates.
 */
export function isValidFocalPoint(
  focalPoint?: Partial<ImageFocalPoint> | null
): boolean {
  if (!focalPoint) return true;
  const { x, y } = focalPoint;
  if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 1) {
    return false;
  }
  if (typeof y !== 'number' || !Number.isFinite(y) || y < 0 || y > 1) {
    return false;
  }
  return true;
}

/**
 * Converts a normalized focal point into a CSS `object-position` value (e.g. "50% 50%").
 */
export function resolveFocalPointObjectPosition(
  focalPoint?: Partial<ImageFocalPoint> | null
): string {
  const normalized = normalizeFocalPoint(focalPoint);
  const pctX = Math.round(normalized.x * 1000) / 10;
  const pctY = Math.round(normalized.y * 1000) / 10;
  return `${pctX}% ${pctY}%`;
}

/**
 * Determines the effective fit mode ('cover' by default, or 'contain' for tall/irregular objects).
 */
export function resolveProductImageFitMode(
  fitMode?: ProductImageFitMode | null
): ProductImageFitMode {
  return fitMode === 'contain' ? 'contain' : 'cover';
}

/**
 * Selects the appropriate source URL for a product image placement:
 * - Uses `portraitOverrideUrl` for 4:5 placements when provided
 * - Uses `landscapeOverrideUrl` for 4:3 or 16:10 placements when provided
 * - Uses `url` (the 1:1 square master) otherwise
 */
export function selectProductImageSourceUrl(
  image?: Pick<
    ProductImage,
    'url' | 'landscapeOverrideUrl' | 'portraitOverrideUrl'
  > | null,
  aspectRatio?: ProductImageAspectRatio
): string {
  if (!image) return '';
  const portraitOverride = image.portraitOverrideUrl?.trim();
  const landscapeOverride = image.landscapeOverrideUrl?.trim();

  if (aspectRatio === '4:5' && portraitOverride) {
    return portraitOverride;
  }
  if (
    (aspectRatio === '4:3' || aspectRatio === '16:10') &&
    landscapeOverride
  ) {
    return landscapeOverride;
  }
  return (image.url ?? '').trim();
}

/**
 * Detects whether a URL belongs to a known image CDN that supports real server-side
 * width/quality/format query parameters. Never fabricates parameters for unknown hosts.
 */
export function detectImageCdnProvider(rawUrl: string): ImageCdnProvider {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) return 'generic';
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (host === 'images.unsplash.com' || host.endsWith('.unsplash.com')) {
      return 'unsplash';
    }
    if (host === 'cdn.sanity.io') {
      return 'sanity';
    }
    return 'generic';
  } catch {
    return 'generic';
  }
}

export interface TransformUrlOptions {
  width: number;
  quality?: number;
  fitMode?: ProductImageFitMode;
  focalPoint?: ImageFocalPoint;
}

/**
 * Builds a provider-verified resized derivative URL when the host is a supported CDN
 * (`images.unsplash.com` or `cdn.sanity.io`). Leaves unknown or local URLs untouched.
 */
export function buildTransformedImageUrl(
  rawUrl: string,
  options: TransformUrlOptions
): string {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) return '';

  const provider = detectImageCdnProvider(trimmed);
  if (provider === 'generic') {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const targetWidth = Math.max(32, Math.round(options.width));
    const quality = Math.min(100, Math.max(40, Math.round(options.quality ?? 80)));
    const fitMode = resolveProductImageFitMode(options.fitMode);
    const fp = normalizeFocalPoint(options.focalPoint);
    const hasCustomFocalPoint =
      Math.abs(fp.x - 0.5) > 0.005 || Math.abs(fp.y - 0.5) > 0.005;

    if (provider === 'unsplash') {
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', fitMode === 'contain' ? 'max' : 'crop');
      parsed.searchParams.set('w', String(targetWidth));
      parsed.searchParams.set('q', String(quality));
      if (hasCustomFocalPoint && fitMode === 'cover') {
        parsed.searchParams.set('crop', 'focalpoint');
        parsed.searchParams.set('fp-x', String(Number(fp.x.toFixed(3))));
        parsed.searchParams.set('fp-y', String(Number(fp.y.toFixed(3))));
      }
      return parsed.toString();
    }

    if (provider === 'sanity') {
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('w', String(targetWidth));
      parsed.searchParams.set('q', String(quality));
      parsed.searchParams.set('fit', fitMode === 'contain' ? 'max' : 'crop');
      if (hasCustomFocalPoint && fitMode === 'cover') {
        parsed.searchParams.set('crop', 'focalpoint');
        parsed.searchParams.set('fp-x', String(Number(fp.x.toFixed(3))));
        parsed.searchParams.set('fp-y', String(Number(fp.y.toFixed(3))));
      }
      return parsed.toString();
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}

export interface ResolveProductImageDeliveryOptions {
  preset?: ImageDeliveryPreset;
  aspectRatio?: ProductImageAspectRatio;
  srcOverride?: string;
  altOverride?: string;
  fallbackColorOverride?: string;
  focalPointOverride?: Partial<ImageFocalPoint>;
  fitModeOverride?: ProductImageFitMode;
  widthOverride?: number;
  heightOverride?: number;
  sizesOverride?: string;
  loadingOverride?: 'lazy' | 'eager';
  fetchPriorityOverride?: 'high' | 'low' | 'auto';
}

export interface ResolvedProductImageDelivery {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  fallbackColor: string;
  fitMode: ProductImageFitMode;
  focalPoint: ImageFocalPoint;
  objectPosition: string;
  aspectRatio: ProductImageAspectRatio;
  width: number;
  height: number;
  loading: 'lazy' | 'eager';
  decoding: 'async';
  fetchPriority?: 'high' | 'low' | 'auto';
  provider: ImageCdnProvider;
  usedOverrideUrl: 'landscape' | 'portrait' | 'none';
}

/**
 * Central framework-neutral resolver that computes the final `src`, responsive `srcSet`,
 * `sizes`, `width`, `height`, `objectPosition`, `fitMode`, and `fallbackColor` for any
 * product image placement across Astro and React components.
 */
export function resolveProductImageDelivery(
  image?: Partial<ProductImage> | null,
  options: ResolveProductImageDeliveryOptions = {}
): ResolvedProductImageDelivery {
  const presetKey: ImageDeliveryPreset = options.preset ?? 'card-portrait';
  const presetConfig = IMAGE_DELIVERY_PRESETS[presetKey];
  const aspectRatio: ProductImageAspectRatio =
    options.aspectRatio ?? presetConfig.aspectRatio;

  const fitMode = resolveProductImageFitMode(
    options.fitModeOverride ?? image?.fitMode
  );
  const focalPoint = normalizeFocalPoint(
    options.focalPointOverride ?? image?.focalPoint
  );
  const objectPosition = resolveFocalPointObjectPosition(focalPoint);
  const fallbackColor =
    (options.fallbackColorOverride || image?.fallbackColor || '').trim() ||
    DEFAULT_FALLBACK_COLOR;
  const alt =
    (options.altOverride ?? image?.alt ?? '').trim() ||
    'Gift editorial photograph';

  let rawUrl = (options.srcOverride ?? '').trim();
  let usedOverrideUrl: 'landscape' | 'portrait' | 'none' = 'none';

  if (!rawUrl && image) {
    const portraitOverride = image.portraitOverrideUrl?.trim();
    const landscapeOverride = image.landscapeOverrideUrl?.trim();
    if (aspectRatio === '4:5' && portraitOverride) {
      rawUrl = portraitOverride;
      usedOverrideUrl = 'portrait';
    } else if (
      (aspectRatio === '4:3' || aspectRatio === '16:10') &&
      landscapeOverride
    ) {
      rawUrl = landscapeOverride;
      usedOverrideUrl = 'landscape';
    } else {
      rawUrl = (image.url ?? (image as any).externalUrl ?? '').trim();
    }

    if (!rawUrl) {
      const assetRef =
        (typeof image.sanityAssetId === 'string' && image.sanityAssetId.trim()) ||
        (typeof image.asset?.asset?._ref === 'string' && image.asset.asset._ref.trim()) ||
        (typeof (image.asset as any)?._ref === 'string' && (image.asset as any)._ref.trim()) ||
        '';
      const match = /^image-([a-zA-Z0-9_]+)-(\d+x\d+)-([a-zA-Z0-9]+)$/.exec(assetRef);
      if (match) {
        const [, assetHash, dimensions, format] = match;
        const proj =
          (typeof process !== 'undefined' && process.env?.SANITY_STUDIO_PROJECT_ID) ||
          'c1y2qdje';
        const ds =
          (typeof process !== 'undefined' && process.env?.SANITY_STUDIO_DATASET) ||
          'production';
        rawUrl = `https://cdn.sanity.io/images/${proj}/${ds}/${assetHash}-${dimensions}.${format}`;
      }
    }
  }

  const provider = detectImageCdnProvider(rawUrl);
  const width = options.widthOverride ?? presetConfig.width;
  const height = options.heightOverride ?? presetConfig.height;
  const loading = options.loadingOverride ?? presetConfig.loading;
  const fetchPriority =
    options.fetchPriorityOverride ?? presetConfig.fetchPriority;

  if (!rawUrl) {
    return {
      src: '',
      srcSet: undefined,
      sizes: undefined,
      alt,
      fallbackColor,
      fitMode,
      focalPoint,
      objectPosition,
      aspectRatio,
      width,
      height,
      loading,
      decoding: 'async',
      fetchPriority,
      provider: 'generic',
      usedOverrideUrl,
    };
  }

  if (provider === 'generic') {
    return {
      src: rawUrl,
      srcSet: undefined,
      sizes: options.sizesOverride,
      alt,
      fallbackColor,
      fitMode,
      focalPoint,
      objectPosition,
      aspectRatio,
      width,
      height,
      loading,
      decoding: 'async',
      fetchPriority,
      provider,
      usedOverrideUrl,
    };
  }

  const primarySrc = buildTransformedImageUrl(rawUrl, {
    width: presetConfig.defaultWidth,
    quality: presetConfig.quality,
    fitMode,
    focalPoint,
  });

  const srcSetEntries = presetConfig.widths.map((w) => {
    const derivativeUrl = buildTransformedImageUrl(rawUrl, {
      width: w,
      quality: presetConfig.quality,
      fitMode,
      focalPoint,
    });
    return `${derivativeUrl} ${w}w`;
  });

  return {
    src: primarySrc,
    srcSet: srcSetEntries.join(', '),
    sizes: options.sizesOverride ?? presetConfig.sizes,
    alt,
    fallbackColor,
    fitMode,
    focalPoint,
    objectPosition,
    aspectRatio,
    width,
    height,
    loading,
    decoding: 'async',
    fetchPriority,
    provider,
    usedOverrideUrl,
  };
}

export type ProductImageValidationIssueCode =
  | 'MISSING_IMAGE_URL'
  | 'MISSING_IMAGE_ALT'
  | 'PLACEHOLDER_IMAGE_DOMAIN'
  | 'SAMPLE_IMAGE_ASSET'
  | 'INVALID_FOCAL_POINT'
  | 'SUBOPTIMAL_IMAGE_DIMENSIONS';

export interface ProductImageValidationIssue {
  severity: 'error' | 'warning';
  code: ProductImageValidationIssueCode;
  productId: string;
  imageId: string;
  message: string;
}

const KNOWN_PLACEHOLDER_DOMAINS = new Set([
  'images.unsplash.com',
  'unsplash.com',
  'plus.unsplash.com',
  'example.com',
  'www.example.com',
  'placehold.co',
  'via.placeholder.com',
  'picsum.photos',
  'dummyimage.com',
]);

export function isPlaceholderOrSampleImageUrl(rawUrl: string): {
  isPlaceholderDomain: boolean;
  hostname?: string;
} {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) return { isPlaceholderDomain: false };
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (KNOWN_PLACEHOLDER_DOMAINS.has(host)) {
      return { isPlaceholderDomain: true, hostname: host };
    }
    return { isPlaceholderDomain: false, hostname: host };
  } catch {
    return { isPlaceholderDomain: false };
  }
}

export interface ValidateProductImageOptions {
  /** When true, treats sample/placeholder images as errors for strict production readiness checks */
  strictProduction?: boolean;
}

/**
 * Validates a single product's images against the Science of Gifts photography standard.
 * Non-destructive in development (emits warnings for sample/placeholder assets so builds succeed),
 * and supports `strictProduction: true` to block unverified placeholder assets before launch.
 */
export function validateProductImagesForProduct(
  product: Pick<Product, 'id' | 'title' | 'images'>,
  options: ValidateProductImageOptions = {}
): ProductImageValidationIssue[] {
  const issues: ProductImageValidationIssue[] = [];
  const sampleSeverity = options.strictProduction ? 'error' : 'warning';

  if (!product.images || product.images.length === 0) {
    issues.push({
      severity: 'error',
      code: 'MISSING_IMAGE_URL',
      productId: product.id,
      imageId: 'none',
      message: `Product "${product.id}" has no images defined.`,
    });
    return issues;
  }

  for (const img of product.images) {
    const imgId = img.id || 'unnamed_image';
    const trimmedUrl = (img.url ?? '').trim();
    const trimmedAlt = (img.alt ?? '').trim();

    if (!trimmedUrl) {
      issues.push({
        severity: 'error',
        code: 'MISSING_IMAGE_URL',
        productId: product.id,
        imageId: imgId,
        message: `Product "${product.id}" image "${imgId}" is missing a valid URL.`,
      });
    } else {
      const domainCheck = isPlaceholderOrSampleImageUrl(trimmedUrl);
      if (domainCheck.isPlaceholderDomain) {
        issues.push({
          severity: sampleSeverity,
          code: 'PLACEHOLDER_IMAGE_DOMAIN',
          productId: product.id,
          imageId: imgId,
          message: `Product "${product.id}" image "${imgId}" uses stock/placeholder domain "${domainCheck.hostname}". Replace with a 2400×2400 square master photograph before production.`,
        });
      }
    }

    if (!trimmedAlt) {
      issues.push({
        severity: 'error',
        code: 'MISSING_IMAGE_ALT',
        productId: product.id,
        imageId: imgId,
        message: `Product "${product.id}" image "${imgId}" is missing accessible alt text.`,
      });
    }

    if (img.isSampleAsset === true) {
      issues.push({
        severity: sampleSeverity,
        code: 'SAMPLE_IMAGE_ASSET',
        productId: product.id,
        imageId: imgId,
        message: `Product "${product.id}" image "${imgId}" is marked isSampleAsset: true.`,
      });
    }

    if (img.focalPoint && !isValidFocalPoint(img.focalPoint)) {
      issues.push({
        severity: 'warning',
        code: 'INVALID_FOCAL_POINT',
        productId: product.id,
        imageId: imgId,
        message: `Product "${product.id}" image "${imgId}" has out-of-range focalPoint (${JSON.stringify(
          img.focalPoint
        )}). Coordinates must be between 0 and 1.`,
      });
    }

    if (
      typeof img.width === 'number' &&
      typeof img.height === 'number' &&
      (img.width > 0 || img.height > 0)
    ) {
      if (img.width !== img.height) {
        issues.push({
          severity: 'warning',
          code: 'SUBOPTIMAL_IMAGE_DIMENSIONS',
          productId: product.id,
          imageId: imgId,
          message: `Product "${product.id}" image "${imgId}" master dimensions (${img.width}×${img.height}) are not 1:1 square. Standard master size is 2400×2400px.`,
        });
      } else if (
        img.width < PRODUCT_PHOTOGRAPHY_STANDARD.minimumMasterWidth ||
        img.height < PRODUCT_PHOTOGRAPHY_STANDARD.minimumMasterHeight
      ) {
        issues.push({
          severity: 'warning',
          code: 'SUBOPTIMAL_IMAGE_DIMENSIONS',
          productId: product.id,
          imageId: imgId,
          message: `Product "${product.id}" image "${imgId}" master dimensions (${img.width}×${img.height}) are below the 1200×1200px minimum (2400×2400px recommended).`,
        });
      }
    }
  }

  return issues;
}

/**
 * Audits all products in a catalog for photography standard compliance.
 */
export function validateProductImagesCatalog(
  products: Array<Pick<Product, 'id' | 'title' | 'images'>>,
  options: ValidateProductImageOptions = {}
): {
  passed: boolean;
  errorCount: number;
  warningCount: number;
  issues: ProductImageValidationIssue[];
} {
  const issues: ProductImageValidationIssue[] = [];
  for (const product of products) {
    issues.push(...validateProductImagesForProduct(product, options));
  }
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  return {
    passed: errorCount === 0,
    errorCount,
    warningCount,
    issues,
  };
}
