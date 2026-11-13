import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  HelpCircle,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import type {
  SanityFieldSpec,
  SanityTypeSpec,
} from '../../cms/studio/sanityCore';
import type { DraftPersistenceState, SanityStudioDocument } from './SanityStudioWorkspace';

export interface GenericDocumentEditorViewProps {
  document: SanityStudioDocument;
  schema: SanityTypeSpec;
  persistenceState: DraftPersistenceState;
  persistenceError: string | null;
  serverValidationIssues: Array<{ path: string; message: string }>;
  allDocuments: SanityStudioDocument[];
  onBackToLibrary: () => void;
  onUpdateDocument: (updatedDoc: SanityStudioDocument) => void;
  onSaveDraftToSanity: () => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
}

function slugifyText(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function snakeCaseText(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

export const GenericDocumentEditorView: React.FC<GenericDocumentEditorViewProps> = ({
  document: doc,
  schema,
  persistenceState,
  persistenceError,
  serverValidationIssues,
  allDocuments,
  onBackToLibrary,
  onUpdateDocument,
  onSaveDraftToSanity,
  onDeleteDocument,
}) => {
  const isSanityDraft =
    doc._id.startsWith('drafts.') || doc._sourceOrigin === 'sanity-content-lake';
  const isLocalReference = !isSanityDraft;

  const [activeTab, setActiveTab] = useState<string>('all');

  const updateField = (fieldName: string, value: any) => {
    onUpdateDocument({
      ...doc,
      [fieldName]: value,
      _updatedAt: new Date().toISOString(),
    });
  };

  const visibleFields = useMemo(() => {
    if (activeTab === 'all') return schema.fields;
    return schema.fields.filter((f) => f.fieldset === activeTab);
  }, [schema, activeTab]);

  const fieldsets = schema.fieldsets || [];

  const renderFieldControl = (
    field: SanityFieldSpec,
    value: any,
    onChange: (nextVal: any) => void
  ) => {
    // 1. Dropdown options
    if (field.type === 'string' && Array.isArray(field.options?.list)) {
      const optionsList = field.options.list.map((item: any) =>
        typeof item === 'string' ? { title: item, value: item } : item
      );
      return (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2A5A48]"
        >
          <option value="">— Select {field.title} —</option>
          {optionsList.map((opt: any) => (
            <option key={opt.value} value={opt.value}>
              {opt.title}
            </option>
          ))}
        </select>
      );
    }

    // 2. String / Date / URL
    if (
      field.type === 'string' ||
      field.type === 'url' ||
      field.type === 'date' ||
      field.type === 'datetime'
    ) {
      const isIdField = field.name === 'id' || field.name === 'productId';
      return (
        <div className="flex items-center gap-2">
          <input
            type={field.type === 'date' ? 'date' : 'text'}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${field.title.toLowerCase()}...`}
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2A5A48]"
          />
          {isIdField && (
            <button
              type="button"
              onClick={() => {
                const base = snakeCaseText(String(doc.title || doc.name || 'item'));
                onChange(`guide_${base}`);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#FAF9F6] border border-[#CBD5E1] hover:bg-[#F1F5F9] shrink-0"
            >
              Generate ID
            </button>
          )}
        </div>
      );
    }

    // 3. Slug
    if (field.type === 'slug') {
      const currentSlug = typeof value === 'string' ? value : value?.current ?? '';
      return (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={currentSlug}
            onChange={(e) => onChange({ _type: 'slug', current: e.target.value })}
            placeholder="kebab-case-slug"
            className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2A5A48]"
          />
          <button
            type="button"
            onClick={() => {
              const base = String(doc.title || doc.name || 'item');
              onChange({ _type: 'slug', current: slugifyText(base) });
            }}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#FAF9F6] border border-[#CBD5E1] hover:bg-[#F1F5F9] shrink-0"
          >
            Generate
          </button>
        </div>
      );
    }

    // 4. Multiline Text
    if (field.type === 'text') {
      return (
        <textarea
          rows={3}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${field.title.toLowerCase()}...`}
          className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2A5A48]"
        />
      );
    }

    // 5. Number
    if (field.type === 'number') {
      return (
        <input
          type="number"
          step="any"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          placeholder="0"
          className="w-36 px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2A5A48]"
        />
      );
    }

    // 6. Boolean
    if (field.type === 'boolean') {
      return (
        <label className="flex items-center gap-2 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded text-[#2A5A48] focus:ring-[#2A5A48]"
          />
          <span className="text-[#0F172A] font-medium">{field.title}</span>
        </label>
      );
    }

    // 7. Reference (`{ _type: 'reference', _ref: '...' }`)
    if (field.type === 'reference') {
      const refVal = typeof value === 'object' ? value?._ref ?? '' : value ?? '';
      const targetTypes = Array.isArray(field.to)
        ? field.to.map((t: any) => t.type)
        : [];
      const matchingDocs = allDocuments.filter((d) => targetTypes.includes(d._type));

      return (
        <select
          value={refVal}
          onChange={(e) =>
            onChange(
              e.target.value
                ? { _type: 'reference', _ref: e.target.value, _weak: true }
                : undefined
            )
          }
          className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A]"
        >
          <option value="">— Select Reference ({targetTypes.join(', ')}) —</option>
          {matchingDocs.map((m) => (
            <option key={m._id} value={m._id}>
              {m.title || m.name || m.publicationTitle || m._id} ({m._id})
            </option>
          ))}
        </select>
      );
    }

    // 8. Array of strings
    if (field.type === 'array' && field.of?.[0]?.type === 'string') {
      const arr: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {arr.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FAF9F6] border border-[#CBD5E1] rounded-lg text-xs"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => onChange(arr.filter((_, i) => i !== idx))}
                  className="text-[#94A3B8] hover:text-red-600"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Type item and press Enter..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const val = (e.currentTarget as HTMLInputElement).value.trim();
                if (val && !arr.includes(val)) {
                  onChange([...arr, val]);
                  (e.currentTarget as HTMLInputElement).value = '';
                }
              }
            }}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white"
          />
        </div>
      );
    }

    // Fallback: JSON inspection for complex structures
    return (
      <textarea
        rows={4}
        value={typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '')}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            onChange(e.target.value);
          }
        }}
        className="w-full p-2.5 text-xs font-mono bg-[#FAF9F6] border border-[#CBD5E1] rounded-lg"
      />
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F6] overflow-y-auto">
      {/* Sticky Header */}
      <header className="px-8 py-4 border-b border-[#E2E8F0] bg-white sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToLibrary}
              className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-[#CBD5E1]">/</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-[#2A5A48]">
                  {schema.title}
                </span>
                {isSanityDraft ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Sanity Draft · {persistenceState}
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#F1F5F9] text-[#475569]">
                    Local Reference
                  </span>
                )}
              </div>
              <h1 className="font-serif text-lg font-semibold text-[#0F172A] truncate max-w-md">
                {doc.title || doc.name || doc.publicationTitle || doc._id}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSaveDraftToSanity}
              disabled={persistenceState === 'saving'}
              className="px-4 py-1.5 bg-[#2A5A48] hover:bg-[#234b3c] disabled:bg-[#94A3B8] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{persistenceState === 'saving' ? 'Saving...' : 'Save Draft'}</span>
            </button>

            {isSanityDraft && !schema.singleton && (
              <button
                type="button"
                onClick={() => onDeleteDocument(doc._id)}
                className="p-1.5 text-[#94A3B8] hover:text-red-600 hover:bg-red-50 rounded-lg"
                title="Delete Draft"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Editor Main */}
      <main className="max-w-4xl mx-auto w-full px-6 py-8 space-y-6">
        {persistenceError && (
          <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{persistenceError}</span>
          </div>
        )}

        {/* Fieldsets tabs */}
        {fieldsets.length > 0 && (
          <div className="flex items-center gap-1 border-b border-[#E2E8F0] pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium ${
                activeTab === 'all'
                  ? 'bg-white text-[#0F172A] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              All Fields
            </button>
            {fieldsets.map((fs) => (
              <button
                key={fs.name}
                type="button"
                onClick={() => setActiveTab(fs.name)}
                className={`px-3 py-1 rounded-md text-xs font-medium ${
                  activeTab === fs.name
                    ? 'bg-white text-[#0F172A] shadow-xs font-semibold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {fs.title}
              </button>
            ))}
          </div>
        )}

        {/* Form Fields Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-5">
          {visibleFields.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#0F172A]">
                  {field.title}
                  {field.validation && (
                    <span className="text-[#94A3B8] font-normal ml-1">
                      {field.name === 'title' || field.name === 'slug' ? '• required' : ''}
                    </span>
                  )}
                </label>
                {field.description && (
                  <span className="text-[11px] text-[#94A3B8]">
                    {field.description}
                  </span>
                )}
              </div>
              {renderFieldControl(field, doc[field.name], (val) =>
                updateField(field.name, val)
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
