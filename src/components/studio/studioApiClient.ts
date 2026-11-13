/**
 * Science of Gifts — Safe Studio API Client & JSON Response Guard
 *
 * Ensures all browser-to-server Studio requests (`/api/studio/sanity/*`):
 * 1. Attach server-verified `X-Sanity-Studio-Token` and (for mutations) `X-Sanity-Studio-Csrf` headers.
 * 2. Include `credentials: 'same-origin'` and `Accept: 'application/json'`.
 * 3. Refresh the AI Studio iframe cookie-capability marker before POST mutations so
 *    the preview Nginx proxy does not redirect background `fetch()` calls to `/__cookie_check.html`.
 * 4. Automatically recover once if:
 *    - A preview proxy 302 redirect temporarily converted a POST request into a GET request, or
 *    - A development server restart / TTL expiry requires refreshing Studio session credentials via `GET /api/studio/sanity/session`.
 * 5. Strictly check `response.ok` and `Content-Type: application/json` BEFORE parsing JSON.
 *    Never treat an unexpected HTML response (`<!doctype html>...` or `<html>...`) as a successful
 *    save or upload, and always report the request path, HTTP status, and a safe diagnostic message.
 */

export interface StudioClientSessionCredentials {
  sessionToken: string;
  csrfToken: string;
  expiresAtMs: number;
}

export interface StudioApiRequestOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, any>;
  sessionCredentials?: StudioClientSessionCredentials | null;
  cache?: RequestCache;
}

export interface StudioApiParsedResponse<T = Record<string, any>> {
  ok: boolean;
  httpStatus: number;
  redirected: boolean;
  contentType: string;
  isJson: boolean;
  data: T | null;
  errorCode?: string;
  diagnosticMessage?: string;
}

let cachedDynamicSessionCredentials: StudioClientSessionCredentials | null = null;

function ensureAiStudioPreviewCookieCapabilityFlag(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  try {
    if (window.location.protocol === 'https:' && window.location.hostname) {
      document.cookie = `__SECURE-aistudio_auth_flow_may_set_cookies=true; Path=/; Secure; SameSite=None; Domain=${window.location.hostname}; Partitioned; Max-Age=60;`;
    }
  } catch {
    // Ignore cookie errors in restricted environments
  }
}

function resolveEffectiveCredentials(
  provided?: StudioClientSessionCredentials | null
): StudioClientSessionCredentials | null {
  if (cachedDynamicSessionCredentials) {
    return cachedDynamicSessionCredentials;
  }
  return provided ?? null;
}

function buildRequestHeaders(
  isMutation: boolean,
  credentials: StudioClientSessionCredentials | null
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (credentials?.sessionToken) {
    headers['X-Sanity-Studio-Token'] = credentials.sessionToken;
  }
  if (isMutation) {
    headers['Content-Type'] = 'application/json';
    if (credentials?.csrfToken) {
      headers['X-Sanity-Studio-Csrf'] = credentials.csrfToken;
    }
  }
  return headers;
}

async function refreshStudioSessionCredentials(): Promise<StudioClientSessionCredentials | null> {
  try {
    const res = await fetch('/api/studio/sanity/session', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!res.ok || !contentType.includes('application/json')) {
      return null;
    }
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      return null;
    }
    const parsed = JSON.parse(text);
    if (
      parsed?.ok &&
      parsed?.sessionCredentials?.sessionToken &&
      parsed?.sessionCredentials?.csrfToken
    ) {
      cachedDynamicSessionCredentials = parsed.sessionCredentials;
      return cachedDynamicSessionCredentials;
    }
    return null;
  } catch {
    return null;
  }
}

function classifyHtmlResponseDiagnostic(
  method: string,
  endpoint: string,
  status: number,
  redirected: boolean,
  finalUrl: string,
  rawHtml: string
): string {
  const lowerHtml = rawHtml.slice(0, 600).toLowerCase();

  if (
    finalUrl.includes('__cookie_check.html') ||
    lowerHtml.includes('__secure-aistudio_auth_flow_may_set_cookies') ||
    lowerHtml.includes('action required to load your app')
  ) {
    return `Studio API request (${method} ${endpoint}) received an HTML preview-authentication challenge page instead of JSON (HTTP ${status}, redirected to /__cookie_check.html). Please reload the preview pane so the AI Studio security cookie can be refreshed.`;
  }

  if (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    lowerHtml.includes('warming up')
  ) {
    return `Studio API request (${method} ${endpoint}) received a development server warmup HTML page instead of JSON (HTTP ${status}). Wait a moment for the dev server to finish starting and try again.`;
  }

  if (status === 403) {
    return `Studio API request (${method} ${endpoint}) was rejected with an HTML 403 Forbidden response by the reverse proxy before JSON could be returned.`;
  }

  if (status === 404) {
    return `Studio API request (${method} ${endpoint}) returned an HTML 404 Not Found page instead of JSON. The Studio API middleware for ${endpoint} was not reached.`;
  }

  const redirectNote = redirected ? ' after an unexpected HTTP redirect' : '';
  return `Studio API request (${method} ${endpoint}) returned HTML instead of JSON (HTTP ${status}${redirectNote}).`;
}

async function executeSingleFetch<T>(
  endpoint: string,
  method: 'GET' | 'POST',
  bodyString: string | undefined,
  credentials: StudioClientSessionCredentials | null,
  cache?: RequestCache
): Promise<StudioApiParsedResponse<T>> {
  const isMutation = method === 'POST';
  if (isMutation) {
    ensureAiStudioPreviewCookieCapabilityFlag();
  }

  const response = await fetch(endpoint, {
    method,
    credentials: 'same-origin',
    cache: cache ?? 'no-store',
    headers: buildRequestHeaders(isMutation, credentials),
    body: isMutation ? bodyString : undefined,
  });

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const rawText = await response.text();
  const trimmed = rawText.trim();

  const looksLikeHtml =
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<');

  if (!contentType.includes('application/json') || looksLikeHtml) {
    const diagnosticMessage = classifyHtmlResponseDiagnostic(
      method,
      endpoint,
      response.status,
      response.redirected,
      response.url || '',
      trimmed
    );
    return {
      ok: false,
      httpStatus: response.status,
      redirected: response.redirected,
      contentType,
      isJson: false,
      data: null,
      errorCode: 'NON_JSON_HTML_RESPONSE',
      diagnosticMessage,
    };
  }

  if (!trimmed) {
    return {
      ok: false,
      httpStatus: response.status,
      redirected: response.redirected,
      contentType,
      isJson: false,
      data: null,
      errorCode: 'EMPTY_RESPONSE_BODY',
      diagnosticMessage: `Studio API request (${method} ${endpoint}) returned an empty response body (HTTP ${response.status}).`,
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as T & Record<string, any>;
    const logicalStatus =
      typeof parsed?.httpStatus === 'number'
        ? parsed.httpStatus
        : typeof parsed?.status === 'number'
        ? parsed.status
        : response.status;
    const isSuccess =
      response.ok && parsed?.ok !== false && logicalStatus < 400;

    return {
      ok: isSuccess,
      httpStatus: logicalStatus,
      redirected: response.redirected,
      contentType,
      isJson: true,
      data: parsed,
      errorCode: parsed?.errorCode || parsed?.blockerCode,
      diagnosticMessage: isSuccess
        ? undefined
        : parsed?.message ||
          `Studio API request (${method} ${endpoint}) failed with HTTP ${logicalStatus}.`,
    };
  } catch {
    return {
      ok: false,
      httpStatus: response.status,
      redirected: response.redirected,
      contentType,
      isJson: false,
      data: null,
      errorCode: 'MALFORMED_JSON_RESPONSE',
      diagnosticMessage: `Studio API request (${method} ${endpoint}) returned invalid JSON (HTTP ${response.status}).`,
    };
  }
}

/**
 * Executes a Studio API request and safely parses its JSON response.
 */
export async function fetchStudioApiJson<T = Record<string, any>>(
  endpoint: string,
  options: StudioApiRequestOptions = {}
): Promise<StudioApiParsedResponse<T>> {
  const method = options.method ?? 'GET';
  const bodyString =
    method === 'POST' && options.body !== undefined
      ? JSON.stringify(options.body)
      : undefined;

  let activeCredentials = resolveEffectiveCredentials(options.sessionCredentials);

  // Attempt 1
  let result = await executeSingleFetch<T>(
    endpoint,
    method,
    bodyString,
    activeCredentials,
    options.cache
  );

  // If a POST request was redirected by the preview auth proxy (which converts POST -> GET
  // on 302 redirects after minting a fresh auth cookie), retry the POST once immediately.
  if (
    !result.ok &&
    method === 'POST' &&
    (result.redirected ||
      result.errorCode === 'POST_CONVERTED_TO_GET_BY_REDIRECT')
  ) {
    result = await executeSingleFetch<T>(
      endpoint,
      method,
      bodyString,
      activeCredentials,
      options.cache
    );
  }

  // If session credentials expired or the dev server restarted, renew credentials once and retry.
  if (
    !result.ok &&
    (result.errorCode === 'INVALID_OR_EXPIRED_AUTH_TOKEN' ||
      result.errorCode === 'MISSING_AUTH_TOKEN' ||
      result.errorCode === 'CSRF_VALIDATION_FAILED')
  ) {
    const refreshed = await refreshStudioSessionCredentials();
    if (refreshed) {
      activeCredentials = refreshed;
      result = await executeSingleFetch<T>(
        endpoint,
        method,
        bodyString,
        activeCredentials,
        options.cache
      );
    }
  }

  return result;
}
