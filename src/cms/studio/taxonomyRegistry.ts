/**
 * Science of Gifts — Controlled Taxonomy Registry for Sanity Studio
 *
 * Single source of truth for controlled vocabularies shared between Sanity Studio
 * schemas, Astro category archives, and the interactive Gift Finder (`giftFinderEngine.ts`).
 *
 * All values are strictly aligned with `src/types/content.ts` and `src/cms/contentRepository.ts`
 * so Studio editors never select orphaned or mismatched tags.
 */

import type {
  AgeRange,
  ArticleTopicId,
  BudgetTier,
  CommerceProvider,
  OccasionType,
  PersonalityTrait,
  RecipientType,
} from '../../types/content';

export interface SanityTitledOption<T extends string = string> {
  title: string;
  value: T;
}

export const RECIPIENT_OPTIONS: SanityTitledOption<RecipientType>[] = [
  { title: 'Partners & Spouses (partner)', value: 'partner' },
  { title: 'Parents & In-Laws (parent)', value: 'parent' },
  { title: 'Close Friends (friend)', value: 'friend' },
  { title: 'Dinner & Weekend Hosts (host)', value: 'host' },
  { title: 'Kids & Families (kids)', value: 'kids' },
  { title: 'Coworkers, Teachers & Mentors (coworker)', value: 'coworker' },
];

export const OCCASION_OPTIONS: SanityTitledOption<OccasionType>[] = [
  { title: 'Birthdays (birthday)', value: 'birthday' },
  { title: 'Housewarming (housewarming)', value: 'housewarming' },
  { title: 'Anniversaries (anniversary)', value: 'anniversary' },
  { title: 'Host & Appreciation / Thank You (thank-you)', value: 'thank-you' },
  { title: 'Winter Holidays (holidays)', value: 'holidays' },
  { title: 'Just Because (just-because)', value: 'just-because' },
];

export const PERSONALITY_TRAIT_OPTIONS: SanityTitledOption<PersonalityTrait>[] = [
  { title: 'Foodie & Generous Host (foodie-host)', value: 'foodie-host' },
  { title: 'Cozy Homebody & Sanctuary Seeker (cozy-homebody)', value: 'cozy-homebody' },
  { title: 'Curious Creative & Maker (curious-creative)', value: 'curious-creative' },
  { title: 'Outdoors, Garden & Nature Lover (outdoors-nature)', value: 'outdoors-nature' },
  { title: 'Nostalgic & Sentimental Storykeeper (nostalgic-sentimental)', value: 'nostalgic-sentimental' },
  { title: 'Everyday Ritual & Quiet Upgrade (everyday-ritual)', value: 'everyday-ritual' },
];

export const AGE_RANGE_OPTIONS: SanityTitledOption<AgeRange>[] = [
  { title: 'Kids (kids)', value: 'kids' },
  { title: 'Young Adults (young-adult)', value: 'young-adult' },
  { title: 'Adults (adult)', value: 'adult' },
  { title: 'Parents & Grandparents (parents-grandparents)', value: 'parents-grandparents' },
  { title: 'All Ages / Multi-Generational (all-ages)', value: 'all-ages' },
];

export const PRODUCT_CATEGORY_OPTIONS: SanityTitledOption<string>[] = [
  // Core catalog categories (strictly preserved for backward compatibility)
  { title: 'Tabletop & Glassware', value: 'Tabletop & Glassware' },
  { title: 'Kitchen & Pantry', value: 'Kitchen & Pantry' },
  { title: 'Tea & Coffee Rituals', value: 'Tea & Coffee Rituals' },
  { title: 'Keepsakes & Stationery', value: 'Keepsakes & Stationery' },
  { title: 'Home & Textiles', value: 'Home & Textiles' },
  { title: 'Games & Gathering', value: 'Games & Gathering' },
  { title: 'Print & Custom Art', value: 'Print & Custom Art' },
  // Expanded merchandise categories for Fourthwall and niche catalog expansion
  { title: 'Apparel & Wearables (Hoodies, Tees, Sweatshirts)', value: 'Apparel & Wearables' },
  { title: 'Drinkware & Mugs (Ceramic Mugs, Tumblers, Glassware)', value: 'Drinkware & Mugs' },
  { title: 'Stationery & Desk (Journals, Desk Accessories, Writing)', value: 'Stationery & Desk' },
  { title: 'Prints & Wall Art (Framed Posters, Archival Prints, Maps)', value: 'Prints & Wall Art' },
  { title: 'Books & Reading (Hardcovers, Bookends, Reading Tools)', value: 'Books & Reading' },
  { title: 'Decor & Accents (Candles, Ambient Lighting, Sculptural Objects)', value: 'Decor & Accents' },
];

/**
 * Physical merchandise forms for precise object-level classification
 * (e.g. distinguishing a hoodie from a poster, or a mug from a kettle).
 */
export const MERCHANDISE_TYPE_OPTIONS: SanityTitledOption<string>[] = [
  { title: 'Pullover Hoodie / Sweatshirt', value: 'Hoodie' },
  { title: 'Graphic T-Shirt', value: 'T-Shirt' },
  { title: 'Embroidered Hat / Cap / Beanie', value: 'Hat' },
  { title: 'Loungewear & Robes', value: 'Loungewear' },
  { title: 'Ceramic Mug (11oz / 15oz)', value: 'Ceramic Mug' },
  { title: 'Insulated Travel Tumbler', value: 'Insulated Tumbler' },
  { title: 'Glassware & Stemware', value: 'Glassware' },
  { title: 'Teaware & Kettle', value: 'Teaware' },
  { title: 'Hardcover Journal / Notebook', value: 'Journal' },
  { title: 'Desk Accessory / Tray / Organizer', value: 'Desk Accessory' },
  { title: 'Fine Pen & Calligraphy Tool', value: 'Fine Pen' },
  { title: 'Framed Poster / Wall Print', value: 'Framed Poster' },
  { title: 'Archival Art Print', value: 'Art Print' },
  { title: 'Wall Map / Infographic', value: 'Wall Map' },
  { title: 'Hardcover Book / Monograph', value: 'Book' },
  { title: 'Bookends & Reading Tools', value: 'Bookends' },
  { title: 'Scented Candle / Ambient Light', value: 'Candle' },
  { title: 'Throw Blanket / Textile', value: 'Blanket' },
  { title: 'Tabletop / Serving Piece', value: 'Servingware' },
  { title: 'Board Game / Card Deck', value: 'Board Game' },
  { title: 'Puzzle & Brainteaser', value: 'Puzzle' },
  { title: 'Artisan Object / Decorative Piece', value: 'Decorative Object' },
];

export const INTEREST_OPTIONS: SanityTitledOption<string>[] = [
  // 1. Original 9 canonical interests (strictly preserved for existing catalog & Gift Finder)
  { title: 'Coffee & Tea', value: 'Coffee & Tea' },
  { title: 'Cooking & Hosting', value: 'Cooking & Hosting' },
  { title: 'Home Decor', value: 'Home Decor' },
  { title: 'Cozy Sanctuary', value: 'Cozy Sanctuary' },
  { title: 'Slow Mornings', value: 'Slow Mornings' },
  { title: 'Dinner Parties', value: 'Dinner Parties' },
  { title: 'Journaling & Reading', value: 'Journaling & Reading' },
  { title: 'Gardening', value: 'Gardening' },
  { title: 'Board Games', value: 'Board Games' },

  // 2. Psychology & Behavioral Science
  { title: 'Psychology & Human Behavior', value: 'Psychology & Human Behavior' },
  { title: 'Cognitive Science & Neuroscience', value: 'Cognitive Science & Neuroscience' },
  { title: 'Behavioral Economics', value: 'Behavioral Economics' },
  { title: 'Mindfulness & Mental Health', value: 'Mindfulness & Mental Health' },

  // 3. History, Antiquity & Classical Lore
  { title: 'History & Antiquity', value: 'History & Antiquity' },
  { title: 'Military History & Strategy', value: 'Military History & Strategy' },
  { title: 'Archaeology & Heritage', value: 'Archaeology & Heritage' },

  // 4. Literature, Philosophy & Writing
  { title: 'Philosophy & Ethics', value: 'Philosophy & Ethics' },
  { title: 'Classic Literature & Poetry', value: 'Classic Literature & Poetry' },
  { title: 'Mythology & Folklore', value: 'Mythology & Folklore' },
  { title: 'Creative Writing', value: 'Creative Writing' },

  // 5. Cinema, Visual Arts & Architecture
  { title: 'Filmmaking & Cinema', value: 'Filmmaking & Cinema' },
  { title: 'Photography & Visual Arts', value: 'Photography & Visual Arts' },
  { title: 'Architecture & Design', value: 'Architecture & Design' },
  { title: 'Typography & Printmaking', value: 'Typography & Printmaking' },

  // 6. Science, Mathematics & Space
  { title: 'Astronomy & Space', value: 'Astronomy & Space' },
  { title: 'Mathematics & Logic', value: 'Mathematics & Logic' },
  { title: 'Physics & Natural Sciences', value: 'Physics & Natural Sciences' },
  { title: 'Botanical & Earth Sciences', value: 'Botanical & Earth Sciences' },

  // 7. Craft, Making & Strategy
  { title: 'Artisan Craft & Woodworking', value: 'Artisan Craft & Woodworking' },
  { title: 'Nature & Outdoors', value: 'Nature & Outdoors' },
  { title: 'Puzzles & Logic Games', value: 'Puzzles & Logic Games' },
];

export const INTEREST_SLUG_OPTIONS: SanityTitledOption<string>[] = INTEREST_OPTIONS.map(
  (opt) => ({
    title: `${opt.title} (${slugifyTaxonomyTag(opt.value)})`,
    value: slugifyTaxonomyTag(opt.value),
  })
);

export function slugifyTaxonomyTag(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * Normalizes input category strings, accommodating common aliases and informal chatbot outputs
 * while preserving exact canonical values for Astro routes.
 */
export function normalizeProductCategory(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const directMatch = PRODUCT_CATEGORY_OPTIONS.find(
    (c) => c.value.toLowerCase() === trimmed.toLowerCase()
  );
  if (directMatch) return directMatch.value;

  const lower = trimmed.toLowerCase();
  if (lower.includes('hoodie') || lower.includes('sweatshirt') || lower.includes('apparel') || lower.includes('t-shirt') || lower.includes('clothing')) {
    return 'Apparel & Wearables';
  }
  if (lower.includes('mug') || lower.includes('tumbler') || lower.includes('drinkware') || lower.includes('glassware')) {
    return 'Drinkware & Mugs';
  }
  if (lower.includes('journal') || lower.includes('notebook') || lower.includes('stationery') || lower.includes('pen')) {
    return 'Stationery & Desk';
  }
  if (lower.includes('poster') || lower.includes('wall art') || lower.includes('print')) {
    return 'Prints & Wall Art';
  }
  if (lower.includes('book') || lower.includes('reading') || lower.includes('bookend')) {
    return 'Books & Reading';
  }
  if (lower.includes('candle') || lower.includes('decor') || lower.includes('lighting')) {
    return 'Decor & Accents';
  }
  if (lower.includes('tea') || lower.includes('coffee')) {
    return 'Tea & Coffee Rituals';
  }
  if (lower.includes('kitchen') || lower.includes('pantry') || lower.includes('cookware')) {
    return 'Kitchen & Pantry';
  }
  if (lower.includes('tabletop') || lower.includes('serving')) {
    return 'Tabletop & Glassware';
  }
  if (lower.includes('game') || lower.includes('puzzle')) {
    return 'Games & Gathering';
  }

  return null;
}

/**
 * Normalizes input interest tags, safely mapping historical, psychological, cinematic,
 * and scientific subtopics to their canonical Science of Gifts interest tags.
 */
export function normalizeTaxonomyInterestTag(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const directMatch = INTEREST_OPTIONS.find(
    (i) => i.value.toLowerCase() === trimmed.toLowerCase()
  );
  if (directMatch) return directMatch.value;

  const lower = trimmed.toLowerCase();
  // Psychology & Behavioral Science
  if (lower.includes('psycholog') || lower.includes('behavioral') || lower.includes('human behavior')) {
    return 'Psychology & Human Behavior';
  }
  if (lower.includes('neuroscience') || lower.includes('brain') || lower.includes('cognitive')) {
    return 'Cognitive Science & Neuroscience';
  }
  if (lower.includes('behavioral economics') || lower.includes('decision-making') || lower.includes('game theory')) {
    return 'Behavioral Economics';
  }
  if (lower.includes('mental health') || lower.includes('mindful') || lower.includes('meditation')) {
    return 'Mindfulness & Mental Health';
  }

  // History & Antiquity
  if (lower.includes('rome') || lower.includes('roman') || lower.includes('greek') || lower.includes('antiquity') || lower.includes('ancient') || lower.includes('history')) {
    return 'History & Antiquity';
  }
  if (lower.includes('military') || lower.includes('warfare') || lower.includes('strategy')) {
    return 'Military History & Strategy';
  }
  if (lower.includes('archaeology') || lower.includes('heritage') || lower.includes('artifact')) {
    return 'Archaeology & Heritage';
  }

  // Philosophy & Literature
  if (lower.includes('philosoph') || lower.includes('ethics') || lower.includes('stoic')) {
    return 'Philosophy & Ethics';
  }
  if (lower.includes('classic lit') || lower.includes('poetry') || lower.includes('novels') || lower.includes('literature')) {
    return 'Classic Literature & Poetry';
  }
  if (lower.includes('myth') || lower.includes('folklore') || lower.includes('legends')) {
    return 'Mythology & Folklore';
  }
  if (lower.includes('writing') || lower.includes('author') || lower.includes('essay')) {
    return 'Creative Writing';
  }

  // Cinema, Art & Design
  if (lower.includes('film') || lower.includes('cinema') || lower.includes('movie') || lower.includes('directing')) {
    return 'Filmmaking & Cinema';
  }
  if (lower.includes('photograph') || lower.includes('visual art') || lower.includes('painting')) {
    return 'Photography & Visual Arts';
  }
  if (lower.includes('architect') || lower.includes('design') || lower.includes('bauhaus')) {
    return 'Architecture & Design';
  }
  if (lower.includes('typography') || lower.includes('printmaking') || lower.includes('letterpress')) {
    return 'Typography & Printmaking';
  }

  // Science, Space & Math
  if (lower.includes('astronomy') || lower.includes('space') || lower.includes('astrophysics') || lower.includes('cosmos')) {
    return 'Astronomy & Space';
  }
  if (lower.includes('math') || lower.includes('logic') || lower.includes('geometry')) {
    return 'Mathematics & Logic';
  }
  if (lower.includes('physics') || lower.includes('natural science')) {
    return 'Physics & Natural Sciences';
  }
  if (lower.includes('botan') || lower.includes('plants') || lower.includes('earth science')) {
    return 'Botanical & Earth Sciences';
  }

  // Crafts & Games
  if (lower.includes('woodwork') || lower.includes('woodcraft') || lower === 'artisan craft') {
    return 'Artisan Craft & Woodworking';
  }
  if (lower.includes('puzzle') || lower.includes('brainteaser')) {
    return 'Puzzles & Logic Games';
  }

  // Daily Rituals & Home (Original 9)
  if (lower.includes('coffee') || lower.includes('tea')) {
    return 'Coffee & Tea';
  }
  if (lower.includes('cooking') || lower.includes('baking') || lower.includes('culinary')) {
    return 'Cooking & Hosting';
  }
  if (lower.includes('garden')) {
    return 'Gardening';
  }
  if (lower.includes('board game')) {
    return 'Board Games';
  }
  if (lower.includes('decor')) {
    return 'Home Decor';
  }
  if (lower.includes('sanctuary') || lower.includes('hygge') || lower.includes('cozy')) {
    return 'Cozy Sanctuary';
  }
  if (lower.includes('slow morning') || lower.includes('morning ritual')) {
    return 'Slow Mornings';
  }
  if (lower.includes('dinner party') || lower.includes('entertaining')) {
    return 'Dinner Parties';
  }
  if (lower.includes('journal') || lower.includes('reading')) {
    return 'Journaling & Reading';
  }

  return null;
}

/**
 * Canonical ArticleTopicId options matching `src/types/content.ts` and
 * `/articles/topics/[slug]/` routes in `src/cms/contentRepository.ts`.
 * Fixes the previous audit mismatch where `sanitySchemas.ts` used non-existent topic IDs.
 */
export const ARTICLE_TOPIC_OPTIONS: SanityTitledOption<ArticleTopicId>[] = [
  {
    title: 'Gift-Giving Psychology (gift-giving-psychology)',
    value: 'gift-giving-psychology',
  },
  {
    title: 'Relationships & Connection (relationships)',
    value: 'relationships',
  },
  {
    title: 'Decision-Making (decision-making)',
    value: 'decision-making',
  },
  {
    title: 'Gift Etiquette (gift-etiquette)',
    value: 'gift-etiquette',
  },
  {
    title: 'Practical Gifting Advice (practical-gifting-advice)',
    value: 'practical-gifting-advice',
  },
  {
    title: 'Culture & Rituals (culture)',
    value: 'culture',
  },
];

export const PRODUCT_BUDGET_TIER_OPTIONS: SanityTitledOption<
  'under-50' | '50-to-100' | '100-plus'
>[] = [
  { title: 'Under $50 (under-50)', value: 'under-50' },
  { title: '$50 to $100 (50-to-100)', value: '50-to-100' },
  { title: '$100 and Above (100-plus)', value: '100-plus' },
];

export const GUIDE_PRICE_BUCKET_OPTIONS: SanityTitledOption<
  'under-25' | '25-to-75' | 'over-75'
>[] = [
  { title: 'Under $25 (under-25)', value: 'under-25' },
  { title: '$25 to $75 (25-to-75)', value: '25-to-75' },
  { title: 'Over $75 (over-75)', value: 'over-75' },
];

export const ALL_BUDGET_TIER_OPTIONS: SanityTitledOption<BudgetTier>[] = [
  { title: 'Under $25 (under-25)', value: 'under-25' },
  { title: '$25 to $75 (25-to-75)', value: '25-to-75' },
  { title: 'Over $75 (over-75)', value: 'over-75' },
  { title: 'Under $50 (under-50)', value: 'under-50' },
  { title: '$50 to $100 (50-to-100)', value: '50-to-100' },
  { title: '$100 and Above (100-plus)', value: '100-plus' },
];

export const COMMERCE_PROVIDER_OPTIONS: SanityTitledOption<CommerceProvider>[] = [
  {
    title: 'External Affiliate Partner (affiliate)',
    value: 'affiliate',
  },
  {
    title: 'Science of Gifts Shop — Fourthwall (fourthwall)',
    value: 'fourthwall',
  },
  {
    title: 'Digital Download / Printable (digital)',
    value: 'digital',
  },
  {
    title: 'Direct Independent Maker / Brand (direct)',
    value: 'direct',
  },
];

export const GUIDE_ACCENT_TONE_OPTIONS: SanityTitledOption<
  'mint' | 'soft-blue' | 'butter' | 'coral'
>[] = [
  { title: 'Soft Botanical Mint (mint)', value: 'mint' },
  { title: 'Calm Coastal Blue (soft-blue)', value: 'soft-blue' },
  { title: 'Warm Morning Butter (butter)', value: 'butter' },
  { title: 'Terracotta Coral (coral)', value: 'coral' },
];

export const GUIDE_PRESENTATION_STYLE_OPTIONS: SanityTitledOption<
  'featured' | 'standard' | 'compact' | 'editorial-feature'
>[] = [
  {
    title: 'Standard Editorial Card (standard)',
    value: 'standard',
  },
  {
    title: 'Featured Spotlight Layout (featured)',
    value: 'featured',
  },
  {
    title: 'Editorial Feature Deep-Dive (editorial-feature)',
    value: 'editorial-feature',
  },
  {
    title: 'Compact Scannable Row (compact)',
    value: 'compact',
  },
];
