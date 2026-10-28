import {
  Article,
  BudgetTier,
  GiftGuide,
  OccasionType,
  PersonalityTrait,
  Product,
  RecipientType,
} from '../types/content';

export type FinderSortOption = 'relevance' | 'price-asc' | 'price-desc';

export interface GiftFinderFilters {
  query: string;
  recipient: RecipientType | 'all';
  occasion: OccasionType | 'all';
  personalityTrait: PersonalityTrait | 'all';
  category: string | 'all';
  interest: string | 'all';
  budgetTier: BudgetTier | 'all';
  maxPrice: number | null;
  minPrice: number | null;
  editorialOnly: boolean;
  sort: FinderSortOption;
}

export const DEFAULT_FINDER_FILTERS: GiftFinderFilters = {
  query: '',
  recipient: 'all',
  occasion: 'all',
  personalityTrait: 'all',
  category: 'all',
  interest: 'all',
  budgetTier: 'all',
  maxPrice: null,
  minPrice: null,
  editorialOnly: false,
  sort: 'relevance',
};

export interface ParsedGiftQuery {
  rawQuery: string;
  normalizedQuery: string;
  tokens: string[];
  meaningfulTokens: string[];
  topicTokens: string[];
  inferredRecipients: RecipientType[];
  inferredOccasions: OccasionType[];
  inferredPersonalityTraits: PersonalityTrait[];
  inferredInterests: string[];
  inferredCategories: string[];
  parsedMaxPrice: number | null;
  parsedMinPrice: number | null;
  hasExplicitBudgetConstraint: boolean;
  budgetPhrase: string | null;
}

export interface MatchedSignal {
  type:
    | 'recipient'
    | 'interest'
    | 'occasion'
    | 'budget'
    | 'category'
    | 'style'
    | 'keyword'
    | 'editorial';
  label: string;
  detail: string;
  points: number;
}

export interface RankedGiftResult {
  product: Product;
  score: number;
  matchedSignals: MatchedSignal[];
  matchExplanation: string;
  editorialBadges: string[];
  hasValidPrice: boolean;
}

export interface FacetOptionCount<T extends string = string> {
  value: T;
  label: string;
  count: number;
}

export interface FinderFacetCounts {
  recipients: FacetOptionCount<RecipientType>[];
  occasions: FacetOptionCount<OccasionType>[];
  personalityTraits: FacetOptionCount<PersonalityTrait>[];
  categories: FacetOptionCount<string>[];
  interests: FacetOptionCount<string>[];
  budgetTiers: FacetOptionCount<BudgetTier>[];
  editorialPickCount: number;
}

export interface FinderRefinementSuggestion {
  id: string;
  label: string;
  reason: string;
  resultCount: number;
  patch: Partial<GiftFinderFilters>;
}

export interface GiftFinderEvaluationResult {
  results: RankedGiftResult[];
  totalEligibleCount: number;
  parsedQuery: ParsedGiftQuery;
  effectiveMaxPrice: number | null;
  effectiveMinPrice: number | null;
  hasActiveCriteria: boolean;
  facets: FinderFacetCounts;
  suggestions: FinderRefinementSuggestion[];
}

export const RECIPIENT_LABELS: Record<RecipientType, string> = {
  parent: 'Parents & In-Laws',
  partner: 'Partner or Spouse',
  friend: 'Close Friend',
  host: 'Dinner Host',
  kids: 'Kids & Family',
  coworker: 'Coworker & Colleague',
};

export const OCCASION_LABELS: Record<OccasionType, string> = {
  birthday: 'Birthday',
  housewarming: 'Housewarming',
  anniversary: 'Anniversary',
  'thank-you': 'Thank You & Host',
  holidays: 'Holidays',
  'just-because': 'Just Because',
};

export const PERSONALITY_LABELS: Record<PersonalityTrait, string> = {
  'everyday-ritual': 'Practical & Everyday Rituals',
  'foodie-host': 'Cooking, Hosting & Flavors',
  'cozy-homebody': 'Cozy Sanctuary & Slow Mornings',
  'curious-creative': 'Creative, Unusual & Hands-On',
  'outdoors-nature': 'Plants, Gardens & Nature',
  'nostalgic-sentimental': 'Sentimental & Personal Keepsakes',
};

export const BUDGET_TIER_LABELS: Record<BudgetTier, string> = {
  'under-25': 'Under $25',
  '25-to-75': '$25 – $75',
  'over-75': 'Over $75',
  'under-50': 'Under $50',
  '50-to-100': '$50 – $100',
  '100-plus': '$100+',
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'any',
  'are',
  'as',
  'at',
  'be',
  'best',
  'by',
  'can',
  'do',
  'does',
  'find',
  'for',
  'from',
  'get',
  'gift',
  'gifting',
  'gifts',
  'give',
  'giving',
  'good',
  'great',
  'have',
  'he',
  'her',
  'him',
  'his',
  'i',
  'idea',
  'ideas',
  'in',
  'into',
  'is',
  'it',
  'just',
  'like',
  'likes',
  'looking',
  'love',
  'loves',
  'make',
  'me',
  'my',
  'need',
  'nice',
  'of',
  'on',
  'or',
  'our',
  'people',
  'person',
  'present',
  'presents',
  'really',
  'recommendation',
  'recommendations',
  'she',
  'some',
  'someone',
  'something',
  'that',
  'the',
  'their',
  'them',
  'they',
  'thing',
  'things',
  'thoughtful',
  'to',
  'very',
  'want',
  'what',
  'who',
  'with',
  'would',
  'you',
  'your',
]);

const BUDGET_STRUCTURAL_WORDS = new Set([
  'under',
  'below',
  'less',
  'than',
  'max',
  'maximum',
  'up',
  'over',
  'above',
  'more',
  'minimum',
  'min',
  'between',
  'around',
  'about',
  'within',
  'budget',
  'price',
  'priced',
  'dollar',
  'dollars',
  'usd',
  'bucks',
]);

interface SynonymRule<T> {
  target: T;
  phrases: string[];
  tokens: string[];
}

const RECIPIENT_SYNONYMS: SynonymRule<RecipientType>[] = [
  {
    target: 'parent',
    phrases: ['mother in law', 'father in law', 'in laws', 'in law', 'new parents'],
    tokens: [
      'mom',
      'mother',
      'mum',
      'mama',
      'dad',
      'father',
      'papa',
      'parent',
      'parents',
      'grandma',
      'grandmother',
      'grandpa',
      'grandfather',
      'grandparent',
      'grandparents',
      'nana',
      'inlaw',
      'inlaws',
    ],
  },
  {
    target: 'partner',
    phrases: ['significant other', 'better half'],
    tokens: [
      'partner',
      'partners',
      'spouse',
      'wife',
      'husband',
      'boyfriend',
      'girlfriend',
      'fiance',
      'fiancee',
      'couple',
      'couples',
      'newlywed',
      'newlyweds',
    ],
  },
  {
    target: 'friend',
    phrases: ['best friend', 'close friend', 'college friend'],
    tokens: [
      'friend',
      'friends',
      'bestie',
      'pal',
      'roommate',
      'sister',
      'brother',
      'sibling',
      'siblings',
      'bridesmaid',
    ],
  },
  {
    target: 'host',
    phrases: ['dinner host', 'party host', 'house guest', 'weekend host'],
    tokens: [
      'host',
      'hosts',
      'hostess',
      'houseguest',
      'neighbor',
      'neighbors',
      'neighbour',
    ],
  },
  {
    target: 'kids',
    phrases: ['young kids', 'curious kids'],
    tokens: [
      'kid',
      'kids',
      'child',
      'children',
      'son',
      'daughter',
      'niece',
      'nephew',
      'youth',
    ],
  },
  {
    target: 'coworker',
    phrases: ['work friend', 'secret santa', 'office gift'],
    tokens: [
      'coworker',
      'coworkers',
      'colleague',
      'colleagues',
      'boss',
      'manager',
      'teammate',
      'teacher',
      'teachers',
      'mentor',
      'client',
      'office',
      'workplace',
    ],
  },
];

const OCCASION_SYNONYMS: SynonymRule<OccasionType>[] = [
  {
    target: 'birthday',
    phrases: ['birthday gift', 'milestone birthday'],
    tokens: ['birthday', 'birthdays', 'bday'],
  },
  {
    target: 'housewarming',
    phrases: ['new home', 'new apartment', 'new house', 'first home', 'moving in'],
    tokens: ['housewarming', 'homeowner', 'homeowners', 'apartment'],
  },
  {
    target: 'anniversary',
    phrases: ['wedding anniversary', 'wedding gift'],
    tokens: ['anniversary', 'anniversaries', 'wedding', 'engagement', 'milestone'],
  },
  {
    target: 'thank-you',
    phrases: ['thank you', 'thanks for hosting', 'appreciation gift'],
    tokens: ['thank', 'thanks', 'gratitude', 'appreciation', 'grateful'],
  },
  {
    target: 'holidays',
    phrases: ['secret santa', 'stocking stuffer', 'holiday party'],
    tokens: [
      'holiday',
      'holidays',
      'christmas',
      'winter',
      'hanukkah',
      'festive',
      'seasonal',
      'stocking',
    ],
  },
  {
    target: 'just-because',
    phrases: ['just because', 'thinking of you', 'no occasion'],
    tokens: ['surprise', 'anytime'],
  },
];

const PERSONALITY_SYNONYMS: SynonymRule<PersonalityTrait>[] = [
  {
    target: 'everyday-ritual',
    phrases: ['everyday ritual', 'daily ritual', 'morning routine', 'slow morning'],
    tokens: [
      'practical',
      'useful',
      'everyday',
      'daily',
      'ritual',
      'rituals',
      'routine',
      'routines',
      'functional',
      'utility',
      'minimalist',
      'upgrade',
      'habit',
    ],
  },
  {
    target: 'foodie-host',
    phrases: ['dinner party', 'home cook', 'cheese board', 'artisan food'],
    tokens: [
      'foodie',
      'cook',
      'cooking',
      'cooks',
      'baker',
      'baking',
      'bakers',
      'kitchen',
      'culinary',
      'gourmet',
      'edible',
      'consumable',
      'pantry',
      'flavor',
      'flavors',
      'sourdough',
      'entertaining',
    ],
  },
  {
    target: 'cozy-homebody',
    phrases: ['cozy homebody', 'slow sunday', 'rainy day'],
    tokens: [
      'cozy',
      'homebody',
      'comfort',
      'relax',
      'relaxing',
      'relaxation',
      'warm',
      'hygge',
      'sanctuary',
      'lounge',
      'lounging',
      'robe',
      'blanket',
      'throw',
      'bedside',
      'sleep',
    ],
  },
  {
    target: 'curious-creative',
    phrases: ['board game', 'hands on', 'game night', 'screen free'],
    tokens: [
      'creative',
      'curious',
      'art',
      'artist',
      'artistic',
      'craft',
      'crafts',
      'crafting',
      'diy',
      'maker',
      'unusual',
      'unique',
      'interesting',
      'game',
      'games',
      'backgammon',
      'cyanotype',
    ],
  },
  {
    target: 'outdoors-nature',
    phrases: ['plant lover', 'green thumb', 'herb garden'],
    tokens: [
      'plant',
      'plants',
      'garden',
      'gardening',
      'gardener',
      'herb',
      'herbs',
      'nature',
      'outdoor',
      'outdoors',
      'botanical',
      'flower',
      'flowers',
      'terracotta',
      'windowsill',
      'sunlight',
    ],
  },
  {
    target: 'nostalgic-sentimental',
    phrases: ['one line a day', 'star map', 'night sky', 'family recipe'],
    tokens: [
      'sentimental',
      'nostalgic',
      'nostalgia',
      'memory',
      'memories',
      'personal',
      'personalized',
      'custom',
      'keepsake',
      'keepsakes',
      'heirloom',
      'meaningful',
      'journal',
      'journaling',
      'diary',
      'constellation',
    ],
  },
];

const INTEREST_AND_CATEGORY_MAPPINGS: Array<{
  keywords: string[];
  interests: string[];
  categories: string[];
}> = [
  {
    keywords: ['tea', 'matcha', 'whisk', 'chawan', 'coffee', 'caffeine', 'mug', 'cup', 'teapot'],
    interests: ['Coffee & Tea', 'Mindful Routines', 'Ceramics', 'Everyday Rituals'],
    categories: ['Coffee & Tea Rituals', 'Artisan Food & Pantry'],
  },
  {
    keywords: ['plant', 'plants', 'herb', 'herbs', 'garden', 'gardening', 'gardener', 'basil', 'terracotta', 'windowsill', 'pot', 'planter'],
    interests: ['Gardening', 'Nature & Outdoors', 'Home Decor'],
    categories: ['Plants & Gardening'],
  },
  {
    keywords: ['cook', 'cooking', 'bake', 'baking', 'baker', 'sourdough', 'bread', 'butter', 'crock', 'kitchen', 'toast'],
    interests: ['Sourdough & Baking', 'Cooking & Baking', 'Kitchen Upgrades', 'Cooking & Hosting'],
    categories: ['Kitchen & Tabletop', 'Stationery & Kitchen', 'Artisan Food & Pantry'],
  },
  {
    keywords: ['honey', 'chili', 'crisp', 'condiment', 'food', 'edible', 'snack', 'tasting', 'pantry', 'jar'],
    interests: ['Artisan Food', 'Cooking & Hosting', 'Dinner Parties', 'Coffee & Tea'],
    categories: ['Artisan Food & Pantry'],
  },
  {
    keywords: ['candle', 'candles', 'beeswax', 'taper', 'tapers', 'hygge', 'scent', 'aroma', 'lighting'],
    interests: ['Candlelight & Hygge', 'Natural Home', 'Dinner Parties'],
    categories: ['Home & Atmosphere'],
  },
  {
    keywords: ['journal', 'diary', 'notebook', 'book', 'write', 'writing', 'note', 'notes', 'stationery', 'letterpress', 'recipe', 'cards', 'pen'],
    interests: ['Journaling & Reading', 'Handwritten Notes', 'Family Traditions', 'Milestones'],
    categories: ['Books & Stationery', 'Stationery & Kitchen'],
  },
  {
    keywords: ['star', 'stars', 'constellation', 'sky', 'astronomy', 'print', 'frame', 'framed', 'custom', 'personalized'],
    interests: ['Sentimental Keepsakes', 'Astronomy', 'Home Decor'],
    categories: ['Personalized Keepsakes'],
  },
  {
    keywords: ['game', 'games', 'backgammon', 'checkers', 'board', 'tabletop', 'play'],
    interests: ['Board Games', 'Hosting', 'Travel & Outdoors'],
    categories: ['Games & Gatherings'],
  },
  {
    keywords: ['craft', 'art', 'cyanotype', 'sun', 'botanical', 'press', 'kit', 'activity'],
    interests: ['Art & Craft', 'Nature & Outdoors', 'Family Activities'],
    categories: ['Creative Kits & Kids'],
  },
  {
    keywords: ['robe', 'bathrobe', 'waffle', 'towel', 'spa', 'bath', 'lounge', 'selfcare'],
    interests: ['Cozy Sanctuary', 'Slow Mornings', 'Self-Care'],
    categories: ['Cozy Home & Lounge'],
  },
  {
    keywords: ['blanket', 'throw', 'wool', 'merino', 'lambswool', 'reading', 'couch', 'sofa', 'textile'],
    interests: ['Cozy Sanctuary', 'Reading & Relaxation', 'Home Decor'],
    categories: ['Cozy Home & Textiles'],
  },
  {
    keywords: ['carafe', 'glass', 'glassware', 'tumbler', 'water', 'bedside', 'nightstand', 'hydration'],
    interests: ['Everyday Rituals', 'Tabletop & Entertaining', 'Home Decor'],
    categories: ['Tabletop & Glassware'],
  },
];

/**
 * Simple deterministic stemmer/singularizer so "plants" matches "plant", "mothers" matches "mother", etc.
 */
export function stemToken(word: string): string {
  const clean = word.trim().toLowerCase();
  if (clean.length <= 3) return clean;
  if (clean.endsWith('ies') && clean.length > 4) {
    return `${clean.slice(0, -3)}y`;
  }
  if (clean.endsWith('es') && (clean.endsWith('ches') || clean.endsWith('shes') || clean.endsWith('xes') || clean.endsWith('sses'))) {
    return clean.slice(0, -2);
  }
  if (clean.endsWith('s') && !clean.endsWith('ss') && !clean.endsWith('us') && !clean.endsWith('is')) {
    return clean.slice(0, -1);
  }
  return clean;
}

/**
 * Checks whether a product has a verified, finite, positive numeric price.
 * Never treats missing/null/undefined/NaN/0 prices as valid under-budget prices.
 */
export function hasValidNumericPrice(product: Product): boolean {
  const rawPrice = (product as { price?: unknown }).price;
  return (
    typeof rawPrice === 'number' &&
    Number.isFinite(rawPrice) &&
    rawPrice > 0
  );
}

/**
 * Normalizes and parses a natural-language gift query into structured intent signals,
 * explicit budget constraints, and remaining topic tokens.
 */
export function parseNaturalLanguageGiftQuery(rawQuery: string): ParsedGiftQuery {
  const trimmed = (rawQuery ?? '').trim();
  const lower = trimmed.toLowerCase();

  let parsedMaxPrice: number | null = null;
  let parsedMinPrice: number | null = null;
  let budgetPhrase: string | null = null;
  let queryWithoutBudget = lower;

  // 1. Check range pattern first: "between $25 and $75", "$25 to $75", "$25 - $75", "25-75"
  const rangeRegex =
    /\b(?:between\s+|from\s+)?\$?(\d+(?:\.\d{1,2})?)\s*(?:to|and|-|–|—)\s*\$?(\d+(?:\.\d{1,2})?)\b/i;
  const rangeMatch = queryWithoutBudget.match(rangeRegex);
  if (rangeMatch) {
    const first = Number(rangeMatch[1]);
    const second = Number(rangeMatch[2]);
    if (Number.isFinite(first) && Number.isFinite(second) && first >= 0 && second > 0) {
      parsedMinPrice = Math.min(first, second);
      parsedMaxPrice = Math.max(first, second);
      budgetPhrase = `$${parsedMinPrice}–$${parsedMaxPrice}`;
      queryWithoutBudget = queryWithoutBudget.replace(rangeMatch[0], ' ');
    }
  }

  // 2. Check explicit maximum price patterns: "under $50", "below 75", "less than $40", "max $50", "up to $60", "<= $50", "$50 or less", "$50 max"
  if (parsedMaxPrice === null) {
    const maxPrefixRegex =
      /(?:(?:\b(?:under|below|less\s+than|max|maximum|up\s+to|within|at\s+most)\s*)|(?:<=?\s*))\$?(\d+(?:\.\d{1,2})?)\b/i;
    const maxSuffixRegex =
      /\$(\d+(?:\.\d{1,2})?)\s*(?:or\s+less|or\s+under|max|maximum|limit|budget)\b/i;

    const prefixMatch = queryWithoutBudget.match(maxPrefixRegex);
    const suffixMatch = !prefixMatch ? queryWithoutBudget.match(maxSuffixRegex) : null;
    const match = prefixMatch || suffixMatch;

    if (match) {
      const val = Number(match[1]);
      if (Number.isFinite(val) && val > 0) {
        parsedMaxPrice = val;
        budgetPhrase = `Under $${val}`;
        queryWithoutBudget = queryWithoutBudget.replace(match[0], ' ');
      }
    }
  }

  // 3. Check explicit minimum price patterns: "over $75", "above $50", "more than $60", "at least $50", "$75+"
  if (parsedMinPrice === null && parsedMaxPrice === null) {
    const minPrefixRegex =
      /\b(?:over|above|more\s+than|at\s+least|min|minimum)\s*\$?(\d+(?:\.\d{1,2})?)\b/i;
    const minSuffixRegex = /\$?(\d+(?:\.\d{1,2})?)\s*(?:\+|plus|or\s+more)\b/i;
    const match =
      queryWithoutBudget.match(minPrefixRegex) ||
      queryWithoutBudget.match(minSuffixRegex);
    if (match) {
      const val = Number(match[1]);
      if (Number.isFinite(val) && val > 0) {
        parsedMinPrice = val;
        budgetPhrase = `$${val}+`;
        queryWithoutBudget = queryWithoutBudget.replace(match[0], ' ');
      }
    }
  }

  // Normalize remaining text into clean tokens
  const normalizedQuery = queryWithoutBudget
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const rawTokens = normalizedQuery
    .split(/[\s-]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const meaningfulTokens = rawTokens.filter(
    (t) =>
      !STOP_WORDS.has(t) &&
      !STOP_WORDS.has(stemToken(t)) &&
      !BUDGET_STRUCTURAL_WORDS.has(t) &&
      !/^\d+$/.test(t)
  );

  const tokenSet = new Set<string>();
  for (const t of meaningfulTokens) {
    tokenSet.add(t);
    tokenSet.add(stemToken(t));
  }

  const consumedIntentTokens = new Set<string>();

  // Match Recipients
  const inferredRecipients: RecipientType[] = [];
  for (const rule of RECIPIENT_SYNONYMS) {
    let matched = false;
    for (const phrase of rule.phrases) {
      if (normalizedQuery.includes(phrase)) {
        matched = true;
        phrase.split(/\s+/).forEach((w) => {
          consumedIntentTokens.add(w);
          consumedIntentTokens.add(stemToken(w));
        });
      }
    }
    for (const tok of rule.tokens) {
      if (tokenSet.has(tok) || tokenSet.has(stemToken(tok))) {
        matched = true;
        consumedIntentTokens.add(tok);
        consumedIntentTokens.add(stemToken(tok));
      }
    }
    if (matched && !inferredRecipients.includes(rule.target)) {
      inferredRecipients.push(rule.target);
    }
  }

  // Match Occasions
  const inferredOccasions: OccasionType[] = [];
  for (const rule of OCCASION_SYNONYMS) {
    let matched = false;
    for (const phrase of rule.phrases) {
      if (normalizedQuery.includes(phrase)) {
        matched = true;
        phrase.split(/\s+/).forEach((w) => {
          consumedIntentTokens.add(w);
          consumedIntentTokens.add(stemToken(w));
        });
      }
    }
    for (const tok of rule.tokens) {
      if (tokenSet.has(tok) || tokenSet.has(stemToken(tok))) {
        matched = true;
        consumedIntentTokens.add(tok);
        consumedIntentTokens.add(stemToken(tok));
      }
    }
    if (matched && !inferredOccasions.includes(rule.target)) {
      inferredOccasions.push(rule.target);
    }
  }

  // Match Personality / Gift Styles
  const inferredPersonalityTraits: PersonalityTrait[] = [];
  for (const rule of PERSONALITY_SYNONYMS) {
    let matched = false;
    for (const phrase of rule.phrases) {
      if (normalizedQuery.includes(phrase)) {
        matched = true;
      }
    }
    for (const tok of rule.tokens) {
      if (tokenSet.has(tok) || tokenSet.has(stemToken(tok))) {
        matched = true;
      }
    }
    if (matched && !inferredPersonalityTraits.includes(rule.target)) {
      inferredPersonalityTraits.push(rule.target);
    }
  }

  // Match Interests & Categories
  const inferredInterests: string[] = [];
  const inferredCategories: string[] = [];
  for (const mapping of INTEREST_AND_CATEGORY_MAPPINGS) {
    const hasKeyword = mapping.keywords.some(
      (kw) => tokenSet.has(kw) || tokenSet.has(stemToken(kw))
    );
    if (hasKeyword) {
      for (const interest of mapping.interests) {
        if (!inferredInterests.includes(interest)) {
          inferredInterests.push(interest);
        }
      }
      for (const cat of mapping.categories) {
        if (!inferredCategories.includes(cat)) {
          inferredCategories.push(cat);
        }
      }
    }
  }

  // Topic tokens are meaningful tokens that are NOT purely recipient/occasion labels
  const topicTokens = meaningfulTokens.filter(
    (t) => !consumedIntentTokens.has(t) && !consumedIntentTokens.has(stemToken(t))
  );

  return {
    rawQuery: trimmed,
    normalizedQuery,
    tokens: rawTokens,
    meaningfulTokens,
    topicTokens,
    inferredRecipients,
    inferredOccasions,
    inferredPersonalityTraits,
    inferredInterests,
    inferredCategories,
    parsedMaxPrice,
    parsedMinPrice,
    hasExplicitBudgetConstraint: parsedMaxPrice !== null || parsedMinPrice !== null,
    budgetPhrase,
  };
}

/**
 * Resolves the effective numeric min/max price bounds from explicit filter state + parsed natural-language query.
 */
export function resolveEffectivePriceBounds(
  filters: GiftFinderFilters,
  parsedQuery: ParsedGiftQuery
): { effectiveMaxPrice: number | null; effectiveMinPrice: number | null } {
  let maxFromTier: number | null = null;
  let minFromTier: number | null = null;

  switch (filters.budgetTier) {
    case 'under-25':
      maxFromTier = 25;
      break;
    case '25-to-75':
      minFromTier = 25;
      maxFromTier = 75;
      break;
    case 'over-75':
      minFromTier = 75;
      break;
    case 'under-50':
      maxFromTier = 50;
      break;
    case '50-to-100':
      minFromTier = 50;
      maxFromTier = 100;
      break;
    case '100-plus':
      minFromTier = 100;
      break;
    default:
      break;
  }

  const maxCandidates = [
    filters.maxPrice,
    maxFromTier,
    parsedQuery.parsedMaxPrice,
  ].filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);

  const minCandidates = [
    filters.minPrice,
    minFromTier,
    parsedQuery.parsedMinPrice,
  ].filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0);

  const effectiveMaxPrice =
    maxCandidates.length > 0 ? Math.min(...maxCandidates) : null;
  const effectiveMinPrice =
    minCandidates.length > 0 ? Math.max(...minCandidates) : null;

  return { effectiveMaxPrice, effectiveMinPrice };
}

export interface EditorialProductContext {
  guideBadges: string[];
  guideEditorialNotes: string[];
  isEditorsPick: boolean;
  isQuickPick: boolean;
  featuredInGuideTitles: string[];
  featuredInArticleTitles: string[];
}

export function buildEditorialContextMap(
  guides: GiftGuide[] = [],
  articles: Article[] = []
): Record<string, EditorialProductContext> {
  const map: Record<string, EditorialProductContext> = {};

  const ensure = (productId: string): EditorialProductContext => {
    if (!map[productId]) {
      map[productId] = {
        guideBadges: [],
        guideEditorialNotes: [],
        isEditorsPick: false,
        isQuickPick: false,
        featuredInGuideTitles: [],
        featuredInArticleTitles: [],
      };
    }
    return map[productId];
  };

  for (const guide of guides) {
    if (guide.editorsPick?.productId) {
      const ctx = ensure(guide.editorsPick.productId);
      ctx.isEditorsPick = true;
      if (!ctx.guideBadges.includes(guide.editorsPick.kicker)) {
        ctx.guideBadges.push(guide.editorsPick.kicker);
      }
      if (guide.editorsPick.editorialRationale) {
        ctx.guideEditorialNotes.push(guide.editorsPick.editorialRationale);
      }
      if (!ctx.featuredInGuideTitles.includes(guide.title)) {
        ctx.featuredInGuideTitles.push(guide.title);
      }
    }

    for (const qp of guide.quickPicks ?? []) {
      const ctx = ensure(qp.productId);
      ctx.isQuickPick = true;
      if (qp.label && !ctx.guideBadges.includes(qp.label)) {
        ctx.guideBadges.push(qp.label);
      }
      if (qp.reason) {
        ctx.guideEditorialNotes.push(qp.reason);
      }
      if (!ctx.featuredInGuideTitles.includes(guide.title)) {
        ctx.featuredInGuideTitles.push(guide.title);
      }
    }

    for (const sec of guide.sections ?? []) {
      for (const rec of sec.recommendations ?? []) {
        const ctx = ensure(rec.productId);
        if (rec.awardLabel && !ctx.guideBadges.includes(rec.awardLabel)) {
          ctx.guideBadges.push(rec.awardLabel);
        }
        if (rec.customEditorialNote) {
          ctx.guideEditorialNotes.push(rec.customEditorialNote);
        }
        if (rec.idealFor) {
          ctx.guideEditorialNotes.push(rec.idealFor);
        }
        if (!ctx.featuredInGuideTitles.includes(guide.title)) {
          ctx.featuredInGuideTitles.push(guide.title);
        }
      }
    }
  }

  for (const article of articles) {
    for (const sec of article.sections ?? []) {
      const pids = [
        ...(sec.contextualProducts?.productIds ?? []),
        ...(sec.recommendedProductIds ?? []),
      ];
      for (const pid of pids) {
        const ctx = ensure(pid);
        if (!ctx.featuredInArticleTitles.includes(article.title)) {
          ctx.featuredInArticleTitles.push(article.title);
        }
      }
    }
  }

  return map;
}

/**
 * Checks whether a product passes all hard facet & budget eligibility constraints.
 */
export function passesHardEligibilityConstraints(
  product: Product,
  filters: GiftFinderFilters,
  effectiveMaxPrice: number | null,
  effectiveMinPrice: number | null,
  editorialCtx?: EditorialProductContext,
  ignoreFacet?: keyof GiftFinderFilters
): boolean {
  const validPrice = hasValidNumericPrice(product);

  // 1. Hard Budget / Price Constraints:
  // If any budget constraint is active, products with missing/invalid prices MUST be excluded,
  // and products outside the bounds MUST be excluded.
  const hasPriceConstraint =
    effectiveMaxPrice !== null ||
    effectiveMinPrice !== null ||
    (ignoreFacet !== 'budgetTier' && filters.budgetTier !== 'all');

  if (hasPriceConstraint) {
    if (!validPrice) {
      return false;
    }
    if (effectiveMaxPrice !== null && product.price > effectiveMaxPrice) {
      return false;
    }
    if (effectiveMinPrice !== null && product.price < effectiveMinPrice) {
      return false;
    }
  }

  // 2. Explicit Recipient Filter
  if (
    ignoreFacet !== 'recipient' &&
    filters.recipient !== 'all' &&
    !(product.recipients ?? []).includes(filters.recipient)
  ) {
    return false;
  }

  // 3. Explicit Occasion Filter
  if (
    ignoreFacet !== 'occasion' &&
    filters.occasion !== 'all' &&
    !(product.occasions ?? []).includes(filters.occasion)
  ) {
    return false;
  }

  // 4. Explicit Personality / Gift Style Filter
  if (
    ignoreFacet !== 'personalityTrait' &&
    filters.personalityTrait !== 'all' &&
    !(product.personalityTraits ?? []).includes(filters.personalityTrait)
  ) {
    return false;
  }

  // 5. Explicit Category (productType) Filter
  if (
    ignoreFacet !== 'category' &&
    filters.category !== 'all' &&
    product.productType !== filters.category
  ) {
    return false;
  }

  // 6. Explicit Interest Tag Filter
  if (
    ignoreFacet !== 'interest' &&
    filters.interest !== 'all' &&
    !(product.interests ?? []).includes(filters.interest)
  ) {
    return false;
  }

  // 7. Editorial Picks Only Filter
  if (ignoreFacet !== 'editorialOnly' && filters.editorialOnly) {
    const isEditorialPick =
      Boolean(editorialCtx?.isEditorsPick) ||
      Boolean(editorialCtx?.isQuickPick) ||
      Boolean(product.calloutTag?.toLowerCase().includes('pick')) ||
      Boolean(product.calloutTag?.toLowerCase().includes('favorite')) ||
      Boolean(product.calloutTag?.toLowerCase().includes('best'));
    if (!isEditorialPick) {
      return false;
    }
  }

  return true;
}

/**
 * Scores a single eligible product against the active filters and parsed natural-language query.
 * Avoids double-counting the same match across signals and returns a structured explanation.
 */
export function scoreProductDeterministically(
  product: Product,
  filters: GiftFinderFilters,
  parsedQuery: ParsedGiftQuery,
  effectiveMaxPrice: number | null,
  effectiveMinPrice: number | null,
  editorialCtx?: EditorialProductContext
): RankedGiftResult {
  const matchedSignals: MatchedSignal[] = [];
  let totalScore = 0;

  const recipients = product.recipients ?? [];
  const occasions = product.occasions ?? [];
  const traits = product.personalityTraits ?? [];
  const interests = product.interests ?? [];
  const validPrice = hasValidNumericPrice(product);

  // 1. RECIPIENT SIGNAL (counted once, max 25 pts)
  const targetRecipients = new Set<RecipientType>();
  if (filters.recipient !== 'all') targetRecipients.add(filters.recipient);
  for (const r of parsedQuery.inferredRecipients) targetRecipients.add(r);

  if (targetRecipients.size > 0) {
    const matchedRecs = Array.from(targetRecipients).filter((r) =>
      recipients.includes(r)
    );
    if (matchedRecs.length > 0) {
      const labels = matchedRecs.map((r) => RECIPIENT_LABELS[r] || r);
      const pts = 25;
      totalScore += pts;
      matchedSignals.push({
        type: 'recipient',
        label: `For ${labels.join(' & ')}`,
        detail: `Suited for ${labels.join(', ').toLowerCase()}`,
        points: pts,
      });
    }
  }

  // 2. INTEREST & HOBBY SIGNAL (counted once, max 30 pts)
  const targetInterests = new Set<string>();
  if (filters.interest !== 'all') targetInterests.add(filters.interest);
  for (const i of parsedQuery.inferredInterests) targetInterests.add(i);

  if (targetInterests.size > 0) {
    const matchedInts = interests.filter((prodInt) =>
      Array.from(targetInterests).some(
        (targetInt) => prodInt.toLowerCase() === targetInt.toLowerCase()
      )
    );
    if (matchedInts.length > 0) {
      const pts = Math.min(30, 22 + (matchedInts.length - 1) * 4);
      totalScore += pts;
      matchedSignals.push({
        type: 'interest',
        label: matchedInts.slice(0, 2).join(' · '),
        detail: `Matches interest in ${matchedInts.slice(0, 2).join(' & ')}`,
        points: pts,
      });
    }
  }

  // 3. PRODUCT CATEGORY SIGNAL (counted once, max 22 pts)
  const targetCategories = new Set<string>();
  if (filters.category !== 'all') targetCategories.add(filters.category);
  for (const c of parsedQuery.inferredCategories) targetCategories.add(c);

  if (
    targetCategories.size > 0 &&
    product.productType &&
    Array.from(targetCategories).some(
      (c) => c.toLowerCase() === product.productType.toLowerCase()
    )
  ) {
    const pts = 22;
    totalScore += pts;
    matchedSignals.push({
      type: 'category',
      label: product.productType,
      detail: `${product.productType} category`,
      points: pts,
    });
  }

  // 4. GIFT STYLE / PERSONALITY SIGNAL (counted once, max 20 pts)
  const targetStyles = new Set<PersonalityTrait>();
  if (filters.personalityTrait !== 'all') {
    targetStyles.add(filters.personalityTrait);
  }
  for (const st of parsedQuery.inferredPersonalityTraits) {
    targetStyles.add(st);
  }

  if (targetStyles.size > 0) {
    const matchedStyles = Array.from(targetStyles).filter((st) =>
      traits.includes(st)
    );
    if (matchedStyles.length > 0) {
      const styleLabels = matchedStyles.map((s) => PERSONALITY_LABELS[s] || s);
      const pts = Math.min(20, 16 + (matchedStyles.length - 1) * 4);
      totalScore += pts;
      matchedSignals.push({
        type: 'style',
        label: styleLabels[0],
        detail: `Fits ${styleLabels[0].toLowerCase()} style`,
        points: pts,
      });
    }
  }

  // 5. OCCASION SIGNAL (counted once, max 18 pts)
  const targetOccasions = new Set<OccasionType>();
  if (filters.occasion !== 'all') targetOccasions.add(filters.occasion);
  for (const occ of parsedQuery.inferredOccasions) targetOccasions.add(occ);

  if (targetOccasions.size > 0) {
    const matchedOccs = Array.from(targetOccasions).filter((occ) =>
      occasions.includes(occ)
    );
    if (matchedOccs.length > 0) {
      const occLabels = matchedOccs.map((o) => OCCASION_LABELS[o] || o);
      const pts = 18;
      totalScore += pts;
      matchedSignals.push({
        type: 'occasion',
        label: occLabels.join(' · '),
        detail: `Great for ${occLabels.join(' & ').toLowerCase()}`,
        points: pts,
      });
    }
  }

  // 6. TOPIC & LEXICAL KEYWORD SIGNAL (evaluates remaining topic tokens against product text fields)
  if (parsedQuery.topicTokens.length > 0) {
    const titleLower = (product.title ?? '').toLowerCase();
    const subtitleLower = (product.subtitle ?? '').toLowerCase();
    const typeLower = (product.productType ?? '').toLowerCase();
    const whyLower = (product.whyToGiveIt ?? '').toLowerCase();
    const bestForLower = (product.bestForSummary ?? '').toLowerCase();
    const detailsLower = (product.detailsAndCare ?? '').toLowerCase();
    const interestsLower = interests.join(' ').toLowerCase();
    const editorialNotesLower = (
      editorialCtx?.guideEditorialNotes ?? []
    )
      .join(' ')
      .toLowerCase();

    const matchedKeywords: string[] = [];
    let lexicalPoints = 0;

    for (const token of parsedQuery.topicTokens) {
      const stemmed = stemToken(token);
      if (stemmed.length < 2) continue;

      const wordBoundaryRegex = new RegExp(`\\b${stemmed}`, 'i');

      if (wordBoundaryRegex.test(titleLower) || wordBoundaryRegex.test(typeLower)) {
        lexicalPoints += 18;
        matchedKeywords.push(token);
      } else if (
        wordBoundaryRegex.test(subtitleLower) ||
        wordBoundaryRegex.test(interestsLower) ||
        wordBoundaryRegex.test(bestForLower)
      ) {
        lexicalPoints += 14;
        matchedKeywords.push(token);
      } else if (
        wordBoundaryRegex.test(whyLower) ||
        wordBoundaryRegex.test(detailsLower) ||
        wordBoundaryRegex.test(editorialNotesLower)
      ) {
        lexicalPoints += 9;
        matchedKeywords.push(token);
      }
    }

    if (lexicalPoints > 0) {
      const cappedLexical = Math.min(36, lexicalPoints);
      totalScore += cappedLexical;
      const uniqueKw = Array.from(new Set(matchedKeywords)).slice(0, 3);
      matchedSignals.push({
        type: 'keyword',
        label: `Matches “${uniqueKw.join(', ')}”`,
        detail: `Direct match for ${uniqueKw.map((k) => `“${k}”`).join(', ')}`,
        points: cappedLexical,
      });
    }
  }

  // 7. VERIFIED BUDGET FIT SIGNAL (when a budget constraint is active and product is verified within budget)
  if (validPrice && (effectiveMaxPrice !== null || effectiveMinPrice !== null)) {
    const pts = 10;
    totalScore += pts;
    const boundText =
      effectiveMaxPrice !== null && effectiveMinPrice !== null
        ? `$${effectiveMinPrice}–$${effectiveMaxPrice} range`
        : effectiveMaxPrice !== null
          ? `under $${effectiveMaxPrice}`
          : `$${effectiveMinPrice}+`;
    matchedSignals.push({
      type: 'budget',
      label: `$${product.price} (${boundText})`,
      detail: `$${product.price} fits your ${boundText} budget`,
      points: pts,
    });
  }

  // 8. EDITORIAL CURATION SIGNAL (small tie-breaking & curation boost)
  const editorialBadges: string[] = [];
  if (product.calloutTag) {
    editorialBadges.push(product.calloutTag);
  }
  for (const badge of editorialCtx?.guideBadges ?? []) {
    if (!editorialBadges.includes(badge)) {
      editorialBadges.push(badge);
    }
  }

  if (filters.editorialOnly || editorialCtx?.isEditorsPick || editorialCtx?.isQuickPick) {
    const editorialPts = editorialCtx?.isEditorsPick ? 6 : editorialCtx?.isQuickPick ? 4 : 2;
    totalScore += editorialPts;
    if (filters.editorialOnly) {
      matchedSignals.push({
        type: 'editorial',
        label: editorialBadges[0] || 'Editor’s Selection',
        detail: `Featured as ${editorialBadges[0] || 'an Editor’s Selection'}`,
        points: editorialPts,
      });
    }
  }

  // Build concise, truthful plain-language match explanation
  const explanationParts: string[] = [];
  const nonBudgetSignals = matchedSignals.filter((s) => s.type !== 'budget');
  const budgetSignal = matchedSignals.find((s) => s.type === 'budget');

  for (const sig of nonBudgetSignals.slice(0, 3)) {
    explanationParts.push(sig.detail);
  }
  if (budgetSignal) {
    explanationParts.push(budgetSignal.detail);
  }

  const matchExplanation =
    explanationParts.length > 0
      ? `${explanationParts.join(' · ')}.`
      : product.bestForSummary
        ? `Best for: ${product.bestForSummary}`
        : product.whyToGiveIt;

  return {
    product,
    score: totalScore,
    matchedSignals,
    matchExplanation,
    editorialBadges: editorialBadges.slice(0, 2),
    hasValidPrice: validPrice,
  };
}

/**
 * Evaluates the canonical product catalog against natural-language search, faceted filters,
 * or guided quiz state using a single shared deterministic ranking engine.
 */
export function evaluateGiftFinder(
  products: Product[],
  filters: Partial<GiftFinderFilters> = {},
  options?: {
    guides?: GiftGuide[];
    articles?: Article[];
  }
): GiftFinderEvaluationResult {
  const mergedFilters: GiftFinderFilters = {
    ...DEFAULT_FINDER_FILTERS,
    ...filters,
  };

  const parsedQuery = parseNaturalLanguageGiftQuery(mergedFilters.query);
  const { effectiveMaxPrice, effectiveMinPrice } = resolveEffectivePriceBounds(
    mergedFilters,
    parsedQuery
  );

  const editorialMap = buildEditorialContextMap(
    options?.guides ?? [],
    options?.articles ?? []
  );

  const hasQueryText = parsedQuery.meaningfulTokens.length > 0;
  const hasTopicConstraintInQuery =
    parsedQuery.topicTokens.length > 0 ||
    parsedQuery.inferredInterests.length > 0 ||
    parsedQuery.inferredCategories.length > 0 ||
    parsedQuery.inferredPersonalityTraits.length > 0;

  const hasIntentConstraintInQuery =
    hasTopicConstraintInQuery ||
    parsedQuery.inferredRecipients.length > 0 ||
    parsedQuery.inferredOccasions.length > 0;

  const hasActiveCriteria =
    Boolean(mergedFilters.query.trim()) ||
    mergedFilters.recipient !== 'all' ||
    mergedFilters.occasion !== 'all' ||
    mergedFilters.personalityTrait !== 'all' ||
    mergedFilters.category !== 'all' ||
    mergedFilters.interest !== 'all' ||
    mergedFilters.budgetTier !== 'all' ||
    effectiveMaxPrice !== null ||
    effectiveMinPrice !== null ||
    mergedFilters.editorialOnly;

  // Step 1: Filter by hard eligibility constraints
  const hardEligibleProducts = products.filter((product) =>
    passesHardEligibilityConstraints(
      product,
      mergedFilters,
      effectiveMaxPrice,
      effectiveMinPrice,
      editorialMap[product.id]
    )
  );

  // Step 2: Score all hard-eligible products
  const scoredResults = hardEligibleProducts.map((product) =>
    scoreProductDeterministically(
      product,
      mergedFilters,
      parsedQuery,
      effectiveMaxPrice,
      effectiveMinPrice,
      editorialMap[product.id]
    )
  );

  // Step 3: When a natural-language query has specific topic/intent tokens,
  // exclude products that have zero matching query signals (distinguishing strong matches from non-matches).
  // Furthermore, if the query specifies BOTH a topic/interest/category/keyword AND a recipient/occasion,
  // prioritize items that match at least one topic/keyword/interest/category/style signal if any exist.
  let filteredScoredResults = scoredResults;

  if (hasQueryText) {
    const querySignalTypes = new Set([
      'recipient',
      'interest',
      'occasion',
      'category',
      'style',
      'keyword',
    ]);

    const matchingAnyQuerySignal = scoredResults.filter((r) =>
      r.matchedSignals.some((s) => querySignalTypes.has(s.type))
    );

    if (hasTopicConstraintInQuery) {
      const topicSignalTypes = new Set([
        'interest',
        'category',
        'style',
        'keyword',
      ]);
      const matchingTopicSignal = matchingAnyQuerySignal.filter((r) =>
        r.matchedSignals.some((s) => topicSignalTypes.has(s.type))
      );

      // If the user typed an unrecognized keyword that is not in any synonym map and matched 0 products,
      // return 0 results rather than returning every product just because "mom" was also in the query.
      const hasUnmatchedRawTopicWords =
        parsedQuery.topicTokens.length > 0 &&
        parsedQuery.inferredInterests.length === 0 &&
        parsedQuery.inferredCategories.length === 0 &&
        parsedQuery.inferredPersonalityTraits.length === 0 &&
        matchingTopicSignal.length === 0;

      if (hasUnmatchedRawTopicWords) {
        filteredScoredResults = [];
      } else if (matchingTopicSignal.length > 0) {
        filteredScoredResults = matchingTopicSignal;
      } else {
        filteredScoredResults = matchingAnyQuerySignal;
      }
    } else if (hasIntentConstraintInQuery) {
      filteredScoredResults = matchingAnyQuerySignal;
    } else {
      filteredScoredResults = [];
    }
  }

  // Step 4: Deterministic Sorting
  const sortedResults = [...filteredScoredResults].sort((a, b) => {
    if (mergedFilters.sort === 'price-asc') {
      if (a.hasValidPrice && b.hasValidPrice) {
        if (a.product.price !== b.product.price) {
          return a.product.price - b.product.price;
        }
      } else if (a.hasValidPrice !== b.hasValidPrice) {
        // Products with missing prices always sort to the end
        return a.hasValidPrice ? -1 : 1;
      }
    } else if (mergedFilters.sort === 'price-desc') {
      if (a.hasValidPrice && b.hasValidPrice) {
        if (a.product.price !== b.product.price) {
          return b.product.price - a.product.price;
        }
      } else if (a.hasValidPrice !== b.hasValidPrice) {
        return a.hasValidPrice ? -1 : 1;
      }
    }

    // Default / tie-breaker: descending relevance score, then price ascending, then ID
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.hasValidPrice && b.hasValidPrice && a.product.price !== b.product.price) {
      return a.product.price - b.product.price;
    }
    return a.product.id.localeCompare(b.product.id);
  });

  // Step 5: Compute Facet Option Counts (grounded in actual catalog attributes)
  const facets = computeFacetCounts(
    products,
    mergedFilters,
    effectiveMaxPrice,
    effectiveMinPrice,
    editorialMap
  );

  // Step 6: Compute Actionable Refinement Suggestions
  const suggestions = computeRefinementSuggestions(
    products,
    mergedFilters,
    parsedQuery,
    effectiveMaxPrice,
    effectiveMinPrice,
    sortedResults.length,
    editorialMap
  );

  return {
    results: sortedResults,
    totalEligibleCount: sortedResults.length,
    parsedQuery,
    effectiveMaxPrice,
    effectiveMinPrice,
    hasActiveCriteria,
    facets,
    suggestions,
  };
}

function computeFacetCounts(
  products: Product[],
  filters: GiftFinderFilters,
  effectiveMaxPrice: number | null,
  effectiveMinPrice: number | null,
  editorialMap: Record<string, EditorialProductContext>
): FinderFacetCounts {
  const recipientKeys: RecipientType[] = [
    'parent',
    'partner',
    'friend',
    'host',
    'kids',
    'coworker',
  ];
  const occasionKeys: OccasionType[] = [
    'birthday',
    'housewarming',
    'anniversary',
    'thank-you',
    'holidays',
    'just-because',
  ];
  const personalityKeys: PersonalityTrait[] = [
    'everyday-ritual',
    'foodie-host',
    'cozy-homebody',
    'curious-creative',
    'outdoors-nature',
    'nostalgic-sentimental',
  ];
  const budgetTierKeys: BudgetTier[] = [
    'under-25',
    '25-to-75',
    'over-75',
    'under-50',
    '50-to-100',
    '100-plus',
  ];

  const allCategories = Array.from(
    new Set(products.map((p) => p.productType).filter(Boolean))
  ).sort();
  const allInterests = Array.from(
    new Set(products.flatMap((p) => p.interests ?? []).filter(Boolean))
  ).sort();

  const recipients = recipientKeys.map((rec) => {
    const count = products.filter(
      (p) =>
        (p.recipients ?? []).includes(rec) &&
        passesHardEligibilityConstraints(
          p,
          filters,
          effectiveMaxPrice,
          effectiveMinPrice,
          editorialMap[p.id],
          'recipient'
        )
    ).length;
    return {
      value: rec,
      label: RECIPIENT_LABELS[rec],
      count,
    };
  });

  const occasions = occasionKeys.map((occ) => {
    const count = products.filter(
      (p) =>
        (p.occasions ?? []).includes(occ) &&
        passesHardEligibilityConstraints(
          p,
          filters,
          effectiveMaxPrice,
          effectiveMinPrice,
          editorialMap[p.id],
          'occasion'
        )
    ).length;
    return {
      value: occ,
      label: OCCASION_LABELS[occ],
      count,
    };
  });

  const personalityTraits = personalityKeys.map((trait) => {
    const count = products.filter(
      (p) =>
        (p.personalityTraits ?? []).includes(trait) &&
        passesHardEligibilityConstraints(
          p,
          filters,
          effectiveMaxPrice,
          effectiveMinPrice,
          editorialMap[p.id],
          'personalityTrait'
        )
    ).length;
    return {
      value: trait,
      label: PERSONALITY_LABELS[trait],
      count,
    };
  });

  const categories = allCategories.map((cat) => {
    const count = products.filter(
      (p) =>
        p.productType === cat &&
        passesHardEligibilityConstraints(
          p,
          filters,
          effectiveMaxPrice,
          effectiveMinPrice,
          editorialMap[p.id],
          'category'
        )
    ).length;
    return {
      value: cat,
      label: cat,
      count,
    };
  });

  const interests = allInterests.map((interest) => {
    const count = products.filter(
      (p) =>
        (p.interests ?? []).includes(interest) &&
        passesHardEligibilityConstraints(
          p,
          filters,
          effectiveMaxPrice,
          effectiveMinPrice,
          editorialMap[p.id],
          'interest'
        )
    ).length;
    return {
      value: interest,
      label: interest,
      count,
    };
  });

  const budgetTiers = budgetTierKeys.map((tier) => {
    const count = products.filter((p) => {
      if (!hasValidNumericPrice(p)) return false;
      const matchesTier =
        p.budgetTier === tier ||
        p.guidePriceBucket === tier ||
        (tier === 'under-25' && p.price <= 25) ||
        (tier === '25-to-75' && p.price >= 25 && p.price <= 75) ||
        (tier === 'over-75' && p.price > 75) ||
        (tier === 'under-50' && p.price <= 50) ||
        (tier === '50-to-100' && p.price >= 50 && p.price <= 100) ||
        (tier === '100-plus' && p.price >= 100);
      return (
        matchesTier &&
        passesHardEligibilityConstraints(
          p,
          filters,
          null,
          null,
          editorialMap[p.id],
          'budgetTier'
        )
      );
    }).length;
    return {
      value: tier,
      label: BUDGET_TIER_LABELS[tier],
      count,
    };
  });

  const editorialPickCount = products.filter((p) =>
    passesHardEligibilityConstraints(
      p,
      { ...filters, editorialOnly: true },
      effectiveMaxPrice,
      effectiveMinPrice,
      editorialMap[p.id]
    )
  ).length;

  return {
    recipients,
    occasions,
    personalityTraits,
    categories,
    interests,
    budgetTiers,
    editorialPickCount,
  };
}

function computeRefinementSuggestions(
  products: Product[],
  filters: GiftFinderFilters,
  parsedQuery: ParsedGiftQuery,
  effectiveMaxPrice: number | null,
  _effectiveMinPrice: number | null,
  currentResultCount: number,
  editorialMap: Record<string, EditorialProductContext>
): FinderRefinementSuggestion[] {
  const suggestions: FinderRefinementSuggestion[] = [];

  // 1. If a max budget cap is active, check if raising/removing the budget cap unlocks more matching gifts
  if (effectiveMaxPrice !== null) {
    const queryWithoutBudgetText = parsedQuery.rawQuery
      .replace(
        /\b(?:under|below|less\s+than|max|maximum|up\s+to|within|at\s+most)\s*\$?\d+(?:\.\d{1,2})?\b/gi,
        ''
      )
      .replace(/\s+/g, ' ')
      .trim();

    const relaxedFilters: GiftFinderFilters = {
      ...filters,
      query: queryWithoutBudgetText,
      maxPrice: null,
      budgetTier: 'all',
    };
    const relaxedParsed = parseNaturalLanguageGiftQuery(queryWithoutBudgetText);
    const unlocked = products.filter((p) =>
      passesHardEligibilityConstraints(
        p,
        relaxedFilters,
        null,
        null,
        editorialMap[p.id]
      )
    );

    const matchingUnlocked =
      relaxedParsed.meaningfulTokens.length > 0
        ? unlocked.filter((p) => {
            const scored = scoreProductDeterministically(
              p,
              relaxedFilters,
              relaxedParsed,
              null,
              null,
              editorialMap[p.id]
            );
            return scored.score > 0;
          })
        : unlocked;

    if (matchingUnlocked.length > currentResultCount) {
      suggestions.push({
        id: 'remove-budget-cap',
        label: `Remove $${effectiveMaxPrice} limit (${matchingUnlocked.length} matching gifts)`,
        reason: `Unlocks ${matchingUnlocked.length - currentResultCount} additional ${
          matchingUnlocked.length - currentResultCount === 1 ? 'gift' : 'gifts'
        } priced above $${effectiveMaxPrice}.`,
        resultCount: matchingUnlocked.length,
        patch: {
          query: queryWithoutBudgetText,
          maxPrice: null,
          budgetTier: 'all',
        },
      });
    }
  }

  // 2. Check individual filter relaxations if results are 0 or narrow (<= 2)
  if (currentResultCount <= 2) {
    if (filters.recipient !== 'all') {
      const countWithoutRecipient = products.filter((p) =>
        passesHardEligibilityConstraints(
          p,
          { ...filters, recipient: 'all' },
          effectiveMaxPrice,
          null,
          editorialMap[p.id]
        )
      ).length;
      if (countWithoutRecipient > currentResultCount) {
        suggestions.push({
          id: 'relax-recipient',
          label: `Expand beyond ${RECIPIENT_LABELS[filters.recipient]} (${countWithoutRecipient} gifts)`,
          reason: 'Broadens recipient filter while keeping your other criteria.',
          resultCount: countWithoutRecipient,
          patch: { recipient: 'all' },
        });
      }
    }

    if (filters.occasion !== 'all') {
      const countWithoutOccasion = products.filter((p) =>
        passesHardEligibilityConstraints(
          p,
          { ...filters, occasion: 'all' },
          effectiveMaxPrice,
          null,
          editorialMap[p.id]
        )
      ).length;
      if (countWithoutOccasion > currentResultCount) {
        suggestions.push({
          id: 'relax-occasion',
          label: `Show all occasions (${countWithoutOccasion} gifts)`,
          reason: `Removes the ${OCCASION_LABELS[filters.occasion]} constraint.`,
          resultCount: countWithoutOccasion,
          patch: { occasion: 'all' },
        });
      }
    }

    if (filters.category !== 'all') {
      const countWithoutCategory = products.filter((p) =>
        passesHardEligibilityConstraints(
          p,
          { ...filters, category: 'all' },
          effectiveMaxPrice,
          null,
          editorialMap[p.id]
        )
      ).length;
      if (countWithoutCategory > currentResultCount) {
        suggestions.push({
          id: 'relax-category',
          label: `Include all product categories (${countWithoutCategory} gifts)`,
          reason: `Broadens beyond ${filters.category}.`,
          resultCount: countWithoutCategory,
          patch: { category: 'all' },
        });
      }
    }

    if (filters.interest !== 'all') {
      const countWithoutInterest = products.filter((p) =>
        passesHardEligibilityConstraints(
          p,
          { ...filters, interest: 'all' },
          effectiveMaxPrice,
          null,
          editorialMap[p.id]
        )
      ).length;
      if (countWithoutInterest > currentResultCount) {
        suggestions.push({
          id: 'relax-interest',
          label: `Clear "${filters.interest}" tag (${countWithoutInterest} gifts)`,
          reason: 'Shows gifts across all interest tags.',
          resultCount: countWithoutInterest,
          patch: { interest: 'all' },
        });
      }
    }
  }

  // 3. Always include helpful starter queries when 0 results
  if (currentResultCount === 0) {
    suggestions.push(
      {
        id: 'try-under-50-mom',
        label: 'Try “tea gifts for mom under $50”',
        reason: 'Popular search for warm daily rituals under $50.',
        resultCount: 2,
        patch: {
          ...DEFAULT_FINDER_FILTERS,
          query: 'tea gifts for mom under $50',
        },
      },
      {
        id: 'try-housewarming-plants',
        label: 'Try “housewarming gift for someone who likes plants”',
        reason: 'Finds botanical, cooking, and home sanctuary gifts.',
        resultCount: 4,
        patch: {
          ...DEFAULT_FINDER_FILTERS,
          query: 'housewarming gift for someone who likes plants',
        },
      },
      {
        id: 'try-practical-dad',
        label: 'Try “practical gift for dad”',
        reason: 'Surfaces everyday-ritual upgrades for parents.',
        resultCount: 5,
        patch: {
          ...DEFAULT_FINDER_FILTERS,
          query: 'practical gift for dad',
        },
      }
    );
  }

  return suggestions.slice(0, 5);
}

/**
 * URL Query Parameter Serialization & Deserialization for `/gift-finder/`
 * Safely ignores malformed or unsupported parameters and never serializes private saved lists/notes.
 */
const VALID_RECIPIENTS = new Set<RecipientType>([
  'parent',
  'partner',
  'friend',
  'host',
  'kids',
  'coworker',
]);
const VALID_OCCASIONS = new Set<OccasionType>([
  'birthday',
  'housewarming',
  'anniversary',
  'thank-you',
  'holidays',
  'just-because',
]);
const VALID_STYLES = new Set<PersonalityTrait>([
  'everyday-ritual',
  'foodie-host',
  'cozy-homebody',
  'curious-creative',
  'outdoors-nature',
  'nostalgic-sentimental',
]);
const VALID_BUDGET_TIERS = new Set<BudgetTier>([
  'under-25',
  '25-to-75',
  'over-75',
  'under-50',
  '50-to-100',
  '100-plus',
]);
const VALID_SORTS = new Set<FinderSortOption>([
  'relevance',
  'price-asc',
  'price-desc',
]);

export function parseFinderUrlSearchParams(
  search: string | URLSearchParams,
  availableProducts: Product[] = []
): GiftFinderFilters {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search;

  const validCategories = new Set(
    availableProducts.map((p) => p.productType).filter(Boolean)
  );
  const validInterests = new Set(
    availableProducts.flatMap((p) => p.interests ?? []).filter(Boolean)
  );

  const rawQ = (params.get('q') ?? '').trim().slice(0, 200);
  const rawRecipient = (params.get('recipient') ?? '').trim() as RecipientType;
  const rawOccasion = (params.get('occasion') ?? '').trim() as OccasionType;
  const rawStyle = (params.get('style') ?? params.get('personality') ?? '').trim() as PersonalityTrait;
  const rawCategory = (params.get('category') ?? '').trim();
  const rawInterest = (params.get('interest') ?? '').trim();
  const rawBudget = (params.get('budget') ?? '').trim() as BudgetTier;
  const rawSort = (params.get('sort') ?? '').trim() as FinderSortOption;
  const rawEditorial = (params.get('editorial') ?? '').trim().toLowerCase();

  const parsePositiveNumber = (val: string | null): number | null => {
    if (!val || !val.trim()) return null;
    const num = Number(val);
    if (!Number.isFinite(num) || num <= 0 || num > 100000) return null;
    return num;
  };

  let maxPrice = parsePositiveNumber(params.get('maxPrice'));
  let minPrice = parsePositiveNumber(params.get('minPrice'));
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    // Swap inverted bounds gracefully
    const tmp = minPrice;
    minPrice = maxPrice;
    maxPrice = tmp;
  }

  return {
    query: rawQ,
    recipient: VALID_RECIPIENTS.has(rawRecipient) ? rawRecipient : 'all',
    occasion: VALID_OCCASIONS.has(rawOccasion) ? rawOccasion : 'all',
    personalityTrait: VALID_STYLES.has(rawStyle) ? rawStyle : 'all',
    category:
      rawCategory && (validCategories.size === 0 || validCategories.has(rawCategory))
        ? rawCategory
        : 'all',
    interest:
      rawInterest && (validInterests.size === 0 || validInterests.has(rawInterest))
        ? rawInterest
        : 'all',
    budgetTier: VALID_BUDGET_TIERS.has(rawBudget) ? rawBudget : 'all',
    maxPrice,
    minPrice,
    editorialOnly: rawEditorial === '1' || rawEditorial === 'true',
    sort: VALID_SORTS.has(rawSort) ? rawSort : 'relevance',
  };
}

export function serializeFinderUrlSearchParams(
  filters: GiftFinderFilters
): string {
  const params = new URLSearchParams();

  if (filters.query.trim()) {
    params.set('q', filters.query.trim());
  }
  if (filters.recipient !== 'all') {
    params.set('recipient', filters.recipient);
  }
  if (filters.occasion !== 'all') {
    params.set('occasion', filters.occasion);
  }
  if (filters.personalityTrait !== 'all') {
    params.set('style', filters.personalityTrait);
  }
  if (filters.category !== 'all') {
    params.set('category', filters.category);
  }
  if (filters.interest !== 'all') {
    params.set('interest', filters.interest);
  }
  if (filters.budgetTier !== 'all') {
    params.set('budget', filters.budgetTier);
  }
  if (filters.maxPrice !== null && Number.isFinite(filters.maxPrice) && filters.maxPrice > 0) {
    params.set('maxPrice', String(filters.maxPrice));
  }
  if (filters.minPrice !== null && Number.isFinite(filters.minPrice) && filters.minPrice > 0) {
    params.set('minPrice', String(filters.minPrice));
  }
  if (filters.editorialOnly) {
    params.set('editorial', '1');
  }
  if (filters.sort !== 'relevance') {
    params.set('sort', filters.sort);
  }

  const str = params.toString();
  return str ? `?${str}` : '';
}

/**
 * Guided Gift-Finding Quiz answers & converter to the shared `GiftFinderFilters` contract.
 */
export interface GuidedQuizAnswers {
  recipient: RecipientType | 'all';
  interest: string | 'all';
  occasion: OccasionType | 'all';
  maxPrice: number | null;
  personalityTrait: PersonalityTrait | 'all';
}

export const DEFAULT_QUIZ_ANSWERS: GuidedQuizAnswers = {
  recipient: 'all',
  interest: 'all',
  occasion: 'all',
  maxPrice: null,
  personalityTrait: 'all',
};

export function quizAnswersToFinderFilters(
  answers: GuidedQuizAnswers,
  existingSort: FinderSortOption = 'relevance'
): GiftFinderFilters {
  return {
    ...DEFAULT_FINDER_FILTERS,
    recipient: answers.recipient,
    interest: answers.interest,
    occasion: answers.occasion,
    maxPrice: answers.maxPrice,
    personalityTrait: answers.personalityTrait,
    sort: existingSort,
  };
}
