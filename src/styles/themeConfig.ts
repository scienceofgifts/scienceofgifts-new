/**
 * Centralized Theme Metadata & CSS Generator for Science of Gifts
 *
 * Keeps the development-only Visual Theme Lab (`/dev/theme-lab/`) synchronized
 * with the permanent source-of-truth configuration in `src/styles/site-theme.css`.
 */

export const THEME_LAB_STORAGE_KEY = 'sog_theme_lab_draft_v1';

export interface FontOption {
  id: string;
  label: string;
  cssStack: string;
  category: 'serif' | 'sans' | 'mono';
  notes: string;
}

export const HEADING_FONT_OPTIONS: FontOption[] = [
  {
    id: 'fraunces',
    label: 'Fraunces (Current Editorial Default)',
    cssStack: "'Fraunces', Georgia, serif",
    category: 'serif',
    notes: 'Warm, expressive optical-size serif used across Science of Gifts.',
  },
  {
    id: 'newsreader',
    label: 'Newsreader',
    cssStack: "'Newsreader', Georgia, serif",
    category: 'serif',
    notes: 'Crisp literary magazine serif designed for long-form editorial reading.',
  },
  {
    id: 'playfair-display',
    label: 'Playfair Display',
    cssStack: "'Playfair Display', Georgia, serif",
    category: 'serif',
    notes: 'High-contrast classic magazine headline serif.',
  },
  {
    id: 'lora',
    label: 'Lora',
    cssStack: "'Lora', Georgia, serif",
    category: 'serif',
    notes: 'Balanced calligraphic serif with gentle contrast.',
  },
];

export const BODY_FONT_OPTIONS: FontOption[] = [
  {
    id: 'plus-jakarta-sans',
    label: 'Plus Jakarta Sans (Current Body Default)',
    cssStack: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    category: 'sans',
    notes: 'Warm geometric humanist sans-serif currently used for body and UI.',
  },
  {
    id: 'inter',
    label: 'Inter',
    cssStack: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    category: 'sans',
    notes: 'Neutral, highly legible neo-grotesque interface & reading typeface.',
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    cssStack: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    category: 'sans',
    notes: 'Clean low-contrast geometric sans with friendly open forms.',
  },
  {
    id: 'source-sans-3',
    label: 'Source Sans 3',
    cssStack: "'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif",
    category: 'sans',
    notes: 'Editorial humanist sans-serif optimized for long reading passages.',
  },
];

export interface ThemeSettings {
  // A. Font Families
  fontDisplay: string;
  fontBody: string;
  fontUi: string;
  fontMono: string;

  // B. Typography Sizes
  sizeDisplayHeading: string;
  sizePageTitle: string;
  sizeSectionHeading: string;
  sizeSubsectionHeading: string;
  sizeInfoHeading: string;
  sizeInfoLabel: string;
  sizeProductTitle: string;
  sizeProductTitleFeatured: string;
  sizeIntro: string;
  sizeBody: string;
  sizeBodySm: string;
  sizeCaption: string;
  sizeMetadata: string;
  sizeNav: string;
  sizeButton: string;
  sizeSidebarLink: string;

  // C. Typography Characteristics
  lineHeightHeading: string;
  lineHeightSubheading: string;
  lineHeightBody: string;
  lineHeightIntro: string;
  weightHeading: string;
  weightSubheading: string;
  weightBody: string;

  // D. Principal Colors
  colorPageBg: string;
  colorSurfaceBg: string;
  colorSubtleInfoBg: string;
  colorPrimaryText: string;
  colorBodyText: string;
  colorSecondaryText: string;
  colorMutedText: string;
  colorBrandPrimary: string;
  colorLink: string;
  colorButtonBg: string;
  colorButtonHoverBg: string;
  colorButtonText: string;
  colorBorder: string;
  colorAccentBg: string;
  colorAccentBorder: string;
  colorAccentWarm: string;

  // E. Common Visual Properties
  readingMeasure: string;
  contentMaxWidth: string;
  radiusCard: string;
  radiusButton: string;
}

/**
 * Exact initial design values matching `src/styles/site-theme.css`.
 */
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  fontDisplay: "'Fraunces', Georgia, serif",
  fontBody: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontUi: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontMono: "'JetBrains Mono', monospace",

  sizeDisplayHeading: 'clamp(2.15rem, 3.8vw, 3.25rem)',
  sizePageTitle: 'clamp(1.875rem, 3.1vw, 2.75rem)',
  sizeSectionHeading: 'clamp(1.5rem, 2.2vw, 1.875rem)',
  sizeSubsectionHeading: 'clamp(1.1875rem, 1.5vw, 1.375rem)',
  sizeInfoHeading: '1.0625rem',
  sizeInfoLabel: '0.75rem',
  sizeProductTitle: 'clamp(1.125rem, 1.35vw, 1.25rem)',
  sizeProductTitleFeatured: 'clamp(1.375rem, 1.9vw, 1.65rem)',
  sizeIntro: 'clamp(1.0625rem, 1.3vw, 1.25rem)',
  sizeBody: '1rem',
  sizeBodySm: '0.875rem',
  sizeCaption: '0.75rem',
  sizeMetadata: '0.75rem',
  sizeNav: '0.875rem',
  sizeButton: '0.75rem',
  sizeSidebarLink: '0.75rem',

  lineHeightHeading: '1.24',
  lineHeightSubheading: '1.35',
  lineHeightBody: '1.8',
  lineHeightIntro: '1.62',
  weightHeading: '600',
  weightSubheading: '600',
  weightBody: '400',

  colorPageBg: '#FAF9F6',
  colorSurfaceBg: '#FFFFFF',
  colorSubtleInfoBg: '#F6F4EF',
  colorPrimaryText: '#24282B',
  colorBodyText: '#24282B',
  colorSecondaryText: '#636A6F',
  colorMutedText: '#636A6F',
  colorBrandPrimary: '#1B3D5F',
  colorLink: '#28537D',
  colorButtonBg: '#1B3D5F',
  colorButtonHoverBg: '#28537D',
  colorButtonText: '#FFFFFF',
  colorBorder: '#E3E1DB',
  colorAccentBg: '#E5F3EC',
  colorAccentBorder: '#C6E4D6',
  colorAccentWarm: '#F2846B',

  readingMeasure: '68ch',
  contentMaxWidth: '1360px',
  radiusCard: '1rem',
  radiusButton: '0.5rem',
};

export const THEME_CSS_VARIABLE_MAP: Record<keyof ThemeSettings, string> = {
  fontDisplay: '--theme-font-display',
  fontBody: '--theme-font-body',
  fontUi: '--theme-font-ui',
  fontMono: '--theme-font-mono',

  sizeDisplayHeading: '--theme-size-display-heading',
  sizePageTitle: '--theme-size-page-title',
  sizeSectionHeading: '--theme-size-section-heading',
  sizeSubsectionHeading: '--theme-size-subsection-heading',
  sizeInfoHeading: '--theme-size-info-heading',
  sizeInfoLabel: '--theme-size-info-label',
  sizeProductTitle: '--theme-size-product-title',
  sizeProductTitleFeatured: '--theme-size-product-title-featured',
  sizeIntro: '--theme-size-intro',
  sizeBody: '--theme-size-body',
  sizeBodySm: '--theme-size-body-sm',
  sizeCaption: '--theme-size-caption',
  sizeMetadata: '--theme-size-metadata',
  sizeNav: '--theme-size-nav',
  sizeButton: '--theme-size-button',
  sizeSidebarLink: '--theme-size-sidebar-link',

  lineHeightHeading: '--theme-leading-heading',
  lineHeightSubheading: '--theme-leading-subheading',
  lineHeightBody: '--theme-leading-body',
  lineHeightIntro: '--theme-leading-intro',
  weightHeading: '--theme-weight-heading',
  weightSubheading: '--theme-weight-subheading',
  weightBody: '--theme-weight-body',

  colorPageBg: '--theme-color-page-bg',
  colorSurfaceBg: '--theme-color-surface',
  colorSubtleInfoBg: '--theme-color-surface-subtle',
  colorPrimaryText: '--theme-color-text-primary',
  colorBodyText: '--theme-color-body',
  colorSecondaryText: '--theme-color-text-secondary',
  colorMutedText: '--theme-color-text-muted',
  colorBrandPrimary: '--theme-color-brand-primary',
  colorLink: '--theme-color-link',
  colorButtonBg: '--theme-color-button-bg',
  colorButtonHoverBg: '--theme-color-button-bg-hover',
  colorButtonText: '--theme-color-button-text',
  colorBorder: '--theme-color-border',
  colorAccentBg: '--theme-color-accent-mint-bg',
  colorAccentBorder: '--theme-color-accent-mint-border',
  colorAccentWarm: '--theme-color-accent-coral',

  readingMeasure: '--theme-width-reading-measure',
  contentMaxWidth: '--theme-width-site-max',
  radiusCard: '--theme-radius-lg',
  radiusButton: '--theme-radius-sm',
};

/**
 * Applies theme settings as CSS custom properties on a target element
 * (defaults to `document.documentElement` when running in the browser).
 */
export function applyThemeSettingsToElement(
  settings: ThemeSettings,
  target?: HTMLElement | null
): void {
  const el =
    target ??
    (typeof document !== 'undefined' ? document.documentElement : null);
  if (!el) return;

  for (const [key, cssVar] of Object.entries(THEME_CSS_VARIABLE_MAP)) {
    const value = settings[key as keyof ThemeSettings];
    if (value) {
      el.style.setProperty(cssVar, value);
    }
  }
}

/**
 * Removes inline CSS custom property overrides from a target element so
 * the browser reverts to the permanent rules in `src/styles/site-theme.css`.
 */
export function clearThemeSettingsFromElement(target?: HTMLElement | null): void {
  const el =
    target ??
    (typeof document !== 'undefined' ? document.documentElement : null);
  if (!el) return;

  for (const cssVar of Object.values(THEME_CSS_VARIABLE_MAP)) {
    el.style.removeProperty(cssVar);
  }
}

/**
 * Generates the complete, ready-to-save `src/styles/site-theme.css` file content
 * reflecting the current settings.
 */
export function generateSiteThemeCss(settings: ThemeSettings): string {
  return `/**
 * ============================================================================
 * SCIENCE OF GIFTS — CENTRALIZED VISUAL DESIGN SETTINGS
 * File: src/styles/site-theme.css
 * ============================================================================
 *
 * HOW TO USE THIS FILE (QUICK GUIDE FOR MANUAL EDITING):
 *
 * This is the single source of truth for the website's fonts, text sizes,
 * line heights, colors, and layout spacing across all Gift Guides, Product
 * Profiles, Stories, and the Gift Finder.
 * ============================================================================
 */

@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..600&family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Lora:ital,wght@0,400..700;1,400..600&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..600&family=Playfair+Display:ital,wght@0,400..700;1,400..600&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Source+Sans+3:ital,wght@0,400..700;1,400..600&display=swap');

:root {
  /* ==========================================================================
   * SECTION A: FONT FAMILIES
   * ========================================================================== */
  --theme-font-display: ${settings.fontDisplay};
  --theme-font-body: ${settings.fontBody};
  --theme-font-ui: ${settings.fontUi};
  --theme-font-mono: ${settings.fontMono};

  /* ==========================================================================
   * SECTION B: TYPOGRAPHY SIZES
   * ========================================================================== */
  --theme-size-display-heading: ${settings.sizeDisplayHeading};
  --theme-size-page-title: ${settings.sizePageTitle};
  --theme-size-section-heading: ${settings.sizeSectionHeading};
  --theme-size-subsection-heading: ${settings.sizeSubsectionHeading};
  --theme-size-info-heading: ${settings.sizeInfoHeading};
  --theme-size-info-label: ${settings.sizeInfoLabel};
  --theme-size-product-title: ${settings.sizeProductTitle};
  --theme-size-product-title-featured: ${settings.sizeProductTitleFeatured};
  --theme-size-intro: ${settings.sizeIntro};
  --theme-size-body: ${settings.sizeBody};
  --theme-size-body-sm: ${settings.sizeBodySm};
  --theme-size-caption: ${settings.sizeCaption};
  --theme-size-metadata: ${settings.sizeMetadata};
  --theme-size-nav: ${settings.sizeNav};
  --theme-size-button: ${settings.sizeButton};
  --theme-size-sidebar-link: ${settings.sizeSidebarLink};

  /* ==========================================================================
   * SECTION C: TYPOGRAPHY CHARACTERISTICS (WEIGHTS, LINE HEIGHTS, SPACING)
   * ========================================================================== */
  --theme-weight-heading: ${settings.weightHeading};
  --theme-weight-subheading: ${settings.weightSubheading};
  --theme-weight-info-heading: 600;
  --theme-weight-product-title: 600;
  --theme-weight-body: ${settings.weightBody};
  --theme-weight-nav: 500;
  --theme-weight-button: 600;
  --theme-weight-metadata: 600;

  --theme-leading-display: 1.12;
  --theme-leading-heading: ${settings.lineHeightHeading};
  --theme-leading-subheading: ${settings.lineHeightSubheading};
  --theme-leading-intro: ${settings.lineHeightIntro};
  --theme-leading-body: ${settings.lineHeightBody};
  --theme-leading-compact: 1.55;

  --theme-tracking-heading: -0.015em;
  --theme-tracking-body: 0em;
  --theme-tracking-kicker: 0.04em;

  /* ==========================================================================
   * SECTION D: PRINCIPAL COLORS
   * ========================================================================== */
  --theme-color-page-bg: ${settings.colorPageBg};
  --theme-color-page-bg-warm: #FAF7F2;
  --theme-color-surface: ${settings.colorSurfaceBg};
  --theme-color-surface-subtle: ${settings.colorSubtleInfoBg};
  --theme-color-surface-warm: #F3ECE1;

  --theme-color-text-primary: ${settings.colorPrimaryText};
  --theme-color-text-secondary: ${settings.colorSecondaryText};
  --theme-color-text-muted: ${settings.colorMutedText};

  --theme-color-heading: var(--theme-color-text-primary);
  --theme-color-subheading: var(--theme-color-text-primary);
  --theme-color-info-heading: var(--theme-color-text-primary);
  --theme-color-product-title: var(--theme-color-text-primary);
  --theme-color-body: var(--theme-color-text-primary);
  --theme-color-intro: var(--theme-color-text-secondary);
  --theme-color-caption: var(--theme-color-text-secondary);

  --theme-color-brand-primary: ${settings.colorBrandPrimary};
  --theme-color-link: ${settings.colorLink};
  --theme-color-link-hover: ${settings.colorBrandPrimary};
  --theme-color-nav: var(--theme-color-text-primary);
  --theme-color-nav-active: var(--theme-color-brand-primary);
  --theme-color-sidebar-link: var(--theme-color-text-secondary);
  --theme-color-sidebar-link-active: var(--theme-color-brand-primary);
  --theme-color-button-bg: ${settings.colorButtonBg};
  --theme-color-button-bg-hover: ${settings.colorButtonHoverBg};
  --theme-color-button-text: ${settings.colorButtonText};

  --theme-color-border: ${settings.colorBorder};
  --theme-color-border-strong: #C5C1B8;

  --theme-color-accent-mint-bg: ${settings.colorAccentBg};
  --theme-color-accent-mint-border: ${settings.colorAccentBorder};
  --theme-color-accent-mint-bright: #C3F3DF;
  --theme-color-accent-butter-bg: #FFF4D6;
  --theme-color-accent-blue-bg: #EBF3FE;
  --theme-color-accent-coral: ${settings.colorAccentWarm};

  /* ==========================================================================
   * SECTION E: COMMON VISUAL PROPERTIES (RADII, SPACING, CONTENT WIDTHS)
   * ========================================================================== */
  --theme-radius-sm: ${settings.radiusButton};
  --theme-radius-md: 0.75rem;
  --theme-radius-lg: ${settings.radiusCard};
  --theme-radius-xl: 1.5rem;

  --theme-space-section-y: 3.5rem;
  --theme-space-card-padding: 1.5rem;

  --theme-width-site-max: ${settings.contentMaxWidth};
  --theme-width-profile-max: 1280px;
  --theme-width-reading-measure: ${settings.readingMeasure};

  /* Legacy variable aliases */
  --font-serif: var(--theme-font-display);
  --font-sans: var(--theme-font-body);
  --font-mono: var(--theme-font-mono);

  --color-editorial-canvas: var(--theme-color-page-bg);
  --color-paper-surface: var(--theme-color-surface);
  --color-paper-subtle: var(--theme-color-surface-subtle);
  --color-ink-primary: var(--theme-color-text-primary);
  --color-ink-secondary: var(--theme-color-text-secondary);
  --color-brand-navy: var(--theme-color-brand-primary);
  --color-interactive-blue: var(--theme-color-link);
  --color-mint-subtle: var(--theme-color-accent-mint-bg);
  --color-border-soft: var(--theme-color-border);
}
`;
}
