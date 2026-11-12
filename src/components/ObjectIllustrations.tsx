import React, { useState } from 'react';
import { Gift } from 'lucide-react';
import {
  ImageFocalPoint,
  ProductImage,
  ProductImageAspectRatio,
  ProductImageFitMode,
} from '../types/content';
import {
  ImageDeliveryPreset,
  resolveProductImageDelivery,
} from '../utils/productImageDelivery';

export interface PhotoImageProps {
  /** Optional structured ProductImage record (supports focalPoint, fitMode, and aspect-ratio override URLs) */
  image?: Partial<ProductImage> | null;
  /** Direct source URL (used when `image` is not passed or as an explicit override) */
  src?: string;
  alt?: string;
  fallbackColor?: string;
  className?: string;
  /** Standardized image delivery preset ('thumbnail-xs', 'thumbnail-sm', 'card-portrait', 'card-landscape', 'feature-landscape', 'hero-landscape', etc.) */
  preset?: ImageDeliveryPreset;
  /** Target container aspect ratio ('1:1', '4:5', '4:3', '16:10') */
  aspectRatio?: ProductImageAspectRatio;
  /** Optional normalized focal point override ({ x: 0..1, y: 0..1 }) */
  focalPoint?: Partial<ImageFocalPoint>;
  /** Optional fit mode override ('cover' | 'contain') */
  fitMode?: ProductImageFitMode;
  width?: number;
  height?: number;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
}

export const PhotoImage: React.FC<PhotoImageProps> = ({
  image,
  src,
  alt,
  fallbackColor,
  className = 'w-full h-full object-cover',
  preset = 'card-portrait',
  aspectRatio,
  focalPoint,
  fitMode,
  width,
  height,
  sizes,
  loading,
  fetchPriority,
}) => {
  const [hasError, setHasError] = useState(false);

  const resolved = resolveProductImageDelivery(image, {
    preset,
    aspectRatio,
    srcOverride: src,
    altOverride: alt,
    fallbackColorOverride: fallbackColor ?? '#EBF3FE',
    focalPointOverride: focalPoint,
    fitModeOverride: fitMode,
    widthOverride: width,
    heightOverride: height,
    sizesOverride: sizes,
    loadingOverride: loading,
    fetchPriorityOverride: fetchPriority,
  });

  const isCompactThumbnail =
    preset === 'thumbnail-xs' ||
    preset === 'thumbnail-sm' ||
    resolved.width <= 120;

  if (hasError || !resolved.src) {
    return (
      <div
        role="img"
        aria-label={resolved.alt}
        style={{ backgroundColor: resolved.fallbackColor }}
        className={`flex flex-col items-center justify-center text-center text-[#1B3D5F] ${
          isCompactThumbnail ? 'p-1.5' : 'p-6'
        } ${className}`}
      >
        <Gift
          className={
            isCompactThumbnail
              ? 'w-4 h-4 opacity-65'
              : 'w-8 h-8 mb-2 opacity-65'
          }
        />
        {!isCompactThumbnail && (
          <>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#28537D] mb-1">
              Sample Image Placeholder
            </span>
            <span className="text-xs font-serif italic max-w-[24ch] line-clamp-2 opacity-85">
              {resolved.alt}
            </span>
          </>
        )}
      </div>
    );
  }

  const effectiveClassName =
    resolved.fitMode === 'contain'
      ? `${className.replace(/\bobject-cover\b/g, '').trim()} object-contain`.trim()
      : className.includes('object-')
        ? className
        : `${className} object-cover`.trim();

  const imgStyle: React.CSSProperties =
    resolved.fitMode === 'contain'
      ? {
          objectFit: 'contain',
          objectPosition: resolved.objectPosition,
          backgroundColor: resolved.fallbackColor,
        }
      : {
          objectPosition: resolved.objectPosition,
        };

  return (
    <img
      src={resolved.src}
      srcSet={resolved.srcSet}
      sizes={resolved.sizes}
      alt={resolved.alt}
      width={resolved.width}
      height={resolved.height}
      referrerPolicy="no-referrer"
      loading={resolved.loading}
      decoding={resolved.decoding}
      fetchPriority={resolved.fetchPriority}
      data-fit-mode={resolved.fitMode}
      data-aspect-ratio={resolved.aspectRatio}
      style={imgStyle}
      onError={() => setHasError(true)}
      className={effectiveClassName}
    />
  );
};
