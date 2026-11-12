import { RECIPIENT_SPOTLIGHTS } from '../data/catalog';
import {
  Article,
  ArticleTopicId,
  Author,
  BudgetTier,
  DirectoryOrCategorySEOEntry,
  EditorialHubBudgetBracket,
  EditorialHubConfig,
  EditorialHubProductSelection,
  EditorialHubRelationshipPathway,
  GiftGuide,
  OccasionType,
  Product,
  RecipientSpotlight,
  RecipientType,
  ResearchCitation,
  SEOConfig,
} from '../types/content';
import {
  CatalogDataOverride,
  EditorialHubReadinessEvaluation,
  calculateArticleReadingTime,
  calculateArticleWordCount,
  evaluateEditorialHubReadiness,
} from '../utils/seoAndValidation';
import { hasValidNumericPrice } from '../utils/giftFinderEngine';
import {
  CategoryIconKey,
  resolveCategoryIconKey,
  slugifyCategoryKey,
} from '../config/navigationConfig';
import { LocalCMSContentStore, SiteSettingsDocument } from './cmsContentStore';

export interface EnrichedGiftGuide {
  guide: GiftGuide;
  author?: Author;
  referencedProducts: Product[];
  totalRecommendationsCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  priceRangeSummary: string;
  recipients: RecipientType[];
  occasions: OccasionType[];
  interests: string[];
  budgetTiers: BudgetTier[];
  topics: string[];
}

export interface RecipientDiscoveryItem {
  recipient: RecipientType;
  slug: string;
  label: string;
  shortLabel: string;
  description: string;
  iconKey: CategoryIconKey;
  matchingGuides: EnrichedGiftGuide[];
  matchingProducts: Product[];
  productCount: number;
  finderHref: string;
  archiveHref: string;
  seo?: Partial<SEOConfig>;
}

export interface InterestDiscoveryItem {
  interest: string;
  slug: string;
  label: string;
  description: string;
  iconKey: CategoryIconKey;
  matchingGuides: EnrichedGiftGuide[];
  matchingProducts: Product[];
  productCount: number;
  finderHref: string;
  archiveHref: string;
  seo?: Partial<SEOConfig>;
}

export interface OccasionDiscoveryItem {
  occasion: OccasionType;
  slug: string;
  label: string;
  description: string;
  iconKey: CategoryIconKey;
  matchingGuides: EnrichedGiftGuide[];
  matchingProducts: Product[];
  productCount: number;
  finderHref: string;
  archiveHref: string;
  seo?: Partial<SEOConfig>;
}

export interface BudgetDiscoveryItem {
  id: string;
  label: string;
  rangeSummary: string;
  description: string;
  iconKey: CategoryIconKey;
  minPrice: number | null;
  maxPrice: number | null;
  productCount: number;
  matchingGuides: EnrichedGiftGuide[];
  finderHref: string;
}

export interface EnrichedArticle {
  article: Article;
  author?: Author;
  readTimeMinutes: number;
  wordCount: number;
  citationCount: number;
  topics: ArticleTopicId[];
  topicLabels: string[];
  relatedGuides: EnrichedGiftGuide[];
}

export interface ArticleTopicDiscoveryItem {
  id: string;
  slug: string;
  label: string;
  description: string;
  iconKey: CategoryIconKey;
  matchingArticles: EnrichedArticle[];
  archiveHref: string;
  seo?: Partial<SEOConfig>;
}

export interface EnrichedEditorialHubRelationship {
  pathway: EditorialHubRelationshipPathway;
  iconKey: CategoryIconKey;
  archiveHref: string;
  giftFinderHref: string;
  matchingGuideCount: number;
  matchingProductCount: number;
}

export interface EnrichedEditorialHubBudget {
  bracket: EditorialHubBudgetBracket;
  iconKey: CategoryIconKey;
  matchingProductCount: number;
  matchingGuideCount: number;
  featuredGuide?: EnrichedGiftGuide;
}

export interface EnrichedEditorialHubProductPick {
  product: Product;
  selection: EditorialHubProductSelection;
  featuredGuide?: EnrichedGiftGuide;
  guideAppearancesCount: number;
}

export interface EnrichedEditorialHub {
  hub: EditorialHubConfig;
  readiness: EditorialHubReadinessEvaluation;
  relationships: EnrichedEditorialHubRelationship[];
  interests: InterestDiscoveryItem[];
  budgets: EnrichedEditorialHubBudget[];
  occasions: OccasionDiscoveryItem[];
  leadFeaturedGuide: EnrichedGiftGuide | null;
  supportingFeaturedGuides: EnrichedGiftGuide[];
  allCuratedGuides: EnrichedGiftGuide[];
  curatedProducts: EnrichedEditorialHubProductPick[];
  relatedArticles: EnrichedArticle[];
  recipientArchives: RecipientDiscoveryItem[];
  companionHub?: EditorialHubConfig;
}

export const RECIPIENT_TAXONOMY_META: Record<
  RecipientType,
  { label: string; shortLabel: string; description: string }
> = {
  partner: {
    label: 'Partners & Spouses',
    shortLabel: 'Partners',
    description:
      'Intimate, tactile upgrades for shared mornings, bedside tables, and anniversaries.',
  },
  parent: {
    label: 'Parents & In-Laws',
    shortLabel: 'Parents',
    description:
      'Warm, usefulness-first gifts for the people who insist they already have everything.',
  },
  friend: {
    label: 'Close Friends',
    shortLabel: 'Friends',
    description:
      'Personal, unpretentious finds that celebrate shared rituals and inside jokes.',
  },
  host: {
    label: 'Dinner & Weekend Hosts',
    shortLabel: 'Hosts',
    description:
      'Self-contained tabletop and morning-after treats that create zero extra work at the door.',
  },
  coworker: {
    label: 'Coworkers, Teachers & Mentors',
    shortLabel: 'Coworkers & Mentors',
    description:
      'Desk-ready and universally welcoming appreciation gifts with thoughtful polish.',
  },
  kids: {
    label: 'Kids & Families',
    shortLabel: 'Kids & Families',
    description:
      'Screen-free craft kits, nature presses, and multi-generational table games.',
  },
};

export const OCCASION_TAXONOMY_META: Record<
  OccasionType,
  { label: string; description: string }
> = {
  birthday: {
    label: 'Birthdays',
    description:
      'Personal upgrades tailored to their daily habits rather than generic gift baskets.',
  },
  housewarming: {
    label: 'Housewarming',
    description:
      'Tactile home, kitchen, and tabletop pieces that make a new space feel settled.',
  },
  'thank-you': {
    label: 'Host & Appreciation Gifts',
    description:
      'Gracious thank-you gestures for dinner hosts, weekend stays, teachers, and mentors.',
  },
  anniversary: {
    label: 'Anniversaries',
    description:
      'Enduring keepsakes and shared rituals that mark another year together.',
  },
  holidays: {
    label: 'Winter Holidays',
    description:
      'Cozy, crowd-pleasing objects built for candlelit evenings and family gatherings.',
  },
  'just-because': {
    label: 'Just Because',
    description:
      'Modest, unexpected weekday gestures that show someone you were thinking of them.',
  },
};

export const INTEREST_TAXONOMY_DESCRIPTIONS: Record<string, string> = {
  'Coffee & Tea':
    'Hand-thrown matcha bowls, stoneware pour-overs, and quiet morning brewing rituals.',
  'Cooking & Hosting':
    'Small-batch pantry flights, French butter crocks, and tools for joyful home cooks.',
  'Home Decor':
    'Hand-blown bedside glass, solid brass desk weights, and timeless room accents.',
  'Cozy Sanctuary':
    'Heirloom wool throws, apiary beeswax tapers, and unhurried evening comfort.',
  'Slow Mornings':
    'Everyday objects that turn the first fifteen minutes of the day into a calm ritual.',
  'Dinner Parties':
    'Conversation decks, tasting flights, and tabletop pieces that spark connection.',
  'Journaling & Reading':
    'Five-year memory books, fountain-pen-friendly paper, and bedside reading companions.',
  Gardening:
    'Self-watering terracotta herb trios and botanical presses for indoor plant lovers.',
  'Board Games':
    'Solid walnut travel games and screen-free tabletop strategy for two.',
};

export const ARTICLE_TOPIC_META: Record<
  ArticleTopicId,
  { label: string; description: string }
> = {
  'gift-giving-psychology': {
    label: 'Gift-Giving Psychology',
    description:
      'Empirical behavioral research on why givers and receivers evaluate gifts differently.',
  },
  relationships: {
    label: 'Relationships & Connection',
    description:
      'How everyday objects and shared experiences strengthen long-term relational warmth.',
  },
  'decision-making': {
    label: 'Decision-Making',
    description:
      'Mental models for overcoming choice paralysis and avoiding the "unwrapping trap."',
  },
  'gift-etiquette': {
    label: 'Gift Etiquette',
    description:
      'Modern, gracious norms for dinner parties, weekend hosts, and awkward gifting moments.',
  },
  'practical-gifting-advice': {
    label: 'Practical Gifting Advice',
    description:
      'Actionable checklists and questions to ask before choosing a gift at any budget.',
  },
  culture: {
    label: 'Culture & Rituals',
    description:
      'Observations on domestic craft, hospitality traditions, and why we keep what we keep.',
  },
};

export const DEFAULT_DIRECTORY_SEO_ENTRIES: Record<
  string,
  DirectoryOrCategorySEOEntry
> = {
  '/gift-guides/': {
    slug: 'gift-guides',
    routePath: '/gift-guides/',
    title: 'Gift Guides',
    subtitle:
      'Thoughtful ideas for the people in your life, organized by what they love, who they are, and the occasions worth celebrating.',
    status: 'published',
    seo: {
      seoTitle:
        'Gift Guides — Curated Ideas by Recipient, Interest & Occasion | Science of Gifts',
      metaDescription:
        'Explore Science of Gifts editorial gift guides organized by recipient, interest, occasion, and budget ($18 to $150+).',
      canonicalPath: '/gift-guides/',
      ogType: 'website',
      schemaType: 'CollectionPage',
    },
  },
  '/articles/': {
    slug: 'articles',
    routePath: '/articles/',
    title: 'Stories',
    subtitle:
      'Curious observations, useful advice, and the psychology behind why we give, choose, and remember gifts.',
    status: 'published',
    seo: {
      seoTitle:
        'Stories — The Psychology & Etiquette of Thoughtful Giving | Science of Gifts',
      metaDescription:
        'Read behavioral psychology essays, modern hosting etiquette, and practical frameworks for choosing meaningful gifts on Science of Gifts.',
      canonicalPath: '/articles/',
      ogType: 'website',
      schemaType: 'CollectionPage',
    },
  },
  '/gift-finder/': {
    slug: 'gift-finder',
    routePath: '/gift-finder/',
    title: 'Interactive Gift Finder',
    subtitle:
      'Filter our canonical catalog by recipient, relationship, budget tier, occasion, and personality archetype—or describe who you are shopping for in plain English.',
    status: 'published',
    seo: {
      seoTitle:
        'Interactive Gift Finder — Filter by Recipient, Budget & Personality | Science of Gifts',
      metaDescription:
        'Use the Science of Gifts Interactive Gift Finder to discover research-backed gifts by recipient, occasion, personality trait, and budget ($18 to $150+).',
      canonicalPath: '/gift-finder/',
      ogType: 'website',
      schemaType: 'CollectionPage',
    },
  },
};

export const INITIAL_EDITORIAL_HUBS: Record<string, EditorialHubConfig> = {
  'gifts-for-men': {
    id: 'hub_gifts_for_him',
    slug: 'gifts-for-men',
    routePath: '/gifts-for-men/',
    legacyProductionPaths: ['/gifts-for-men/'],
    plannedRedirectMappings: [],
    title: 'Gifts for Him',
    editorialKicker: 'Editorial Discovery Hub · Gifts for Him',
    subtitle:
      'Thoughtful everyday objects, quiet morning rituals, kitchen craft, and enduring keepsakes—organized by who he is to you, what he enjoys, and how he actually spends his days.',
    editorialLeadParagraphs: [
      'Shopping for the men in your life is hardest when gift guides treat every father, husband, brother, and friend as a single stereotype. Most people do not actually want another novelty whiskey stone set or engraved desk gadget that ends up in a hallway drawer by January.',
      'Instead, we organize this hub around the way thoughtful gifting actually works in practice: start with your relationship, look closely at one or two routines he genuinely enjoys—from morning coffee or sourdough baking to weeknight board games and evening reading—and choose a well-made object or consumable that upgrades that habit without adding clutter.',
    ],
    editorialPositioning:
      'Broad search entry point designed around real relationships, daily habits, and concrete interests rather than generic novelty clichés.',
    heroImage: {
      url: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1400&q=80',
      alt: 'Warm linen-wrapped gift parcels, ceramic vessels, and natural twine arranged on a sunlit wooden table',
      caption:
        'The strongest gifts for him rarely rely on spectacle; they fit effortlessly into the first or last hour of his day.',
      isSampleAsset: true,
    },
    status: 'draft',
    seo: {
      seoTitle:
        'Gifts for Him — Thoughtful Ideas for Dads, Husbands, Boyfriends & Brothers | Science of Gifts',
      metaDescription:
        'Explore thoughtful gifts for him—from dads and husbands to boyfriends, brothers, grandfathers, and close friends—organized by interest, occasion, and budget ($18 to $115+).',
      canonicalPath: '/gifts-for-men/',
      ogType: 'website',
      schemaType: 'CollectionPage',
      noindex: true,
      indexing: 'noindex,follow',
    },
    relationshipPathways: [
      {
        id: 'him-dad',
        label: 'For Dad & Fathers-in-Law',
        shortLabel: 'Dad',
        relationshipSlug: 'dad',
        iconKey: 'users',
        description:
          'Clutter-free pantry flights, warm lambswool throws, and countertop upgrades for fathers who insist they already have everything.',
        recipientFilter: 'parent',
        recipientArchiveHref: '/gift-guides/recipients/parent/',
        giftFinderHref: '/gift-finder/?recipient=parent',
      },
      {
        id: 'him-husband',
        label: 'For a Husband or Spouse',
        shortLabel: 'Husband',
        relationshipSlug: 'husband',
        iconKey: 'heart',
        description:
          'Garment-washed Turkish cotton robes, custom night-sky star charts, and tactile upgrades for shared mornings and anniversaries.',
        recipientFilter: 'partner',
        recipientArchiveHref: '/gift-guides/recipients/partner/',
        giftFinderHref: '/gift-finder/?recipient=partner&occasion=anniversary',
      },
      {
        id: 'him-boyfriend',
        label: 'For a Boyfriend or Partner',
        shortLabel: 'Boyfriend',
        relationshipSlug: 'boyfriend',
        iconKey: 'heart-handshake',
        description:
          'Hand-blown bedside glassware, wheel-thrown matcha studios, and personal keepsakes that celebrate shared routines.',
        recipientFilter: 'partner',
        recipientArchiveHref: '/gift-guides/recipients/partner/',
        giftFinderHref: '/gift-finder/?recipient=partner',
      },
      {
        id: 'him-brother',
        label: 'For a Brother or Brother-in-Law',
        shortLabel: 'Brother',
        relationshipSlug: 'brother',
        iconKey: 'user-round',
        description:
          'Small-batch chili crisp and wildflower honey flights, inlaid walnut travel backgammon sets, and unpretentious kitchen craft.',
        recipientFilter: 'friend',
        recipientArchiveHref: '/gift-guides/recipients/friend/',
        giftFinderHref: '/gift-finder/?recipient=friend',
      },
      {
        id: 'him-grandpa',
        label: 'For Grandpa & Grandfathers',
        shortLabel: 'Grandpa',
        relationshipSlug: 'grandpa',
        iconKey: 'landmark',
        description:
          'Five-year daily memory journals, letterpress family recipe cards, and brushed merino reading throws steeped in family stories.',
        recipientFilter: 'parent',
        recipientArchiveHref: '/gift-guides/recipients/parent/',
        giftFinderHref: '/gift-finder/?recipient=parent&trait=nostalgic-sentimental',
      },
      {
        id: 'him-friends',
        label: 'For Male Friends & Hosts',
        shortLabel: 'Male Friends',
        relationshipSlug: 'male-friends',
        iconKey: 'utensils',
        description:
          'Self-contained dinner party gifts, stoneware butter crocks, and tabletop games for close friends, neighbors, and weekend hosts.',
        recipientFilter: 'friend',
        recipientArchiveHref: '/gift-guides/recipients/friend/',
        giftFinderHref: '/gift-finder/?recipient=friend',
      },
    ],
    interestSlugs: [
      'coffee-and-tea',
      'cooking-and-hosting',
      'cozy-sanctuary',
      'journaling-and-reading',
      'home-decor',
      'slow-mornings',
      'gardening',
      'board-games',
    ],
    budgetBrackets: [
      {
        id: 'him-under-25',
        label: 'Under $25',
        priceRangeLabel: 'Up to $25 USD',
        maxPrice: 25,
        description:
          'Best-in-class small objects: French stoneware butter keepers ($24), letterpress recipe cards ($22), and raw apiary beeswax tapers ($18).',
        giftFinderHref: '/gift-finder/?maxPrice=25',
        featuredGuideId: 'guide_little_things_2026',
      },
      {
        id: 'him-25-to-50',
        label: '$25 to $50',
        priceRangeLabel: '$25–$50 USD',
        minPrice: 25,
        maxPrice: 50,
        description:
          'Our signature everyday-upgrade sweet spot: hand-blown bedside carafes ($48), chili-crisp tasting flights ($38), and five-year linen journals ($28).',
        giftFinderHref: '/gift-finder/?minPrice=25&maxPrice=50',
        featuredGuideId: 'guide_little_things_2026',
      },
      {
        id: 'him-50-to-100',
        label: '$50 to $100',
        priceRangeLabel: '$50–$100 USD',
        minPrice: 50,
        maxPrice: 100,
        description:
          'Generous birthday and milestone gifts: wheel-thrown Kyoto matcha sets ($58), walnut roll-up backgammon boards ($84), and Turkish cotton robes ($98).',
        giftFinderHref: '/gift-finder/?minPrice=50&maxPrice=100',
        featuredGuideId: 'guide_hosts_and_gatherings_2026',
      },
      {
        id: 'him-100-plus',
        label: '$100 and Above',
        priceRangeLabel: '$100+ USD',
        minPrice: 100,
        description:
          'Heirloom textiles and flagship keepsakes—such as brushed merino lambswool reading throws ($115)—built for major milestones and winter holidays.',
        giftFinderHref: '/gift-finder/?minPrice=100',
        featuredGuideId: 'guide_little_things_2026',
      },
    ],
    occasionKeys: [
      'birthday',
      'holidays',
      'anniversary',
      'housewarming',
      'thank-you',
      'just-because',
    ],
    curatedGuideIds: [
      'guide_little_things_2026',
      'guide_hosts_and_gatherings_2026',
    ],
    featuredProductIds: [
      'prod_fluted_bedside_carafe_09',
      'prod_chili_honey_flight_01',
      'prod_olivewood_board_game_05',
      'prod_cloud_waffle_robe_02',
      'prod_french_butter_crock_12',
      'prod_kyoto_matcha_bowl_03',
    ],
    curatedProductPicks: [
      {
        productId: 'prod_fluted_bedside_carafe_09',
        selectionSource: 'editorial-curation',
        editorialNote:
          'Turns the universal habit of keeping water on a nightstand or study desk into a clean, dust-free borosilicate glass ritual.',
        bestForRelationship: 'Husbands, Boyfriends & Design-Loving Friends',
        featuredGuideId: 'guide_little_things_2026',
      },
      {
        productId: 'prod_chili_honey_flight_01',
        selectionSource: 'editorial-curation',
        editorialNote:
          'Three small-batch condiment and wildflower honey jars that bring immediate culinary excitement with zero permanent shelf clutter.',
        bestForRelationship: 'Dads, Brothers & Dinner Hosts',
        featuredGuideId: 'guide_hosts_and_gatherings_2026',
      },
      {
        productId: 'prod_olivewood_board_game_05',
        selectionSource: 'editorial-curation',
        editorialNote:
          'Weighted stone pips, solid brass dice cups, and a roll-up Belgian linen board built for cabin weekends and unhurried evenings.',
        bestForRelationship: 'Brothers, Partners & Close Friends',
        featuredGuideId: 'guide_hosts_and_gatherings_2026',
      },
      {
        productId: 'prod_cloud_waffle_robe_02',
        selectionSource: 'editorial-curation',
        editorialNote:
          'Garment-washed Turkish cotton honeycomb weave that breathes comfortably year-round without the bulk of heavy hotel terrycloth.',
        bestForRelationship: 'Husbands, Partners & Milestone Birthdays',
        featuredGuideId: 'guide_little_things_2026',
      },
      {
        productId: 'prod_french_butter_crock_12',
        selectionSource: 'editorial-curation',
        editorialNote:
          'Uses a simple cold-water seal to keep butter soft and spreadable for morning sourdough toast—proof that $24 can upgrade every single morning.',
        bestForRelationship: 'Home Cooks, Dads & Hosts Under $25',
        featuredGuideId: 'guide_little_things_2026',
      },
      {
        productId: 'prod_kyoto_matcha_bowl_03',
        selectionSource: 'editorial-curation',
        editorialNote:
          'A complete wheel-thrown stoneware chawan, 100-prong bamboo whisk, and ceremonial Uji matcha tin ready to whisk on day one.',
        bestForRelationship: 'Tea Drinkers, Remote Workers & Brothers',
        featuredGuideId: 'guide_little_things_2026',
      },
    ],
    finderCta: {
      kicker: 'Interactive Gift Discovery',
      heading: 'Still Not Sure What to Choose for Him?',
      body: 'Skip the guesswork and narrow our catalog by his exact relationship to you, a strict maximum budget, the occasion, or the daily rituals he enjoys most.',
      primaryLabel: 'Open the Gift Finder',
      primaryHref: '/gift-finder/',
      secondaryLabel: 'Take the 5-Step Guided Quiz',
      secondaryHref: '/gift-finder/?mode=quiz',
      presetLinks: [
        {
          label: 'Gifts for Dad Under $50',
          href: '/gift-finder/?recipient=parent&maxPrice=50',
        },
        {
          label: 'Partner & Anniversary Ideas',
          href: '/gift-finder/?recipient=partner&occasion=anniversary',
        },
        {
          label: 'Practical Everyday Upgrades',
          href: '/gift-finder/?trait=everyday-ritual',
        },
        {
          label: 'Food & Hosting Finds',
          href: '/gift-finder/?interest=Cooking%20%26%20Hosting',
        },
      ],
    },
    buyingAdvice: [
      {
        id: 'him-advice-habit',
        heading: 'Anchor the Gift in His First or Last Hour of the Day',
        body: 'Skip novelty barware and look at what he touches between 7:00 a.m. and 8:30 a.m. or right before sleep—a coffee or tea vessel, a stoneware butter keeper for morning toast, a bedside water carafe, or a breathable cotton robe.',
      },
      {
        id: 'him-advice-practical-vs-novelty',
        heading: 'Why Practical Craft Consistently Beats Novelty Gadgets',
        body: 'Behavioral research on the "smile-seeking" trap (Yang & Urminsky, 2018) shows givers often chase a ten-second laugh at unwrapping, while recipients judge gifts over months of actual use. A quiet upgrade made of honest materials—stoneware, linen, brass, or beeswax—earns lasting appreciation.',
      },
      {
        id: 'him-advice-consumables',
        heading: 'When He Says "I Don’t Need Anything," Choose Consumables or Shared Rituals',
        body: 'When a father, grandfather, or minimalist partner insists his shelves are full, take him at his word. Choose either a high-craft edible flight he can enjoy over a month or a tabletop game designed for shared evenings together.',
      },
      {
        id: 'him-advice-budget-scale',
        heading: 'Match the Budget to Relationship Closeness, Not Performance',
        body: 'Studies by Flynn & Adams (2009) confirm that spending more rarely increases gratitude on its own. A $24 French butter crock chosen for someone who bakes sourdough feels far more observant than a generic $100 luxury box.',
      },
    ],
    relatedArticleIds: [
      'art_price_vs_thoughtfulness_2026',
      'art_bring_nothing_host_2026',
    ],
    companionHubSlug: 'gifts-for-women',
    minimumRequiredGuides: 3,
    minimumRequiredProducts: 8,
  },
  'gifts-for-women': {
    id: 'hub_gifts_for_her',
    slug: 'gifts-for-women',
    routePath: '/gifts-for-women/',
    legacyProductionPaths: ['/gifts-for-women/'],
    plannedRedirectMappings: [],
    title: 'Gifts for Her',
    editorialKicker: 'Editorial Discovery Hub · Gifts for Her',
    subtitle:
      'Warm ceramic vessels, slow-morning textiles, personal keepsakes, and culinary treats—organized around her actual routines, interests, and relationship to you.',
    editorialLeadParagraphs: [
      'The best gifts for the women in your life never look like a generic department-store "for her" display. Pre-packaged lotion baskets and vague seasonal gift boxes fail because they could be handed to anyone—and therefore feel personal to no one.',
      'We built this editorial hub to help you shop with specificity instead: begin with how you know her—whether she is your mother, wife, girlfriend, sister, grandmother, or closest friend—and pair that relationship with a tangible ritual she loves, from quiet morning tea and gardening to dinner parties and handwritten family recipes.',
    ],
    editorialPositioning:
      'Broad search entry point organized around relationship closeness, specific interests, and everyday utility rather than generic department-store sets.',
    heroImage: {
      url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1400&q=80',
      alt: 'Linen-bound journal, ceramic cup, and warm botanical details resting on a calm morning table',
      caption:
        'An observant gift tied to a specific shared memory or morning habit always outlasts an impersonal luxury gesture.',
      isSampleAsset: true,
    },
    status: 'draft',
    seo: {
      seoTitle:
        'Gifts for Her — Thoughtful Ideas for Moms, Wives, Girlfriends & Sisters | Science of Gifts',
      metaDescription:
        'Discover thoughtful gifts for her—for moms, wives, girlfriends, sisters, grandmothers, and close friends—curated by daily ritual, interest, occasion, and budget ($18 to $115+).',
      canonicalPath: '/gifts-for-women/',
      ogType: 'website',
      schemaType: 'CollectionPage',
      noindex: true,
      indexing: 'noindex,follow',
    },
    relationshipPathways: [
      {
        id: 'her-mom',
        label: 'For Mom & Mothers-in-Law',
        shortLabel: 'Mom',
        relationshipSlug: 'mom',
        iconKey: 'users',
        description:
          'Clutter-free artisan tastings, heirloom cotton recipe cards, and brushed merino wool throws for mothers who say they have everything.',
        recipientFilter: 'parent',
        recipientArchiveHref: '/gift-guides/recipients/parent/',
        giftFinderHref: '/gift-finder/?recipient=parent',
      },
      {
        id: 'her-wife',
        label: 'For a Wife or Spouse',
        shortLabel: 'Wife',
        relationshipSlug: 'wife',
        iconKey: 'heart',
        description:
          'Custom night-sky constellation prints in white oak, cloud-waffle Turkish cotton robes, and heirloom keepsakes for anniversaries and milestones.',
        recipientFilter: 'partner',
        recipientArchiveHref: '/gift-guides/recipients/partner/',
        giftFinderHref: '/gift-finder/?recipient=partner&occasion=anniversary',
      },
      {
        id: 'her-girlfriend',
        label: 'For a Girlfriend or Partner',
        shortLabel: 'Girlfriend',
        relationshipSlug: 'girlfriend',
        iconKey: 'heart-handshake',
        description:
          'Jewel-toned bedside glassware, spouted Kyoto matcha bowls, and five-year daily time-capsule journals that celebrate shared routines.',
        recipientFilter: 'partner',
        recipientArchiveHref: '/gift-guides/recipients/partner/',
        giftFinderHref: '/gift-finder/?recipient=partner',
      },
      {
        id: 'her-sister',
        label: 'For a Sister or Sister-in-Law',
        shortLabel: 'Sister',
        relationshipSlug: 'sister',
        iconKey: 'user-round',
        description:
          'Self-watering terracotta herb trios, Belgian linen memory books, and small-batch kitchen favorites with personal warmth.',
        recipientFilter: 'friend',
        recipientArchiveHref: '/gift-guides/recipients/friend/',
        giftFinderHref: '/gift-finder/?recipient=friend',
      },
      {
        id: 'her-grandma',
        label: 'For Grandma & Grandmothers',
        shortLabel: 'Grandma',
        relationshipSlug: 'grandma',
        iconKey: 'landmark',
        description:
          'Botanical letterpress recipe cards with your handwriting inside, merino lambswool reading throws, and unscented beeswax candlelight.',
        recipientFilter: 'parent',
        recipientArchiveHref: '/gift-guides/recipients/parent/',
        giftFinderHref: '/gift-finder/?recipient=parent&trait=nostalgic-sentimental',
      },
      {
        id: 'her-friends',
        label: 'For Female Friends & Hosts',
        shortLabel: 'Female Friends',
        relationshipSlug: 'female-friends',
        iconKey: 'utensils',
        description:
          'Zero-chore dinner host gifts, stoneware French butter keepers, and thoughtful weekday tokens for close friends and neighbors.',
        recipientFilter: 'friend',
        recipientArchiveHref: '/gift-guides/recipients/friend/',
        giftFinderHref: '/gift-finder/?recipient=friend',
      },
    ],
    interestSlugs: [
      'coffee-and-tea',
      'cooking-and-hosting',
      'cozy-sanctuary',
      'journaling-and-reading',
      'home-decor',
      'slow-mornings',
      'gardening',
      'board-games',
    ],
    budgetBrackets: [
      {
        id: 'her-under-25',
        label: 'Under $25',
        priceRangeLabel: 'Up to $25 USD',
        maxPrice: 25,
        description:
          'Small, tactile pleasures crafted from honest materials: cotton rag recipe cards ($22), raw apiary beeswax tapers ($18), and stoneware butter crocks ($24).',
        giftFinderHref: '/gift-finder/?maxPrice=25',
        featuredGuideId: 'guide_little_things_2026',
      },
      {
        id: 'her-25-to-50',
        label: '$25 to $50',
        priceRangeLabel: '$25–$50 USD',
        minPrice: 25,
        maxPrice: 50,
        description:
          'Memorable everyday rituals: hand-blown two-tone bedside carafes ($48), self-watering windowsill herb trios ($45), and five-year linen journals ($28).',
        giftFinderHref: '/gift-finder/?minPrice=25&maxPrice=50',
        featuredGuideId: 'guide_little_things_2026',
      },
      {
        id: 'her-50-to-100',
        label: '$50 to $100',
        priceRangeLabel: '$50–$100 USD',
        minPrice: 50,
        maxPrice: 100,
        description:
          'Generous gifts for birthdays, partners, and hosts: Kyoto matcha sets ($58), custom framed star maps ($68), and Turkish cotton waffle robes ($98).',
        giftFinderHref: '/gift-finder/?minPrice=50&maxPrice=100',
        featuredGuideId: 'guide_hosts_and_gatherings_2026',
      },
      {
        id: 'her-100-plus',
        label: '$100 and Above',
        priceRangeLabel: '$100+ USD',
        minPrice: 100,
        description:
          'Heirloom textiles and lasting keepsakes—led by our brushed merino lambswool reading throw ($115)—for milestone celebrations.',
        giftFinderHref: '/gift-finder/?minPrice=100',
        featuredGuideId: 'guide_little_things_2026',
      },
    ],
    occasionKeys: [
      'birthday',
      'holidays',
      'anniversary',
      'housewarming',
      'thank-you',
      'just-because',
    ],
    curatedGuideIds: [
      'guide_little_things_2026',
      'guide_hosts_and_gatherings_2026',
    ],
    featuredProductIds: [
      'prod_fluted_bedside_carafe_09',
      'prod_cloud_waffle_robe_02',
      'prod_kyoto_matcha_bowl_03',
      'prod_five_year_memory_book_08',
      'prod_custom_star_map_04',
      'prod_wool_picnic_throw_13',
    ],
    curatedProductPicks: [
      {
        productId: 'prod_fluted_bedside_carafe_09',
        selectionSource: 'editorial-curation',
        editorialNote:
          'Hand-blown in rippled coastal blue and seafoam mint borosilicate glass; catches morning sunlight while keeping bedside water dust-free.',
        bestForRelationship: 'Wives, Girlfriends, Sisters & Close Friends',
        featuredGuideId: 'guide_little_things_2026',
      },
      {
        productId: 'prod_cloud_waffle_robe_02',
        selectionSource: 'editorial-curation',
        editorialNote:
          'Garment-washed Turkish cotton honeycomb weave that feels airy, soft, and broken-in from the very first slow Sunday morning.',
        bestForRelationship: 'Wives, Partners & Moms',
        featuredGuideId: 'guide_little_things_2026',
      },
      {
        productId: 'prod_kyoto_matcha_bowl_03',
        selectionSource: 'editorial-curation',
        editorialNote:
          'Pairs a spouted wheel-thrown ceramic chawan with a bamboo whisk and shade-grown Uji matcha so her morning ritual is complete out of the box.',
        bestForRelationship: 'Sisters, Best Friends & Tea Lovers',
        featuredGuideId: 'guide_little_things_2026',
      },
      {
        productId: 'prod_five_year_memory_book_08',
        selectionSource: 'editorial-curation',
        editorialNote:
          'A low-pressure three-line daily time capsule bound in Belgian linen that takes thirty seconds before sleep and builds five years of memories.',
        bestForRelationship: 'Best Friends, Sisters & New Parents',
        featuredGuideId: 'guide_little_things_2026',
      },
      {
        productId: 'prod_custom_star_map_04',
        selectionSource: 'editorial-curation',
        editorialNote:
          'Maps the exact alignment of constellations overhead on a meaningful date and place, archival-printed on cotton rag paper in solid white oak.',
        bestForRelationship: 'Wives, Girlfriends & Milestone Anniversaries',
        featuredGuideId: 'guide_little_things_2026',
      },
      {
        productId: 'prod_wool_picnic_throw_13',
        selectionSource: 'editorial-curation',
        editorialNote:
          'Generously sized herringbone merino lambswool reading throw that brings heirloom warmth to reading chairs and winter living rooms.',
        bestForRelationship: 'Moms, Grandmothers & Milestone Celebrations',
        featuredGuideId: 'guide_little_things_2026',
      },
    ],
    finderCta: {
      kicker: 'Interactive Gift Discovery',
      heading: 'Still Not Sure What to Choose for Her?',
      body: 'Use our interactive Gift Finder to filter by her exact relationship to you, your target budget, the occasion, or the everyday rituals she loves most.',
      primaryLabel: 'Open the Gift Finder',
      primaryHref: '/gift-finder/',
      secondaryLabel: 'Take the 5-Step Guided Quiz',
      secondaryHref: '/gift-finder/?mode=quiz',
      presetLinks: [
        {
          label: 'Gifts for Mom Under $50',
          href: '/gift-finder/?recipient=parent&maxPrice=50',
        },
        {
          label: 'Wife & Anniversary Keepsakes',
          href: '/gift-finder/?recipient=partner&occasion=anniversary',
        },
        {
          label: 'Slow Morning & Tea Rituals',
          href: '/gift-finder/?interest=Coffee%20%26%20Tea',
        },
        {
          label: 'Sentimental & Personal Finds',
          href: '/gift-finder/?trait=nostalgic-sentimental',
        },
      ],
    },
    buyingAdvice: [
      {
        id: 'her-advice-specificity',
        heading: 'Trade Generic Luxury Sets for Personal Specificity',
        body: 'Behavioral research shows that an observant $28 gift tied to a specific shared memory or morning habit consistently outperforms a generic $120 department-store gift box.',
      },
      {
        id: 'her-advice-sentimental-courage',
        heading: 'Don’t Shy Away From Sentimental Keepsakes When You Have Shared History',
        body: 'Studies by Givi & Galak (2017) reveal that givers avoid sentimental gifts far too often out of self-consciousness, even though close friends, partners, and mothers rank personal keepsakes—like handwritten recipe cards or a custom star map—as their most treasured items.',
      },
      {
        id: 'her-advice-zero-chore',
        heading: 'Make Sure the Gift Creates Zero Extra Chores',
        body: 'Just as uncut flowers force a busy dinner host to hunt for a vase at the door, an incomplete ritual gift leaves homework behind. Choose sets that arrive complete—like beeswax tapers with their own stoneware holder or a matcha bowl paired with the whisk and tea.',
      },
      {
        id: 'her-advice-shared-ritual',
        heading: 'Consider Objects That Spark Shared Moments Together',
        body: 'Research by Chan & Mogilner (2017) demonstrates that gifts connected to lived experiences and shared rituals—morning tea, Sunday sourdough, or a two-player travel board game—deepen relationship closeness long after the occasion passes.',
      },
    ],
    relatedArticleIds: [
      'art_price_vs_thoughtfulness_2026',
      'art_bring_nothing_host_2026',
    ],
    companionHubSlug: 'gifts-for-men',
    minimumRequiredGuides: 3,
    minimumRequiredProducts: 8,
  },
};

/**
 * Clean CMS Data-Access Boundary (`contentRepository`)
 *
 * All Astro pages (`src/pages/**`) and interactive islands consume data through this
 * repository boundary rather than importing static arrays from `src/data/catalog.ts`.
 *
 * Phase 1 (Current): Reads from `LocalCMSContentStore` seeded with the verified development dataset.
 * Phase 2 (Future Sanity Cutover): Swaps implementation to execute `GROQ_QUERIES` via `@sanity/client`
 * without modifying any Astro route or React island component signatures.
 */
const defaultStore = new LocalCMSContentStore(true);

export function createContentRepository(store: LocalCMSContentStore = defaultStore) {
  const customCategorySeoOverrides: Record<string, Partial<SEOConfig>> = {};
  const directorySeoEntries: Record<string, DirectoryOrCategorySEOEntry> =
    structuredClone(DEFAULT_DIRECTORY_SEO_ENTRIES);
  const editorialHubs: Record<string, EditorialHubConfig> = structuredClone(
    INITIAL_EDITORIAL_HUBS
  );

  return {
    getStore(): LocalCMSContentStore {
      return store;
    },

    getCatalogSnapshot(options?: {
      includeDrafts?: boolean;
    }): CatalogDataOverride {
      const raw = store.getCatalogSnapshot();
      if (options?.includeDrafts) {
        return raw;
      }
      const publishedProducts = Object.fromEntries(
        Object.entries(raw.products ?? {}).filter(
          ([, prod]) => prod.status !== 'draft'
        )
      );
      const publishedGuides = (raw.guides ?? []).filter(
        (guide) => guide.status !== 'draft'
      );
      const publishedArticles = (raw.articles ?? []).filter(
        (article) => article.status !== 'draft'
      );
      return {
        products: publishedProducts,
        citations: raw.citations,
        authors: raw.authors,
        guides: publishedGuides,
        articles: publishedArticles,
      };
    },

    getSiteSettings(): SiteSettingsDocument {
      return store.getSiteSettings();
    },

    getAllProducts(options?: { includeDrafts?: boolean }): Product[] {
      const snapshot = store.getCatalogSnapshot();
      const all = Object.values(snapshot.products ?? {});
      if (options?.includeDrafts) return all;
      return all.filter((p) => p.status !== 'draft');
    },

    getProductsMap(options?: { includeDrafts?: boolean }): Record<string, Product> {
      const list = this.getAllProducts(options);
      return Object.fromEntries(list.map((p) => [p.id, p]));
    },

    getProductById(
      productId: string,
      options?: { includeDrafts?: boolean }
    ): Product | undefined {
      const prod = store.getProductById(productId);
      if (!prod) return undefined;
      if (!options?.includeDrafts && prod.status === 'draft') return undefined;
      return prod;
    },

    getProductBySlug(
      slug: string,
      options?: { includeDrafts?: boolean }
    ): Product | undefined {
      return this.getAllProducts(options).find((p) => p.slug === slug);
    },

    getAllGiftGuides(options?: { includeDrafts?: boolean }): GiftGuide[] {
      const snapshot = store.getCatalogSnapshot();
      const all = snapshot.guides ?? [];
      if (options?.includeDrafts) return all;
      return all.filter((g) => g.status !== 'draft');
    },

    getGiftGuideBySlug(
      slug: string,
      options?: { includeDrafts?: boolean }
    ): GiftGuide | undefined {
      const guide = store.getGiftGuideBySlug(slug);
      if (!guide) return undefined;
      if (!options?.includeDrafts && guide.status === 'draft') return undefined;
      return guide;
    },

    getAllArticles(options?: { includeDrafts?: boolean }): Article[] {
      const snapshot = store.getCatalogSnapshot();
      const all = snapshot.articles ?? [];
      if (options?.includeDrafts) return all;
      return all.filter((a) => a.status !== 'draft');
    },

    getArticleBySlug(
      slug: string,
      options?: { includeDrafts?: boolean }
    ): Article | undefined {
      const article = store.getArticleBySlug(slug);
      if (!article) return undefined;
      if (!options?.includeDrafts && article.status === 'draft') return undefined;
      return article;
    },

    getDirectorySeoEntry(routePath: string): DirectoryOrCategorySEOEntry | undefined {
      const entry = directorySeoEntries[routePath];
      return entry ? structuredClone(entry) : undefined;
    },

    setDirectoryOrCategorySeoOverride(
      routePath: string,
      seoOverride: Partial<SEOConfig>
    ): void {
      if (directorySeoEntries[routePath]) {
        directorySeoEntries[routePath] = {
          ...directorySeoEntries[routePath],
          seo: {
            ...directorySeoEntries[routePath].seo,
            ...seoOverride,
          },
        };
      } else {
        customCategorySeoOverrides[routePath] = {
          ...customCategorySeoOverrides[routePath],
          ...seoOverride,
        };
      }
    },

    getAllEditorialHubs(options?: {
      includeDrafts?: boolean;
    }): EditorialHubConfig[] {
      const all = Object.values(editorialHubs).map((h) => structuredClone(h));
      if (options?.includeDrafts) return all;
      return all.filter((h) => h.status !== 'draft');
    },

    getEditorialHubBySlug(
      slug: string,
      options?: { includeDrafts?: boolean }
    ): EditorialHubConfig | undefined {
      const aliasMap: Record<string, string> = {
        'gifts-for-him': 'gifts-for-men',
        'gifts-for-her': 'gifts-for-women',
      };
      const resolvedSlug = editorialHubs[slug]
        ? slug
        : aliasMap[slug] ?? slug;
      const hub = editorialHubs[resolvedSlug];
      if (!hub) return undefined;
      if (!options?.includeDrafts && hub.status === 'draft') return undefined;
      return structuredClone(hub);
    },

    upsertEditorialHub(hub: EditorialHubConfig): EditorialHubConfig {
      editorialHubs[hub.slug] = structuredClone(hub);
      return structuredClone(hub);
    },

    /**
     * Returns only editorial hubs that are BOTH published AND pass all quantitative
     * and qualitative publication readiness checks (`isReadyToPublish && isIndexable`).
     * Used by public directories, sitemaps, and navigation so thin/draft hubs never leak into public menus.
     */
    getPublishedReadyEditorialHubs(): EditorialHubConfig[] {
      const catalog = this.getCatalogSnapshot({ includeDrafts: false });
      return Object.values(editorialHubs)
        .filter((hub) => {
          const readiness = evaluateEditorialHubReadiness(hub, catalog);
          return readiness.isReadyToPublish && readiness.isIndexable;
        })
        .map((h) => structuredClone(h));
    },

    /**
     * Enriches an EditorialHubConfig with resolved relationship counts, interest categories,
     * verified budget counts (never counting unknown-price items as under-budget),
     * occasion discovery items, curated guides, curated products with provenance,
     * related stories, and publication readiness evaluation.
     */
    getEnrichedEditorialHub(
      slug: string,
      options?: { includeDrafts?: boolean }
    ): EnrichedEditorialHub | undefined {
      const hub = this.getEditorialHubBySlug(slug, options);
      if (!hub) return undefined;

      const catalog = this.getCatalogSnapshot({ includeDrafts: false });
      const readiness = evaluateEditorialHubReadiness(hub, catalog);
      const guidesDir = this.getGiftGuidesDirectoryData();
      const articlesDir = this.getArticlesDirectoryData();
      const allPublishedProducts = this.getAllProducts({ includeDrafts: false });
      const productsMap = this.getProductsMap({ includeDrafts: false });

      // 1. Enrich Relationship Pathways with real archive links and catalog counts
      const relationships: EnrichedEditorialHubRelationship[] =
        hub.relationshipPathways.map((pathway) => {
          const recipientArchive = guidesDir.recipientDiscovery.find(
            (r) => r.recipient === pathway.recipientFilter
          );
          const archiveHref =
            pathway.recipientArchiveHref ??
            pathway.archiveHref ??
            recipientArchive?.archiveHref ??
            `/gift-guides/recipients/${pathway.recipientFilter ?? 'parent'}/`;
          const iconKey =
            (pathway.iconKey as CategoryIconKey | undefined) ??
            resolveCategoryIconKey(
              'recipient',
              pathway.recipientFilter ?? 'parent'
            );
          return {
            pathway,
            iconKey,
            archiveHref,
            giftFinderHref: pathway.giftFinderHref,
            matchingGuideCount: recipientArchive?.matchingGuides.length ?? 0,
            matchingProductCount: recipientArchive?.productCount ?? 0,
          };
        });

      // 2. Enrich Browse by Interest — only categories supported by actual published content
      const configuredInterests = hub.interestSlugs
        .map((interestSlug) =>
          guidesDir.interestDiscovery.find((i) => i.slug === interestSlug)
        )
        .filter((item): item is InterestDiscoveryItem => Boolean(item));
      const interests =
        configuredInterests.length > 0
          ? configuredInterests
          : guidesDir.interestDiscovery;

      // 3. Enrich Browse by Budget — strictly count only products with valid finite numeric prices > 0
      const validPricedProducts = allPublishedProducts.filter((p) =>
        hasValidNumericPrice(p)
      );
      const budgets: EnrichedEditorialHubBudget[] = hub.budgetBrackets
        .map((bracket) => {
          const matchingProducts = validPricedProducts.filter((p) => {
            if (bracket.minPrice !== undefined && p.price < bracket.minPrice) {
              return false;
            }
            if (bracket.maxPrice !== undefined && p.price > bracket.maxPrice) {
              return false;
            }
            return true;
          });
          const matchingGuides = guidesDir.allGuides.filter((g) =>
            g.referencedProducts.some(
              (p) =>
                hasValidNumericPrice(p) &&
                (bracket.minPrice === undefined || p.price >= bracket.minPrice) &&
                (bracket.maxPrice === undefined || p.price <= bracket.maxPrice)
            )
          );
          const featuredGuide = bracket.featuredGuideId
            ? guidesDir.allGuides.find(
                (g) => g.guide.id === bracket.featuredGuideId
              )
            : undefined;
          return {
            bracket,
            iconKey: resolveCategoryIconKey('budget', bracket.id),
            matchingProductCount: matchingProducts.length,
            matchingGuideCount: matchingGuides.length,
            featuredGuide,
          };
        })
        .filter(
          (b) => b.matchingProductCount > 0 || b.matchingGuideCount > 0
        );

      // 4. Enrich Browse by Occasion — backed by real published occasion archives
      const requestedOccasions: OccasionType[] =
        hub.occasionKeys && hub.occasionKeys.length > 0
          ? hub.occasionKeys
          : [
              'birthday',
              'holidays',
              'anniversary',
              'housewarming',
              'thank-you',
              'just-because',
            ];
      const occasions: OccasionDiscoveryItem[] = requestedOccasions
        .map((occKey) =>
          guidesDir.occasionDiscovery.find((o) => o.occasion === occKey)
        )
        .filter((o): o is OccasionDiscoveryItem => Boolean(o));

      // 5. Enrich Featured Editorial Gift Guides without duplication
      const allCuratedGuides: EnrichedGiftGuide[] = Array.from(
        new Set(hub.curatedGuideIds)
      )
        .map((guideId) =>
          guidesDir.allGuides.find((g) => g.guide.id === guideId)
        )
        .filter((g): g is EnrichedGiftGuide => Boolean(g));
      const leadFeaturedGuide = allCuratedGuides[0] ?? null;
      const supportingFeaturedGuides = allCuratedGuides.slice(1);

      // 6. Enrich Featured Individual Gifts with provenance (editorial-curation vs catalog-match)
      const selectionEntries: EditorialHubProductSelection[] =
        hub.curatedProductPicks && hub.curatedProductPicks.length > 0
          ? hub.curatedProductPicks
          : hub.featuredProductIds.map((productId) => ({
              productId,
              selectionSource: 'editorial-curation' as const,
            }));

      const seenProductIds = new Set<string>();
      const curatedProducts: EnrichedEditorialHubProductPick[] = [];
      for (const selection of selectionEntries) {
        if (seenProductIds.has(selection.productId)) continue;
        const product = productsMap[selection.productId];
        if (!product) continue;
        seenProductIds.add(selection.productId);

        const appearances = this.getProductGuideAppearances(product.id);
        const primaryGuide = selection.featuredGuideId
          ? guidesDir.allGuides.find(
              (g) => g.guide.id === selection.featuredGuideId
            )
          : appearances[0]
          ? guidesDir.allGuides.find(
              (g) => g.guide.id === appearances[0].guide.id
            )
          : undefined;

        curatedProducts.push({
          product,
          selection,
          featuredGuide: primaryGuide,
          guideAppearancesCount: appearances.length,
        });
      }

      // 7. Enrich Related Editorial Stories
      const requestedArticleIds = hub.relatedArticleIds ?? [];
      const relatedArticles: EnrichedArticle[] =
        requestedArticleIds.length > 0
          ? requestedArticleIds
              .map((artId) =>
                articlesDir.allArticles.find((a) => a.article.id === artId)
              )
              .filter((a): a is EnrichedArticle => Boolean(a))
          : articlesDir.allArticles.slice(0, 2);

      // 8. Companion Hub
      const companionHub = hub.companionHubSlug
        ? this.getEditorialHubBySlug(hub.companionHubSlug, {
            includeDrafts: options?.includeDrafts ?? true,
          })
        : undefined;

      return {
        hub,
        readiness,
        relationships,
        interests,
        budgets,
        occasions,
        leadFeaturedGuide,
        supportingFeaturedGuides,
        allCuratedGuides,
        curatedProducts,
        relatedArticles,
        recipientArchives: guidesDir.recipientDiscovery,
        companionHub,
      };
    },

    getAuthorById(authorId: string): Author | undefined {
      const snapshot = store.getCatalogSnapshot();
      return snapshot.authors?.[authorId];
    },

    getAuthorsMap(): Record<string, Author> {
      const snapshot = store.getCatalogSnapshot();
      return snapshot.authors ?? {};
    },

    getCitationsMap(): Record<string, ResearchCitation> {
      const snapshot = store.getCatalogSnapshot();
      return snapshot.citations ?? {};
    },

  getRecipientSpotlights(): RecipientSpotlight[] {
    return structuredClone(RECIPIENT_SPOTLIGHTS);
  },

  getGuidesFeaturingProduct(productId: string): GiftGuide[] {
    return this.getAllGiftGuides().filter(
      (g) =>
        g.editorsPick.productId === productId ||
        g.quickPicks.some((qp) => qp.productId === productId) ||
        g.sections.some((s) =>
          s.recommendations.some((r) => r.productId === productId)
        )
    );
  },

  getProductGuideAppearances(productId: string): Array<{
    guide: GiftGuide;
    isEditorsPick: boolean;
    awardLabel?: string;
    sectionTitle?: string;
    sectionId?: string;
    editorialHeadline?: string;
    whyWeChoseIt?: string;
    bestFor?: string;
    considerations?: string;
  }> {
    const guides = this.getGuidesFeaturingProduct(productId);
    return guides.map((guide) => {
      const isEditorsPick = guide.editorsPick.productId === productId;
      const quickPick = guide.quickPicks.find((qp) => qp.productId === productId);
      let matchedSectionTitle: string | undefined;
      let matchedSectionId: string | undefined;
      let matchedRec: GiftGuide['sections'][number]['recommendations'][number] | undefined;

      for (const sec of guide.sections) {
        const rec = sec.recommendations.find((r) => r.productId === productId);
        if (rec) {
          matchedSectionTitle = sec.title;
          matchedSectionId = sec.id;
          matchedRec = rec;
          break;
        }
      }

      return {
        guide,
        isEditorsPick,
        awardLabel:
          (isEditorsPick ? guide.editorsPick.awardLabel : undefined) ??
          matchedRec?.awardLabel ??
          quickPick?.label,
        sectionTitle: isEditorsPick ? 'Featured Editor’s Pick' : matchedSectionTitle,
        sectionId: isEditorsPick ? 'editors-pick' : matchedSectionId ?? 'quick-picks',
        editorialHeadline: isEditorsPick
          ? guide.editorsPick.editorialHeadline
          : matchedRec?.editorialHook,
        whyWeChoseIt: isEditorsPick
          ? guide.editorsPick.whyItStoodOut
          : matchedRec?.whyWeChoseIt ?? quickPick?.reason,
        bestFor: isEditorsPick
          ? guide.editorsPick.whoItFitsBest
          : matchedRec?.whoItsBestFor ?? quickPick?.bestFor,
        considerations: isEditorsPick
          ? guide.editorsPick.practicalNotes
          : matchedRec?.keepInMind,
      };
    });
  },

  /**
   * Resolves a single parent GiftGuide for a Product breadcrumb ONLY when there is
   * an unambiguous primary guide relationship (either the product appears in exactly
   * one guide, or it is the featured Editor's Pick of a single guide).
   */
  resolvePrimaryGuideForProduct(productId: string): GiftGuide | undefined {
    const appearances = this.getProductGuideAppearances(productId);
    if (appearances.length === 1) {
      return appearances[0].guide;
    }
    const editorsPickAppearances = appearances.filter((a) => a.isEditorsPick);
    if (editorsPickAppearances.length === 1) {
      return editorsPickAppearances[0].guide;
    }
    return undefined;
  },

  getSimilarProductComparisons(product: Product): Array<{
    product: Product;
    comparisonAngle: string;
    summary: string;
  }> {
    const productsMap = this.getProductsMap();
    if (product.similarGiftComparisons && product.similarGiftComparisons.length > 0) {
      return product.similarGiftComparisons
        .map((item) => {
          const target = productsMap[item.productId];
          if (!target || target.id === product.id) return null;
          return {
            product: target,
            comparisonAngle: item.comparisonAngle,
            summary: item.summary,
          };
        })
        .filter((x): x is { product: Product; comparisonAngle: string; summary: string } => Boolean(x));
    }

    // Fallback comparative recommendations based on genuine catalog relationships
    const candidates = Object.values(productsMap).filter((p) => p.id !== product.id);
    const scored = candidates
      .map((candidate) => {
        const sharedRecipients = candidate.recipients.filter((r) =>
          product.recipients.includes(r)
        ).length;
        const sharedOccasions = candidate.occasions.filter((o) =>
          product.occasions.includes(o)
        ).length;
        return {
          candidate,
          score: sharedRecipients * 2 + sharedOccasions,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return scored.map(({ candidate }) => {
      const priceDiff = candidate.price - product.price;
      const comparisonAngle =
        priceDiff < -5
          ? `Lower-Budget Alternative ($${candidate.price})`
          : priceDiff > 15
          ? `Higher-Budget Upgrade ($${candidate.price})`
          : `${candidate.productType} Alternative ($${candidate.price})`;
      return {
        product: candidate,
        comparisonAngle,
        summary: `${candidate.whyToGiveIt}`,
      };
    });
  },

  getArticlesFeaturingProduct(productId: string): Article[] {
    return this.getAllArticles().filter((a) =>
      a.sections.some(
        (s) =>
          (s.contextualProducts?.productIds ?? []).includes(productId) ||
          (s.recommendedProductIds ?? []).includes(productId)
      )
    );
  },

  /**
   * Enriches a GiftGuide with resolved author, canonical product references,
   * price range bounds, and structured taxonomy relationships.
   */
  enrichGiftGuide(guide: GiftGuide): EnrichedGiftGuide {
    const productsMap = this.getProductsMap();
    const author = this.getAuthorById(guide.authorId);

    const sectionProductIds = guide.sections.flatMap((s) =>
      s.recommendations.map((r) => r.productId)
    );
    const uniqueProductIds = Array.from(
      new Set([
        guide.editorsPick.productId,
        ...guide.quickPicks.map((qp) => qp.productId),
        ...sectionProductIds,
      ])
    );

    const referencedProducts = uniqueProductIds
      .map((id) => productsMap[id])
      .filter((p): p is Product => Boolean(p));

    const validPrices = referencedProducts
      .map((p) => p.price)
      .filter((price) => Number.isFinite(price) && price > 0);

    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
    const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : null;
    const priceRangeSummary =
      minPrice !== null && maxPrice !== null
        ? minPrice === maxPrice
          ? `$${minPrice}`
          : `$${minPrice}–$${maxPrice}`
        : 'Varied budgets';

    const recipients: RecipientType[] =
      guide.recipients && guide.recipients.length > 0
        ? guide.recipients
        : Array.from(
            new Set([
              ...(guide.recipientPathways
                ?.map((p) => p.recipientFilter)
                .filter((r): r is RecipientType => Boolean(r)) ?? []),
              ...referencedProducts.flatMap((p) => p.recipients),
            ])
          );

    const occasions: OccasionType[] =
      guide.occasions && guide.occasions.length > 0
        ? guide.occasions
        : Array.from(new Set(referencedProducts.flatMap((p) => p.occasions)));

    const interests: string[] =
      guide.interests && guide.interests.length > 0
        ? guide.interests
        : Array.from(new Set(referencedProducts.flatMap((p) => p.interests)));

    const derivedBudgetTiers = new Set<BudgetTier>(guide.budgetTiers ?? []);
    for (const p of referencedProducts) {
      if (p.price <= 25) derivedBudgetTiers.add('under-25');
      if (p.price <= 50) derivedBudgetTiers.add('under-50');
      if (p.price >= 25 && p.price <= 75) derivedBudgetTiers.add('25-to-75');
      if (p.price >= 50 && p.price <= 100) derivedBudgetTiers.add('50-to-100');
      if (p.price > 75) derivedBudgetTiers.add('over-75');
      if (p.price >= 100) derivedBudgetTiers.add('100-plus');
    }

    const topics =
      guide.topics && guide.topics.length > 0 ? guide.topics : [guide.category];

    return {
      guide,
      author,
      referencedProducts,
      totalRecommendationsCount: new Set(sectionProductIds).size || referencedProducts.length,
      minPrice,
      maxPrice,
      priceRangeSummary,
      recipients,
      occasions,
      interests,
      budgetTiers: Array.from(derivedBudgetTiers),
      topics,
    };
  },

  /**
   * Returns complete, repository-driven directory data for `/gift-guides/`.
   * Automatically scales as guides and products are added to the store.
   */
  getGiftGuidesDirectoryData(): {
    allGuides: EnrichedGiftGuide[];
    primaryFeaturedGuide: EnrichedGiftGuide | null;
    supportingFeaturedGuides: EnrichedGiftGuide[];
    recipientDiscovery: RecipientDiscoveryItem[];
    interestDiscovery: InterestDiscoveryItem[];
    occasionDiscovery: OccasionDiscoveryItem[];
    budgetDiscovery: BudgetDiscoveryItem[];
    totalCanonicalProductsCount: number;
  } {
    const rawGuides = this.getAllGiftGuides();
    const allProducts = this.getAllProducts();

    const allGuides = rawGuides
      .map((g) => this.enrichGiftGuide(g))
      .sort((a, b) => {
        if (Boolean(a.guide.featured) !== Boolean(b.guide.featured)) {
          return a.guide.featured ? -1 : 1;
        }
        return b.guide.updatedAt.localeCompare(a.guide.updatedAt);
      });

    const explicitlyFeatured = allGuides.filter((g) => g.guide.featured);
    const primaryFeaturedGuide =
      explicitlyFeatured[0] ?? allGuides[0] ?? null;
    const supportingFeaturedGuides =
      explicitlyFeatured.length > 1 ? explicitlyFeatured.slice(1, 3) : [];

    // D. Browse by Recipient — only recipients supported by actual catalog products or guides
    const recipientOrder: RecipientType[] = [
      'parent',
      'partner',
      'friend',
      'host',
      'coworker',
      'kids',
    ];
    const recipientDiscovery: RecipientDiscoveryItem[] = recipientOrder
      .map((recipient) => {
        const meta = RECIPIENT_TAXONOMY_META[recipient] ?? {
          label: recipient,
          shortLabel: recipient,
          description: `Thoughtful gifts curated for ${recipient}.`,
        };
        const matchingGuides = allGuides.filter((g) =>
          g.recipients.includes(recipient)
        );
        const matchingProducts = allProducts.filter((p) =>
          p.recipients.includes(recipient)
        );
        const slug = slugifyCategoryKey(recipient);
        const archiveHref = `/gift-guides/recipients/${slug}/`;
        return {
          recipient,
          slug,
          label: meta.label,
          shortLabel: meta.shortLabel,
          description: meta.description,
          iconKey: resolveCategoryIconKey('recipient', recipient),
          matchingGuides,
          matchingProducts,
          productCount: matchingProducts.length,
          finderHref: `/gift-finder/?recipient=${recipient}`,
          archiveHref,
          seo: {
            seoTitle: `Gifts for ${meta.label} — Curated Gift Guides & Ideas | Science of Gifts`,
            metaDescription: `${meta.description} Explore ${matchingGuides.length} editorial gift ${matchingGuides.length === 1 ? 'guide' : 'guides'} and ${matchingProducts.length} curated gifts for ${meta.label.toLowerCase()}.`,
            canonicalPath: archiveHref,
            ogType: 'website' as const,
            schemaType: 'CollectionPage' as const,
            ...customCategorySeoOverrides[archiveHref],
          },
        };
      })
      .filter((item) => item.productCount > 0 || item.matchingGuides.length > 0);

    // E. Browse by Interest — derived from actual guide & product interest metadata
    const candidateInterests = Array.from(
      new Set([
        ...allGuides.flatMap((g) => g.interests),
        ...allProducts.flatMap((p) => p.interests),
      ])
    );
    const interestDiscovery: InterestDiscoveryItem[] = candidateInterests
      .map((interest) => {
        const matchingGuides = allGuides.filter((g) =>
          g.interests.includes(interest)
        );
        const matchingProducts = allProducts.filter((p) =>
          p.interests.includes(interest)
        );
        const slug = slugifyCategoryKey(interest);
        const archiveHref = `/gift-guides/interests/${slug}/`;
        const desc =
          INTEREST_TAXONOMY_DESCRIPTIONS[interest] ??
          `Thoughtful gifts and objects selected for people who enjoy ${interest.toLowerCase()}.`;
        return {
          interest,
          slug,
          label: interest,
          description: desc,
          iconKey: resolveCategoryIconKey('interest', interest),
          matchingGuides,
          matchingProducts,
          productCount: matchingProducts.length,
          finderHref: `/gift-finder/?interest=${encodeURIComponent(interest)}`,
          archiveHref,
          seo: {
            seoTitle: `${interest} Gifts — Curated Guides & Favorite Objects | Science of Gifts`,
            metaDescription: `${desc} Browse ${matchingProducts.length} curated ${interest.toLowerCase()} gifts and editorial buying guides.`,
            canonicalPath: archiveHref,
            ogType: 'website' as const,
            schemaType: 'CollectionPage' as const,
            ...customCategorySeoOverrides[archiveHref],
          },
        };
      })
      .filter((item) => item.productCount > 0 || item.matchingGuides.length > 0)
      .sort((a, b) => {
        if (b.matchingGuides.length !== a.matchingGuides.length) {
          return b.matchingGuides.length - a.matchingGuides.length;
        }
        return b.productCount - a.productCount;
      })
      .slice(0, 8);

    // F. Browse by Occasion — derived from actual guide & product occasion metadata
    const occasionOrder: OccasionType[] = [
      'birthday',
      'housewarming',
      'thank-you',
      'anniversary',
      'holidays',
      'just-because',
    ];
    const occasionDiscovery: OccasionDiscoveryItem[] = occasionOrder
      .map((occasion) => {
        const meta = OCCASION_TAXONOMY_META[occasion] ?? {
          label: occasion,
          description: `Thoughtful gifts suited for ${occasion}.`,
        };
        const matchingGuides = allGuides.filter((g) =>
          g.occasions.includes(occasion)
        );
        const matchingProducts = allProducts.filter((p) =>
          p.occasions.includes(occasion)
        );
        const slug = slugifyCategoryKey(occasion);
        const archiveHref = `/gift-guides/occasions/${slug}/`;
        return {
          occasion,
          slug,
          label: meta.label,
          description: meta.description,
          iconKey: resolveCategoryIconKey('occasion', occasion),
          matchingGuides,
          matchingProducts,
          productCount: matchingProducts.length,
          finderHref: `/gift-finder/?occasion=${occasion}`,
          archiveHref,
          seo: {
            seoTitle: `${meta.label} Gift Ideas & Editorial Guides | Science of Gifts`,
            metaDescription: `${meta.description} Discover ${matchingProducts.length} curated gifts and editorial guides for ${meta.label.toLowerCase()}.`,
            canonicalPath: archiveHref,
            ogType: 'website' as const,
            schemaType: 'CollectionPage' as const,
            ...customCategorySeoOverrides[archiveHref],
          },
        };
      })
      .filter((item) => item.productCount > 0 || item.matchingGuides.length > 0);

    // G. Browse by Budget — verified Gift Finder budget URLs & exact catalog counts
    const validPricedProducts = allProducts.filter(
      (p) => Number.isFinite(p.price) && p.price > 0
    );
    const budgetConfigs: Array<{
      id: string;
      tierKey: BudgetTier;
      label: string;
      rangeSummary: string;
      description: string;
      minPrice: number | null;
      maxPrice: number | null;
      finderHref: string;
      predicate: (price: number) => boolean;
    }> = [
      {
        id: 'under-25',
        tierKey: 'under-25',
        label: 'Under $25',
        rangeSummary: 'Up to $25 USD',
        description:
          'Small, tactile weekday pleasures, apiary candles, and table-ready host tokens.',
        minPrice: null,
        maxPrice: 25,
        finderHref: '/gift-finder/?maxPrice=25',
        predicate: (price) => price <= 25,
      },
      {
        id: 'under-50',
        tierKey: 'under-50',
        label: 'Under $50',
        rangeSummary: 'Up to $50 USD',
        description:
          'Our signature sweet spot: hand-blown glassware, stoneware crocks, and daily rituals.',
        minPrice: null,
        maxPrice: 50,
        finderHref: '/gift-finder/?maxPrice=50',
        predicate: (price) => price <= 50,
      },
      {
        id: '50-to-100',
        tierKey: '50-to-100',
        label: '$50 to $100',
        rangeSummary: '$50–$100 USD',
        description:
          'Generous milestone, birthday, and housewarming gifts crafted to last for years.',
        minPrice: 50,
        maxPrice: 100,
        finderHref: '/gift-finder/?minPrice=50&maxPrice=100',
        predicate: (price) => price >= 50 && price <= 100,
      },
      {
        id: '100-plus',
        tierKey: '100-plus',
        label: '$100 and Above',
        rangeSummary: '$100+ USD',
        description:
          'Heirloom textiles and flagship keepsakes for close partners, parents, and major occasions.',
        minPrice: 100,
        maxPrice: null,
        finderHref: '/gift-finder/?minPrice=100',
        predicate: (price) => price >= 100,
      },
    ];

    const budgetDiscovery: BudgetDiscoveryItem[] = budgetConfigs
      .map((cfg) => {
        const productCount = validPricedProducts.filter((p) =>
          cfg.predicate(p.price)
        ).length;
        const matchingGuides = allGuides.filter((g) =>
          g.referencedProducts.some((p) => cfg.predicate(p.price))
        );
        return {
          id: cfg.id,
          label: cfg.label,
          rangeSummary: cfg.rangeSummary,
          description: cfg.description,
          iconKey: resolveCategoryIconKey('budget', cfg.id),
          minPrice: cfg.minPrice,
          maxPrice: cfg.maxPrice,
          productCount,
          matchingGuides,
          finderHref: cfg.finderHref,
        };
      })
      .filter((item) => item.productCount > 0);

    return {
      allGuides,
      primaryFeaturedGuide,
      supportingFeaturedGuides,
      recipientDiscovery,
      interestDiscovery,
      occasionDiscovery,
      budgetDiscovery,
      totalCanonicalProductsCount: allProducts.length,
    };
  },

  /**
   * Enriches an Article with resolved author, reading time, word count,
   * topic metadata, and related guides.
   */
  enrichArticle(article: Article): EnrichedArticle {
    const author = this.getAuthorById(article.authorId);
    const readTimeMinutes =
      article.readTimeMinutes ?? calculateArticleReadingTime(article);
    const wordCount = calculateArticleWordCount(article);
    const citationCount = article.citationIds.length;

    const topics: ArticleTopicId[] =
      article.topics && article.topics.length > 0
        ? article.topics
        : article.category.toLowerCase().includes('etiquette')
        ? ['gift-etiquette', 'practical-gifting-advice']
        : ['gift-giving-psychology', 'relationships'];

    const topicLabels = topics.map(
      (t) => ARTICLE_TOPIC_META[t]?.label ?? t
    );

    const allGuides = this.getAllGiftGuides();
    const relatedGuides = (article.relatedGuideIds ?? [])
      .map((id) => allGuides.find((g) => g.id === id))
      .filter((g): g is GiftGuide => Boolean(g))
      .map((g) => this.enrichGiftGuide(g));

    return {
      article,
      author,
      readTimeMinutes,
      wordCount,
      citationCount,
      topics,
      topicLabels,
      relatedGuides,
    };
  },

  /**
   * Returns complete, repository-driven directory data for `/articles/` (Stories).
   * Automatically scales as articles are added to the store.
   */
  getArticlesDirectoryData(): {
    allArticles: EnrichedArticle[];
    featuredArticle: EnrichedArticle | null;
    recentArticles: EnrichedArticle[];
    topicDiscovery: ArticleTopicDiscoveryItem[];
    relatedGuides: EnrichedGiftGuide[];
  } {
    const rawArticles = this.getAllArticles();
    const allArticles = rawArticles
      .map((a) => this.enrichArticle(a))
      .sort((a, b) => {
        if (Boolean(a.article.featured) !== Boolean(b.article.featured)) {
          return a.article.featured ? -1 : 1;
        }
        return b.article.publishedAt.localeCompare(a.article.publishedAt);
      });

    const featuredArticle =
      allArticles.find((a) => a.article.featured) ?? allArticles[0] ?? null;

    // Recent stories excluding the lead featured story so we never artificially duplicate it
    const recentArticles = featuredArticle
      ? allArticles.filter((a) => a.article.id !== featuredArticle.article.id)
      : [];

    // Collect all topics present on articles in deterministic order (including any custom topics)
    const defaultTopicOrder: string[] = [
      'gift-giving-psychology',
      'relationships',
      'decision-making',
      'gift-etiquette',
      'practical-gifting-advice',
      'culture',
    ];
    const allTopicIds = Array.from(
      new Set([...defaultTopicOrder, ...allArticles.flatMap((a) => a.topics)])
    );

    const topicDiscovery: ArticleTopicDiscoveryItem[] = allTopicIds
      .map((topicId) => {
        const meta = ARTICLE_TOPIC_META[topicId as ArticleTopicId] ?? {
          label: topicId
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
          description: `Essays and behavioral insights on ${topicId.replace(/-/g, ' ')}.`,
        };
        const matchingArticles = allArticles.filter((a) =>
          (a.topics as string[]).includes(topicId)
        );
        const slug = slugifyCategoryKey(topicId);
        const archiveHref = `/articles/topics/${slug}/`;
        return {
          id: topicId,
          slug,
          label: meta.label,
          description: meta.description,
          iconKey: resolveCategoryIconKey('topic', topicId),
          matchingArticles,
          archiveHref,
          seo: {
            seoTitle: `${meta.label} — Stories & Behavioral Research | Science of Gifts`,
            metaDescription: meta.description,
            canonicalPath: archiveHref,
            ogType: 'website' as const,
            schemaType: 'CollectionPage' as const,
            ...customCategorySeoOverrides[archiveHref],
          },
        };
      })
      .filter((item) => item.matchingArticles.length > 0);

    const relatedGuidesMap = new Map<string, EnrichedGiftGuide>();
    for (const art of allArticles) {
      for (const rg of art.relatedGuides) {
        relatedGuidesMap.set(rg.guide.id, rg);
      }
    }
    if (relatedGuidesMap.size === 0) {
      for (const g of this.getAllGiftGuides()) {
        relatedGuidesMap.set(g.id, this.enrichGiftGuide(g));
      }
    }

    return {
      allArticles,
      featuredArticle,
      recentArticles,
      topicDiscovery,
      relatedGuides: Array.from(relatedGuidesMap.values()),
    };
  },

  getAllCategorySeoEntries(): DirectoryOrCategorySEOEntry[] {
    const guidesDir = this.getGiftGuidesDirectoryData();
    const articlesDir = this.getArticlesDirectoryData();
    const entries: DirectoryOrCategorySEOEntry[] = [];

    for (const r of guidesDir.recipientDiscovery) {
      entries.push({
        slug: r.slug,
        routePath: r.archiveHref,
        title: `Gifts for ${r.label}`,
        subtitle: r.description,
        seo: r.seo,
        status: 'published',
      });
    }
    for (const i of guidesDir.interestDiscovery) {
      entries.push({
        slug: i.slug,
        routePath: i.archiveHref,
        title: `Gifts for ${i.label} Lovers`,
        subtitle: i.description,
        seo: i.seo,
        status: 'published',
      });
    }
    for (const o of guidesDir.occasionDiscovery) {
      entries.push({
        slug: o.slug,
        routePath: o.archiveHref,
        title: `${o.label} Gift Ideas & Guides`,
        subtitle: o.description,
        seo: o.seo,
        status: 'published',
      });
    }
    for (const t of articlesDir.topicDiscovery) {
      entries.push({
        slug: t.slug,
        routePath: t.archiveHref,
        title: t.label,
        subtitle: t.description,
        seo: t.seo,
        status: 'published',
      });
    }
    return entries;
  },

  getRecipientCategoryArchive(slug: string): {
    category: RecipientDiscoveryItem;
    relatedCategories: RecipientDiscoveryItem[];
  } | undefined {
    const dir = this.getGiftGuidesDirectoryData();
    const category = dir.recipientDiscovery.find(
      (r) =>
        r.slug === slug ||
        `${r.slug}s` === slug ||
        slugifyCategoryKey(r.shortLabel) === slug
    );
    if (!category) return undefined;
    return {
      category,
      relatedCategories: dir.recipientDiscovery.filter(
        (r) => r.slug !== category.slug
      ),
    };
  },

  getInterestCategoryArchive(slug: string): {
    category: InterestDiscoveryItem;
    relatedCategories: InterestDiscoveryItem[];
  } | undefined {
    const dir = this.getGiftGuidesDirectoryData();
    const category = dir.interestDiscovery.find((i) => i.slug === slug);
    if (!category) return undefined;
    return {
      category,
      relatedCategories: dir.interestDiscovery.filter((i) => i.slug !== slug),
    };
  },

  getOccasionCategoryArchive(slug: string): {
    category: OccasionDiscoveryItem;
    relatedCategories: OccasionDiscoveryItem[];
  } | undefined {
    const dir = this.getGiftGuidesDirectoryData();
    const category = dir.occasionDiscovery.find((o) => o.slug === slug);
    if (!category) return undefined;
    return {
      category,
      relatedCategories: dir.occasionDiscovery.filter((o) => o.slug !== slug),
    };
  },

  getArticleTopicArchive(slug: string): {
    topic: ArticleTopicDiscoveryItem;
    relatedTopics: ArticleTopicDiscoveryItem[];
    companionGuides: EnrichedGiftGuide[];
  } | undefined {
    const dir = this.getArticlesDirectoryData();
    const topic = dir.topicDiscovery.find((t) => t.slug === slug);
    if (!topic) return undefined;
    return {
      topic,
      relatedTopics: dir.topicDiscovery.filter((t) => t.slug !== slug),
      companionGuides: dir.relatedGuides,
    };
  },
  };
}

export const contentRepository = createContentRepository(defaultStore);

