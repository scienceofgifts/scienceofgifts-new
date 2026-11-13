import React, { useCallback, useId, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductImage } from '../../types/content';
import { PhotoImage } from '../ObjectIllustrations';
import {
  DEFAULT_FALLBACK_COLOR,
  resolveProductImageDelivery,
} from '../../utils/productImageDelivery';

export interface ProductMediaGalleryProps {
  images: ProductImage[];
  productTitle: string;
  productType?: string;
  className?: string;
}

const DEFAULT_PLACEHOLDER_IMAGE: ProductImage = {
  id: 'placeholder_img_01',
  url: '',
  alt: 'Product editorial photograph',
  fitMode: 'cover',
  fallbackColor: DEFAULT_FALLBACK_COLOR,
};

/**
 * Editorial Product Media Gallery for Science of Gifts.
 *
 * - Single-image mode (`images.length <= 1`):
 *   Renders a clean editorial `<figure>` with zero unnecessary gallery chrome
 *   (no prev/next arrows, no slide counter, no thumbnail rail).
 * - Multi-image mode (`images.length > 1`):
 *   Renders a large primary stage, keyboard-accessible Previous / Next controls,
 *   responsive `srcSet`/`sizes` delivery, preserved `focalPoint` (`objectPosition`)
 *   and `fitMode` (`cover` vs `contain` for mixed aspect ratios), accessible captions,
 *   and a lazy-loaded thumbnail navigation strip.
 * - Includes progressive-enhancement client script attributes (`data-product-gallery-root`)
 *   so static Astro product pages (`/products/[slug]/`) and interactive React views
 *   both support full thumbnail, button, and keyboard navigation.
 */
export const ProductMediaGallery: React.FC<ProductMediaGalleryProps> = ({
  images,
  productTitle,
  productType,
  className = '',
}) => {
  const galleryId = useId().replace(/:/g, '');
  const validImages: ProductImage[] =
    Array.isArray(images) && images.length > 0
      ? images
      : [
          {
            ...DEFAULT_PLACEHOLDER_IMAGE,
            alt: `${productTitle} photograph`,
          },
        ];

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const safeIndex =
    activeIndex >= 0 && activeIndex < validImages.length ? activeIndex : 0;
  const activeImage = validImages[safeIndex] || validImages[0];
  const hasMultipleImages = validImages.length > 1;

  const handlePrevious = useCallback(() => {
    setActiveIndex((prev) =>
      prev <= 0 ? validImages.length - 1 : prev - 1
    );
  }, [validImages.length]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) =>
      prev >= validImages.length - 1 ? 0 : prev + 1
    );
  }, [validImages.length]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (!hasMultipleImages) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      } else if (event.key === 'Home') {
        event.preventDefault();
        setActiveIndex(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setActiveIndex(validImages.length - 1);
      }
    },
    [hasMultipleImages, handlePrevious, handleNext, validImages.length]
  );

  // Clean single-image presentation (no unnecessary gallery controls)
  if (!hasMultipleImages) {
    const singleCaption =
      activeImage.caption ||
      (productType ? `${productTitle} (${productType})` : productTitle);

    return (
      <figure
        data-product-gallery-single="true"
        className={`overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] ${className}`.trim()}
      >
        <div
          className="aspect-[4/3] w-full overflow-hidden bg-[#F6F4EF]"
          style={{
            backgroundColor: activeImage.fallbackColor || DEFAULT_FALLBACK_COLOR,
          }}
        >
          <PhotoImage
            image={activeImage}
            preset="hero-landscape"
            aspectRatio="4:3"
            width={840}
            height={630}
            loading="eager"
            fetchPriority="high"
            className={`h-full w-full ${
              activeImage.fitMode === 'contain' ? 'object-contain p-3' : 'object-cover'
            }`}
          />
        </div>
        <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E3E1DB] bg-[#FFFFFF] px-5 py-3 text-xs text-[#636A6F]">
          <span>{singleCaption}</span>
          {Boolean(activeImage.isSampleAsset) && (
            <span className="text-[11px] text-[#636A6F]">
              Sample preview photography
            </span>
          )}
        </figcaption>
      </figure>
    );
  }

  // Pre-resolve delivery metadata for all slides so static Astro pages can switch slides smoothly
  const resolvedSlides = validImages.map((img, idx) => {
    const resolved = resolveProductImageDelivery(img, {
      preset: 'hero-landscape',
      aspectRatio: '4:3',
      widthOverride: 840,
      heightOverride: 630,
      loadingOverride: idx === 0 ? 'eager' : 'lazy',
      fetchPriorityOverride: idx === 0 ? 'high' : 'auto',
    });
    const caption =
      img.caption ||
      (idx === 0 && productType
        ? `${productTitle} (${productType})`
        : `${productTitle} — Photograph ${idx + 1} of ${validImages.length}`);
    return {
      image: img,
      resolved,
      caption,
    };
  });

  const currentSlide = resolvedSlides[safeIndex] || resolvedSlides[0];

  // Inline progressive enhancement script for static Astro pages
  const inlineGalleryScript = `
(function() {
  var root = document.getElementById('product-gallery-${galleryId}');
  if (!root || root.dataset.galleryEnhanced === 'true') return;
  root.dataset.galleryEnhanced = 'true';

  var slidesDataRaw = root.getAttribute('data-gallery-slides');
  if (!slidesDataRaw) return;
  var slides = [];
  try { slides = JSON.parse(slidesDataRaw); } catch (e) { return; }
  if (!slides || slides.length <= 1) return;

  var currentIndex = 0;
  var mainImg = root.querySelector('[data-gallery-main-img]');
  var stageBox = root.querySelector('[data-gallery-stage]');
  var captionText = root.querySelector('[data-gallery-caption]');
  var counterText = root.querySelector('[data-gallery-counter]');
  var sampleBadge = root.querySelector('[data-gallery-sample-badge]');
  var thumbBtns = Array.prototype.slice.call(root.querySelectorAll('[data-gallery-thumb-index]'));
  var prevBtn = root.querySelector('[data-gallery-prev]');
  var nextBtn = root.querySelector('[data-gallery-next]');

  function setSlide(nextIdx) {
    if (nextIdx < 0) nextIdx = slides.length - 1;
    if (nextIdx >= slides.length) nextIdx = 0;
    currentIndex = nextIdx;
    var slide = slides[currentIndex];
    if (!slide) return;

    if (mainImg) {
      if (slide.src) mainImg.setAttribute('src', slide.src);
      if (slide.srcSet) {
        mainImg.setAttribute('srcset', slide.srcSet);
      } else {
        mainImg.removeAttribute('srcset');
      }
      if (slide.sizes) mainImg.setAttribute('sizes', slide.sizes);
      mainImg.setAttribute('alt', slide.alt || '');
      mainImg.style.objectFit = slide.fitMode === 'contain' ? 'contain' : 'cover';
      mainImg.style.objectPosition = slide.objectPosition || '50% 50%';
      mainImg.style.backgroundColor = slide.fallbackColor || '#F6F4EF';
      mainImg.classList.toggle('object-contain', slide.fitMode === 'contain');
      mainImg.classList.toggle('p-3', slide.fitMode === 'contain');
      mainImg.classList.toggle('object-cover', slide.fitMode !== 'contain');
    }
    if (stageBox) {
      stageBox.style.backgroundColor = slide.fallbackColor || '#F6F4EF';
    }
    if (captionText) {
      captionText.textContent = slide.caption || '';
    }
    if (counterText) {
      counterText.textContent = (currentIndex + 1) + ' / ' + slides.length;
    }
    if (sampleBadge) {
      sampleBadge.style.display = slide.isSampleAsset ? '' : 'none';
    }
    thumbBtns.forEach(function(btn, idx) {
      var isSelected = idx === currentIndex;
      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      if (isSelected) {
        btn.classList.add('ring-2', 'ring-[#1B3D5F]', 'border-[#1B3D5F]', 'opacity-100');
        btn.classList.remove('border-[#E3E1DB]', 'opacity-75');
      } else {
        btn.classList.remove('ring-2', 'ring-[#1B3D5F]', 'border-[#1B3D5F]', 'opacity-100');
        btn.classList.add('border-[#E3E1DB]', 'opacity-75');
      }
    });
  }

  if (prevBtn) prevBtn.addEventListener('click', function() { setSlide(currentIndex - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function() { setSlide(currentIndex + 1); });
  thumbBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(btn.getAttribute('data-gallery-thumb-index') || '0', 10);
      setSlide(idx);
    });
  });
  root.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setSlide(currentIndex - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setSlide(currentIndex + 1); }
    else if (e.key === 'Home') { e.preventDefault(); setSlide(0); }
    else if (e.key === 'End') { e.preventDefault(); setSlide(slides.length - 1); }
  });
})();
  `.trim();

  const serializedSlides = JSON.stringify(
    resolvedSlides.map((s) => ({
      src: s.resolved.src,
      srcSet: s.resolved.srcSet,
      sizes: s.resolved.sizes,
      alt: s.resolved.alt,
      fitMode: s.resolved.fitMode,
      objectPosition: s.resolved.objectPosition,
      fallbackColor: s.resolved.fallbackColor,
      caption: s.caption,
      isSampleAsset: Boolean(s.image.isSampleAsset),
    }))
  );

  return (
    <div
      id={`product-gallery-${galleryId}`}
      data-product-gallery-root="true"
      data-gallery-count={validImages.length}
      data-gallery-slides={serializedSlides}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label={`${productTitle} photo gallery (${validImages.length} photographs)`}
      onKeyDown={handleKeyDown}
      className={`space-y-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B3D5F]/40 rounded-2xl ${className}`.trim()}
    >
      {/* Primary Stage Figure */}
      <figure className="relative overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF]">
        <div
          data-gallery-stage="true"
          className="relative aspect-[4/3] w-full overflow-hidden bg-[#F6F4EF] transition-colors duration-200"
          style={{
            backgroundColor:
              currentSlide.resolved.fallbackColor || DEFAULT_FALLBACK_COLOR,
          }}
        >
          {currentSlide.resolved.src ? (
            <img
              data-gallery-main-img="true"
              src={currentSlide.resolved.src}
              srcSet={currentSlide.resolved.srcSet}
              sizes={currentSlide.resolved.sizes}
              alt={currentSlide.resolved.alt}
              width={currentSlide.resolved.width}
              height={currentSlide.resolved.height}
              loading={safeIndex === 0 ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={safeIndex === 0 ? 'high' : 'auto'}
              className={`h-full w-full transition-all duration-200 ${
                currentSlide.resolved.fitMode === 'contain'
                  ? 'object-contain p-3'
                  : 'object-cover'
              }`}
              style={{
                objectFit:
                  currentSlide.resolved.fitMode === 'contain'
                    ? 'contain'
                    : 'cover',
                objectPosition: currentSlide.resolved.objectPosition,
                backgroundColor: currentSlide.resolved.fallbackColor,
              }}
            />
          ) : (
            <PhotoImage
              image={currentSlide.image}
              preset="hero-landscape"
              aspectRatio="4:3"
              width={840}
              height={630}
              loading={safeIndex === 0 ? 'eager' : 'lazy'}
              fetchPriority={safeIndex === 0 ? 'high' : 'auto'}
              className="h-full w-full"
            />
          )}

          {/* Previous / Next Controls */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-3">
            <button
              type="button"
              data-gallery-prev="true"
              onClick={handlePrevious}
              aria-label="Previous product photograph"
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-[#E3E1DB] bg-[#FFFFFF]/90 text-[#24282B] shadow-xs backdrop-blur-xs transition-all hover:bg-[#FFFFFF] hover:text-[#1B3D5F] focus:outline-none focus:ring-2 focus:ring-[#1B3D5F]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              data-gallery-next="true"
              onClick={handleNext}
              aria-label="Next product photograph"
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-[#E3E1DB] bg-[#FFFFFF]/90 text-[#24282B] shadow-xs backdrop-blur-xs transition-all hover:bg-[#FFFFFF] hover:text-[#1B3D5F] focus:outline-none focus:ring-2 focus:ring-[#1B3D5F]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Slide Counter Badge */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className=" absolute bottom-3 right-3 rounded-md border border-[#E3E1DB]/80 bg-[#FFFFFF]/92 px-2.5 py-1 text-[11px] font-medium tracking-wide text-[#24282B] shadow-2xs backdrop-blur-xs"
          >
            <span data-gallery-counter="true">
              {safeIndex + 1} / {validImages.length}
            </span>
          </div>
        </div>

        {/* Caption Bar */}
        <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E3E1DB] bg-[#FFFFFF] px-5 py-3 text-xs text-[#636A6F]">
          <span data-gallery-caption="true">{currentSlide.caption}</span>
          <div className="flex items-center gap-3">
            <span
              data-gallery-sample-badge="true"
              style={{
                display: currentSlide.image.isSampleAsset ? undefined : 'none',
              }}
              className="text-[11px] text-[#636A6F]"
            >
              Sample preview photography
            </span>
            <span className="hidden text-[11px] text-[#8B9196] sm:inline">
              Use ← / → arrow keys to browse
            </span>
          </div>
        </figcaption>
      </figure>

      {/* Thumbnail Strip */}
      <div
        role="tablist"
        aria-label="Product photographs"
        className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5"
      >
        {validImages.map((img, idx) => {
          const isSelected = idx === safeIndex;
          const thumbResolved = resolveProductImageDelivery(img, {
            preset: 'thumbnail-sm',
            aspectRatio: '1:1',
            loadingOverride: 'lazy',
          });

          return (
            <button
              key={`${img.sanityAssetId || img.url || 'thumb'}_${idx}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={`View photograph ${idx + 1}: ${
                img.alt || `${productTitle} image ${idx + 1}`
              }`}
              data-gallery-thumb-index={idx}
              onClick={() => setActiveIndex(idx)}
              className={`group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-[#F6F4EF] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B3D5F] sm:h-20 sm:w-20 ${
                isSelected
                  ? 'border-[#1B3D5F] opacity-100 ring-2 ring-[#1B3D5F]'
                  : 'border-[#E3E1DB] opacity-75 hover:border-[#A8A49B] hover:opacity-100'
              }`}
              style={{
                backgroundColor: thumbResolved.fallbackColor || DEFAULT_FALLBACK_COLOR,
              }}
            >
              {thumbResolved.src ? (
                <img
                  src={thumbResolved.src}
                  srcSet={thumbResolved.srcSet}
                  sizes={thumbResolved.sizes}
                  alt={img.alt || `${productTitle} thumbnail ${idx + 1}`}
                  width={thumbResolved.width}
                  height={thumbResolved.height}
                  loading="lazy"
                  decoding="async"
                  className={`h-full w-full ${
                    img.fitMode === 'contain' ? 'object-contain p-1' : 'object-cover'
                  }`}
                  style={{
                    objectPosition: thumbResolved.objectPosition,
                  }}
                />
              ) : (
                <PhotoImage
                  image={img}
                  preset="thumbnail-sm"
                  aspectRatio="1:1"
                  loading="lazy"
                  className="h-full w-full"
                />
              )}
              {idx === 0 && (
                <span className="sr-only">Primary Hero Photograph</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Progressive enhancement script for static Astro rendering */}
      <script dangerouslySetInnerHTML={{ __html: inlineGalleryScript }} />
    </div>
  );
};
