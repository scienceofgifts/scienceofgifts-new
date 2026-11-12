import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Bookmark,
  Check,
  Compass,
  Copy,
  ExternalLink,
  FileCode,
  Info,
  ListChecks,
  Palette,
  RotateCcw,
  Sliders,
  Sparkles,
  Type,
} from 'lucide-react';
import {
  BODY_FONT_OPTIONS,
  DEFAULT_THEME_SETTINGS,
  HEADING_FONT_OPTIONS,
  THEME_LAB_STORAGE_KEY,
  ThemeSettings,
  applyThemeSettingsToElement,
  clearThemeSettingsFromElement,
  generateSiteThemeCss,
} from '../styles/themeConfig';

const HEADING_SIZE_PRESETS = [
  {
    label: 'Compact Editorial (22px–28px)',
    value: 'clamp(1.375rem, 1.9vw, 1.75rem)',
  },
  {
    label: 'Standard Editorial Default (24px–30px)',
    value: 'clamp(1.5rem, 2.2vw, 1.875rem)',
  },
  {
    label: 'Prominent Magazine (28px–36px)',
    value: 'clamp(1.75rem, 2.6vw, 2.25rem)',
  },
  {
    label: 'Large Feature Chapter (32px–40px)',
    value: 'clamp(2rem, 3vw, 2.5rem)',
  },
];

const SUBHEADING_SIZE_PRESETS = [
  {
    label: 'Restrained (17px–19px)',
    value: 'clamp(1.0625rem, 1.25vw, 1.1875rem)',
  },
  {
    label: 'Standard Editorial Default (19px–22px)',
    value: 'clamp(1.1875rem, 1.5vw, 1.375rem)',
  },
  {
    label: 'Prominent Subheading (20px–24px)',
    value: 'clamp(1.25rem, 1.7vw, 1.5rem)',
  },
  {
    label: 'Bold Sub-Chapter (22px–27px)',
    value: 'clamp(1.375rem, 1.9vw, 1.6875rem)',
  },
];

const INFO_HEADING_SIZE_PRESETS = [
  { label: 'Compact (15px / 0.9375rem)', value: '0.9375rem' },
  { label: 'Standard (16px / 1rem)', value: '1rem' },
  { label: 'Current Editorial Default (17px / 1.0625rem)', value: '1.0625rem' },
  { label: 'Large Info Title (19px / 1.1875rem)', value: '1.1875rem' },
];

const PRODUCT_TITLE_SIZE_PRESETS = [
  {
    label: 'Compact Card Title (16px–18px)',
    value: 'clamp(1rem, 1.15vw, 1.125rem)',
  },
  {
    label: 'Standard Editorial Default (18px–20px)',
    value: 'clamp(1.125rem, 1.35vw, 1.25rem)',
  },
  {
    label: 'Prominent Product Title (19px–22px)',
    value: 'clamp(1.1875rem, 1.5vw, 1.375rem)',
  },
  {
    label: 'Editorial Showcase Title (21px–25px)',
    value: 'clamp(1.3125rem, 1.75vw, 1.5625rem)',
  },
];

const BODY_SIZE_PRESETS = [
  { label: 'Compact (15px / 0.9375rem)', value: '0.9375rem' },
  { label: 'Current Editorial Default (16px / 1rem)', value: '1rem' },
  { label: 'Medium Editorial (16.5px / 1.03125rem)', value: '1.03125rem' },
  { label: 'Comfortable Long-Form (17.5px / 1.09375rem)', value: '1.09375rem' },
  { label: 'Generous Print Size (18.5px / 1.15625rem)', value: '1.15625rem' },
];

const LINE_HEIGHT_PRESETS = [
  { label: 'Snug (1.65)', value: '1.65' },
  { label: 'Balanced (1.72)', value: '1.72' },
  { label: 'Current Editorial Default (1.8)', value: '1.8' },
  { label: 'Airy Long-Form (1.9)', value: '1.9' },
];

export const ThemeLabExperience: React.FC = () => {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);
  const [showCssModal, setShowCssModal] = useState(false);

  // Load any saved browser draft on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(THEME_LAB_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ThemeSettings>;
        const merged = { ...DEFAULT_THEME_SETTINGS, ...parsed };
        setSettings(merged);
        setHasSavedDraft(true);
        applyThemeSettingsToElement(merged);
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  // Apply live CSS variables to document root whenever settings change
  useEffect(() => {
    applyThemeSettingsToElement(settings);
  }, [settings]);

  const updateSetting = <K extends keyof ThemeSettings>(
    key: K,
    value: ThemeSettings[K]
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(THEME_LAB_STORAGE_KEY, JSON.stringify(next));
        setHasSavedDraft(true);
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  };

  const handleResetToDefaults = () => {
    setSettings(DEFAULT_THEME_SETTINGS);
    setHasSavedDraft(false);
    clearThemeSettingsFromElement();
    try {
      window.localStorage.removeItem(THEME_LAB_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const generatedCss = useMemo(
    () => generateSiteThemeCss(settings),
    [settings]
  );

  const handleCopyCss = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(generatedCss);
      }
      setCopiedCss(true);
      setTimeout(() => setCopiedCss(false), 2600);
    } catch {
      setShowCssModal(true);
    }
  };

  const modifiedCount = useMemo(() => {
    let count = 0;
    for (const key of Object.keys(DEFAULT_THEME_SETTINGS) as Array<
      keyof ThemeSettings
    >) {
      if (settings[key] !== DEFAULT_THEME_SETTINGS[key]) {
        count += 1;
      }
    }
    return count;
  }, [settings]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24 text-[#24282B]">
      {/* Top Development Utility Bar */}
      <div className="border-b border-[#E3E1DB] bg-[#FFFFFF]">
        <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#28537D]">
                <Sliders className="h-3.5 w-3.5" />
                <span>Development-Only Visual Design Laboratory · /dev/theme-lab/</span>
              </div>
              <h1 className="mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl">
                Science of Gifts — Centralized Theme & Typography Lab
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowCssModal((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3.5 py-2 text-xs font-semibold text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
              >
                <FileCode className="h-3.5 w-3.5 text-[#28537D]" />
                <span>{showCssModal ? 'Hide Generated CSS' : 'Inspect site-theme.css'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCss}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B3D5F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#28537D]"
              >
                {copiedCss ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied site-theme.css!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy site-theme.css</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetToDefaults}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E1DB] bg-[#FFFFFF] px-3.5 py-2 text-xs font-semibold text-[#636A6F] transition-colors hover:border-[#28537D] hover:text-[#24282B]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset to Source Defaults</span>
              </button>
            </div>
          </div>

          {/* Clear Explanation of Temporary Browser Preview vs Permanent File Editing */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#C6E4D6] bg-[#E5F3EC]/70 px-4 py-3 text-xs text-[#24282B]">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1B3D5F]" />
              <div>
                <strong className="font-semibold text-[#1B3D5F]">
                  How this preview works:
                </strong>{' '}
                Adjustments below update the live CSS custom properties in your browser immediately (and save a temporary draft in <code>localStorage</code>). To make your changes permanent across the codebase, click{' '}
                <strong>“Copy site-theme.css”</strong> and paste the result into{' '}
                <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#1B3D5F]">
                  src/styles/site-theme.css
                </code>
                , or edit <code>src/styles/site-theme.css</code> directly.
              </div>
            </div>

            <div className="shrink-0 font-semibold text-[#1B3D5F] tabular-nums">
              {modifiedCount === 0
                ? 'Showing initial source defaults (0 overrides)'
                : `${modifiedCount} setting${modifiedCount === 1 ? '' : 's'} customized${
                    hasSavedDraft ? ' · Saved in browser draft' : ''
                  }`}
            </div>
          </div>

          {/* Expandable Generated CSS Drawer */}
          {showCssModal && (
            <div className="mt-4 rounded-2xl border border-[#E3E1DB] bg-[#FAF9F6] p-4">
              <div className="flex items-center justify-between gap-2 pb-2.5">
                <span className="font-mono text-xs font-semibold text-[#1B3D5F]">
                  Generated file content for: src/styles/site-theme.css
                </span>
                <button
                  type="button"
                  onClick={handleCopyCss}
                  className="inline-flex items-center gap-1 rounded-md bg-[#1B3D5F] px-3 py-1 text-xs font-semibold text-white hover:bg-[#28537D]"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedCss ? 'Copied!' : 'Copy Full File'}</span>
                </button>
              </div>
              <pre className="max-h-72 overflow-auto rounded-xl border border-[#E3E1DB] bg-[#FFFFFF] p-4 font-mono text-[11px] leading-relaxed text-[#24282B]">
                {generatedCss}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Main Split Workspace: Left Control Rail + Right Live Specimen Canvas */}
      <div className="mx-auto max-w-[1400px] px-4 pt-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* =================================================================
              LEFT COLUMN: INTERACTIVE THEME CONTROLS (4 Cols)
             ================================================================= */}
          <aside
            aria-label="Theme configuration controls"
            className="space-y-6 lg:col-span-4 lg:sticky lg:top-20"
          >
            {/* 1. Font Families */}
            <div className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-5">
              <div className="flex items-center gap-2 border-b border-[#E3E1DB] pb-3">
                <Type className="h-4 w-4 text-[#28537D]" />
                <h2 className="font-serif text-base font-semibold text-[#24282B]">
                  A. Font Families
                </h2>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <label
                    htmlFor="control-font-display"
                    className="block font-semibold text-[#24282B]"
                  >
                    Heading Font Family (<code>--theme-font-display</code>)
                  </label>
                  <select
                    id="control-font-display"
                    value={settings.fontDisplay}
                    onChange={(e) => updateSetting('fontDisplay', e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-2 text-xs font-medium text-[#24282B]"
                  >
                    {HEADING_FONT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.cssStack}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="control-font-body"
                    className="block font-semibold text-[#24282B]"
                  >
                    Body & Interface Font Family (<code>--theme-font-body</code>)
                  </label>
                  <select
                    id="control-font-body"
                    value={settings.fontBody}
                    onChange={(e) => {
                      updateSetting('fontBody', e.target.value);
                      updateSetting('fontUi', e.target.value);
                    }}
                    className="mt-1.5 w-full rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-2 text-xs font-medium text-[#24282B]"
                  >
                    {BODY_FONT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.cssStack}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Typography Scale & Hierarchy */}
            <div className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-5">
              <div className="flex items-center gap-2 border-b border-[#E3E1DB] pb-3">
                <Sliders className="h-4 w-4 text-[#28537D]" />
                <h2 className="font-serif text-base font-semibold text-[#24282B]">
                  B. Typography Sizes & Line Height
                </h2>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <label
                    htmlFor="control-size-section"
                    className="block font-semibold text-[#24282B]"
                  >
                    Major Section Heading Size (<code>--theme-size-section-heading</code>)
                  </label>
                  <select
                    id="control-size-section"
                    value={settings.sizeSectionHeading}
                    onChange={(e) =>
                      updateSetting('sizeSectionHeading', e.target.value)
                    }
                    className="mt-1.5 w-full rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-2 text-xs text-[#24282B]"
                  >
                    {HEADING_SIZE_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="control-size-subsection"
                    className="block font-semibold text-[#24282B]"
                  >
                    Subheading Size (<code>--theme-size-subsection-heading</code>)
                  </label>
                  <select
                    id="control-size-subsection"
                    value={settings.sizeSubsectionHeading}
                    onChange={(e) =>
                      updateSetting('sizeSubsectionHeading', e.target.value)
                    }
                    className="mt-1.5 w-full rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-2 text-xs text-[#24282B]"
                  >
                    {SUBHEADING_SIZE_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="control-size-info-heading"
                    className="block font-semibold text-[#24282B]"
                  >
                    Information Heading Size (<code>--theme-size-info-heading</code>)
                  </label>
                  <select
                    id="control-size-info-heading"
                    value={settings.sizeInfoHeading}
                    onChange={(e) =>
                      updateSetting('sizeInfoHeading', e.target.value)
                    }
                    className="mt-1.5 w-full rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-2 text-xs text-[#24282B]"
                  >
                    {INFO_HEADING_SIZE_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="control-size-product-title"
                    className="block font-semibold text-[#24282B]"
                  >
                    Product Title Size (<code>--theme-size-product-title</code>)
                  </label>
                  <select
                    id="control-size-product-title"
                    value={settings.sizeProductTitle}
                    onChange={(e) =>
                      updateSetting('sizeProductTitle', e.target.value)
                    }
                    className="mt-1.5 w-full rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-2 text-xs text-[#24282B]"
                  >
                    {PRODUCT_TITLE_SIZE_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="control-size-body"
                    className="block font-semibold text-[#24282B]"
                  >
                    Body Font Size (<code>--theme-size-body</code>)
                  </label>
                  <select
                    id="control-size-body"
                    value={settings.sizeBody}
                    onChange={(e) => updateSetting('sizeBody', e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-2 text-xs text-[#24282B]"
                  >
                    {BODY_SIZE_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="control-line-height-body"
                    className="block font-semibold text-[#24282B]"
                  >
                    Body Line Height (<code>--theme-leading-body</code>)
                  </label>
                  <select
                    id="control-line-height-body"
                    value={settings.lineHeightBody}
                    onChange={(e) =>
                      updateSetting('lineHeightBody', e.target.value)
                    }
                    className="mt-1.5 w-full rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-2 text-xs text-[#24282B]"
                  >
                    {LINE_HEIGHT_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Principal Colors */}
            <div className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-5">
              <div className="flex items-center gap-2 border-b border-[#E3E1DB] pb-3">
                <Palette className="h-4 w-4 text-[#28537D]" />
                <h2 className="font-serif text-base font-semibold text-[#24282B]">
                  D. Principal Colors
                </h2>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3.5 text-xs">
                {(
                  [
                    {
                      key: 'colorPrimaryText',
                      label: 'Primary Text & Headings',
                      varName: '--theme-color-text-primary',
                    },
                    {
                      key: 'colorSecondaryText',
                      label: 'Secondary / Muted Text',
                      varName: '--theme-color-text-secondary',
                    },
                    {
                      key: 'colorBrandPrimary',
                      label: 'Brand Primary & Buttons',
                      varName: '--theme-color-brand-primary',
                    },
                    {
                      key: 'colorLink',
                      label: 'Brand Accent & Links',
                      varName: '--theme-color-link',
                    },
                    {
                      key: 'colorPageBg',
                      label: 'Main Page Background',
                      varName: '--theme-color-page-bg',
                    },
                    {
                      key: 'colorSurfaceBg',
                      label: 'Editorial Surface Background',
                      varName: '--theme-color-surface',
                    },
                    {
                      key: 'colorBorder',
                      label: 'Hairline Borders',
                      varName: '--theme-color-border',
                    },
                  ] as const
                ).map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#E3E1DB] bg-[#FAF9F6] px-3 py-2"
                  >
                    <div>
                      <div className="font-semibold text-[#24282B]">
                        {item.label}
                      </div>
                      <div className="font-mono text-[10px] text-[#636A6F]">
                        {item.varName}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        aria-label={item.label}
                        value={settings[item.key]}
                        onChange={(e) => {
                          const nextHex = e.target.value;
                          updateSetting(item.key, nextHex);
                          if (item.key === 'colorPrimaryText') {
                            updateSetting('colorBodyText', nextHex);
                          }
                          if (item.key === 'colorBrandPrimary') {
                            updateSetting('colorButtonBg', nextHex);
                          }
                        }}
                        className="h-7 w-9 cursor-pointer rounded border border-[#E3E1DB] bg-white p-0.5"
                      />
                      <input
                        type="text"
                        aria-label={`${item.label} hex code`}
                        value={settings[item.key]}
                        onChange={(e) => {
                          const nextHex = e.target.value;
                          updateSetting(item.key, nextHex);
                          if (item.key === 'colorPrimaryText') {
                            updateSetting('colorBodyText', nextHex);
                          }
                          if (item.key === 'colorBrandPrimary') {
                            updateSetting('colorButtonBg', nextHex);
                          }
                        }}
                        className="w-20 rounded border border-[#E3E1DB] bg-[#FFFFFF] px-2 py-1 font-mono text-xs text-[#24282B]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* =================================================================
              RIGHT COLUMN: LIVE EDITORIAL SPECIMEN CANVAS (8 Cols)
             ================================================================= */}
          <div className="space-y-10 lg:col-span-8">
            {/* SPECIMEN 1: GIFT GUIDE HEADLINE & INTRO */}
            <section
              aria-labelledby="specimen-guide-headline"
              className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E1DB] pb-3 text-xs text-[#636A6F]">
                <span className="font-mono text-[11px] font-semibold text-[#28537D]">
                  Specimen 01 · Gift Guide Headline (.theme-display-heading + .theme-intro-text + .theme-body-text)
                </span>
                <span className="theme-metadata">Home & Rituals · Gift Guide</span>
              </div>

              <div className="mt-5">
                <p className="theme-kicker text-xs font-semibold text-[#28537D]">
                  Home & Rituals · Gift Guide
                </p>
                <h2
                  id="specimen-guide-headline"
                  className="theme-display-heading mt-2 font-serif text-3xl font-semibold text-[#24282B] sm:text-5xl"
                >
                  The Best Gifts for Coffee & Tea Ritualists
                </h2>
                <p className="theme-intro-text mt-3.5 max-w-2xl text-lg text-[#636A6F]">
                  Tactile, daily-use brewing tools and handmade ceramics backed by behavioral research on everyday relationship rituals.
                </p>
                <p className="theme-body-text theme-reading-measure mt-5 text-[#24282B]">
                  In longitudinal gift studies, objects that integrate into an existing morning ritual consistently outperform novelty splurges. Every time your recipient weighs their morning beans or wraps their hands around a stoneware mug, the gift quietly reinforces your connection.
                </p>
              </div>
            </section>

            {/* SPECIMEN 2: MAJOR EDITORIAL SECTION & SUBSECTION HEADING */}
            <section
              aria-labelledby="specimen-major-section"
              className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E1DB] pb-3 text-xs text-[#636A6F]">
                <span className="font-mono text-[11px] font-semibold text-[#28537D]">
                  Specimen 02 · Major Editorial Section & Subsection (.theme-section-heading + .theme-subsection-heading)
                </span>
                <span className="theme-metadata">Hierarchy Check</span>
              </div>

              <div className="mt-5">
                <p className="theme-kicker text-xs font-semibold text-[#28537D]">
                  Chapter 01 · $25 to $75
                </p>
                <h2
                  id="specimen-major-section"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
                >
                  Everyday Tactile Upgrades ($25 to $75)
                </h2>
                <p className="theme-intro-text mt-2 max-w-2xl text-sm text-[#636A6F] sm:text-base">
                  Thoughtful mid-tier gifts that elevate an ordinary weekday routine without demanding extra counter space.
                </p>

                {/* Subsection inside Major Section */}
                <div className="mt-6 rounded-2xl border border-[#C6E4D6] bg-[#E5F3EC]/65 p-5 sm:p-6">
                  <div className="theme-kicker text-xs font-semibold text-[#1B3D5F]">
                    Curator’s Field Note
                  </div>
                  <h3 className="theme-subsection-heading mt-1.5 font-serif text-xl font-semibold text-[#24282B]">
                    Why Tactile Weight Matters More Than Novelty Features
                  </h3>
                  <p className="theme-body-text theme-reading-measure mt-2.5 text-[#24282B]">
                    Notice how this subsection heading (<code>--theme-size-subsection-heading</code>) remains clearly larger and more prominent than the body paragraph beneath it—preventing the hierarchy inversion where subheadings looked smaller than body copy.
                  </p>
                </div>
              </div>
            </section>

            {/* SPECIMEN 3: INFORMATION HEADING FOLLOWED BY BODY COPY */}
            <section
              aria-labelledby="specimen-info-heading"
              className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E1DB] pb-3 text-xs text-[#636A6F]">
                <span className="font-mono text-[11px] font-semibold text-[#28537D]">
                  Specimen 03 · Information Heading & Structured Notes (.theme-info-heading + .theme-info-label)
                </span>
                <span className="theme-metadata">Callouts & Considerations</span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-[#E3E1DB] bg-[#FAF9F6] p-5">
                  <h3
                    id="specimen-info-heading"
                    className="theme-info-heading font-serif text-base font-semibold text-[#24282B]"
                  >
                    Who This Guide Is Written For
                  </h3>
                  <p className="theme-body-sm mt-2 leading-relaxed text-[#24282B]">
                    Information headings sit one step below subsection headings but remain distinct in weight and serif voice above supporting body paragraphs and checklists.
                  </p>
                </div>

                <div className="rounded-xl border border-[#E3E1DB] bg-[#FAF9F6] p-5">
                  <dl className="space-y-3">
                    <div>
                      <dt className="theme-info-label font-semibold text-[#1B3D5F]">
                        Best suited for
                      </dt>
                      <dd className="theme-body-sm mt-1 text-[#24282B]">
                        Partners, close friends, or gracious weekend hosts who appreciate quiet craftsmanship.
                      </dd>
                    </div>
                    <div className="border-t border-[#E3E1DB] pt-2.5">
                      <dt className="theme-info-label font-semibold text-[#636A6F]">
                        What to keep in mind
                      </dt>
                      <dd className="theme-caption mt-1 text-[#636A6F]">
                        Hand-wash recommended to preserve the satin mineral glaze.
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            {/* SPECIMEN 4: PRODUCT RECOMMENDATION CARD */}
            <section
              aria-labelledby="specimen-product-rec"
              className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E1DB] pb-3 text-xs text-[#636A6F]">
                <span className="font-mono text-[11px] font-semibold text-[#28537D]">
                  Specimen 04 · Product Recommendation (.theme-product-title-featured + .theme-product-title)
                </span>
                <span className="theme-metadata">Guide Recommendation</span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-12">
                {/* Featured Lead Product Title */}
                <div className="rounded-2xl border border-[#E3E1DB] bg-[#FAF9F6] p-5 md:col-span-7">
                  <div className="flex items-center justify-between text-xs">
                    <span className="theme-kicker inline-flex items-center gap-1.5 font-semibold text-[#1B3D5F]">
                      <Award className="h-3.5 w-3.5 text-[#28537D]" />
                      Editor’s Pick · Featured Lead
                    </span>
                    <span className="font-semibold text-[#24282B] tabular-nums">
                      $68 USD
                    </span>
                  </div>

                  <p className="theme-metadata mt-2 text-xs text-[#636A6F]">
                    Hasami Porcelain · Tabletop & Drinkware
                  </p>
                  <h3
                    id="specimen-product-rec"
                    className="theme-product-title-featured mt-1 font-serif text-2xl font-semibold text-[#24282B]"
                  >
                    Hasami Matte Stoneware Pour-Over Set
                  </h3>
                  <p className="theme-body-text mt-3 text-[#24282B]">
                    Fired in Nagasaki from a proprietary blend of Amakusa porcelain stone and organic clay, this two-piece nesting brewer turns a solitary morning cup into a grounding tactile ritual.
                  </p>
                </div>

                {/* Standard Grid Product Title */}
                <div className="flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-5 md:col-span-5">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="theme-kicker font-semibold text-[#28537D]">
                        No. 02 · Best Under $45
                      </span>
                      <span className="font-semibold text-[#24282B] tabular-nums">
                        $38 USD
                      </span>
                    </div>
                    <p className="theme-metadata mt-1 text-xs text-[#636A6F]">
                      Kinto Japan · Drinkware
                    </p>
                    <h4 className="theme-product-title mt-1 font-serif text-xl font-semibold text-[#24282B]">
                      Kinto Kronos Double-Wall Espresso Cups
                    </h4>
                    <p className="theme-body-sm mt-2.5 text-[#24282B]">
                      Suspended heat-resistant glass keeps espresso warm while remaining cool to the touch.
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#E3E1DB] pt-3">
                    <a
                      href="/gift-guides/gifts-for-coffee-and-tea-lovers/"
                      className="theme-link text-xs font-semibold text-[#28537D]"
                    >
                      View in Guide →
                    </a>
                    <span className="theme-caption text-xs text-[#636A6F]">
                      Standard Card Role
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* SPECIMEN 5: PRODUCT PROFILE SECTION */}
            <section
              aria-labelledby="specimen-product-profile"
              className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E1DB] pb-3 text-xs text-[#636A6F]">
                <span className="font-mono text-[11px] font-semibold text-[#28537D]">
                  Specimen 05 · Product Profile Section (.theme-page-title + .theme-section-heading + Specs)
                </span>
                <span className="theme-metadata">Editorial Gift Profile</span>
              </div>

              <div className="mt-5">
                <p className="theme-kicker text-xs font-semibold text-[#28537D]">
                  01 · Evaluation
                </p>
                <h2
                  id="specimen-product-profile"
                  className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B]"
                >
                  The Gift Verdict
                </h2>
                <p className="theme-body-text theme-reading-measure mt-3 text-[#24282B]">
                  An heirloom-grade daily object that hits the rare sweet spot between architectural beauty and effortless weekday utility.
                </p>

                <dl className="mt-5 divide-y divide-[#E3E1DB] rounded-xl border border-[#E3E1DB] bg-[#FAF9F6]">
                  <div className="grid grid-cols-1 gap-1 px-4 py-3 text-sm sm:grid-cols-12">
                    <dt className="theme-info-label font-semibold text-[#636A6F] sm:col-span-4">
                      Maker / Brand
                    </dt>
                    <dd className="theme-body-sm text-[#24282B] sm:col-span-8">
                      Hasami Porcelain (Nagasaki, Japan)
                    </dd>
                  </div>
                  <div className="grid grid-cols-1 gap-1 px-4 py-3 text-sm sm:grid-cols-12">
                    <dt className="theme-info-label font-semibold text-[#636A6F] sm:col-span-4">
                      Materials & Care
                    </dt>
                    <dd className="theme-body-sm text-[#24282B] sm:col-span-8">
                      Natural Amakusa porcelain & clay mixture; dishwasher safe.
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* SPECIMEN 6 & 7: SIDEBAR NAVIGATION ITEM + BUTTONS AND LINKS */}
            <section
              aria-labelledby="specimen-nav-and-actions"
              className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E1DB] pb-3 text-xs text-[#636A6F]">
                <span className="font-mono text-[11px] font-semibold text-[#28537D]">
                  Specimen 06 & 07 · Sidebar Navigation Items, Buttons & Editorial Links
                </span>
                <span className="theme-metadata">UI & Interactive Tokens</span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-8 md:grid-cols-12">
                {/* Sidebar Navigation Specimen */}
                <div className="md:col-span-5">
                  <div className="border-t border-[#E3E1DB] pt-3">
                    <div className="flex items-center justify-between pb-2.5">
                      <span
                        id="specimen-nav-and-actions"
                        className="theme-info-heading font-serif text-sm font-semibold text-[#24282B]"
                      >
                        In This Guide
                      </span>
                      <span className="theme-metadata text-xs text-[#636A6F]">
                        12 picks
                      </span>
                    </div>

                    <ul className="space-y-1 border-t border-[#E3E1DB] pt-2.5">
                      <li>
                        <div className="theme-sidebar-link-active flex w-full items-center justify-between border-l-2 border-[#1B3D5F] py-1.5 pl-2.5 text-xs font-semibold text-[#1B3D5F]">
                          <span className="inline-flex items-center gap-2">
                            <ListChecks className="h-3.5 w-3.5" />
                            <span>Quick Picks (Active)</span>
                          </span>
                          <span className="text-[11px] tabular-nums">5</span>
                        </div>
                      </li>
                      <li>
                        <div className="theme-sidebar-link flex w-full items-center justify-between py-1.5 pl-3 text-xs text-[#636A6F]">
                          <span className="inline-flex items-center gap-2">
                            <Compass className="h-3.5 w-3.5" />
                            <span>Find the Right Gift</span>
                          </span>
                        </div>
                      </li>
                      <li>
                        <div className="theme-sidebar-link flex w-full items-center justify-between py-1.5 pl-3 text-xs text-[#636A6F]">
                          <span className="inline-flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>How to Choose</span>
                          </span>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Buttons & Links Specimen */}
                <div className="space-y-5 md:col-span-7">
                  <div>
                    <div className="theme-info-label mb-2.5 font-semibold text-[#636A6F]">
                      Primary & Secondary Buttons (<code>.theme-button-text</code>)
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className="theme-btn-primary theme-button-text inline-flex items-center gap-2 rounded-lg bg-[#1B3D5F] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#28537D]"
                      >
                        <span>Read Gift Profile · $68</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        className="theme-btn-secondary theme-button-text inline-flex items-center gap-1.5 rounded-lg border border-[#E3E1DB] bg-[#FAF9F6] px-4 py-2.5 text-xs font-semibold text-[#24282B] transition-colors hover:border-[#28537D] hover:text-[#28537D]"
                      >
                        <Bookmark className="h-3.5 w-3.5 text-[#28537D]" />
                        <span>Save to Gift List</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[#E3E1DB] pt-4">
                    <div className="theme-info-label mb-2 font-semibold text-[#636A6F]">
                      Editorial Text Link & Top Navigation Link
                    </div>
                    <div className="flex flex-wrap items-center gap-6">
                      <a
                        href="/gift-guides/gifts-for-coffee-and-tea-lovers/"
                        className="theme-link text-xs font-semibold text-[#28537D] underline decoration-[#28537D]/35 underline-offset-4 hover:text-[#1B3D5F]"
                      >
                        Open Live Coffee & Tea Gift Guide →
                      </a>

                      <a
                        href="/products/hasami-porcelain-pour-over-set/"
                        className="theme-nav-link text-sm font-medium text-[#636A6F] hover:text-[#24282B]"
                      >
                        Top Nav Link Specimen
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
