import { RECIPIENT_SPOTLIGHTS } from '../data/catalog';
import {
  Article,
  ArticleTopicId,
  Author,
  BudgetTier,
  DirectoryOrCategorySEOEntry,
  EditorialHubConfig,
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
  calculateArticleReadingTime,
  calculateArticleWordCount,
} from '../utils/seoAndValidation';
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
  'gifts-for-him': {
    id: 'hub_gifts_for_him',
    slug: 'gifts-for-him',
    routePath: '/gifts-for-him/',
    legacyProductionPaths: ['/gifts-for-men/'],
    plannedRedirectMappings: [
      {
        fromPath: '/gifts-for-men/',
        toPath: '/gifts-for-him/',
        statusCode: 301,
        applyOnLaunchOnly: true,
        reason:
          'Preserve existing live production URL /gifts-for-men/ by 301 redirecting to /gifts-for-him/ when the editorial hub launches (not applied until launch).',
      },
    ],
    title: 'Thoughtful Gifts for Him',
    subtitle:
      'Tactile everyday upgrades, morning coffee rituals, kitchen craft, and lasting objects organized by who he actually is and how he spends his days.',
    editorialPositioning:
      'Broad search entry point designed around real relationships, daily habits, and concrete interests rather than generic novelty clichés.',
    status: 'draft',
    seo: {
      seoTitle:
        'Thoughtful Gifts for Him — By Relationship, Routine & Budget | Science of Gifts',
      metaDescription:
        'Discover thoughtful gifts for fathers, husbands, partners, brothers, and close friends—organized by daily ritual, interest, and budget.',
      canonicalPath: '/gifts-for-him/',
      ogType: 'website',
      schemaType: 'CollectionPage',
      noindex: true,
      indexing: 'noindex,follow',
    },
    relationshipPathways: [
      {
        id: 'him-father',
        label: 'For Fathers & Fathers-in-Law',
        relationshipSlug: 'father',
        description:
          'High-craft consumables, morning ritual upgrades, and warm household pieces for dads who insist they need nothing.',
        recipientFilter: 'parent',
        giftFinderHref: '/gift-finder/?recipient=parent',
      },
      {
        id: 'him-partner',
        label: 'For a Husband or Partner',
        relationshipSlug: 'partner',
        description:
          'Personal keepsakes, bedside glassware, and breathable Turkish cotton comfort for shared routines.',
        recipientFilter: 'partner',
        giftFinderHref: '/gift-finder/?recipient=partner',
      },
      {
        id: 'him-brother-friend',
        label: 'For a Brother or Close Friend',
        relationshipSlug: 'friend',
        description:
          'Small-batch pantry flights, tabletop games, and everyday tools with character.',
        recipientFilter: 'friend',
        giftFinderHref: '/gift-finder/?recipient=friend',
      },
      {
        id: 'him-mentor-coworker',
        label: 'For a Mentor or Colleague',
        relationshipSlug: 'coworker',
        description:
          'Desk-ready brass companions, ceremonial tea sets, and polished thank-you gestures.',
        recipientFilter: 'coworker',
        giftFinderHref: '/gift-finder/?recipient=coworker',
      },
    ],
    interestSlugs: [
      'coffee-and-tea',
      'cooking-and-hosting',
      'cozy-home',
      'reading-and-writing',
      'gardening-and-nature',
      'games-and-gatherings',
    ],
    budgetBrackets: [
      {
        id: 'him-under-25',
        label: 'Under $25',
        priceRangeLabel: 'Up to $25 USD',
        maxPrice: 25,
        description:
          'French stoneware butter keepers, beeswax tapers, and tactile small upgrades.',
        giftFinderHref: '/gift-finder/?maxPrice=25',
      },
      {
        id: 'him-under-50',
        label: 'Under $50',
        priceRangeLabel: 'Up to $50 USD',
        maxPrice: 50,
        description:
          'Hand-blown bedside carafes, chili-crisp tasting flights, and five-year linen journals.',
        giftFinderHref: '/gift-finder/?maxPrice=50',
      },
      {
        id: 'him-50-to-100',
        label: '$50 to $100',
        priceRangeLabel: '$50–$100 USD',
        minPrice: 50,
        maxPrice: 100,
        description:
          'Wheel-thrown matcha studios, roll-up linen backgammon sets, and Turkish cotton robes.',
        giftFinderHref: '/gift-finder/?minPrice=50&maxPrice=100',
      },
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
    buyingAdvice: [
      {
        id: 'him-advice-habit',
        heading: 'Anchor the Gift in His First or Last Hour of the Day',
        body: 'Skip novelty barware and look at what he touches between 7:00 a.m. and 8:30 a.m. or right before sleep—a coffee vessel, a bedside carafe, or a comfortable robe.',
      },
    ],
    minimumRequiredGuides: 3,
    minimumRequiredProducts: 8,
  },
  'gifts-for-her': {
    id: 'hub_gifts_for_her',
    slug: 'gifts-for-her',
    routePath: '/gifts-for-her/',
    legacyProductionPaths: ['/gifts-for-women/'],
    plannedRedirectMappings: [
      {
        fromPath: '/gifts-for-women/',
        toPath: '/gifts-for-her/',
        statusCode: 301,
        applyOnLaunchOnly: true,
        reason:
          'Preserve existing live production URL /gifts-for-women/ by 301 redirecting to /gifts-for-her/ when the editorial hub launches (not applied until launch).',
      },
    ],
    title: 'Thoughtful Gifts for Her',
    subtitle:
      'Warm ceramic vessels, slow-morning textiles, personal keepsakes, and culinary treats organized around her actual rituals and relationships.',
    editorialPositioning:
      'Broad search entry point organized around relationship closeness, specific interests, and everyday utility rather than generic department-store sets.',
    status: 'draft',
    seo: {
      seoTitle:
        'Thoughtful Gifts for Her — By Relationship, Ritual & Budget | Science of Gifts',
      metaDescription:
        'Explore thoughtful gifts for mothers, wives, partners, sisters, and close friends—curated by everyday ritual, interest, and budget.',
      canonicalPath: '/gifts-for-her/',
      ogType: 'website',
      schemaType: 'CollectionPage',
      noindex: true,
      indexing: 'noindex,follow',
    },
    relationshipPathways: [
      {
        id: 'her-mother',
        label: 'For Mothers & Mothers-in-Law',
        relationshipSlug: 'mother',
        description:
          'Clutter-free artisan tastings, heirloom recipe cards, and merino wool throws for moms who say they have everything.',
        recipientFilter: 'parent',
        giftFinderHref: '/gift-finder/?recipient=parent',
      },
      {
        id: 'her-partner',
        label: 'For a Wife or Partner',
        relationshipSlug: 'partner',
        description:
          'Custom night-sky prints, garment-washed waffle robes, and jewel-toned bedside glassware.',
        recipientFilter: 'partner',
        giftFinderHref: '/gift-finder/?recipient=partner',
      },
      {
        id: 'her-sister-friend',
        label: 'For a Sister or Best Friend',
        relationshipSlug: 'friend',
        description:
          'Five-year daily memory journals, ceremonial matcha bowls, and shared kitchen rituals.',
        recipientFilter: 'friend',
        giftFinderHref: '/gift-finder/?recipient=friend',
      },
      {
        id: 'her-host-mentor',
        label: 'For a Gracious Host or Mentor',
        relationshipSlug: 'host',
        description:
          'Self-contained apiary beeswax tapers, stoneware butter crocks, and zero-chore thank-you gifts.',
        recipientFilter: 'host',
        giftFinderHref: '/gift-finder/?recipient=host',
      },
    ],
    interestSlugs: [
      'coffee-and-tea',
      'cooking-and-hosting',
      'cozy-home',
      'reading-and-writing',
      'gardening-and-nature',
      'games-and-gatherings',
    ],
    budgetBrackets: [
      {
        id: 'her-under-25',
        label: 'Under $25',
        priceRangeLabel: 'Up to $25 USD',
        maxPrice: 25,
        description:
          'Letterpress cotton recipe cards, apiary beeswax tapers, and stoneware butter keepers.',
        giftFinderHref: '/gift-finder/?maxPrice=25',
      },
      {
        id: 'her-under-50',
        label: 'Under $50',
        priceRangeLabel: 'Up to $50 USD',
        maxPrice: 50,
        description:
          'Two-tone bedside water carafes, Belgian linen five-year journals, and windowsill herb kits.',
        giftFinderHref: '/gift-finder/?maxPrice=50',
      },
      {
        id: 'her-50-to-100',
        label: '$50 to $100',
        priceRangeLabel: '$50–$100 USD',
        minPrice: 50,
        maxPrice: 100,
        description:
          'Spouted Kyoto matcha bowls, custom framed star maps, and cloud-waffle Turkish cotton robes.',
        giftFinderHref: '/gift-finder/?minPrice=50&maxPrice=100',
      },
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
    buyingAdvice: [
      {
        id: 'her-advice-specificity',
        heading: 'Trade Generic Luxury Sets for Personal Specificity',
        body: 'Behavioral research shows that an observant $28 gift tied to a specific shared memory or morning habit consistently outperforms a generic $120 department-store gift box.',
      },
    ],
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
      const hub = editorialHubs[slug];
      if (!hub) return undefined;
      if (!options?.includeDrafts && hub.status === 'draft') return undefined;
      return structuredClone(hub);
    },

    upsertEditorialHub(hub: EditorialHubConfig): EditorialHubConfig {
      editorialHubs[hub.slug] = structuredClone(hub);
      return structuredClone(hub);
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

