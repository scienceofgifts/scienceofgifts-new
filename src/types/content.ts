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
  isSampleAuthor?: boolean;
}

export interface ResearchCitation {
  id: string;
  authors: string;
  year: number;
  title: string;
  publication: string;
  doiOrUrl: string;
  keyFinding: string;
  limitations?: string;
  verificationStatus?: 'verified-doi' | 'sample-fixture';
}

export interface ProductImage {
  id: string;
  url: string;
  fallbackColor: string;
  alt: string;
  caption?: string;
  isSampleAsset?: boolean;
}

export interface ProductGiftVerdict {
  editorialAssessment: string;
  standoutReason: string;
  recipientDelight: string;
  importantCaveat?: string;
  summary?: string;
  appeal?: string;
  whyEnjoyReceiving?: string;
  distinctDifference?: string;
  caveat?: string;
}

export interface ProductIdealRecipientProfile {
  headline: string;
  narrative: string;
  lifestyleNotes?: string[];
  relationshipFit?: string[];
}

export interface ProductBuyingConsideration {
  label: string;
  detail: string;
}

export interface ProductOccasionNote {
  occasion: OccasionType;
  label: string;
  note: string;
}

export interface ProductSpecificationItem {
  label: string;
  value: string;
}

export interface ProductSimilarComparison {
  productId: string;
  comparisonAngle: string;
  summary: string;
  distinctionLabel?: string;
  comparisonNote?: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  vendor: string;
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
  seo?: SEOConfig;
  giftVerdict?: ProductGiftVerdict;
  idealRecipientProfile?: ProductIdealRecipientProfile;
  extendedGiftRationale?: string[];
  buyingConsiderationsList?: ProductBuyingConsideration[];
  occasionContextNotes?: ProductOccasionNote[];
  specifications?: ProductSpecificationItem[];
  similarGiftComparisons?: ProductSimilarComparison[];
}

export type GuidePresentationStyle =
  | 'featured'
  | 'standard'
  | 'compact'
  | 'editorial-feature';

export interface GuideCuratorNote {
  id: string;
  kicker?: string;
  title: string;
  body: string;
  takeaway?: string;
  authorAttribution?: string;
}

export interface GuideRecipientPathway {
  id: string;
  label: string;
  description: string;
  recipientFilter?: RecipientType;
  personalityFilter?: PersonalityTrait;
  occasionFilter?: OccasionType;
  maxPrice?: number;
  recommendedProductIds?: string[];
  editorialTip?: string;
}

export interface GuideComparisonRow {
  productId: string;
  bestSuitedRecipient: string;
  giftStyle: string;
  practicalUsefulness: string;
  personalizationOption: string;
  mainAppeal: string;
  keyConsideration: string;
  bestOccasion: string;
  bestFor?: string;
  standoutTrait?: string;
  everydayUsefulness?: string;
  careOrStorage?: string;
}

export interface GuideComparisonConfig {
  title?: string;
  subtitle?: string;
  rows: GuideComparisonRow[];
}

export interface GuideFAQItem {
  id: string;
  question: string;
  answer: string;
  relatedProductId?: string;
}

export interface GuideRecommendation {
  productId: string;
  awardLabel?: string;
  customEditorialNote: string;
  idealFor: string;
  goodToKnow: string;
  layoutHighlight?: 'feature-horizontal' | 'standard' | 'compact' | 'special-editorial';
  presentationStyle?: GuidePresentationStyle;
  editorialHeadline?: string;
  editorialHook?: string;
  whyItWorks?: string;
  whyWeChoseIt?: string;
  whoItsBestFor?: string;
  keepInMind?: string;
  buyingConsiderations?: string;
  betterAlternativeNote?: string;
}

export interface GuideSection {
  id: string;
  shortNavTitle: string;
  title: string;
  priceRangeLabel: string;
  summary: string;
  editorialKicker?: string;
  accentSurface?: 'cream' | 'sand' | 'mint' | 'blue';
  recommendations: GuideRecommendation[];
  curatorNote?: GuideCuratorNote;
}

export interface GuideEditorsPick {
  productId: string;
  kicker: string;
  headline: string;
  editorialRationale: string;
  intendedRecipientAndSituation: string;
  targetSectionId: string;
  buyingConsiderations?: string;
  awardLabel?: string;
  editorialHeadline?: string;
  whyItStoodOut?: string;
  whoItFitsBest?: string;
  practicalNotes?: string;
}

export interface GuideQuickPick {
  id: string;
  label: string;
  productId: string;
  reason: string;
  targetSectionId: string;
  bestFor?: string;
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
  editorialIssueNumber?: string;
  curationSummary?: string;
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
  recipientPathways?: GuideRecipientPathway[];
  curatorNotes?: GuideCuratorNote[];
  comparison?: GuideComparisonConfig;
  faqs?: GuideFAQItem[];
  buyingAdviceIntro?: string;
  buyingAdvice: GuideBuyingTip[];
  sections: GuideSection[];
  relatedGuideIds: string[];
  relatedArticleIds: string[];
  citationIds: string[];
}

export interface ArticleSubSection {
  id: string;
  subheading: string; // H3
  paragraphs: string[];
  bulletList?: {
    intro?: string;
    items: string[];
  };
}

export interface ArticleCallout {
  kicker?: string;
  title: string;
  body: string;
  tone?: 'mint' | 'blue' | 'butter' | 'sand';
}

export interface ArticleExpandableAdvice {
  id: string;
  title: string;
  summaryPreview: string;
  items: {
    label: string;
    detail: string;
  }[];
}

export interface ArticleContextualProducts {
  heading: string;
  editorialContext: string;
  productIds: string[];
}

export interface ArticleSection {
  id: string;
  shortNavTitle?: string;
  heading: string; // H2
  paragraphs: string[]; // Supports inline [cite:cit_id] markers
  subSections?: ArticleSubSection[]; // H3 hierarchy
  pullQuote?: {
    text: string;
    attribution: string;
  };
  callout?: ArticleCallout;
  expandableNote?: {
    title: string;
    methodologyDetail: string;
  };
  expandableAdvice?: ArticleExpandableAdvice;
  contextualProducts?: ArticleContextualProducts;
  recommendedProductIds?: string[];
}

export interface Article {
  id: string;
  slug: string;
  title: string; // On-page H1
  subtitle: string; // Dek
  seo: SEOConfig;
  category: string;
  publishedAt: string;
  updatedAt?: string;
  readTimeMinutes?: number; // Calculated dynamically from actual content if omitted or overridden
  authorId: string;
  heroImageUrl: string;
  heroAlt: string;
  heroCaption: string;
  summaryTitle?: string;
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
  relatedGuideIds?: string[];
  relatedArticleIds?: string[];
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
