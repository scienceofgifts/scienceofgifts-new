import {
  GiftFinderFilters,
  GuidedQuizAnswers,
  OCCASION_LABELS,
  PERSONALITY_LABELS,
  RECIPIENT_LABELS,
} from './giftFinderEngine';

export type GiftThinkingActionType = 'search' | 'quiz' | 'filter' | 'sort';

export interface ThinkingDurationSpec {
  minMs: number;
  maxMs: number;
  defaultMs: number;
}

export const THINKING_DURATION_SPECS: Record<
  GiftThinkingActionType,
  ThinkingDurationSpec
> = {
  search: {
    minMs: 1200,
    maxMs: 1800,
    defaultMs: 1400,
  },
  quiz: {
    minMs: 1800,
    maxMs: 2500,
    defaultMs: 2100,
  },
  filter: {
    minMs: 300,
    maxMs: 500,
    defaultMs: 380,
  },
  sort: {
    minMs: 250,
    maxMs: 400,
    defaultMs: 300,
  },
};

export interface ThinkingContextChip {
  id: string;
  label: string;
  value: string;
}

export interface ThinkingStatusDescriptor {
  actionType: GiftThinkingActionType;
  targetDurationMs: number;
  primaryMessage: string;
  secondaryMessage: string;
  headline: string;
  subheadline: string;
  submittedQuery?: string;
  actionLabel?: string;
  contextChips: ThinkingContextChip[];
}

export interface BuildThinkingDescriptorInput {
  actionType: GiftThinkingActionType;
  filters: GiftFinderFilters;
  quizAnswers?: GuidedQuizAnswers;
  actionLabel?: string;
  customDurationMs?: number;
}

const SORT_LABELS: Record<GiftFinderFilters['sort'], string> = {
  relevance: 'Best Match',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
};

/**
 * Clamps or returns the configured minimum visible duration for a given action type.
 */
export function getTargetThinkingDurationMs(
  actionType: GiftThinkingActionType,
  customDurationMs?: number
): number {
  const spec = THINKING_DURATION_SPECS[actionType];
  if (typeof customDurationMs === 'number' && Number.isFinite(customDurationMs)) {
    return Math.min(spec.maxMs, Math.max(spec.minMs, Math.round(customDurationMs)));
  }
  return spec.defaultMs;
}

/**
 * Computes how much additional wait time is required after accounting for
 * the actual computation duration so the animation remains visible for at least
 * the configured target duration.
 */
export function computeRemainingThinkingDelay(
  actionType: GiftThinkingActionType,
  elapsedComputationMs: number,
  customDurationMs?: number
): number {
  const targetMs = getTargetThinkingDurationMs(actionType, customDurationMs);
  const safeElapsed = Math.max(0, Math.round(elapsedComputationMs || 0));
  return Math.max(0, targetMs - safeElapsed);
}

/**
 * Builds human-friendly editorial status copy and visual gift-tag descriptors
 * for the current discovery action. Never claims AI processing or fake progress percentages.
 */
export function buildThinkingStatusDescriptor(
  input: BuildThinkingDescriptorInput
): ThinkingStatusDescriptor {
  const { actionType, filters, quizAnswers, actionLabel, customDurationMs } = input;
  const targetDurationMs = getTargetThinkingDurationMs(actionType, customDurationMs);
  const trimmedQuery = filters.query.trim();

  if (actionType === 'search') {
    const contextChips: ThinkingContextChip[] = [];
    if (trimmedQuery) {
      contextChips.push({
        id: 'search-query',
        label: 'Search',
        value: `“${trimmedQuery}”`,
      });
    }
    if (filters.recipient !== 'all') {
      contextChips.push({
        id: 'recipient',
        label: 'Recipient',
        value: RECIPIENT_LABELS[filters.recipient] || filters.recipient,
      });
    }
    if (filters.occasion !== 'all') {
      contextChips.push({
        id: 'occasion',
        label: 'Occasion',
        value: OCCASION_LABELS[filters.occasion] || filters.occasion,
      });
    }
    if (filters.maxPrice !== null) {
      contextChips.push({
        id: 'budget',
        label: 'Budget Cap',
        value: `Under $${filters.maxPrice}`,
      });
    }
    if (filters.category !== 'all') {
      contextChips.push({
        id: 'category',
        label: 'Category',
        value: filters.category,
      });
    }

    const primaryMessage = trimmedQuery
      ? `Finding gifts that fit “${trimmedQuery}”…`
      : 'Refreshing the verified gift catalog…';
    const secondaryMessage = trimmedQuery
      ? 'Matching recipient cues, budget bounds, and editor-tested picks…'
      : 'Sorting editor-tested recommendations by relevance…';

    return {
      actionType: 'search',
      targetDurationMs,
      primaryMessage,
      secondaryMessage,
      headline: trimmedQuery
        ? `Matching ideas to “${trimmedQuery}”`
        : 'Preparing the full gift collection',
      subheadline:
        'Checking recipient fit, occasion context, and hard budget caps across verified picks.',
      submittedQuery: trimmedQuery || undefined,
      actionLabel,
      contextChips,
    };
  }

  if (actionType === 'quiz') {
    const chips: ThinkingContextChip[] = [];
    const recipientVal =
      quizAnswers && quizAnswers.recipient !== 'all'
        ? quizAnswers.recipient
        : filters.recipient !== 'all'
          ? filters.recipient
          : null;
    const interestVal =
      quizAnswers && quizAnswers.interest !== 'all'
        ? quizAnswers.interest
        : filters.interest !== 'all'
          ? filters.interest
          : null;
    const occasionVal =
      quizAnswers && quizAnswers.occasion !== 'all'
        ? quizAnswers.occasion
        : filters.occasion !== 'all'
          ? filters.occasion
          : null;
    const maxPriceVal =
      quizAnswers?.maxPrice !== undefined ? quizAnswers.maxPrice : filters.maxPrice;
    const traitVal =
      quizAnswers && quizAnswers.personalityTrait !== 'all'
        ? quizAnswers.personalityTrait
        : filters.personalityTrait !== 'all'
          ? filters.personalityTrait
          : null;

    if (recipientVal) {
      chips.push({
        id: 'quiz-recipient',
        label: 'Recipient',
        value: RECIPIENT_LABELS[recipientVal] || recipientVal,
      });
    }
    if (interestVal) {
      chips.push({
        id: 'quiz-interest',
        label: 'Interest',
        value: interestVal,
      });
    }
    if (occasionVal) {
      chips.push({
        id: 'quiz-occasion',
        label: 'Occasion',
        value: OCCASION_LABELS[occasionVal] || occasionVal,
      });
    }
    if (maxPriceVal !== null && maxPriceVal !== undefined) {
      chips.push({
        id: 'quiz-budget',
        label: 'Budget',
        value: `≤ $${maxPriceVal} USD`,
      });
    } else {
      chips.push({
        id: 'quiz-budget',
        label: 'Budget',
        value: 'Any Price',
      });
    }
    if (traitVal) {
      chips.push({
        id: 'quiz-style',
        label: 'Gift Style',
        value: PERSONALITY_LABELS[traitVal] || traitVal,
      });
    }

    const recipientLabel = recipientVal
      ? (RECIPIENT_LABELS[recipientVal] || recipientVal).toLowerCase()
      : 'your recipient';

    return {
      actionType: 'quiz',
      targetDurationMs,
      primaryMessage: `Matching gift ideas for ${recipientLabel}…`,
      secondaryMessage:
        'Cross-checking interests, occasion tone, and strict price limits…',
      headline: 'Curating Your Tailored Gift Shortlist',
      subheadline:
        'Comparing your 5-step profile against editor-tested rituals, keepsakes, and heirloom objects.',
      actionLabel,
      contextChips: chips,
    };
  }

  if (actionType === 'sort') {
    const sortName = actionLabel || SORT_LABELS[filters.sort] || 'Best Match';
    return {
      actionType: 'sort',
      targetDurationMs,
      primaryMessage: `Reordering gifts by ${sortName}…`,
      secondaryMessage: `Presenting gifts ordered by ${sortName}…`,
      headline: `Sorting by ${sortName}`,
      subheadline: 'Preserving your active search and filter criteria.',
      actionLabel: sortName,
      contextChips: [],
    };
  }

  // Default: 'filter'
  const filterSummary = actionLabel
    ? `Updating gift selection (${actionLabel})…`
    : 'Updating gift selection…';

  const filterChips: ThinkingContextChip[] = [];
  if (filters.category !== 'all') {
    filterChips.push({
      id: 'filter-category',
      label: 'Category',
      value: filters.category,
    });
  }
  if (filters.recipient !== 'all') {
    filterChips.push({
      id: 'filter-recipient',
      label: 'For',
      value: RECIPIENT_LABELS[filters.recipient] || filters.recipient,
    });
  }
  if (filters.maxPrice !== null) {
    filterChips.push({
      id: 'filter-budget',
      label: 'Budget',
      value: `≤ $${filters.maxPrice}`,
    });
  }

  return {
    actionType: 'filter',
    targetDurationMs,
    primaryMessage: filterSummary,
    secondaryMessage: 'Refining matches across your active criteria…',
    headline: 'Updating Gift Selection',
    subheadline: 'Filtering catalog matches while keeping your search context intact.',
    actionLabel,
    contextChips: filterChips,
  };
}

export interface ActiveThinkingOperationState<TResult> {
  operationId: number;
  actionType: GiftThinkingActionType;
  phase: 1 | 2;
  statusMessage: string;
  descriptor: ThinkingStatusDescriptor;
  startedAtMs: number;
  remainingDelayMs: number;
  pendingResult: TResult;
}

export interface ThinkingCoordinatorEnv {
  now?: () => number;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface RunThinkingOperationInput<TResult> {
  actionType: GiftThinkingActionType;
  filters: GiftFinderFilters;
  quizAnswers?: GuidedQuizAnswers;
  actionLabel?: string;
  customDurationMs?: number;
  computeResult: () => TResult;
  onStart?: (state: ActiveThinkingOperationState<TResult>) => void;
  onPhaseChange?: (state: ActiveThinkingOperationState<TResult>) => void;
  onComplete: (
    result: TResult,
    state: ActiveThinkingOperationState<TResult>
  ) => void;
}

/**
 * Deterministic coordinator for gift-finder thinking transitions.
 * - Ensures every action stays visible for at least its minimum duration (accounting for compute time).
 * - Immediately cancels prior pending timers when a newer action starts.
 * - Guarantees stale operations never overwrite newer results or leave dangling timers.
 */
export function createThinkingCoordinator(env: ThinkingCoordinatorEnv = {}) {
  const nowFn = env.now ?? (() => Date.now());
  const setTimerFn =
    env.setTimer ?? ((cb: () => void, ms: number) => setTimeout(cb, ms));
  const clearTimerFn =
    env.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let latestOperationId = 0;
  let disposed = false;
  let phaseTimerHandle: unknown = null;
  let completeTimerHandle: unknown = null;
  let currentActiveState: ActiveThinkingOperationState<any> | null = null;

  function clearPendingTimers() {
    if (phaseTimerHandle !== null) {
      clearTimerFn(phaseTimerHandle);
      phaseTimerHandle = null;
    }
    if (completeTimerHandle !== null) {
      clearTimerFn(completeTimerHandle);
      completeTimerHandle = null;
    }
  }

  function startOperation<TResult>(
    input: RunThinkingOperationInput<TResult>
  ): number {
    if (disposed) {
      return latestOperationId;
    }

    // Cancel any in-flight timers from earlier operations so stale transitions cannot fire
    clearPendingTimers();

    const operationId = ++latestOperationId;
    const startedAtMs = nowFn();
    const pendingResult = input.computeResult();
    const afterComputeMs = nowFn();
    const elapsedComputationMs = Math.max(0, afterComputeMs - startedAtMs);

    const descriptor = buildThinkingStatusDescriptor({
      actionType: input.actionType,
      filters: input.filters,
      quizAnswers: input.quizAnswers,
      actionLabel: input.actionLabel,
      customDurationMs: input.customDurationMs,
    });

    const remainingDelayMs = computeRemainingThinkingDelay(
      input.actionType,
      elapsedComputationMs,
      input.customDurationMs
    );

    const initialState: ActiveThinkingOperationState<TResult> = {
      operationId,
      actionType: input.actionType,
      phase: 1,
      statusMessage: descriptor.primaryMessage,
      descriptor,
      startedAtMs,
      remainingDelayMs,
      pendingResult,
    };

    currentActiveState = initialState;
    input.onStart?.(initialState);

    // For longer transitions ('search' and 'quiz'), advance to the second editorial message halfway through
    if (
      (input.actionType === 'search' || input.actionType === 'quiz') &&
      remainingDelayMs >= 600
    ) {
      const phaseSwitchDelay = Math.round(remainingDelayMs * 0.48);
      phaseTimerHandle = setTimerFn(() => {
        if (disposed || operationId !== latestOperationId) {
          return;
        }
        const phaseTwoState: ActiveThinkingOperationState<TResult> = {
          ...initialState,
          phase: 2,
          statusMessage: descriptor.secondaryMessage,
        };
        currentActiveState = phaseTwoState;
        input.onPhaseChange?.(phaseTwoState);
      }, phaseSwitchDelay);
    }

    completeTimerHandle = setTimerFn(() => {
      if (disposed || operationId !== latestOperationId) {
        return;
      }
      const finalState = currentActiveState ?? initialState;
      currentActiveState = null;
      phaseTimerHandle = null;
      completeTimerHandle = null;
      input.onComplete(pendingResult, finalState);
    }, remainingDelayMs);

    return operationId;
  }

  function cancelActiveOperation() {
    latestOperationId++;
    clearPendingTimers();
    currentActiveState = null;
  }

  function dispose() {
    disposed = true;
    clearPendingTimers();
    currentActiveState = null;
  }

  function getActiveState() {
    return currentActiveState;
  }

  function getLatestOperationId() {
    return latestOperationId;
  }

  return {
    startOperation,
    cancelActiveOperation,
    dispose,
    getActiveState,
    getActiveStateOrNull: getActiveState,
    getLatestOperationId,
  };
}
