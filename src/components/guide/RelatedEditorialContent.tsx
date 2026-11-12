import React from 'react';
import {
  Article,
  GiftGuide,
  ResearchCitation,
} from '../../types/content';
import { ArrowRight, ExternalLink } from 'lucide-react';

export interface RelatedEditorialContentProps {
  relatedGuides: GiftGuide[];
  relatedArticles: Article[];
  citations: ResearchCitation[];
  onOpenGuide?: (slug: string) => void;
  onOpenArticle?: (slug: string) => void;
}

export const RelatedEditorialContent: React.FC<
  RelatedEditorialContentProps
> = ({
  relatedGuides,
  relatedArticles,
  citations,
  onOpenGuide,
  onOpenArticle,
}) => {
  return (
    <section
      id="related-discoveries"
      aria-labelledby="related-discoveries-heading"
      className="scroll-mt-24 space-y-10 border-t border-[#E3E1DB] pt-10"
    >
      {/* Research Citations & Behavioral Backing */}
      {citations.length > 0 && (
        <aside
          aria-labelledby="guide-research-backing-heading"
          className="rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E1DB] pb-3.5">
            <span className="theme-kicker text-xs font-semibold text-[#28537D]">
              Research Bibliography
            </span>
            <span className="theme-metadata text-xs text-[#636A6F] tabular-nums">
              {citations.length} Peer-Reviewed Studies Referenced
            </span>
          </div>

          <h3
            id="guide-research-backing-heading"
            className="theme-subsection-heading mt-4 font-serif text-xl font-semibold text-[#24282B]"
          >
            The Research Behind These Recommendations
          </h3>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            {citations.map((cit) => (
              <div
                key={cit.id}
                className="flex flex-col justify-between rounded-xl border border-[#E3E1DB] bg-[#FAF9F6] p-4"
              >
                <div>
                  <div className="text-xs font-semibold text-[#1B3D5F] tabular-nums">
                    {cit.authors} ({cit.year})
                  </div>
                  <h4 className="theme-info-heading mt-1 font-serif text-sm font-semibold leading-snug text-[#24282B]">
                    {cit.title}
                  </h4>
                  <p className="theme-metadata mt-1 text-[11px] italic text-[#636A6F]">
                    {cit.publication}
                  </p>
                  <p className="theme-body-sm mt-2.5 text-xs leading-relaxed text-[#24282B]">
                    {(cit.keyFinding ?? '').replace(/\s*—\s*/g, ', ')}
                  </p>
                </div>

                <a
                  href={cit.doiOrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 border-t border-[#E3E1DB] pt-2.5 text-xs font-semibold text-[#28537D] hover:text-[#1B3D5F]"
                >
                  Source Reference
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Companion Guides & Editorial Stories */}
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E3E1DB] pb-4">
          <div>
            <p className="theme-kicker text-xs font-semibold text-[#28537D]">
              Further Reading
            </p>
            <h2
              id="related-discoveries-heading"
              className="theme-section-heading mt-1 font-serif text-2xl font-semibold text-[#24282B] sm:text-3xl"
            >
              Companion Gift Guides & Research Essays
            </h2>
          </div>
          <a
            href="/gift-guides/"
            className="theme-link text-xs font-semibold text-[#28537D] underline decoration-[#28537D]/35 underline-offset-4 hover:text-[#1B3D5F]"
          >
            Browse All Guides →
          </a>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {relatedGuides.map((relGuide) => (
            <article
              key={relGuide.id}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF]"
            >
              <div>
                <a
                  href={`/gift-guides/${relGuide.slug}/`}
                  onClick={(e) => {
                    if (onOpenGuide) {
                      e.preventDefault();
                      onOpenGuide(relGuide.slug);
                    }
                  }}
                  className="block aspect-[16/9] w-full overflow-hidden border-b border-[#E3E1DB] bg-[#F6F4EF]"
                >
                  <img
                    src={relGuide.heroImageUrl}
                    alt={relGuide.heroImageAlt}
                    width={480}
                    height={270}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </a>
                <div className="p-5">
                  <div className="theme-kicker text-xs font-semibold text-[#28537D]">
                    Gift Guide
                  </div>
                  <h3 className="theme-subsection-heading mt-1 font-serif text-lg font-semibold leading-snug text-[#24282B]">
                    <a
                      href={`/gift-guides/${relGuide.slug}/`}
                      onClick={(e) => {
                        if (onOpenGuide) {
                          e.preventDefault();
                          onOpenGuide(relGuide.slug);
                        }
                      }}
                      className="hover:text-[#28537D]"
                    >
                      {relGuide.title}
                    </a>
                  </h3>
                  <p className="theme-caption mt-2 line-clamp-2 text-xs leading-relaxed text-[#636A6F]">
                    {relGuide.subtitle.replace(/\s*—\s*/g, ', ')}
                  </p>
                </div>
              </div>
              <div className="border-t border-[#E3E1DB] bg-[#FAF9F6] px-5 py-3 text-xs font-semibold text-[#28537D]">
                <a
                  href={`/gift-guides/${relGuide.slug}/`}
                  onClick={(e) => {
                    if (onOpenGuide) {
                      e.preventDefault();
                      onOpenGuide(relGuide.slug);
                    }
                  }}
                  className="inline-flex items-center gap-1 hover:text-[#1B3D5F]"
                >
                  Read Gift Guide
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </article>
          ))}

          {relatedArticles.map((art) => (
            <article
              key={art.id}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF]"
            >
              <div>
                <a
                  href={`/articles/${art.slug}/`}
                  onClick={(e) => {
                    if (onOpenArticle) {
                      e.preventDefault();
                      onOpenArticle(art.slug);
                    }
                  }}
                  className="block aspect-[16/9] w-full overflow-hidden border-b border-[#E3E1DB] bg-[#F6F4EF]"
                >
                  <img
                    src={art.heroImageUrl}
                    alt={art.heroAlt}
                    width={480}
                    height={270}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </a>
                <div className="p-5">
                  <div className="theme-metadata text-xs font-medium text-[#636A6F]">
                    {art.category} · {art.readTimeMinutes} min read
                  </div>
                  <h3 className="theme-subsection-heading mt-1 font-serif text-lg font-semibold leading-snug text-[#24282B]">
                    <a
                      href={`/articles/${art.slug}/`}
                      onClick={(e) => {
                        if (onOpenArticle) {
                          e.preventDefault();
                          onOpenArticle(art.slug);
                        }
                      }}
                      className="hover:text-[#28537D]"
                    >
                      {art.title}
                    </a>
                  </h3>
                  <p className="theme-caption mt-2 line-clamp-2 text-xs leading-relaxed text-[#636A6F]">
                    {art.subtitle.replace(/\s*—\s*/g, ', ')}
                  </p>
                </div>
              </div>
              <div className="border-t border-[#E3E1DB] bg-[#FAF9F6] px-5 py-3 text-xs font-semibold text-[#28537D]">
                <a
                  href={`/articles/${art.slug}/`}
                  onClick={(e) => {
                    if (onOpenArticle) {
                      e.preventDefault();
                      onOpenArticle(art.slug);
                    }
                  }}
                  className="inline-flex items-center gap-1 hover:text-[#1B3D5F]"
                >
                  Read Research Essay
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </article>
          ))}

          {/* Interactive Gift Finder Discovery Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#E3E1DB] bg-[#FFFFFF] p-6">
            <div>
              <div className="theme-kicker text-xs font-semibold text-[#28537D]">
                Interactive Gift Finder
              </div>
              <h3 className="theme-subsection-heading mt-1.5 font-serif text-xl font-semibold text-[#24282B]">
                Still Searching for the Right Match?
              </h3>
              <p className="theme-caption mt-2 text-xs leading-relaxed text-[#636A6F] sm:text-sm">
                Filter every vetted object in the catalog by recipient, occasion, personality vibe, and budget ceiling.
              </p>
            </div>
            <div className="mt-5 border-t border-[#E3E1DB] pt-4">
              <a
                href="/gift-finder/"
                className="theme-button-text inline-flex items-center gap-2 rounded-lg bg-[#1B3D5F] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#28537D]"
              >
                Open Gift Finder
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
