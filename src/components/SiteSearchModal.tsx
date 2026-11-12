import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Compass,
  FileText,
  Gift,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { PhotoImage } from './ObjectIllustrations';
import {
  SiteSearchItem,
  SiteSearchItemType,
  SiteSearchScoredItem,
  querySiteSearchIndex,
} from '../utils/siteSearchEngine';

let cachedBrowserSearchIndex: SiteSearchItem[] | null = null;
let inflightIndexPromise: Promise<SiteSearchItem[]> | null = null;

async function loadSearchIndexOnDemand(): Promise<SiteSearchItem[]> {
  if (cachedBrowserSearchIndex) {
    return cachedBrowserSearchIndex;
  }
  if (inflightIndexPromise) {
    return inflightIndexPromise;
  }
  inflightIndexPromise = fetch('/search-index.json')
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Failed to fetch search index: ${res.status}`);
      }
      const data = (await res.json()) as { items?: SiteSearchItem[] };
      const items = Array.isArray(data?.items) ? data.items : [];
      cachedBrowserSearchIndex = items;
      return items;
    })
    .catch(() => {
      inflightIndexPromise = null;
      return [];
    });

  return inflightIndexPromise;
}

export interface SiteSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  /**
   * Optional pre-loaded search index (used for SSR/test rendering or instant local fallback).
   * When omitted in the browser, the modal fetches `/search-index.json` on demand when opened.
   */
  initialIndex?: SiteSearchItem[];
  /**
   * Whether to include items flagged `isSamplePreview: true` (default true in development preview).
   */
  includeSampleProducts?: boolean;
}

const SUGGESTED_SEARCH_TERMS = [
  'Tea & morning rituals',
  'Dinner host etiquette',
  'Bedside carafe',
  'Parents & In-Laws',
  'Gifts for Him',
  'Gifts for Her',
];

function renderTypeIcon(type: SiteSearchItemType) {
  switch (type) {
    case 'guide':
      return (
        <BookOpen
          aria-hidden="true"
          strokeWidth={1.75}
          className="h-4 w-4 text-[#1B3D5F]"
        />
      );
    case 'article':
      return (
        <FileText
          aria-hidden="true"
          strokeWidth={1.75}
          className="h-4 w-4 text-[#1B3D5F]"
        />
      );
    case 'product':
      return (
        <Gift
          aria-hidden="true"
          strokeWidth={1.75}
          className="h-4 w-4 text-[#1B3D5F]"
        />
      );
    case 'category':
    default:
      return (
        <Compass
          aria-hidden="true"
          strokeWidth={1.75}
          className="h-4 w-4 text-[#1B3D5F]"
        />
      );
  }
}

export const SiteSearchModal: React.FC<SiteSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  initialIndex,
  includeSampleProducts = true,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [searchIndex, setSearchIndex] = useState<SiteSearchItem[]>(
    () => initialIndex ?? cachedBrowserSearchIndex ?? []
  );
  const [isLoadingIndex, setIsLoadingIndex] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialQuery !== undefined && isOpen) {
      setQuery(initialQuery);
    }
  }, [initialQuery, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Focus search input automatically on open
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 15);

    // Load search index on demand if not already loaded
    if (!initialIndex && !cachedBrowserSearchIndex) {
      setIsLoadingIndex(true);
      loadSearchIndexOnDemand().then((loaded) => {
        setSearchIndex(loaded);
        setIsLoadingIndex(false);
      });
    } else if (initialIndex) {
      setSearchIndex(initialIndex);
    } else if (cachedBrowserSearchIndex) {
      setSearchIndex(cachedBrowserSearchIndex);
    }

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [isOpen, initialIndex]);

  const groupedResults = useMemo(() => {
    if (!query.trim()) {
      return querySiteSearchIndex([], '');
    }
    return querySiteSearchIndex(searchIndex, query, {
      includeSampleProducts,
      limitPerGroup: 6,
    });
  }, [searchIndex, query, includeSampleProducts]);

  // Flat ordered list of visible items for keyboard navigation (ArrowDown / ArrowUp / Enter)
  const flatVisibleItems = useMemo<SiteSearchScoredItem[]>(() => {
    return [
      ...groupedResults.guides,
      ...groupedResults.articles,
      ...groupedResults.products,
      ...groupedResults.categories,
    ];
  }, [groupedResults]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (flatVisibleItems.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) =>
          prev < flatVisibleItems.length - 1 ? prev + 1 : 0
        );
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : flatVisibleItems.length - 1
        );
      } else if (event.key === 'Enter' && activeIndex >= 0) {
        const target = flatVisibleItems[activeIndex];
        if (target && typeof window !== 'undefined') {
          event.preventDefault();
          window.location.assign(target.url);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, flatVisibleItems, activeIndex]);

  if (!isOpen) return null;

  const hasQuery = Boolean(groupedResults.normalizedQuery);

  const renderResultGroup = (
    groupId: string,
    groupHeading: string,
    type: SiteSearchItemType,
    items: SiteSearchScoredItem[],
    totalInGroup: number
  ) => {
    if (items.length === 0) return null;

    return (
      <section
        key={groupId}
        aria-labelledby={`search-group-${groupId}`}
        className="space-y-2.5"
      >
        <div className="flex items-center justify-between border-b border-[#E3E1DB] pb-1.5">
          <div className="flex items-center gap-2">
            {renderTypeIcon(type)}
            <h3
              id={`search-group-${groupId}`}
              className="theme-section-kicker text-xs font-semibold uppercase tracking-widest text-[#1B3D5F]"
            >
              {groupHeading}
            </h3>
          </div>
          <span className="text-xs font-medium text-[#636A6F] tabular-nums">
            {totalInGroup} {totalInGroup === 1 ? 'match' : 'matches'}
          </span>
        </div>

        <ul className="divide-y divide-[#E3E1DB]/60">
          {items.map((item) => {
            const flatIdx = flatVisibleItems.findIndex((i) => i.id === item.id);
            const isHighlighted = flatIdx >= 0 && flatIdx === activeIndex;

            return (
              <li key={item.id}>
                <a
                  href={item.url}
                  onClick={onClose}
                  onMouseEnter={() => {
                    if (flatIdx >= 0) setActiveIndex(flatIdx);
                  }}
                  data-search-result-type={item.type}
                  className={`group flex items-start gap-3.5 rounded-xl px-3 py-3 transition-colors focus-visible:outline-2 focus-visible:outline-[#1B3D5F] ${
                    isHighlighted
                      ? 'bg-[#E5F3EC]/85 text-[#1B3D5F]'
                      : 'hover:bg-[#F6F4EF]'
                  }`}
                >
                  {item.imageUrl ? (
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#E3E1DB] bg-[#FAF9F6]">
                      <PhotoImage
                        src={item.imageUrl}
                        alt={item.imageAlt || item.title}
                        preset="thumbnail-xs"
                        aspectRatio="1:1"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] text-[#1B3D5F]">
                      {renderTypeIcon(item.type)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#28537D]">
                        {item.categoryLabel}
                      </span>

                      {item.type === 'product' &&
                        typeof item.price === 'number' && (
                          <span className="rounded bg-[#F6F4EF] px-1.5 py-0.5 text-[11px] font-semibold text-[#24282B] tabular-nums">
                            ${item.price} {item.currency || 'USD'}
                          </span>
                        )}

                      {item.type === 'product' && item.vendor && (
                        <span className="text-[11px] text-[#636A6F]">
                          · {item.vendor}
                        </span>
                      )}

                      {item.readTimeMinutes && (
                        <span className="text-[11px] text-[#636A6F] tabular-nums">
                          · {item.readTimeMinutes} min read
                        </span>
                      )}

                      {item.type === 'guide' &&
                        typeof item.picksCount === 'number' &&
                        item.picksCount > 0 && (
                          <span className="text-[11px] text-[#636A6F] tabular-nums">
                            · {item.picksCount} curated picks
                          </span>
                        )}

                      {item.isSamplePreview && (
                        <span className="rounded border border-[#D8C7A8] bg-[#FFF8E7] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#6E5221]">
                          Sample Preview
                        </span>
                      )}
                    </div>

                    <div className="font-serif text-base font-semibold leading-snug text-[#24282B] group-hover:text-[#1B3D5F] group-hover:underline">
                      {item.title}
                    </div>

                    <p className="line-clamp-1 text-xs text-[#636A6F]">
                      {item.description || item.subtitle}
                    </p>
                  </div>

                  <ArrowRight
                    aria-hidden="true"
                    className="mt-1 h-4 w-4 shrink-0 text-[#636A6F] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1B3D5F]"
                  />
                </a>
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search gifts, guides, and stories"
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#24282B]/45 px-4 pt-12 pb-8 backdrop-blur-xs sm:pt-20"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FAF9F6] shadow-2xl">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-[#E3E1DB] bg-[#FFFFFF] px-4 py-3.5 sm:px-5">
          <Search
            aria-hidden="true"
            strokeWidth={1.75}
            className="h-5 w-5 shrink-0 text-[#1B3D5F]"
          />
          <input
            ref={inputRef}
            id="site-wide-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search gifts, guides, and stories..."
            aria-label="Search gifts, guides, and stories"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base text-[#24282B] placeholder:text-[#636A6F] focus:outline-none"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search query"
              className="inline-flex items-center justify-center rounded-md p-1.5 text-[#636A6F] hover:bg-[#F6F4EF] hover:text-[#24282B] focus-visible:outline-2 focus-visible:outline-[#1B3D5F] cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="inline-flex items-center gap-1 rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-2.5 py-1.5 text-xs font-semibold text-[#24282B] hover:border-[#28537D] hover:text-[#1B3D5F] focus-visible:outline-2 focus-visible:outline-[#1B3D5F] cursor-pointer"
          >
            <span>Esc</span>
          </button>
        </div>

        {/* Results / Discovery Body */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 space-y-6">
          {isLoadingIndex ? (
            <div className="py-10 text-center text-sm text-[#636A6F]">
              Loading publication search index…
            </div>
          ) : !hasQuery ? (
            <div className="space-y-6">
              <div className="space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-widest text-[#636A6F]">
                  Suggested Searches
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_SEARCH_TERMS.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setQuery(term);
                        inputRef.current?.focus();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#1B3D5F] cursor-pointer"
                    >
                      <Search
                        aria-hidden="true"
                        className="h-3 w-3 text-[#636A6F]"
                      />
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 border-t border-[#E3E1DB] pt-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-[#636A6F]">
                  Explore the Publication
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <a
                    href="/gift-guides/"
                    onClick={onClose}
                    className="flex items-center justify-between rounded-xl border border-[#E3E1DB] bg-[#FFFFFF] px-3.5 py-2.5 text-sm font-medium text-[#24282B] hover:border-[#28537D] hover:text-[#1B3D5F]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-[#1B3D5F]" />
                      <span>Gift Guides Directory</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#636A6F]" />
                  </a>
                  <a
                    href="/articles/"
                    onClick={onClose}
                    className="flex items-center justify-between rounded-xl border border-[#E3E1DB] bg-[#FFFFFF] px-3.5 py-2.5 text-sm font-medium text-[#24282B] hover:border-[#28537D] hover:text-[#1B3D5F]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#1B3D5F]" />
                      <span>Stories &amp; Research</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#636A6F]" />
                  </a>
                  <a
                    href="/gifts-for-men/"
                    onClick={onClose}
                    className="flex items-center justify-between rounded-xl border border-[#E3E1DB] bg-[#FFFFFF] px-3.5 py-2.5 text-sm font-medium text-[#24282B] hover:border-[#28537D] hover:text-[#1B3D5F]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Compass className="h-4 w-4 text-[#1B3D5F]" />
                      <span>Gifts for Him Hub</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#636A6F]" />
                  </a>
                  <a
                    href="/gifts-for-women/"
                    onClick={onClose}
                    className="flex items-center justify-between rounded-xl border border-[#E3E1DB] bg-[#FFFFFF] px-3.5 py-2.5 text-sm font-medium text-[#24282B] hover:border-[#28537D] hover:text-[#1B3D5F]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Compass className="h-4 w-4 text-[#1B3D5F]" />
                      <span>Gifts for Her Hub</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#636A6F]" />
                  </a>
                </div>
              </div>
            </div>
          ) : groupedResults.totalCount === 0 ? (
            <div className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-8 text-center space-y-3">
              <p className="font-serif text-lg font-semibold text-[#24282B]">
                No matching gifts, guides, stories, or categories found for “
                {query.trim()}”.
              </p>
              <p className="text-xs text-[#636A6F] max-w-md mx-auto leading-relaxed">
                Try searching by a broader recipient, interest, material, or
                occasion—or use our interactive Gift Finder to filter by
                recipient, vibe, and budget.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/gift-finder/"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B3D5F] px-4 py-2 text-xs font-semibold text-[#FFFFFF] hover:bg-[#28537D]"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Open Gift Finder</span>
                </a>
                <a
                  href="/gift-guides/"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-4 py-2 text-xs font-semibold text-[#24282B] hover:border-[#28537D] hover:text-[#1B3D5F]"
                >
                  <span>Browse Gift Guides</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {renderResultGroup(
                'guides',
                'Gift Guides',
                'guide',
                groupedResults.guides,
                groupedResults.totalGuides
              )}
              {renderResultGroup(
                'stories',
                'Stories',
                'article',
                groupedResults.articles,
                groupedResults.totalArticles
              )}
              {renderResultGroup(
                'products',
                'Products',
                'product',
                groupedResults.products,
                groupedResults.totalProducts
              )}
              {renderResultGroup(
                'categories',
                'Categories',
                'category',
                groupedResults.categories,
                groupedResults.totalCategories
              )}
            </div>
          )}
        </div>

        {/* Footer Keyboard Hints & Gift Finder Companion Link */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E3E1DB] bg-[#FFFFFF] px-4 py-2.5 text-[11px] text-[#636A6F] sm:px-6">
          <div className="flex items-center gap-3">
            <span>
              <strong className="font-semibold text-[#24282B]">↑↓</strong>{' '}
              Navigate
            </span>
            <span>
              <strong className="font-semibold text-[#24282B]">Enter</strong>{' '}
              Open
            </span>
            <span>
              <strong className="font-semibold text-[#24282B]">Esc</strong>{' '}
              Close
            </span>
          </div>
          <a
            href="/gift-finder/"
            onClick={onClose}
            className="font-semibold text-[#1B3D5F] hover:underline"
          >
            Need tailored recommendations? Try Gift Finder →
          </a>
        </div>
      </div>
    </div>
  );
};
