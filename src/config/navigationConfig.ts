/**
 * Centralized Navigation, External Store URLs, Category Icon Registry & Disclosure Copy
 *
 * Single source of truth for global header navigation, publication footer columns,
 * Fourthwall store destinations, reusable affiliate disclosures, and category icon keys.
 */

export const SHOP_EXTERNAL_URL = 'https://shop.scienceofgifts.com/';
export const SHOP_RETURNS_FAQ_URL =
  'https://shop.scienceofgifts.com/pages/returns-faq';

/**
 * Contact configuration:
 * Set `editorialContactEmail` once a verified publication inbox is confirmed.
 * Do not invent a placeholder email address.
 */
export const PUBLICATION_CONTACT_CONFIG: {
  editorialContactEmail: string | null;
  shopSupportUrl: string;
} = {
  editorialContactEmail: null,
  shopSupportUrl: SHOP_RETURNS_FAQ_URL,
};

export interface NavLinkItem {
  id: string;
  label: string;
  href: string;
  external?: boolean;
  iconKey?: 'shopping-bag';
  activeSection?: 'guides' | 'articles' | 'finder';
}

export const PRIMARY_NAV_LINKS: NavLinkItem[] = [
  {
    id: 'gift-guides',
    label: 'Gift Guides',
    href: '/gift-guides/',
    activeSection: 'guides',
  },
  {
    id: 'stories',
    label: 'Stories',
    href: '/articles/',
    activeSection: 'articles',
  },
  {
    id: 'shop',
    label: 'Shop',
    href: SHOP_EXTERNAL_URL,
    external: true,
    iconKey: 'shopping-bag',
  },
];

export const PRIMARY_CTA_LINK: NavLinkItem = {
  id: 'find-a-gift',
  label: 'Find a Gift',
  href: '/gift-finder/',
  activeSection: 'finder',
};

export interface FooterLinkItem {
  label: string;
  href: string;
  external?: boolean;
  isSavedDrawerTrigger?: boolean;
}

export interface FooterColumnConfig {
  id: string;
  heading: string;
  links: FooterLinkItem[];
}

export const EDITORIAL_FOOTER_COLUMNS: FooterColumnConfig[] = [
  {
    id: 'explore',
    heading: 'Explore',
    links: [
      { label: 'Gift Guides', href: '/gift-guides/' },
      { label: 'Stories', href: '/articles/' },
      { label: 'Find a Gift', href: '/gift-finder/' },
      { label: 'Shop', href: SHOP_EXTERNAL_URL, external: true },
      {
        label: 'Saved Gifts',
        href: '#saved-gifts',
        isSavedDrawerTrigger: true,
      },
    ],
  },
  {
    id: 'discover',
    heading: 'Discover',
    links: [
      { label: 'By Recipient', href: '/gift-guides/#browse-by-recipient' },
      { label: 'By Interest', href: '/gift-guides/#browse-by-interest' },
      { label: 'By Occasion', href: '/gift-guides/#browse-by-occasion' },
      { label: 'By Budget', href: '/gift-guides/#browse-by-budget' },
    ],
  },
  {
    id: 'publication',
    heading: 'The Publication',
    links: [
      { label: 'About', href: '/about/' },
      { label: 'Contact', href: '/contact/' },
      { label: 'Editorial Policy', href: '/editorial-policy/' },
      { label: 'Site Map', href: '/site-map/' },
    ],
  },
  {
    id: 'information',
    heading: 'Information',
    links: [
      { label: 'Affiliate Disclosure', href: '/affiliate-disclosure/' },
      { label: 'Privacy Policy', href: '/privacy-policy/' },
      { label: 'Terms of Use', href: '/terms-of-use/' },
      {
        label: 'Shop Returns & FAQ',
        href: SHOP_RETURNS_FAQ_URL,
        external: true,
      },
    ],
  },
];

/**
 * Reusable, configurable affiliate disclosure copy used across gift guides,
 * product profiles, articles with contextual recommendations, and disclosure pages.
 */
export const AFFILIATE_DISCLOSURE_CONFIG = {
  shortInlineNotice:
    'Reader-supported: We may earn a commission from qualifying purchases made through third-party retailer links at no extra cost to you.',
  productPanelNotice:
    'Science of Gifts may earn a commission from qualifying purchases made through third-party merchant links. First-party items sold through the Science of Gifts Shop are fulfilled directly via our store.',
  guideHeaderDisclosure:
    'Science of Gifts is reader-supported. When you purchase through links to third-party merchants on our site, we may earn an affiliate commission at no additional cost to you. Merchandise sold in the Science of Gifts Shop is offered directly by the publication.',
  disclosurePageHref: '/affiliate-disclosure/',
};

export type CategoryIconKey =
  | 'brain'
  | 'heart-handshake'
  | 'brain-circuit'
  | 'handshake'
  | 'clipboard-check'
  | 'landmark'
  | 'users'
  | 'heart'
  | 'user-round'
  | 'utensils'
  | 'graduation-cap'
  | 'baby'
  | 'coffee'
  | 'lamp'
  | 'flame'
  | 'sunrise'
  | 'wine'
  | 'book-open'
  | 'sprout'
  | 'dice-5'
  | 'cake'
  | 'home'
  | 'sparkles'
  | 'gift'
  | 'wallet'
  | 'compass';

/**
 * Centralized mapping from stable taxonomy IDs to refined outline icon keys.
 * Unknown or newly created categories automatically fall back to 'compass'.
 */
export const STORY_TOPIC_ICON_MAP: Record<string, CategoryIconKey> = {
  'gift-giving-psychology': 'brain',
  relationships: 'heart-handshake',
  'decision-making': 'brain-circuit',
  'gift-etiquette': 'handshake',
  'practical-gifting-advice': 'clipboard-check',
  culture: 'landmark',
};

export const RECIPIENT_CATEGORY_ICON_MAP: Record<string, CategoryIconKey> = {
  parent: 'users',
  partner: 'heart',
  friend: 'user-round',
  host: 'utensils',
  coworker: 'graduation-cap',
  kids: 'baby',
};

export const INTEREST_CATEGORY_ICON_MAP: Record<string, CategoryIconKey> = {
  'Coffee & Tea': 'coffee',
  'Cooking & Hosting': 'utensils',
  'Home Decor': 'lamp',
  'Cozy Sanctuary': 'flame',
  'Slow Mornings': 'sunrise',
  'Dinner Parties': 'wine',
  'Journaling & Reading': 'book-open',
  Gardening: 'sprout',
  'Board Games': 'dice-5',
};

export const OCCASION_CATEGORY_ICON_MAP: Record<string, CategoryIconKey> = {
  birthday: 'cake',
  housewarming: 'home',
  'thank-you': 'handshake',
  anniversary: 'heart',
  holidays: 'sparkles',
  'just-because': 'gift',
};

export function resolveCategoryIconKey(
  dimension: 'topic' | 'recipient' | 'interest' | 'occasion' | 'budget',
  key: string
): CategoryIconKey {
  if (dimension === 'topic') {
    return STORY_TOPIC_ICON_MAP[key] ?? 'compass';
  }
  if (dimension === 'recipient') {
    return RECIPIENT_CATEGORY_ICON_MAP[key] ?? 'users';
  }
  if (dimension === 'interest') {
    return INTEREST_CATEGORY_ICON_MAP[key] ?? 'compass';
  }
  if (dimension === 'occasion') {
    return OCCASION_CATEGORY_ICON_MAP[key] ?? 'gift';
  }
  return 'wallet';
}

export function slugifyCategoryKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
