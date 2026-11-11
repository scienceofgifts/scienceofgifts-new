import React from 'react';
import {
  Article,
  GiftGuide,
  ResearchCitation,
} from '../../types/content';
import {
  ArrowRight,
  BookOpen,
  Compass,
  ExternalLink,
  FlaskConical,
  Sparkles,
} from 'lucide-react';

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
      className="scroll-mt-24 space-y-8 border-t border-[#D5CFC4] pt-10"
    >
      {/* Research Citations & Behavioral Backing (when present) */}
      {citations.length > 0 && (
        <aside
          aria-labelledby="guide-research-backing-heading"
          className="rounded-3xl border border-[#D5CFC4] bg-[#F4EFE6] p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5CFC4] pb-4">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#28537D]">
              <FlaskConical className="h-3.5 w-3.5" />
              Behavioral Science Bibliography
            </div>
            <span className="font-mono text-xs text-[#62666A] tabular-nums">
              {citations.length} Peer-Reviewed Studies Referenced
            </span>
          </div>

          <h3
            id="guide-research-backing-heading"
            className="mt-4 font-serif text-xl font-bold text-[#222426]"
          >
            The Research Behind These Recommendations
          </h3>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {citations.map((cit) => (
              <div
                key={cit.id}
                className="flex flex-col justify-between rounded-2xl border border-[#D5CFC4] bg-[#FAF7F2] p-4"
              >
                <div>
                  <div className="font-mono text-[11px] font-bold text-[#28537D] tabular-nums">
                    {cit.authors} ({cit.year})
                  </div>
                  <h4 className="mt-1 font-serif text-sm font-bold leading-snug text-[#222426]">
                    {cit.title}
                  </h4>
                  <p className="mt-1 text-[11px] italic text-[#62666A]">
                    {cit.publication}
                  </p>
                  <p className="mt-2.5 text-xs leading-relaxed text-[#292B2D]">
                    {(cit.keyFinding ?? '').replace(/\s*—\s*/g, ', ')}
                  </p>
                </div>

                <a
                  href={cit.doiOrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 border-t border-[#DFDBD3] pt-2.5 text-[11px] font-bold text-[#28537D] hover:text-[#1B3D5F]"
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
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#D5CFC4] pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#28537D]">
              Continue Exploring · Science of Gifts
            </p>
            <h2
              id="related-discoveries-heading"
              className="mt-1 font-serif text-2xl font-bold text-[#222426] sm:text-3xl"
            >
              Companion Gift Guides & Research Essays
            </h2>
          </div>
          <a
            href="/gift-guides/"
            className="text-xs font-bold text-[#28537D] underline decoration-[#28537D]/30 underline-offset-4 hover:text-[#1B3D5F]"
          >
            Browse All Editorial Guides →
          </a>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {relatedGuides.map((relGuide) => (
            <article
              key={relGuide.id}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#D5CFC4] bg-[#FAF7F2] transition-shadow hover:shadow-sm"
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
                  className="block aspect-[16/9] w-full overflow-hidden border-b border-[#DFDBD3] bg-[#EDE7DC]"
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
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#28537D]">
                    <Sparkles className="h-3 w-3" />
                    Companion Gift Guide
                  </div>
                  <h3 className="mt-1.5 font-serif text-lg font-bold leading-snug text-[#222426]">
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
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#62666A]">
                    {relGuide.subtitle.replace(/\s*—\s*/g, ', ')}
                  </p>
                </div>
              </div>
              <div className="border-t border-[#DFDBD3] bg-[#F4EFE6]/60 px-5 py-3 text-xs font-bold text-[#28537D]">
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
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#D5CFC4] bg-[#FAF7F2] transition-shadow hover:shadow-sm"
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
                  className="block aspect-[16/9] w-full overflow-hidden border-b border-[#DFDBD3] bg-[#EDE7DC]"
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
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#62666A]">
                    <BookOpen className="h-3 w-3 text-[#28537D]" />
                    {art.category} · {art.readTimeMinutes} min read
                  </div>
                  <h3 className="mt-1.5 font-serif text-lg font-bold leading-snug text-[#222426]">
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
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#62666A]">
                    {art.subtitle.replace(/\s*—\s*/g, ', ')}
                  </p>
                </div>
              </div>
              <div className="border-t border-[#DFDBD3] bg-[#F4EFE6]/60 px-5 py-3 text-xs font-bold text-[#28537D]">
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
          <div className="flex flex-col justify-between rounded-2xl border border-[#D5CFC4] bg-[#F4EFE6] p-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#28537D]">
                <Compass className="h-3.5 w-3.5" />
                Interactive Discovery
              </div>
              <h3 className="mt-2 font-serif text-xl font-bold text-[#222426]">
                Still Searching for the Exact Match?
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#292B2D] sm:text-sm">
                Use the interactive Science of Gifts Finder to filter every vetted object in the catalog by recipient, occasion, personality vibe, and exact budget ceiling.
              </p>
            </div>
            <div className="mt-5 border-t border-[#D5CFC4] pt-4">
              <a
                href="/gift-finder/"
                className="inline-flex items-center gap-2 rounded-xl bg-[#28537D] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#1E4164]"
              >
                Explore the Gift Finder
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
