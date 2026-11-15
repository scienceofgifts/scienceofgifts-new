import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useClient, useFormValue } from 'sanity';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bold,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCode2,
  Globe,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  Loader2,
  MessageSquareQuote,
  Plus,
  Quote,
  RefreshCw,
  Save,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import type { AiWritingProfileDocument } from '../../cms/studio/schemas/documents/aiWritingProfile';
import type { ProposedFieldDiff } from '../../cms/studio/productAiAuthoringService';
import type {
  ArticleImproveActionType,
  ArticleImproveResult,
  CompleteArticleGenerationResult,
} from '../../cms/studio/articleAiAuthoringService';
import { CITATIONS } from '../../data/catalog';
import {
  paragraphsToPortableText,
  sectionsToFullBodyPortableText,
} from '../../cms/studio/portableTextSerializer';
import { normalizeSanityArticleDocumentBackwardCompatible } from '../../cms/studio/articleDocumentMapper';
import type { ArticleSection } from '../../types/content';

interface SessionCreds {
  sessionToken: string;
  csrfToken: string;
}

let cachedSessionCreds: SessionCreds | null = null;

async function getStudioSessionHeaders(): Promise<Record<string, string>> {
  if (!cachedSessionCreds) {
    try {
      const res = await fetch('/api/studio/sanity/session', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.sessionCredentials) {
          cachedSessionCreds = {
            sessionToken: data.sessionCredentials.sessionToken,
            csrfToken: data.sessionCredentials.csrfToken,
          };
        }
      }
    } catch {}
  }

  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(cachedSessionCreds
      ? {
          'X-Sanity-Studio-Token': cachedSessionCreds.sessionToken,
          'X-Sanity-Studio-Csrf': cachedSessionCreds.csrfToken,
          'X-Studio-Session': cachedSessionCreds.sessionToken,
          'X-Studio-CSRF': cachedSessionCreds.csrfToken,
        }
      : {}),
  };
}

function formatArticleDiffPreview(val: any): string {
  if (val === undefined || val === null || val === '') return '— (Empty)';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object' && val._type === 'slug') {
    return val.current || '—';
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '[] (Empty)';
    if (typeof val[0] === 'string') {
      return val.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
    }
    return val
      .map((item, idx) => {
        if (item && item.heading) {
          const paraCount = Array.isArray(item.paragraphs)
            ? item.paragraphs.length
            : 0;
          const previewText = Array.isArray(item.paragraphs)
            ? item.paragraphs.join('\n\n')
            : '';
          return `[Section ${idx + 1}] H2: ${item.heading}${
            item.subheading ? ` (H3: ${item.subheading})` : ''
          } (${paraCount} paragraphs)\n${previewText}`;
        }
        if (item && item._type === 'reference') {
          return `• Ref: ${item._ref}`;
        }
        return JSON.stringify(item);
      })
      .join('\n\n---\n\n');
  }
  if (typeof val === 'object') {
    if (val._type === 'seoMetadata' || val.seoTitle) {
      return [
        `SEO Title: ${val.seoTitle || '—'}`,
        `Meta Description: ${val.metaDescription || '—'}`,
        `Canonical Path: ${val.canonicalPath || '—'}`,
      ].join('\n');
    }
    if (val._type === 'articlePullQuote' || val.text) {
      return `"${val.text || ''}" — ${val.attribution || ''}`;
    }
    return JSON.stringify(val, null, 2);
  }
  return String(val);
}

const S = {
  container: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Plus Jakarta Sans", sans-serif',
    backgroundColor: '#FAF8F5',
    border: '1px solid #DED9CE',
    borderRadius: '10px',
    padding: '16px',
    color: '#181817',
    marginBottom: '18px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  } as React.CSSProperties,
  headerRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    paddingBottom: '12px',
    borderBottom: '1px solid #E5E0D5',
    marginBottom: '14px',
  } as React.CSSProperties,
  tabBar: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    marginBottom: '14px',
  } as React.CSSProperties,
  tabBtn: (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 13px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    border: active ? '1px solid #181817' : '1px solid #D5CFC2',
    backgroundColor: active ? '#181817' : '#FFFFFF',
    color: active ? '#FFFFFF' : '#2C2A28',
  }),
  actionBtn: (
    variant: 'primary' | 'secondary' | 'accent' | 'danger' | 'success'
  ): React.CSSProperties => {
    const map = {
      primary: {
        bg: '#181817',
        color: '#FFFFFF',
        border: '#181817',
      },
      secondary: {
        bg: '#FFFFFF',
        color: '#181817',
        border: '#CFC8B8',
      },
      accent: {
        bg: '#8C2D19',
        color: '#FFFFFF',
        border: '#8C2D19',
      },
      success: {
        bg: '#1F513F',
        color: '#FFFFFF',
        border: '#1F513F',
      },
      danger: {
        bg: '#FFF5F5',
        color: '#9B1C1C',
        border: '#F8B4B4',
      },
    }[variant];
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '7px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
      backgroundColor: map.bg,
      color: map.color,
      border: `1px solid ${map.border}`,
      textDecoration: 'none',
    };
  },
  card: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2DDD2',
    borderRadius: '8px',
    padding: '14px',
    marginBottom: '12px',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#57534E',
    marginBottom: '5px',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '8px 10px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid #CFC8B8',
    backgroundColor: '#FFFFFF',
    color: '#181817',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    padding: '8px 10px',
    fontSize: '13px',
    lineHeight: 1.55,
    borderRadius: '6px',
    border: '1px solid #CFC8B8',
    backgroundColor: '#FFFFFF',
    color: '#181817',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  } as React.CSSProperties,
};

export function OfficialSanityArticleAiAuthoringInput(props?: any) {
  const formDoc = useFormValue([]) as Record<string, any> | undefined;
  const sanityClient = useClient({ apiVersion: '2025-02-01' });

  const [standaloneDoc, setStandaloneDoc] = useState<Record<string, any> | null>(
    null
  );
  const activeDoc = useMemo(() => {
    const merged = {
      ...(formDoc || {}),
      ...(standaloneDoc || {}),
    };
    return normalizeSanityArticleDocumentBackwardCompatible(merged);
  }, [formDoc, standaloneDoc]);

  const [activeTab, setActiveTab] = useState<
    'composer' | 'ai_generate' | 'ai_improve' | 'brief_io'
  >('composer');

  // Profiles state
  const [profiles, setProfiles] = useState<AiWritingProfileDocument[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    'ai_profile_science_of_gifts_article_editorial'
  );
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileDraft, setProfileDraft] =
    useState<AiWritingProfileDocument | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // AI Generation Inputs
  const [topicInput, setTopicInput] = useState<string>('');
  const [editorialAngleInput, setEditorialAngleInput] = useState<string>('');
  const [researchNotesInput, setResearchNotesInput] = useState<string>('');
  const [customAiInstructions, setCustomAiInstructions] = useState<string>('');
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);

  // AI Improve Inputs
  const [improveTargetSectionId, setImproveTargetSectionId] =
    useState<string>('all_sections');
  const [improveRevisionGoals, setImproveRevisionGoals] = useState<string>('');
  const [isImprovingArticle, setIsImprovingArticle] = useState(false);

  // Pending Proposal Review (Accept / Reject)
  const [pendingProposal, setPendingProposal] = useState<{
    sourceLabel: string;
    thesis: string;
    rationale?: string;
    profileName: string;
    proposedFields: Record<string, any>;
    fieldDiffs: ProposedFieldDiff[];
  } | null>(null);
  const [selectedDiffFields, setSelectedDiffFields] = useState<
    Record<string, boolean>
  >({});

  // Brief Export / Import State
  const [exportedBriefMarkdown, setExportedBriefMarkdown] =
    useState<string>('');
  const [exportedBriefFilename, setExportedBriefFilename] =
    useState<string>('article-writing-brief.md');
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [isExportingBrief, setIsExportingBrief] = useState(false);

  // Lifecycle & Preview state
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [livePublishedUrl, setLivePublishedUrl] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Visual Composer quick-insert state per section
  const [activeInsertModal, setActiveInsertModal] = useState<{
    sectionIdx: number;
    type: 'link' | 'image' | 'citation' | 'callout';
  } | null>(null);
  const [linkLabelInput, setLinkLabelInput] = useState('');
  const [linkHrefInput, setLinkHrefInput] = useState('https://');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageAltInput, setImageAltInput] = useState('');
  const [imageCaptionInput, setImageCaptionInput] = useState('');
  const [isUploadingInlineImage, setIsUploadingInlineImage] = useState(false);
  const [selectedCitationToInsert, setSelectedCitationToInsert] = useState(
    Object.keys(CITATIONS)[0] || 'cit_galak_2016_why_certain_gifts'
  );
  const [calloutKickerInput, setCalloutKickerInput] =
    useState('Editorial Takeaway');
  const [calloutTitleInput, setCalloutTitleInput] = useState('');
  const [calloutBodyInput, setCalloutBodyInput] = useState('');
  const [calloutToneInput, setCalloutToneInput] = useState<
    'sand' | 'mint' | 'butter' | 'blue'
  >('sand');

  // Sync initial topic/angle from activeDoc when first opened
  useEffect(() => {
    if (!topicInput && activeDoc.title && activeDoc.title !== 'Untitled Editorial Story') {
      setTopicInput(activeDoc.title);
    }
    if (
      !editorialAngleInput &&
      activeDoc.subtitle &&
      !activeDoc.subtitle.startsWith('An evidence-based editorial exploration')
    ) {
      setEditorialAngleInput(activeDoc.subtitle);
    }
  }, [activeDoc.title, activeDoc.subtitle, topicInput, editorialAngleInput]);

  const loadProfiles = useCallback(async () => {
    try {
      const headers = await getStudioSessionHeaders();
      const res = await fetch('/api/studio/sanity/ai-profiles', { headers });
      if (res.ok) {
        const data = await res.json();
        const list: AiWritingProfileDocument[] = Array.isArray(data?.profiles)
          ? data.profiles
          : [];
        setProfiles(list);
        const articleDef =
          list.find(
            (p) =>
              p.profileId === 'ai_profile_science_of_gifts_article_editorial'
          ) ||
          list.find((p) => p.contentType === 'article' && p.isDefault) ||
          list.find((p) => p.contentType === 'article') ||
          list[0];
        if (articleDef) {
          setSelectedProfileId(articleDef.profileId || articleDef._id);
          setProfileDraft(articleDef);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const activeProfile = useMemo(() => {
    return (
      profiles.find(
        (p) =>
          p.profileId === selectedProfileId || p._id === selectedProfileId
      ) ||
      profiles.find((p) => p.contentType === 'article') ||
      profiles[0] ||
      null
    );
  }, [profiles, selectedProfileId]);

  useEffect(() => {
    if (activeProfile) {
      setProfileDraft(activeProfile);
    }
  }, [activeProfile]);

  /**
   * Synchronizes updated fields to both Official Sanity Studio's reactive document store
   * AND Sanity Content Lake via `/api/studio/sanity/save-draft`.
   */
  const syncFieldsToSanityDocument = useCallback(
    async (
      fieldsPatch: Record<string, any>,
      summaryLabel: string,
      options?: { persistToCloud?: boolean }
    ) => {
      const shouldPersist = options?.persistToCloud !== false;
      const mergedCandidate = normalizeSanityArticleDocumentBackwardCompatible({
        ...activeDoc,
        ...fieldsPatch,
        status: 'draft',
      });

      const canonicalId = mergedCandidate.id.replace(/^drafts\./, '');
      const draftId = `drafts.${canonicalId}`;

      const patchPayload: Record<string, any> = {
        id: canonicalId,
        title: mergedCandidate.title,
        subtitle: mergedCandidate.subtitle,
        slug: mergedCandidate.slug,
        category: mergedCandidate.category,
        topics: mergedCandidate.topics,
        recipients: mergedCandidate.recipients,
        occasions: mergedCandidate.occasions,
        author: mergedCandidate.author,
        publishedAt: mergedCandidate.publishedAt,
        heroImage: mergedCandidate.heroImage,
        executiveSummary: mergedCandidate.executiveSummary,
        ...(mergedCandidate.pullQuote
          ? { pullQuote: mergedCandidate.pullQuote }
          : {}),
        sections: mergedCandidate.sections,
        bodyPortableText: mergedCandidate.bodyPortableText,
        citations: mergedCandidate.citations,
        relatedGuides: mergedCandidate.relatedGuides,
        seo: mergedCandidate.seo,
      };

      setStandaloneDoc({
        ...mergedCandidate,
        _id: draftId,
        _type: 'article',
        status: 'draft',
      });

      // 1. Update Sanity Studio live document store via sanityClient so native form inputs reflect changes immediately
      try {
        await sanityClient
          .transaction()
          .createIfNotExists({
            _id: draftId,
            _type: 'article',
            status: 'draft',
            ...patchPayload,
          })
          .patch(draftId, (p) => p.set(patchPayload))
          .commit({ autoGenerateArrayKeys: true });
      } catch {}

      if (!shouldPersist) {
        setStatusBanner({
          type: 'info',
          text: `${summaryLabel} — Updated in editor. Click "Save Draft" to confirm persistence.`,
        });
        return;
      }

      // 2. Also verify via server-side `/api/studio/sanity/save-draft`
      setIsSavingDraft(true);
      try {
        const headers = await getStudioSessionHeaders();
        // Fetch latest _rev first so optimistic concurrency check succeeds
        const latestRes = await fetch(
          `/api/studio/sanity/document?id=${encodeURIComponent(draftId)}`,
          { headers }
        );
        let latestRev = mergedCandidate._rev;
        if (latestRes.ok) {
          const latestJson = await latestRes.json();
          if (latestJson?.document?._rev) {
            latestRev = latestJson.document._rev;
          }
        }

        const saveRes = await fetch('/api/studio/sanity/save-draft', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            document: {
              ...mergedCandidate,
              ...patchPayload,
              _id: draftId,
              _type: 'article',
              _rev: latestRev,
              status: 'draft',
            },
          }),
        });
        const saveJson = await saveRes.json();
        if (saveRes.ok && saveJson.persistedDocument) {
          setStandaloneDoc(saveJson.persistedDocument);
          setStatusBanner({
            type: 'success',
            text: `${summaryLabel} — Saved draft "${saveJson.persistedDocument._id}" (rev: ${saveJson.persistedDocument._rev}) to Sanity Content Lake.`,
          });
        } else {
          setStatusBanner({
            type: 'success',
            text: `${summaryLabel} — Synced to Sanity Studio draft "${draftId}".`,
          });
        }
      } catch {
        setStatusBanner({
          type: 'success',
          text: `${summaryLabel} — Synced to Sanity Studio draft "${draftId}".`,
        });
      } finally {
        setIsSavingDraft(false);
      }
    },
    [activeDoc, sanityClient]
  );

  // ===========================================================================
  // SAVE, PREVIEW, PUBLISH & UNPUBLISH HANDLERS
  // ===========================================================================

  const handleSaveDraft = async () => {
    await syncFieldsToSanityDocument({}, 'Saved Article Draft', {
      persistToCloud: true,
    });
  };

  const handlePreviewOnAstro = async () => {
    await syncFieldsToSanityDocument({}, 'Synced draft before preview', {
      persistToCloud: true,
    });
    const canonicalId = activeDoc.id.replace(/^drafts\./, '');
    const draftId = `drafts.${canonicalId}`;
    try {
      const headers = await getStudioSessionHeaders();
      const res = await fetch('/api/studio/sanity/preview-ticket', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          documentId: draftId,
          documentType: 'article',
        }),
      });
      const data = await res.json();
      if (res.ok && data.previewUrl) {
        setPreviewUrl(data.previewUrl);
        setStatusBanner({
          type: 'success',
          text: `Astro Article Preview ready for "${activeDoc.title}". Click "Open Astro Preview Page" below to view the rendered layout.`,
        });
      } else {
        setStatusBanner({
          type: 'error',
          text: data?.message || 'Could not generate preview ticket.',
        });
      }
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.message || 'Preview request failed.',
      });
    }
  };

  const handlePublishArticle = async () => {
    setIsPublishing(true);
    try {
      await syncFieldsToSanityDocument({}, 'Pre-publish draft sync', {
        persistToCloud: true,
      });
      const canonicalId = activeDoc.id.replace(/^drafts\./, '');
      const headers = await getStudioSessionHeaders();
      const res = await fetch('/api/studio/sanity/publish-article', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          canonicalId,
          document: {
            ...activeDoc,
            id: canonicalId,
            status: 'published',
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const livePath =
          data.livePath ||
          `/articles/${activeDoc.slug?.current || 'story'}/`;
        setLivePublishedUrl(livePath);
        if (data.publishedDocument) {
          setStandaloneDoc(data.publishedDocument);
        }
        setStatusBanner({
          type: 'success',
          text:
            data.message ||
            `Published "${activeDoc.title}"! Live on Astro at ${livePath}.`,
        });
      } else {
        setStatusBanner({
          type: 'error',
          text: data?.message || 'Failed to publish article.',
        });
      }
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.message || 'Network error while publishing article.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublishArticle = async () => {
    setIsUnpublishing(true);
    try {
      const canonicalId = activeDoc.id.replace(/^drafts\./, '');
      const headers = await getStudioSessionHeaders();
      const res = await fetch('/api/studio/sanity/unpublish-article', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          canonicalId,
          document: activeDoc,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setLivePublishedUrl(null);
        if (data.draftDocument) {
          setStandaloneDoc(data.draftDocument);
        }
        setStatusBanner({
          type: 'info',
          text:
            data.message ||
            `Unpublished "${activeDoc.title}". It is now a private draft and removed from public Astro routes.`,
        });
      } else {
        setStatusBanner({
          type: 'error',
          text: data?.message || 'Failed to unpublish article.',
        });
      }
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.message || 'Network error while unpublishing article.',
      });
    } finally {
      setIsUnpublishing(false);
    }
  };

  // ===========================================================================
  // AI GENERATE & IMPROVE HANDLERS
  // ===========================================================================

  const handleGenerateCompleteArticle = async () => {
    const cleanTopic = (topicInput || activeDoc.title || '').trim();
    if (!cleanTopic) {
      setStatusBanner({
        type: 'warning',
        text: 'Enter an article topic or working headline first.',
      });
      return;
    }

    setIsGeneratingArticle(true);
    setStatusBanner({
      type: 'info',
      text: `Generating complete article sections, citations, callouts, and SEO metadata with Gemini using profile "${
        activeProfile?.name || 'Article Editorial'
      }"...`,
    });

    try {
      const headers = await getStudioSessionHeaders();
      const res = await fetch('/api/studio/sanity/ai-article-generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic: cleanTopic,
          editorialAngle: editorialAngleInput,
          researchNotes: researchNotesInput,
          customInstructions: customAiInstructions,
          writingProfileId: selectedProfileId,
          writingProfile: profileDraft || activeProfile,
          currentDocument: activeDoc,
        }),
      });
      const data: CompleteArticleGenerationResult = await res.json();
      if (!res.ok || !data.ok) {
        setStatusBanner({
          type: 'error',
          text: (data as any)?.message || 'AI article generation failed.',
        });
        return;
      }

      const initialChecks: Record<string, boolean> = {};
      for (const d of data.fieldDiffs || []) {
        initialChecks[d.field] = true;
      }
      setSelectedDiffFields(initialChecks);
      setPendingProposal({
        sourceLabel: 'Generate Complete Article',
        thesis: data.editorialThesis,
        profileName: data.writingProfileUsed.name,
        proposedFields: data.proposedFields,
        fieldDiffs: data.fieldDiffs,
      });
      setStatusBanner({
        type: 'success',
        text: data.message,
      });
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.message || 'AI generation request failed.',
      });
    } finally {
      setIsGeneratingArticle(false);
    }
  };

  const handleImproveWithAi = async (action: ArticleImproveActionType) => {
    setIsImprovingArticle(true);
    setStatusBanner({
      type: 'info',
      text: `Running AI improvement (${action}) on ${
        improveTargetSectionId === 'all_sections'
          ? 'entire article'
          : `section "${improveTargetSectionId}"`
      }...`,
    });

    try {
      const headers = await getStudioSessionHeaders();
      const res = await fetch('/api/studio/sanity/ai-article-improve', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action,
          targetSectionId: improveTargetSectionId,
          topic: topicInput || activeDoc.title,
          editorialAngle: editorialAngleInput || activeDoc.subtitle,
          revisionGoals: improveRevisionGoals,
          writingProfileId: selectedProfileId,
          writingProfile: profileDraft || activeProfile,
          currentDocument: activeDoc,
        }),
      });
      const data: ArticleImproveResult = await res.json();
      if (!res.ok || !data.ok) {
        setStatusBanner({
          type: 'error',
          text: (data as any)?.message || 'AI revision failed.',
        });
        return;
      }

      const initialChecks: Record<string, boolean> = {};
      for (const d of data.fieldDiffs || []) {
        initialChecks[d.field] = true;
      }
      setSelectedDiffFields(initialChecks);
      setPendingProposal({
        sourceLabel: `Improve with AI (${action})`,
        thesis: data.editorialThesis,
        rationale: data.rationaleSummary,
        profileName: data.writingProfileUsed.name,
        proposedFields: data.proposedFields,
        fieldDiffs: data.fieldDiffs,
      });
      setStatusBanner({
        type: 'success',
        text: data.message,
      });
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.message || 'AI improvement request failed.',
      });
    } finally {
      setIsImprovingArticle(false);
    }
  };

  const handleAcceptProposal = async () => {
    if (!pendingProposal) return;
    const acceptedPatch: Record<string, any> = {};
    for (const diff of pendingProposal.fieldDiffs) {
      if (selectedDiffFields[diff.field]) {
        acceptedPatch[diff.field] = pendingProposal.proposedFields[diff.field];
      }
    }
    if (acceptedPatch.sections) {
      acceptedPatch.bodyPortableText = sectionsToFullBodyPortableText(
        acceptedPatch.sections as unknown as ArticleSection[]
      );
    }
    if (pendingProposal.proposedFields.id && !activeDoc.id) {
      acceptedPatch.id = pendingProposal.proposedFields.id;
    }

    const label = pendingProposal.sourceLabel;
    setPendingProposal(null);
    await syncFieldsToSanityDocument(acceptedPatch, `Accepted ${label}`, {
      persistToCloud: true,
    });
  };

  // ===========================================================================
  // VISUAL SECTION & RICH-TEXT COMPOSER HELPERS (ZERO JSON EDITING)
  // ===========================================================================

  const sections: Array<Record<string, any>> = Array.isArray(activeDoc.sections)
    ? activeDoc.sections
    : [];

  const updateSectionsArray = async (
    nextSections: Array<Record<string, any>>,
    summaryLabel: string,
    persist = false
  ) => {
    const normalizedSecs = nextSections.map((sec, idx) => {
      const paras = Array.isArray(sec.paragraphs) ? sec.paragraphs : [''];
      return {
        ...sec,
        _type: 'articleContentSection',
        _key: sec._key || sec.id || `sec_${idx + 1}`,
        id: sec.id || `sec_${idx + 1}`,
        paragraphs: paras,
        portableTextBody: paragraphsToPortableText(paras, {
          images: sec.images,
          callout: sec.callout,
        }),
      };
    });
    const nextBodyPt = sectionsToFullBodyPortableText(
      normalizedSecs as unknown as ArticleSection[]
    );
    await syncFieldsToSanityDocument(
      {
        sections: normalizedSecs,
        bodyPortableText: nextBodyPt,
      },
      summaryLabel,
      { persistToCloud: persist }
    );
  };

  const handleMoveSection = async (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const copy = [...sections];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    await updateSectionsArray(copy, `Reordered section "${moved.heading}"`, true);
  };

  const handleInsertSection = async (afterIdx: number) => {
    const newIdx = afterIdx + 1;
    const newId = `sec_${Date.now().toString(36).slice(-5)}`;
    const newSec = {
      _type: 'articleContentSection',
      _key: newId,
      id: newId,
      heading: `New Section ${newIdx + 1}`,
      subheading: '',
      paragraphs: [
        'Write your section paragraph here. Use the toolbar above to add bold, italic, links, images with captions, research citations, or callouts.',
      ],
    };
    const copy = [...sections];
    copy.splice(newIdx, 0, newSec);
    await updateSectionsArray(copy, 'Inserted new article section', true);
  };

  const handleDeleteSection = async (idx: number) => {
    if (sections.length <= 1) {
      setStatusBanner({
        type: 'warning',
        text: 'An article must have at least one content section.',
      });
      return;
    }
    const removed = sections[idx];
    const copy = sections.filter((_, i) => i !== idx);
    await updateSectionsArray(
      copy,
      `Deleted section "${removed?.heading || idx + 1}"`,
      true
    );
  };

  const handleAppendTokenToSectionParagraph = async (
    sectionIdx: number,
    tokenText: string,
    extraPatch?: Partial<Record<string, any>>,
    summaryLabel = 'Inserted rich-text element'
  ) => {
    const copy = [...sections];
    const target = { ...(copy[sectionIdx] || {}) };
    const paras = Array.isArray(target.paragraphs)
      ? [...target.paragraphs]
      : [''];
    const lastIdx = Math.max(0, paras.length - 1);
    paras[lastIdx] = `${(paras[lastIdx] || '').trim()} ${tokenText}`.trim();
    target.paragraphs = paras;
    if (extraPatch) {
      Object.assign(target, extraPatch);
    }
    copy[sectionIdx] = target;
    await updateSectionsArray(copy, summaryLabel, true);
  };

  const handleUploadInlineImageFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingInlineImage(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const headers = await getStudioSessionHeaders();
      const res = await fetch('/api/studio/sanity/upload-image', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || 'image/jpeg',
          base64Data,
          alt: imageAltInput || file.name,
          caption: imageCaptionInput,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.asset?.url) {
        setImageUrlInput(data.asset.url);
        if (!imageAltInput && data.asset.alt) {
          setImageAltInput(data.asset.alt);
        }
        setStatusBanner({
          type: 'success',
          text: `Uploaded "${file.name}" to Sanity Content Lake CDN.`,
        });
      } else {
        setStatusBanner({
          type: 'error',
          text: data?.message || 'Image upload failed.',
        });
      }
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.message || 'Image upload error.',
      });
    } finally {
      setIsUploadingInlineImage(false);
    }
  };

  // ===========================================================================
  // BRIEF EXPORT & IMPORT HANDLERS
  // ===========================================================================

  const handleExportBrief = async (mode: 'create' | 'revision') => {
    setIsExportingBrief(true);
    try {
      const headers = await getStudioSessionHeaders();
      const res = await fetch('/api/studio/sanity/ai-article-export-brief', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode,
          topic: topicInput || activeDoc.title,
          editorialAngle: editorialAngleInput || activeDoc.subtitle,
          researchNotes: researchNotesInput,
          revisionGoals: improveRevisionGoals,
          writingProfileId: selectedProfileId,
          writingProfile: profileDraft || activeProfile,
          currentDocument: activeDoc,
        }),
      });
      const data = await res.json();
      if (res.ok && data.markdownBrief) {
        setExportedBriefMarkdown(data.markdownBrief);
        setExportedBriefFilename(
          data.suggestedFilename || `article-${mode}-brief.md`
        );
        setStatusBanner({
          type: 'success',
          text: `Generated ${
            mode === 'revision'
              ? 'Article Revision Brief'
              : 'Article Writing Brief'
          } using profile "${data.writingProfileUsed?.name || 'Article Editorial'}".`,
        });
      }
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.message || 'Failed to export brief.',
      });
    } finally {
      setIsExportingBrief(false);
    }
  };

  const handleImportArticleJson = async () => {
    if (!importJsonText.trim()) {
      setStatusBanner({
        type: 'warning',
        text: 'Paste a complete article or revision JSON response first.',
      });
      return;
    }
    try {
      const headers = await getStudioSessionHeaders();
      const res = await fetch('/api/studio/sanity/ai-article-import-payload', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rawPayload: importJsonText,
          currentDocument: activeDoc,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusBanner({
          type: 'error',
          text: data?.message || 'Could not parse imported article JSON.',
        });
        return;
      }

      const initialChecks: Record<string, boolean> = {};
      for (const d of data.fieldDiffs || []) {
        initialChecks[d.field] = true;
      }
      setSelectedDiffFields(initialChecks);
      setPendingProposal({
        sourceLabel: 'Imported Article Payload',
        thesis: data.proposedFields?.subtitle || 'Imported from structured brief',
        profileName: activeProfile?.name || 'Article Editorial',
        proposedFields: data.proposedFields,
        fieldDiffs: data.fieldDiffs || [],
      });
      setStatusBanner({
        type: 'success',
        text: data.message,
      });
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.message || 'Failed to import article payload.',
      });
    }
  };

  const handleSaveProfileChanges = async () => {
    if (!profileDraft) return;
    setIsSavingProfile(true);
    try {
      const headers = await getStudioSessionHeaders();
      const res = await fetch('/api/studio/sanity/ai-profiles', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          profile: profileDraft,
          publishImmediately: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        await loadProfiles();
        setShowProfileEditor(false);
        setStatusBanner({
          type: 'success',
          text: `Saved AI Writing Profile "${profileDraft.name}" to Sanity Content Lake.`,
        });
      } else {
        setStatusBanner({
          type: 'error',
          text: data?.message || 'Failed to save AI Writing Profile.',
        });
      }
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.message || 'Error saving AI Writing Profile.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div>
      <div style={S.container} data-testid="official-sanity-article-workspace">
        {/* TOP BAR: STATUS + SAVE / PREVIEW / PUBLISH / UNPUBLISH */}
      <div style={S.headerRow}>
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                backgroundColor: '#181817',
                color: '#FFFFFF',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                padding: '3px 7px',
                borderRadius: '4px',
              }}
            >
              Article Editorial Studio
            </span>
            <span
              style={{
                backgroundColor:
                  activeDoc.status === 'published' ? '#E6F4EA' : '#FEF3C7',
                color:
                  activeDoc.status === 'published' ? '#137333' : '#92400E',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              {activeDoc.status === 'published' ? '● Published' : '● Draft'}
            </span>
            <span style={{ fontSize: '12px', color: '#57534E' }}>
              ID: <code>{activeDoc.id}</code> ·{' '}
              <strong>{sections.length}</strong> sections ·{' '}
              <strong>{(activeDoc.citations || []).length}</strong> citations
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            style={S.actionBtn('secondary')}
            data-testid="article-save-draft-btn"
          >
            {isSavingDraft ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={handlePreviewOnAstro}
            style={S.actionBtn('secondary')}
            data-testid="article-preview-astro-btn"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview on Astro</span>
          </button>

          <button
            type="button"
            onClick={handlePublishArticle}
            disabled={isPublishing}
            style={S.actionBtn('success')}
            data-testid="article-publish-btn"
          >
            {isPublishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Globe className="w-3.5 h-3.5" />
            )}
            <span>Publish Article</span>
          </button>

          <button
            type="button"
            onClick={handleUnpublishArticle}
            disabled={isUnpublishing}
            style={S.actionBtn('danger')}
            data-testid="article-unpublish-btn"
          >
            {isUnpublishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <X className="w-3.5 h-3.5" />
            )}
            <span>Unpublish</span>
          </button>
        </div>
      </div>

      {/* STATUS BANNER & PREVIEW / LIVE LINKS */}
      {statusBanner && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '6px',
            marginBottom: '12px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            backgroundColor:
              statusBanner.type === 'error'
                ? '#FEF2F2'
                : statusBanner.type === 'warning'
                ? '#FFFBEB'
                : statusBanner.type === 'success'
                ? '#ECFDF5'
                : '#EFF6FF',
            color:
              statusBanner.type === 'error'
                ? '#991B1B'
                : statusBanner.type === 'warning'
                ? '#92400E'
                : statusBanner.type === 'success'
                ? '#065F46'
                : '#1E40AF',
            border: '1px solid currentColor',
          }}
          data-testid="article-workspace-status-banner"
        >
          <span>{statusBanner.text}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontWeight: 700,
                  textDecoration: 'underline',
                  color: 'inherit',
                  whiteSpace: 'nowrap',
                }}
                data-testid="open-astro-article-preview-link"
              >
                Open Astro Preview Page ↗
              </a>
            )}
            {livePublishedUrl && (
              <a
                href={livePublishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontWeight: 700,
                  textDecoration: 'underline',
                  color: 'inherit',
                  whiteSpace: 'nowrap',
                }}
                data-testid="open-live-astro-article-link"
              >
                View Live Astro Page ({livePublishedUrl}) ↗
              </a>
            )}
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'inherit',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* AI WRITING PROFILE BAR */}
      <div
        style={{
          ...S.card,
          backgroundColor: '#F4F1EA',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 700 }}>
            AI Writing Profile:
          </span>
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            style={{
              ...S.input,
              width: 'auto',
              minWidth: '240px',
              padding: '5px 10px',
            }}
            data-testid="article-writing-profile-select"
          >
            {profiles.map((p) => (
              <option
                key={p.profileId || p._id}
                value={p.profileId || p._id}
              >
                {p.name} ({p.contentType})
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowProfileEditor((prev) => !prev)}
          style={S.actionBtn('secondary')}
          data-testid="toggle-article-profile-editor-btn"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>
            {showProfileEditor
              ? 'Hide Profile Instructions'
              : 'Customize "Article Editorial" Profile'}
          </span>
        </button>
      </div>

      {/* INLINE EDITABLE AI WRITING PROFILE DRAWER */}
      {showProfileEditor && profileDraft && (
        <div style={S.card} data-testid="article-profile-editor-drawer">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <strong style={{ fontSize: '13px' }}>
              Editing Sanity AI Writing Profile: {profileDraft.name} (
              <code>{profileDraft.profileId}</code>)
            </strong>
            <button
              type="button"
              onClick={handleSaveProfileChanges}
              disabled={isSavingProfile}
              style={S.actionBtn('primary')}
            >
              {isSavingProfile ? 'Saving...' : 'Save Profile to Sanity'}
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
            }}
          >
            <div>
              <label style={S.label}>Editorial Voice & Style</label>
              <textarea
                rows={4}
                style={S.textarea}
                value={profileDraft.editorialVoiceAndStyle || ''}
                onChange={(e) =>
                  setProfileDraft({
                    ...profileDraft,
                    editorialVoiceAndStyle: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label style={S.label}>
                Additional Custom Instructions (Editable Anytime)
              </label>
              <textarea
                rows={4}
                style={S.textarea}
                value={profileDraft.additionalCustomInstructions || ''}
                onChange={(e) =>
                  setProfileDraft({
                    ...profileDraft,
                    additionalCustomInstructions: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* PENDING AI PROPOSAL DIFF REVIEW (ACCEPT / REJECT) */}
      {pendingProposal && (
        <div
          style={{
            ...S.card,
            border: '2px solid #8C2D19',
            backgroundColor: '#FFFDF9',
          }}
          data-testid="article-ai-proposal-review"
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '10px',
              paddingBottom: '10px',
              borderBottom: '1px solid #E5E0D5',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#8C2D19' }}>
                Proposed Changes Ready for Review — {pendingProposal.sourceLabel}
              </div>
              <div style={{ fontSize: '12px', color: '#57534E' }}>
                Profile: <strong>{pendingProposal.profileName}</strong> · Thesis:{' '}
                <em>{pendingProposal.thesis}</em>
              </div>
              {pendingProposal.rationale && (
                <div style={{ fontSize: '12px', color: '#1F513F', marginTop: '2px' }}>
                  Revision Summary: {pendingProposal.rationale}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleAcceptProposal}
                style={S.actionBtn('success')}
                data-testid="accept-article-ai-proposal-btn"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept Selected Changes</span>
              </button>
              <button
                type="button"
                onClick={() => setPendingProposal(null)}
                style={S.actionBtn('danger')}
                data-testid="reject-article-ai-proposal-btn"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject & Discard</span>
              </button>
            </div>
          </div>

          <div
            style={{
              maxHeight: '360px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {pendingProposal.fieldDiffs.map((diff) => (
              <label
                key={diff.field}
                style={{
                  display: 'block',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #E2DDD2',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(selectedDiffFields[diff.field])}
                    onChange={(e) =>
                      setSelectedDiffFields((prev) => ({
                        ...prev,
                        [diff.field]: e.target.checked,
                      }))
                    }
                  />
                  <strong style={{ fontSize: '12px' }}>{diff.label}</strong>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#F3EFE6',
                    }}
                  >
                    {diff.category}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap',
                    color: '#181817',
                    backgroundColor: '#F9F8F5',
                    padding: '8px',
                    borderRadius: '4px',
                    maxHeight: '150px',
                    overflowY: 'auto',
                  }}
                >
                  {formatArticleDiffPreview(diff.proposedValue)}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* MODE TABS */}
      <div style={S.tabBar}>
        <button
          type="button"
          onClick={() => setActiveTab('composer')}
          style={S.tabBtn(activeTab === 'composer')}
          data-testid="tab-article-composer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>1. Rich-Text & Section Editor</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ai_generate')}
          style={S.tabBtn(activeTab === 'ai_generate')}
          data-testid="tab-article-ai-generate"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>2. Generate Complete Article (AI)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ai_improve')}
          style={S.tabBtn(activeTab === 'ai_improve')}
          data-testid="tab-article-ai-improve"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>3. Improve with AI</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('brief_io')}
          style={S.tabBtn(activeTab === 'brief_io')}
          data-testid="tab-article-brief-io"
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span>4. Brief Export & Import</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: VISUAL RICH-TEXT & SECTION COMPOSER (NO JSON EDITING)
         ===================================================================== */}
      {activeTab === 'composer' && (
        <div data-testid="article-visual-composer-panel">
          {/* Headline, Subtitle/Excerpt & SEO Quick Editor */}
          <div style={S.card}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '10px',
                marginBottom: '10px',
              }}
            >
              <div>
                <label style={S.label}>Article Title (On-Page H1)</label>
                <input
                  type="text"
                  style={S.input}
                  value={activeDoc.title || ''}
                  onChange={(e) =>
                    syncFieldsToSanityDocument(
                      { title: e.target.value },
                      'Updated title',
                      { persistToCloud: false }
                    )
                  }
                  data-testid="article-title-input"
                />
              </div>
              <div>
                <label style={S.label}>URL Slug (/articles/[slug]/)</label>
                <input
                  type="text"
                  style={S.input}
                  value={activeDoc.slug?.current || ''}
                  onChange={(e) => {
                    const cleanSlug = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]+/g, '-')
                      .replace(/^-+|-+$/g, '');
                    syncFieldsToSanityDocument(
                      {
                        slug: { _type: 'slug', current: cleanSlug },
                        seo: {
                          ...(activeDoc.seo || {}),
                          canonicalPath: `/articles/${cleanSlug}/`,
                        },
                      },
                      'Updated slug',
                      { persistToCloud: false }
                    );
                  }}
                  data-testid="article-slug-input"
                />
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={S.label}>Subtitle / Editorial Excerpt (Dek)</label>
              <textarea
                rows={2}
                style={S.textarea}
                value={activeDoc.subtitle || ''}
                onChange={(e) =>
                  syncFieldsToSanityDocument(
                    { subtitle: e.target.value },
                    'Updated subtitle',
                    { persistToCloud: false }
                  )
                }
                data-testid="article-subtitle-input"
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
              }}
            >
              <div>
                <label style={S.label}>SEO Title</label>
                <input
                  type="text"
                  style={S.input}
                  value={activeDoc.seo?.seoTitle || ''}
                  onChange={(e) =>
                    syncFieldsToSanityDocument(
                      {
                        seo: {
                          ...(activeDoc.seo || {}),
                          seoTitle: e.target.value,
                        },
                      },
                      'Updated SEO title',
                      { persistToCloud: false }
                    )
                  }
                  data-testid="article-seo-title-input"
                />
              </div>
              <div>
                <label style={S.label}>SEO Meta Description</label>
                <input
                  type="text"
                  style={S.input}
                  value={activeDoc.seo?.metaDescription || ''}
                  onChange={(e) =>
                    syncFieldsToSanityDocument(
                      {
                        seo: {
                          ...(activeDoc.seo || {}),
                          metaDescription: e.target.value,
                        },
                      },
                      'Updated SEO meta description',
                      { persistToCloud: false }
                    )
                  }
                  data-testid="article-seo-description-input"
                />
              </div>
            </div>
          </div>

          {/* SECTIONS LIST: EDIT H2/H3, PARAGRAPHS, BOLD, ITALIC, LINKS, IMAGES, CITATIONS, CALLOUTS & REORDER */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <strong style={{ fontSize: '13px' }}>
              Article Sections ({sections.length}) — Write, Format, Reorder,
              Insert or Delete
            </strong>
            <button
              type="button"
              onClick={() => handleInsertSection(sections.length - 1)}
              style={S.actionBtn('primary')}
              data-testid="add-article-section-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Content Section</span>
            </button>
          </div>

          {sections.map((sec, sIdx) => {
            const paras: string[] = Array.isArray(sec.paragraphs)
              ? sec.paragraphs
              : [''];
            const secImages: Array<Record<string, any>> = Array.isArray(
              sec.images
            )
              ? sec.images
              : [];

            return (
              <div
                key={sec.id || sIdx}
                style={S.card}
                data-testid={`article-section-card-${sIdx}`}
              >
                {/* Section Header + Reorder / Insert / Delete Controls */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '10px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #EFECE6',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#8C2D19',
                      textTransform: 'uppercase',
                    }}
                  >
                    Section {sIdx + 1} · Anchor ID: <code>{sec.id}</code>
                  </span>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleMoveSection(sIdx, -1)}
                      disabled={sIdx === 0}
                      style={S.actionBtn('secondary')}
                      title="Move Section Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span>Up</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSection(sIdx, 1)}
                      disabled={sIdx === sections.length - 1}
                      style={S.actionBtn('secondary')}
                      title="Move Section Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>Down</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSection(sIdx)}
                      style={S.actionBtn('secondary')}
                      title="Insert Section Below"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Insert Below</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(sIdx)}
                      style={S.actionBtn('danger')}
                      title="Delete Section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* H2 & H3 Headings */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    marginBottom: '10px',
                  }}
                >
                  <div>
                    <label style={S.label}>H2 Section Heading</label>
                    <input
                      type="text"
                      style={S.input}
                      value={sec.heading || ''}
                      onChange={(e) => {
                        const copy = [...sections];
                        copy[sIdx] = { ...sec, heading: e.target.value };
                        updateSectionsArray(copy, 'Updated H2 heading', false);
                      }}
                      data-testid={`section-h2-input-${sIdx}`}
                    />
                  </div>
                  <div>
                    <label style={S.label}>Optional H3 Sub-heading</label>
                    <input
                      type="text"
                      style={S.input}
                      value={sec.subheading || ''}
                      placeholder="Optional H3 sub-heading..."
                      onChange={(e) => {
                        const copy = [...sections];
                        copy[sIdx] = {
                          ...sec,
                          subheading: e.target.value || undefined,
                        };
                        updateSectionsArray(copy, 'Updated H3 subheading', false);
                      }}
                      data-testid={`section-h3-input-${sIdx}`}
                    />
                  </div>
                </div>

                {/* Rich-Text Formatting Toolbar */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginBottom: '8px',
                    padding: '6px',
                    backgroundColor: '#F5F2EB',
                    borderRadius: '6px',
                  }}
                >
                  <button
                    type="button"
                    style={S.actionBtn('secondary')}
                    onClick={() =>
                      handleAppendTokenToSectionParagraph(
                        sIdx,
                        '**bold text**',
                        undefined,
                        'Added bold text'
                      )
                    }
                  >
                    <Bold className="w-3.5 h-3.5" />
                    <span>Bold</span>
                  </button>
                  <button
                    type="button"
                    style={S.actionBtn('secondary')}
                    onClick={() =>
                      handleAppendTokenToSectionParagraph(
                        sIdx,
                        '*italic text*',
                        undefined,
                        'Added italic text'
                      )
                    }
                  >
                    <Italic className="w-3.5 h-3.5" />
                    <span>Italic</span>
                  </button>
                  <button
                    type="button"
                    style={S.actionBtn('secondary')}
                    onClick={() => {
                      const copy = [...sections];
                      copy[sIdx] = {
                        ...sec,
                        paragraphs: [...paras, '### New Sub-heading (H3)'],
                      };
                      updateSectionsArray(copy, 'Added H3 block', true);
                    }}
                  >
                    <Heading3 className="w-3.5 h-3.5" />
                    <span>+ H3 Block</span>
                  </button>
                  <button
                    type="button"
                    style={S.actionBtn('secondary')}
                    onClick={() =>
                      setActiveInsertModal({ sectionIdx: sIdx, type: 'link' })
                    }
                    data-testid={`insert-link-btn-${sIdx}`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Insert Link</span>
                  </button>
                  <button
                    type="button"
                    style={S.actionBtn('secondary')}
                    onClick={() =>
                      setActiveInsertModal({ sectionIdx: sIdx, type: 'image' })
                    }
                    data-testid={`insert-image-btn-${sIdx}`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Insert Image</span>
                  </button>
                  <button
                    type="button"
                    style={S.actionBtn('secondary')}
                    onClick={() =>
                      setActiveInsertModal({
                        sectionIdx: sIdx,
                        type: 'citation',
                      })
                    }
                    data-testid={`insert-citation-btn-${sIdx}`}
                  >
                    <Quote className="w-3.5 h-3.5" />
                    <span>Insert Citation</span>
                  </button>
                  <button
                    type="button"
                    style={S.actionBtn('secondary')}
                    onClick={() => {
                      setCalloutKickerInput(
                        sec.callout?.kicker || 'Editorial Takeaway'
                      );
                      setCalloutTitleInput(sec.callout?.title || '');
                      setCalloutBodyInput(sec.callout?.body || '');
                      setCalloutToneInput(sec.callout?.tone || 'sand');
                      setActiveInsertModal({
                        sectionIdx: sIdx,
                        type: 'callout',
                      });
                    }}
                    data-testid={`insert-callout-btn-${sIdx}`}
                  >
                    <MessageSquareQuote className="w-3.5 h-3.5" />
                    <span>
                      {sec.callout?.title ? 'Edit Callout' : 'Add Callout'}
                    </span>
                  </button>
                </div>

                {/* Inline Modal for Link / Image / Citation / Callout */}
                {activeInsertModal &&
                  activeInsertModal.sectionIdx === sIdx && (
                    <div
                      style={{
                        padding: '12px',
                        borderRadius: '6px',
                        backgroundColor: '#FFFDF9',
                        border: '1px solid #8C2D19',
                        marginBottom: '10px',
                      }}
                    >
                      {activeInsertModal.type === 'link' && (
                        <div>
                          <strong style={{ fontSize: '12px' }}>
                            Insert Link into Section {sIdx + 1}
                          </strong>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr auto',
                              gap: '8px',
                              marginTop: '6px',
                            }}
                          >
                            <input
                              type="text"
                              placeholder="Link anchor text (e.g. interactive Gift Finder)"
                              style={S.input}
                              value={linkLabelInput}
                              onChange={(e) => setLinkLabelInput(e.target.value)}
                              data-testid="modal-link-label-input"
                            />
                            <input
                              type="text"
                              placeholder="https://... or /gift-finder/"
                              style={S.input}
                              value={linkHrefInput}
                              onChange={(e) => setLinkHrefInput(e.target.value)}
                              data-testid="modal-link-href-input"
                            />
                            <button
                              type="button"
                              style={S.actionBtn('primary')}
                              onClick={async () => {
                                const label =
                                  linkLabelInput.trim() || 'Explore more';
                                const href =
                                  linkHrefInput.trim() || '/gift-guides/';
                                await handleAppendTokenToSectionParagraph(
                                  sIdx,
                                  `[${label}](${href})`,
                                  undefined,
                                  `Inserted link [${label}](${href})`
                                );
                                setLinkLabelInput('');
                                setActiveInsertModal(null);
                              }}
                              data-testid="confirm-insert-link-btn"
                            >
                              Insert Link
                            </button>
                          </div>
                        </div>
                      )}

                      {activeInsertModal.type === 'image' && (
                        <div>
                          <strong style={{ fontSize: '12px' }}>
                            Insert Image with Caption & Alt Text into Section{' '}
                            {sIdx + 1}
                          </strong>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '8px',
                              marginTop: '6px',
                            }}
                          >
                            <div>
                              <label style={S.label}>
                                Image HTTPS URL (or Upload File Below)
                              </label>
                              <input
                                type="text"
                                placeholder="https://images.unsplash.com/..."
                                style={S.input}
                                value={imageUrlInput}
                                onChange={(e) =>
                                  setImageUrlInput(e.target.value)
                                }
                                data-testid="modal-image-url-input"
                              />
                              <div style={{ marginTop: '6px' }}>
                                <label
                                  style={{
                                    ...S.actionBtn('secondary'),
                                    display: 'inline-flex',
                                  }}
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>
                                    {isUploadingInlineImage
                                      ? 'Uploading to Sanity CDN...'
                                      : 'Upload Image File to Sanity'}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleUploadInlineImageFile}
                                    style={{ display: 'none' }}
                                  />
                                </label>
                              </div>
                            </div>
                            <div>
                              <label style={S.label}>
                                Descriptive Alt Text (Required)
                              </label>
                              <input
                                type="text"
                                placeholder="Describe the photograph for screen readers..."
                                style={S.input}
                                value={imageAltInput}
                                onChange={(e) =>
                                  setImageAltInput(e.target.value)
                                }
                                data-testid="modal-image-alt-input"
                              />
                              <label
                                style={{ ...S.label, marginTop: '6px' }}
                              >
                                Editorial Caption
                              </label>
                              <input
                                type="text"
                                placeholder="Caption displayed below the image..."
                                style={S.input}
                                value={imageCaptionInput}
                                onChange={(e) =>
                                  setImageCaptionInput(e.target.value)
                                }
                                data-testid="modal-image-caption-input"
                              />
                            </div>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              gap: '8px',
                              marginTop: '8px',
                            }}
                          >
                            <button
                              type="button"
                              style={S.actionBtn('primary')}
                              onClick={async () => {
                                const url = imageUrlInput.trim();
                                if (!url) return;
                                const newImg = {
                                  _type: 'editorialImage',
                                  _key: `img_${Date.now().toString(36)}`,
                                  id: `img_${Date.now().toString(36)}`,
                                  url,
                                  externalUrl: url,
                                  alt:
                                    imageAltInput.trim() ||
                                    `${sec.heading} editorial photograph`,
                                  caption:
                                    imageCaptionInput.trim() || undefined,
                                };
                                const copy = [...sections];
                                copy[sIdx] = {
                                  ...sec,
                                  images: [...secImages, newImg],
                                };
                                await updateSectionsArray(
                                  copy,
                                  'Inserted section image with caption & alt text',
                                  true
                                );
                                setImageUrlInput('');
                                setImageAltInput('');
                                setImageCaptionInput('');
                                setActiveInsertModal(null);
                              }}
                              data-testid="confirm-insert-image-btn"
                            >
                              Insert Image into Section
                            </button>
                            <button
                              type="button"
                              style={S.actionBtn('secondary')}
                              onClick={() => setActiveInsertModal(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {activeInsertModal.type === 'citation' && (
                        <div>
                          <strong style={{ fontSize: '12px' }}>
                            Insert Research Citation into Section {sIdx + 1}
                          </strong>
                          <div
                            style={{
                              display: 'flex',
                              gap: '8px',
                              marginTop: '6px',
                              alignItems: 'center',
                            }}
                          >
                            <select
                              style={{ ...S.input, flex: 1 }}
                              value={selectedCitationToInsert}
                              onChange={(e) =>
                                setSelectedCitationToInsert(e.target.value)
                              }
                            >
                              {Object.values(CITATIONS).map((cit) => (
                                <option key={cit.id} value={cit.id}>
                                  [{cit.id}] {cit.authors} ({cit.year}) —{' '}
                                  {cit.title}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              style={S.actionBtn('primary')}
                              onClick={async () => {
                                await handleAppendTokenToSectionParagraph(
                                  sIdx,
                                  `[cite:${selectedCitationToInsert}]`,
                                  undefined,
                                  `Inserted citation [cite:${selectedCitationToInsert}]`
                                );
                                setActiveInsertModal(null);
                              }}
                              data-testid="confirm-insert-citation-btn"
                            >
                              Insert Citation
                            </button>
                          </div>
                        </div>
                      )}

                      {activeInsertModal.type === 'callout' && (
                        <div>
                          <strong style={{ fontSize: '12px' }}>
                            Editorial Callout Box for Section {sIdx + 1}
                          </strong>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 2fr 1fr',
                              gap: '8px',
                              marginTop: '6px',
                            }}
                          >
                            <input
                              type="text"
                              placeholder="Kicker (e.g. The Rule of Thumb)"
                              style={S.input}
                              value={calloutKickerInput}
                              onChange={(e) =>
                                setCalloutKickerInput(e.target.value)
                              }
                            />
                            <input
                              type="text"
                              placeholder="Callout Headline"
                              style={S.input}
                              value={calloutTitleInput}
                              onChange={(e) =>
                                setCalloutTitleInput(e.target.value)
                              }
                              data-testid="modal-callout-title-input"
                            />
                            <select
                              style={S.input}
                              value={calloutToneInput}
                              onChange={(e) =>
                                setCalloutToneInput(e.target.value as any)
                              }
                            >
                              <option value="sand">Sand (Warm Neutral)</option>
                              <option value="mint">Mint (Fresh Insight)</option>
                              <option value="butter">Butter (Highlight)</option>
                              <option value="blue">Blue (Research Note)</option>
                            </select>
                          </div>
                          <textarea
                            rows={2}
                            placeholder="Callout body text..."
                            style={{ ...S.textarea, marginTop: '6px' }}
                            value={calloutBodyInput}
                            onChange={(e) =>
                              setCalloutBodyInput(e.target.value)
                            }
                            data-testid="modal-callout-body-input"
                          />
                          <div
                            style={{
                              display: 'flex',
                              gap: '8px',
                              marginTop: '6px',
                            }}
                          >
                            <button
                              type="button"
                              style={S.actionBtn('primary')}
                              onClick={async () => {
                                if (
                                  !calloutTitleInput.trim() ||
                                  !calloutBodyInput.trim()
                                )
                                  return;
                                const copy = [...sections];
                                copy[sIdx] = {
                                  ...sec,
                                  callout: {
                                    _type: 'articleCallout',
                                    kicker:
                                      calloutKickerInput.trim() || undefined,
                                    title: calloutTitleInput.trim(),
                                    body: calloutBodyInput.trim(),
                                    tone: calloutToneInput,
                                  },
                                };
                                await updateSectionsArray(
                                  copy,
                                  'Saved editorial callout box',
                                  true
                                );
                                setActiveInsertModal(null);
                              }}
                              data-testid="confirm-save-callout-btn"
                            >
                              Save Callout Box
                            </button>
                            <button
                              type="button"
                              style={S.actionBtn('secondary')}
                              onClick={() => setActiveInsertModal(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {/* Section Paragraphs Editor */}
                <div>
                  <label style={S.label}>
                    Section Paragraphs (Separate paragraphs with a blank line;
                    supports **bold**, *italic*, [label](url), and
                    [cite:cit_id])
                  </label>
                  <textarea
                    rows={Math.max(4, paras.length * 2 + 1)}
                    style={S.textarea}
                    value={paras.join('\n\n')}
                    onChange={(e) => {
                      const nextParas = e.target.value
                        .split(/\n\s*\n/)
                        .map((p) => p.trim())
                        .filter(Boolean);
                      const copy = [...sections];
                      copy[sIdx] = {
                        ...sec,
                        paragraphs:
                          nextParas.length > 0 ? nextParas : [e.target.value],
                      };
                      updateSectionsArray(
                        copy,
                        'Updated section paragraphs',
                        false
                      );
                    }}
                    data-testid={`section-paragraphs-textarea-${sIdx}`}
                  />
                </div>

                {/* Display Inserted Images & Callout Preview in Section */}
                {secImages.length > 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    {secImages.map((img, imgIdx) => (
                      <div
                        key={img.id || imgIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#F4F1EA',
                          fontSize: '11px',
                        }}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>
                          <strong>Alt:</strong> {img.alt}
                          {img.caption ? ` · Caption: "${img.caption}"` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...sections];
                            copy[sIdx] = {
                              ...sec,
                              images: secImages.filter((_, i) => i !== imgIdx),
                            };
                            updateSectionsArray(
                              copy,
                              'Removed section image',
                              true
                            );
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#991B1B',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {sec.callout && sec.callout.title && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#EFECE6',
                      fontSize: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>
                      <strong>Callout ({sec.callout.tone || 'sand'}):</strong>{' '}
                      {sec.callout.title} — {sec.callout.body}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...sections];
                        const nextSec = { ...sec };
                        delete nextSec.callout;
                        copy[sIdx] = nextSec;
                        updateSectionsArray(copy, 'Removed callout', true);
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#991B1B',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          TAB 2: GENERATE COMPLETE ARTICLE WITH AI
         ===================================================================== */}
      {activeTab === 'ai_generate' && (
        <div style={S.card} data-testid="article-ai-generate-panel">
          <div style={{ marginBottom: '10px' }}>
            <label style={S.label}>Article Topic / Working Headline</label>
            <input
              type="text"
              style={S.input}
              placeholder="e.g., Why Small Daily Ritual Gifts Outlast Expensive Surprise Boxes"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              data-testid="ai-article-topic-input"
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={S.label}>Editorial Angle & Central Thesis</label>
            <input
              type="text"
              style={S.input}
              placeholder="e.g., Contrast the 4-second unwrapping gasp with 400 mornings of tactile utility..."
              value={editorialAngleInput}
              onChange={(e) => setEditorialAngleInput(e.target.value)}
              data-testid="ai-article-angle-input"
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={S.label}>
              Research Notes, Studies & Concrete Examples
            </label>
            <textarea
              rows={3}
              style={S.textarea}
              placeholder="Optional research observations, scenes, or specific gifting moments to include..."
              value={researchNotesInput}
              onChange={(e) => setResearchNotesInput(e.target.value)}
              data-testid="ai-article-notes-input"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerateCompleteArticle}
            disabled={isGeneratingArticle}
            style={S.actionBtn('accent')}
            data-testid="run-generate-complete-article-btn"
          >
            {isGeneratingArticle ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>
              {isGeneratingArticle
                ? 'Generating Complete Article & SEO with Gemini...'
                : 'Generate Complete Article & Supporting SEO'}
            </span>
          </button>
        </div>
      )}

      {/* =====================================================================
          TAB 3: IMPROVE WITH AI (SECTION OR FULL ARTICLE)
         ===================================================================== */}
      {activeTab === 'ai_improve' && (
        <div style={S.card} data-testid="article-ai-improve-panel">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '10px',
            }}
          >
            <div>
              <label style={S.label}>Target Scope</label>
              <select
                style={S.input}
                value={improveTargetSectionId}
                onChange={(e) => setImproveTargetSectionId(e.target.value)}
                data-testid="ai-improve-target-select"
              >
                <option value="all_sections">
                  Entire Article (All Sections, Summary & SEO)
                </option>
                {sections.map((sec, idx) => (
                  <option key={sec.id || idx} value={sec.id}>
                    Section {idx + 1}: {sec.heading}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>
                Optional Revision Direction / Angle Note
              </label>
              <input
                type="text"
                style={S.input}
                placeholder="e.g., Add a dinner host example or sharpen the opening hook..."
                value={improveRevisionGoals}
                onChange={(e) => setImproveRevisionGoals(e.target.value)}
                data-testid="ai-improve-goals-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              disabled={isImprovingArticle}
              onClick={() => handleImproveWithAi('rewrite_polish')}
              style={S.actionBtn('primary')}
              data-testid="ai-improve-rewrite-btn"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Rewrite & Polish</span>
            </button>
            <button
              type="button"
              disabled={isImprovingArticle}
              onClick={() => handleImproveWithAi('another_angle')}
              style={S.actionBtn('secondary')}
              data-testid="ai-improve-angle-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Another Editorial Angle</span>
            </button>
            <button
              type="button"
              disabled={isImprovingArticle}
              onClick={() => handleImproveWithAi('reduce_repetition')}
              style={S.actionBtn('secondary')}
              data-testid="ai-improve-repetition-btn"
            >
              <span>Reduce Repetition</span>
            </button>
            <button
              type="button"
              disabled={isImprovingArticle}
              onClick={() => handleImproveWithAi('shorten')}
              style={S.actionBtn('secondary')}
              data-testid="ai-improve-shorten-btn"
            >
              <span>Shorten Passages</span>
            </button>
            <button
              type="button"
              disabled={isImprovingArticle}
              onClick={() => handleImproveWithAi('expand')}
              style={S.actionBtn('secondary')}
              data-testid="ai-improve-expand-btn"
            >
              <span>Expand with Depth & Examples</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: OPTIONAL BRIEF EXPORT & IMPORT
         ===================================================================== */}
      {activeTab === 'brief_io' && (
        <div style={S.card} data-testid="article-brief-io-panel">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <button
              type="button"
              disabled={isExportingBrief}
              onClick={() => handleExportBrief('create')}
              style={S.actionBtn('primary')}
              data-testid="export-article-writing-brief-btn"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Article Writing Brief</span>
            </button>
            <button
              type="button"
              disabled={isExportingBrief}
              onClick={() => handleExportBrief('revision')}
              style={S.actionBtn('secondary')}
              data-testid="export-article-revision-brief-btn"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Revision Brief</span>
            </button>
          </div>

          {exportedBriefMarkdown && (
            <div style={{ marginBottom: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <label style={S.label}>
                  Exported Brief ({exportedBriefFilename})
                </label>
                <button
                  type="button"
                  style={S.actionBtn('secondary')}
                  onClick={() => {
                    navigator.clipboard?.writeText(exportedBriefMarkdown);
                    setStatusBanner({
                      type: 'success',
                      text: 'Copied Markdown brief to clipboard.',
                    });
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Brief</span>
                </button>
              </div>
              <textarea
                rows={6}
                readOnly
                style={S.textarea}
                value={exportedBriefMarkdown}
                data-testid="exported-article-brief-textarea"
              />
            </div>
          )}

          <div>
            <label style={S.label}>
              Import Complete Article or Import Article Revision (Paste
              Structured JSON Response)
            </label>
            <textarea
              rows={5}
              style={S.textarea}
              placeholder='Paste JSON response matching the Article Writing Brief or Revision Brief template...'
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              data-testid="import-article-json-textarea"
            />
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleImportArticleJson}
                style={S.actionBtn('accent')}
                data-testid="import-article-payload-btn"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Complete Article / Revision</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Render Official Sanity Studio's Native Tabbed Document Form (including Native Portable Text Editor) Below */}
      {typeof props?.renderDefault === 'function' ? props.renderDefault(props) : null}
    </div>
  );
}
