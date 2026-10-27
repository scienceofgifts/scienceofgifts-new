export type CommerceProvider = 'affiliate' | 'fourthwall' | 'digital' | 'direct';

export type BudgetTier = 'under-25' | '25-to-75' | 'over-75' | 'under-50' | '50-to-100' | '100-plus';

export type RecipientType =
  | 'partner'
  | 'parent'
  | 'friend'
  | 'host'
  | 'kids'
  | 'coworker';

export type OccasionType =
  | 'birthday'
  | 'housewarming'
  | 'anniversary'
  | 'thank-you'
  | 'holidays'
  | 'just-because';

export type PersonalityTrait =
  | 'foodie-host'
  | 'cozy-homebody'
  | 'curious-creative'
  | 'outdoors-nature'
  | 'nostalgic-sentimental'
  | 'everyday-ritual';

export type AgeRange = 'kids' | 'young-adult' | 'adult' | 'parents-grandparents' | 'all-ages';

export interface SEOConfig {
  seoTitle: string;
  metaDescription: string;
  canonicalPath: string;
  ogType: 'website' | 'article';
  schemaType: 'WebSite' | 'Article' | 'ItemList';
}

export interface Author {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatarUrl: string;
}

export interface ResearchCitation {
  id: string;
  authors: string;
  year: number;
  title: string;
  publication: string;
  doiOrUrl: string;
  keyFinding: string;
}

export interface ProductImage {
  id: string;
  url: string;
  fallbackColor: string;
  alt: string;
  caption?: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  vendor: string; // Clearly treated as sample/demo maker in preview
  price: number;
  currency: 'USD';
  budgetTier: 'under-50' | '50-to-100' | '100-plus';
  guidePriceBucket: 'under-25' | '25-to-75' | 'over-75';
  productType: string;
  commerceProvider: CommerceProvider;
  purchaseUrl: string;
  isPlaceholderLink?: boolean;
  inStock: boolean;
  calloutTag?: string;
  whyToGiveIt: string;
  detailsAndCare: string;
  bestForSummary: string;
  recipients: RecipientType[];
  interests: string[];
  ageRanges: AgeRange[];
  occasions: OccasionType[];
  personalityTraits: PersonalityTrait[];
  images: ProductImage[];
  citationIds: string[];
}

export interface GuideRecommendation {
  productId: string;
  awardLabel?: string;
  customEditorialNote: string;
  idealFor: string;
  goodToKnow: string;
  layoutHighlight?: 'feature-horizontal' | 'standard';
}

export interface GuideSection {
  id: string;
  shortNavTitle: string;
  title: string;
  priceRangeLabel: string;
  summary: string;
  accentSurface?: 'cream' | 'sand' | 'mint' | 'blue';
  recommendations: GuideRecommendation[];
}

export interface GuideEditorsPick {
  productId: string;
  kicker: string;
  headline: string;
  editorialRationale: string;
  intendedRecipientAndSituation: string;
  targetSectionId: string;
}

export interface GuideQuickPick {
  id: string;
  label: string; // e.g., "Best Overall", "Best Under $25", "Best for a Close Friend"
  productId: string;
  reason: string;
  targetSectionId: string;
}

export interface GuideBuyingTip {
  id: string;
  heading: string;
  body: string;
  expandablePrompt?: string;
  expandableDetails?: string;
}

export interface GiftGuide {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  introParagraphs?: string[];
  whoThisGuideIsFor?: string[];
  affiliateDisclosure: string;
  seo: SEOConfig;
  category: string;
  publishedAt: string;
  updatedAt: string;
  readTimeMinutes: number;
  authorId: string;
  heroImageUrl: string;
  heroImageAlt: string;
  heroImageCaption?: string;
  accentTone: 'mint' | 'soft-blue' | 'butter' | 'coral';
  editorsPick: GuideEditorsPick;
  quickPicks: GuideQuickPick[];
  buyingAdviceIntro?: string;
  buyingAdvice: GuideBuyingTip[];
  sections: GuideSection[];
  relatedGuideIds: string[];
  relatedArticleIds: string[];
  citationIds: string[];
}

export interface ArticleSection {
  id: string;
  heading: string;
  paragraphs: string[];
  pullQuote?: {
    text: string;
    attribution: string;
  };
  expandableNote?: {
    title: string;
    methodologyDetail: string;
  };
  recommendedProductIds?: string[];
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  seo: SEOConfig;
  category: string;
  publishedAt: string;
  readTimeMinutes: number;
  authorId: string;
  heroImageUrl: string;
  heroAlt: string;
  heroCaption: string;
  executiveSummary: string[];
  sections: ArticleSection[];
  comparisonTable?: {
    title: string;
    caption: string;
    headers: string[];
    rows: {
      dimension: string;
      noveltyGift: string;
      ritualObject: string;
      empiricalEffect: string;
    }[];
  };
  citationIds: string[];
}

export interface RecipientSpotlight {
  id: string;
  title: string;
  subtitle: string;
  recipientFilter?: RecipientType;
  personalityFilter?: PersonalityTrait;
  budgetFilter?: 'under-50' | '50-to-100' | '100-plus';
  imageUrl: string;
  imageAlt: string;
  accentBg: string;
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  entityId: string;
  message: string;
}
