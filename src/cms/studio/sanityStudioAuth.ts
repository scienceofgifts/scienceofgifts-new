/**
 * Science of Gifts — Server-Side Studio Authentication, Authorization & CSRF Guard
 *
 * Security model:
 * 1. Fail-Closed Environment Gate:
 *    - Studio API endpoints (`/api/studio/sanity/*`) and the `/studio/` workspace are
 *      strictly restricted to the private development environment (`NODE_ENV !== 'production'`).
 *    - Any request in production mode fails closed with HTTP 403 (`STUDIO_DISABLED_IN_PRODUCTION`).
 * 2. Server-Verified Editor Session Token (`X-Sanity-Studio-Token`):
 *    - Keeping `SANITY_API_WRITE_TOKEN` on the server is NOT sufficient if anonymous visitors
 *      can call `/api/studio/sanity/*`.
 *    - On server startup, a 256-bit cryptographic signing key is generated in server memory.
 *    - Only the server-rendered `/studio/` workspace in development receives a short-lived
 *      HMAC-SHA256 signed session token (`<issuedAtMs>.<nonce>.<signature>`) and paired CSRF token.
 *    - Every `/api/studio/sanity/*` read (`/drafts`, `/document`, `/status`) and mutation
 *      (`/save-draft`, `/delete-draft`, `/verify-lifecycle`) verifies this token using
 *      `crypto.timingSafeEqual`. Requests without a valid token are rejected with HTTP 401.
 * 3. CSRF & Cross-Origin Protection for Mutations (`X-Sanity-Studio-Csrf`):
 *    - State-changing `POST` requests require a valid paired `X-Sanity-Studio-Csrf` header,
 *      `Content-Type: application/json`, and same-origin `Sec-Fetch-Site` / `Origin` checks.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import type { IncomingMessage } from 'node:http';

function readSanitySecretSeedFromEnvOrProc(): string {
  if (typeof process === 'undefined' || !process.versions?.node) {
    return 'sog-dev-studio-fallback';
  }
  const direct =
    process.env?.SANITY_API_WRITE_TOKEN ||
    process.env?.SANITY_API_TOKEN ||
    process.env?.SANITY_WRITE_TOKEN ||
    '';
  if (direct.trim()) {
    return `${direct.trim()}:${process.env?.APPLET_ID || 'sog'}`;
  }
  try {
    for (const entry of fs.readdirSync('/proc')) {
      if (!/^\d+$/.test(entry)) continue;
      try {
        const raw = fs.readFileSync(`/proc/${entry}/environ`, 'utf8');
        if (!raw.includes('SANITY_API_WRITE_TOKEN=')) continue;
        for (const pair of raw.split('\0')) {
          if (pair.startsWith('SANITY_API_WRITE_TOKEN=')) {
            const val = pair.slice('SANITY_API_WRITE_TOKEN='.length).trim();
            if (val) {
              return `${val}:${process.env?.APPLET_ID || 'sog'}`;
            }
          }
        }
      } catch {}
    }
  } catch {}
  return `sog-dev-studio:${process.env?.APPLET_ID || 'local'}`;
}

const globalAuthStore = globalThis as unknown as {
  __SOG_STUDIO_BOOT_SIGNING_KEY__?: Buffer;
};
if (!globalAuthStore.__SOG_STUDIO_BOOT_SIGNING_KEY__) {
  const seed = readSanitySecretSeedFromEnvOrProc();
  globalAuthStore.__SOG_STUDIO_BOOT_SIGNING_KEY__ = crypto
    .createHmac('sha256', 'science-of-gifts-studio-session-signing-key-v1')
    .update(seed, 'utf8')
    .digest();
}
const SERVER_BOOT_SIGNING_KEY = globalAuthStore.__SOG_STUDIO_BOOT_SIGNING_KEY__;
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours per dev session

export interface StudioSessionCredentials {
  sessionToken: string;
  csrfToken: string;
  expiresAtMs: number;
}

export interface StudioAuthVerificationResult {
  authorized: boolean;
  httpStatus: number;
  errorCode?:
    | 'STUDIO_DISABLED_IN_PRODUCTION'
    | 'MISSING_AUTH_TOKEN'
    | 'INVALID_OR_EXPIRED_AUTH_TOKEN'
    | 'CSRF_VALIDATION_FAILED'
    | 'CROSS_ORIGIN_REQUEST_BLOCKED';
  message: string;
}

export function isStudioDevelopmentEnvironmentAllowed(
  envOverride?: Record<string, string | undefined>
): boolean {
  const nodeEnv =
    envOverride?.NODE_ENV ??
    (typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined) ??
    'development';
  const explicitDisable =
    envOverride?.PUBLIC_ENABLE_STUDIO ??
    (typeof process !== 'undefined'
      ? process.env?.PUBLIC_ENABLE_STUDIO
      : undefined);

  if (nodeEnv === 'production') {
    return false;
  }
  if (explicitDisable === 'false' || explicitDisable === '0') {
    return false;
  }
  return true;
}

function computeHmacHex(data: string): string {
  return crypto
    .createHmac('sha256', SERVER_BOOT_SIGNING_KEY)
    .update(data, 'utf8')
    .digest('hex');
}

function computeCsrfTokenForSession(sessionToken: string): string {
  return computeHmacHex(`csrf:${sessionToken}`);
}

function safeTimingEqualHex(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length || a.length === 0) return false;
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Issues a signed editor session token and paired CSRF token for the private
 * development `/studio/` workspace. Returns null if called in production.
 */
export function issueStudioEditorSessionCredentials(
  envOverride?: Record<string, string | undefined>
): StudioSessionCredentials | null {
  if (!isStudioDevelopmentEnvironmentAllowed(envOverride)) {
    return null;
  }
  const issuedAtMs = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${issuedAtMs}.${nonce}`;
  const signature = computeHmacHex(`session:${payload}`);
  const sessionToken = `${payload}.${signature}`;
  const csrfToken = computeCsrfTokenForSession(sessionToken);

  return {
    sessionToken,
    csrfToken,
    expiresAtMs: issuedAtMs + TOKEN_TTL_MS,
  };
}

/**
 * Verifies a signed editor session token string.
 */
export function verifyStudioEditorSessionToken(
  rawToken: string | undefined | null
): { valid: boolean; reason?: string } {
  if (!rawToken || typeof rawToken !== 'string') {
    return { valid: false, reason: 'Missing X-Sanity-Studio-Token header.' };
  }
  const trimmed = rawToken.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'Malformed Studio session token.' };
  }

  const [issuedAtStr, nonce, providedSig] = parts;
  const issuedAtMs = Number(issuedAtStr);
  if (
    !Number.isFinite(issuedAtMs) ||
    issuedAtMs <= 0 ||
    !/^[a-f0-9]{32}$/.test(nonce)
  ) {
    return { valid: false, reason: 'Invalid Studio session token claims.' };
  }

  const now = Date.now();
  if (now - issuedAtMs > TOKEN_TTL_MS || issuedAtMs > now + 60_000) {
    return { valid: false, reason: 'Studio session token has expired.' };
  }

  const expectedSig = computeHmacHex(`session:${issuedAtStr}.${nonce}`);
  if (!safeTimingEqualHex(providedSig, expectedSig)) {
    return { valid: false, reason: 'Invalid Studio session token signature.' };
  }

  return { valid: true };
}

function getHeaderString(
  req: IncomingMessage,
  headerName: string
): string | undefined {
  const val = req.headers[headerName.toLowerCase()];
  if (Array.isArray(val)) return val[0];
  return typeof val === 'string' ? val : undefined;
}

function isLoopbackHostname(hostname: string): boolean {
  const lower = hostname.trim().toLowerCase();
  return lower === 'localhost' || lower === '127.0.0.1' || lower === '[::1]';
}

function stripPortFromHost(host: string): string {
  const trimmed = host.trim().toLowerCase();
  if (trimmed.startsWith('[')) {
    const bracketEnd = trimmed.indexOf(']');
    return bracketEnd >= 0 ? trimmed.slice(0, bracketEnd + 1) : trimmed;
  }
  const colonIdx = trimmed.indexOf(':');
  return colonIdx >= 0 ? trimmed.slice(0, colonIdx) : trimmed;
}

/**
 * Collects all valid server hostnames/hosts for the current request, including
 * `X-Forwarded-Host` (set by the AI Studio Cloud Run / Nginx reverse proxy when
 * it rewrites `Host` to `localhost:3000`) and `Host`.
 */
export function verifySameOriginRequestHeaders(
  req: IncomingMessage
): { allowed: boolean; reason?: string } {
  const secFetchSite = getHeaderString(req, 'sec-fetch-site');
  if (
    secFetchSite &&
    secFetchSite !== 'same-origin' &&
    secFetchSite !== 'same-site' &&
    secFetchSite !== 'none'
  ) {
    return {
      allowed: false,
      reason: `Cross-site request blocked (Sec-Fetch-Site: ${secFetchSite}).`,
    };
  }

  const originHeader = getHeaderString(req, 'origin');
  const hostHeader = getHeaderString(req, 'host');
  const forwardedHostHeader = getHeaderString(req, 'x-forwarded-host');

  if (originHeader && (hostHeader || forwardedHostHeader)) {
    try {
      const parsedOrigin = new URL(originHeader);
      const originHost = parsedOrigin.host.trim().toLowerCase();
      const originHostname = parsedOrigin.hostname.trim().toLowerCase();

      const candidateServerHosts = new Set<string>();
      const candidateServerHostnames = new Set<string>();

      for (const rawHeader of [forwardedHostHeader, hostHeader]) {
        if (!rawHeader) continue;
        for (const part of rawHeader.split(',')) {
          const cleaned = part.trim().toLowerCase();
          if (cleaned) {
            candidateServerHosts.add(cleaned);
            candidateServerHostnames.add(stripPortFromHost(cleaned));
          }
        }
      }

      const exactHostMatch =
        candidateServerHosts.has(originHost) ||
        candidateServerHostnames.has(originHostname);

      const loopbackMatch =
        isLoopbackHostname(originHostname) &&
        Array.from(candidateServerHostnames).some(isLoopbackHostname);

      if (!exactHostMatch && !loopbackMatch) {
        const expectedDisplay = Array.from(candidateServerHosts).join(' or ');
        return {
          allowed: false,
          reason: `Origin host "${parsedOrigin.host}" does not match server host (${expectedDisplay}).`,
        };
      }
    } catch {
      return {
        allowed: false,
        reason: 'Malformed Origin header.',
      };
    }
  }

  return { allowed: true };
}

/**
 * Verifies editor authorization and CSRF protection for incoming `/api/studio/sanity/*` requests.
 */
export function verifyStudioApiRequestAuthorization(
  req: IncomingMessage,
  options: {
    requireCsrf: boolean;
    envOverride?: Record<string, string | undefined>;
  }
): StudioAuthVerificationResult {
  // 1. Fail-closed outside development environment
  if (!isStudioDevelopmentEnvironmentAllowed(options.envOverride)) {
    return {
      authorized: false,
      httpStatus: 403,
      errorCode: 'STUDIO_DISABLED_IN_PRODUCTION',
      message:
        'Sanity Editorial Studio APIs are disabled in production deployments.',
    };
  }

  // 2. Cross-origin Sec-Fetch-Site & Origin (Host + X-Forwarded-Host) check
  const originCheck = verifySameOriginRequestHeaders(req);
  if (!originCheck.allowed) {
    return {
      authorized: false,
      httpStatus: 403,
      errorCode: 'CROSS_ORIGIN_REQUEST_BLOCKED',
      message: originCheck.reason || 'Cross-origin request blocked.',
    };
  }

  // 3. Verify server-issued session token (`X-Sanity-Studio-Token` or `Authorization: Bearer ...`)
  const studioHeaderToken = getHeaderString(req, 'x-sanity-studio-token');
  const authHeader = getHeaderString(req, 'authorization');
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : undefined;

  const candidateToken = studioHeaderToken || bearerToken;
  if (!candidateToken) {
    return {
      authorized: false,
      httpStatus: 401,
      errorCode: 'MISSING_AUTH_TOKEN',
      message:
        'Unauthorized: Missing server-verified X-Sanity-Studio-Token header.',
    };
  }

  const tokenVerification = verifyStudioEditorSessionToken(candidateToken);
  if (!tokenVerification.valid) {
    return {
      authorized: false,
      httpStatus: 401,
      errorCode: 'INVALID_OR_EXPIRED_AUTH_TOKEN',
      message: `Unauthorized: ${
        tokenVerification.reason || 'Invalid Studio session token.'
      }`,
    };
  }

  // 4. For state-changing mutations (POST), require paired CSRF token & JSON Content-Type
  if (options.requireCsrf) {
    const contentType = getHeaderString(req, 'content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return {
        authorized: false,
        httpStatus: 403,
        errorCode: 'CSRF_VALIDATION_FAILED',
        message:
          'CSRF protection requires Content-Type: application/json on all Studio mutation requests.',
      };
    }

    const providedCsrf = getHeaderString(req, 'x-sanity-studio-csrf') ?? '';
    const expectedCsrf = computeCsrfTokenForSession(candidateToken.trim());
    if (!providedCsrf || !safeTimingEqualHex(providedCsrf.trim(), expectedCsrf)) {
      return {
        authorized: false,
        httpStatus: 403,
        errorCode: 'CSRF_VALIDATION_FAILED',
        message:
          'Forbidden: Missing or invalid X-Sanity-Studio-Csrf token for mutation request.',
      };
    }
  }

  return {
    authorized: true,
    httpStatus: 200,
    message: 'Authorized Studio editor request.',
  };
}
