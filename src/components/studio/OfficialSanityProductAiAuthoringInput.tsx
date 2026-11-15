import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PatchEvent, set, useFormValue } from 'sanity';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  Globe,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import type { AiWritingProfileDocument } from '../../cms/studio/schemas/documents/aiWritingProfile';
import type { ExtractedProductDetailsResult } from '../../cms/studio/productUrlExtractor';
import type {
  CompleteProductGenerationResult,
  EditorialCopyGenerationResult,
  EditorialPolishActionType,
  EditorialPolishTargetSection,
  PolishEditorialCopyResult,
  ProposedFieldDiff,
  SupportingFieldsGenerationResult,
} from '../../cms/studio/productAiAuthoringService';
import { generateProductAiWritingBrief } from '../../cms/productAiBriefExporter';
import { importProductInterchangeResponse } from '../../cms/productUniversalImporter';

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
          'X-Studio-Session': cachedSessionCreds.sessionToken,
          'X-Studio-CSRF': cachedSessionCreds.csrfToken,
        }
      : {}),
  };
}

function formatPreviewValue(val: any): string {
  if (val === undefined || val === null || val === '') return '— (Empty)';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object' && val._type === 'slug') {
    return val.current || '—';
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '[] (Empty list)';
    if (typeof val[0] === 'string') return val.join('\n\n');
    return val
      .map((item, i) => {
        if (item.label && item.value) return `• ${item.label}: ${item.value}`;
        if (item.title && item.detail)
          return `${i + 1}. ${item.title} (${item.importance || 'medium'}): ${item.detail}`;
        if (item.occasion && item.note)
          return `• [${item.occasion}]: ${item.note}`;
        return JSON.stringify(item);
      })
      .join('\n');
  }
  if (typeof val === 'object') {
    if (val._type === 'productGiftVerdict' || val.editorialAssessment) {
      return [
        `Assessment: ${val.editorialAssessment || '—'}`,
        `Why It Stands Out: ${val.standoutReason || '—'}`,
        `Recipient Delight: ${val.recipientDelight || '—'}`,
        `Honest Caveat: ${val.importantCaveat || '—'}`,
      ].join('\n');
    }
    if (val._type === 'productRecipientProfile' || val.headline) {
      return [
        `Headline: ${val.headline || '—'}`,
        `Narrative: ${val.narrative || '—'}`,
        `Lifestyle Cues: ${
          Array.isArray(val.lifestyleNotes) ? val.lifestyleNotes.join(' · ') : '—'
        }`,
        `Relationship Fit: ${val.relationshipFit || '—'}`,
      ].join('\n');
    }
    if (val._type === 'seoMetadata' || val.seoTitle) {
      return [
        `SEO Title: ${val.seoTitle || '—'}`,
        `Meta Description: ${val.metaDescription || '—'}`,
        `Canonical Path: ${val.canonicalPath || '—'}`,
      ].join('\n');
    }
    return JSON.stringify(val, null, 2);
  }
  return String(val);
}

export interface OfficialSanityProductAiAuthoringProps {
  /** Passed automatically when mounted as `components.input` on `productDocument` in Official Sanity Studio */
  renderDefault?: (props: any) => React.ReactNode;
  onChange?: (patch: any) => void;
  value?: Record<string, any>;
  /** Optional standalone mode when opened from the top Studio Tool bar */
  standaloneMode?: boolean;
  onOpenDocumentInDesk?: (docId: string, schemaType?: string) => void;
}

export const OfficialSanityProductAiAuthoringInput: React.FC<
  OfficialSanityProductAiAuthoringProps
> = (props) => {
  let formDoc: Record<string, any> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    formDoc = (useFormValue([]) as Record<string, any>) || props.value || null;
  } catch {
    formDoc = props.value || null;
  }

  const [standaloneDoc, setStandaloneDoc] = useState<Record<string, any>>({
    _id: 'drafts.prod_new_ai_authored_gift',
    _type: 'product',
    status: 'draft',
  });

  const activeDoc = formDoc || standaloneDoc;
  const isProtectedRealHoodie =
    activeDoc?._id === 'prod_emotional_support_psychology_major_hoodie' ||
    activeDoc?._id === 'drafts.prod_emotional_support_psychology_major_hoodie' ||
    activeDoc?.productId === 'prod_emotional_support_psychology_major_hoodie';

  // Shared URL & Retrieved Context State
  const [productUrl, setProductUrl] = useState<string>(
    activeDoc?.purchaseUrl ||
      activeDoc?.fourthwallUrl ||
      activeDoc?.affiliateUrl ||
      ''
  );
  const [retrievedDetails, setRetrievedDetails] =
    useState<ExtractedProductDetailsResult | null>(null);
  const [customNotes, setCustomNotes] = useState<string>('');

  // AI Writing Profiles State
  const [profiles, setProfiles] = useState<AiWritingProfileDocument[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    'ai_profile_science_of_gifts_product_editorial'
  );
  const [showProfileEditor, setShowProfileEditor] = useState<boolean>(false);
  const [profileDraft, setProfileDraft] =
    useState<AiWritingProfileDocument | null>(null);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Loading & Status Banner State
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Active Proposal Review State
  const [supportingProposal, setSupportingProposal] =
    useState<SupportingFieldsGenerationResult | null>(null);
  const [editorialProposal, setEditorialProposal] =
    useState<EditorialCopyGenerationResult | null>(null);
  const [completeProposal, setCompleteProposal] =
    useState<CompleteProductGenerationResult | null>(null);
  const [polishProposal, setPolishProposal] =
    useState<PolishEditorialCopyResult | null>(null);
  const [selectedFieldsToApply, setSelectedFieldsToApply] = useState<
    Record<string, boolean>
  >({});

  // Polish Controls
  const [showPolishPanel, setShowPolishPanel] = useState<boolean>(false);
  const [polishAction, setPolishAction] =
    useState<EditorialPolishActionType>('more_distinctive');
  const [polishTarget, setPolishTarget] =
    useState<EditorialPolishTargetSection>('all_editorial');
  const [polishCustomInstructions, setPolishCustomInstructions] =
    useState<string>('');

  // Optional Export / Import Brief Drawer
  const [showOptionalBriefTools, setShowOptionalBriefTools] =
    useState<boolean>(false);
  const [exportedBriefMarkdown, setExportedBriefMarkdown] =
    useState<string>('');
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [briefCopied, setBriefCopied] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Sync URL when switching documents
  useEffect(() => {
    const docUrl =
      activeDoc?.purchaseUrl ||
      activeDoc?.fourthwallUrl ||
      activeDoc?.affiliateUrl ||
      '';
    if (docUrl && !productUrl) {
      setProductUrl(docUrl);
    }
  }, [
    activeDoc?._id,
    activeDoc?.purchaseUrl,
    activeDoc?.fourthwallUrl,
    activeDoc?.affiliateUrl,
    productUrl,
  ]);

  // Load AI Writing Profiles from Sanity
  const loadProfiles = useCallback(async () => {
    try {
      const headers = await getStudioSessionHeaders();
      const res = await fetch('/api/studio/sanity/ai-profiles', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.profiles) && data.profiles.length > 0) {
          setProfiles(data.profiles);
          const def =
            data.profiles.find((p: AiWritingProfileDocument) => p.isDefault) ||
            data.profiles[0];
          if (def) {
            setSelectedProfileId(def.profileId);
            setProfileDraft(def);
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const activeProfile = useMemo(() => {
    return (
      profiles.find((p) => p.profileId === selectedProfileId) ||
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
   * Applies a dictionary of field updates directly to the Official Sanity Studio document form
   * (via `PatchEvent` + `set`) AND persists the draft to Sanity Content Lake via `/api/studio/sanity/save-draft`.
   */
  const applyFieldsToDocument = useCallback(
    async (fieldsMap: Record<string, any>, summaryLabel: string) => {
      if (isProtectedRealHoodie) {
        setStatusMessage({
          type: 'error',
          text: 'The original Emotional Support Psychology Major Hoodie document is read-only during evaluation. Use the Evaluation Copy (prod_eval_copy_emotional_support_psychology_major_hoodie) instead.',
        });
        return;
      }

      const entries = Object.entries(fieldsMap).filter(
        ([, v]) => v !== undefined
      );
      if (entries.length === 0) {
        setStatusMessage({
          type: 'warning',
          text: 'Select at least one proposed field to apply.',
        });
        return;
      }

      // 1. Update Official Sanity Studio form state immediately if mounted inside a document form
      if (typeof props.onChange === 'function') {
        try {
          const patches = entries.map(([key, val]) => set(val, [key]));
          props.onChange(PatchEvent.from(patches));
        } catch {}
      }

      // 2. Also update local standalone state & persist to Sanity Content Lake draft
      const nextDoc: Record<string, any> = {
        ...activeDoc,
        ...fieldsMap,
        _type: 'product',
        status: 'draft',
      };
      if (!nextDoc._id) {
        const pid =
          nextDoc.productId || 'prod_new_ai_authored_gift';
        nextDoc._id = pid.startsWith('drafts.') ? pid : `drafts.${pid}`;
      }
      setStandaloneDoc(nextDoc);

      try {
        const headers = await getStudioSessionHeaders();
        const saveRes = await fetch('/api/studio/sanity/save-draft', {
          method: 'POST',
          headers,
          body: JSON.stringify({ document: nextDoc }),
        });
        const saveJson = await saveRes.json();
        if (saveRes.ok && saveJson.persistedDocument) {
          setStandaloneDoc(saveJson.persistedDocument);
          setStatusMessage({
            type: 'success',
            text: `${summaryLabel} — Applied ${entries.length} fields and saved draft "${saveJson.persistedDocument._id}" (rev: ${saveJson.persistedDocument._rev}) to Sanity Content Lake.`,
          });
        } else {
          setStatusMessage({
            type: 'success',
            text: `${summaryLabel} — Applied ${entries.length} fields to the active Studio document form.`,
          });
        }
      } catch {
        setStatusMessage({
          type: 'success',
          text: `${summaryLabel} — Applied ${entries.length} fields to the active Studio document form.`,
        });
      }
    },
    [activeDoc, isProtectedRealHoodie, props]
  );

  // =========================================================================
  // ACTION 1: Fetch Product Details
  // =========================================================================
  const handleFetchProductDetails = async () => {
    const cleanUrl = productUrl.trim();
    if (!cleanUrl) {
      setStatusMessage({
        type: 'warning',
        text: 'Enter a product HTTPS URL first to fetch merchant details.',
      });
      return;
    }

    setBusyAction('fetch');
    setStatusMessage(null);
    try {
      const headers = await getStudioSessionHeaders();
      const res = await fetch('/api/studio/sanity/fetch-product-details', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: cleanUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage({
          type: 'error',
          text: data.message || 'Failed to retrieve product details from URL.',
        });
        return;
      }
      setRetrievedDetails(data);
      setStatusMessage({
        type: 'success',
        text: `Retrieved product details from ${data.merchantDomain || 'merchant'} (${(data.extractionSources || []).join(', ') || 'HTML'}): "${data.title || 'Untitled'}" · ${data.images?.length || 0} images · ${data.specifications?.length || 0} specs.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Network error fetching product details.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleApplyRetrievedFactsToDraft = async () => {
    if (!retrievedDetails) return;
    const patch: Record<string, any> = {};
    if (retrievedDetails.title && !activeDoc?.title) {
      patch.title = retrievedDetails.title;
    }
    if (retrievedDetails.vendor && !activeDoc?.vendor) {
      patch.vendor = retrievedDetails.vendor;
    }
    const finalUrl = retrievedDetails.finalUrl || retrievedDetails.sourceUrl;
    if (finalUrl) {
      patch.purchaseUrl = finalUrl;
      const isFourthwallUrl =
        retrievedDetails.commerceProvider === 'fourthwall' ||
        finalUrl.toLowerCase().includes('shop.scienceofgifts.com') ||
        finalUrl.toLowerCase().includes('fourthwall.com');
      if (isFourthwallUrl) {
        patch.commerceProvider = 'fourthwall';
        patch.fulfillmentClassification = 'owned-fourthwall-merch';
        patch.fourthwallUrl = finalUrl;
      } else {
        patch.commerceProvider = 'affiliate';
        patch.fulfillmentClassification = 'affiliate-partner';
        patch.affiliateUrl = finalUrl;
      }
    }
    // Keep price and stock explicitly unverified until editor confirms!
    if (
      typeof retrievedDetails.price === 'number' &&
      retrievedDetails.price > 0
    ) {
      patch.price = retrievedDetails.price;
      patch.priceVerified = false;
      patch.priceVerificationSource = 'unverified';
    }
    if (typeof retrievedDetails.inStock === 'boolean') {
      patch.inStock = retrievedDetails.inStock;
      patch.inventoryVerified = false;
      patch.inventoryVerificationSource = 'unverified';
    }
    if (
      Array.isArray(retrievedDetails.specifications) &&
      retrievedDetails.specifications.length > 0
    ) {
      patch.specifications = retrievedDetails.specifications
        .slice(0, 12)
        .map((s, idx) => ({
          _type: 'productSpecificationItem',
          _key: `spec_${String(idx + 1).padStart(2, '0')}`,
          label: s.label,
          value: s.value,
          notes: s.source ? `Extracted via ${s.source}` : undefined,
        }));
    }
    if (
      Array.isArray(retrievedDetails.images) &&
      retrievedDetails.images.length > 0 &&
      (!Array.isArray(activeDoc?.images) || activeDoc.images.length === 0)
    ) {
      patch.images = retrievedDetails.images.slice(0, 8).map((img, idx) => ({
        _type: 'productImage',
        _key: `img_${String(idx + 1).padStart(2, '0')}`,
        id: `img_${String(idx + 1).padStart(2, '0')}`,
        url: img.url,
        alt:
          img.alt ||
          `${retrievedDetails.title || 'Product'} view ${idx + 1}`,
        caption:
          idx === 0
            ? `Primary product view for ${retrievedDetails.title || 'product'}.`
            : `Additional view ${idx + 1}.`,
        isPrimary: idx === 0,
        sourceType: 'external-url',
        fitMode: 'cover',
        fallbackColor: '#F6F4EF',
        focalPoint: { _type: 'imageFocalPoint', x: 0.5, y: 0.5 },
      }));
    }

    await applyFieldsToDocument(
      patch,
      'Applied retrieved product facts (price & stock marked unverified)'
    );
  };

  // =========================================================================
  // ACTION 2: Generate Supporting Fields (Bulk AI Operation)
  // =========================================================================
  const handleGenerateSupportingFields = async () => {
    setBusyAction('supporting');
    setStatusMessage(null);
    setEditorialProposal(null);
    setCompleteProposal(null);
    setPolishProposal(null);

    try {
      const headers = await getStudioSessionHeaders();
      const res = await fetch('/api/studio/sanity/ai-generate-supporting', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productUrl: productUrl.trim(),
          fetchUrlFirst: Boolean(productUrl.trim() && !retrievedDetails),
          retrievedDetails,
          currentDocument: activeDoc,
          writingProfileId: selectedProfileId,
          customInstructions: customNotes,
        }),
      });
      const data: SupportingFieldsGenerationResult = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage({
          type: 'error',
          text:
            (data as any)?.message || 'Failed to generate supporting fields.',
        });
        return;
      }
      if (data.retrievedDetails && !retrievedDetails) {
        setRetrievedDetails(data.retrievedDetails);
      }
      setSupportingProposal(data);
      const initialSelection: Record<string, boolean> = {};
      for (const diff of data.fieldDiffs) {
        // Default to checked if field was empty, or checked for supporting metadata
        initialSelection[diff.field] = true;
      }
      setSelectedFieldsToApply(initialSelection);
      setStatusMessage({
        type: 'info',
        text: `${data.message} Review the proposed supporting fields below and click "Apply Selected Supporting Fields".`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error generating supporting fields.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  // =========================================================================
  // ACTION 3: Generate Editorial Copy (Focused Editorial Writing Call)
  // =========================================================================
  const handleGenerateEditorialCopy = async () => {
    setBusyAction('editorial');
    setStatusMessage(null);
    setSupportingProposal(null);
    setCompleteProposal(null);
    setPolishProposal(null);

    try {
      const headers = await getStudioSessionHeaders();
      const res = await fetch('/api/studio/sanity/ai-generate-editorial', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productUrl: productUrl.trim(),
          fetchUrlFirst: Boolean(productUrl.trim() && !retrievedDetails),
          retrievedDetails,
          currentDocument: activeDoc,
          writingProfileId: selectedProfileId,
          customInstructions: customNotes,
        }),
      });
      const data: EditorialCopyGenerationResult = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage({
          type: 'error',
          text: (data as any)?.message || 'Failed to generate editorial copy.',
        });
        return;
      }
      setEditorialProposal(data);
      const initialSelection: Record<string, boolean> = {};
      for (const diff of data.fieldDiffs) {
        // Protect existing editorial content by requiring explicit review, but pre-select empty fields
        initialSelection[diff.field] = !diff.hasExistingContent;
      }
      // If all fields were empty, all are checked; if none were empty, check all so user can review & apply with one click after inspecting warning
      if (Object.values(initialSelection).every((v) => !v)) {
        for (const diff of data.fieldDiffs) {
          initialSelection[diff.field] = true;
        }
      }
      setSelectedFieldsToApply(initialSelection);
      setStatusMessage({
        type: 'info',
        text: `${data.message} Review proposed sections below before applying.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error generating editorial copy.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  // =========================================================================
  // ACTION 4: Generate Complete Product (Coordinated End-to-End Workflow)
  // =========================================================================
  const handleGenerateCompleteProduct = async () => {
    setBusyAction('complete');
    setStatusMessage(null);
    setSupportingProposal(null);
    setEditorialProposal(null);
    setPolishProposal(null);

    try {
      const headers = await getStudioSessionHeaders();
      const res = await fetch('/api/studio/sanity/ai-generate-complete', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productUrl: productUrl.trim(),
          fetchUrlFirst: Boolean(productUrl.trim() && !retrievedDetails),
          retrievedDetails,
          currentDocument: activeDoc,
          writingProfileId: selectedProfileId,
          customInstructions: customNotes,
        }),
      });
      const data: CompleteProductGenerationResult = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage({
          type: 'error',
          text:
            (data as any)?.message ||
            'Failed to generate complete product proposal.',
        });
        return;
      }
      if (data.retrievedDetails && !retrievedDetails) {
        setRetrievedDetails(data.retrievedDetails);
      }
      setCompleteProposal(data);
      const initialSelection: Record<string, boolean> = {};
      for (const diff of [...data.supportingDiffs, ...data.editorialDiffs]) {
        initialSelection[diff.field] =
          diff.category === 'supporting' ? true : !diff.hasExistingContent;
      }
      if (
        data.editorialDiffs.every((d) => !initialSelection[d.field]) &&
        !data.hasExistingEditorialContent
      ) {
        for (const diff of data.editorialDiffs) {
          initialSelection[diff.field] = true;
        }
      }
      setSelectedFieldsToApply(initialSelection);
      setStatusMessage({
        type: 'info',
        text: `${data.message} Inspect the proposed supporting and editorial fields below before applying.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error generating complete product.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  // =========================================================================
  // ACTION 5: Review and Improve with AI (Editorial Polishing & Regeneration)
  // =========================================================================
  const handlePolishEditorialCopy = async () => {
    setBusyAction('polish');
    setStatusMessage(null);
    setSupportingProposal(null);
    setEditorialProposal(null);
    setCompleteProposal(null);

    try {
      const headers = await getStudioSessionHeaders();
      const res = await fetch('/api/studio/sanity/ai-polish-editorial', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: polishAction,
          targetSection: polishTarget,
          productUrl: productUrl.trim(),
          retrievedDetails,
          currentDocument: activeDoc,
          writingProfileId: selectedProfileId,
          customInstructions: polishCustomInstructions || customNotes,
        }),
      });
      const data: PolishEditorialCopyResult = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage({
          type: 'error',
          text: (data as any)?.message || 'Failed to polish editorial copy.',
        });
        return;
      }
      setPolishProposal(data);
      const initialSelection: Record<string, boolean> = {};
      for (const diff of data.fieldDiffs) {
        initialSelection[diff.field] = true;
      }
      setSelectedFieldsToApply(initialSelection);
      setStatusMessage({
        type: 'info',
        text: `${data.message} Compare original vs. proposed replacement below.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error running AI editorial polish.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  // =========================================================================
  // Save AI Writing Profile Edits to Sanity
  // =========================================================================
  const handleSaveWritingProfile = async () => {
    if (!profileDraft) return;
    setSavingProfile(true);
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
        setStatusMessage({
          type: 'success',
          text: `Saved AI Writing Profile "${data.savedProfile.name}" to Sanity Content Lake. All subsequent AI generation & brief exports will use the updated instructions.`,
        });
        setShowProfileEditor(false);
      } else {
        setStatusMessage({
          type: 'error',
          text: data.message || 'Failed to save AI Writing Profile.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error saving AI Writing Profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // =========================================================================
  // Optional Tool: Export AI Writing Brief & Import Structured AI Response
  // =========================================================================
  const handleExportAiBrief = () => {
    const brief = generateProductAiWritingBrief({
      productUrl:
        productUrl.trim() ||
        activeDoc?.purchaseUrl ||
        'https://shop.scienceofgifts.com/products/new-item',
      mode: activeDoc?.whyToGiveIt ? 'revision' : 'create',
      knownTitle: retrievedDetails?.title || activeDoc?.title || undefined,
      knownVendor: retrievedDetails?.vendor || activeDoc?.vendor || undefined,
      knownPrice:
        typeof retrievedDetails?.price === 'number'
          ? retrievedDetails.price
          : activeDoc?.price,
      knownInStock:
        typeof retrievedDetails?.inStock === 'boolean'
          ? retrievedDetails.inStock
          : activeDoc?.inStock,
      knownDescription: retrievedDetails?.description || undefined,
      knownMaterials: retrievedDetails?.materials,
      knownDimensions: retrievedDetails?.dimensions || undefined,
      knownSpecifications: retrievedDetails?.specifications,
      knownSizes: retrievedDetails?.sizes,
      knownColors: retrievedDetails?.colors,
      knownImageUrls: retrievedDetails?.images?.map((i) => i.url),
      retrievedFromUrl: Boolean(retrievedDetails),
      existingProduct: activeDoc,
      writingProfile: activeProfile,
      additionalSourceNotes: customNotes,
    });
    setExportedBriefMarkdown(brief.markdownBrief);
    setStatusMessage({
      type: 'success',
      text: `Exported AI Writing Brief (${brief.mode} mode) using profile "${brief.writingProfileUsed.name}".`,
    });
  };

  const handleImportStructuredResponse = async () => {
    if (!importJsonText.trim()) {
      setStatusMessage({
        type: 'warning',
        text: 'Paste a structured JSON response first.',
      });
      return;
    }
    const validation = importProductInterchangeResponse({
      rawInput: importJsonText,
      workspaceDocuments: [activeDoc],
    });
    if (!validation.ok || !validation.candidateSanityDraft) {
      const firstErr =
        validation.errors[0]?.message || 'Structured import validation failed.';
      setStatusMessage({
        type: 'error',
        text: `Import rejected by schema validator: ${firstErr}`,
      });
      return;
    }

    const fieldsToPatch: Record<string, any> = {
      ...validation.candidateSanityDraft,
    };
    delete fieldsToPatch._id;
    delete fieldsToPatch._type;
    delete fieldsToPatch._rev;
    delete fieldsToPatch._createdAt;
    delete fieldsToPatch._updatedAt;

    await applyFieldsToDocument(
      fieldsToPatch,
      `Imported structured AI response (${validation.mode} mode)`
    );
    setImportJsonText('');
  };

  // Render diff checklist table for any active proposal
  const renderDiffReviewPanel = (
    title: string,
    subtitle: string,
    centralObservation: string | undefined,
    diffs: ProposedFieldDiff[],
    proposedValuesMap: Record<string, any>,
    validationIssues: Array<{
      path: string;
      message: string;
      level: 'error' | 'warning';
    }>,
    onDismiss: () => void,
    applyButtonLabel: string
  ) => {
    const selectedCount = diffs.filter(
      (d) => selectedFieldsToApply[d.field]
    ).length;

    const handleConfirmApply = async () => {
      const subset: Record<string, any> = {};
      for (const diff of diffs) {
        if (selectedFieldsToApply[diff.field]) {
          subset[diff.field] = proposedValuesMap[diff.field];
          // Also include companion commerce/slug fields when applying supporting fields
          if (diff.field === 'productType' && proposedValuesMap.commerceProvider) {
            subset.commerceProvider = proposedValuesMap.commerceProvider;
            subset.fulfillmentClassification =
              proposedValuesMap.fulfillmentClassification;
            if (proposedValuesMap.purchaseUrl)
              subset.purchaseUrl = proposedValuesMap.purchaseUrl;
            if (proposedValuesMap.fourthwallUrl)
              subset.fourthwallUrl = proposedValuesMap.fourthwallUrl;
            if (proposedValuesMap.affiliateUrl)
              subset.affiliateUrl = proposedValuesMap.affiliateUrl;
            if (proposedValuesMap.images && (!activeDoc?.images || activeDoc.images.length === 0)) {
              subset.images = proposedValuesMap.images;
            }
          }
        }
      }
      await applyFieldsToDocument(subset, title);
      onDismiss();
    };

    return (
      <div
        data-testid="ai-proposal-review-panel"
        className="mt-4 rounded-lg border border-[#CBD5E1] bg-white shadow-sm overflow-hidden"
      >
        <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#9A3412]" />
              <h4 className="text-sm font-semibold text-[#0F172A]">{title}</h4>
              <span className="text-xs px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-medium">
                Review Before Applying ({selectedCount}/{diffs.length} selected)
              </span>
            </div>
            <p className="text-xs text-[#475569] mt-0.5">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const allSelected: Record<string, boolean> = {};
                diffs.forEach((d) => {
                  allSelected[d.field] = true;
                });
                setSelectedFieldsToApply((prev) => ({
                  ...prev,
                  ...allSelected,
                }));
              }}
              className="px-2.5 py-1 text-xs font-medium text-[#334155] bg-white border border-[#CBD5E1] rounded hover:bg-[#F1F5F9]"
            >
              Select All
            </button>
            <button
              type="button"
              data-testid="ai-apply-selected-fields-btn"
              onClick={handleConfirmApply}
              disabled={selectedCount === 0}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-50 rounded flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              {applyButtonLabel} ({selectedCount})
            </button>
            <button
              type="button"
              data-testid="ai-reject-proposal-btn"
              onClick={onDismiss}
              className="px-2.5 py-1.5 text-xs font-medium text-[#64748B] hover:text-[#0F172A] border border-[#CBD5E1] rounded bg-white flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reject / Dismiss
            </button>
          </div>
        </div>

        {centralObservation && (
          <div className="px-4 py-2.5 bg-[#FFFBEB] border-b border-[#FDE68A] text-xs text-[#78350F]">
            <span className="font-semibold uppercase tracking-wider text-[11px] mr-2">
              Central Editorial Observation:
            </span>
            <span className="italic">&ldquo;{centralObservation}&rdquo;</span>
          </div>
        )}

        {validationIssues.length > 0 && (
          <div className="px-4 py-2 bg-[#FEF2F2] border-b border-[#FECACA] text-xs text-[#991B1B] space-y-1">
            {validationIssues.slice(0, 4).map((iss, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <strong>{iss.path}:</strong> {iss.message}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="divide-y divide-[#E2E8F0] max-h-[460px] overflow-y-auto">
          {diffs.map((diff) => {
            const checked = Boolean(selectedFieldsToApply[diff.field]);
            return (
              <label
                key={diff.field}
                className={`block px-4 py-3 cursor-pointer transition-colors ${
                  checked ? 'bg-white' : 'bg-[#F8FAFC] opacity-70'
                } hover:bg-[#F8FAFC]`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setSelectedFieldsToApply((prev) => ({
                        ...prev,
                        [diff.field]: e.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-[#CBD5E1] text-[#0F766E]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-[#0F172A]">
                        {diff.label}
                      </span>
                      <code className="text-[11px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                        {diff.field}
                      </code>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          diff.category === 'editorial'
                            ? 'bg-[#FEF3C7] text-[#92400E]'
                            : 'bg-[#E0F2FE] text-[#0369A1]'
                        }`}
                      >
                        {diff.category === 'editorial'
                          ? 'Editorial Copy'
                          : 'Supporting Field'}
                      </span>
                      {diff.hasExistingContent && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#FCE7F3] text-[#9D174D]">
                          Replaces Existing Value
                        </span>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                          Current Value in Document
                        </div>
                        <pre className="text-xs text-[#475569] whitespace-pre-wrap font-sans leading-relaxed max-h-36 overflow-y-auto">
                          {formatPreviewValue(diff.previousValue)}
                        </pre>
                      </div>
                      <div className="rounded border border-[#99F6E4] bg-[#F0FDFA] p-2.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#0F766E] mb-1">
                          Proposed AI Value
                        </div>
                        <pre className="text-xs text-[#0F172A] whitespace-pre-wrap font-sans leading-relaxed max-h-36 overflow-y-auto">
                          {formatPreviewValue(diff.proposedValue)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* AI PRODUCT AUTHORING WORKSPACE PANEL (Scoped via .sog-ai-suite) */}
      <section
        data-testid="official-sanity-ai-authoring-panel"
        className="sog-ai-suite rounded-xl border border-[#CBD5E1] bg-[#FAF8F5] text-[#0F172A] shadow-xs overflow-hidden"
      >
        {/* Header Bar */}
        <div className="px-4 py-3 bg-[#0F172A] text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-white">
                  Science of Gifts — AI Product Authoring & Research Suite
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#1E293B] text-[#38BDF8] font-mono">
                  Official Sanity Studio
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Fetch merchant facts, bulk-generate supporting metadata, author coherent editorial copy, or polish existing sections.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Writing Profile Selector */}
            <div className="flex items-center gap-1.5 bg-[#1E293B] px-2.5 py-1 rounded border border-[#334155]">
              <Sliders className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
              <span className="text-[11px] text-[#CBD5E1] font-medium">
                Writing Profile:
              </span>
              <select
                data-testid="ai-writing-profile-select"
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="sog-ai-header-select bg-transparent text-xs font-semibold text-white cursor-pointer"
              >
                {profiles.map((p) => (
                  <option
                    key={p.profileId}
                    value={p.profileId}
                    className="text-[#0F172A] bg-white"
                  >
                    {p.name} {p.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                data-testid="ai-toggle-profile-editor-btn"
                onClick={() => setShowProfileEditor((v) => !v)}
                className="ml-1 text-[11px] px-1.5 py-0.5 rounded bg-[#334155] hover:bg-[#475569] text-[#F8FAFC]"
                title="View or edit the selected AI Writing Profile stored in Sanity"
              >
                {showProfileEditor ? 'Hide Profile' : 'Edit Profile'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsCollapsed((v) => !v)}
              className="p-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1]"
              title={isCollapsed ? 'Expand AI Authoring Panel' : 'Collapse Panel'}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {isProtectedRealHoodie && (
          <div className="px-4 py-2.5 bg-[#FEF3C7] border-b border-[#FDE68A] text-xs text-[#92400E] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#D97706]" />
              <span>
                <strong>Protected Production Document:</strong>{' '}
                <code>prod_emotional_support_psychology_major_hoodie</code> is locked against mutations during evaluation. To test editing or AI polishing on the Hoodie, open the dedicated Evaluation Copy (<code>prod_eval_copy_emotional_support_psychology_major_hoodie</code>).
              </span>
            </div>
          </div>
        )}

        {!isCollapsed && (
          <div className="p-4 space-y-4">
            {/* Inline AI Writing Profile Editor Drawer */}
            {showProfileEditor && profileDraft && (
              <div
                data-testid="ai-writing-profile-editor-drawer"
                className="rounded-lg border border-[#CBD5E1] bg-white p-4 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                      Sanity AI Writing Profile Editor — {profileDraft.name}
                    </h4>
                    <p className="text-[11px] text-[#64748B]">
                      Document ID: <code>{profileDraft._id}</code> · Changes saved here persist directly in Sanity Content Lake and immediately guide all AI generation & brief exports.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="ai-save-writing-profile-btn"
                      onClick={handleSaveWritingProfile}
                      disabled={savingProfile}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#115E59] rounded flex items-center gap-1.5"
                    >
                      {savingProfile ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Save Profile to Sanity
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProfileEditor(false)}
                      className="p-1 text-[#64748B] hover:text-[#0F172A]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                      Profile Name
                    </label>
                    <input
                      type="text"
                      value={profileDraft.name}
                      onChange={(e) =>
                        setProfileDraft({ ...profileDraft, name: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                      Additional Custom Campaign / Editorial Instructions
                    </label>
                    <input
                      type="text"
                      data-testid="ai-profile-custom-instructions-input"
                      value={profileDraft.additionalCustomInstructions || ''}
                      onChange={(e) =>
                        setProfileDraft({
                          ...profileDraft,
                          additionalCustomInstructions: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                    Editorial Voice and Style Instructions
                  </label>
                  <textarea
                    rows={3}
                    data-testid="ai-profile-voice-textarea"
                    value={profileDraft.editorialVoiceAndStyle}
                    onChange={(e) =>
                      setProfileDraft({
                        ...profileDraft,
                        editorialVoiceAndStyle: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                      Why to Give It Section Guidance
                    </label>
                    <textarea
                      rows={2}
                      value={profileDraft.sectionInstructions?.whyToGiveIt || ''}
                      onChange={(e) =>
                        setProfileDraft({
                          ...profileDraft,
                          sectionInstructions: {
                            ...profileDraft.sectionInstructions,
                            whyToGiveIt: e.target.value,
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                      Four-Part Gift Verdict Guidance
                    </label>
                    <textarea
                      rows={2}
                      value={profileDraft.sectionInstructions?.giftVerdict || ''}
                      onChange={(e) =>
                        setProfileDraft({
                          ...profileDraft,
                          sectionInstructions: {
                            ...profileDraft.sectionInstructions,
                            giftVerdict: e.target.value,
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                      Phrases & Approaches to Avoid (One per line)
                    </label>
                    <textarea
                      rows={3}
                      value={(profileDraft.avoidPhrasesAndApproaches || []).join(
                        '\n'
                      )}
                      onChange={(e) =>
                        setProfileDraft({
                          ...profileDraft,
                          avoidPhrasesAndApproaches: e.target.value
                            .split('\n')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                      Writing Objectives (One per line)
                    </label>
                    <textarea
                      rows={3}
                      value={(profileDraft.writingObjectives || []).join('\n')}
                      onChange={(e) =>
                        setProfileDraft({
                          ...profileDraft,
                          writingObjectives: e.target.value
                            .split('\n')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Source URL Input + Fetch Product Details Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
              <div className="lg:col-span-7">
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Product Source URL (Merchant or Fourthwall Product Page)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Globe className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      data-testid="ai-authoring-url-input"
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      placeholder="https://shop.scienceofgifts.com/products/..."
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:border-[#0F766E]"
                    />
                  </div>
                  <button
                    type="button"
                    data-testid="ai-fetch-product-details-btn"
                    onClick={handleFetchProductDetails}
                    disabled={busyAction !== null}
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {busyAction === 'fetch' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-[#38BDF8]" />
                    )}
                    1. Fetch Product Details
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5">
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Optional Editor Context / Angle Notes
                </label>
                <input
                  type="text"
                  data-testid="ai-authoring-custom-notes-input"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Optional angle hint, recipient note, or pasted spec..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:border-[#0F766E]"
                />
              </div>
            </div>

            {/* 5 Primary Workflow Action Buttons */}
            <div className="pt-1 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                data-testid="ai-generate-supporting-btn"
                onClick={handleGenerateSupportingFields}
                disabled={busyAction !== null}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] disabled:opacity-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                {busyAction === 'supporting' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0369A1]" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5 text-[#0369A1]" />
                )}
                2. Generate Supporting Fields
              </button>

              <button
                type="button"
                data-testid="ai-generate-editorial-btn"
                onClick={handleGenerateEditorialCopy}
                disabled={busyAction !== null}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] disabled:opacity-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                {busyAction === 'editorial' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9A3412]" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-[#9A3412]" />
                )}
                3. Generate Editorial Copy
              </button>

              <button
                type="button"
                data-testid="ai-generate-complete-btn"
                onClick={handleGenerateCompleteProduct}
                disabled={busyAction !== null}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#9A3412] hover:bg-[#7C2D12] text-white disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {busyAction === 'complete' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                4. Generate Complete Product
              </button>

              <button
                type="button"
                data-testid="ai-toggle-polish-panel-btn"
                onClick={() => setShowPolishPanel((v) => !v)}
                disabled={busyAction !== null}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg border flex items-center gap-1.5 cursor-pointer ${
                  showPolishPanel
                    ? 'bg-[#0F766E] text-white border-[#0F766E]'
                    : 'bg-white hover:bg-[#F1F5F9] text-[#0F172A] border-[#CBD5E1]'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                5. Review and Improve with AI
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  data-testid="ai-toggle-optional-brief-tools-btn"
                  onClick={() => setShowOptionalBriefTools((v) => !v)}
                  className="px-2.5 py-1.5 text-[11px] font-medium text-[#475569] hover:text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  {showOptionalBriefTools
                    ? 'Hide Brief Export / Import'
                    : 'Optional: Export Brief / Import JSON'}
                </button>
              </div>
            </div>

            {/* Status Notification Bar */}
            {statusMessage && (
              <div
                data-testid="ai-authoring-status-banner"
                className={`px-3.5 py-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-[#F0FDFA] border-[#99F6E4] text-[#0F766E]'
                    : statusMessage.type === 'error'
                    ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                    : statusMessage.type === 'warning'
                    ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                    : 'bg-[#F0F9FF] border-[#BAE6FD] text-[#0369A1]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{statusMessage.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusMessage(null)}
                  className="text-current opacity-70 hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Retrieved Product Details Summary Card */}
            {retrievedDetails && (
              <div
                data-testid="retrieved-product-details-card"
                className="rounded-lg border border-[#CBD5E1] bg-white p-3.5 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E]">
                      Retrieved Product Context (Shared with AI Actions)
                    </span>
                    <h4 className="text-xs font-semibold text-[#0F172A]">
                      {retrievedDetails.title || 'Untitled Product'} ·{' '}
                      <span className="text-[#475569] font-normal">
                        {retrievedDetails.vendor ||
                          retrievedDetails.merchantDomain}
                      </span>
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="apply-retrieved-facts-btn"
                      onClick={handleApplyRetrievedFactsToDraft}
                      className="px-3 py-1 text-xs font-semibold rounded bg-[#0F766E] hover:bg-[#115E59] text-white flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Apply Retrieved Facts to Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setRetrievedDetails(null)}
                      className="text-xs text-[#64748B] hover:text-[#0F172A]"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="text-[10px] text-[#64748B] uppercase">
                      Retrieved Price
                    </div>
                    <div className="font-semibold text-[#0F172A]">
                      {typeof retrievedDetails.price === 'number'
                        ? `$${retrievedDetails.price} ${retrievedDetails.currency || 'USD'} (Unverified)`
                        : 'Unknown / Unlisted'}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="text-[10px] text-[#64748B] uppercase">
                      Availability
                    </div>
                    <div className="font-semibold text-[#0F172A]">
                      {retrievedDetails.availabilityLabel || 'Unknown'} (Unverified)
                    </div>
                  </div>
                  <div className="p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="text-[10px] text-[#64748B] uppercase">
                      Images & Specs
                    </div>
                    <div className="font-semibold text-[#0F172A]">
                      {retrievedDetails.images?.length || 0} images ·{' '}
                      {retrievedDetails.specifications?.length || 0} specs
                    </div>
                  </div>
                  <div className="p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="text-[10px] text-[#64748B] uppercase">
                      Variants / Sizes
                    </div>
                    <div className="font-semibold text-[#0F172A]">
                      {retrievedDetails.sizes?.length
                        ? `Sizes: ${retrievedDetails.sizes.slice(0, 5).join(', ')}`
                        : `${retrievedDetails.variants?.length || 0} variants`}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action 5: Review and Improve with AI Controls */}
            {showPolishPanel && (
              <div
                data-testid="ai-polish-controls-panel"
                className="rounded-lg border border-[#CBD5E1] bg-white p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                      Review and Improve Editorial Copy with AI
                    </h4>
                    <p className="text-[11px] text-[#475569]">
                      Select a focused improvement goal and target section. Proposed revisions are shown side-by-side so you can accept or reject without losing existing copy.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPolishPanel(false)}
                    className="text-[#64748B] hover:text-[#0F172A]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'rewrite', label: 'Rewrite editorial copy' },
                      {
                        id: 'new_angle',
                        label: 'Try a different central angle',
                      },
                      {
                        id: 'more_distinctive',
                        label: 'Make the writing more distinctive',
                      },
                      { id: 'reduce_repetition', label: 'Reduce repetition' },
                      { id: 'shorten', label: 'Shorten' },
                      { id: 'custom', label: 'Apply custom instructions' },
                    ] as Array<{ id: EditorialPolishActionType; label: string }>
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`ai-polish-action-${opt.id}`}
                      onClick={() => setPolishAction(opt.id)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded border cursor-pointer ${
                        polishAction === opt.id
                          ? 'bg-[#0F766E] text-white border-[#0F766E]'
                          : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-4">
                    <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                      Target Section to Polish / Regenerate
                    </label>
                    <select
                      data-testid="ai-polish-target-select"
                      value={polishTarget}
                      onChange={(e) =>
                        setPolishTarget(
                          e.target.value as EditorialPolishTargetSection
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white"
                    >
                      <option value="all_editorial">
                        All Editorial Sections (Coherent Full Pass)
                      </option>
                      <option value="whyToGiveIt">
                        Why to Give It (Editorial Hook)
                      </option>
                      <option value="giftVerdict">
                        Four-Part Gift Verdict
                      </option>
                      <option value="idealRecipientProfile">
                        Ideal Recipient Profile
                      </option>
                      <option value="extendedGiftRationale">
                        Extended Gift Rationale Paragraphs
                      </option>
                      <option value="buyingConsiderationsList">
                        Practical Buying Considerations
                      </option>
                      <option value="occasionContextNotes">
                        Occasion Fit & Context Notes
                      </option>
                    </select>
                  </div>

                  <div className="md:col-span-5">
                    <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                      Custom Revision Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      data-testid="ai-polish-custom-input"
                      value={polishCustomInstructions}
                      onChange={(e) =>
                        setPolishCustomInstructions(e.target.value)
                      }
                      placeholder="e.g., Focus more on late-night thesis writing humor..."
                      className="w-full px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <button
                      type="button"
                      data-testid="ai-run-polish-btn"
                      onClick={handlePolishEditorialCopy}
                      disabled={busyAction !== null}
                      className="w-full px-3.5 py-1.5 text-xs font-semibold rounded bg-[#0F766E] hover:bg-[#115E59] text-white disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {busyAction === 'polish' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      Generate Polished Revision
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Optional Brief Export & Structured Import Drawer */}
            {showOptionalBriefTools && (
              <div
                data-testid="ai-optional-brief-tools-drawer"
                className="rounded-lg border border-[#CBD5E1] bg-white p-4 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2.5">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                      Optional External AI Workflow — Export Brief & Import Structured Response
                    </h4>
                    <p className="text-[11px] text-[#64748B]">
                      Uses active AI Writing Profile (<strong>{activeProfile?.name || 'Science of Gifts Product Editorial'}</strong>) and authoritative JSON Schema validation.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="ai-export-brief-btn"
                      onClick={handleExportAiBrief}
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-[#0F172A] text-white hover:bg-[#1E293B] flex items-center gap-1.5"
                    >
                      <FileCode2 className="w-3.5 h-3.5" />
                      Export AI Writing Brief
                    </button>
                    {exportedBriefMarkdown && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(
                              exportedBriefMarkdown
                            );
                            setBriefCopied(true);
                            setTimeout(() => setBriefCopied(false), 2000);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium rounded border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {briefCopied ? 'Copied!' : 'Copy Brief'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const blob = new Blob([exportedBriefMarkdown], {
                              type: 'text/markdown;charset=utf-8',
                            });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `science-of-gifts-ai-brief.md`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium rounded border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download .md
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {exportedBriefMarkdown && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                      Generated AI Writing Brief Preview
                    </label>
                    <textarea
                      readOnly
                      rows={5}
                      data-testid="ai-exported-brief-textarea"
                      value={exportedBriefMarkdown}
                      className="w-full p-2.5 text-xs font-mono bg-[#F8FAFC] border border-[#CBD5E1] rounded"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-[#334155]">
                    Import Structured AI Response (Paste Create or Revision JSON)
                  </label>
                  <textarea
                    rows={4}
                    data-testid="ai-import-json-textarea"
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    placeholder='Paste JSON matching "science-of-gifts/product-interchange" (create or revision mode)...'
                    className="w-full p-2.5 text-xs font-mono bg-white border border-[#CBD5E1] rounded"
                  />
                  <button
                    type="button"
                    data-testid="ai-import-json-submit-btn"
                    onClick={handleImportStructuredResponse}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded bg-[#0F766E] hover:bg-[#115E59] text-white flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Validate & Apply Structured AI Response
                  </button>
                </div>
              </div>
            )}

            {/* Active Proposal Review Diff Panels */}
            {supportingProposal &&
              renderDiffReviewPanel(
                'Proposed Supporting Fields (Bulk Generation)',
                `Generated using profile "${supportingProposal.writingProfileUsed.name}" (${supportingProposal.modelUsed}). Uncheck any field you do not wish to update.`,
                undefined,
                supportingProposal.fieldDiffs,
                supportingProposal.proposedSupportingFields,
                supportingProposal.validationIssues,
                () => setSupportingProposal(null),
                'Apply Selected Supporting Fields'
              )}

            {editorialProposal &&
              renderDiffReviewPanel(
                'Proposed Editorial Copy (Coherent Central Angle)',
                `Generated using profile "${editorialProposal.writingProfileUsed.name}" (${editorialProposal.modelUsed}). Review each section before applying.`,
                editorialProposal.centralObservation,
                editorialProposal.fieldDiffs,
                editorialProposal.proposedEditorialFields as Record<string, any>,
                editorialProposal.validationIssues,
                () => setEditorialProposal(null),
                'Apply Selected Editorial Copy'
              )}

            {completeProposal &&
              renderDiffReviewPanel(
                'Complete Product Proposal (Supporting Metadata + Coherent Editorial Copy)',
                `Coordinated generation using profile "${completeProposal.writingProfileUsed.name}". ${
                  completeProposal.hasExistingEditorialContent
                    ? 'Notice: Existing editorial fields are unchecked by default so approved copy is never overwritten without your consent.'
                    : 'All supporting and editorial fields are ready to apply.'
                }`,
                completeProposal.centralObservation,
                [
                  ...completeProposal.supportingDiffs,
                  ...completeProposal.editorialDiffs,
                ],
                completeProposal.combinedProposedFields,
                completeProposal.validationIssues,
                () => setCompleteProposal(null),
                'Apply Selected Product Fields'
              )}

            {polishProposal &&
              renderDiffReviewPanel(
                `Polished Editorial Copy (${polishProposal.action.replace(/_/g, ' ')})`,
                `${polishProposal.rationaleSummary} — Compare original vs. proposed replacement below. Click "Reject / Dismiss" to keep your existing copy untouched.`,
                polishProposal.centralObservation,
                polishProposal.fieldDiffs,
                polishProposal.proposedFields,
                polishProposal.validationIssues,
                () => setPolishProposal(null),
                'Apply Polished Replacement'
              )}
          </div>
        )}
      </section>

      {/* Render Official Sanity Studio's Native Tabbed Document Form Below */}
      {typeof props.renderDefault === 'function' ? props.renderDefault(props) : null}
    </div>
  );
};
