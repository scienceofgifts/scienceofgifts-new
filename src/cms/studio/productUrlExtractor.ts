/**
 * Science of Gifts — Server-Side Product URL Metadata & Structured Data Extractor
 *
 * Extracts structured merchant product facts prior to AI brief generation:
 * 1. Validates and protects against SSRF (blocks non-HTTP/HTTPS, credentials,
 *    loopback, link-local, metadata endpoints, private IPv4/IPv6 ranges, DNS
 *    rebinding / internal resolution, and validates every HTTP redirect hop).
 * 2. Retrieves and merges structured facts in priority order:
 *    - Schema.org JSON-LD (`Product`, `ProductGroup`, `Offer`, `AggregateOffer`)
 *    - Supported merchant JSON endpoints (Shopify `/products/<handle>.json`)
 *    - OpenGraph / Product Meta / HTML specification fallback
 * 3. Preserves provenance (`extractionSources`), `sourceUrl`, `finalUrl`,
 *    and explicitly reports `missingFields` & `unverifiedFields` without
 *    inventing facts or marking unconfirmed data as verified.
 */

import dns from 'node:dns/promises';
import net from 'node:net';

export interface ExtractedProductImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  source: 'json-ld' | 'merchant-api' | 'open-graph' | 'html';
}

export interface ExtractedProductSpecification {
  label: string;
  value: string;
  source: 'json-ld' | 'merchant-api' | 'html';
}

export interface ExtractedProductVariant {
  id?: string;
  title: string;
  sku?: string | null;
  price?: number | null;
  currency?: string | null;
  inStock?: boolean | null;
  options?: Record<string, string>;
}

export interface ExtractedProductOptionGroup {
  name: string;
  values: string[];
}

export interface ExtractedProductDetails {
  ok: true;
  sourceUrl: string;
  finalUrl: string;
  fetchedAt: string;
  extractionSources: Array<'json-ld' | 'shopify-json' | 'open-graph' | 'html-meta'>;
  title: string | null;
  description: string | null;
  vendor: string | null;
  brand: string | null;
  productType: string | null;
  price: number | null;
  currency: string;
  inStock: boolean | null;
  availabilityLabel: string | null;
  images: ExtractedProductImage[];
  materials: string[];
  dimensions: string | null;
  specifications: ExtractedProductSpecification[];
  variants: ExtractedProductVariant[];
  sizes: string[];
  colors: string[];
  optionGroups: ExtractedProductOptionGroup[];
  missingFields: string[];
  unverifiedFields: string[];
  priceVerified: false;
  inventoryVerified: false;
  merchantDomain?: string;
  commerceProvider?: 'fourthwall' | 'affiliate' | 'digital' | 'direct';
}

export interface ProductUrlExtractionFailure {
  ok: false;
  status: number;
  errorCode:
    | 'INVALID_URL'
    | 'UNSAFE_URL_BLOCKED'
    | 'FETCH_TIMEOUT'
    | 'FETCH_HTTP_ERROR'
    | 'FETCH_NETWORK_ERROR'
    | 'TOO_LARGE'
    | 'NO_EXTRACTABLE_DATA';
  message: string;
  sourceUrl: string;
}

export type ExtractedProductDetailsResult = ExtractedProductDetails & {
  merchantDomain?: string;
  commerceProvider?: 'fourthwall' | 'affiliate' | 'digital' | 'direct';
};

export type ProductUrlExtractionResult =
  | ExtractedProductDetails
  | ProductUrlExtractionFailure;

const MAX_REDIRECT_HOPS = 4;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB cap per fetched resource

const BLOCKED_EXACT_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata',
  'metadata.google.internal',
  '169.254.169.254',
  '0.0.0.0',
  '::',
  '::1',
]);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const num = Number(part);
    if (num < 0 || num > 255) return null;
    value = (value << 8) | num;
  }
  return value >>> 0;
}

function inCidr4(ipInt: number, baseStr: string, prefixLen: number): boolean {
  const base = ipv4ToInt(baseStr);
  if (base === null) return false;
  const mask = prefixLen === 0 ? 0 : (~((1 << (32 - prefixLen)) - 1)) >>> 0;
  return (ipInt & mask) === (base & mask);
}

/**
 * Returns true if an IPv4 or IPv6 literal is loopback, private, link-local,
 * carrier-grade NAT, unique local, multicast, or otherwise non-public.
 */
export function isPrivateOrReservedIp(rawIp: string): boolean {
  const ip = rawIp.trim().toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  if (!ip) return true;

  const ipType = net.isIP(ip);
  if (ipType === 4) {
    const ipInt = ipv4ToInt(ip);
    if (ipInt === null) return true;
    return (
      inCidr4(ipInt, '0.0.0.0', 8) || // "This" network
      inCidr4(ipInt, '10.0.0.0', 8) || // RFC 1918 private
      inCidr4(ipInt, '100.64.0.0', 10) || // CGNAT
      inCidr4(ipInt, '127.0.0.0', 8) || // Loopback
      inCidr4(ipInt, '169.254.0.0', 16) || // Link-local / Cloud Metadata
      inCidr4(ipInt, '172.16.0.0', 12) || // RFC 1918 private
      inCidr4(ipInt, '192.0.0.0', 24) || // IETF protocol assignments
      inCidr4(ipInt, '192.0.2.0', 24) || // TEST-NET-1
      inCidr4(ipInt, '192.168.0.0', 16) || // RFC 1918 private
      inCidr4(ipInt, '198.18.0.0', 15) || // Benchmarking
      inCidr4(ipInt, '198.51.100.0', 24) || // TEST-NET-2
      inCidr4(ipInt, '203.0.113.0', 24) || // TEST-NET-3
      inCidr4(ipInt, '224.0.0.0', 4) || // Multicast
      inCidr4(ipInt, '240.0.0.0', 4) // Reserved / Broadcast
    );
  }

  if (ipType === 6) {
    // Check IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1 or ::ffff:7f00:1
    const v4MappedMatch = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (v4MappedMatch) {
      return isPrivateOrReservedIp(v4MappedMatch[1]);
    }
    const v4CompatMatch = ip.match(/^::(\d+\.\d+\.\d+\.\d+)$/i);
    if (v4CompatMatch) {
      return isPrivateOrReservedIp(v4CompatMatch[1]);
    }
    if (ip === '::' || ip === '::1') return true;
    // Strip leading ::ffff: hex form if present (e.g. ::ffff:7f00:0001)
    const v4MappedHexMatch = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
    if (v4MappedHexMatch) {
      const hi = parseInt(v4MappedHexMatch[1], 16);
      const lo = parseInt(v4MappedHexMatch[2], 16);
      const reconstructed = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
      return isPrivateOrReservedIp(reconstructed);
    }

    const firstHextet = parseInt(ip.split(':')[0] || '0', 16);
    if (Number.isNaN(firstHextet)) return true;
    // fc00::/7 (Unique Local Addresses)
    if ((firstHextet & 0xfe00) === 0xfc00) return true;
    // fe80::/10 (Link-local)
    if ((firstHextet & 0xffc0) === 0xfe80) return true;
    // ff00::/8 (Multicast)
    if ((firstHextet & 0xff00) === 0xff00) return true;
    return false;
  }

  return true;
}

/**
 * Validates URL syntax, scheme, embedded credentials, and blocked hosts/IP literals.
 */
export function validateSafeExternalProductUrl(rawUrl: string):
  | { ok: true; url: URL }
  | {
      ok: false;
      errorCode: 'INVALID_URL' | 'UNSAFE_URL_BLOCKED';
      message: string;
    } {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    return {
      ok: false,
      errorCode: 'INVALID_URL',
      message: 'Please enter a merchant product URL before fetching details.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      ok: false,
      errorCode: 'INVALID_URL',
      message:
        'Invalid URL format. Enter a complete https:// product page URL.',
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      ok: false,
      errorCode: 'UNSAFE_URL_BLOCKED',
      message: `Unsupported URL protocol "${parsed.protocol}". Only http:// and https:// URLs are allowed.`,
    };
  }

  if (parsed.username || parsed.password) {
    return {
      ok: false,
      errorCode: 'UNSAFE_URL_BLOCKED',
      message: 'Product URLs containing embedded username or password credentials are blocked.',
    };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) {
    return {
      ok: false,
      errorCode: 'INVALID_URL',
      message: 'Product URL is missing a valid hostname.',
    };
  }

  if (
    BLOCKED_EXACT_HOSTS.has(host) ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localdomain')
  ) {
    return {
      ok: false,
      errorCode: 'UNSAFE_URL_BLOCKED',
      message: `Blocked internal or reserved hostname "${host}".`,
    };
  }

  if (net.isIP(host) !== 0 && isPrivateOrReservedIp(host)) {
    return {
      ok: false,
      errorCode: 'UNSAFE_URL_BLOCKED',
      message: `Blocked private, loopback, or link-local IP address "${host}".`,
    };
  }

  return { ok: true, url: parsed };
}

async function assertPublicDnsResolution(hostname: string): Promise<void> {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (net.isIP(host) !== 0) {
    if (isPrivateOrReservedIp(host)) {
      throw new Error(`UNSAFE_URL_BLOCKED: Private or reserved IP "${host}".`);
    }
    return;
  }

  const records = await dns.lookup(host, { all: true });
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`DNS resolution returned no IP addresses for "${host}".`);
  }
  for (const record of records) {
    if (isPrivateOrReservedIp(record.address)) {
      throw new Error(
        `UNSAFE_URL_BLOCKED: Host "${host}" resolved to restricted address ${record.address}.`
      );
    }
  }
}

export type SafeFetchLike = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

async function readResponseWithSizeCap(
  response: Response,
  maxBytes: number
): Promise<string> {
  const contentLengthHeader = response.headers.get('content-length');
  if (contentLengthHeader) {
    const declaredBytes = Number(contentLengthHeader);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw new Error(
        `TOO_LARGE: Remote page exceeded ${Math.round(maxBytes / (1024 * 1024))}MB limit.`
      );
    }
  }

  if (!response.body || typeof response.body.getReader !== 'function') {
    const txt = await response.text();
    if (Buffer.byteLength(txt, 'utf8') > maxBytes) {
      throw new Error(
        `TOO_LARGE: Remote response exceeded ${Math.round(maxBytes / (1024 * 1024))}MB limit.`
      );
    }
    return txt;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {}
        throw new Error(
          `TOO_LARGE: Remote response exceeded ${Math.round(maxBytes / (1024 * 1024))}MB limit.`
        );
      }
      chunks.push(value);
    }
  }

  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

async function fetchExternalResourceSafely(
  initialUrl: string,
  options: {
    accept: string;
    fetchImpl?: SafeFetchLike;
    skipDnsCheck?: boolean;
  }
): Promise<{
  ok: boolean;
  status: number;
  finalUrl: string;
  contentType: string;
  body: string;
  errorCode?: ProductUrlExtractionFailure['errorCode'];
  message?: string;
}> {
  const fetcher = options.fetchImpl ?? fetch;
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
    const check = validateSafeExternalProductUrl(currentUrl);
    if (!check.ok) {
      return {
        ok: false,
        status: check.errorCode === 'INVALID_URL' ? 400 : 403,
        finalUrl: currentUrl,
        contentType: '',
        body: '',
        errorCode: check.errorCode,
        message: check.message,
      };
    }

    if (!options.skipDnsCheck) {
      try {
        await assertPublicDnsResolution(check.url.hostname);
      } catch (err: any) {
        const msg = String(err?.message || 'DNS resolution failed.');
        const isUnsafe = msg.startsWith('UNSAFE_URL_BLOCKED');
        return {
          ok: false,
          status: isUnsafe ? 403 : 502,
          finalUrl: currentUrl,
          contentType: '',
          body: '',
          errorCode: isUnsafe ? 'UNSAFE_URL_BLOCKED' : 'FETCH_NETWORK_ERROR',
          message: msg.replace(/^UNSAFE_URL_BLOCKED:\s*/, ''),
        };
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetcher(check.url.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          Accept: options.accept,
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent':
            'Mozilla/5.0 (compatible; ScienceOfGiftsEditorialBot/1.0; +https://scienceofgifts.com)',
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          return {
            ok: false,
            status: 502,
            finalUrl: currentUrl,
            contentType: '',
            body: '',
            errorCode: 'FETCH_HTTP_ERROR',
            message: `Remote server returned redirect HTTP ${response.status} without a Location header.`,
          };
        }
        currentUrl = new URL(location, check.url).toString();
        continue;
      }

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          finalUrl: currentUrl,
          contentType: response.headers.get('content-type') || '',
          body: '',
          errorCode: 'FETCH_HTTP_ERROR',
          message: `Merchant page returned HTTP ${response.status}. Some storefronts block automated requests—you can enter known facts manually below.`,
        };
      }

      const body = await readResponseWithSizeCap(response, MAX_RESPONSE_BYTES);
      return {
        ok: true,
        status: response.status,
        finalUrl: currentUrl,
        contentType: (response.headers.get('content-type') || '').toLowerCase(),
        body,
      };
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (err?.name === 'AbortError' || msg.toLowerCase().includes('abort')) {
        return {
          ok: false,
          status: 504,
          finalUrl: currentUrl,
          contentType: '',
          body: '',
          errorCode: 'FETCH_TIMEOUT',
          message: `Timed out after ${Math.round(FETCH_TIMEOUT_MS / 1000)}s waiting for merchant URL.`,
        };
      }
      if (msg.startsWith('TOO_LARGE:')) {
        return {
          ok: false,
          status: 413,
          finalUrl: currentUrl,
          contentType: '',
          body: '',
          errorCode: 'TOO_LARGE',
          message: msg.replace(/^TOO_LARGE:\s*/, ''),
        };
      }
      return {
        ok: false,
        status: 502,
        finalUrl: currentUrl,
        contentType: '',
        body: '',
        errorCode: 'FETCH_NETWORK_ERROR',
        message: `Unable to reach merchant URL: ${msg || 'network error.'}`,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    ok: false,
    status: 502,
    finalUrl: currentUrl,
    contentType: '',
    body: '',
    errorCode: 'FETCH_NETWORK_ERROR',
    message: `Exceeded maximum HTTP redirects (${MAX_REDIRECT_HOPS}).`,
  };
}

// =============================================================================
// HTML & STRUCTURED DATA PARSING HELPERS
// =============================================================================

export function decodeHtmlEntities(input: string): string {
  return String(input || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : '';
    });
}

export function stripHtmlTags(input: string): string {
  const withoutScripts = String(input || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(withoutScripts)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeImageUrl(raw: unknown, baseUrl: string): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  try {
    const resolved = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed, baseUrl);
    if (resolved.protocol !== 'https:' && resolved.protocol !== 'http:') return null;
    if (resolved.protocol === 'http:') {
      resolved.protocol = 'https:';
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

function parsePositivePrice(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw * 100) / 100 : null;
  }
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    if (!cleaned) return null;
    const num = Number(cleaned);
    return Number.isFinite(num) && num > 0 ? Math.round(num * 100) / 100 : null;
  }
  return null;
}

function parseAvailabilitySchemaValue(
  raw: unknown
): { inStock: boolean | null; label: string | null } {
  const str = String(raw || '').trim();
  if (!str) return { inStock: null, label: null };
  const lower = str.toLowerCase();
  if (lower.includes('instock') || lower === 'in stock' || lower === 'available') {
    return { inStock: true, label: 'In Stock' };
  }
  if (
    lower.includes('outofstock') ||
    lower.includes('out of stock') ||
    lower.includes('soldout') ||
    lower.includes('sold out') ||
    lower.includes('discontinued')
  ) {
    return { inStock: false, label: 'Out of Stock' };
  }
  if (lower.includes('preorder') || lower.includes('pre-order')) {
    return { inStock: false, label: 'Pre-Order' };
  }
  if (lower.includes('backorder')) {
    return { inStock: false, label: 'Backorder' };
  }
  if (lower.includes('limitedavailability')) {
    return { inStock: true, label: 'Limited Availability' };
  }
  return { inStock: null, label: str.split('/').pop() || str };
}

function parseHtmlAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex =
    /([a-zA-Z0-9_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(tag)) !== null) {
    const key = match[1].toLowerCase();
    const value = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? '').trim();
    attrs[key] = value;
  }
  return attrs;
}

function extractMetaMapFromHtml(html: string): Map<string, string[]> {
  const metaMap = new Map<string, string[]>();
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const attrs = parseHtmlAttributes(tag);
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase();
    const content = attrs.content;
    if (key && content) {
      const existing = metaMap.get(key) || [];
      existing.push(content);
      metaMap.set(key, existing);
    }
  }
  return metaMap;
}

function flattenJsonLdProductNodes(parsed: unknown): Array<Record<string, any>> {
  const nodes: Array<Record<string, any>> = [];
  const visit = (item: unknown) => {
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (!item || typeof item !== 'object') return;
    const obj = item as Record<string, any>;
    const rawType = obj['@type'];
    const types = Array.isArray(rawType)
      ? rawType.map((t) => String(t).toLowerCase())
      : typeof rawType === 'string'
      ? [rawType.toLowerCase()]
      : [];
    if (types.includes('product') || types.includes('productgroup')) {
      nodes.push(obj);
    }
    if (Array.isArray(obj['@graph'])) visit(obj['@graph']);
    if (obj.mainEntity) visit(obj.mainEntity);
    if (obj.itemListElement) visit(obj.itemListElement);
  };
  visit(parsed);
  return nodes;
}

function extractJsonLdProductsFromHtml(html: string): Array<Record<string, any>> {
  const products: Array<Record<string, any>> = [];
  const scriptRegex =
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    const rawJson = match[1]?.trim();
    if (!rawJson) continue;
    try {
      const parsed = JSON.parse(rawJson);
      products.push(...flattenJsonLdProductNodes(parsed));
    } catch {
      // Try stripping trailing commas in malformed storefront JSON-LD
      try {
        const sanitized = rawJson.replace(/,\s*([}\]])/g, '$1');
        const parsed = JSON.parse(sanitized);
        products.push(...flattenJsonLdProductNodes(parsed));
      } catch {
        // Ignore unparseable JSON-LD blocks
      }
    }
  }
  return products;
}

function extractHtmlSpecPairs(html: string): ExtractedProductSpecification[] {
  const specs: ExtractedProductSpecification[] = [];
  const seen = new Set<string>();
  const pushSpec = (label: string, value: string) => {
    const cleanLabel = stripHtmlTags(label).replace(/:+$/, '').trim();
    const cleanVal = stripHtmlTags(value).trim();
    if (
      !cleanLabel ||
      !cleanVal ||
      cleanLabel.length > 50 ||
      cleanVal.length > 260 ||
      cleanLabel.toLowerCase() === cleanVal.toLowerCase()
    ) {
      return;
    }
    const key = `${cleanLabel.toLowerCase()}::${cleanVal.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    specs.push({ label: cleanLabel, value: cleanVal, source: 'html' });
  };

  // Match concise <tr><th>Label</th><td>Value</td></tr> or <tr><td>Label</td><td>Value</td></tr>
  const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRegex.exec(html)) !== null && specs.length < 15) {
    const rowHtml = trMatch[1];
    const cells = Array.from(rowHtml.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi));
    if (cells.length === 2) {
      pushSpec(cells[0][1], cells[1][1]);
    }
  }

  // Match concise <dt>Label</dt><dd>Value</dd>
  const dtDdRegex = /<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi;
  let dtMatch: RegExpExecArray | null;
  while ((dtMatch = dtDdRegex.exec(html)) !== null && specs.length < 15) {
    pushSpec(dtMatch[1], dtMatch[2]);
  }

  return specs;
}

function dedupeStrings(items: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const trimmed = String(item || '').trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(trimmed);
    }
  }
  return out;
}

/**
 * Pure extraction & merge engine combining JSON-LD, Shopify product JSON,
 * and OpenGraph/HTML metadata. Exported cleanly for unit testing.
 */
export function parseProductDetailsFromSources(input: {
  sourceUrl: string;
  finalUrl?: string;
  html?: string | null;
  shopifyJson?: Record<string, any> | null;
  fetchedAt?: string;
}): ExtractedProductDetails {
  const baseUrl = input.finalUrl || input.sourceUrl;
  const html = input.html || '';
  const shopifyProduct =
    input.shopifyJson &&
    typeof input.shopifyJson === 'object' &&
    input.shopifyJson.product &&
    typeof input.shopifyJson.product === 'object'
      ? input.shopifyJson.product
      : null;

  const extractionSources: ExtractedProductDetails['extractionSources'] = [];
  const metaMap = html ? extractMetaMapFromHtml(html) : new Map<string, string[]>();
  const jsonLdNodes = html ? extractJsonLdProductsFromHtml(html) : [];
  const primaryLd = jsonLdNodes[0] || null;

  if (primaryLd) extractionSources.push('json-ld');
  if (shopifyProduct) extractionSources.push('shopify-json');
  if (
    metaMap.has('og:title') ||
    metaMap.has('og:image') ||
    metaMap.has('product:price:amount')
  ) {
    extractionSources.push('open-graph');
  } else if (html) {
    extractionSources.push('html-meta');
  }

  // --- Title ---
  const htmlTitleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawHtmlTitle = htmlTitleMatch ? stripHtmlTags(htmlTitleMatch[1]) : null;
  const ogTitle = metaMap.get('og:title')?.[0] || metaMap.get('twitter:title')?.[0] || null;
  const ldTitle = typeof primaryLd?.name === 'string' ? decodeHtmlEntities(primaryLd.name).trim() : null;
  const shopifyTitle =
    typeof shopifyProduct?.title === 'string' ? shopifyProduct.title.trim() : null;

  const title =
    (shopifyTitle || ldTitle || (ogTitle ? decodeHtmlEntities(ogTitle).trim() : null) || rawHtmlTitle) ||
    null;

  // --- Vendor / Brand ---
  const ldBrand =
    typeof primaryLd?.brand === 'string'
      ? primaryLd.brand.trim()
      : typeof primaryLd?.brand?.name === 'string'
      ? primaryLd.brand.name.trim()
      : typeof primaryLd?.manufacturer?.name === 'string'
      ? primaryLd.manufacturer.name.trim()
      : null;
  const metaBrand =
    metaMap.get('product:brand')?.[0] ||
    metaMap.get('og:brand')?.[0] ||
    metaMap.get('og:site_name')?.[0] ||
    null;
  const shopifyVendor =
    typeof shopifyProduct?.vendor === 'string' ? shopifyProduct.vendor.trim() : null;
  const vendor = shopifyVendor || ldBrand || (metaBrand ? decodeHtmlEntities(metaBrand).trim() : null) || null;
  const brand = ldBrand || shopifyVendor || (metaBrand ? decodeHtmlEntities(metaBrand).trim() : null) || null;

  // --- Product Type ---
  const productType =
    (typeof shopifyProduct?.product_type === 'string' && shopifyProduct.product_type.trim()) ||
    (typeof primaryLd?.category === 'string' && primaryLd.category.trim()) ||
    metaMap.get('product:category')?.[0] ||
    null;

  // --- Description ---
  const ldDescription =
    typeof primaryLd?.description === 'string'
      ? stripHtmlTags(primaryLd.description)
      : null;
  const shopifyDescription =
    typeof shopifyProduct?.body_html === 'string'
      ? stripHtmlTags(shopifyProduct.body_html)
      : null;
  const metaDescription =
    metaMap.get('og:description')?.[0] ||
    metaMap.get('description')?.[0] ||
    metaMap.get('twitter:description')?.[0] ||
    null;
  const description =
    shopifyDescription ||
    ldDescription ||
    (metaDescription ? stripHtmlTags(metaDescription) : null) ||
    null;

  // --- Offers / Price / Availability ---
  const collectedOffers: Array<Record<string, any>> = [];
  for (const node of jsonLdNodes) {
    const addOffer = (o: unknown) => {
      if (Array.isArray(o)) o.forEach(addOffer);
      else if (o && typeof o === 'object') collectedOffers.push(o as Record<string, any>);
    };
    addOffer(node.offers);
    if (Array.isArray(node.hasVariant)) {
      for (const v of node.hasVariant) {
        if (v && typeof v === 'object') addOffer((v as Record<string, any>).offers);
      }
    }
  }

  let price: number | null = null;
  let currency = 'USD';
  let inStock: boolean | null = null;
  let availabilityLabel: string | null = null;

  // 1) JSON-LD offers
  for (const offer of collectedOffers) {
    if (price === null) {
      price =
        parsePositivePrice(offer.price) ??
        parsePositivePrice(offer.lowPrice) ??
        parsePositivePrice(offer.priceSpecification?.price);
    }
    if (offer.priceCurrency && typeof offer.priceCurrency === 'string') {
      currency = offer.priceCurrency.trim().toUpperCase();
    }
    const parsedAvail = parseAvailabilitySchemaValue(offer.availability);
    if (parsedAvail.inStock !== null) {
      // If any offer is InStock, product has in-stock availability
      if (inStock === null || parsedAvail.inStock === true) {
        inStock = parsedAvail.inStock;
        availabilityLabel = parsedAvail.label;
      }
    } else if (!availabilityLabel && parsedAvail.label) {
      availabilityLabel = parsedAvail.label;
    }
  }

  // 2) OpenGraph / product meta fallback
  const metaPrice =
    parsePositivePrice(metaMap.get('product:price:amount')?.[0]) ??
    parsePositivePrice(metaMap.get('og:price:amount')?.[0]);
  if (price === null && metaPrice !== null) {
    price = metaPrice;
  }
  const metaCurrency =
    metaMap.get('product:price:currency')?.[0] ||
    metaMap.get('og:price:currency')?.[0];
  if (metaCurrency && (!collectedOffers[0]?.priceCurrency)) {
    currency = metaCurrency.trim().toUpperCase();
  }
  if (inStock === null) {
    const metaAvail =
      metaMap.get('product:availability')?.[0] ||
      metaMap.get('og:availability')?.[0];
    const parsedMetaAvail = parseAvailabilitySchemaValue(metaAvail);
    if (parsedMetaAvail.inStock !== null) {
      inStock = parsedMetaAvail.inStock;
      availabilityLabel = parsedMetaAvail.label;
    }
  }

  // --- Variants, Options, Sizes, Colors ---
  const variants: ExtractedProductVariant[] = [];
  const optionGroups: ExtractedProductOptionGroup[] = [];
  const sizeValues: string[] = [];
  const colorValues: string[] = [];

  if (shopifyProduct && Array.isArray(shopifyProduct.options)) {
    for (const opt of shopifyProduct.options) {
      const optName = String(opt?.name || '').trim();
      const optValues = Array.isArray(opt?.values)
        ? dedupeStrings(opt.values.map((v: unknown) => String(v || '')))
        : [];
      if (optName && optValues.length > 0 && !(optName === 'Title' && optValues[0] === 'Default Title')) {
        optionGroups.push({ name: optName, values: optValues });
        const lowerName = optName.toLowerCase();
        if (lowerName.includes('size')) sizeValues.push(...optValues);
        if (lowerName.includes('color') || lowerName.includes('colour') || lowerName.includes('finish')) {
          colorValues.push(...optValues);
        }
      }
    }
  }

  if (shopifyProduct && Array.isArray(shopifyProduct.variants)) {
    const optionNames = Array.isArray(shopifyProduct.options)
      ? shopifyProduct.options.map((o: any) => String(o?.name || 'Option'))
      : [];
    const shopifyAvailBooleans: boolean[] = [];

    for (const v of shopifyProduct.variants) {
      if (!v || typeof v !== 'object') continue;
      const vPrice = parsePositivePrice(v.price);
      if (price === null && vPrice !== null) {
        price = vPrice;
      }
      const vInStock = typeof v.available === 'boolean' ? v.available : null;
      if (typeof vInStock === 'boolean') shopifyAvailBooleans.push(vInStock);

      const opts: Record<string, string> = {};
      [v.option1, v.option2, v.option3].forEach((val, idx) => {
        if (typeof val === 'string' && val.trim() && val.trim() !== 'Default Title') {
          opts[optionNames[idx] || `Option ${idx + 1}`] = val.trim();
        }
      });

      const vTitle = String(v.title || '').trim();
      if (vTitle && vTitle !== 'Default Title') {
        variants.push({
          id: v.id !== undefined ? String(v.id) : undefined,
          title: vTitle,
          sku: typeof v.sku === 'string' && v.sku.trim() ? v.sku.trim() : null,
          price: vPrice,
          currency,
          inStock: vInStock,
          options: Object.keys(opts).length > 0 ? opts : undefined,
        });
      }
    }

    if (inStock === null && shopifyAvailBooleans.length > 0) {
      inStock = shopifyAvailBooleans.some(Boolean);
      availabilityLabel = inStock ? 'In Stock' : 'Out of Stock';
    }
  }

  // Merge JSON-LD `hasVariant`, `size`, `color`
  for (const node of jsonLdNodes) {
    if (typeof node.size === 'string') sizeValues.push(node.size);
    if (Array.isArray(node.size)) node.size.forEach((s) => typeof s === 'string' && sizeValues.push(s));
    if (typeof node.color === 'string') colorValues.push(node.color);
    if (Array.isArray(node.color)) node.color.forEach((c) => typeof c === 'string' && colorValues.push(c));

    if (variants.length === 0 && Array.isArray(node.hasVariant)) {
      for (const hv of node.hasVariant) {
        if (!hv || typeof hv !== 'object') continue;
        const hvOffer = Array.isArray(hv.offers) ? hv.offers[0] : hv.offers;
        const hvAvail = parseAvailabilitySchemaValue(hvOffer?.availability);
        const hvName = String(hv.name || hv.size || hv.color || '').trim();
        if (typeof hv.size === 'string') sizeValues.push(hv.size);
        if (typeof hv.color === 'string') colorValues.push(hv.color);
        if (hvName) {
          variants.push({
            id: typeof hv.sku === 'string' ? hv.sku : undefined,
            title: hvName,
            sku: typeof hv.sku === 'string' ? hv.sku : null,
            price: parsePositivePrice(hvOffer?.price),
            currency: hvOffer?.priceCurrency || currency,
            inStock: hvAvail.inStock,
          });
        }
      }
    }
  }

  // --- Materials, Dimensions & Specifications ---
  const materials: string[] = [];
  let dimensions: string | null = null;
  const specifications: ExtractedProductSpecification[] = [];
  const specSeen = new Set<string>();

  const pushSpecUnique = (
    label: string,
    value: string,
    source: ExtractedProductSpecification['source']
  ) => {
    const cleanLabel = label.trim();
    const cleanValue = value.trim();
    if (!cleanLabel || !cleanValue) return;
    const key = cleanLabel.toLowerCase();
    if (specSeen.has(key)) return;
    specSeen.add(key);
    specifications.push({ label: cleanLabel, value: cleanValue, source });
  };

  for (const node of jsonLdNodes) {
    if (typeof node.material === 'string') {
      materials.push(node.material.trim());
      pushSpecUnique('Materials', node.material.trim(), 'json-ld');
    } else if (Array.isArray(node.material)) {
      const joined = dedupeStrings(node.material.map((m) => String(m || ''))).join(', ');
      if (joined) {
        materials.push(joined);
        pushSpecUnique('Materials', joined, 'json-ld');
      }
    }

    const dimParts: string[] = [];
    for (const dimKey of ['width', 'height', 'depth', 'weight'] as const) {
      const val = node[dimKey];
      if (!val) continue;
      if (typeof val === 'string' || typeof val === 'number') {
        dimParts.push(`${dimKey[0].toUpperCase()}${dimKey.slice(1)}: ${val}`);
      } else if (typeof val === 'object') {
        const qVal = val.value ?? val.minValue;
        const unit = val.unitText || val.unitCode || '';
        if (qVal !== undefined && qVal !== null) {
          dimParts.push(
            `${dimKey[0].toUpperCase()}${dimKey.slice(1)}: ${qVal}${unit ? ` ${unit}` : ''}`
          );
        }
      }
    }
    if (dimParts.length > 0 && !dimensions) {
      dimensions = dimParts.join(' · ');
      pushSpecUnique('Dimensions / Weight', dimensions, 'json-ld');
    }

    if (Array.isArray(node.additionalProperty)) {
      for (const prop of node.additionalProperty) {
        if (prop && typeof prop === 'object' && prop.name && prop.value !== undefined) {
          const propName = String(prop.name).trim();
          const propVal = String(prop.value).trim();
          pushSpecUnique(propName, propVal, 'json-ld');
          if (propName.toLowerCase().includes('material')) {
            materials.push(propVal);
          }
          if (
            !dimensions &&
            (propName.toLowerCase().includes('dimension') ||
              propName.toLowerCase().includes('size'))
          ) {
            dimensions = propVal;
          }
        }
      }
    }
  }

  // Supplement from HTML specification tables/definition lists
  if (html) {
    for (const htmlSpec of extractHtmlSpecPairs(html)) {
      pushSpecUnique(htmlSpec.label, htmlSpec.value, 'html');
      if (htmlSpec.label.toLowerCase().includes('material')) {
        materials.push(htmlSpec.value);
      }
      if (
        !dimensions &&
        (htmlSpec.label.toLowerCase().includes('dimension') ||
          htmlSpec.label.toLowerCase().includes('measurement'))
      ) {
        dimensions = htmlSpec.value;
      }
    }
  }

  // --- Images (Deduplicated, priority: Shopify high-res > JSON-LD > OpenGraph) ---
  const images: ExtractedProductImage[] = [];
  const seenImageUrls = new Set<string>();
  const addImage = (
    rawUrl: unknown,
    altText: string | undefined,
    source: ExtractedProductImage['source'],
    width?: number,
    height?: number
  ) => {
    const normalized = normalizeImageUrl(rawUrl, baseUrl);
    if (!normalized) return;
    const dedupeKey = normalized.split('?')[0].toLowerCase();
    if (seenImageUrls.has(dedupeKey)) return;
    seenImageUrls.add(dedupeKey);
    images.push({
      url: normalized,
      alt:
        (altText && altText.trim()) ||
        `${title || 'Product'} photograph ${images.length + 1}`,
      width: typeof width === 'number' && width > 0 ? width : undefined,
      height: typeof height === 'number' && height > 0 ? height : undefined,
      source,
    });
  };

  if (shopifyProduct && Array.isArray(shopifyProduct.images)) {
    for (const img of shopifyProduct.images) {
      if (img && typeof img === 'object') {
        addImage(
          img.src || img.url,
          typeof img.alt === 'string' ? img.alt : undefined,
          'merchant-api',
          typeof img.width === 'number' ? img.width : undefined,
          typeof img.height === 'number' ? img.height : undefined
        );
      } else if (typeof img === 'string') {
        addImage(img, undefined, 'merchant-api');
      }
    }
  }

  for (const node of jsonLdNodes) {
    const visitLdImg = (val: unknown) => {
      if (typeof val === 'string') {
        addImage(val, undefined, 'json-ld');
      } else if (Array.isArray(val)) {
        val.forEach(visitLdImg);
      } else if (val && typeof val === 'object') {
        const obj = val as Record<string, any>;
        addImage(
          obj.url || obj.contentUrl,
          typeof obj.caption === 'string' ? obj.caption : typeof obj.name === 'string' ? obj.name : undefined,
          'json-ld',
          typeof obj.width === 'number' ? obj.width : undefined,
          typeof obj.height === 'number' ? obj.height : undefined
        );
      }
    };
    visitLdImg(node.image);
  }

  const ogImages = [
    ...(metaMap.get('og:image:secure_url') || []),
    ...(metaMap.get('og:image') || []),
    ...(metaMap.get('twitter:image') || []),
  ];
  for (const ogImg of ogImages) {
    addImage(ogImg, metaMap.get('og:image:alt')?.[0], 'open-graph');
  }

  const finalMaterials = dedupeStrings(materials);
  const finalSizes = dedupeStrings(sizeValues);
  const finalColors = dedupeStrings(colorValues);

  // --- Missing & Unverified Callouts ---
  const missingFields: string[] = [];
  if (!title) missingFields.push('Product Title');
  if (!vendor) missingFields.push('Merchant / Brand');
  if (price === null) missingFields.push('Retail Price');
  if (inStock === null) missingFields.push('Stock Availability');
  if (!description) missingFields.push('Merchant Description');
  if (images.length === 0) missingFields.push('Product Photography');
  if (finalMaterials.length === 0) missingFields.push('Materials');
  if (!dimensions) missingFields.push('Dimensions');
  if (variants.length === 0 && finalSizes.length === 0 && finalColors.length === 0) {
    missingFields.push('Variants / Sizes / Colors');
  }

  const unverifiedFields: string[] = [];
  if (price !== null) {
    unverifiedFields.push(
      `Retail price ($${price} ${currency}) retrieved from merchant page — human editor confirmation required before marking verified.`
    );
  } else {
    unverifiedFields.push('Retail price could not be extracted from merchant markup.');
  }
  if (inStock !== null) {
    unverifiedFields.push(
      `Availability ("${availabilityLabel || (inStock ? 'In Stock' : 'Out of Stock')}") retrieved from merchant markup — confirm live stock status.`
    );
  } else {
    unverifiedFields.push('Stock availability could not be extracted from merchant markup.');
  }

  return {
    ok: true,
    sourceUrl: input.sourceUrl,
    finalUrl: baseUrl,
    fetchedAt: input.fetchedAt || new Date().toISOString(),
    extractionSources:
      extractionSources.length > 0 ? extractionSources : ['html-meta'],
    title,
    description,
    vendor,
    brand,
    productType,
    price,
    currency,
    inStock,
    availabilityLabel,
    images: images.slice(0, 12),
    materials: finalMaterials,
    dimensions,
    specifications: specifications.slice(0, 15),
    variants: variants.slice(0, 30),
    sizes: finalSizes,
    colors: finalColors,
    optionGroups,
    missingFields,
    unverifiedFields,
    priceVerified: false,
    inventoryVerified: false,
    merchantDomain: (() => {
      try {
        return new URL(baseUrl || input.sourceUrl).hostname.toLowerCase();
      } catch {
        return undefined;
      }
    })(),
    commerceProvider: (() => {
      const target = (baseUrl || input.sourceUrl || '').toLowerCase();
      if (
        target.includes('shop.scienceofgifts.com') ||
        target.includes('fourthwall.com')
      ) {
        return 'fourthwall' as const;
      }
      return 'affiliate' as const;
    })(),
  };
}

function buildShopifyProductJsonCandidateUrl(targetUrl: URL): string | null {
  // Matches /products/<handle> or /<locale>/products/<handle>
  const match = targetUrl.pathname.match(/^(.*?\/products\/[^/?#]+?)\/?$/i);
  if (!match) return null;
  const basePath = match[1].replace(/\.json$/i, '');
  return `${targetUrl.origin}${basePath}.json`;
}

/**
 * Fetches a merchant product URL server-side with full SSRF validation,
 * parses JSON-LD + Shopify `.json` (when applicable) + OpenGraph fallback,
 * and returns structured details with provenance and missing/unverified indicators.
 */
export async function extractProductDetailsFromUrl(
  rawUrl: string,
  options?: {
    fetchImpl?: SafeFetchLike;
    skipDnsCheck?: boolean;
  }
): Promise<ProductUrlExtractionResult> {
  const initialCheck = validateSafeExternalProductUrl(rawUrl);
  if (!initialCheck.ok) {
    return {
      ok: false,
      status: initialCheck.errorCode === 'INVALID_URL' ? 400 : 403,
      errorCode: initialCheck.errorCode,
      message: initialCheck.message,
      sourceUrl: rawUrl,
    };
  }

  const normalizedUrl = initialCheck.url.toString();

  // Fetch main product HTML page
  const htmlFetch = await fetchExternalResourceSafely(normalizedUrl, {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    fetchImpl: options?.fetchImpl,
    skipDnsCheck: options?.skipDnsCheck,
  });

  // Also check if a Shopify /products/<handle>.json endpoint exists on the resolved origin
  const effectiveUrlObj = (() => {
    try {
      return new URL(htmlFetch.finalUrl || normalizedUrl);
    } catch {
      return initialCheck.url;
    }
  })();

  const shopifyJsonUrl = buildShopifyProductJsonCandidateUrl(effectiveUrlObj);
  let shopifyJson: Record<string, any> | null = null;

  if (shopifyJsonUrl) {
    const jsonFetch = await fetchExternalResourceSafely(shopifyJsonUrl, {
      accept: 'application/json',
      fetchImpl: options?.fetchImpl,
      skipDnsCheck: options?.skipDnsCheck,
    });
    if (jsonFetch.ok && jsonFetch.body) {
      try {
        const parsed = JSON.parse(jsonFetch.body);
        if (parsed && typeof parsed === 'object' && parsed.product) {
          shopifyJson = parsed;
        }
      } catch {
        // Non-Shopify or invalid JSON endpoint; ignore gracefully
      }
    }
  }

  if (!htmlFetch.ok && !shopifyJson) {
    return {
      ok: false,
      status: htmlFetch.status || 502,
      errorCode: htmlFetch.errorCode || 'FETCH_HTTP_ERROR',
      message:
        htmlFetch.message ||
        'Unable to retrieve product details from the supplied URL.',
      sourceUrl: normalizedUrl,
    };
  }

  const parsed = parseProductDetailsFromSources({
    sourceUrl: normalizedUrl,
    finalUrl: htmlFetch.finalUrl || normalizedUrl,
    html: htmlFetch.ok ? htmlFetch.body : null,
    shopifyJson,
  });

  if (
    !parsed.title &&
    !parsed.description &&
    parsed.price === null &&
    parsed.images.length === 0 &&
    parsed.specifications.length === 0
  ) {
    return {
      ok: false,
      status: 422,
      errorCode: 'NO_EXTRACTABLE_DATA',
      message:
        'Fetched page contained no structured product metadata (JSON-LD, Shopify JSON, or OpenGraph). You can supply known details manually below before exporting the brief.',
      sourceUrl: normalizedUrl,
    };
  }

  return parsed;
}
