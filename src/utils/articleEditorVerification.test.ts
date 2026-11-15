import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:3000';

describe('Science of Gifts — Official Sanity Studio Article Editor 9-Step End-to-End Verification', () => {
  it('completes the full 9-step disposable article authoring, AI generation, rich-text editing, preview, publish, and unpublish workflow', async () => {
    // Acquire Studio Session & CSRF credentials
    const sessionRes = await fetch(`${BASE_URL}/api/studio/sanity/session`, {
      headers: { Accept: 'application/json' },
    });
    assert.equal(sessionRes.status, 200, 'Should retrieve Studio session credentials');
    const sessionData = await sessionRes.json();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Sanity-Studio-Token': sessionData.sessionCredentials.sessionToken,
      'X-Sanity-Studio-Csrf': sessionData.sessionCredentials.csrfToken,
      'X-Studio-Session': sessionData.sessionCredentials.sessionToken,
      'X-Studio-CSRF': sessionData.sessionCredentials.csrfToken,
    };

    // Verify Article Editorial AI Writing Profile is seeded and editable in Sanity
    const profilesRes = await fetch(`${BASE_URL}/api/studio/sanity/ai-profiles`, {
      headers,
    });
    assert.equal(profilesRes.status, 200, 'Should list AI writing profiles');
    const profilesData = await profilesRes.json();
    const articleProfile = (profilesData.profiles || []).find(
      (p: any) =>
        p._id === 'ai_profile_science_of_gifts_article_editorial' ||
        p.contentType === 'article'
    );
    assert.ok(
      articleProfile,
      'Should have seeded the default "Article Editorial" AI Writing Profile'
    );
    assert.equal(articleProfile.name, 'Article Editorial');

    // =========================================================================
    // STEP 1: Create a disposable sample article (Draft)
    // =========================================================================
    const timestampSuffix = Date.now().toString(36);
    const canonicalArticleId = `art_sample_disposable_${timestampSuffix}`;
    const draftDocId = `drafts.${canonicalArticleId}`;
    const sampleSlug = `the-psychology-of-handwritten-gift-notes-${timestampSuffix}`;

    const initialDraft = {
      _id: draftDocId,
      _type: 'article',
      id: canonicalArticleId,
      title: 'Why Handwritten Gift Notes Outlast the Object Itself',
      subtitle:
        'Behavioral research reveals how a three-sentence inscription transforms an everyday gift into a lasting relational anchor.',
      slug: { _type: 'slug', current: sampleSlug },
      status: 'draft',
      featured: false,
      category: 'Gift-Giving Psychology',
      topics: ['gift-giving-psychology', 'meaningful-gifting'],
      recipients: ['partner', 'friend'],
      occasions: ['birthday', 'thank-you'],
      author: { _type: 'reference', _ref: 'author_elena_vance' },
      publishedAt: '2026-04-19',
      updatedAt: '2026-04-19',
      readTimeMinutes: 6,
      heroImage: {
        _type: 'editorialImage',
        url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
        alt: 'Fountain pen resting beside a cream cotton correspondence card on a walnut desk',
        caption:
          'A brief handwritten note shifts the recipient’s focus from market price to shared memory.',
      },
      executiveSummary: [
        'Recipients retain handwritten accompaniment cards far longer than packaging or receipts.',
        'Specificity of shared memory matters far more than poetic length.',
      ],
      sections: [
        {
          _key: 'sec_initial_1',
          _type: 'articleContentSection',
          id: 'initial-section',
          heading: 'The Asymmetry Between Object and Inscription',
          paragraphs: [
            'Gift givers spend ninety percent of their energy selecting the physical object and less than two minutes signing the card.',
          ],
        },
      ],
      citations: [
        {
          _key: 'cit_ref_1',
          _type: 'reference',
          _ref: 'cit_zhang_ewig_2021_affective',
        },
      ],
      seo: {
        _type: 'seoMetadata',
        seoTitle: 'Why Handwritten Gift Notes Outlast the Object Itself',
        metaDescription:
          'Discover the behavioral psychology behind handwritten gift notes and why three specific sentences create lasting emotional resonance.',
        canonicalPath: `/articles/${sampleSlug}/`,
        indexable: true,
      },
    };

    try {
      const saveStep1Res = await fetch(`${BASE_URL}/api/studio/sanity/save-draft`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ document: initialDraft }),
      });
      assert.equal(saveStep1Res.status, 200, 'Step 1: Should save disposable draft article');
      const saveStep1Data = await saveStep1Res.json();
      assert.equal(saveStep1Data.ok, true);
      const step1SavedDoc = saveStep1Data.persistedDocument || saveStep1Data.savedDocument;

      // Confirm draft is NOT publicly accessible on Astro before publishing
      const draftPublicCheck = await fetch(`${BASE_URL}/articles/${sampleSlug}/`);
      assert.equal(
        draftPublicCheck.status,
        404,
        'Step 1: Unapproved draft article must return 404 on public Astro route'
      );

      // =========================================================================
      // STEP 2: Generate its body with AI (plus Improve with AI & Brief Export/Import)
      // =========================================================================
      const aiGenRes = await fetch(`${BASE_URL}/api/studio/sanity/ai-article-generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic: 'The Behavioral Psychology of Handwritten Gift Notes and Epistolary Rituals',
          editorialAngle:
            'Why a concrete three-sentence observation on heavy cotton cardstock anchors relational memory far better than an expensive uninscribed object.',
          researchNotes:
            'Reference affective forecasting asymmetries (cit_zhang_ewig_2021_affective) and interpersonal calibration (cit_gino_flynn_2011_explicit). Avoid generic greeting-card clichés.',
          category: 'Gift-Giving Psychology',
          targetSectionCount: 3,
          writingProfileId: articleProfile._id,
          currentDocument: step1SavedDoc,
        }),
      });
      assert.equal(aiGenRes.status, 200, 'Step 2: AI article generation endpoint should succeed');
      const aiGenData = await aiGenRes.json();
      assert.equal(aiGenData.ok, true, 'Step 2: AI generation should return ok: true');
      assert.ok(
        Array.isArray(aiGenData.proposedFields?.sections) &&
          aiGenData.proposedFields.sections.length >= 3,
        'Step 2: AI generation should produce at least 3 coherent article sections'
      );
      assert.ok(
        Array.isArray(aiGenData.proposedFields?.bodyPortableText) &&
          aiGenData.proposedFields.bodyPortableText.length > 0,
        'Step 2: AI generation should produce synchronized Portable Text blocks'
      );
      assert.ok(
        aiGenData.proposedFields?.seo?.seoTitle,
        'Step 2: AI generation should produce supporting SEO metadata'
      );

      // Also test "Improve with AI" on the first generated section
      const firstGenSection = aiGenData.proposedFields.sections[0];
      const aiImproveRes = await fetch(`${BASE_URL}/api/studio/sanity/ai-article-improve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'rewrite_polish',
          targetSectionId: firstGenSection.id,
          topic: aiGenData.proposedFields.title,
          editorialAngle: aiGenData.proposedFields.subtitle,
          revisionGoals: 'Tighten the opening cadence and emphasize tactile permanence.',
          writingProfileId: articleProfile._id,
          currentDocument: {
            ...step1SavedDoc,
            ...aiGenData.proposedFields,
          },
        }),
      });
      assert.equal(aiImproveRes.status, 200, 'Step 2b: Improve with AI endpoint should succeed');
      const aiImproveData = await aiImproveRes.json();
      assert.equal(aiImproveData.ok, true);
      assert.ok(Array.isArray(aiImproveData.fieldDiffs) && aiImproveData.fieldDiffs.length > 0);

      // Also verify Brief Export & Import
      const briefExportRes = await fetch(
        `${BASE_URL}/api/studio/sanity/ai-article-export-brief`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            mode: 'revision',
            topic: aiGenData.proposedFields.title,
            editorialAngle: aiGenData.proposedFields.subtitle,
            writingProfileId: articleProfile._id,
            currentDocument: {
              ...step1SavedDoc,
              ...aiGenData.proposedFields,
            },
          }),
        }
      );
      assert.equal(briefExportRes.status, 200, 'Step 2c: Export brief should succeed');
      const briefExportData = await briefExportRes.json();
      assert.ok(
        briefExportData.markdownBrief.includes('# Science of Gifts — Article Revision Brief'),
        'Exported brief should include structured Markdown revision brief header'
      );

      // =========================================================================
      // STEP 3 & STEP 4: Manually edit H2/H3 headings & paragraphs, insert image
      // (with caption + alt text), link, citation, and callout, and reorder sections
      // =========================================================================
      const aiSections = [...aiGenData.proposedFields.sections];
      // Edit Section 1 H2 heading, H3 subheading, and paragraphs with bold, italic, link, image, citation, and callout
      aiSections[0] = {
        ...aiSections[0],
        id: 'cognitive-permanence-of-ink',
        heading: 'The Cognitive Permanence of Physical Ink on Cotton Paper',
        subheading: 'Why Three Unhurried Sentences Outperform Lavish Packaging',
        paragraphs: [
          'When we examine **affective durability** in gift exchanges, *tactile correspondence* consistently anchors the recipient’s long-term recall [cite:cit_zhang_ewig_2021_affective]. You can explore our companion archive in the [Thoughtful Gift Guides](/guides/) collection.',
          'Rather than offering generic praise, name the exact moment during the past year when the recipient’s judgment or generosity changed your own thinking.',
        ],
        images: [
          {
            _key: 'inline_img_1',
            _type: 'editorialImage',
            id: 'inline_img_1',
            url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1000&q=80',
            alt: 'Handwritten archival note sealed in a heavy cream envelope beside linen ribbon',
            caption:
              'Figure 1: Archival correspondence cards transform an everyday object into a dated keepsake.',
          },
        ],
        callout: {
          _type: 'articleCallout',
          kicker: 'The Three-Sentence Rule',
          title: 'How to Structure a Lasting Gift Note',
          body: 'Sentence 1: Recall a shared moment. Sentence 2: Explain why this specific object belongs in their hands. Sentence 3: Offer a forward-looking wish without obligation.',
        },
      };

      // Reorder sections (swap section 2 and section 3) to verify section reordering
      if (aiSections.length >= 3) {
        const temp = aiSections[1];
        aiSections[1] = aiSections[2];
        aiSections[2] = temp;
      }

      const editedDraft = {
        ...step1SavedDoc,
        ...aiGenData.proposedFields,
        _id: draftDocId,
        _type: 'article',
        _rev: step1SavedDoc._rev,
        id: canonicalArticleId,
        slug: { _type: 'slug', current: sampleSlug },
        title: 'Why Handwritten Gift Notes Outlast the Object Itself',
        subtitle:
          'Behavioral research reveals how a three-sentence inscription transforms an everyday gift into a lasting relational anchor.',
        sections: aiSections,
        seo: {
          _type: 'seoMetadata',
          seoTitle: 'Why Handwritten Gift Notes Outlast the Object Itself',
          metaDescription:
            'Discover the behavioral psychology behind handwritten gift notes and why three specific sentences create lasting emotional resonance.',
          canonicalPath: `/articles/${sampleSlug}/`,
          indexable: true,
        },
      };

      // =========================================================================
      // STEP 5: Save and reload from Sanity Content Lake
      // =========================================================================
      const saveStep5Res = await fetch(`${BASE_URL}/api/studio/sanity/save-draft`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ document: editedDraft }),
      });
      assert.equal(saveStep5Res.status, 200, 'Step 5: Should save edited article draft');
      const saveStep5Data = await saveStep5Res.json();
      assert.equal(saveStep5Data.ok, true);

      const reloadRes = await fetch(
        `${BASE_URL}/api/studio/sanity/document?id=${encodeURIComponent(canonicalArticleId)}`,
        { headers }
      );
      assert.equal(reloadRes.status, 200, 'Step 5: Should reload saved draft from Sanity');
      const reloadData = await reloadRes.json();
      const reloadedDraft = reloadData.draft || reloadData.published;
      assert.ok(reloadedDraft, 'Step 5: Reloaded draft must exist');
      assert.equal(
        reloadedDraft.sections[0].heading,
        'The Cognitive Permanence of Physical Ink on Cotton Paper',
        'Step 5: Reloaded section H2 heading must match manual edit'
      );
      assert.equal(
        reloadedDraft.sections[0].subheading,
        'Why Three Unhurried Sentences Outperform Lavish Packaging',
        'Step 5: Reloaded section H3 subheading must match manual edit'
      );
      assert.equal(
        reloadedDraft.sections[0].images[0].alt,
        'Handwritten archival note sealed in a heavy cream envelope beside linen ribbon',
        'Step 5: Reloaded inline image alt text must persist'
      );
      assert.ok(
        Array.isArray(reloadedDraft.sections[0].portableTextBody) &&
          reloadedDraft.sections[0].portableTextBody.length > 0,
        'Step 5: Reloaded section must contain synchronized Portable Text blocks'
      );

      // =========================================================================
      // STEP 6: Preview it on Astro
      // =========================================================================
      const ticketRes = await fetch(`${BASE_URL}/api/studio/sanity/preview-ticket`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ documentId: draftDocId }),
      });
      assert.equal(ticketRes.status, 200, 'Step 6: Should issue signed preview ticket');
      const ticketData = await ticketRes.json();
      assert.ok(ticketData.ticket, 'Step 6: Should receive preview ticket string');

      const previewRes = await fetch(
        `${BASE_URL}/api/studio/sanity/preview-article?id=${encodeURIComponent(
          draftDocId
        )}&ticket=${encodeURIComponent(ticketData.ticket)}`,
        { headers }
      );
      assert.equal(previewRes.status, 200, 'Step 6: Astro article preview route should return 200');
      const previewHtml = await previewRes.text();
      assert.ok(
        previewHtml.includes('The Cognitive Permanence of Physical Ink on Cotton Paper'),
        'Step 6: Astro preview HTML must contain edited H2 heading'
      );
      assert.ok(
        previewHtml.includes('Why Three Unhurried Sentences Outperform Lavish Packaging'),
        'Step 6: Astro preview HTML must contain edited H3 subheading'
      );
      assert.ok(
        previewHtml.includes('Thoughtful Gift Guides') &&
          previewHtml.includes('href="/guides/"'),
        'Step 6: Astro preview HTML must render inserted inline link'
      );
      assert.ok(
        previewHtml.includes(
          'Figure 1: Archival correspondence cards transform an everyday object into a dated keepsake.'
        ),
        'Step 6: Astro preview HTML must render inserted inline image caption'
      );
      assert.ok(
        previewHtml.includes('How to Structure a Lasting Gift Note'),
        'Step 6: Astro preview HTML must render editorial callout'
      );

      // =========================================================================
      // STEP 7: Publish it
      // =========================================================================
      const publishRes = await fetch(`${BASE_URL}/api/studio/sanity/publish-article`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ documentId: canonicalArticleId }),
      });
      assert.equal(publishRes.status, 200, 'Step 7: Should publish article to Sanity Content Lake');
      const publishData = await publishRes.json();
      assert.equal(publishData.ok, true, 'Step 7: Publish response should be ok: true');
      assert.equal(publishData.publishedDocument?.status, 'published');

      // =========================================================================
      // STEP 8: Confirm the page displays properly on Astro (/articles/[slug]/ & /articles/)
      // =========================================================================
      const publicArticleRes = await fetch(`${BASE_URL}/articles/${sampleSlug}/`);
      assert.equal(
        publicArticleRes.status,
        200,
        'Step 8: Published article must be publicly accessible at /articles/[slug]/'
      );
      const publicArticleHtml = await publicArticleRes.text();
      assert.ok(
        publicArticleHtml.includes('Why Handwritten Gift Notes Outlast the Object Itself'),
        'Step 8: Public Astro page must render article H1 title'
      );
      assert.ok(
        publicArticleHtml.includes('The Cognitive Permanence of Physical Ink on Cotton Paper'),
        'Step 8: Public Astro page must render edited H2 section heading'
      );
      assert.ok(
        publicArticleHtml.includes('Why Three Unhurried Sentences Outperform Lavish Packaging'),
        'Step 8: Public Astro page must render edited H3 subheading'
      );
      assert.ok(
        publicArticleHtml.includes(
          'Figure 1: Archival correspondence cards transform an everyday object into a dated keepsake.'
        ),
        'Step 8: Public Astro page must render inserted image caption'
      );
      assert.ok(
        publicArticleHtml.includes('href="/guides/"'),
        'Step 8: Public Astro page must render inserted link'
      );

      const articlesIndexRes = await fetch(`${BASE_URL}/articles/`);
      assert.equal(articlesIndexRes.status, 200);
      const articlesIndexHtml = await articlesIndexRes.text();
      assert.ok(
        articlesIndexHtml.includes(`/articles/${sampleSlug}/`),
        'Step 8: Public /articles/ index page must list the newly published article'
      );

      // Verify Edit & Republish lifecycle
      const republishedDraft = {
        ...publishData.publishedDocument,
        _id: draftDocId,
        subtitle:
          'Updated after publication: How a three-sentence inscription transforms an everyday gift into a lasting relational anchor.',
      };
      await fetch(`${BASE_URL}/api/studio/sanity/save-draft`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ document: republishedDraft }),
      });
      const republishRes = await fetch(`${BASE_URL}/api/studio/sanity/publish-article`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ documentId: canonicalArticleId }),
      });
      assert.equal(republishRes.status, 200, 'Step 8b: Edit and republish should succeed');
      const updatedPublicRes = await fetch(`${BASE_URL}/articles/${sampleSlug}/`);
      const updatedPublicHtml = await updatedPublicRes.text();
      assert.ok(
        updatedPublicHtml.includes('Updated after publication:'),
        'Step 8b: Republished edit must appear immediately on public Astro page'
      );

      // =========================================================================
      // STEP 9: Unpublish it and confirm it is no longer publicly accessible
      // =========================================================================
      const unpublishRes = await fetch(`${BASE_URL}/api/studio/sanity/unpublish-article`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ documentId: canonicalArticleId }),
      });
      assert.equal(unpublishRes.status, 200, 'Step 9: Should unpublish article in Sanity');
      const unpublishData = await unpublishRes.json();
      assert.equal(unpublishData.ok, true);

      const afterUnpublishPageRes = await fetch(`${BASE_URL}/articles/${sampleSlug}/`);
      assert.equal(
        afterUnpublishPageRes.status,
        404,
        'Step 9: Unpublished article must return 404 on /articles/[slug]/'
      );

      const afterUnpublishIndexRes = await fetch(`${BASE_URL}/articles/`);
      const afterUnpublishIndexHtml = await afterUnpublishIndexRes.text();
      assert.equal(
        afterUnpublishIndexHtml.includes(`/articles/${sampleSlug}/`),
        false,
        'Step 9: Unpublished article must no longer appear on /articles/ index'
      );
    } finally {
      // Clean up disposable test article from Sanity Content Lake so no test artifacts remain
      await fetch(`${BASE_URL}/api/studio/sanity/delete-disposable-article`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ documentId: canonicalArticleId }),
      });
    }
  });
});
