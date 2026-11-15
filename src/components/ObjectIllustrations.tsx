import React, { useEffect, useRef, useState } from 'react';
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

const EditorialStillLifePlaceholder: React.FC<{
  alt: string;
  fallbackColor: string;
  isCompactThumbnail: boolean;
  className: string;
}> = ({ alt, fallbackColor, isCompactThumbnail, className }) => {
  const safeBg = fallbackColor || '#F3ECE1';

  return (
    <div
      role="img"
      aria-label={alt}
      data-photo-placeholder="true"
      style={{
        backgroundColor: safeBg,
        backgroundImage:
          'radial-gradient(circle at 50% 38%, rgba(250, 249, 246, 0.76) 0%, rgba(243, 236, 225, 0.62) 65%, rgba(227, 225, 219, 0.48) 100%)',
      }}
      className={`relative flex items-center justify-center overflow-hidden text-[#1B3D5F] ${
        isCompactThumbnail ? 'p-2' : 'p-6'
      } ${className}`}
    >
      {!isCompactThumbnail && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-3 rounded-xl border border-[#1B3D5F]/12"
        />
      )}

      {isCompactThumbnail ? (
        <svg
          viewBox="0 0 36 36"
          fill="none"
          aria-hidden="true"
          className="w-6 h-6 text-[#1B3D5F]/65"
        >
          <rect
            x="7"
            y="14"
            width="22"
            height="15"
            rx="2.5"
            fill="#FAF9F6"
            fillOpacity="0.85"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M5.5 11.5C5.5 10.67 6.17 10 7 10H29C29.83 10 30.5 10.67 30.5 11.5V14H5.5V11.5Z"
            fill="#E5F3EC"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M18 10V29" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M18 10C16 6.8 12.2 6.8 11.8 8.8C11.5 10.1 14.5 10.3 18 10ZM18 10C20 6.8 23.8 6.8 24.2 8.8C24.5 10.1 21.5 10.3 18 10Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 180 180"
          fill="none"
          aria-hidden="true"
          className="w-[54%] max-w-[138px] h-auto text-[#1B3D5F]/75 drop-shadow-[0_1px_1px_rgba(27,61,95,0.06)]"
        >
          <ellipse
            cx="90"
            cy="140"
            rx="54"
            ry="8"
            fill="#1B3D5F"
            fillOpacity="0.06"
          />
          <path
            d="M46 136V76C46 51.7 65.7 32 90 32C114.3 32 134 51.7 134 76V136"
            stroke="currentColor"
            strokeOpacity="0.16"
            strokeWidth="1.25"
          />
          <path
            d="M116 135C117 109 124 85 133 65"
            stroke="#28537D"
            strokeOpacity="0.55"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M120 105C111 101 107 94 111 89C117 91 121 97 120 105Z"
            fill="#E5F3EC"
            stroke="#28537D"
            strokeOpacity="0.5"
            strokeWidth="1.2"
          />
          <path
            d="M126 86C134 83 139 76 136 71C129 73 125 79 126 86Z"
            fill="#E5F3EC"
            stroke="#28537D"
            strokeOpacity="0.5"
            strokeWidth="1.2"
          />
          <path
            d="M66 76H96L100 84V133C100 135.76 97.76 138 95 138H67C64.24 138 62 135.76 62 133V84L66 76Z"
            fill="#FAF9F6"
            fillOpacity="0.92"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <rect
            x="64"
            y="68"
            width="34"
            height="8"
            rx="2"
            fill="#FFF8E7"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <rect
            x="70"
            y="95"
            width="22"
            height="24"
            rx="2"
            fill="#F3ECE1"
            stroke="currentColor"
            strokeOpacity="0.45"
            strokeWidth="1.2"
          />
          <path
            d="M75 104H87M75 110H84"
            stroke="currentColor"
            strokeOpacity="0.5"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M93 120H129C129 130.5 121 138 111 138C101 138 93 130.5 93 120Z"
            fill="#FAF9F6"
            fillOpacity="0.95"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
};

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
  const imgRef = useRef<HTMLImageElement | null>(null);

  const resolved = resolveProductImageDelivery(image, {
    preset,
    aspectRatio,
    srcOverride: src,
    altOverride: alt,
    fallbackColorOverride: fallbackColor ?? '#F3ECE1',
    focalPointOverride: focalPoint,
    fitModeOverride: fitMode,
    widthOverride: width,
    heightOverride: height,
    sizesOverride: sizes,
    loadingOverride: loading,
    fetchPriorityOverride: fetchPriority,
  });

  useEffect(() => {
    setHasError(false);
  }, [resolved.src]);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const sibling = el.parentElement?.querySelector('[data-sog-ssr-fallback="true"]');
    if (sibling) {
      sibling.remove();
    }
    if (
      el.dataset.sogError === 'true' ||
      (el.complete && el.naturalWidth === 0)
    ) {
      setHasError(true);
    }
  }, [resolved.src]);

  const isCompactThumbnail =
    preset === 'thumbnail-xs' ||
    preset === 'thumbnail-sm' ||
    resolved.width <= 120;

  if (hasError || !resolved.src) {
    return (
      <EditorialStillLifePlaceholder
        alt={resolved.alt}
        fallbackColor={resolved.fallbackColor}
        isCompactThumbnail={isCompactThumbnail}
        className={className}
      />
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
      ref={imgRef}
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
      data-sog-photo="true"
      data-fallback-color={resolved.fallbackColor}
      data-compact-thumb={isCompactThumbnail ? 'true' : 'false'}
      data-fit-mode={resolved.fitMode}
      data-aspect-ratio={resolved.aspectRatio}
      style={imgStyle}
      onError={() => setHasError(true)}
      className={effectiveClassName}
    />
  );
};
