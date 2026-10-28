import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  X,
  RotateCcw,
  Heart,
  ArrowRight,
  ArrowLeft,
  Check,
  Gift,
  Plus,
  Trash2,
  Share2,
  Bookmark,
  ExternalLink,
  AlertTriangle,
  Compass,
  ListChecks,
} from 'lucide-react';
import {
  Article,
  BudgetTier,
  GiftGuide,
  OccasionType,
  PersonalityTrait,
  Product,
  RecipientType,
} from '../types/content';
import {
  BUDGET_TIER_LABELS,
  DEFAULT_FINDER_FILTERS,
  DEFAULT_QUIZ_ANSWERS,
  FinderSortOption,
  GiftFinderEvaluationResult,
  GiftFinderFilters,
  GuidedQuizAnswers,
  OCCASION_LABELS,
  PERSONALITY_LABELS,
  RECIPIENT_LABELS,
  RankedGiftResult,
  evaluateGiftFinder,
  parseFinderUrlSearchParams,
  quizAnswersToFinderFilters,
  serializeFinderUrlSearchParams,
} from '../utils/giftFinderEngine';
import {
  ActiveThinkingOperationState,
  GiftThinkingActionType,
  createThinkingCoordinator,
} from '../utils/giftFinderThinking';
import {
  DEFAULT_LIST_ID,
  dispatchOpenProductModal,
  dispatchOpenSavedDrawer,
  resolveSavedListItems,
  useSavedGiftsState,
} from '../utils/savedGiftsStore';
import { GiftThinkingAnimation } from './GiftThinkingAnimation';
import { PhotoImage } from './ObjectIllustrations';

export interface GiftFinderExperienceProps {
  products: Product[];
  guides: GiftGuide[];
  articles: Article[];
  initialSearchString?: string;
}

const EXAMPLE_NATURAL_QUERIES: Array<{ label: string; query: string }> = [
  {
    label: 'Tea gifts for mom under $50',
    query: 'tea gifts for mom under $50',
  },
  {
    label: 'Housewarming gift for someone who likes plants',
    query: 'housewarming gift for someone who likes plants',
  },
  {
    label: 'Practical gift for dad',
    query: 'practical gift for dad',
  },
  {
    label: 'Sentimental keepsake for a close friend',
    query: 'sentimental keepsake for a close friend',
  },
  {
    label: 'Dinner host gift under $40',
    query: 'dinner host gift under $40',
  },
];

const QUIZ_STEPS = [
  {
    stepNumber: 1,
    key: 'recipient' as const,
    question: 'Who are you shopping for?',
    subtitle:
      'Choose the relationship that best matches your recipient, or skip if you are browsing broadly.',
  },
  {
    stepNumber: 2,
    key: 'interest' as const,
    question: 'What do they genuinely enjoy?',
    subtitle:
      'Pick a daily habit, hobby, or interest from our verified catalog.',
  },
  {
    stepNumber: 3,
    key: 'occasion' as const,
    question: 'What is the occasion?',
    subtitle:
      'Helps us weigh celebratory milestones against low-pressure everyday gestures.',
  },
  {
    stepNumber: 4,
    key: 'maxPrice' as const,
    question: 'Do you have a maximum budget in mind?',
    subtitle:
      'Strict budget caps automatically exclude any gifts above your limit.',
  },
  {
    stepNumber: 5,
    key: 'personalityTrait' as const,
    question: 'What kind of gift style fits them best?',
    subtitle:
      'Our editors group gifts by how they live in someone’s routine after unwrapping.',
  },
];

export const GiftFinderExperience: React.FC<GiftFinderExperienceProps> = ({
  products,
  guides,
  articles,
  initialSearchString = '',
}) => {
  const {
    giftLists,
    savedProductIds,
    toggleSaveProduct,
    updateRecipientNote,
    createList,
    removeList,
    addProductToList,
    removeItemFromList,
    moveItemBetweenLists,
    toggleItemPurchased,
    clearAllLists,
  } = useSavedGiftsState();

  const [filters, setFilters] = useState<GiftFinderFilters>(() =>
    parseFinderUrlSearchParams(initialSearchString, products)
  );
  const [searchDraft, setSearchDraft] = useState<string>(() =>
    parseFinderUrlSearchParams(initialSearchString, products).query
  );
  const [activeMode, setActiveMode] = useState<'finder' | 'quiz' | 'lists'>(
    'finder'
  );
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Guided Quiz State
  const [quizStepIndex, setQuizStepIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] =
    useState<GuidedQuizAnswers>(DEFAULT_QUIZ_ANSWERS);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Thinking Animation & Stale-Operation Coordinator State
  const thinkingCoordinatorRef = useRef(createThinkingCoordinator());
  const [thinkingState, setThinkingState] =
    useState<ActiveThinkingOperationState<GiftFinderEvaluationResult> | null>(
      null
    );
  const [displayedEvaluation, setDisplayedEvaluation] =
    useState<GiftFinderEvaluationResult>(() =>
      evaluateGiftFinder(
        products,
        parseFinderUrlSearchParams(initialSearchString, products),
        { guides, articles }
      )
    );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Saved Lists Workspace State
  const [selectedListId, setSelectedListId] = useState<string>(DEFAULT_LIST_ID);
  const [newListName, setNewListName] = useState('');
  const [newListRecipient, setNewListRecipient] = useState('');
  const [newListOccasion, setNewListOccasion] = useState('');
  const [confirmListAction, setConfirmListAction] = useState<
    | null
    | { type: 'delete-list'; listId: string; listName: string }
    | { type: 'clear-all' }
  >(null);

  // Shareable URL feedback
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);

  const isHydratedRef = useRef(false);

  // Clean up any pending thinking timers on unmount & subscribe to prefers-reduced-motion
  useEffect(() => {
    const coordinator = thinkingCoordinatorRef.current;
    let mediaQuery: MediaQueryList | null = null;
    const handleMotionChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(Boolean(e.matches));
    };

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      handleMotionChange(mediaQuery);
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleMotionChange);
      }
    }

    return () => {
      coordinator.dispose();
      if (mediaQuery && typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleMotionChange);
      }
    };
  }, []);

  // Read URL query parameters on client mount and browser back/forward
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const parsedFromWindow = parseFinderUrlSearchParams(
      window.location.search,
      products
    );
    thinkingCoordinatorRef.current.cancelActiveOperation();
    setThinkingState(null);
    setFilters(parsedFromWindow);
    setSearchDraft(parsedFromWindow.query);
    setDisplayedEvaluation(
      evaluateGiftFinder(products, parsedFromWindow, { guides, articles })
    );
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'quiz') {
      setActiveMode('quiz');
    }
    isHydratedRef.current = true;

    const handlePopState = () => {
      const nextFromHistory = parseFinderUrlSearchParams(
        window.location.search,
        products
      );
      thinkingCoordinatorRef.current.cancelActiveOperation();
      setThinkingState(null);
      setFilters(nextFromHistory);
      setSearchDraft(nextFromHistory.query);
      setDisplayedEvaluation(
        evaluateGiftFinder(products, nextFromHistory, { guides, articles })
      );
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [products, guides, articles]);

  // Synchronize finder filter state back to URL query parameters without navigation loops
  useEffect(() => {
    if (typeof window === 'undefined' || !isHydratedRef.current) return;
    const nextSearch = serializeFinderUrlSearchParams(filters);
    const currentSearch = window.location.search || '';
    const normCurrent = currentSearch === '?' ? '' : currentSearch;
    if (nextSearch !== normCurrent) {
      const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
      window.history.replaceState(null, '', nextUrl);
    }
  }, [filters]);

  // Use displayedEvaluation for the results list and count so stale results are never shown as new ones
  const evaluation = displayedEvaluation;

  // Evaluate live preview count for Guided Quiz
  const quizEvaluation = useMemo(
    () =>
      evaluateGiftFinder(
        products,
        quizAnswersToFinderFilters(quizAnswers, filters.sort),
        {
          guides,
          articles,
        }
      ),
    [products, quizAnswers, filters.sort, guides, articles]
  );

  const triggerFinderTransition = (
    nextFilters: GiftFinderFilters,
    actionType: GiftThinkingActionType,
    options?: {
      quizAnswers?: GuidedQuizAnswers;
      actionLabel?: string;
    }
  ) => {
    setFilters(nextFilters);
    setSearchDraft(nextFilters.query);
    thinkingCoordinatorRef.current.startOperation({
      actionType,
      filters: nextFilters,
      quizAnswers: options?.quizAnswers,
      actionLabel: options?.actionLabel,
      computeResult: () =>
        evaluateGiftFinder(products, nextFilters, {
          guides,
          articles,
        }),
      onStart: (state) => {
        setThinkingState(state);
      },
      onPhaseChange: (state) => {
        setThinkingState(state);
      },
      onComplete: (result) => {
        setDisplayedEvaluation(result);
        setThinkingState(null);
      },
    });
  };

  const updateFilter = <K extends keyof GiftFinderFilters>(
    key: K,
    value: GiftFinderFilters[K],
    actionLabel?: string
  ) => {
    const baseFilters =
      searchDraft !== filters.query
        ? { ...filters, query: searchDraft }
        : filters;
    const nextFilters: GiftFinderFilters = {
      ...baseFilters,
      [key]: value,
    };

    if (key === 'sort') {
      triggerFinderTransition(nextFilters, 'sort', { actionLabel });
      return;
    }

    if (key === 'query') {
      triggerFinderTransition(nextFilters, 'search', { actionLabel });
      return;
    }

    let derivedLabel = actionLabel;
    if (!derivedLabel) {
      if (key === 'category') {
        derivedLabel =
          value === 'all' ? 'All Categories' : `Category: ${String(value)}`;
      } else if (key === 'recipient') {
        derivedLabel =
          value === 'all'
            ? 'All Recipients'
            : `For: ${RECIPIENT_LABELS[value as RecipientType] || String(value)}`;
      } else if (key === 'occasion') {
        derivedLabel =
          value === 'all'
            ? 'All Occasions'
            : `Occasion: ${OCCASION_LABELS[value as OccasionType] || String(value)}`;
      } else if (key === 'personalityTrait') {
        derivedLabel =
          value === 'all'
            ? 'All Gift Styles'
            : `Style: ${PERSONALITY_LABELS[value as PersonalityTrait] || String(value)}`;
      } else if (key === 'interest') {
        derivedLabel =
          value === 'all' ? 'All Interests' : `Interest: ${String(value)}`;
      } else if (key === 'editorialOnly') {
        derivedLabel = value ? 'Editor’s Picks Only' : 'All Verified Gifts';
      }
    }

    triggerFinderTransition(nextFilters, 'filter', {
      actionLabel: derivedLabel,
    });
  };

  const applyFilterPatch = (
    patch: Partial<GiftFinderFilters>,
    actionType: GiftThinkingActionType = 'filter',
    actionLabel?: string
  ) => {
    const baseFilters =
      patch.query === undefined && searchDraft !== filters.query
        ? { ...filters, query: searchDraft }
        : filters;
    const nextFilters: GiftFinderFilters = {
      ...baseFilters,
      ...patch,
    };
    triggerFinderTransition(nextFilters, actionType, { actionLabel });
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const nextFilters: GiftFinderFilters = {
      ...filters,
      query: searchDraft,
    };
    if (activeMode !== 'finder') {
      setActiveMode('finder');
    }
    triggerFinderTransition(nextFilters, 'search');
  };

  const resetAllFilters = () => {
    setQuizAnswers(DEFAULT_QUIZ_ANSWERS);
    setQuizCompleted(false);
    setQuizStepIndex(0);
    triggerFinderTransition(DEFAULT_FINDER_FILTERS, 'filter', {
      actionLabel: 'Reset all filters',
    });
  };

  const handleRestartQuiz = () => {
    setQuizAnswers(DEFAULT_QUIZ_ANSWERS);
    setQuizCompleted(false);
    setQuizStepIndex(0);
    setActiveMode('quiz');
  };

  const handleCopyShareableUrl = () => {
    if (typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}${window.location.pathname}${serializeFinderUrlSearchParams(
      filters
    )}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setCopiedShareUrl(true);
    setTimeout(() => setCopiedShareUrl(false), 2500);
  };

  // Complete Guided Quiz (after 5th and final step) -> Run 1,800–2,500ms gift-matching reveal
  const handleFinishQuiz = () => {
    const nextFilters = quizAnswersToFinderFilters(quizAnswers, filters.sort);
    setQuizCompleted(true);
    setActiveMode('finder');
    triggerFinderTransition(nextFilters, 'quiz', {
      quizAnswers,
      actionLabel: '5-Step Guided Quiz Match',
    });
  };

  // Count active filter dimensions for mobile badge and summary bar
  const activeFilterPills = useMemo(() => {
    const list: Array<{
      id: string;
      label: string;
      onRemove: () => void;
    }> = [];

    if (filters.query.trim()) {
      list.push({
        id: 'query',
        label: `Search: “${filters.query.trim()}”`,
        onRemove: () => updateFilter('query', ''),
      });
    }
    if (filters.recipient !== 'all') {
      list.push({
        id: 'recipient',
        label: `For: ${RECIPIENT_LABELS[filters.recipient]}`,
        onRemove: () => updateFilter('recipient', 'all'),
      });
    }
    if (filters.occasion !== 'all') {
      list.push({
        id: 'occasion',
        label: `Occasion: ${OCCASION_LABELS[filters.occasion]}`,
        onRemove: () => updateFilter('occasion', 'all'),
      });
    }
    if (filters.personalityTrait !== 'all') {
      list.push({
        id: 'style',
        label: `Style: ${PERSONALITY_LABELS[filters.personalityTrait]}`,
        onRemove: () => updateFilter('personalityTrait', 'all'),
      });
    }
    if (filters.category !== 'all') {
      list.push({
        id: 'category',
        label: `Category: ${filters.category}`,
        onRemove: () => updateFilter('category', 'all'),
      });
    }
    if (filters.interest !== 'all') {
      list.push({
        id: 'interest',
        label: `Interest: ${filters.interest}`,
        onRemove: () => updateFilter('interest', 'all'),
      });
    }
    if (filters.budgetTier !== 'all') {
      list.push({
        id: 'budgetTier',
        label: `Budget: ${BUDGET_TIER_LABELS[filters.budgetTier]}`,
        onRemove: () => updateFilter('budgetTier', 'all'),
      });
    }
    if (filters.maxPrice !== null) {
      list.push({
        id: 'maxPrice',
        label: `Max Price: $${filters.maxPrice}`,
        onRemove: () => updateFilter('maxPrice', null),
      });
    }
    if (filters.minPrice !== null) {
      list.push({
        id: 'minPrice',
        label: `Min Price: $${filters.minPrice}`,
        onRemove: () => updateFilter('minPrice', null),
      });
    }
    if (filters.editorialOnly) {
      list.push({
        id: 'editorialOnly',
        label: 'Editor’s Picks Only',
        onRemove: () => updateFilter('editorialOnly', false),
      });
    }

    return list;
  }, [filters]);

  const productsMap = useMemo(() => {
    const map: Record<string, Product> = {};
    for (const p of products) {
      map[p.id] = p;
    }
    return map;
  }, [products]);

  const activeSavedList =
    giftLists.find((l) => l.id === selectedListId) ??
    giftLists[0] ?? {
      id: DEFAULT_LIST_ID,
      name: 'General Saved Ideas',
      createdAt: '',
      updatedAt: '',
      items: [],
    };

  const resolvedSavedList = useMemo(
    () => resolveSavedListItems(activeSavedList, productsMap),
    [activeSavedList, productsMap]
  );

  const handleCreateNewList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const created = createList({
      name: newListName.trim(),
      recipientLabel: newListRecipient.trim() || undefined,
      occasionLabel: newListOccasion.trim() || undefined,
    });
    setSelectedListId(created.id);
    setNewListName('');
    setNewListRecipient('');
    setNewListOccasion('');
  };

  // Shared Filter Controls Renderer (used in Desktop Sidebar & Mobile Drawer)
  const renderFacetControls = (idPrefix: string) => (
    <div className="space-y-6">
      {/* 1. Budget & Maximum Price Hard Constraint */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor={`${idPrefix}-max-price`}
            className="text-xs font-semibold uppercase tracking-wider text-[#1B3D5F]"
          >
            Budget & Price Limit
          </label>
          {(filters.maxPrice !== null ||
            filters.budgetTier !== 'all' ||
            evaluation.effectiveMaxPrice !== null) && (
            <button
              type="button"
              onClick={() => {
                // Also strip budget phrase from query if user clears budget cap
                const cleanedQuery = evaluation.parsedQuery.rawQuery
                  .replace(
                    /\b(?:under|below|less\s+than|max|maximum|up\s+to|within|at\s+most)\s*\$?\d+(?:\.\d{1,2})?\b/gi,
                    ''
                  )
                  .replace(/\s+/g, ' ')
                  .trim();
                applyFilterPatch({
                  maxPrice: null,
                  minPrice: null,
                  budgetTier: 'all',
                  query: cleanedQuery,
                });
              }}
              className="text-[11px] font-semibold text-[#28537D] hover:text-[#1B3D5F] underline"
            >
              Clear budget
            </button>
          )}
        </div>

        <select
          id={`${idPrefix}-max-price`}
          value={filters.maxPrice !== null ? String(filters.maxPrice) : 'all'}
          onChange={(e) => {
            const val = e.target.value;
            applyFilterPatch({
              maxPrice: val === 'all' ? null : Number(val),
              budgetTier: 'all',
            });
          }}
          className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-white text-[#1B3D5F] font-medium border border-[#1B3D5F]/15 focus:outline-2 focus:outline-[#28537D]"
        >
          <option value="all">No Maximum Cap (All Verified Prices)</option>
          <option value="25">Strict Under $25 Max</option>
          <option value="40">Strict Under $40 Max</option>
          <option value="50">Strict Under $50 Max</option>
          <option value="75">Strict Under $75 Max</option>
          <option value="100">Strict Under $100 Max</option>
        </select>

        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {(['under-25', '25-to-75', 'over-75'] as BudgetTier[]).map((tier) => {
            const facet = evaluation.facets.budgetTiers.find(
              (b) => b.value === tier
            );
            const isSelected = filters.budgetTier === tier;
            return (
              <button
                key={tier}
                type="button"
                onClick={() =>
                  applyFilterPatch({
                    budgetTier: isSelected ? 'all' : tier,
                    maxPrice: null,
                    minPrice: null,
                  })
                }
                aria-pressed={isSelected}
                className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-colors text-center ${
                  isSelected
                    ? 'bg-[#1B3D5F] text-white'
                    : 'bg-white text-[#1B3D5F] hover:bg-[#EBF3FE] border border-[#1B3D5F]/10'
                }`}
              >
                <div>{BUDGET_TIER_LABELS[tier]}</div>
                <div
                  className={`text-[10px] font-normal ${
                    isSelected ? 'text-[#C3F3DF]' : 'text-[#28537D]'
                  }`}
                >
                  ({facet?.count ?? 0})
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Recipient / Relationship */}
      <div className="space-y-2 pt-4 border-t border-[#1B3D5F]/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1B3D5F]">
            Who Is It For?
          </span>
          {filters.recipient !== 'all' && (
            <button
              type="button"
              onClick={() => updateFilter('recipient', 'all')}
              className="text-[11px] font-semibold text-[#28537D] hover:text-[#1B3D5F] underline"
            >
              All
            </button>
          )}
        </div>
        <div className="space-y-1">
          {evaluation.facets.recipients.map((rec) => {
            const isSelected = filters.recipient === rec.value;
            return (
              <button
                key={rec.value}
                type="button"
                onClick={() =>
                  updateFilter('recipient', isSelected ? 'all' : rec.value)
                }
                aria-pressed={isSelected}
                className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-[#1B3D5F] text-white font-semibold'
                    : 'text-[#1B3D5F] hover:bg-white font-medium'
                }`}
              >
                <span>{rec.label}</span>
                <span
                  className={`tabular-nums text-[11px] ${
                    isSelected ? 'text-[#C3F3DF]' : 'text-[#28537D]'
                  }`}
                >
                  {rec.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Gift Style / Personality */}
      <div className="space-y-2 pt-4 border-t border-[#1B3D5F]/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1B3D5F]">
            Gift Style & Vibe
          </span>
          {filters.personalityTrait !== 'all' && (
            <button
              type="button"
              onClick={() => updateFilter('personalityTrait', 'all')}
              className="text-[11px] font-semibold text-[#28537D] hover:text-[#1B3D5F] underline"
            >
              All
            </button>
          )}
        </div>
        <div className="space-y-1">
          {evaluation.facets.personalityTraits.map((trait) => {
            const isSelected = filters.personalityTrait === trait.value;
            return (
              <button
                key={trait.value}
                type="button"
                onClick={() =>
                  updateFilter(
                    'personalityTrait',
                    isSelected ? 'all' : trait.value
                  )
                }
                aria-pressed={isSelected}
                className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between text-left transition-colors ${
                  isSelected
                    ? 'bg-[#1B3D5F] text-white font-semibold'
                    : 'text-[#1B3D5F] hover:bg-white font-medium'
                }`}
              >
                <span className="pr-2">{trait.label}</span>
                <span
                  className={`tabular-nums text-[11px] shrink-0 ${
                    isSelected ? 'text-[#C3F3DF]' : 'text-[#28537D]'
                  }`}
                >
                  {trait.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Occasion */}
      <div className="space-y-2 pt-4 border-t border-[#1B3D5F]/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1B3D5F]">
            Occasion
          </span>
          {filters.occasion !== 'all' && (
            <button
              type="button"
              onClick={() => updateFilter('occasion', 'all')}
              className="text-[11px] font-semibold text-[#28537D] hover:text-[#1B3D5F] underline"
            >
              All
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {evaluation.facets.occasions.map((occ) => {
            const isSelected = filters.occasion === occ.value;
            return (
              <button
                key={occ.value}
                type="button"
                onClick={() =>
                  updateFilter('occasion', isSelected ? 'all' : occ.value)
                }
                aria-pressed={isSelected}
                className={`px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-[#1B3D5F] text-white font-semibold'
                    : 'bg-white text-[#1B3D5F] hover:bg-[#EBF3FE] font-medium border border-[#1B3D5F]/8'
                }`}
              >
                <span className="truncate pr-1">{occ.label}</span>
                <span
                  className={`tabular-nums text-[10px] shrink-0 ${
                    isSelected ? 'text-[#C3F3DF]' : 'text-[#28537D]'
                  }`}
                >
                  {occ.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Product Category & Interest Selectors */}
      <div className="space-y-3 pt-4 border-t border-[#1B3D5F]/10">
        <div>
          <label
            htmlFor={`${idPrefix}-category`}
            className="block text-xs font-semibold uppercase tracking-wider text-[#1B3D5F] mb-1.5"
          >
            Product Category
          </label>
          <select
            id={`${idPrefix}-category`}
            value={filters.category}
            onChange={(e) => updateFilter('category', e.target.value)}
            className="w-full px-3 py-2.5 text-xs rounded-2xl bg-white text-[#1B3D5F] font-medium border border-[#1B3D5F]/15 focus:outline-2 focus:outline-[#28537D]"
          >
            <option value="all">All Categories ({products.length})</option>
            {evaluation.facets.categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label} ({cat.count})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`${idPrefix}-interest`}
            className="block text-xs font-semibold uppercase tracking-wider text-[#1B3D5F] mb-1.5"
          >
            Interest or Hobby Tag
          </label>
          <select
            id={`${idPrefix}-interest`}
            value={filters.interest}
            onChange={(e) => updateFilter('interest', e.target.value)}
            className="w-full px-3 py-2.5 text-xs rounded-2xl bg-white text-[#1B3D5F] font-medium border border-[#1B3D5F]/15 focus:outline-2 focus:outline-[#28537D]"
          >
            <option value="all">All Interests & Hobbies</option>
            {evaluation.facets.interests.map((intItem) => (
              <option key={intItem.value} value={intItem.value}>
                {intItem.label} ({intItem.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 6. Editorial Curation Toggle */}
      <div className="pt-4 border-t border-[#1B3D5F]/10">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.editorialOnly}
            onChange={(e) => updateFilter('editorialOnly', e.target.checked)}
            className="mt-0.5 rounded text-[#1B3D5F] focus:ring-[#28537D]"
          />
          <span className="text-xs text-[#1B3D5F] font-medium leading-snug">
            Editor’s Standout & Quick Picks only (
            {evaluation.facets.editorialPickCount})
          </span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="space-y-12">
      {/* =====================================================================
          HERO & NATURAL-LANGUAGE SEARCH WORKSPACE
         ===================================================================== */}
      <section className="rounded-3xl bg-gradient-to-br from-[#EBF3FE] via-[#F4F9FD] to-[#E8F8F0] p-6 md:p-10 shadow-xs space-y-6">
        {/* Mode Switcher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1B3D5F]/10 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMode('finder')}
              className={`px-4 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
                activeMode === 'finder'
                  ? 'bg-[#1B3D5F] text-white'
                  : 'bg-white/85 text-[#1B3D5F] hover:bg-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search & Filter ({evaluation.totalEligibleCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('quiz')}
              className={`px-4 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
                activeMode === 'quiz'
                  ? 'bg-[#1B3D5F] text-white'
                  : 'bg-white/85 text-[#1B3D5F] hover:bg-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>
                {quizCompleted
                  ? 'Edit Guided Quiz Answers'
                  : 'Take 5-Step Guided Quiz'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('lists')}
              className={`px-4 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
                activeMode === 'lists'
                  ? 'bg-[#1B3D5F] text-white'
                  : 'bg-white/85 text-[#1B3D5F] hover:bg-white'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>
                Saved Lists ({giftLists.length} · {savedProductIds.length} Gifts)
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyShareableUrl}
              className="px-3.5 py-2 rounded-full bg-white/90 hover:bg-white text-xs font-semibold text-[#1B3D5F] inline-flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-[#28537D]" />
              <span>
                {copiedShareUrl ? 'Search Link Copied!' : 'Share Search URL'}
              </span>
            </button>
          </div>
        </div>

        {/* Natural-Language Search Form (Enter or Search Button Submit) */}
        <form onSubmit={handleSearchSubmit} className="space-y-3" role="search">
          <label
            htmlFor="gift-finder-nl-input"
            className="block text-sm font-semibold text-[#1B3D5F]"
          >
            Describe who you are shopping for, what they love, or your budget in
            plain language:
          </label>
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-[#28537D] absolute left-4 pointer-events-none" />
            <input
              id="gift-finder-nl-input"
              type="search"
              value={searchDraft}
              onChange={(e) => {
                setSearchDraft(e.target.value);
              }}
              placeholder="Try “tea gifts for mom under $50” or “housewarming gift for someone who likes plants”..."
              className="w-full pl-12 pr-44 py-4 text-sm md:text-base rounded-2xl bg-white text-[#1B3D5F] placeholder:text-[#28537D]/55 shadow-xs border border-[#1B3D5F]/15 focus:outline-2 focus:outline-[#1B3D5F]"
            />
            <div className="absolute right-2.5 flex items-center gap-1.5">
              {(searchDraft || filters.query) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft('');
                    if (filters.query) {
                      applyFilterPatch(
                        { query: '' },
                        'filter',
                        'Cleared search query'
                      );
                    }
                  }}
                  aria-label="Clear search query"
                  className="px-3 py-2 rounded-xl bg-[#F3ECE1] hover:bg-[#1B3D5F] hover:text-white text-xs font-semibold text-[#1B3D5F] transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                aria-label="Submit gift search"
                className="px-4 py-2 rounded-xl bg-[#1B3D5F] hover:bg-[#28537D] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </div>
          </div>

          {/* Example Natural-Language Prompts */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-[#28537D]">
              Try an example:
            </span>
            {EXAMPLE_NATURAL_QUERIES.map((example) => {
              const isCurrent =
                filters.query.trim().toLowerCase() ===
                example.query.toLowerCase();
              return (
                <button
                  key={example.query}
                  type="button"
                  onClick={() => {
                    setSearchDraft(example.query);
                    applyFilterPatch(
                      {
                        ...DEFAULT_FINDER_FILTERS,
                        query: example.query,
                      },
                      'search'
                    );
                    setActiveMode('finder');
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isCurrent
                      ? 'bg-[#1B3D5F] text-white font-semibold'
                      : 'bg-white/85 text-[#1B3D5F] hover:bg-white'
                  }`}
                >
                  “{example.label}”
                </button>
              );
            })}
          </div>
        </form>

        {/* Parsed Intent & Active Hard Constraints Bar */}
        {(evaluation.hasActiveCriteria ||
          evaluation.parsedQuery.inferredRecipients.length > 0 ||
          evaluation.parsedQuery.inferredOccasions.length > 0 ||
          evaluation.parsedQuery.inferredInterests.length > 0 ||
          evaluation.effectiveMaxPrice !== null) && (
          <div className="p-4 rounded-2xl bg-white/90 border border-[#1B3D5F]/10 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-[#28537D]">
                <span className="font-semibold text-[#1B3D5F]">
                  Active Criteria & Recognized Signals:
                </span>
                {evaluation.effectiveMaxPrice !== null && (
                  <span className="font-semibold text-[#1B3D5F]">
                    Hard Budget Cap: ≤ ${evaluation.effectiveMaxPrice} USD
                    (excludes over-budget & unpriced items)
                  </span>
                )}
                {evaluation.parsedQuery.inferredRecipients.length > 0 && (
                  <span>
                    · Recipient:{' '}
                    {evaluation.parsedQuery.inferredRecipients
                      .map((r) => RECIPIENT_LABELS[r])
                      .join(', ')}
                  </span>
                )}
                {evaluation.parsedQuery.inferredInterests.length > 0 && (
                  <span>
                    · Interests:{' '}
                    {evaluation.parsedQuery.inferredInterests
                      .slice(0, 3)
                      .join(', ')}
                  </span>
                )}
                {evaluation.parsedQuery.inferredOccasions.length > 0 && (
                  <span>
                    · Occasion:{' '}
                    {evaluation.parsedQuery.inferredOccasions
                      .map((o) => OCCASION_LABELS[o])
                      .join(', ')}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B3D5F] hover:text-[#F2846B] underline shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All ({products.length} Gifts)</span>
              </button>
            </div>

            {activeFilterPills.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {activeFilterPills.map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={pill.onRemove}
                    className="px-3 py-1 rounded-full bg-[#F3ECE1] hover:bg-[#1B3D5F] hover:text-white text-xs font-semibold text-[#1B3D5F] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>{pill.label}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* =====================================================================
          MODE 2: GUIDED 5-STEP GIFT-FINDING QUIZ (STAGE C)
         ===================================================================== */}
      {activeMode === 'quiz' && (
        <section
          aria-label="Guided Gift-Finding Quiz"
          className="rounded-3xl bg-[#F3ECE1] p-6 md:p-10 space-y-8 border border-[#1B3D5F]/10"
        >
          {/* Progress Header */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                  Guided Gift Concierge · Step {quizStepIndex + 1} of{' '}
                  {QUIZ_STEPS.length}
                </div>
                <h2 className="text-2xl md:text-3xl font-serif font-semibold text-[#1B3D5F]">
                  {QUIZ_STEPS[quizStepIndex].question}
                </h2>
                <p className="text-sm text-[#28537D] mt-1">
                  {QUIZ_STEPS[quizStepIndex].subtitle}
                </p>
              </div>

              <div className="text-right">
                <div className="text-xs text-[#28537D]">
                  Current Matching Gifts
                </div>
                <div className="text-2xl font-serif font-semibold text-[#1B3D5F] tabular-nums">
                  {quizEvaluation.totalEligibleCount}{' '}
                  <span className="text-xs font-sans font-normal text-[#28537D]">
                    of {products.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Clickable Step Progress Bar (allows jumping to any step to edit answers) */}
            <div className="grid grid-cols-5 gap-2">
              {QUIZ_STEPS.map((step, idx) => {
                const isCurrent = idx === quizStepIndex;
                const isDone = idx < quizStepIndex;
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => setQuizStepIndex(idx)}
                    className={`p-2.5 rounded-2xl text-left transition-colors border ${
                      isCurrent
                        ? 'bg-[#1B3D5F] text-white border-[#1B3D5F]'
                        : isDone
                          ? 'bg-[#E8F8F0] text-[#1B3D5F] border-[#1B3D5F]/15'
                          : 'bg-white/70 text-[#28537D] border-transparent hover:bg-white'
                    }`}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                      Step {step.stepNumber}
                    </div>
                    <div className="text-xs font-semibold truncate">
                      {step.key === 'recipient' &&
                        (quizAnswers.recipient === 'all'
                          ? 'Anyone'
                          : RECIPIENT_LABELS[quizAnswers.recipient])}
                      {step.key === 'interest' &&
                        (quizAnswers.interest === 'all'
                          ? 'Any Interest'
                          : quizAnswers.interest)}
                      {step.key === 'occasion' &&
                        (quizAnswers.occasion === 'all'
                          ? 'Any Occasion'
                          : OCCASION_LABELS[quizAnswers.occasion])}
                      {step.key === 'maxPrice' &&
                        (quizAnswers.maxPrice === null
                          ? 'Any Budget'
                          : `Under $${quizAnswers.maxPrice}`)}
                      {step.key === 'personalityTrait' &&
                        (quizAnswers.personalityTrait === 'all'
                          ? 'Any Style'
                          : PERSONALITY_LABELS[quizAnswers.personalityTrait])}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step Options Body */}
          <div className="min-h-[220px]">
            {quizStepIndex === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <button
                  type="button"
                  onClick={() =>
                    setQuizAnswers((p) => ({ ...p, recipient: 'all' }))
                  }
                  className={`p-4 rounded-2xl text-left transition-colors border ${
                    quizAnswers.recipient === 'all'
                      ? 'bg-[#1B3D5F] text-white border-[#1B3D5F]'
                      : 'bg-white text-[#1B3D5F] border-[#1B3D5F]/10 hover:border-[#1B3D5F]'
                  }`}
                >
                  <div className="font-serif font-semibold text-base">
                    Anyone / Open to All
                  </div>
                  <div className="text-xs opacity-80 mt-1">
                    Show recommendations across all relationships ({products.length}{' '}
                    gifts)
                  </div>
                </button>
                {(
                  Object.entries(RECIPIENT_LABELS) as Array<
                    [RecipientType, string]
                  >
                ).map(([value, label]) => {
                  const selected = quizAnswers.recipient === value;
                  const count = products.filter((p) =>
                    p.recipients.includes(value)
                  ).length;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setQuizAnswers((p) => ({ ...p, recipient: value }))
                      }
                      className={`p-4 rounded-2xl text-left transition-colors border ${
                        selected
                          ? 'bg-[#1B3D5F] text-white border-[#1B3D5F]'
                          : 'bg-white text-[#1B3D5F] border-[#1B3D5F]/10 hover:border-[#1B3D5F]'
                      }`}
                    >
                      <div className="font-serif font-semibold text-base">
                        {label}
                      </div>
                      <div className="text-xs opacity-80 mt-1">
                        {count} verified catalog gifts
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {quizStepIndex === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setQuizAnswers((p) => ({ ...p, interest: 'all' }))
                  }
                  className={`p-4 rounded-2xl text-left transition-colors border ${
                    quizAnswers.interest === 'all'
                      ? 'bg-[#1B3D5F] text-white border-[#1B3D5F]'
                      : 'bg-white text-[#1B3D5F] border-[#1B3D5F]/10 hover:border-[#1B3D5F]'
                  }`}
                >
                  <div className="font-semibold text-sm">
                    Any Interest (Skip filter)
                  </div>
                  <div className="text-xs opacity-80 mt-0.5">
                    Keep all hobbies and interests eligible
                  </div>
                </button>
                {evaluation.facets.interests.slice(0, 11).map((intItem) => {
                  const selected = quizAnswers.interest === intItem.value;
                  return (
                    <button
                      key={intItem.value}
                      type="button"
                      onClick={() =>
                        setQuizAnswers((p) => ({
                          ...p,
                          interest: intItem.value,
                        }))
                      }
                      className={`p-4 rounded-2xl text-left transition-colors border ${
                        selected
                          ? 'bg-[#1B3D5F] text-white border-[#1B3D5F]'
                          : 'bg-white text-[#1B3D5F] border-[#1B3D5F]/10 hover:border-[#1B3D5F]'
                      }`}
                    >
                      <div className="font-semibold text-sm">
                        {intItem.label}
                      </div>
                      <div className="text-xs opacity-80 mt-0.5">
                        Matches in catalog
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {quizStepIndex === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <button
                  type="button"
                  onClick={() =>
                    setQuizAnswers((p) => ({ ...p, occasion: 'all' }))
                  }
                  className={`p-4 rounded-2xl text-left transition-colors border ${
                    quizAnswers.occasion === 'all'
                      ? 'bg-[#1B3D5F] text-white border-[#1B3D5F]'
                      : 'bg-white text-[#1B3D5F] border-[#1B3D5F]/10 hover:border-[#1B3D5F]'
                  }`}
                >
                  <div className="font-serif font-semibold text-base">
                    Any Occasion / Just Browsing
                  </div>
                  <div className="text-xs opacity-80 mt-1">
                    Do not restrict by calendar occasion
                  </div>
                </button>
                {(
                  Object.entries(OCCASION_LABELS) as Array<
                    [OccasionType, string]
                  >
                ).map(([value, label]) => {
                  const selected = quizAnswers.occasion === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setQuizAnswers((p) => ({ ...p, occasion: value }))
                      }
                      className={`p-4 rounded-2xl text-left transition-colors border ${
                        selected
                          ? 'bg-[#1B3D5F] text-white border-[#1B3D5F]'
                          : 'bg-white text-[#1B3D5F] border-[#1B3D5F]/10 hover:border-[#1B3D5F]'
                      }`}
                    >
                      <div className="font-serif font-semibold text-base">
                        {label}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {quizStepIndex === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[
                  {
                    value: null,
                    label: 'No Strict Maximum',
                    desc: 'Show all verified prices ($18 – $115)',
                  },
                  {
                    value: 25,
                    label: 'Under $25 USD',
                    desc: 'Small everyday gestures ($18 – $24)',
                  },
                  {
                    value: 50,
                    label: 'Under $50 USD',
                    desc: 'Our Sweet Spot Edit ($18 – $48)',
                  },
                  {
                    value: 75,
                    label: 'Under $75 USD',
                    desc: 'Includes ceremonial sets & custom prints',
                  },
                  {
                    value: 100,
                    label: 'Under $100 USD',
                    desc: 'Includes Turkish cotton robes & heirloom games',
                  },
                ].map((opt) => {
                  const selected = quizAnswers.maxPrice === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() =>
                        setQuizAnswers((p) => ({ ...p, maxPrice: opt.value }))
                      }
                      className={`p-4 rounded-2xl text-left transition-colors border ${
                        selected
                          ? 'bg-[#1B3D5F] text-white border-[#1B3D5F]'
                          : 'bg-white text-[#1B3D5F] border-[#1B3D5F]/10 hover:border-[#1B3D5F]'
                      }`}
                    >
                      <div className="font-serif font-semibold text-base">
                        {opt.label}
                      </div>
                      <div className="text-xs opacity-80 mt-1">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {quizStepIndex === 4 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <button
                  type="button"
                  onClick={() =>
                    setQuizAnswers((p) => ({ ...p, personalityTrait: 'all' }))
                  }
                  className={`p-4 rounded-2xl text-left transition-colors border ${
                    quizAnswers.personalityTrait === 'all'
                      ? 'bg-[#1B3D5F] text-white border-[#1B3D5F]'
                      : 'bg-white text-[#1B3D5F] border-[#1B3D5F]/10 hover:border-[#1B3D5F]'
                  }`}
                >
                  <div className="font-serif font-semibold text-base">
                    All Gift Styles
                  </div>
                  <div className="text-xs opacity-80 mt-1">
                    Include practical, cozy, culinary, and sentimental gifts
                  </div>
                </button>
                {(
                  Object.entries(PERSONALITY_LABELS) as Array<
                    [PersonalityTrait, string]
                  >
                ).map(([value, label]) => {
                  const selected = quizAnswers.personalityTrait === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setQuizAnswers((p) => ({
                          ...p,
                          personalityTrait: value,
                        }))
                      }
                      className={`p-4 rounded-2xl text-left transition-colors border ${
                        selected
                          ? 'bg-[#1B3D5F] text-white border-[#1B3D5F]'
                          : 'bg-white text-[#1B3D5F] border-[#1B3D5F]/10 hover:border-[#1B3D5F]'
                      }`}
                    >
                      <div className="font-serif font-semibold text-base">
                        {label}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quiz Footer Navigation */}
          <div className="pt-4 border-t border-[#1B3D5F]/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={quizStepIndex === 0}
                onClick={() => setQuizStepIndex((i) => Math.max(0, i - 1))}
                className="px-4 py-2.5 rounded-full bg-white text-xs font-semibold text-[#1B3D5F] disabled:opacity-40 inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Step</span>
              </button>

              {quizStepIndex < QUIZ_STEPS.length - 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setQuizStepIndex((i) =>
                      Math.min(QUIZ_STEPS.length - 1, i + 1)
                    )
                  }
                  className="px-4 py-2.5 rounded-full bg-white/70 hover:bg-white text-xs font-medium text-[#28537D]"
                >
                  Skip This Question →
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRestartQuiz}
                className="px-4 py-2.5 rounded-full bg-white/80 hover:bg-white text-xs font-semibold text-[#28537D] hover:text-[#1B3D5F] inline-flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart Quiz</span>
              </button>

              {quizStepIndex < QUIZ_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setQuizStepIndex((i) =>
                      Math.min(QUIZ_STEPS.length - 1, i + 1)
                    )
                  }
                  className="px-6 py-3 rounded-full bg-[#1B3D5F] text-white text-xs font-semibold hover:bg-[#28537D] inline-flex items-center gap-2"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishQuiz}
                  className="px-6 py-3 rounded-full bg-[#1B3D5F] text-white text-xs font-semibold hover:bg-[#28537D] transition-colors inline-flex items-center gap-2 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C3F3DF]" />
                  <span>
                    See Recommended Gifts ({quizEvaluation.totalEligibleCount})
                  </span>
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          MODE 3: SAVED LISTS & RECIPIENT PLANNER WORKSPACE (STAGE D)
         ===================================================================== */}
      {activeMode === 'lists' && (
        <section
          aria-label="Saved Gift Lists and Recipient Manager"
          className="rounded-3xl bg-[#F3ECE1] p-6 md:p-10 space-y-8 border border-[#1B3D5F]/10"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-[#28537D]">
                Browser-Saved Gift Planner · Private & Local
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-semibold text-[#1B3D5F]">
                Organize Saved Gifts by Recipient or Occasion
              </h2>
              <p className="text-sm text-[#28537D] mt-1 max-w-2xl">
                Create separate lists for birthdays, hosts, and holidays, add
                private notes, and track which gifts you have already purchased.
                Your private notes stay in your browser and are never added to
                shareable search URLs.
              </p>
            </div>

            <button
              type="button"
              onClick={dispatchOpenSavedDrawer}
              className="px-4 py-2.5 rounded-full bg-white text-xs font-semibold text-[#1B3D5F] hover:bg-[#1B3D5F] hover:text-white transition-colors"
            >
              Open Slide-Over Drawer
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: List Selector + Create New List Form */}
            <div className="lg:col-span-4 space-y-5">
              <div className="p-5 rounded-2xl bg-white space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                  Your Lists ({giftLists.length})
                </div>
                <div className="space-y-2">
                  {giftLists.map((list) => {
                    const isSelected = list.id === activeSavedList.id;
                    const resolved = resolveSavedListItems(list, productsMap);
                    return (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => {
                          setSelectedListId(list.id);
                          setConfirmListAction(null);
                        }}
                        className={`w-full p-3.5 rounded-2xl text-left transition-colors border ${
                          isSelected
                            ? 'bg-[#1B3D5F] text-white border-[#1B3D5F]'
                            : 'bg-[#FAF7F2] text-[#1B3D5F] border-transparent hover:border-[#1B3D5F]/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-serif font-semibold text-sm">
                            {list.name}
                          </span>
                          <span className="text-xs font-semibold tabular-nums">
                            {list.items.length}{' '}
                            {list.items.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        <div
                          className={`text-[11px] mt-1 ${
                            isSelected ? 'text-[#C3F3DF]' : 'text-[#28537D]'
                          }`}
                        >
                          {[list.recipientLabel, list.occasionLabel]
                            .filter(Boolean)
                            .join(' · ') || 'General list'}{' '}
                          · ${resolved.totalVerifiedPrice} USD
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Create New Named List Form */}
              <form
                onSubmit={handleCreateNewList}
                className="p-5 rounded-2xl bg-white space-y-3.5"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-[#1B3D5F] flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#28537D]" />
                  <span>Create New Recipient List</span>
                </div>

                <div>
                  <label
                    htmlFor="finder-new-list-name"
                    className="block text-xs font-medium text-[#28537D] mb-1"
                  >
                    List Name
                  </label>
                  <input
                    id="finder-new-list-name"
                    type="text"
                    required
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="e.g., Mom’s Birthday, Holiday Hosts..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F2] text-[#1B3D5F] border border-[#1B3D5F]/15 focus:outline-2 focus:outline-[#28537D]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="finder-new-list-recipient"
                      className="block text-xs font-medium text-[#28537D] mb-1"
                    >
                      Relationship (optional)
                    </label>
                    <input
                      id="finder-new-list-recipient"
                      type="text"
                      value={newListRecipient}
                      onChange={(e) => setNewListRecipient(e.target.value)}
                      placeholder="Parent, Friend..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAF7F2] text-[#1B3D5F] border border-[#1B3D5F]/15"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="finder-new-list-occasion"
                      className="block text-xs font-medium text-[#28537D] mb-1"
                    >
                      Occasion (optional)
                    </label>
                    <input
                      id="finder-new-list-occasion"
                      type="text"
                      value={newListOccasion}
                      onChange={(e) => setNewListOccasion(e.target.value)}
                      placeholder="Birthday, Holidays..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAF7F2] text-[#1B3D5F] border border-[#1B3D5F]/15"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-[#1B3D5F] text-white text-xs font-semibold hover:bg-[#28537D] transition-colors"
                >
                  Create Gift List
                </button>
              </form>
            </div>

            {/* Right Column: Active List Items & Management */}
            <div className="lg:col-span-8 p-6 rounded-2xl bg-white space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1B3D5F]/10 pb-4">
                <div>
                  <h3 className="text-xl font-serif font-semibold text-[#1B3D5F]">
                    {activeSavedList.name}
                  </h3>
                  <div className="text-xs text-[#28537D] mt-0.5">
                    {resolvedSavedList.validProductsCount}{' '}
                    {resolvedSavedList.validProductsCount === 1
                      ? 'gift'
                      : 'gifts'}{' '}
                    · {resolvedSavedList.purchasedCount} marked purchased · Total
                    ${resolvedSavedList.totalVerifiedPrice} USD
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {activeSavedList.id !== DEFAULT_LIST_ID && (
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmListAction({
                          type: 'delete-list',
                          listId: activeSavedList.id,
                          listName: activeSavedList.name,
                        })
                      }
                      className="px-3.5 py-1.5 rounded-full bg-[#FAF7F2] text-xs font-semibold text-[#28537D] hover:text-[#F2846B]"
                    >
                      Delete This List
                    </button>
                  )}
                  {savedProductIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setConfirmListAction({ type: 'clear-all' })}
                      className="px-3.5 py-1.5 rounded-full bg-[#FAF7F2] text-xs font-semibold text-[#28537D] hover:text-[#F2846B]"
                    >
                      Clear All Saved
                    </button>
                  )}
                </div>
              </div>

              {confirmListAction && (
                <div
                  role="alert"
                  className="p-4 rounded-2xl bg-[#FFF4D6] border border-[#1B3D5F]/15 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 font-medium text-[#1B3D5F]">
                    <AlertTriangle className="w-4 h-4 text-[#F2846B] shrink-0" />
                    <span>
                      {confirmListAction.type === 'delete-list'
                        ? `Confirm deleting "${confirmListAction.listName}"?`
                        : 'Confirm clearing all saved gift lists and notes?'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmListAction(null)}
                      className="px-3 py-1.5 rounded-full bg-white text-[#1B3D5F] font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmListAction.type === 'delete-list') {
                          removeList(confirmListAction.listId);
                          setSelectedListId(DEFAULT_LIST_ID);
                        } else {
                          clearAllLists();
                          setSelectedListId(DEFAULT_LIST_ID);
                        }
                        setConfirmListAction(null);
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-[#F2846B] text-white font-semibold"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}

              {resolvedSavedList.resolvedItems.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#FAF7F2] text-center space-y-3">
                  <p className="font-serif text-lg text-[#1B3D5F]">
                    This list doesn’t have any saved gifts yet.
                  </p>
                  <p className="text-xs text-[#28537D]">
                    Switch to Search & Filter to add gifts directly to “
                    {activeSavedList.name}”.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveMode('finder')}
                    className="px-5 py-2.5 rounded-full bg-[#1B3D5F] text-white text-xs font-semibold"
                  >
                    Browse Recommendations
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {resolvedSavedList.resolvedItems.map(
                    ({ entry, product, isMissingFromCatalog }) => {
                      if (isMissingFromCatalog || !product) {
                        return (
                          <div
                            key={entry.productId}
                            className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#D9DFE2] flex items-center justify-between gap-4"
                          >
                            <div>
                              <div className="text-xs font-semibold text-[#1B3D5F]">
                                Unavailable Catalog Item ({entry.productId})
                              </div>
                              <p className="text-xs text-[#28537D]">
                                This product is no longer available in the
                                canonical catalog.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                removeItemFromList(
                                  entry.productId,
                                  activeSavedList.id
                                )
                              }
                              className="px-3 py-1.5 rounded-full bg-white text-xs font-semibold text-[#1B3D5F] hover:bg-[#F2846B] hover:text-white"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={product.id}
                          className={`p-4 rounded-2xl border transition-colors space-y-3 ${
                            entry.purchased
                              ? 'bg-[#E8F8F0]/45 border-[#C3F3DF]'
                              : 'bg-[#FAF7F2] border-[#1B3D5F]/10'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[#F3ECE1]">
                                <PhotoImage
                                  src={product.images[0]?.url}
                                  alt={product.images[0]?.alt}
                                  fallbackColor={
                                    product.images[0]?.fallbackColor
                                  }
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs text-[#28537D]">
                                  {product.vendor} ·{' '}
                                  <strong className="text-[#1B3D5F] tabular-nums">
                                    ${product.price} {product.currency}
                                  </strong>
                                </div>
                                <a
                                  href={`/products/${product.slug}/`}
                                  className={`text-base font-serif font-semibold text-[#1B3D5F] hover:underline block truncate ${
                                    entry.purchased
                                      ? 'line-through opacity-75'
                                      : ''
                                  }`}
                                >
                                  {product.title}
                                </a>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleItemPurchased(
                                    product.id,
                                    activeSavedList.id
                                  )
                                }
                                aria-pressed={entry.purchased}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                                  entry.purchased
                                    ? 'bg-[#1B3D5F] text-white'
                                    : 'bg-white text-[#1B3D5F] hover:bg-[#E8F8F0]'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>
                                  {entry.purchased
                                    ? 'Purchased'
                                    : 'Mark Purchased'}
                                </span>
                              </button>

                              {giftLists.length > 1 && (
                                <select
                                  aria-label={`Move ${product.title} to another list`}
                                  value={activeSavedList.id}
                                  onChange={(e) =>
                                    moveItemBetweenLists(
                                      product.id,
                                      activeSavedList.id,
                                      e.target.value
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-full bg-white text-xs font-medium text-[#1B3D5F] border border-[#1B3D5F]/15"
                                >
                                  {giftLists.map((l) => (
                                    <option key={l.id} value={l.id}>
                                      List: {l.name}
                                    </option>
                                  ))}
                                </select>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  removeItemFromList(
                                    product.id,
                                    activeSavedList.id
                                  )
                                }
                                className="p-2 rounded-full text-[#28537D] hover:text-[#F2846B]"
                                aria-label={`Remove ${product.title}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor={`planner-note-${activeSavedList.id}-${product.id}`}
                              className="block text-[11px] font-medium text-[#28537D] mb-1"
                            >
                              Private Note for {activeSavedList.name}:
                            </label>
                            <input
                              id={`planner-note-${activeSavedList.id}-${product.id}`}
                              type="text"
                              value={entry.note}
                              onChange={(e) =>
                                updateRecipientNote(
                                  product.id,
                                  e.target.value,
                                  activeSavedList.id
                                )
                              }
                              placeholder="Add a private reminder (size, occasion date, card inscription)..."
                              className="w-full px-3 py-2 text-xs rounded-xl bg-white text-[#1B3D5F] border border-[#1B3D5F]/15"
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          MAIN FINDER WORKSPACE: DESKTOP FACET SIDEBAR + RESULTS GRID
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Desktop Faceted Filter Column (3 cols) */}
        <aside
          aria-label="Gift Finder Filters"
          className="hidden lg:block lg:col-span-3 p-6 rounded-3xl bg-[#F3ECE1]/85 border border-[#1B3D5F]/8 space-y-6 sticky top-24"
        >
          <div className="flex items-center justify-between border-b border-[#1B3D5F]/10 pb-3">
            <div className="flex items-center gap-2 text-sm font-serif font-semibold text-[#1B3D5F]">
              <SlidersHorizontal className="w-4 h-4 text-[#28537D]" />
              <span>Filter Collection</span>
            </div>
            {evaluation.hasActiveCriteria && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs font-semibold text-[#28537D] hover:text-[#1B3D5F] underline"
              >
                Reset
              </button>
            )}
          </div>

          {renderFacetControls('desktop')}
        </aside>

        {/* Results Column (9 cols) */}
        <div
          className="lg:col-span-9 space-y-8"
          aria-busy={thinkingState !== null}
        >
          {/* Results Header Bar: Count, Mobile Filter Button, and Sort Control */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1B3D5F]/10">
            <div className="flex flex-wrap items-center gap-3">
              {/* Mobile Filter Drawer Trigger */}
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden px-4 py-2.5 rounded-full bg-[#1B3D5F] text-white text-xs font-semibold inline-flex items-center gap-2"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>
                  Filters & Budget
                  {activeFilterPills.length > 0
                    ? ` (${activeFilterPills.length})`
                    : ''}
                </span>
              </button>

              <div
                aria-live="polite"
                className="text-sm font-semibold text-[#1B3D5F] tabular-nums"
              >
                {thinkingState ? (
                  <span className="text-[#28537D]">
                    {thinkingState.statusMessage}
                  </span>
                ) : (
                  <>
                    Showing {evaluation.totalEligibleCount} verified{' '}
                    {evaluation.totalEligibleCount === 1 ? 'gift' : 'gifts'}
                    {evaluation.effectiveMaxPrice !== null && (
                      <span className="text-[#28537D] font-normal">
                        {' '}
                        · strictly ≤ ${evaluation.effectiveMaxPrice} USD
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="finder-sort-select"
                className="text-xs font-semibold text-[#28537D]"
              >
                Sort by:
              </label>
              <select
                id="finder-sort-select"
                value={filters.sort}
                onChange={(e) => {
                  const nextSort = e.target.value as FinderSortOption;
                  const sortLabel =
                    nextSort === 'price-asc'
                      ? 'Price: Low to High'
                      : nextSort === 'price-desc'
                        ? 'Price: High to Low'
                        : 'Best Match';
                  updateFilter('sort', nextSort, sortLabel);
                }}
                className="px-3.5 py-2 text-xs rounded-full bg-[#F3ECE1] text-[#1B3D5F] font-semibold focus:outline-2 focus:outline-[#1B3D5F]"
              >
                <option value="relevance">Best Match (Relevance)</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Completed Guided Quiz Summary & Edit / Restart Controls */}
          {quizCompleted && !thinkingState && (
            <div className="p-4 sm:px-5 sm:py-3.5 rounded-2xl bg-[#E8F8F0]/80 border border-[#1B3D5F]/12 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-[#1B3D5F]">
                <Compass className="w-4 h-4 text-[#28537D] shrink-0" />
                <span>
                  <strong className="font-semibold">
                    Guided Quiz Recommendations Ready:
                  </strong>{' '}
                  Matched to your 5-step recipient profile.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMode('quiz')}
                  className="px-3 py-1.5 rounded-full bg-white hover:bg-[#1B3D5F] hover:text-white text-xs font-semibold text-[#1B3D5F] transition-colors"
                >
                  Edit Quiz Answers
                </button>
                <button
                  type="button"
                  onClick={handleRestartQuiz}
                  className="px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-xs font-semibold text-[#28537D] hover:text-[#1B3D5F] inline-flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restart Quiz</span>
                </button>
              </div>
            </div>
          )}

          {/* Gift-Themed Thinking Animation Stage */}
          {thinkingState && (
            <GiftThinkingAnimation
              actionType={thinkingState.actionType}
              phase={thinkingState.phase}
              statusMessage={thinkingState.statusMessage}
              descriptor={thinkingState.descriptor}
              prefersReducedMotion={prefersReducedMotion}
            />
          )}

          {/* Results Body: Hidden during full 'search' and 'quiz' thinking animations so stale results are never shown as new ones */}
          {thinkingState &&
          (thinkingState.actionType === 'search' ||
            thinkingState.actionType === 'quiz') ? null : (
            <div
              className={
                thinkingState
                  ? 'opacity-45 pointer-events-none transition-opacity duration-200 space-y-8'
                  : 'opacity-100 transition-opacity duration-200 space-y-8'
              }
            >
              {/* Refinement Suggestions Banner when results are 0 or narrow */}
              {evaluation.suggestions.length > 0 &&
                evaluation.totalEligibleCount <= 2 && (
                  <div className="p-6 rounded-3xl bg-[#FFF4D6] border border-[#1B3D5F]/10 space-y-4">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
                        {evaluation.totalEligibleCount === 0
                          ? 'No Exact Matches Found for Every Constraint Together'
                          : 'Want to See More Options?'}
                      </div>
                      <h3 className="text-lg font-serif font-semibold text-[#1B3D5F]">
                        {evaluation.totalEligibleCount === 0
                          ? 'Try one of these one-click adjustments to broaden your search:'
                          : 'Broaden a single filter to unlock more verified recommendations:'}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {evaluation.suggestions.map((sug) => (
                        <button
                          key={sug.id}
                          type="button"
                          onClick={() =>
                            applyFilterPatch(sug.patch, 'filter', sug.label)
                          }
                          className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#1B3D5F] text-[#1B3D5F] hover:text-white text-xs font-semibold transition-colors text-left shadow-2xs"
                        >
                          <div>{sug.label}</div>
                          <div className="text-[11px] font-normal opacity-80">
                            {sug.reason}
                          </div>
                        </button>
                      ))}
                      {evaluation.hasActiveCriteria && (
                        <button
                          type="button"
                          onClick={resetAllFilters}
                          className="px-4 py-2.5 rounded-2xl bg-[#1B3D5F] text-white text-xs font-semibold hover:bg-[#28537D] transition-colors"
                        >
                          Show All {products.length} Gifts
                        </button>
                      )}
                    </div>
                  </div>
                )}

              {/* Results Grid */}
              {evaluation.results.length === 0 ? (
                <div className="p-12 rounded-3xl bg-[#F3ECE1]/70 text-center space-y-4">
                  <Gift className="w-10 h-10 text-[#28537D] mx-auto opacity-75" />
                  <h3 className="text-2xl font-serif font-semibold text-[#1B3D5F]">
                    No gifts matched that exact combination
                  </h3>
                  <p className="text-sm text-[#28537D] max-w-md mx-auto">
                    We never invent fake matches or show over-budget items when
                    you set a strict price limit. Try removing one filter above
                    or view our full editor-tested catalog.
                  </p>
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="px-6 py-3 rounded-full bg-[#1B3D5F] text-[#FAF7F2] text-xs font-semibold hover:bg-[#28537D]"
                  >
                    Reset All Filters ({products.length} Gifts)
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-7 gap-y-10">
                  {evaluation.results.map((item) => (
                    <FinderResultCard
                      key={item.product.id}
                      result={item}
                      hasActiveCriteria={evaluation.hasActiveCriteria}
                      isSaved={savedProductIds.includes(item.product.id)}
                      onToggleSave={toggleSaveProduct}
                      giftLists={giftLists}
                      onAddProductToList={addProductToList}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          MOBILE FILTER DRAWER (Accessible Dialog with Live Count & Apply/Reset)
         ===================================================================== */}
      {isMobileFilterOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#1B3D5F]/55 backdrop-blur-xs lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filter Gift Finder Results"
        >
          <div className="w-full max-w-md bg-[#FAF7F2] h-full flex flex-col shadow-2xl">
            <div className="px-6 py-4 bg-[#F3ECE1] flex items-center justify-between border-b border-[#1B3D5F]/10">
              <div>
                <div className="text-xs font-medium text-[#28537D]">
                  Gift Finder Controls
                </div>
                <h2 className="text-lg font-serif font-semibold text-[#1B3D5F]">
                  Filters & Budget ({evaluation.totalEligibleCount} Matches)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-2 rounded-full text-[#1B3D5F] hover:bg-[#1B3D5F]/10"
                aria-label="Close mobile filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {renderFacetControls('mobile')}
            </div>

            <div className="p-5 bg-[#F3ECE1] border-t border-[#1B3D5F]/10 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-4 py-2.5 rounded-full bg-white text-xs font-semibold text-[#1B3D5F]"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-2.5 px-5 rounded-full bg-[#1B3D5F] text-white text-xs font-semibold text-center"
              >
                Apply Filters ({evaluation.totalEligibleCount}{' '}
                {evaluation.totalEligibleCount === 1 ? 'Gift' : 'Gifts'})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface FinderResultCardProps {
  result: RankedGiftResult;
  hasActiveCriteria: boolean;
  isSaved: boolean;
  onToggleSave: (productId: string) => void;
  giftLists: Array<{ id: string; name: string }>;
  onAddProductToList: (productId: string, listId: string) => void;
}

const FinderResultCard: React.FC<FinderResultCardProps> = ({
  result,
  hasActiveCriteria,
  isSaved,
  onToggleSave,
  giftLists,
  onAddProductToList,
}) => {
  const { product, matchExplanation, editorialBadges } = result;
  const [justAddedToListName, setJustAddedToListName] = useState<string | null>(
    null
  );

  const primaryImage = product.images?.[0] ?? {
    id: 'fallback',
    url: '',
    fallbackColor: '#EBF3FE',
    alt: product.title,
  };

  const leadBadge = editorialBadges[0] || product.calloutTag;
  const recipientNames = (product.recipients ?? [])
    .slice(0, 2)
    .map((r) => RECIPIENT_LABELS[r] || r);

  return (
    <article className="group flex flex-col justify-between rounded-3xl bg-white p-4 shadow-xs border border-[#1B3D5F]/8 transition-transform duration-200 hover:-translate-y-1">
      <div>
        {/* Product Image Stage */}
        <div
          onClick={() => dispatchOpenProductModal(product)}
          className="relative aspect-4/5 w-full rounded-2xl overflow-hidden bg-[#F3ECE1] cursor-pointer mb-4"
        >
          <PhotoImage
            src={primaryImage.url}
            alt={primaryImage.alt}
            fallbackColor={primaryImage.fallbackColor}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(product.id);
            }}
            aria-pressed={isSaved}
            aria-label={
              isSaved
                ? `Remove ${product.title} from Saved Gifts`
                : `Save ${product.title} to Saved Gifts`
            }
            className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
              isSaved
                ? 'bg-[#F2846B] text-white'
                : 'bg-white/95 text-[#1B3D5F] hover:bg-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>

          <div className="absolute bottom-3 left-3.5 text-white font-semibold text-sm tabular-nums drop-shadow-xs">
            ${product.price}{' '}
            <span className="text-[11px] font-normal opacity-90">
              {product.currency}
            </span>
          </div>
        </div>

        {/* Unboxed Editorial Metadata Kicker */}
        <div className="px-1 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-[#28537D] font-medium truncate">
            {leadBadge && (
              <>
                <span className="font-semibold text-[#1B3D5F]">
                  {leadBadge}
                </span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>{product.productType}</span>
          </div>

          <h3 className="text-lg font-serif font-semibold text-[#1B3D5F] leading-snug group-hover:text-[#28537D] transition-colors">
            <a
              href={`/products/${product.slug}/`}
              className="hover:underline focus-visible:outline-2 focus-visible:outline-[#28537D]"
            >
              {product.title}
            </a>
          </h3>

          <p className="text-xs font-medium text-[#28537D] line-clamp-2">
            {product.subtitle}
          </p>

          {/* Grounded Match Explanation Box */}
          <div
            className={`p-3 rounded-2xl text-xs leading-relaxed ${
              hasActiveCriteria
                ? 'bg-[#E8F8F0] text-[#1B3D5F]'
                : 'bg-[#FAF7F2] text-[#28537D]'
            }`}
          >
            <strong className="font-semibold text-[#1B3D5F]">
              {hasActiveCriteria ? 'Why it matched: ' : 'Why give it: '}
            </strong>
            <span>
              {hasActiveCriteria ? matchExplanation : product.whyToGiveIt}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Metadata & Save-to-List / Canonical Links */}
      <div className="px-1 pt-3 mt-3 border-t border-[#1B3D5F]/10 space-y-2.5 text-xs">
        <div className="text-[#28537D] truncate">
          <span>For: {recipientNames.join(', ')}</span>
          {product.interests?.[0] && (
            <>
              <span aria-hidden="true"> · </span>
              <span>{product.interests[0]}</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          {giftLists.length > 1 ? (
            <select
              aria-label={`Save ${product.title} to a specific gift list`}
              value=""
              onChange={(e) => {
                const listId = e.target.value;
                if (!listId) return;
                onAddProductToList(product.id, listId);
                const listObj = giftLists.find((l) => l.id === listId);
                setJustAddedToListName(listObj?.name ?? 'List');
                setTimeout(() => setJustAddedToListName(null), 2000);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-[#F3ECE1] text-[#1B3D5F] text-[11px] font-semibold cursor-pointer max-w-[155px] truncate"
            >
              <option value="">
                {justAddedToListName
                  ? `Saved to ${justAddedToListName}!`
                  : isSaved
                    ? '+ Save to another list'
                    : '+ Save to list...'}
              </option>
              {giftLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              onClick={() => onToggleSave(product.id)}
              aria-pressed={isSaved}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 transition-colors ${
                isSaved
                  ? 'bg-[#F2846B]/15 text-[#1B3D5F]'
                  : 'bg-[#F3ECE1] text-[#1B3D5F] hover:bg-[#E8F8F0]'
              }`}
            >
              <Bookmark className="w-3 h-3" />
              <span>{isSaved ? 'Saved' : 'Save to List'}</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => dispatchOpenProductModal(product)}
              className="text-[11px] font-semibold text-[#28537D] hover:text-[#1B3D5F] underline"
            >
              Quick view
            </button>
            <a
              href={`/products/${product.slug}/`}
              className="inline-flex items-center gap-1 font-semibold text-[#1B3D5F] hover:text-[#28537D]"
            >
              <span>Details</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
};
