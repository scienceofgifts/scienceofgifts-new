import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Crosshair,
  Eye,
  GripVertical,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  DEFAULT_MAX_PRODUCT_GALLERY_IMAGES,
  MAX_PRODUCT_GALLERY_IMAGES,
  extractSanityAssetIdFromImage,
  resolveSanityImageUrlFromAssetRef,
} from '../../cms/productInterchangeSchema';
import { ProductImage } from '../../types/content';
import { ProductMediaGallery } from '../product/ProductMediaGallery';
import { fetchStudioApiJson } from './studioApiClient';

export interface SanityStudioImageItem {
  _key?: string;
  _type?: 'productImage';
  sanityAssetId?: string;
  asset?: {
    _type: 'image';
    asset: {
      _type: 'reference';
      _ref: string;
    };
    hotspot?: {
      _type?: 'sanity.imageHotspot';
      x: number;
      y: number;
      width?: number;
      height?: number;
    };
    crop?: {
      _type?: 'sanity.imageCrop';
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
  externalUrl?: string;
  url?: string;
  alt: string;
  caption?: string;
  fitMode?: 'cover' | 'contain';
  focalPoint?: {
    x: number;
    y: number;
  };
  crop?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  fallbackColor?: string;
  isSampleAsset?: boolean;
  sourceType?: 'sanity-upload' | 'external-url' | 'fourthwall-synced';
  fourthwallVariantId?: string;
  originalFilename?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
}

export interface ProductMediaManagerProps {
  images: SanityStudioImageItem[];
  productTitle?: string;
  productType?: string;
  onChangeImages: (nextImages: SanityStudioImageItem[]) => void;
  sessionCredentials?: {
    sessionToken: string;
    csrfToken: string;
    expiresAtMs: number;
  } | null;
  maxImages?: number;
  compact?: boolean;
}

const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
];

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error(`Failed to read file "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

export function resolveStudioImageDisplayUrl(img: SanityStudioImageItem): string {
  const direct = (img.externalUrl || img.url || '').trim();
  if (direct && !direct.startsWith('data:') && !direct.startsWith('blob:')) {
    return direct;
  }
  const assetId = extractSanityAssetIdFromImage(img);
  if (assetId) {
    return resolveSanityImageUrlFromAssetRef(assetId) || '';
  }
  return '';
}

export function resolveStudioImageFocalPoint(img: SanityStudioImageItem): {
  x: number;
  y: number;
} {
  const rawX = img.focalPoint?.x ?? img.asset?.hotspot?.x ?? 0.5;
  const rawY = img.focalPoint?.y ?? img.asset?.hotspot?.y ?? 0.5;
  return {
    x: Number(Math.min(1, Math.max(0, Number.isFinite(rawX) ? rawX : 0.5)).toFixed(3)),
    y: Number(Math.min(1, Math.max(0, Number.isFinite(rawY) ? rawY : 0.5)).toFixed(3)),
  };
}

export function toCanonicalProductImageForPreview(
  img: SanityStudioImageItem,
  fallbackTitle: string,
  index: number
): ProductImage {
  const url = resolveStudioImageDisplayUrl(img);
  const fp = resolveStudioImageFocalPoint(img);
  const assetId = extractSanityAssetIdFromImage(img);
  return {
    id: img._key || assetId || `img_preview_${index + 1}`,
    url,
    sanityAssetId: assetId,
    asset: assetId
      ? {
          _type: 'image',
          asset: { _type: 'reference', _ref: assetId },
        }
      : undefined,
    alt: (img.alt || '').trim() || `${fallbackTitle || 'Product'} photograph ${index + 1}`,
    caption: img.caption,
    fitMode: img.fitMode === 'contain' ? 'contain' : 'cover',
    focalPoint: fp,
    fallbackColor: img.fallbackColor || '#F6F4EF',
    isSampleAsset: Boolean(img.isSampleAsset),
    sourceType: img.sourceType,
    fourthwallVariantId: img.fourthwallVariantId,
    originalFilename: img.originalFilename,
    mimeType: img.mimeType,
    width: img.width,
    height: img.height,
    aspectRatio: img.aspectRatio,
  };
}

export const ProductMediaManager: React.FC<ProductMediaManagerProps> = ({
  images,
  productTitle = 'Product',
  productType,
  onChangeImages,
  sessionCredentials,
  maxImages: initialMaxImages = DEFAULT_MAX_PRODUCT_GALLERY_IMAGES,
  compact = false,
}) => {
  const [configuredLimit, setConfiguredLimit] = useState<number>(
    Math.min(MAX_PRODUCT_GALLERY_IMAGES, Math.max(1, initialMaxImages))
  );
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isDraggingFiles, setIsDraggingFiles] = useState<boolean>(false);
  const [draggedThumbIndex, setDraggedThumbIndex] = useState<number | null>(null);
  const [dragOverThumbIndex, setDragOverThumbIndex] = useState<number | null>(null);

  // Upload progress & status state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatusText, setUploadStatusText] = useState<string | null>(null);
  const [uploadSuccessBanner, setUploadSuccessBanner] = useState<string | null>(null);
  const [uploadErrorBanner, setUploadErrorBanner] = useState<string | null>(null);

  // External URL drawer state
  const [showExternalUrlInput, setShowExternalUrlInput] = useState<boolean>(false);
  const [externalUrlDraft, setExternalUrlDraft] = useState<string>('');
  const [externalAltDraft, setExternalAltDraft] = useState<string>('');

  // Live gallery preview toggle
  const [showGalleryPreview, setShowGalleryPreview] = useState<boolean>(false);

  const multiFileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null);

  const normalizedImages: SanityStudioImageItem[] = Array.isArray(images) ? images : [];
  const safeSelectedIndex =
    selectedIndex >= 0 && selectedIndex < normalizedImages.length ? selectedIndex : 0;
  const selectedImage = normalizedImages[safeSelectedIndex] || null;

  const buildAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (sessionCredentials?.sessionToken) {
      headers['X-Sanity-Studio-Token'] = sessionCredentials.sessionToken;
    }
    if (sessionCredentials?.csrfToken) {
      headers['X-Sanity-Studio-Csrf'] = sessionCredentials.csrfToken;
    }
    return headers;
  };

  // Client-side pre-validation before sending to server
  const validateSelectedFiles = (
    fileList: File[],
    isReplacement: boolean
  ): { valid: boolean; error?: string } => {
    if (fileList.length === 0) {
      return { valid: false, error: 'No image files selected.' };
    }
    const availableSlots = isReplacement
      ? 1
      : configuredLimit - normalizedImages.length;

    if (!isReplacement && availableSlots <= 0) {
      return {
        valid: false,
        error: `Gallery limit reached (${configuredLimit} images max). Increase the gallery limit or remove an image first.`,
      };
    }

    if (!isReplacement && fileList.length > availableSlots) {
      return {
        valid: false,
        error: `You selected ${fileList.length} files, but only ${availableSlots} slot(s) remain under the current limit of ${configuredLimit}.`,
      };
    }

    for (const file of fileList) {
      const mime = (file.type || '').toLowerCase();
      if (!ACCEPTED_MIME_TYPES.includes(mime)) {
        return {
          valid: false,
          error: `Unsupported file type for "${file.name}" (${mime || 'unknown'}). Allowed: JPEG, PNG, WebP, AVIF, GIF.`,
        };
      }
      if (file.size <= 0) {
        return {
          valid: false,
          error: `File "${file.name}" is empty (0 bytes).`,
        };
      }
      if (file.size > MAX_FILE_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        return {
          valid: false,
          error: `File "${file.name}" (${sizeMb} MB) exceeds the 15 MB per-image limit.`,
        };
      }
    }

    return { valid: true };
  };

  // Multi-file upload to Sanity Content Lake
  const handleUploadFiles = async (fileList: File[]) => {
    setUploadErrorBanner(null);
    setUploadSuccessBanner(null);

    const check = validateSelectedFiles(fileList, false);
    if (!check.valid) {
      setUploadErrorBanner(check.error || 'Invalid files selected.');
      return;
    }

    setIsUploading(true);
    setUploadStatusText(
      `Uploading ${fileList.length} photograph${fileList.length === 1 ? '' : 's'} to Sanity Content Lake...`
    );

    try {
      const encodedFiles = await Promise.all(
        fileList.map(async (file, idx) => {
          const base64Data = await readFileAsBase64(file);
          const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
          return {
            filename: file.name,
            mimeType: file.type,
            base64Data,
            alt:
              normalizedImages.length === 0 && idx === 0
                ? `${productTitle} — ${cleanName}`
                : `${productTitle} (${cleanName})`,
          };
        })
      );

      const parsed = await fetchStudioApiJson('/api/studio/sanity/upload-images', {
        method: 'POST',
        sessionCredentials,
        body: { files: encodedFiles },
      });

      const payload = parsed.data;
      if (
        !parsed.ok ||
        !payload ||
        (!payload.ok &&
          (!payload.uploadedAssets || payload.uploadedAssets.length === 0))
      ) {
        const firstErr =
          parsed.diagnosticMessage ||
          payload?.errors?.[0]?.message ||
          payload?.message ||
          'Failed to upload images to Sanity Content Lake.';
        setUploadErrorBanner(firstErr);
        setIsUploading(false);
        setUploadStatusText(null);
        return;
      }

      const uploadedAssets: Array<Record<string, any>> = Array.isArray(payload.uploadedAssets)
        ? payload.uploadedAssets
        : [];

      const appendedItems: SanityStudioImageItem[] = uploadedAssets.map((asset, idx) => {
        const slotNum = normalizedImages.length + idx;
        const defaultFitMode: 'cover' | 'contain' =
          typeof asset.aspectRatio === 'number' &&
          (asset.aspectRatio < 0.72 || asset.aspectRatio > 1.85)
            ? 'contain'
            : 'cover';

        return {
          _key: `img_sanity_${Date.now()}_${slotNum}`,
          _type: 'productImage',
          sanityAssetId: asset.assetId,
          asset: asset.imageField || {
            _type: 'image',
            asset: {
              _type: 'reference',
              _ref: asset.assetId,
            },
          },
          externalUrl: asset.url,
          url: asset.url,
          alt:
            asset.alt ||
            `${productTitle} photograph ${slotNum + 1}`,
          caption: asset.caption || '',
          fitMode: defaultFitMode,
          focalPoint: { x: 0.5, y: 0.5 },
          fallbackColor: '#F6F4EF',
          isSampleAsset: false,
          sourceType: 'sanity-upload',
          originalFilename: asset.originalFilename,
          mimeType: asset.mimeType,
          width: asset.width,
          height: asset.height,
          aspectRatio: asset.aspectRatio,
        };
      });

      const nextGallery = [...normalizedImages, ...appendedItems];
      onChangeImages(nextGallery);
      setSelectedIndex(normalizedImages.length); // Focus first newly uploaded image

      if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        setUploadErrorBanner(
          `Uploaded ${appendedItems.length} image(s), with ${payload.errors.length} error(s): ${payload.errors[0].message}`
        );
      } else {
        setUploadSuccessBanner(
          `Uploaded ${appendedItems.length} photograph${
            appendedItems.length === 1 ? '' : 's'
          } to Sanity Content Lake.`
        );
      }
    } catch (err: any) {
      setUploadErrorBanner(
        err?.message || 'Network error while uploading images to Sanity.'
      );
    } finally {
      setIsUploading(false);
      setUploadStatusText(null);
      if (multiFileInputRef.current) {
        multiFileInputRef.current.value = '';
      }
    }
  };

  // Replace single image at target index
  const handleReplaceImageFile = async (file: File, targetIdx: number) => {
    setUploadErrorBanner(null);
    setUploadSuccessBanner(null);

    const check = validateSelectedFiles([file], true);
    if (!check.valid) {
      setUploadErrorBanner(check.error || 'Invalid replacement file.');
      return;
    }

    const existingItem = normalizedImages[targetIdx];
    if (!existingItem) return;

    setIsUploading(true);
    setUploadStatusText(`Replacing photograph #${targetIdx + 1} in Sanity Content Lake...`);

    try {
      const base64Data = await readFileAsBase64(file);
      const parsed = await fetchStudioApiJson('/api/studio/sanity/upload-image', {
        method: 'POST',
        sessionCredentials,
        body: {
          filename: file.name,
          mimeType: file.type,
          base64Data,
          alt: existingItem.alt || `${productTitle} photograph ${targetIdx + 1}`,
          caption: existingItem.caption,
        },
      });

      const payload = parsed.data;
      if (!parsed.ok || !payload || !payload.ok || !payload.asset) {
        setUploadErrorBanner(
          parsed.diagnosticMessage ||
            payload?.message ||
            'Failed to upload replacement image to Sanity.'
        );
        return;
      }

      const asset = payload.asset;
      const updatedItem: SanityStudioImageItem = {
        ...existingItem,
        _key: existingItem._key || `img_sanity_${Date.now()}_${targetIdx}`,
        _type: 'productImage',
        sanityAssetId: asset.assetId,
        asset: asset.imageField || {
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: asset.assetId,
          },
        },
        externalUrl: asset.url,
        url: asset.url,
        alt: existingItem.alt || `${productTitle} photograph ${targetIdx + 1}`,
        sourceType: 'sanity-upload',
        isSampleAsset: false,
        originalFilename: asset.originalFilename,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        aspectRatio: asset.aspectRatio,
      };

      const nextGallery = [...normalizedImages];
      nextGallery[targetIdx] = updatedItem;
      onChangeImages(nextGallery);
      setSelectedIndex(targetIdx);
      setUploadSuccessBanner(
        `Replaced photograph #${targetIdx + 1} with "${file.name}" (${asset.assetId}).`
      );
    } catch (err: any) {
      setUploadErrorBanner(
        err?.message || 'Error uploading replacement photograph.'
      );
    } finally {
      setIsUploading(false);
      setUploadStatusText(null);
      setReplaceTargetIndex(null);
      if (replaceFileInputRef.current) {
        replaceFileInputRef.current.value = '';
      }
    }
  };

  // Reorder helper
  const handleMoveImage = (fromIdx: number, toIdx: number) => {
    if (
      fromIdx < 0 ||
      fromIdx >= normalizedImages.length ||
      toIdx < 0 ||
      toIdx >= normalizedImages.length ||
      fromIdx === toIdx
    ) {
      return;
    }
    const next = [...normalizedImages];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onChangeImages(next.map((item, idx) => ({ ...item, _key: item._key || `img_${idx}` })));
    setSelectedIndex(toIdx);
  };

  // Set as Primary Hero (move to index 0)
  const handleSetAsPrimaryHero = (idx: number) => {
    if (idx <= 0 || idx >= normalizedImages.length) return;
    handleMoveImage(idx, 0);
  };

  // Remove image from product array (preserves shared Sanity asset in Content Lake)
  const handleRemoveImage = (idx: number) => {
    if (idx < 0 || idx >= normalizedImages.length) return;
    const next = normalizedImages.filter((_, i) => i !== idx);
    onChangeImages(next);
    if (selectedIndex >= next.length) {
      setSelectedIndex(Math.max(0, next.length - 1));
    }
  };

  // Update metadata on selected image
  const handleUpdateSelectedImage = (patch: Partial<SanityStudioImageItem>) => {
    if (!selectedImage) return;
    const next = [...normalizedImages];
    const current = next[safeSelectedIndex];
    const updatedFocalPoint = patch.focalPoint ?? current.focalPoint;
    const updatedCrop = patch.crop ?? current.crop;

    const updatedAsset = current.asset
      ? {
          ...current.asset,
          ...(updatedFocalPoint
            ? {
                hotspot: {
                  _type: 'sanity.imageHotspot' as const,
                  x: updatedFocalPoint.x,
                  y: updatedFocalPoint.y,
                  width: 0.3,
                  height: 0.3,
                },
              }
            : {}),
          ...(updatedCrop
            ? {
                crop: {
                  _type: 'sanity.imageCrop' as const,
                  ...updatedCrop,
                },
              }
            : {}),
        }
      : undefined;

    next[safeSelectedIndex] = {
      ...current,
      ...patch,
      ...(updatedAsset ? { asset: updatedAsset } : {}),
    };
    onChangeImages(next);
  };

  // Add External HTTPS URL
  const handleAddExternalUrl = () => {
    setUploadErrorBanner(null);
    const trimmed = externalUrlDraft.trim();
    if (!trimmed) {
      setUploadErrorBanner('Please enter an HTTPS image URL.');
      return;
    }
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      setUploadErrorBanner(
        'Inline base64 data: and temporary blob: URLs are not permitted. Upload files via the Sanity uploader above or provide an https:// URL.'
      );
      return;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        setUploadErrorBanner('Image URL must use https://.');
        return;
      }
    } catch {
      setUploadErrorBanner('Invalid URL format.');
      return;
    }

    if (normalizedImages.length >= configuredLimit) {
      setUploadErrorBanner(
        `Gallery limit reached (${configuredLimit} images). Increase limit or remove an image first.`
      );
      return;
    }

    const nextIdx = normalizedImages.length;
    const newItem: SanityStudioImageItem = {
      _key: `img_ext_${Date.now()}_${nextIdx}`,
      _type: 'productImage',
      externalUrl: trimmed,
      url: trimmed,
      alt:
        externalAltDraft.trim() ||
        `${productTitle} photograph ${nextIdx + 1}`,
      caption: '',
      fitMode: 'cover',
      focalPoint: { x: 0.5, y: 0.5 },
      fallbackColor: '#F6F4EF',
      sourceType: 'external-url',
    };

    const next = [...normalizedImages, newItem];
    onChangeImages(next);
    setSelectedIndex(nextIdx);
    setExternalUrlDraft('');
    setExternalAltDraft('');
    setShowExternalUrlInput(false);
  };

  // Interactive Focal Point click handler
  const handleFocalPointClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedImage) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = Number(
      Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)).toFixed(3)
    );
    const y = Number(
      Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)).toFixed(3)
    );
    handleUpdateSelectedImage({ focalPoint: { x, y } });
  };

  const previewCanonicalImages: ProductImage[] = normalizedImages
    .map((img, idx) => toCanonicalProductImageForPreview(img, productTitle, idx))
    .filter((img) => Boolean(img.url || img.sanityAssetId));

  const selectedFocalPoint = selectedImage
    ? resolveStudioImageFocalPoint(selectedImage)
    : { x: 0.5, y: 0.5 };
  const selectedDisplayUrl = selectedImage
    ? resolveStudioImageDisplayUrl(selectedImage)
    : '';
  const selectedAssetId = selectedImage
    ? extractSanityAssetIdFromImage(selectedImage)
    : undefined;

  return (
    <div
      data-testid="product-media-manager"
      className="space-y-4 text-xs text-[#0F172A]"
    >
      {/* Top Bar: Gallery Count, Configurable Limit, & Preview Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-semibold text-[#0F172A]">
            Product Gallery ({normalizedImages.length} / {configuredLimit} photographs)
          </span>
          {normalizedImages.length > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
              Primary Hero: #1
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-[11px] text-[#475569]">
            <span>Max gallery size:</span>
            <select
              value={configuredLimit}
              onChange={(e) => setConfiguredLimit(Number(e.target.value))}
              className="px-2 py-1 bg-white border border-[#CBD5E1] rounded-md text-[11px] font-medium text-[#0F172A]"
            >
              <option value={8}>8 images (Standard)</option>
              <option value={10}>10 images</option>
              <option value={12}>12 images (Extended)</option>
            </select>
          </label>

          {previewCanonicalImages.length > 0 && (
            <button
              type="button"
              onClick={() => setShowGalleryPreview(!showGalleryPreview)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-colors ${
                showGalleryPreview
                  ? 'bg-[#1B3D5F] text-white border-[#1B3D5F]'
                  : 'bg-white text-[#0F172A] border-[#CBD5E1] hover:bg-[#F8FAFC]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showGalleryPreview ? 'Hide Storefront Preview' : 'Preview Storefront Gallery'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={multiFileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_MIME_TYPES.join(',')}
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          if (files.length > 0) {
            void handleUploadFiles(files);
          }
        }}
        className="hidden"
      />
      <input
        ref={replaceFileInputRef}
        type="file"
        accept={ACCEPTED_MIME_TYPES.join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && replaceTargetIndex !== null) {
            void handleReplaceImageFile(file, replaceTargetIndex);
          }
        }}
        className="hidden"
      />

      {/* Drag & Drop Multi-File Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isDraggingFiles) setIsDraggingFiles(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingFiles(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingFiles(false);
          const droppedFiles = e.dataTransfer?.files
            ? Array.from(e.dataTransfer.files)
            : [];
          if (droppedFiles.length > 0) {
            void handleUploadFiles(droppedFiles);
          }
        }}
        className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
          isDraggingFiles
            ? 'border-[#2A5A48] bg-[#2A5A48]/5'
            : 'border-[#CBD5E1] bg-[#FAF9F6] hover:border-[#94A3B8]'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#2A5A48] shadow-2xs">
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#0F172A]">
              {isUploading
                ? uploadStatusText || 'Uploading to Sanity Content Lake...'
                : 'Drag and drop product photographs here, or select multiple files'}
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Native Sanity Asset Storage (`sanity.imageAsset`) · JPEG, PNG, WebP, AVIF, GIF up to 15 MB per file · Mixed aspect ratios preserved
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            <button
              type="button"
              disabled={isUploading || normalizedImages.length >= configuredLimit}
              onClick={() => multiFileInputRef.current?.click()}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isUploading || normalizedImages.length >= configuredLimit
                  ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                  : 'bg-[#2A5A48] hover:bg-[#234b3c] text-white shadow-2xs'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Select Photographs to Upload</span>
            </button>

            <button
              type="button"
              onClick={() => setShowExternalUrlInput(!showExternalUrlInput)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] flex items-center gap-1.5"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Add External HTTPS Image URL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Optional External HTTPS URL Input */}
      {showExternalUrlInput && (
        <div className="p-3.5 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              Add Externally Hosted HTTPS Photograph
            </span>
            <button
              type="button"
              onClick={() => setShowExternalUrlInput(false)}
              className="text-[11px] text-[#64748B] hover:text-[#0F172A]"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="url"
              value={externalUrlDraft}
              onChange={(e) => setExternalUrlDraft(e.target.value)}
              placeholder="https://cdn.sanity.io/... or https://images.unsplash.com/..."
              className="sm:col-span-2 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs"
            />
            <input
              type="text"
              value={externalAltDraft}
              onChange={(e) => setExternalAltDraft(e.target.value)}
              placeholder="Descriptive alt text"
              className="px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddExternalUrl}
              className="px-3 py-1.5 bg-[#0F172A] text-white rounded-lg text-xs font-semibold hover:bg-[#1E293B]"
            >
              Add to Gallery
            </button>
          </div>
        </div>
      )}

      {/* Upload Feedback Banners */}
      {uploadErrorBanner && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{uploadErrorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadErrorBanner(null)}
            className="text-[11px] font-semibold text-red-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {uploadSuccessBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{uploadSuccessBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadSuccessBanner(null)}
            className="text-[11px] font-semibold text-emerald-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Live Storefront Gallery Preview (when toggled) */}
      {showGalleryPreview && previewCanonicalImages.length > 0 && (
        <div className="p-5 bg-[#FAF8F3] border border-[#E3E1DB] rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1B3D5F]">
              Live Storefront Gallery Preview ({previewCanonicalImages.length}{' '}
              {previewCanonicalImages.length === 1 ? 'Photograph' : 'Photographs'})
            </span>
            <span className="text-[11px] text-[#636A6F]">
              Exact rendering used on `/products/[slug]/`
            </span>
          </div>
          <div className="max-w-xl mx-auto">
            <ProductMediaGallery
              images={previewCanonicalImages}
              productTitle={productTitle}
              productType={productType}
            />
          </div>
        </div>
      )}

      {/* Thumbnail Grid + Reordering Controls */}
      {normalizedImages.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {normalizedImages.map((img, idx) => {
              const displayUrl = resolveStudioImageDisplayUrl(img);
              const assetId = extractSanityAssetIdFromImage(img);
              const isPrimary = idx === 0;
              const isSelected = idx === safeSelectedIndex;
              const isDragTarget = dragOverThumbIndex === idx;
              const fp = resolveStudioImageFocalPoint(img);

              return (
                <div
                  key={img._key || `${assetId || displayUrl || 'slot'}_${idx}`}
                  draggable
                  onDragStart={() => setDraggedThumbIndex(idx)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverThumbIndex !== idx) setDragOverThumbIndex(idx);
                  }}
                  onDragLeave={() => {
                    if (dragOverThumbIndex === idx) setDragOverThumbIndex(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverThumbIndex(null);
                    if (draggedThumbIndex !== null && draggedThumbIndex !== idx) {
                      handleMoveImage(draggedThumbIndex, idx);
                    }
                    setDraggedThumbIndex(null);
                  }}
                  onClick={() => setSelectedIndex(idx)}
                  className={`group relative rounded-xl border bg-white overflow-hidden transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#2A5A48] ring-2 ring-[#2A5A48]/25 shadow-xs'
                      : isDragTarget
                        ? 'border-[#1B3D5F] ring-2 ring-[#1B3D5F]/25'
                        : 'border-[#E2E8F0] hover:border-[#94A3B8]'
                  }`}
                >
                  {/* Thumbnail Preview Frame */}
                  <div
                    className="relative aspect-[4/3] w-full bg-[#F6F4EF] overflow-hidden flex items-center justify-center"
                    style={{
                      backgroundColor: img.fallbackColor || '#F6F4EF',
                    }}
                  >
                    {displayUrl ? (
                      <img
                        src={displayUrl}
                        alt={img.alt || `Photograph ${idx + 1}`}
                        className={`w-full h-full ${
                          img.fitMode === 'contain'
                            ? 'object-contain p-1.5'
                            : 'object-cover'
                        }`}
                        style={{
                          objectPosition: `${Math.round(fp.x * 100)}% ${Math.round(
                            fp.y * 100
                          )}%`,
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-[#94A3B8]" />
                    )}

                    {/* Top-left badge: Primary Hero or Slot # */}
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide flex items-center gap-1 shadow-2xs ${
                          isPrimary
                            ? 'bg-[#2A5A48] text-white'
                            : 'bg-white/90 text-[#0F172A] border border-[#E2E8F0]'
                        }`}
                      >
                        <GripVertical className="w-2.5 h-2.5 opacity-75" />
                        {isPrimary ? 'Primary Hero' : `#${idx + 1}`}
                      </span>
                    </div>

                    {/* Top-right source badge */}
                    <div className="absolute top-2 right-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                          assetId
                            ? 'bg-emerald-900/80 text-white'
                            : img.sourceType === 'fourthwall-synced'
                              ? 'bg-indigo-900/80 text-white'
                              : 'bg-slate-900/75 text-white'
                        }`}
                      >
                        {assetId
                          ? 'Sanity CDN'
                          : img.sourceType === 'fourthwall-synced'
                            ? 'Fourthwall'
                            : 'HTTPS'}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer & Quick Actions */}
                  <div className="p-2.5 space-y-2 bg-white border-t border-[#F1F5F9]">
                    <div className="truncate text-[11px] font-medium text-[#0F172A]">
                      {img.alt || <span className="text-amber-700 italic">Missing alt text</span>}
                    </div>

                    <div
                      className="flex items-center justify-between gap-1 pt-1 border-t border-[#F8FAFC]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveImage(idx, idx - 1)}
                          title="Move Left"
                          aria-label={`Move photograph ${idx + 1} left`}
                          className="p-1 rounded hover:bg-[#F1F5F9] text-[#475569] disabled:opacity-30"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === normalizedImages.length - 1}
                          onClick={() => handleMoveImage(idx, idx + 1)}
                          title="Move Right"
                          aria-label={`Move photograph ${idx + 1} right`}
                          className="p-1 rounded hover:bg-[#F1F5F9] text-[#475569] disabled:opacity-30"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        {!isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetAsPrimaryHero(idx)}
                            title="Set as Primary Hero Image"
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-[#2A5A48] hover:bg-[#2A5A48]/10 flex items-center gap-0.5"
                          >
                            <Star className="w-3 h-3" />
                            <span>Hero</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setReplaceTargetIndex(idx);
                            replaceFileInputRef.current?.click();
                          }}
                          title="Replace photograph file"
                          aria-label={`Replace photograph ${idx + 1}`}
                          className="p-1 rounded hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A]"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          title="Remove from product gallery (keeps shared Sanity asset)"
                          aria-label={`Remove photograph ${idx + 1}`}
                          className="p-1 rounded hover:bg-red-50 text-[#64748B] hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Photograph Inspector (Alt, Caption, FitMode, Interactive Focal Point) */}
          {selectedImage && !compact && (
            <div className="p-4 bg-[#FAF9F6] border border-[#E2E8F0] rounded-xl grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Left: Metadata & Fit Controls */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2A5A48]">
                    Editing Photograph #{safeSelectedIndex + 1}{' '}
                    {safeSelectedIndex === 0 ? '(Primary Hero)' : ''}
                  </span>
                  {selectedAssetId && (
                    <span className="font-mono text-[10px] text-[#64748B] truncate max-w-[220px]">
                      {selectedAssetId}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">
                    Accessible Alt Text (Required for screen readers & SEO)
                  </label>
                  <input
                    type="text"
                    value={selectedImage.alt || ''}
                    onChange={(e) => handleUpdateSelectedImage({ alt: e.target.value })}
                    placeholder="Describe the object, material, finish, and angle..."
                    className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">
                    Editorial Caption (Optional — shown below gallery stage)
                  </label>
                  <input
                    type="text"
                    value={selectedImage.caption || ''}
                    onChange={(e) => handleUpdateSelectedImage({ caption: e.target.value })}
                    placeholder="e.g. Hand-finished glazed stoneware in warm natural light"
                    className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      Aspect Framing & Fit Mode
                    </label>
                    <select
                      value={selectedImage.fitMode || 'cover'}
                      onChange={(e) =>
                        handleUpdateSelectedImage({
                          fitMode: e.target.value === 'contain' ? 'contain' : 'cover',
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A]"
                    >
                      <option value="cover">
                        Cover (Fill editorial frame anchored to focal point)
                      </option>
                      <option value="contain">
                        Contain (Preserve full uncropped aspect ratio on backdrop)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      Backdrop Fallback Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedImage.fallbackColor || '#F6F4EF'}
                        onChange={(e) =>
                          handleUpdateSelectedImage({ fallbackColor: e.target.value })
                        }
                        className="h-7 w-9 rounded border border-[#CBD5E1] bg-white cursor-pointer"
                      />
                      <input
                        type="text"
                        value={selectedImage.fallbackColor || '#F6F4EF'}
                        onChange={(e) =>
                          handleUpdateSelectedImage({ fallbackColor: e.target.value })
                        }
                        className="flex-1 px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Interactive Focal Point Picker */}
              <div className="md:col-span-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#475569] flex items-center gap-1">
                    <Crosshair className="w-3.5 h-3.5 text-[#2A5A48]" />
                    <span>
                      Focal Point ({selectedFocalPoint.x}, {selectedFocalPoint.y})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateSelectedImage({ focalPoint: { x: 0.5, y: 0.5 } })
                    }
                    className="text-[10px] font-semibold text-[#2A5A48] hover:underline"
                  >
                    Reset Center
                  </button>
                </div>

                <div
                  onClick={handleFocalPointClick}
                  title="Click anywhere on the photograph to set focal point"
                  className="relative aspect-[4/3] w-full rounded-xl border border-[#CBD5E1] bg-white overflow-hidden cursor-crosshair select-none"
                  style={{
                    backgroundColor: selectedImage.fallbackColor || '#F6F4EF',
                  }}
                >
                  {selectedDisplayUrl ? (
                    <img
                      src={selectedDisplayUrl}
                      alt={selectedImage.alt || 'Focal point preview'}
                      className={`w-full h-full pointer-events-none ${
                        selectedImage.fitMode === 'contain'
                          ? 'object-contain p-2'
                          : 'object-cover'
                      }`}
                      style={{
                        objectPosition: `${Math.round(
                          selectedFocalPoint.x * 100
                        )}% ${Math.round(selectedFocalPoint.y * 100)}%`,
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#94A3B8]">
                      No image preview
                    </div>
                  )}

                  {/* Visual Hotspot Marker */}
                  <div
                    className="pointer-events-none absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#2A5A48]/80 shadow-md flex items-center justify-center"
                    style={{
                      left: `${selectedFocalPoint.x * 100}%`,
                      top: `${selectedFocalPoint.y * 100}%`,
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                </div>
                <p className="text-[10px] text-[#64748B]">
                  Click on the image above to set the Sanity hotspot / focal point (`x`, `y` in `0..1`). Original source aspect ratio is never destructively cropped.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl text-center text-xs text-[#64748B]">
          No product photographs uploaded yet. Upload one or more photographs above before or after importing AI editorial copy.
        </div>
      )}
    </div>
  );
};
