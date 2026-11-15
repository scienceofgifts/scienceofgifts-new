/**
 * Science of Gifts — Server-Side Sanity Draft Preview HTML Renderer
 *
 * Renders live Sanity `product` documents (`drafts.<id>` or `<id>`) using the exact
 * `EditorialProductProfile` layout, multi-image gallery, structured verdict,
 * recipient profile, buying considerations, and styling tokens (`/src/index.css`).
 *
 * Always badged `DRAFT PREVIEW` and marked `noindex, nofollow`.
 * Excluded from production builds and runtime.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { contentRepository } from '../contentRepository';
import { EditorialProductProfile } from '../../components/product/EditorialProductProfile';
import type { ResearchCitation } from '../../types/content';
import { mapSanityProductDocumentToAstroProduct } from './productDocumentMapper';
import { evaluateProductPublicationLifecycle } from './publicationWorkflow';

function escapeHtml(raw: unknown): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface RenderedDraftPreviewResult {
  html: string;
  productTitle: string;
  canonicalId: string;
  slug: string;
  isDraft: boolean;
}

export async function renderSanityProductPreviewHtml(input: {
  document: Record<string, any>;
  projectId?: string;
  dataset?: string;
}): Promise<RenderedDraftPreviewResult> {
  const { document: rawDoc, projectId, dataset } = input;

  try {
    await contentRepository.ensureSyncedFromSanity();
  } catch {
    // Allow preview to still render the live fetched Sanity draft even if companion catalog sync fails
  }

  const product = mapSanityProductDocumentToAstroProduct(rawDoc, {
    projectId,
    dataset,
  });

  const guideAppearances = contentRepository.getProductGuideAppearances(product.id);
  const similarComparisons = contentRepository.getSimilarProductComparisons(product);
  const directArticles = contentRepository.getArticlesFeaturingProduct(product.id);
  const relatedArticles =
    directArticles.length > 0
      ? directArticles
      : contentRepository.getAllArticles().slice(0, 2);

  const citationsMap = contentRepository.getCitationsMap();
  const citations = (product.citationIds ?? [])
    .map((id) => citationsMap[id])
    .filter((c): c is ResearchCitation => Boolean(c));

  const lifecycle = evaluateProductPublicationLifecycle(rawDoc);
  const isDraft =
    String(rawDoc._id || '').startsWith('drafts.') || rawDoc.status === 'draft';
  const hasDisplayablePrice =
    typeof product.price === 'number' &&
    Number.isFinite(product.price) &&
    product.price > 0;

  const actionsMarkup = (
    <div className="rounded-2xl border border-[#E3E1DB] bg-[#FAF9F6] p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {product.purchaseUrl && product.purchaseUrl.startsWith('https://') ? (
          <a
            href={product.purchaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B3D5F] px-5 py-3 text-sm font-semibold text-[#FFFFFF] hover:bg-[#28537D] transition-colors"
          >
            {product.commerceProvider === 'fourthwall'
              ? 'View on Science of Gifts Shop'
              : `Inspect Merchant Page (${product.vendor})`}
          </a>
        ) : (
          <span className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900">
            Merchant purchase URL missing or non-HTTPS
          </span>
        )}
        <span className="text-xs text-[#636A6F]">
          Interactive Save &amp; Checklist actions activate on the live published route.
        </span>
      </div>
    </div>
  );

  const bodyMarkup = renderToStaticMarkup(
    <EditorialProductProfile
      product={product}
      guideAppearances={guideAppearances}
      similarComparisons={similarComparisons}
      relatedArticles={relatedArticles}
      citations={citations}
      actionsSlot={actionsMarkup}
    />
  );

  const badgeLabel = isDraft ? 'DRAFT PREVIEW' : 'PUBLISHED RECORD PREVIEW';
  const priceStatusLabel = hasDisplayablePrice
    ? `$${product.price.toFixed(2)} USD (${
        product.priceVerified ? 'Verified' : 'Unverified Price'
      })`
    : 'Price Unverified';
  const stockStatusLabel =
    product.inventoryVerified && typeof product.inStock === 'boolean'
      ? product.inStock
        ? 'In Stock (Verified)'
        : 'Out of Stock (Verified)'
      : 'Inventory Unverified (Availability Suppressed)';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(badgeLabel)} — ${escapeHtml(product.title)} | Science of Gifts</title>
    <meta name="robots" content="noindex, nofollow" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..600&family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Lora:ital,wght@0,400..700;1,400..600&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..600&family=Playfair+Display:ital,wght@0,400..700;1,400..600&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Source+Sans+3:ital,wght@0,400..700;1,400..600&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/src/index.css" />
  </head>
  <body class="bg-[#FAF9F6] text-[#24282B] antialiased selection:bg-[#E5F3EC] selection:text-[#1B3D5F] min-h-screen flex flex-col">
    <div
      role="status"
      data-draft-preview-banner="true"
      class="sticky top-0 z-50 border-b border-[#14304B] bg-[#1B3D5F] text-[#FFFFFF] shadow-sm"
    >
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-2.5 text-xs">
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="rounded border border-amber-300/60 bg-amber-300 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider text-[#1B2228]">
            ${escapeHtml(badgeLabel)}
          </span>
          <span class="font-semibold text-[#FFFFFF]">${escapeHtml(product.title)}</span>
          <span class="font-mono text-[11px] text-[#D7E4F0]">_id: ${escapeHtml(rawDoc._id || product.id)}</span>
          ${
            rawDoc._rev
              ? `<span class="font-mono text-[11px] text-[#D7E4F0]">rev: ${escapeHtml(rawDoc._rev)}</span>`
              : ''
          }
        </div>
        <div class="flex flex-wrap items-center gap-3 text-[11px] text-[#E5EEF6]">
          <span>Slug: <code class="font-mono">/products/${escapeHtml(product.slug)}/</code></span>
          <span>·</span>
          <span>${escapeHtml(priceStatusLabel)}</span>
          <span>·</span>
          <span>${escapeHtml(stockStatusLabel)}</span>
          <span>·</span>
          <span class="font-mono">Robots: ${escapeHtml(lifecycle.robotsDirective)} (preview: noindex, nofollow)</span>
        </div>
      </div>
    </div>

    <main class="flex-1">
      ${bodyMarkup}
    </main>

    <footer class="border-t border-[#E3E1DB] bg-[#F6F4EF] py-6 text-center text-xs text-[#636A6F]">
      Science of Gifts — Private Sanity Studio Draft Preview (noindex, nofollow · Excluded from Public Build)
    </footer>
  </body>
</html>`;

  return {
    html,
    productTitle: product.title,
    canonicalId: product.id,
    slug: product.slug,
    isDraft,
  };
}
