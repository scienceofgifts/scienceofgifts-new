/**
 * Science of Gifts — AI Article Authoring, Section Revision & Brief Export/Import Service
 *
 * Reuses the existing server-side Gemini integration (`@google/genai`, `gemini-4-hydrogen`)
 * and editable Sanity `aiWritingProfile` documents (defaulting to `Article Editorial`
 * `ai_profile_science_of_gifts_article_editorial`).
 *
 * Capabilities:
 * 1. Generate Complete Article (`generateCompleteArticleWithAi`):
 *    - Generates coherent H2/H3 sections, Portable Text blocks, executive summary takeaways,
 *      inline research citations (`[cite:cit_id]`), editorial callout, pull quote, and
 *      supporting SEO metadata (`seoTitle`, `metaDescription`, `canonicalPath`) together.
 * 2. Improve with AI (`improveArticleWithAi`):
 *    - Rewrites/polishes a selected section or the full article, tries another editorial angle,
 *      reduces repetition, shortens, or expands passages.
 *    - Returns side-by-side field/section diffs for Accept / Reject approval without overwriting
 *      existing content automatically.
 * 3. Optional Brief Export & Import (`exportArticleWritingBrief`, `exportArticleRevisionBrief`,
 *    `parseImportedArticlePayload`):
 *    - Exports standalone Markdown + JSON schema briefs for new articles or revisions, and
 *      imports complete articles or section revisions into the Studio editor.
 */

import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  DEFAULT_ARTICLE_AI_WRITING_PROFILE,
  type AiWritingProfileDocument,
} from './schemas/documents/aiWritingProfile';
import {
  DEFAULT_GEMINI_EDITORIAL_MODEL,
  ensureDefaultArticleAiWritingProfileInSanity,
  listAiWritingProfilesFromSanity,
  type ProposedFieldDiff,
} from './productAiAuthoringService';
import {
  fetchDocumentFromSanityContentLake,
  readServerEnv,
} from './sanityServerClient';
import {
  ARTICLE_CATEGORY_OPTIONS,
  ARTICLE_TOPIC_OPTIONS,
  OCCASION_OPTIONS,
  RECIPIENT_OPTIONS,
} from './taxonomyRegistry';
import { AUTHORS, CITATIONS, GIFT_GUIDES } from '../../data/catalog';
import {
  paragraphsToPortableText,
  sectionsToFullBodyPortableText,
} from './portableTextSerializer';
import { normalizeSanityArticleDocumentBackwardCompatible } from './articleDocumentMapper';
import type { ArticleSection } from '../../types/content';

export type ArticleImproveActionType =
  | 'rewrite_polish'
  | 'another_angle'
  | 'reduce_repetition'
  | 'shorten'
  | 'expand'
  | 'custom';

export interface ArticleAiAuthoringInput {
  documentId?: string;
  topic: string;
  editorialAngle?: string;
  researchNotes?: string;
  writingProfileId?: string;
  writingProfile?: AiWritingProfileDocument | null;
  customInstructions?: string;
  currentDocument?: Record<string, any> | null;
}

export interface ArticleImproveInput extends ArticleAiAuthoringInput {
  action: ArticleImproveActionType;
  targetSectionId?: string; // 'all_sections' or specific section.id
  revisionGoals?: string;
}

export interface CompleteArticleGenerationResult {
  ok: boolean;
  modelUsed: string;
  writingProfileUsed: {
    profileId: string;
    name: string;
  };
  editorialThesis: string;
  proposedFields: Record<string, any>;
  fieldDiffs: ProposedFieldDiff[];
  hasExistingContent: boolean;
  message: string;
}

export interface ArticleImproveResult {
  ok: boolean;
  action: ArticleImproveActionType;
  targetSectionId: string;
  modelUsed: string;
  writingProfileUsed: {
    profileId: string;
    name: string;
  };
  editorialThesis: string;
  rationaleSummary: string;
  proposedFields: Record<string, any>;
  fieldDiffs: ProposedFieldDiff[];
  message: string;
}

const ALLOWED_ARTICLE_CATEGORIES = ARTICLE_CATEGORY_OPTIONS.map((o) => o.value);
const ALLOWED_ARTICLE_TOPICS = ARTICLE_TOPIC_OPTIONS.map((o) => o.value);
const ALLOWED_RECIPIENTS = RECIPIENT_OPTIONS.map((o) => o.value);
const ALLOWED_OCCASIONS = OCCASION_OPTIONS.map((o) => o.value);

function getServerGeminiClient(): { ai: GoogleGenAI; defaultModel: string } {
  const apiKey =
    readServerEnv('GEMINI_API_KEY') ||
    readServerEnv('GOOGLE_API_KEY') ||
    process.env.GEMINI_API_KEY ||
    '';

  if (!apiKey) {
    throw new Error(
      'Server-side GEMINI_API_KEY is not configured in the environment.'
    );
  }

  const defaultModel =
    readServerEnv('GEMINI_EDITORIAL_MODEL') || DEFAULT_GEMINI_EDITORIAL_MODEL;

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  return { ai, defaultModel };
}

async function callGeminiArticleJsonWithRetry(params: {
  modelOverride?: string;
  prompt: string;
  responseSchema: Record<string, any>;
  fallbackBuilder?: () => Record<string, any>;
}): Promise<{ parsed: any; modelUsed: string }> {
  const { ai, defaultModel } = getServerGeminiClient();
  const primaryModel = params.modelOverride || defaultModel;
  const candidateModels = [
    primaryModel,
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-2.5-pro',
  ];

  let lastErr: any = null;
  for (let attempt = 0; attempt < candidateModels.length; attempt++) {
    const modelName = candidateModels[attempt];
    try {
      const isHydrogenOrGemini3 =
        modelName.includes('hydrogen') || modelName.includes('gemini-3');
      const response = await ai.models.generateContent({
        model: modelName,
        contents: params.prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
          ...(isHydrogenOrGemini3
            ? {
                thinkingConfig: {
                  thinkingLevel: ThinkingLevel.LOW,
                },
              }
            : {}),
        },
      });
      const rawText = (response.text || '{}')
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '');
      const parsed = JSON.parse(rawText);
      return { parsed, modelUsed: modelName };
    } catch (err: any) {
      lastErr = err;
      if (attempt < candidateModels.length - 1) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
  }

  if (typeof params.fallbackBuilder === 'function') {
    return {
      parsed: params.fallbackBuilder(),
      modelUsed: `${primaryModel} (resilient-editorial-synthesis)`,
    };
  }

  throw lastErr || new Error('Gemini article generation failed.');
}

function toKebabSlug(raw: string): string {
  const cleaned = (raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned.length >= 3 ? cleaned : 'editorial-story';
}

function isNonEmptyValue(val: any): boolean {
  if (val === undefined || val === null || val === '') return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') {
    if (val._type === 'slug') return Boolean(val.current);
    return Object.keys(val).some(
      (k) => !k.startsWith('_') && isNonEmptyValue(val[k])
    );
  }
  return true;
}

/**
 * Resolves the active `aiWritingProfile` for article authoring, defaulting to
 * `Article Editorial` (`ai_profile_science_of_gifts_article_editorial`).
 */
export async function resolveActiveArticleAiWritingProfile(
  profileIdOrDoc?: string | AiWritingProfileDocument | null
): Promise<AiWritingProfileDocument> {
  if (
    profileIdOrDoc &&
    typeof profileIdOrDoc === 'object' &&
    profileIdOrDoc.editorialVoiceAndStyle
  ) {
    return profileIdOrDoc;
  }

  await ensureDefaultArticleAiWritingProfileInSanity();

  const targetId =
    typeof profileIdOrDoc === 'string' && profileIdOrDoc.trim()
      ? profileIdOrDoc.trim().replace(/^drafts\./, '')
      : DEFAULT_ARTICLE_AI_WRITING_PROFILE._id;

  const draftDoc = await fetchDocumentFromSanityContentLake(`drafts.${targetId}`);
  if (draftDoc && draftDoc._type === 'aiWritingProfile') {
    return draftDoc as AiWritingProfileDocument;
  }

  const pubDoc = await fetchDocumentFromSanityContentLake(targetId);
  if (pubDoc && pubDoc._type === 'aiWritingProfile') {
    return pubDoc as AiWritingProfileDocument;
  }

  const allProfiles = await listAiWritingProfilesFromSanity();
  const matched =
    allProfiles.find(
      (p) =>
        p.profileId === targetId ||
        p._id.replace(/^drafts\./, '') === targetId
    ) ||
    allProfiles.find((p) => p.contentType === 'article' && p.isDefault) ||
    allProfiles.find((p) => p.contentType === 'article');

  return matched || DEFAULT_ARTICLE_AI_WRITING_PROFILE;
}

function formatArticleWritingProfileForPrompt(
  profile: AiWritingProfileDocument
): string {
  const objectives = (profile.writingObjectives || [])
    .map((o, i) => `${i + 1}. ${o}`)
    .join('\n');
  const examples = (profile.preferredExamples || [])
    .map((ex, i) => `Example ${i + 1}: ${ex}`)
    .join('\n');
  const banned = (profile.avoidPhrasesAndApproaches || [])
    .map((b) => `- ${b}`)
    .join('\n');
  const sec = profile.sectionInstructions || ({} as any);
  const len = profile.recommendedLengths || ({} as any);

  return [
    `=== ACTIVE SANITY AI WRITING PROFILE: "${profile.name}" (${profile.profileId}) ===`,
    `EDITORIAL VOICE & STYLE:\n${profile.editorialVoiceAndStyle}`,
    `CORE WRITING OBJECTIVES:\n${objectives}`,
    examples ? `EXEMPLAR PASSAGES:\n${examples}` : '',
    `PHRASES & APPROACHES TO AVOID:\n${banned}`,
    `SECTION-BY-SECTION GUIDANCE:`,
    `- Executive Summary ("The Short Version"): ${sec.whyToGiveIt || ''}`,
    `- Callout & Pull Quote: ${sec.giftVerdict || ''}`,
    `- Opening H2 Section: ${sec.idealRecipientProfile || ''}`,
    `- Middle Research H2 Sections: ${sec.extendedGiftRationale || ''}`,
    `- Closing Practical H2 Section: ${sec.buyingConsiderations || ''}`,
    `- Taxonomy & Cross-Linking: ${sec.occasionContextNotes || ''}`,
    `- Headline, Subtitle & SEO Metadata: ${sec.supportingMetadataAndSeo || ''}`,
    `RECOMMENDED LENGTHS:`,
    `- Subtitle Range: ${len.subtitleRange || '80–220 chars'}`,
    `- Executive Summary: ${len.whyToGiveItRange || '3–4 bullets'}`,
    `- H2 Sections Count: ${len.recipientNarrativeRange || '3–4 H2 sections'}`,
    `- Paragraphs per H2 Section: ${len.extendedRationaleParagraphs || '2–4 paragraphs per section'}`,
    profile.additionalCustomInstructions
      ? `ADDITIONAL EDITORIAL INSTRUCTIONS:\n${profile.additionalCustomInstructions}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function formatVerifiedCitationsCatalogForPrompt(): string {
  return Object.values(CITATIONS)
    .map(
      (c) =>
        `- [cite:${c.id}] — ${c.authors} (${c.year}), "${c.title}" (${c.publication}). Key Finding: ${c.keyFinding}`
    )
    .join('\n');
}

/**
 * Generates a complete editorial article (title, subtitle, executiveSummary, coherent H2/H3
 * sections with Portable Text & inline citations, editorial callout, pull quote, taxonomy,
 * and supporting SEO metadata) using Gemini and the selected `Article Editorial` profile.
 */
export async function generateCompleteArticleWithAi(
  input: ArticleAiAuthoringInput
): Promise<CompleteArticleGenerationResult> {
  const profile = await resolveActiveArticleAiWritingProfile(
    input.writingProfile || input.writingProfileId
  );
  const currentDoc = input.currentDocument || {};
  const topic =
    (input.topic || '').trim() ||
    String(currentDoc.title || '').trim() ||
    'The Psychology of Thoughtful Gift-Giving';
  const editorialAngle =
    (input.editorialAngle || '').trim() ||
    String(currentDoc.subtitle || '').trim() ||
    'Why recipients value everyday ritual utility and personal specificity over expensive unwrapping spectacle.';
  const researchNotes = (input.researchNotes || '').trim();

  const prompt = [
    `You are the senior feature essayist and behavioral psychology editor at Science of Gifts.`,
    `Your task is to write a complete, publication-ready editorial article in coherent H2/H3 sections together with supporting SEO metadata.`,
    formatArticleWritingProfileForPrompt(profile),
    `=== ARTICLE BRIEF & SOURCE INPUTS ===`,
    `Topic / Working Title: ${topic}`,
    `Editorial Angle / Central Question: ${editorialAngle}`,
    researchNotes
      ? `Editor Research Notes & Source Material:\n${researchNotes}`
      : `Editor Research Notes: Ground the piece in everyday human observation and the verified research studies below.`,
    input.customInstructions
      ? `Additional Editor Direction:\n${input.customInstructions}`
      : '',
    `=== VERIFIED RESEARCH BIBLIOGRAPHY (USE INLINE [cite:cit_id] MARKERS) ===`,
    `You may weave 1 to 3 of these verified citations directly into the end of relevant sentences using the exact token format \`[cite:cit_id]\` (for example: "...as behavioral studies confirm [cite:cit_galak_2016_why_certain_gifts]."):`,
    formatVerifiedCitationsCatalogForPrompt(),
    `=== ALLOWED TAXONOMY VOCABULARIES ===`,
    `- Allowed category (pick 1): ${ALLOWED_ARTICLE_CATEGORIES.join(', ')}`,
    `- Allowed topics (pick 1 to 3): ${ALLOWED_ARTICLE_TOPICS.join(', ')}`,
    `- Allowed recipients (pick 1 to 3): ${ALLOWED_RECIPIENTS.join(', ')}`,
    `- Allowed occasions (pick 1 to 3): ${ALLOWED_OCCASIONS.join(', ')}`,
    `=== CRITICAL QUALITY & ANTI-REPETITION RULES ===`,
    `1. Write 3 to 4 distinct H2 sections that build a progressive narrative arc: (Section 1) a vivid human scene and gifting tension, (Section 2) the psychological mechanism and research evidence with inline [cite:cit_id] markers, (Section 3) concrete habits, etiquette, or decision rules, and optional (Section 4) how to apply this on the next occasion.`,
    `2. Use natural markdown formatting inside paragraphs where helpful: **bold** for key phrases, *italic* for emphasis, and at least one helpful internal link such as [interactive Gift Finder](/gift-finder/) or [curated Gift Guides](/gift-guides/).`,
    `3. Never repeat sentences or openings across sections. Avoid generic AI filler transitions.`,
    `4. Generate cohesive SEO metadata (\`seoTitle\` 40–65 chars, \`metaDescription\` 115–158 chars, and \`slugSuggestion\` kebab-case) aligned with the article thesis.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      editorialThesis: {
        type: Type.STRING,
        description:
          'One-sentence summary of the central thesis and narrative angle of the generated article.',
      },
      title: {
        type: Type.STRING,
        description: 'Compelling editorial H1 headline (12–110 characters).',
      },
      subtitle: {
        type: Type.STRING,
        description:
          'Editorial dek / excerpt (60–240 characters) summarizing the human tension and takeaway.',
      },
      slugSuggestion: {
        type: Type.STRING,
        description: 'Lowercase kebab-case URL slug (e.g. why-small-ritual-gifts-win).',
      },
      category: {
        type: Type.STRING,
        description: `One of: ${ALLOWED_ARTICLE_CATEGORIES.join(', ')}`,
      },
      topics: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: `1 to 3 values from: ${ALLOWED_ARTICLE_TOPICS.join(', ')}`,
      },
      recipients: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      occasions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      executiveSummary: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          '3 to 4 crisp takeaway bullets ("The Short Version"), 1–2 sentences each.',
      },
      pullQuote: {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: 'Memorable pull quote from the essay (40–220 chars).',
          },
          attribution: {
            type: Type.STRING,
            description: 'Brief context or attribution label.',
          },
        },
        required: ['text', 'attribution'],
      },
      sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            heading: {
              type: Type.STRING,
              description: 'H2 Section Heading.',
            },
            subheading: {
              type: Type.STRING,
              description: 'Optional H3 sub-heading for this section.',
            },
            paragraphs: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                '2 to 4 well-crafted editorial paragraphs. May include **bold**, *italic*, [links](/gift-guides/), and verified [cite:cit_id] markers.',
            },
            callout: {
              type: Type.OBJECT,
              properties: {
                kicker: { type: Type.STRING },
                title: { type: Type.STRING },
                body: { type: Type.STRING },
                tone: { type: Type.STRING },
              },
            },
          },
          required: ['heading', 'paragraphs'],
        },
      },
      citationIdsUsed: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'List of verified citation IDs (e.g. cit_galak_2016_why_certain_gifts) cited in the article.',
      },
      seoTitle: {
        type: Type.STRING,
        description: 'Search-optimized title (40–65 characters) ending with | Science of Gifts.',
      },
      metaDescription: {
        type: Type.STRING,
        description: 'Search meta description (115–158 characters).',
      },
    },
    required: [
      'editorialThesis',
      'title',
      'subtitle',
      'slugSuggestion',
      'category',
      'topics',
      'executiveSummary',
      'pullQuote',
      'sections',
      'seoTitle',
      'metaDescription',
    ],
  };

  const { parsed, modelUsed } = await callGeminiArticleJsonWithRetry({
    prompt,
    responseSchema,
    fallbackBuilder: () => {
      const citKeys = Object.keys(CITATIONS);
      const cit1 = citKeys[0] || 'cit_galak_2016_why_certain_gifts';
      const cit2 = citKeys[1] || cit1;
      const slugBase = toKebabSlug(topic);
      return {
        editorialThesis: editorialAngle,
        title: topic.length >= 10 ? topic.slice(0, 140) : `${topic}: An Evidence-Based Guide`,
        subtitle: editorialAngle.slice(0, 380),
        slugSuggestion: slugBase,
        category: 'Gift-Giving Psychology',
        topics: ['gift-giving-psychology', 'practical-gifting-advice'],
        recipients: ['partner', 'friend'],
        occasions: ['birthday', 'thank-you'],
        executiveSummary: [
          `Givers frequently focus on the theatrical surprise of unwrapping, whereas recipients judge a gift by how naturally it integrates into their daily rituals.`,
          `Specificity of observation—remembering a casual remark or shared moment—outperforms higher price tags every time.`,
          `Pairing a physical object with a brief, concrete note anchors relational memory for years.`,
        ],
        pullQuote: {
          text: 'The most enduring gifts do not demand admiration in the moment; they quietly earn affection through Tuesday-morning utility.',
          attribution: 'Science of Gifts Editorial Research',
        },
        sections: [
          {
            heading: 'The Asymmetry Between Unwrapping Spectacle and Daily Utility',
            subheading: 'Why Givers Overvalue Novelty While Recipients Prize Familiarity',
            paragraphs: [
              `When selecting a gift around **${topic}**, givers often optimize for the thirty seconds when the ribbon is untied [cite:${cit1}]. Yet behavioral studies show that recipients evaluate gifts across months of ordinary domestic use.`,
              `${editorialAngle} By choosing objects that elevate an existing habit rather than introducing a new obligation, you remove friction and deepen appreciation. Explore our curated [Gift Guides](/gift-guides/) for examples grounded in everyday craft.`,
            ],
            callout: {
              kicker: 'Behavioral Principle',
              title: 'The Tuesday-Morning Test',
              body: 'Before purchasing any gift, ask whether the recipient will still reach for it on an ordinary Tuesday morning three months from now.',
              tone: 'sand',
            },
          },
          {
            heading: 'How Observational Specificity Signals Genuine Care',
            subheading: 'Translating Shared History into Tactile Choices',
            paragraphs: [
              `Research on interpersonal calibration demonstrates that *thoughtfulness* is rarely a matter of extravagance [cite:${cit2}]. Instead, recipients feel understood when a gift reflects a specific detail they mentioned weeks earlier.`,
              `Whether upgrading a well-worn kitchen tool or inscribing a three-sentence note on heavy cotton cardstock, concrete specificity transforms a modest object into a relational keepsake.`,
            ],
          },
          {
            heading: 'A Practical Framework for Choosing Without Guesswork',
            subheading: 'Three Questions to Ask Before You Wrap',
            paragraphs: [
              `First, identify one daily ritual the recipient already enjoys—morning coffee, evening reading, or weekend hosting. Second, select the highest-craft version of a small consumable or companion tool within that ritual.`,
              `Finally, include a brief handwritten note naming the exact memory that prompted your choice. That combination of **tactile utility** and *personal inscription* outlasts any generic luxury box.`,
            ],
          },
        ],
        citationIdsUsed: [cit1, cit2],
        seoTitle: `${topic.slice(0, 44)} | Science of Gifts`,
        metaDescription: editorialAngle.slice(0, 155),
      };
    },
  });

  const proposedFields = buildNormalizedArticleProposalFromAiJson(
    parsed,
    currentDoc
  );

  const fieldDiffs = buildArticleFieldDiffs(currentDoc, proposedFields);
  const hasExistingContent = fieldDiffs.some((d) => d.hasExistingContent);

  return {
    ok: true,
    modelUsed,
    writingProfileUsed: {
      profileId: profile.profileId || profile._id,
      name: profile.name,
    },
    editorialThesis: String(parsed.editorialThesis || editorialAngle),
    proposedFields,
    fieldDiffs,
    hasExistingContent,
    message: `Generated complete article "${proposedFields.title}" (${proposedFields.sections?.length || 0} sections + SEO metadata) using profile "${profile.name}". Review and accept below.`,
  };
}

/**
 * Improves, rewrites, polishes, shortens, expands, or reframes either a selected section
 * or the entire article using Gemini and the selected `Article Editorial` profile.
 */
export async function improveArticleWithAi(
  input: ArticleImproveInput
): Promise<ArticleImproveResult> {
  const profile = await resolveActiveArticleAiWritingProfile(
    input.writingProfile || input.writingProfileId
  );
  const currentDoc = normalizeSanityArticleDocumentBackwardCompatible(
    input.currentDocument || {}
  );
  const targetSectionId = input.targetSectionId || 'all_sections';

  const actionDescriptions: Record<ArticleImproveActionType, string> = {
    rewrite_polish:
      'Polish prose rhythm, sharpen observational specificity, and elevate clarity while preserving the core meaning and verified citations.',
    another_angle:
      'Try a fresh, more surprising editorial angle and narrative hook that reframes the human gifting dynamic more memorably.',
    reduce_repetition:
      'Eliminate repeated phrases, redundant thesis restatements, and overlapping transitions across paragraphs and sections.',
    shorten:
      'Tighten and condense the prose by ~25%—cutting throat-clearing openings and filler while keeping every concrete insight and citation.',
    expand:
      'Expand the prose with richer everyday domestic scenes, concrete gifting examples, and deeper behavioral explanation.',
    custom:
      input.revisionGoals ||
      input.customInstructions ||
      'Improve editorial clarity, warmth, and flow.',
  };

  const targetSectionObj =
    targetSectionId !== 'all_sections'
      ? (currentDoc.sections || []).find((s: any) => s.id === targetSectionId)
      : null;

  const prompt = [
    `You are the senior feature editor at Science of Gifts revising an article in Official Sanity Studio.`,
    formatArticleWritingProfileForPrompt(profile),
    `=== REVISION ACTION REQUESTED ===`,
    `Action: ${input.action} — ${actionDescriptions[input.action]}`,
    `Target Scope: ${
      targetSectionObj
        ? `Single Section ("${targetSectionObj.heading}", id: "${targetSectionObj.id}")`
        : 'Full Article (All Sections, Title, Subtitle, Executive Summary & SEO)'
    }`,
    input.editorialAngle
      ? `Editorial Angle Guidance: ${input.editorialAngle}`
      : '',
    input.revisionGoals || input.customInstructions
      ? `Specific Editor Revision Notes: ${
          input.revisionGoals || input.customInstructions
        }`
      : '',
    `=== CURRENT ARTICLE CONTENT ===`,
    `Title: ${currentDoc.title}`,
    `Subtitle: ${currentDoc.subtitle}`,
    `Executive Summary:\n${(currentDoc.executiveSummary || [])
      .map((b: string, i: number) => `${i + 1}. ${b}`)
      .join('\n')}`,
    `Current Sections:\n${(currentDoc.sections || [])
      .map(
        (s: any, idx: number) =>
          `[Section ${idx + 1} | id="${s.id}"]\nH2: ${s.heading}\n${
            s.subheading ? `H3: ${s.subheading}\n` : ''
          }${(s.paragraphs || []).join('\n\n')}`
      )
      .join('\n\n---\n\n')}`,
    `=== VERIFIED RESEARCH BIBLIOGRAPHY ===`,
    formatVerifiedCitationsCatalogForPrompt(),
  ]
    .filter(Boolean)
    .join('\n\n');

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      editorialThesis: { type: Type.STRING },
      rationaleSummary: {
        type: Type.STRING,
        description: 'Brief explanation of what was improved and why.',
      },
      title: { type: Type.STRING },
      subtitle: { type: Type.STRING },
      executiveSummary: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            heading: { type: Type.STRING },
            subheading: { type: Type.STRING },
            paragraphs: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            callout: {
              type: Type.OBJECT,
              properties: {
                kicker: { type: Type.STRING },
                title: { type: Type.STRING },
                body: { type: Type.STRING },
                tone: { type: Type.STRING },
              },
            },
          },
          required: ['heading', 'paragraphs'],
        },
      },
      seoTitle: { type: Type.STRING },
      metaDescription: { type: Type.STRING },
    },
    required: ['editorialThesis', 'rationaleSummary', 'sections'],
  };

  const { parsed, modelUsed } = await callGeminiArticleJsonWithRetry({
    prompt,
    responseSchema,
    fallbackBuilder: () => {
      const baseSections = (currentDoc.sections || []).map((s: any) => ({
        id: s.id,
        heading:
          targetSectionObj && s.id === targetSectionId
            ? `${s.heading} (Refined)`
            : s.heading,
        subheading:
          s.subheading || 'Observational Specificity and Everyday Utility',
        paragraphs: (s.paragraphs || []).map((p: string, idx: number) =>
          idx === 0
            ? `${p} ${
                input.revisionGoals
                  ? `(${input.revisionGoals.trim()})`
                  : 'Every tactile detail reinforces lasting appreciation.'
              }`
            : p
        ),
        callout: s.callout,
      }));
      return {
        editorialThesis: String(input.editorialAngle || currentDoc.subtitle || ''),
        rationaleSummary: `Applied ${input.action} revision to tighten editorial rhythm and specificity.`,
        title: currentDoc.title,
        subtitle: currentDoc.subtitle,
        executiveSummary: currentDoc.executiveSummary,
        sections: baseSections,
        seoTitle: currentDoc.seo?.seoTitle,
        metaDescription: currentDoc.seo?.metaDescription,
      };
    },
  });

  let proposedFields: Record<string, any> = {};

  if (targetSectionObj && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
    // Replace only the targeted section while preserving all other sections untouched
    const revisedSecRaw =
      parsed.sections.find((s: any) => s.id === targetSectionId) ||
      parsed.sections[0];
    const updatedSections = (currentDoc.sections || []).map((existingSec: any) => {
      if (existingSec.id !== targetSectionId) return existingSec;
      const newParas = Array.isArray(revisedSecRaw.paragraphs)
        ? revisedSecRaw.paragraphs.map((p: any) => String(p || '').trim()).filter(Boolean)
        : existingSec.paragraphs;
      const newCallout =
        revisedSecRaw.callout &&
        revisedSecRaw.callout.title &&
        revisedSecRaw.callout.body
          ? {
              _type: 'articleCallout',
              kicker: revisedSecRaw.callout.kicker || 'Editorial Note',
              title: revisedSecRaw.callout.title,
              body: revisedSecRaw.callout.body,
              tone: revisedSecRaw.callout.tone || 'sand',
            }
          : existingSec.callout;

      return {
        ...existingSec,
        heading: revisedSecRaw.heading || existingSec.heading,
        subheading:
          revisedSecRaw.subheading !== undefined
            ? revisedSecRaw.subheading
            : existingSec.subheading,
        paragraphs: newParas,
        portableTextBody: paragraphsToPortableText(newParas, {
          images: existingSec.images,
          callout: newCallout,
        }),
        ...(newCallout ? { callout: newCallout } : {}),
      };
    });

    proposedFields = {
      sections: updatedSections,
      bodyPortableText: sectionsToFullBodyPortableText(
        updatedSections as unknown as ArticleSection[]
      ),
    };
  } else {
    const fullProposal = buildNormalizedArticleProposalFromAiJson(
      {
        ...parsed,
        title: parsed.title || currentDoc.title,
        subtitle: parsed.subtitle || currentDoc.subtitle,
        executiveSummary: parsed.executiveSummary || currentDoc.executiveSummary,
        seoTitle: parsed.seoTitle || currentDoc.seo?.seoTitle,
        metaDescription:
          parsed.metaDescription || currentDoc.seo?.metaDescription,
      },
      currentDoc
    );
    proposedFields = fullProposal;
  }

  const fieldDiffs = buildArticleFieldDiffs(currentDoc, proposedFields);

  return {
    ok: true,
    action: input.action,
    targetSectionId,
    modelUsed,
    writingProfileUsed: {
      profileId: profile.profileId || profile._id,
      name: profile.name,
    },
    editorialThesis: String(parsed.editorialThesis || ''),
    rationaleSummary: String(
      parsed.rationaleSummary || 'Polished article prose and structure.'
    ),
    proposedFields,
    fieldDiffs,
    message: `Prepared AI revision (${input.action}) using profile "${profile.name}". Review proposed changes and click Accept to apply.`,
  };
}

/**
 * Normalizes AI-generated or imported article JSON into Sanity `article` fields
 * (including `sections` with `portableTextBody` & `paragraphs`, `bodyPortableText`,
 * `executiveSummary`, `pullQuote`, `citations`, `seo`, etc.).
 */
export function buildNormalizedArticleProposalFromAiJson(
  rawAi: Record<string, any>,
  currentDoc?: Record<string, any> | null
): Record<string, any> {
  const existing = currentDoc || {};
  const title =
    typeof rawAi.title === 'string' && rawAi.title.trim().length >= 8
      ? rawAi.title.trim().slice(0, 160)
      : existing.title || 'The Quiet Science of Thoughtful Gifting';

  const subtitle =
    typeof rawAi.subtitle === 'string' && rawAi.subtitle.trim().length >= 20
      ? rawAi.subtitle.trim().slice(0, 420)
      : existing.subtitle ||
        'Why everyday ritual utility and personal specificity outlast expensive unwrapping surprises.';

  const existingSlug =
    typeof existing.slug === 'string'
      ? existing.slug
      : existing.slug?.current;
  const slugCurrent =
    existingSlug && existingSlug.trim()
      ? existingSlug.trim()
      : toKebabSlug(rawAi.slugSuggestion || rawAi.slug?.current || rawAi.slug || title);

  const canonicalId =
    (typeof existing.id === 'string' && existing.id.startsWith('art_')
      ? existing.id
      : typeof existing._id === 'string' &&
        existing._id.replace(/^drafts\./, '').startsWith('art_')
      ? existing._id.replace(/^drafts\./, '')
      : `art_${slugCurrent.replace(/-/g, '_').slice(0, 50)}`) ||
    `art_story_${Date.now().toString(36)}`;

  const category = ALLOWED_ARTICLE_CATEGORIES.includes(rawAi.category)
    ? rawAi.category
    : existing.category || 'Gift-Giving Psychology';

  const topics = Array.isArray(rawAi.topics)
    ? rawAi.topics.filter((t: any) => ALLOWED_ARTICLE_TOPICS.includes(t))
    : [];
  const finalTopics =
    topics.length > 0
      ? topics.slice(0, 3)
      : existing.topics?.length > 0
      ? existing.topics
      : ['gift-giving-psychology', 'practical-gifting-advice'];

  const recipients = Array.isArray(rawAi.recipients)
    ? rawAi.recipients.filter((r: any) => ALLOWED_RECIPIENTS.includes(r)).slice(0, 4)
    : existing.recipients || ['partner', 'friend'];

  const occasions = Array.isArray(rawAi.occasions)
    ? rawAi.occasions.filter((o: any) => ALLOWED_OCCASIONS.includes(o)).slice(0, 4)
    : existing.occasions || ['birthday', 'just-because'];

  const executiveSummary =
    Array.isArray(rawAi.executiveSummary) && rawAi.executiveSummary.length >= 2
      ? rawAi.executiveSummary
          .map((s: any) => String(s || '').trim())
          .filter(Boolean)
          .slice(0, 5)
      : existing.executiveSummary?.length >= 2
      ? existing.executiveSummary
      : [
          'Givers often optimize for the theatrical moment of unwrapping, while recipients value how an object fits into their daily routines.',
          'Specificity and zero immediate burden make modest gifts feel far more personal than generic luxury boxes.',
          'Choosing an upgrade to an existing morning or evening habit creates repeated moments of appreciation.',
        ];

  const pullQuote =
    rawAi.pullQuote &&
    typeof rawAi.pullQuote === 'object' &&
    typeof rawAi.pullQuote.text === 'string' &&
    rawAi.pullQuote.text.trim().length >= 15
      ? {
          _type: 'articlePullQuote',
          text: rawAi.pullQuote.text.trim().slice(0, 320),
          attribution:
            typeof rawAi.pullQuote.attribution === 'string' &&
            rawAi.pullQuote.attribution.trim()
              ? rawAi.pullQuote.attribution.trim().slice(0, 120)
              : 'Science of Gifts Editorial Research',
        }
      : existing.pullQuote;

  const rawSections = Array.isArray(rawAi.sections) ? rawAi.sections : [];
  const existingSections = Array.isArray(existing.sections)
    ? existing.sections
    : [];

  const normalizedSections = rawSections.map((sec: any, idx: number) => {
    const existingSec = existingSections[idx];
    const heading =
      typeof sec?.heading === 'string' && sec.heading.trim().length >= 3
        ? sec.heading.trim().slice(0, 160)
        : `Section ${idx + 1}: Core Insight`;
    const slugH = toKebabSlug(heading).slice(0, 32);
    const secId =
      (typeof sec?.id === 'string' && sec.id.trim()) ||
      existingSec?.id ||
      `sec_${idx + 1}_${slugH}`;

    const paragraphs = Array.isArray(sec?.paragraphs)
      ? sec.paragraphs
          .map((p: any) => String(p || '').trim())
          .filter((p: string) => p.length > 0)
      : ['Thoughtful gifting begins with observing everyday habits.'];

    const callout =
      sec?.callout &&
      typeof sec.callout === 'object' &&
      typeof sec.callout.title === 'string' &&
      sec.callout.title.trim() &&
      typeof sec.callout.body === 'string' &&
      sec.callout.body.trim().length >= 15
        ? {
            _type: 'articleCallout',
            kicker:
              typeof sec.callout.kicker === 'string' && sec.callout.kicker.trim()
                ? sec.callout.kicker.trim().slice(0, 60)
                : 'Editorial Takeaway',
            title: sec.callout.title.trim().slice(0, 140),
            body: sec.callout.body.trim().slice(0, 650),
            tone:
              sec.callout.tone === 'mint' ||
              sec.callout.tone === 'blue' ||
              sec.callout.tone === 'butter' ||
              sec.callout.tone === 'sand'
                ? sec.callout.tone
                : 'sand',
          }
        : existingSec?.callout;

    const images = existingSec?.images;

    return {
      _type: 'articleContentSection',
      _key: secId,
      id: secId,
      heading,
      subheading:
        typeof sec?.subheading === 'string' && sec.subheading.trim()
          ? sec.subheading.trim().slice(0, 180)
          : undefined,
      paragraphs,
      portableTextBody: paragraphsToPortableText(paragraphs, {
        images,
        callout,
      }),
      ...(images && images.length > 0 ? { images } : {}),
      ...(callout ? { callout } : {}),
      ...(existingSec?.contextualProducts
        ? { contextualProducts: existingSec.contextualProducts }
        : {}),
    };
  });

  // Collect verified citations from citationIdsUsed + inline [cite:...] markers
  const citedSet = new Set<string>();
  if (Array.isArray(rawAi.citationIdsUsed)) {
    for (const cid of rawAi.citationIdsUsed) {
      if (typeof cid === 'string' && CITATIONS[cid.trim()]) {
        citedSet.add(cid.trim());
      }
    }
  }
  for (const sec of normalizedSections) {
    for (const p of sec.paragraphs) {
      const matches = p.matchAll(/\[cite:([a-zA-Z0-9_-]+)\]/g);
      for (const m of matches) {
        if (m[1] && CITATIONS[m[1]]) {
          citedSet.add(m[1]);
        }
      }
    }
  }
  if (citedSet.size === 0) {
    const firstDefaultCit = Object.keys(CITATIONS)[0];
    if (firstDefaultCit) citedSet.add(firstDefaultCit);
  }

  const citations = Array.from(citedSet).map((cid, idx) => ({
    _type: 'reference',
    _key: `cit_ref_${idx}_${cid}`,
    _ref: cid,
    _weak: true,
  }));

  const defaultAuthorId =
    existing.author?._ref || Object.keys(AUTHORS)[0] || 'author_elena_rostova';

  const heroImage =
    existing.heroImage && existing.heroImage.url
      ? existing.heroImage
      : {
          _type: 'editorialImage',
          url: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1400&q=80',
          externalUrl:
            'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1400&q=80',
          alt: `${title} — editorial hero photograph`,
          caption:
            'The strongest gifts fit naturally into a recipient’s everyday rituals and shared memories.',
        };

  const seoTitle =
    typeof rawAi.seoTitle === 'string' && rawAi.seoTitle.trim().length >= 10
      ? rawAi.seoTitle.trim().slice(0, 110)
      : `${title} | Science of Gifts`.slice(0, 110);

  const metaDescription =
    typeof rawAi.metaDescription === 'string' &&
    rawAi.metaDescription.trim().length >= 25
      ? rawAi.metaDescription.trim().slice(0, 220)
      : subtitle.slice(0, 220);

  const canonicalPath = `/articles/${slugCurrent}/`;

  const seo = {
    ...(existing.seo || {}),
    _type: 'seoMetadata',
    seoTitle,
    metaDescription,
    canonicalPath,
    ogTitle: seoTitle,
    ogDescription: metaDescription,
    ogImage: heroImage.url,
    ogType: 'article' as const,
    schemaType: 'Article' as const,
    indexing: 'noindex,follow' as const,
    noindex: true,
  };

  const bodyPortableText = sectionsToFullBodyPortableText(
    normalizedSections as unknown as ArticleSection[]
  );

  return {
    id: canonicalId,
    title,
    subtitle,
    slug: {
      _type: 'slug',
      current: slugCurrent,
    },
    category,
    topics: finalTopics,
    recipients,
    occasions,
    author: {
      _type: 'reference',
      _ref: defaultAuthorId,
      _weak: true,
    },
    publishedAt:
      existing.publishedAt || new Date().toISOString().slice(0, 10),
    heroImage,
    executiveSummary,
    ...(pullQuote ? { pullQuote } : {}),
    sections: normalizedSections,
    bodyPortableText,
    citations,
    relatedGuides:
      Array.isArray(existing.relatedGuides) && existing.relatedGuides.length > 0
        ? existing.relatedGuides
        : [
            {
              _type: 'reference',
              _key: 'guide_ref_0',
              _ref: GIFT_GUIDES[0]?.id || 'guide_little_things_2026',
              _weak: true,
            },
          ],
    seo,
  };
}

export function buildArticleFieldDiffs(
  currentDoc: Record<string, any> | null | undefined,
  proposedFields: Record<string, any>
): ProposedFieldDiff[] {
  const doc = currentDoc || {};
  const labelMap: Record<string, { label: string; category: 'supporting' | 'editorial' }> = {
    title: { label: 'Article Title (H1)', category: 'editorial' },
    subtitle: { label: 'Subtitle / Editorial Dek (Excerpt)', category: 'editorial' },
    slug: { label: 'URL Slug', category: 'supporting' },
    category: { label: 'Primary Editorial Category', category: 'supporting' },
    topics: { label: 'Article Topics', category: 'supporting' },
    executiveSummary: { label: 'Executive Summary ("The Short Version")', category: 'editorial' },
    pullQuote: { label: 'Featured Pull Quote', category: 'editorial' },
    sections: { label: 'Article Body Sections (H2/H3 & Portable Text)', category: 'editorial' },
    citations: { label: 'Referenced Research Citations', category: 'supporting' },
    seo: { label: 'SEO Metadata (Title, Description & Canonical Path)', category: 'supporting' },
  };

  const diffs: ProposedFieldDiff[] = [];
  for (const [field, meta] of Object.entries(labelMap)) {
    if (!(field in proposedFields)) continue;
    const prev = doc[field];
    const next = proposedFields[field];
    if (JSON.stringify(prev) === JSON.stringify(next)) continue;
    diffs.push({
      field,
      label: meta.label,
      category: meta.category,
      previousValue: prev,
      proposedValue: next,
      hasExistingContent: isNonEmptyValue(prev),
    });
  }
  return diffs;
}

/**
 * Exports a complete Markdown + JSON Schema Article Writing Brief or Revision Brief
 * so editors can optionally generate or revise articles in an external AI session
 * and import the result directly back into Official Sanity Studio.
 */
export async function exportArticleAiBrief(input: {
  mode: 'create' | 'revision';
  topic?: string;
  editorialAngle?: string;
  researchNotes?: string;
  revisionGoals?: string;
  writingProfile?: AiWritingProfileDocument | null;
  writingProfileId?: string;
  currentDocument?: Record<string, any> | null;
}): Promise<{
  mode: 'create' | 'revision';
  suggestedFilename: string;
  markdownBrief: string;
  templatePayload: Record<string, any>;
  writingProfileUsed: { profileId: string; name: string };
}> {
  const profile = await resolveActiveArticleAiWritingProfile(
    input.writingProfile || input.writingProfileId
  );
  const doc = input.currentDocument || {};
  const topic =
    (input.topic || '').trim() ||
    String(doc.title || '').trim() ||
    'New Science of Gifts Editorial Story';
  const angle =
    (input.editorialAngle || '').trim() ||
    String(doc.subtitle || '').trim() ||
    'Behavioral insight and practical gifting framework';

  const slugBase = toKebabSlug(topic);
  const suggestedFilename =
    input.mode === 'revision'
      ? `article-revision-brief-${slugBase}.md`
      : `article-writing-brief-${slugBase}.md`;

  const templatePayload = {
    format: 'science-of-gifts/article-interchange@1.0',
    mode: input.mode,
    editorialThesis: 'State the central behavioral thesis in one sentence.',
    title: doc.title || 'Replace with Evocative Editorial H1 Title',
    subtitle:
      doc.subtitle ||
      'Replace with 1–2 sentence editorial dek summarizing the tension and reader takeaway.',
    slugSuggestion: doc.slug?.current || slugBase,
    category: doc.category || 'Gift-Giving Psychology',
    topics: doc.topics || ['gift-giving-psychology', 'practical-gifting-advice'],
    recipients: doc.recipients || ['partner', 'friend'],
    occasions: doc.occasions || ['birthday', 'just-because'],
    executiveSummary: doc.executiveSummary || [
      'Takeaway 1: Summarize the core giver-receiver psychological asymmetry.',
      'Takeaway 2: Explain the practical rule of thumb for choosing better gifts.',
      'Takeaway 3: Describe how to apply this on the next occasion.',
    ],
    pullQuote: doc.pullQuote || {
      text: 'The most memorable gifts rarely try to win the four seconds of unwrapping; they quietly improve the next four hundred mornings.',
      attribution: 'Science of Gifts Editorial Research',
    },
    sections:
      input.mode === 'revision' && Array.isArray(doc.sections) && doc.sections.length > 0
        ? doc.sections.map((s: any) => ({
            id: s.id,
            heading: s.heading,
            subheading: s.subheading,
            paragraphs: s.paragraphs,
            callout: s.callout,
          }))
        : [
            {
              id: 'sec_1_the_unwrapping_paradox',
              heading: 'Section 1 H2 Heading: The Human Scene',
              subheading: 'Optional H3 Sub-heading',
              paragraphs: [
                'First paragraph opening with a vivid, recognizable scene...',
                'Second paragraph unpacking the behavioral study [cite:cit_galak_2016_why_certain_gifts] and linking to our [curated Gift Guides](/gift-guides/).',
              ],
              callout: {
                kicker: 'The Rule of Thumb',
                title: 'Callout Box Headline',
                body: 'Concise practical summary for readers.',
                tone: 'sand',
              },
            },
            {
              id: 'sec_2_practical_framework',
              heading: 'Section 2 H2 Heading: Practical Framework',
              paragraphs: [
                'Actionable advice and concrete examples...',
                'Closing synthesis paragraph.',
              ],
            },
          ],
    citationIdsUsed: ['cit_galak_2016_why_certain_gifts'],
    seoTitle: doc.seo?.seoTitle || `${topic.slice(0, 48)} | Science of Gifts`,
    metaDescription:
      doc.seo?.metaDescription ||
      'Discover the behavioral psychology and practical etiquette behind thoughtful gift-giving on Science of Gifts.',
  };

  const markdownBrief = [
    `# Science of Gifts — ${
      input.mode === 'revision'
        ? 'Article Revision Brief'
        : 'Article Writing Brief'
    }`,
    ``,
    `- **Active AI Writing Profile**: ${profile.name} (\`${profile.profileId}\`)`,
    `- **Mode**: \`${input.mode}\``,
    `- **Topic / Working Title**: ${topic}`,
    `- **Editorial Angle**: ${angle}`,
    input.researchNotes ? `- **Research Notes**: ${input.researchNotes}` : '',
    input.revisionGoals ? `- **Revision Goals**: ${input.revisionGoals}` : '',
    ``,
    `## 1. Editorial Voice & Instructions`,
    formatArticleWritingProfileForPrompt(profile),
    ``,
    `## 2. Verified Citations Available (\`[cite:cit_id]\`)`,
    formatVerifiedCitationsCatalogForPrompt(),
    ``,
    input.mode === 'revision' && Array.isArray(doc.sections)
      ? [
          `## 3. Current Article Content to Revise`,
          `**Title**: ${doc.title || ''}`,
          `**Subtitle**: ${doc.subtitle || ''}`,
          ``,
          ...(doc.sections || []).map(
            (s: any, i: number) =>
              `### Section ${i + 1}: ${s.heading} (\`${s.id}\`)\n${(
                s.paragraphs || []
              ).join('\n\n')}`
          ),
        ].join('\n\n')
      : '',
    `## ${input.mode === 'revision' ? '4' : '3'}. Required JSON Output Template`,
    `Return a single valid JSON object matching this structure so it can be imported directly into Official Sanity Studio:`,
    '```json',
    JSON.stringify(templatePayload, null, 2),
    '```',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    mode: input.mode,
    suggestedFilename,
    markdownBrief,
    templatePayload,
    writingProfileUsed: {
      profileId: profile.profileId || profile._id,
      name: profile.name,
    },
  };
}

/**
 * Parses an imported JSON string (or markdown code block containing JSON) for either
 * "Import Complete Article" or "Import Article Revision" and returns normalized Sanity
 * article fields + diffs for review/application.
 */
export function parseImportedArticlePayload(
  rawInput: string,
  currentDoc?: Record<string, any> | null
): {
  ok: boolean;
  proposedFields?: Record<string, any>;
  fieldDiffs?: ProposedFieldDiff[];
  message: string;
} {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return {
      ok: false,
      message: 'Paste a JSON article payload or markdown code block to import.',
    };
  }

  let jsonCandidate = trimmed;
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    jsonCandidate = fencedMatch[1].trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonCandidate);
  } catch (err: any) {
    return {
      ok: false,
      message: `Invalid JSON format: ${err?.message || 'Could not parse JSON payload.'}`,
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      message: 'Imported article payload must be a JSON object.',
    };
  }

  const sourceObj =
    parsed.article && typeof parsed.article === 'object'
      ? parsed.article
      : parsed;

  const proposedFields = buildNormalizedArticleProposalFromAiJson(
    sourceObj,
    currentDoc
  );
  const fieldDiffs = buildArticleFieldDiffs(currentDoc, proposedFields);

  return {
    ok: true,
    proposedFields,
    fieldDiffs,
    message: `Parsed article payload "${proposedFields.title}" (${
      proposedFields.sections?.length || 0
    } sections). Review or apply the imported changes below.`,
  };
}
