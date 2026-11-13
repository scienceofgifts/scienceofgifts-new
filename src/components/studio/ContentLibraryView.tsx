import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  FileCode2,
  FileText,
  Filter,
  Package,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import type { SanityStudioDocument } from './SanityStudioWorkspace';
import type { EditorialStudioSection } from './EditorialSidebar';

export interface ContentLibraryViewProps {
  currentSection: EditorialStudioSection;
  documents: SanityStudioDocument[];
  persistenceStateByDocId: Record<string, string>;
  onSelectDocument: (doc: SanityStudioDocument) => void;
  onNewProduct: () => void;
  onExportBriefForProduct: (product: SanityStudioDocument) => void;
  onCloneReferenceToDraft: (doc: SanityStudioDocument) => void;
  onDeleteSanityDraft: (docId: string) => Promise<void>;
}

export const ContentLibraryView: React.FC<ContentLibraryViewProps> = ({
  currentSection,
  documents,
  persistenceStateByDocId,
  onSelectDocument,
  onNewProduct,
  onExportBriefForProduct,
  onCloneReferenceToDraft,
  onDeleteSanityDraft,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [productOriginFilter, setProductOriginFilter] = useState<'all' | 'drafts' | 'references'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Section titles and descriptions
  const sectionMeta = useMemo(() => {
    switch (currentSection) {
      case 'products':
        return {
          title: 'Product Catalog & Drafts',
          description:
            'Canonical gift products, behavioral gift verdicts, and AI-assisted drafts saved to Sanity Content Lake.',
        };
      case 'gift-guides':
        return {
          title: 'Curated Gift Guides',
          description:
            'Thematic and occasion-based gift recommendations, quick picks, and editorial curation notes.',
        };
      case 'articles':
        return {
          title: 'Stories & Behavioral Research',
          description:
            'In-depth editorial articles examining the psychology of gift exchange and material craft.',
        };
      case 'discovery':
        return {
          title: 'Discovery Hubs & Taxonomy',
          description:
            'Controlled vocabularies, recipient dimensions, research citations, and contributing authors.',
        };
      case 'settings':
        return {
          title: 'Publication Settings & Legal Pages',
          description:
            'Site settings singleton, affiliate disclosures, terms, and publication standards.',
        };
      default:
        return { title: 'Content Library', description: 'Manage editorial documents.' };
    }
  }, [currentSection]);

  // Filter documents by active section
  const sectionDocuments = useMemo(() => {
    return documents.filter((doc) => {
      switch (currentSection) {
        case 'products':
          return doc._type === 'product';
        case 'gift-guides':
          return doc._type === 'giftGuide';
        case 'articles':
          return doc._type === 'article';
        case 'discovery':
          return (
            doc._type === 'editorialDiscoveryHub' ||
            doc._type === 'author' ||
            doc._type === 'researchCitation' ||
            doc._type === 'category'
          );
        case 'settings':
          return (
            doc._type === 'siteSettings' || doc._type === 'publicationInfoPage'
          );
        default:
          return true;
      }
    });
  }, [documents, currentSection]);

  // Counts for product origins
  const productCounts = useMemo(() => {
    const products = documents.filter((d) => d._type === 'product');
    const drafts = products.filter(
      (d) => d._id.startsWith('drafts.') || d._sourceOrigin === 'sanity-content-lake'
    );
    const references = products.filter(
      (d) => !d._id.startsWith('drafts.') && d._sourceOrigin !== 'sanity-content-lake'
    );
    return {
      all: products.length,
      drafts: drafts.length,
      references: references.length,
    };
  }, [documents]);

  // Categories present in products
  const availableCategories = useMemo(() => {
    if (currentSection !== 'products') return [];
    const set = new Set<string>();
    for (const doc of sectionDocuments) {
      if (doc.productType) set.add(doc.productType);
    }
    return Array.from(set).sort();
  }, [sectionDocuments, currentSection]);

  // Filtered documents matching search and filters
  const filteredDocuments = useMemo(() => {
    return sectionDocuments.filter((doc) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = (doc.title || doc.name || doc._id || '').toLowerCase();
        const subtitle = (doc.subtitle || doc.bio || '').toLowerCase();
        const vendor = (doc.vendor || '').toLowerCase();
        const slug = (
          typeof doc.slug === 'string' ? doc.slug : doc.slug?.current || ''
        ).toLowerCase();
        const match =
          title.includes(q) ||
          subtitle.includes(q) ||
          vendor.includes(q) ||
          slug.includes(q) ||
          doc._id.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Products-specific filters
      if (currentSection === 'products') {
        const isDraft =
          doc._id.startsWith('drafts.') ||
          doc._sourceOrigin === 'sanity-content-lake';
        if (productOriginFilter === 'drafts' && !isDraft) return false;
        if (productOriginFilter === 'references' && isDraft) return false;
        if (selectedCategory !== 'all' && doc.productType !== selectedCategory)
          return false;
      }

      return true;
    });
  }, [
    sectionDocuments,
    searchQuery,
    currentSection,
    productOriginFilter,
    selectedCategory,
  ]);

  const handleDeleteDraftClick = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!confirm(`Delete Sanity draft ${docId}? This removes it from Sanity Content Lake.`)) {
      return;
    }
    setDeletingDocId(docId);
    try {
      await onDeleteSanityDraft(docId);
    } finally {
      setDeletingDocId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F6] overflow-y-auto">
      {/* Header bar */}
      <div className="px-8 py-6 border-b border-[#E2E8F0] bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-2xl font-semibold text-[#0F172A]">
                {sectionMeta.title}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF9F6] text-[#475569] border border-[#E2E8F0]">
                {filteredDocuments.length}{' '}
                {filteredDocuments.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-1 max-w-xl">
              {sectionMeta.description}
            </p>
          </div>

          {currentSection === 'products' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onNewProduct}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#2A5A48] hover:bg-[#234b3c] text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Product (AI Workflow)</span>
              </button>
            </div>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="max-w-6xl mx-auto mt-4 pt-4 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${currentSection}...`}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2A5A48] focus:border-[#2A5A48]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8] hover:text-[#475569]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Product Origin Filters */}
          {currentSection === 'products' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#FAF9F6] p-0.5">
                <button
                  type="button"
                  onClick={() => setProductOriginFilter('all')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    productOriginFilter === 'all'
                      ? 'bg-white text-[#0F172A] shadow-xs font-semibold'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  All ({productCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setProductOriginFilter('drafts')}
                  className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    productOriginFilter === 'drafts'
                      ? 'bg-[#2A5A48] text-white shadow-xs font-semibold'
                      : 'text-[#2A5A48] hover:bg-[#2A5A48]/10'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Sanity Drafts ({productCounts.drafts})
                </button>
                <button
                  type="button"
                  onClick={() => setProductOriginFilter('references')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    productOriginFilter === 'references'
                      ? 'bg-white text-[#0F172A] shadow-xs font-semibold'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Local Catalog ({productCounts.references})
                </button>
              </div>

              {availableCategories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#475569] focus:outline-none focus:ring-1 focus:ring-[#2A5A48]"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content List / Table */}
      <div className="max-w-6xl mx-auto w-full px-8 py-6">
        {filteredDocuments.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center">
            <Package className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-[#0F172A]">
              No documents found
            </h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No items matched "${searchQuery}". Try a different keyword.`
                : 'No documents match the current filters.'}
            </p>
            {currentSection === 'products' && (
              <button
                type="button"
                onClick={onNewProduct}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#2A5A48] hover:bg-[#234b3c] text-white rounded-lg text-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
                Create New Product
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredDocuments.map((doc) => {
              const isSanityDraft =
                doc._id.startsWith('drafts.') ||
                doc._sourceOrigin === 'sanity-content-lake';
              const pState = persistenceStateByDocId[doc._id] || (isSanityDraft ? 'saved' : 'idle');
              const title =
                doc.title || doc.name || doc.publicationTitle || doc._id;
              const subtitle =
                doc.subtitle ||
                doc.curationSummary ||
                doc.bio ||
                doc.keyFinding ||
                '';
              const slugStr =
                typeof doc.slug === 'string'
                  ? doc.slug
                  : doc.slug?.current || '';
              const firstImage =
                doc.images?.[0]?.externalUrl ||
                doc.heroImage?.externalUrl ||
                doc.avatarUrl;

              return (
                <div
                  key={doc._id}
                  onClick={() => onSelectDocument(doc)}
                  className="group bg-white hover:bg-[#FAF9F6] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xl p-4 transition-all duration-150 cursor-pointer shadow-xs hover:shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] overflow-hidden shrink-0 flex items-center justify-center">
                      {firstImage ? (
                        <img
                          src={firstImage}
                          alt={title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display =
                              'none';
                          }}
                        />
                      ) : (
                        <Package className="w-6 h-6 text-[#94A3B8]" />
                      )}
                    </div>

                    {/* Metadata & Title */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {/* Origin Badge */}
                        {isSanityDraft ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Sanity Draft ·{' '}
                            {pState === 'saved'
                              ? 'Saved'
                              : pState === 'unsaved'
                              ? 'Unsaved'
                              : pState === 'saving'
                              ? 'Saving...'
                              : 'Lake'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                            Local Reference
                          </span>
                        )}

                        {doc.vendor && (
                          <span className="text-[11px] font-medium text-[#64748B]">
                            {doc.vendor}
                          </span>
                        )}
                        {doc.productType && (
                          <span className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
                            • {doc.productType}
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-base font-semibold text-[#0F172A] group-hover:text-[#2A5A48] transition-colors truncate">
                        {title}
                      </h3>

                      {subtitle && (
                        <p className="text-xs text-[#64748B] line-clamp-1 mt-0.5">
                          {subtitle}
                        </p>
                      )}

                      {/* Fact & Taxonomy summary row */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#64748B] mt-2">
                        {typeof doc.price === 'number' && (
                          <span className="font-medium text-[#0F172A]">
                            ${doc.price}
                          </span>
                        )}
                        {doc.priceVerified && (
                          <span className="inline-flex items-center gap-0.5 text-emerald-700 text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> Verified Price
                          </span>
                        )}
                        {doc.inStock !== undefined && (
                          <span
                            className={
                              doc.inStock
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }
                          >
                            {doc.inStock ? 'In Stock' : 'Out of Stock / Preorder'}
                          </span>
                        )}
                        {slugStr && (
                          <span className="font-mono text-[10px] text-[#94A3B8]">
                            /{slugStr}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#F1F5F9]">
                    {currentSection === 'products' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExportBriefForProduct(doc);
                        }}
                        className="px-2.5 py-1.5 text-xs text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors flex items-center gap-1 font-medium"
                        title="Export AI Writing Brief for this product"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#2A5A48]" />
                        <span className="hidden md:inline">AI Brief</span>
                      </button>
                    )}

                    {!isSanityDraft && currentSection === 'products' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCloneReferenceToDraft(doc);
                        }}
                        className="px-2.5 py-1.5 text-xs text-[#2A5A48] hover:bg-[#2A5A48]/10 rounded-lg transition-colors font-medium flex items-center gap-1"
                        title="Create an editable Sanity Draft from this local reference"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Create Draft</span>
                      </button>
                    )}

                    {isSanityDraft && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDraftClick(e, doc._id)}
                        disabled={deletingDocId === doc._id}
                        className="p-1.5 text-[#94A3B8] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Sanity Draft from Lake"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs bg-[#FAF9F6] group-hover:bg-[#2A5A48] group-hover:text-white text-[#0F172A] font-semibold rounded-lg border border-[#E2E8F0] group-hover:border-[#2A5A48] transition-colors flex items-center gap-1"
                    >
                      <span>Review & Edit</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
