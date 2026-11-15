import { defineField, defineType } from '../../sanityCore';

export interface AiWritingSectionInstructions {
  _type?: 'aiWritingSectionInstructions';
  whyToGiveIt?: string;
  giftVerdict?: string;
  idealRecipientProfile?: string;
  extendedGiftRationale?: string;
  buyingConsiderations?: string;
  occasionContextNotes?: string;
  supportingMetadataAndSeo?: string;
}

export interface AiWritingLengthGuidance {
  _type?: 'aiWritingLengthGuidance';
  subtitleRange?: string;
  whyToGiveItRange?: string;
  verdictAssessmentRange?: string;
  recipientNarrativeRange?: string;
  extendedRationaleParagraphs?: string;
  buyingConsiderationsCount?: string;
}

export interface AiWritingProfileDocument {
  _id: string;
  _type: 'aiWritingProfile';
  _rev?: string;
  _createdAt?: string;
  _updatedAt?: string;
  status?: 'draft' | 'published';
  profileId: string;
  name: string;
  contentType: 'product' | 'giftGuide' | 'article';
  isDefault: boolean;
  editorialVoiceAndStyle: string;
  writingObjectives: string[];
  preferredExamples: string[];
  avoidPhrasesAndApproaches: string[];
  sectionInstructions: AiWritingSectionInstructions;
  recommendedLengths: AiWritingLengthGuidance;
  additionalCustomInstructions?: string;
}

export const aiWritingSectionInstructionsObject = defineType({
  name: 'aiWritingSectionInstructions',
  title: 'Section-by-Section Writing Instructions',
  type: 'object',
  fields: [
    defineField({
      name: 'whyToGiveIt',
      title: 'Why to Give It Instructions',
      type: 'text',
      rows: 3,
      description:
        'Guidance for the primary editorial hook and central observation explaining why this item succeeds as a gift.',
      validation: (Rule) => Rule.required().min(20).max(1200),
    }),
    defineField({
      name: 'giftVerdict',
      title: 'Four-Part Gift Verdict Instructions',
      type: 'text',
      rows: 4,
      description:
        'Guidance for Editorial Assessment, Why It Stands Out, What the Recipient Noticeably Appreciates, and One Honest Caveat.',
      validation: (Rule) => Rule.required().min(20).max(1200),
    }),
    defineField({
      name: 'idealRecipientProfile',
      title: 'Ideal Recipient Profile Instructions',
      type: 'text',
      rows: 3,
      description:
        'Guidance for Who It Suits Best (headline, narrative, lifestyle/personality cues, and relationship fit).',
      validation: (Rule) => Rule.required().min(20).max(1200),
    }),
    defineField({
      name: 'extendedGiftRationale',
      title: 'Extended Gift Rationale Instructions',
      type: 'text',
      rows: 3,
      description:
        'Guidance for the 2–3 cohesive editorial paragraphs developing the central thesis without repeating the verdict.',
      validation: (Rule) => Rule.required().min(20).max(1200),
    }),
    defineField({
      name: 'buyingConsiderations',
      title: 'Practical Buying Considerations Instructions',
      type: 'text',
      rows: 3,
      description:
        'Guidance for practical sizing, material, shipping, or verification considerations a buyer should weigh.',
      validation: (Rule) => Rule.required().min(20).max(1200),
    }),
    defineField({
      name: 'occasionContextNotes',
      title: 'Occasion Fit & Context Notes Instructions',
      type: 'text',
      rows: 3,
      description:
        'Guidance for pairing canonical gifting occasions with concrete presentation and timing advice.',
      validation: (Rule) => Rule.required().min(20).max(1200),
    }),
    defineField({
      name: 'supportingMetadataAndSeo',
      title: 'Supporting Metadata & SEO Instructions',
      type: 'text',
      rows: 3,
      description:
        'Guidance for subtitle, calloutTag, bestForSummary, detailsAndCare, and search engine titles/descriptions.',
      validation: (Rule) => Rule.max(1200),
    }),
  ],
});

export const aiWritingLengthGuidanceObject = defineType({
  name: 'aiWritingLengthGuidance',
  title: 'Recommended Section Lengths',
  type: 'object',
  fields: [
    defineField({
      name: 'subtitleRange',
      title: 'Editorial Subtitle Length',
      type: 'string',
      initialValue: '60–130 characters (1 crisp sentence)',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'whyToGiveItRange',
      title: 'Why to Give It Length',
      type: 'string',
      initialValue: '160–420 characters (2–3 resonant sentences)',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'verdictAssessmentRange',
      title: 'Gift Verdict Assessment Length',
      type: 'string',
      initialValue: '120–320 characters per verdict sub-field',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'recipientNarrativeRange',
      title: 'Ideal Recipient Narrative Length',
      type: 'string',
      initialValue: '140–360 characters + 2–4 specific lifestyle cues',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'extendedRationaleParagraphs',
      title: 'Extended Rationale Structure',
      type: 'string',
      initialValue: '2–3 paragraphs (220–500 characters each)',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'buyingConsiderationsCount',
      title: 'Buying Considerations Count',
      type: 'string',
      initialValue: '3–4 distinct, practical considerations',
      validation: (Rule) => Rule.required().max(120),
    }),
  ],
});

export const aiWritingProfileDocument = defineType({
  name: 'aiWritingProfile',
  title: 'AI Writing Profile',
  type: 'document',
  icon: 'Sparkles',
  description:
    'Editable editorial voice, structure, anti-cliché rules, and section-by-section AI authoring instructions managed directly in Sanity Studio.',
  groups: [
    {
      name: 'identity',
      title: '1. Profile Identity & Scope',
      default: true,
    },
    {
      name: 'voiceAndRules',
      title: '2. Editorial Voice, Objectives & Guardrails',
    },
    {
      name: 'sectionGuidance',
      title: '3. Section-by-Section Instructions & Lengths',
    },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Profile Name',
      type: 'string',
      group: 'identity',
      description: 'Human-readable profile name shown in the Studio AI authoring selector.',
      validation: (Rule) => Rule.required().min(4).max(100),
    }),
    defineField({
      name: 'profileId',
      title: 'Canonical Profile ID',
      type: 'string',
      group: 'identity',
      description:
        'Stable identifier (e.g., "ai_profile_science_of_gifts_product_editorial").',
      validation: (Rule) =>
        Rule.required().regex(/^ai_profile_[a-z0-9_]+$/, {
          name: 'ai_profile_id',
        }),
    }),
    defineField({
      name: 'contentType',
      title: 'Intended Content Type',
      type: 'string',
      group: 'identity',
      initialValue: 'product',
      options: {
        list: [
          { title: 'Product Editorial Review', value: 'product' },
          { title: 'Curated Gift Guide', value: 'giftGuide' },
          { title: 'Research Story / Article', value: 'article' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'isDefault',
      title: 'Default Profile for Content Type',
      type: 'boolean',
      group: 'identity',
      initialValue: false,
      description:
        'When enabled, this profile is pre-selected by default when generating or polishing editorial copy.',
    }),
    defineField({
      name: 'status',
      title: 'Publication Lifecycle Status',
      type: 'string',
      group: 'identity',
      initialValue: 'published',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Published', value: 'published' },
        ],
      },
    }),
    defineField({
      name: 'editorialVoiceAndStyle',
      title: 'Editorial Voice and Style Instructions',
      type: 'text',
      rows: 6,
      group: 'voiceAndRules',
      description:
        'Defines the publication tone, observational sharpness, psychological grounding, and prose cadence.',
      validation: (Rule) => Rule.required().min(40).max(3000),
    }),
    defineField({
      name: 'writingObjectives',
      title: 'Core Writing Objectives',
      type: 'array',
      group: 'voiceAndRules',
      description:
        'Specific editorial goals every generated product review must achieve.',
      of: [{ type: 'string' }],
      validation: (Rule) => Rule.required().min(2).max(12),
    }),
    defineField({
      name: 'preferredExamples',
      title: 'Preferred Editorial Examples (Model Passages)',
      type: 'array',
      group: 'voiceAndRules',
      description:
        'Short exemplar passages demonstrating the exact tone, rhythm, and specificity expected.',
      of: [{ type: 'text' }],
      validation: (Rule) => Rule.max(8),
    }),
    defineField({
      name: 'avoidPhrasesAndApproaches',
      title: 'Phrases and Approaches to Avoid',
      type: 'array',
      group: 'voiceAndRules',
      description:
        'Banned promotional clichés, filler openings, and structural habits to avoid.',
      of: [{ type: 'string' }],
      validation: (Rule) => Rule.required().min(3).max(25),
    }),
    defineField({
      name: 'sectionInstructions',
      title: 'Section-by-Section Instructions',
      type: 'aiWritingSectionInstructions',
      group: 'sectionGuidance',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'recommendedLengths',
      title: 'Recommended Lengths',
      type: 'aiWritingLengthGuidance',
      group: 'sectionGuidance',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'additionalCustomInstructions',
      title: 'Additional Custom Instructions',
      type: 'text',
      rows: 4,
      group: 'sectionGuidance',
      description:
        'Optional supplementary instructions or seasonal/campaign guidance editors can update anytime.',
      validation: (Rule) => Rule.max(2000),
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'contentType',
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Untitled AI Writing Profile',
        subtitle: `AI Writing Profile · ${subtitle || 'product'}`,
      };
    },
  },
});

export const DEFAULT_PRODUCT_AI_WRITING_PROFILE: AiWritingProfileDocument = {
  _id: 'ai_profile_science_of_gifts_product_editorial',
  _type: 'aiWritingProfile',
  status: 'published',
  profileId: 'ai_profile_science_of_gifts_product_editorial',
  name: 'Science of Gifts Product Editorial',
  contentType: 'product',
  isDefault: true,
  editorialVoiceAndStyle:
    'Write in the signature voice of Science of Gifts: observant, warm, lightly witty, and grounded in everyday human behavior and relationship psychology. Sound like a discerning editorial gift critic at NYT Wirecutter or Strategist who understands why certain objects create immediate recognition between giver and recipient. Anchor the entire piece around ONE distinctive central observation about the product and the person who will love it, rather than listing generic praises. Never invent unverified material specs, prices, or stock claims.',
  writingObjectives: [
    'Develop one clear, memorable central observation (thesis) about why this object works socially and emotionally as a gift, and weave that thread coherently across all sections without repeating sentences.',
    'Ground claims in concrete, observable details from the source product (design cues, typography, materials, everyday ritual use, or insider humor) rather than abstract adjectives.',
    'Explain the interpersonal dynamic: what giving this item signals from the giver ("I notice your specific habits/humor") and how the recipient actually experiences using or wearing it.',
    'Include an honest, practical caveat in the Gift Verdict and concrete buying considerations so the recommendation feels trustworthy and editorially independent.',
    'Respect factual verification strictly: if price, stock status, or material specifications are unknown or unverified, never guess or fabricate numbers—acknowledge what a buyer should verify on the merchant page.',
  ],
  preferredExamples: [
    'Why to Give It Example: "Academic hoodies are usually an afterthought of campus bookstore block letters, which is why an embroidered inside joke about emotional support and psychology coursework lands with immediate warmth. It turns late-night library fatigue into a wearable badge of solidarity."',
    'Honest Caveat Example: "Because the humor hinges on psychology-major identity, it works best for current students, recent grads, or self-aware therapy enthusiasts rather than someone who prefers minimalist, logo-free knitwear."',
    'Buying Consideration Example: "Unisex fleece sizing & fit preference — If the recipient prefers the relaxed, study-lounge drape typical of campus sweatshirts, consider sizing up one step from their fitted tee size."',
  ],
  avoidPhrasesAndApproaches: [
    'perfect gift for anyone',
    'sure to delight',
    'look no further',
    'elevate their everyday',
    'whether they are at home or on the go',
    'thoughtful and practical gift that checks every box',
    'game-changer',
    'must-have addition',
    'blend of style and functionality',
    'Repeating the same sentence or phrase across Why to Give It, Gift Verdict, and Extended Rationale',
    'Inventing fabric weights, dimensions, warranties, or retail prices not present in the source facts',
  ],
  sectionInstructions: {
    _type: 'aiWritingSectionInstructions',
    whyToGiveIt:
      'Open with the single sharpest observation about why this product succeeds as a gift. Contrast it briefly with what people usually buy in this category, and name the exact moment of recognition or utility it creates (2–3 sentences, 160–420 chars).',
    giftVerdict:
      'Structure the 4-part verdict so each field plays a distinct role: (1) editorialAssessment synthesizes the overall gift case; (2) standoutReason pinpoints the specific design, craft, or conceptual detail that separates it from generic alternatives; (3) recipientDelight describes the concrete moment the recipient uses, wears, or notices it; (4) importantCaveat gives one candid limitation (fit, niche humor, care, or unverified merchant detail).',
    idealRecipientProfile:
      'Write a vivid, specific portrait of who this suits best. Give `headline` a memorable persona label, use `narrative` to describe their habits and sensibilities without clichés, list 2–4 concrete `lifestyleNotes` cues, and specify `relationshipFit` (which giver-recipient pairings make this feel natural).',
    extendedGiftRationale:
      'Write 2–3 cohesive editorial paragraphs that deepen the central observation—exploring the social signal of the gift, the everyday ritual or context where it lives, and why the recipient would rarely buy it for themselves (or why receiving it from someone else feels special). Do not restate the Gift Verdict bullet points.',
    buyingConsiderations:
      'Provide 3–4 practical, decision-useful considerations (`title` + `detail` + `importance`). Address real buyer questions such as sizing/fit, care instructions, humor/aesthetic specificity, or verifying live price/stock on the merchant page when unverified.',
    occasionContextNotes:
      'Select 2–3 canonical occasions (`birthday`, `holidays`, `just-because`, `thank-you`, `housewarming`, `anniversary`) where this gift genuinely fits, and explain how to frame or present it for each occasion.',
    supportingMetadataAndSeo:
      'Write a crisp, magazine-style `subtitle` (60–130 chars), a concise `calloutTag` (under 45 chars), a direct `bestForSummary` (60–160 chars), accurate `detailsAndCare` based strictly on known facts, and natural, non-spammy `seoTitle` (<=60 chars) and `metaDescription` (<=155 chars).',
  },
  recommendedLengths: {
    _type: 'aiWritingLengthGuidance',
    subtitleRange: '60–130 characters (1 crisp sentence)',
    whyToGiveItRange: '160–420 characters (2–3 resonant sentences)',
    verdictAssessmentRange: '120–320 characters per verdict sub-field',
    recipientNarrativeRange: '140–360 characters + 2–4 specific lifestyle cues',
    extendedRationaleParagraphs: '2–3 paragraphs (220–500 characters each)',
    buyingConsiderationsCount: '3–4 distinct, practical considerations',
  },
  additionalCustomInstructions:
    'Prioritize psychological specificity over marketing adjectives. Every section should sound like it was written by a single thoughtful human editor who has examined the product details carefully.',
};

export const DEFAULT_ARTICLE_AI_WRITING_PROFILE: AiWritingProfileDocument = {
  _id: 'ai_profile_science_of_gifts_article_editorial',
  _type: 'aiWritingProfile',
  status: 'published',
  profileId: 'ai_profile_science_of_gifts_article_editorial',
  name: 'Article Editorial',
  contentType: 'article',
  isDefault: true,
  editorialVoiceAndStyle:
    'Write in the signature long-form essay voice of Science of Gifts: warm, observant, psychologically grounded, and culturally literate. Blend empirical behavioral research (giver-receiver asymmetries, ritual utility, relationship warmth) with vivid everyday domestic scenes, tactile detail, and gracious modern etiquette. Sound like a reflective feature essay in The New Yorker, Kinfolk, or NYT Magazine paired with clear, practical behavioral takeaways. Vary sentence rhythm naturally and never repeat sentences across sections.',
  writingObjectives: [
    'Open with a recognizable, concrete human scene or gifting tension rather than a generic dictionary definition or throat-clearing truism.',
    'Advance a clear, coherent thesis across 3 to 4 structured H2 sections—each exploring a distinct facet of the topic with zero repetitive filler.',
    'Ground empirical claims in verified studies from the Science of Gifts Research Bibliography using inline [cite:cit_id] markers without inventing fake DOIs, authors, or statistics.',
    'Translate psychological or social findings into concrete real-world habits, modern etiquette norms, and practical decision frameworks.',
    'Include 3–4 executive summary takeaways ("The Short Version"), an editorial callout box, a resonant pull quote, and search-clear SEO metadata.',
  ],
  preferredExamples: [
    'Opening Scene Example: "Watch anyone unwrap a gift in a crowded living room and you can see two completely different timelines colliding. The giver is holding their breath for the next four seconds—waiting for the widened eyes, the laugh, the theatrical gasp. The recipient is quietly calculating the next four years: Where will this live, and will I actually reach for it on a Tuesday morning?"',
    'Research Integration Example: "Behavioral scientists call this the smile-seeking gap: givers disproportionately choose dramatic, surprising items designed to maximize the moment of exchange, while recipients report significantly higher long-term appreciation for gifts that ease or elevate an existing daily routine [cite:cit_galak_2016_why_certain_gifts]."',
    'Practical Etiquette Example: "A true host gift should require zero immediate labor at the door. Uncut flowers force a busy cook to abandon a simmering pan to hunt for a vase and shears; a stoneware crock of cultured butter or a linen-wrapped pantry flight can be set straight on the counter for tomorrow morning."',
  ],
  avoidPhrasesAndApproaches: [
    'in today’s fast-paced world',
    'since the dawn of time',
    'moreover',
    'furthermore',
    'in conclusion',
    'delve into',
    'it is worth noting',
    'tapestry of',
    'unlock the secrets',
    'ultimate guide',
    'game-changer',
    'Repeating the same thesis sentence or transition phrase at the start or end of multiple H2 sections',
    'Inventing unverified academic citations, fake author names, or fabricated statistics',
  ],
  sectionInstructions: {
    _type: 'aiWritingSectionInstructions',
    whyToGiveIt:
      'Executive Summary ("The Short Version"): Provide 3–4 crisp, standalone bullet takeaways (1–2 sentences each) that synthesize the core behavioral insight and practical advice for readers who skim first.',
    giftVerdict:
      'Editorial Callout & Pull Quote: Craft one high-value `callout` box (`kicker`, `title`, `body`, `tone`) distilling a practical rule of thumb, plus one memorable `pullQuote` (`text` + `attribution`).',
    idealRecipientProfile:
      'Opening H2 Section (The Human Scene & Paradox): Introduce the lived tension, social awkwardness, or psychological puzzle with concrete sensory detail and a clear editorial angle.',
    extendedGiftRationale:
      'Middle H2 Sections (The Research & Mechanism): Unpack why givers and receivers behave the way they do, integrating verified `[cite:cit_id]` studies naturally and contrasting common mistakes with better mental models.',
    buyingConsiderations:
      'Closing H2 Section (Practical Framework & Etiquette): Give readers actionable habits, questions to ask before choosing a gift, or gracious scripts they can apply immediately.',
    occasionContextNotes:
      'Taxonomy & Cross-Linking: Select the most accurate `category`, `topics` (`gift-giving-psychology`, `relationships`, `decision-making`, `gift-etiquette`, `practical-gifting-advice`, `culture`), `recipients`, and `occasions`.',
    supportingMetadataAndSeo:
      'Write a magnetic, non-clickbait H1 `title` (25–95 chars), an insightful 1–2 sentence `subtitle` dek (60–240 chars), a search-clear `seoTitle` (40–65 chars), and a compelling `metaDescription` (110–158 chars).',
  },
  recommendedLengths: {
    _type: 'aiWritingLengthGuidance',
    subtitleRange: '80–220 characters (1–2 resonant sentences)',
    whyToGiveItRange: '3–4 Executive Summary bullets (110–220 chars each)',
    verdictAssessmentRange: 'Callout body: 140–320 characters; Pull quote: 60–180 characters',
    recipientNarrativeRange: '3 to 4 H2 sections per article',
    extendedRationaleParagraphs: '2 to 4 paragraphs per H2 section (220–520 characters each)',
    buyingConsiderationsCount: '1–3 inline research citations ([cite:cit_id]) where relevant',
  },
  additionalCustomInstructions:
    'Write like an empathetic, sharp-eyed human essayist. Every paragraph should earn its place with either a concrete observation, a verified behavioral insight, or a practical takeaway.',
};

