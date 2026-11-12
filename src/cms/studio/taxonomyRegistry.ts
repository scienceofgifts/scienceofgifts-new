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
  { title: 'Tabletop & Glassware', value: 'Tabletop & Glassware' },
  { title: 'Kitchen & Pantry', value: 'Kitchen & Pantry' },
  { title: 'Tea & Coffee Rituals', value: 'Tea & Coffee Rituals' },
  { title: 'Keepsakes & Stationery', value: 'Keepsakes & Stationery' },
  { title: 'Home & Textiles', value: 'Home & Textiles' },
  { title: 'Games & Gathering', value: 'Games & Gathering' },
  { title: 'Print & Custom Art', value: 'Print & Custom Art' },
];

export const INTEREST_OPTIONS: SanityTitledOption<string>[] = [
  { title: 'Coffee & Tea', value: 'Coffee & Tea' },
  { title: 'Cooking & Hosting', value: 'Cooking & Hosting' },
  { title: 'Home Decor', value: 'Home Decor' },
  { title: 'Cozy Sanctuary', value: 'Cozy Sanctuary' },
  { title: 'Slow Mornings', value: 'Slow Mornings' },
  { title: 'Dinner Parties', value: 'Dinner Parties' },
  { title: 'Journaling & Reading', value: 'Journaling & Reading' },
  { title: 'Gardening', value: 'Gardening' },
  { title: 'Board Games', value: 'Board Games' },
];

export const INTEREST_SLUG_OPTIONS: SanityTitledOption<string>[] = [
  { title: 'Coffee & Tea (coffee-and-tea)', value: 'coffee-and-tea' },
  { title: 'Cooking & Hosting (cooking-and-hosting)', value: 'cooking-and-hosting' },
  { title: 'Home Decor (home-decor)', value: 'home-decor' },
  { title: 'Cozy Sanctuary (cozy-sanctuary)', value: 'cozy-sanctuary' },
  { title: 'Slow Mornings (slow-mornings)', value: 'slow-mornings' },
  { title: 'Dinner Parties (dinner-parties)', value: 'dinner-parties' },
  { title: 'Journaling & Reading (journaling-and-reading)', value: 'journaling-and-reading' },
  { title: 'Gardening (gardening)', value: 'gardening' },
  { title: 'Board Games (board-games)', value: 'board-games' },
];

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
