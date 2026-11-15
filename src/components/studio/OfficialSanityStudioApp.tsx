import React, { useEffect, useState } from 'react';
import { Studio } from 'sanity';
import {
  CheckCircle2,
  ExternalLink,
  Layers,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { officialSanityStudioConfig } from '../../../sanity.config';
import type { ResolvedSanityEnvironmentConfig } from '../../cms/studio/sanityCore';
import type { StudioSessionCredentials } from '../../cms/studio/sanityStudioAuth';
import { SanityStudioWorkspace } from './SanityStudioWorkspace';

let lakeBridgeInstalled = false;

/**
 * Routes browser requests from `@sanity/client` (`*.api.sanity.io`, `*.apicdn.sanity.io`, `api.sanity.io`)
 * through our same-origin `/api/studio/sanity/lake` proxy so that:
 * 1. `SANITY_API_WRITE_TOKEN` remains 100% server-side (never exposed in client bundles).
 * 2. Official Sanity Studio works seamlessly on both `localhost:3000` and Cloud Run preview URLs
 *    without CORS 403 errors or third-party cookie restrictions inside the preview iframe.
 */
function rewriteSanityApiUrlToSameOriginProxy(rawUrl: string): string {
  if (typeof window === 'undefined' || !rawUrl) return rawUrl;
  try {
    const parsed = new URL(rawUrl, window.location.origin);
    if (
      parsed.hostname.endsWith('.api.sanity.io') ||
      parsed.hostname.endsWith('.apicdn.sanity.io') ||
      parsed.hostname === 'api.sanity.io'
    ) {
      return `${window.location.origin}/api/studio/sanity/lake${parsed.pathname}${parsed.search}`;
    }
  } catch {}
  return rawUrl;
}

function installSameOriginSanityLakeBridge() {
  if (typeof window === 'undefined' || lakeBridgeInstalled) return;
  lakeBridgeInstalled = true;

  // 0. Safely intercept window.fetch via Object.defineProperty (never direct assignment, which throws if getter-only)
  try {
    const originalFetch = window.fetch.bind(window);
    const patchedFetch: typeof window.fetch = (input, init) => {
      try {
        if (typeof input === 'string') {
          return originalFetch(rewriteSanityApiUrlToSameOriginProxy(input), init);
        }
        if (input instanceof URL) {
          return originalFetch(
            rewriteSanityApiUrlToSameOriginProxy(input.toString()),
            init
          );
        }
        if (typeof Request !== 'undefined' && input instanceof Request) {
          const rewritten = rewriteSanityApiUrlToSameOriginProxy(input.url);
          if (rewritten !== input.url) {
            return originalFetch(new Request(rewritten, input), init);
          }
        }
      } catch {}
      return originalFetch(input, init);
    };
    Object.defineProperty(window, 'fetch', {
      value: patchedFetch,
      configurable: true,
      writable: true,
    });
  } catch {}

  // 1. Safely intercept XMLHttpRequest.prototype.open (used by @sanity/client RXJS transport & asset uploads)
  try {
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ) {
      const rawStr = typeof url === 'string' ? url : String(url);
      const rewritten = rewriteSanityApiUrlToSameOriginProxy(rawStr);
      return originalXhrOpen.call(
        this,
        method,
        rewritten,
        async !== false,
        username ?? null,
        password ?? null
      );
    };
  } catch {}

  // 2. Safely intercept EventSource (used by @sanity/client real-time document listener)
  try {
    if (typeof window.EventSource !== 'undefined') {
      const OriginalEventSource = window.EventSource;
      const PatchedEventSource = function (
        url: string | URL,
        eventSourceInitDict?: EventSourceInit
      ) {
        const rawStr = typeof url === 'string' ? url : String(url);
        const rewritten = rewriteSanityApiUrlToSameOriginProxy(rawStr);
        return new OriginalEventSource(rewritten, eventSourceInitDict);
      } as unknown as typeof EventSource;
      PatchedEventSource.prototype = OriginalEventSource.prototype;
      (PatchedEventSource as any).CONNECTING = OriginalEventSource.CONNECTING;
      (PatchedEventSource as any).OPEN = OriginalEventSource.OPEN;
      (PatchedEventSource as any).CLOSED = OriginalEventSource.CLOSED;
      Object.defineProperty(window, 'EventSource', {
        value: PatchedEventSource,
        configurable: true,
        writable: true,
      });
    }
  } catch {}
}

// Install immediately when module loads in browser
if (typeof window !== 'undefined') {
  installSameOriginSanityLakeBridge();
}

export interface OfficialSanityStudioAppProps {
  envConfig: ResolvedSanityEnvironmentConfig;
  sessionCredentials: StudioSessionCredentials;
}

export const OfficialSanityStudioApp: React.FC<
  OfficialSanityStudioAppProps
> = ({ envConfig, sessionCredentials }) => {
  installSameOriginSanityLakeBridge();

  const [isBrowserMounted, setIsBrowserMounted] = useState<boolean>(false);
  const [studioMode, setStudioMode] = useState<'official' | 'legacy'>(
    'official'
  );
  const [evalHoodieReady, setEvalHoodieReady] = useState<{
    ready: boolean;
    originalRev: string | null;
    evalId: string;
  } | null>(null);

  useEffect(() => {
    setIsBrowserMounted(true);
  }, []);

  useEffect(() => {
    let active = true;
    const bootstrapStudioResources = async () => {
      try {
        const headers = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Studio-Session': sessionCredentials.sessionToken,
          'X-Studio-CSRF': sessionCredentials.csrfToken,
        };
        // Ensure default AI Writing Profile & Evaluation Hoodie Copy exist in Sanity
        const [, hoodieRes] = await Promise.all([
          fetch('/api/studio/sanity/ai-profiles', { headers }),
          fetch('/api/studio/sanity/ensure-eval-hoodie-copy', {
            method: 'POST',
            headers,
            body: JSON.stringify({}),
          }),
        ]);
        if (active && hoodieRes.ok) {
          const hoodieData = await hoodieRes.json();
          if (hoodieData.ok) {
            setEvalHoodieReady({
              ready: true,
              originalRev: hoodieData.originalHoodieRev,
              evalId:
                hoodieData.evaluationCopy?._id ||
                'drafts.prod_eval_copy_emotional_support_psychology_major_hoodie',
            });
          }
        }
      } catch {}
    };
    bootstrapStudioResources();
    return () => {
      active = false;
    };
  }, [sessionCredentials]);

  const navigateStudioPath = (path: string) => {
    if (typeof window === 'undefined') return;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div
      data-testid="official-sanity-studio-shell"
      className="sog-studio-shell"
    >
      {/* Top Studio Control & Mode Bar */}
      <header className="sog-studio-bar">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#0F766E] text-xs font-bold text-white">
              SG
            </span>
            <span className="text-xs font-semibold tracking-wide text-white">
              Science of Gifts — Official Sanity Studio
            </span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-[#1E293B] text-[#38BDF8] font-mono">
            {envConfig.projectId || 'c1y2qdje'} /{' '}
            {envConfig.dataset || 'production'}
          </span>
          {evalHoodieReady?.ready && (
            <span
              data-testid="eval-hoodie-status-badge"
              className="hidden md:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#064E3B] text-[#6EE7B7]"
              title={`Original Hoodie preserved untouched at rev ${evalHoodieReady.originalRev}`}
            >
              <ShieldCheck className="w-3 h-3" />
              Original Hoodie Preserved · Eval Copy Ready
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {studioMode === 'official' && (
            <>
              <button
                type="button"
                data-testid="open-eval-hoodie-in-official-studio-btn"
                onClick={() =>
                  navigateStudioPath(
                    '/studio/structure/editorial-content;products-menu;products-all;prod_eval_copy_emotional_support_psychology_major_hoodie'
                  )
                }
                className="px-2.5 py-1 text-xs font-medium rounded bg-[#1E293B] hover:bg-[#334155] text-[#E2E8F0] flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#38BDF8]" />
                Inspect Hoodie Eval Copy
              </button>

              <button
                type="button"
                data-testid="open-ai-writing-profile-in-official-studio-btn"
                onClick={() =>
                  navigateStudioPath(
                    '/studio/structure/publication-settings;default-product-ai-writing-profile'
                  )
                }
                className="px-2.5 py-1 text-xs font-medium rounded bg-[#1E293B] hover:bg-[#334155] text-[#E2E8F0] flex items-center gap-1 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-[#F59E0B]" />
                AI Writing Profiles
              </button>
            </>
          )}

          {/* Switcher between Official Sanity Studio and Legacy Custom Studio (retained during evaluation) */}
          <div className="flex items-center rounded bg-[#1E293B] p-0.5 border border-[#334155]">
            <button
              type="button"
              data-testid="switch-to-official-studio-btn"
              onClick={() => setStudioMode('official')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer ${
                studioMode === 'official'
                  ? 'bg-[#0F766E] text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Official Sanity Studio
            </button>
            <button
              type="button"
              data-testid="switch-to-legacy-studio-btn"
              onClick={() => setStudioMode('legacy')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer flex items-center gap-1 ${
                studioMode === 'legacy'
                  ? 'bg-[#334155] text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              Legacy Studio (Fallback)
            </button>
          </div>

          <a
            href="/"
            className="px-2.5 py-1 text-[11px] font-medium rounded bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1] flex items-center gap-1"
          >
            View Astro Site
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Main Studio Body */}
      {studioMode === 'official' ? (
        <div
          data-testid="official-sanity-studio-container"
          className="sog-studio-native-container"
        >
          {isBrowserMounted ? (
            <Studio
              config={officialSanityStudioConfig}
              unstable_noAuthBoundary={true}
            />
          ) : (
            <div
              style={{
                padding: '2rem',
                fontSize: '0.8125rem',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#475569',
              }}
            >
              Initializing Official Sanity Studio workspace...
            </div>
          )}
        </div>
      ) : (
        <div
          data-testid="legacy-custom-studio-container"
          className="sog-legacy-studio"
          style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
        >
          <SanityStudioWorkspace
            envConfig={envConfig}
            sessionCredentials={sessionCredentials}
          />
        </div>
      )}
    </div>
  );
};
