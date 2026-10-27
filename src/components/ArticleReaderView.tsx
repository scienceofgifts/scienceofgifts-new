import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, BookOpen, ExternalLink } from 'lucide-react';
import { Article, Product } from '../types/content';
import { AUTHORS, CITATIONS, PRODUCTS } from '../data/catalog';
import { PhotoImage } from './ObjectIllustrations';
import { ProductCard } from './ProductCard';

interface ArticleReaderViewProps {
  article: Article;
  savedProductIds: string[];
  onToggleSave: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onBackHome: () => void;
}

export const ArticleReaderView: React.FC<ArticleReaderViewProps> = ({
  article,
  savedProductIds,
  onToggleSave,
  onSelectProduct,
  onBackHome,
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({
    'the-unwrapping-illusion': true,
  });

  const author = AUTHORS[article.authorId];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll <= 0) {
        setScrollProgress(100);
        return;
      }
      const current = Math.min(100, Math.max(0, (window.scrollY / totalScroll) * 100));
      setScrollProgress(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [article.id]);

  const toggleNote = (sectionId: string) => {
    setExpandedNotes((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Thin horizontal reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-40 h-1 bg-[#1B3D5F]/10">
        <div
          className="h-full bg-[#28537D] transition-transform duration-150 origin-left"
          style={{ transform: `scaleX(${scrollProgress / 100})` }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 md:py-14">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#28537D]">
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-1.5 font-semibold text-[#1B3D5F] hover:underline whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Magazine</span>
            </button>
            <span aria-hidden="true">/</span>
            <span>Stories</span>
            <span aria-hidden="true">/</span>
            <span className="text-[#1B3D5F] truncate max-w-xs">{article.category}</span>
          </div>
          <div className="text-xs text-[#28537D] tabular-nums">
            {article.readTimeMinutes} min read
          </div>
        </nav>

        {/* Article Header */}
        <header className="max-w-3xl mb-10">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#28537D] font-semibold mb-3">
            <span>{article.category}</span>
            <span aria-hidden="true">·</span>
            <span>{article.publishedAt}</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-serif font-semibold text-[#1B3D5F] leading-tight text-balance mb-5">
            {article.title}
          </h1>

          <p className="text-lg md:text-xl text-[#28537D] leading-relaxed mb-6">
            {article.subtitle}
          </p>

          {author && (
            <div className="flex items-center gap-3 pt-2">
              <PhotoImage
                src={author.avatarUrl}
                alt={author.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="text-xs text-[#28537D]">
                <span className="font-semibold text-[#1B3D5F]">By {author.name}</span>
                <span aria-hidden="true"> · </span>
                <span>{author.role}</span>
              </div>
            </div>
          )}
        </header>

        {/* Hero Photography Figure */}
        <figure className="mb-14">
          <div className="aspect-16/9 w-full max-h-[480px] rounded-3xl overflow-hidden bg-[#F3ECE1]">
            <PhotoImage
              src={article.heroImageUrl}
              alt={article.heroAlt}
              className="w-full h-full object-cover"
            />
          </div>
          <figcaption className="text-xs font-serif italic text-[#28537D] mt-3">
            {article.heroCaption}
          </figcaption>
        </figure>

        {/* Asymmetric 2-Column Editorial Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Rail: Sticky Table of Contents */}
          <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-6">
            <div className="p-6 rounded-2xl bg-[#F3ECE1]">
              <div className="text-xs uppercase tracking-wider font-semibold text-[#28537D] mb-3">
                In This Story
              </div>
              <ul className="space-y-2.5 text-xs">
                {article.sections.map((sec) => (
                  <li key={sec.id}>
                    <a
                      href={`#${sec.id}`}
                      className="text-[#1B3D5F] hover:text-[#28537D] hover:underline block leading-snug"
                    >
                      {sec.heading}
                    </a>
                  </li>
                ))}
                {article.comparisonTable && (
                  <li>
                    <a
                      href="#empirical-comparison"
                      className="text-[#1B3D5F] hover:text-[#28537D] hover:underline block leading-snug"
                    >
                      Givers vs. Receivers At a Glance
                    </a>
                  </li>
                )}
                <li>
                  <a
                    href="#academic-citations"
                    className="text-[#1B3D5F] hover:text-[#28537D] hover:underline block leading-snug"
                  >
                    Research & Further Reading ({article.citationIds.length})
                  </a>
                </li>
              </ul>
            </div>
          </aside>

          {/* Main Reading Column */}
          <div className="lg:col-span-9 space-y-12">
            {/* Warm Summary Block */}
            <section className="p-7 rounded-2xl bg-[#E8F8F0] max-w-2xl">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-[#1B3D5F] mb-3">
                <BookOpen className="w-4 h-4" />
                <span>The Short Version</span>
              </div>
              <ul className="space-y-2.5 text-sm text-[#1B3D5F] leading-relaxed">
                {article.executiveSummary.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="font-serif italic text-base text-[#28537D] leading-none mt-0.5">
                      {idx + 1}.
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Essay Sections */}
            {article.sections.map((section, sIdx) => {
              const recommendedProducts = (section.recommendedProductIds ?? [])
                .map((id) => PRODUCTS[id])
                .filter(Boolean);

              return (
                <section key={section.id} id={section.id} className="space-y-6 scroll-mt-24">
                  <div className="max-w-2xl space-y-5">
                    <h2 className="text-2xl md:text-3xl font-serif font-semibold text-[#1B3D5F]">
                      {section.heading}
                    </h2>

                    {section.paragraphs.map((p, pIdx) => (
                      <p
                        key={pIdx}
                        className={`text-base text-[#1B3D5F]/90 leading-relaxed ${
                          sIdx === 0 && pIdx === 0
                            ? 'first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-[#1B3D5F]'
                            : ''
                        }`}
                      >
                        {p}
                      </p>
                    ))}

                    {section.pullQuote && (
                      <blockquote className="my-8 py-6 border-y border-[#1B3D5F]/15">
                        <p className="text-xl md:text-2xl font-serif italic text-[#1B3D5F] leading-snug mb-2">
                          “{section.pullQuote.text}”
                        </p>
                        <footer className="text-xs uppercase tracking-wider text-[#28537D]">
                          — {section.pullQuote.attribution}
                        </footer>
                      </blockquote>
                    )}

                    {section.expandableNote && (
                      <div className="rounded-2xl bg-[#EBF3FE] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleNote(section.id)}
                          className="w-full px-6 py-4 flex items-center justify-between text-left text-xs font-semibold text-[#1B3D5F] hover:bg-[#99BFF9]/20 transition-colors"
                        >
                          <span>{section.expandableNote.title}</span>
                          {expandedNotes[section.id] ? (
                            <ChevronUp className="w-4 h-4 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 shrink-0" />
                          )}
                        </button>
                        {expandedNotes[section.id] && (
                          <div className="px-6 pb-5 pt-1 text-xs text-[#28537D] leading-relaxed">
                            {section.expandableNote.methodologyDetail}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {recommendedProducts.length > 0 && (
                    <div className="pt-4">
                      <div className="text-xs uppercase tracking-wider font-semibold text-[#28537D] mb-4">
                        Editor Picks Mentioned in This Section
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {recommendedProducts.map((prod) => (
                          <ProductCard
                            key={prod.id}
                            product={prod}
                            isSaved={savedProductIds.includes(prod.id)}
                            onToggleSave={onToggleSave}
                            onSelectProduct={onSelectProduct}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}

            {/* Comparison Table */}
            {article.comparisonTable && (
              <section id="empirical-comparison" className="pt-4 scroll-mt-24">
                <div className="rounded-2xl bg-[#F3ECE1] p-6 md:p-8">
                  <div className="mb-4">
                    <h3 className="font-serif font-semibold text-xl text-[#1B3D5F]">
                      {article.comparisonTable.title}
                    </h3>
                    <p className="text-xs text-[#28537D] mt-1">
                      {article.comparisonTable.caption}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#1B3D5F]/15 text-[#28537D] uppercase tracking-wider">
                          {article.comparisonTable.headers.map((h, i) => (
                            <th key={i} className="py-3.5 px-4 font-semibold">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1B3D5F]/10">
                        {article.comparisonTable.rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            <td className="py-3.5 px-4 font-semibold text-[#1B3D5F]">
                              {row.dimension}
                            </td>
                            <td className="py-3.5 px-4 text-[#28537D]">{row.noveltyGift}</td>
                            <td className="py-3.5 px-4 text-[#1B3D5F] font-medium">
                              {row.ritualObject}
                            </td>
                            <td className="py-3.5 px-4 text-[#28537D]">
                              {row.empiricalEffect}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* Citations Block */}
            <section
              id="academic-citations"
              className="pt-8 border-t border-[#1B3D5F]/15 max-w-2xl scroll-mt-24"
            >
              <h3 className="text-lg font-serif font-semibold text-[#1B3D5F] mb-4">
                Research & Psychology Sources Referenced
              </h3>
              <ol className="space-y-4 text-xs text-[#28537D]">
                {article.citationIds.map((citId, index) => {
                  const cit = CITATIONS[citId];
                  if (!cit) return null;
                  return (
                    <li key={cit.id} className="p-5 rounded-2xl bg-[#F3ECE1]">
                      <div className="font-semibold text-[#1B3D5F] mb-1">
                        {index + 1}. {cit.title} ({cit.year})
                      </div>
                      <div className="italic mb-2">
                        {cit.authors} — {cit.publication}
                      </div>
                      <p className="text-[#1B3D5F]/85 mb-2">{cit.keyFinding}</p>
                      <a
                        href={cit.doiOrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-[#28537D] hover:underline"
                      >
                        <span>Read source study</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
