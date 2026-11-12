import React from 'react';
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  Info,
  ShieldCheck,
} from 'lucide-react';
import {
  SHOP_EXTERNAL_URL,
  SHOP_RETURNS_FAQ_URL,
} from '../config/navigationConfig';

export interface PublicationInfoSection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  ownerReviewNote?: string;
}

export interface PublicationInfoPageViewProps {
  currentPath:
    | '/about/'
    | '/contact/'
    | '/editorial-policy/'
    | '/affiliate-disclosure/'
    | '/privacy-policy/'
    | '/terms-of-use/';
  kicker: string;
  title: string;
  subtitle: string;
  lastUpdated?: string;
  ownerReviewSummary?: string;
  sections: PublicationInfoSection[];
  children?: React.ReactNode;
}

const PUBLICATION_NAV_ITEMS: Array<{
  label: string;
  href: PublicationInfoPageViewProps['currentPath'] | '/site-map/';
}> = [
  { label: 'About Science of Gifts', href: '/about/' },
  { label: 'Editorial Policy', href: '/editorial-policy/' },
  { label: 'Affiliate Disclosure', href: '/affiliate-disclosure/' },
  { label: 'Contact', href: '/contact/' },
  { label: 'Privacy Policy', href: '/privacy-policy/' },
  { label: 'Terms of Use', href: '/terms-of-use/' },
  { label: 'Site Map', href: '/site-map/' },
];

export const PublicationInfoPageView: React.FC<PublicationInfoPageViewProps> = ({
  currentPath,
  kicker,
  title,
  subtitle,
  lastUpdated,
  ownerReviewSummary,
  sections,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24 text-[#24282B]">
      {/* =====================================================================
          HEADER & BREADCRUMB
         ===================================================================== */}
      <header className="border-b border-[#E3E1DB] bg-[#FAF9F6]">
        <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E1DB] pb-3.5 text-xs text-[#636A6F]">
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-2 font-medium"
            >
              <a
                href="/"
                className="text-[#636A6F] transition-colors hover:text-[#28537D]"
              >
                Home
              </a>
              <span aria-hidden="true" className="text-[#C5C1B8]">
                /
              </span>
              <span className="text-[#636A6F]">The Publication</span>
              <span aria-hidden="true" className="text-[#C5C1B8]">
                /
              </span>
              <span
                aria-current="page"
                className="font-semibold text-[#24282B]"
              >
                {title}
              </span>
            </nav>

            {lastUpdated && (
              <span className="theme-metadata text-xs text-[#636A6F] tabular-nums">
                Last reviewed: {lastUpdated}
              </span>
            )}
          </div>

          <div className="py-10 sm:py-14">
            <p className="theme-kicker text-xs font-semibold uppercase tracking-widest text-[#28537D]">
              {kicker}
            </p>
            <h1 className="theme-page-title mt-2 max-w-3xl font-serif text-3xl font-semibold leading-tight text-[#24282B] sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            <p className="theme-intro-text mt-4 max-w-2xl text-base leading-relaxed text-[#636A6F] sm:text-lg">
              {subtitle}
            </p>
          </div>
        </div>
      </header>

      {/* =====================================================================
          MAIN TWO-COLUMN EDITORIAL LAYOUT
         ===================================================================== */}
      <div className="mx-auto max-w-[1280px] px-4 pt-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Main Editorial Prose (8 columns) */}
          <div className="space-y-12 lg:col-span-8">
            {ownerReviewSummary && (
              <div
                role="note"
                aria-label="Items requiring publication owner review"
                className="rounded-2xl border border-[#C6E4D6] bg-[#E5F3EC]/75 p-6 text-sm text-[#24282B]"
              >
                <div className="flex items-start gap-3">
                  <Info
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#1B3D5F]"
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="theme-info-heading font-serif text-base font-semibold text-[#1B3D5F]">
                      Draft Notice · Owner Review Items Highlighted
                    </h2>
                    <p className="theme-body-sm mt-1.5 leading-relaxed text-[#24282B]">
                      {ownerReviewSummary}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`heading-${section.id}`}
                className="scroll-mt-24 border-b border-[#E3E1DB] pb-10 last:border-b-0"
              >
                <h2
                  id={`heading-${section.id}`}
                  className="theme-section-heading font-serif text-2xl font-semibold text-[#24282B]"
                >
                  {section.heading}
                </h2>

                <div className="theme-body-text theme-reading-measure mt-4 space-y-4 text-[#24282B]">
                  {section.paragraphs.map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>

                {section.bullets && section.bullets.length > 0 && (
                  <ul className="mt-4 space-y-2.5">
                    {section.bullets.map((bullet, idx) => (
                      <li
                        key={idx}
                        className="theme-body-sm flex items-start gap-3 text-sm leading-relaxed text-[#24282B]"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#28537D]"
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.ownerReviewNote && (
                  <div className="mt-5 rounded-xl border border-[#E3E1DB] bg-[#FFFFFF] p-4 text-xs text-[#636A6F]">
                    <strong className="font-semibold text-[#1B3D5F]">
                      Owner Confirmation Item:{' '}
                    </strong>
                    {section.ownerReviewNote}
                  </div>
                )}
              </section>
            ))}

            {children}
          </div>

          {/* Right Column: Publication Information Navigation Rail (4 columns) */}
          <aside
            aria-label="Publication Information Navigation"
            className="space-y-6 lg:col-span-4 lg:sticky lg:top-24"
          >
            <div className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6">
              <div className="flex items-center gap-2 border-b border-[#E3E1DB] pb-3">
                <BookOpen
                  className="h-4 w-4 text-[#28537D]"
                  aria-hidden="true"
                />
                <h2 className="theme-info-heading font-serif text-base font-semibold text-[#24282B]">
                  Publication Information
                </h2>
              </div>

              <ul className="mt-4 space-y-1.5 text-sm">
                {PUBLICATION_NAV_ITEMS.map((item) => {
                  const isActive = item.href === currentPath;
                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={`theme-sidebar-link flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                          isActive
                            ? 'bg-[#E5F3EC] font-semibold text-[#1B3D5F]'
                            : 'text-[#24282B] hover:bg-[#FAF9F6] hover:text-[#28537D]'
                        }`}
                      >
                        <span>{item.label}</span>
                        <ArrowRight
                          className="h-3.5 w-3.5 shrink-0 text-[#636A6F]"
                          aria-hidden="true"
                        />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Distinct Store vs Publication Policy Box */}
            <div className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className="h-4 w-4 text-[#28537D]"
                  aria-hidden="true"
                />
                <h3 className="theme-info-heading font-serif text-base font-semibold text-[#24282B]">
                  Science of Gifts Shop
                </h3>
              </div>
              <p className="theme-body-sm text-xs leading-relaxed text-[#636A6F]">
                First-party merchandise sold through the Science of Gifts Shop is
                hosted on Fourthwall and governed by separate store shipping,
                order, and return policies.
              </p>
              <div className="pt-1 flex flex-col gap-2 text-xs font-semibold">
                <a
                  href={SHOP_EXTERNAL_URL}
                  className="theme-link inline-flex items-center gap-1.5 text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                >
                  <span>Visit Science of Gifts Shop</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
                <a
                  href={SHOP_RETURNS_FAQ_URL}
                  className="theme-link inline-flex items-center gap-1.5 text-[#28537D] hover:text-[#1B3D5F] hover:underline"
                >
                  <span>Shop Returns & FAQ</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
