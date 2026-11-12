/**
 * Science of Gifts — Research Citation Document Schema (`researchCitation`)
 */

import { defineField, defineType } from '../../sanityCore';

export const researchCitationDocument = defineType({
  name: 'researchCitation',
  title: 'Research Citation & Academic Study',
  type: 'document',
  icon: 'GraduationCap',
  description:
    'Verified peer-reviewed study or empirical behavioral paper referenced across Stories, Gift Guides, and Product Profiles. Fabricated citations are strictly prohibited.',
  initialValue: {
    verificationStatus: 'verified-doi',
  },
  fields: [
    defineField({
      name: 'citationId',
      title: 'Canonical Citation ID (Immutable After Creation)',
      type: 'string',
      description:
        'Stable identifier used in `[cite:cit_id]` markers (e.g. "cit_flynn_adams_2009"). Locked once saved.',
      readOnly: ({ document, value }) =>
        Boolean(value && document && (document._createdAt || document._rev)),
      validation: (Rule) =>
        Rule.required().regex(/^cit_[a-z0-9_]+$/, {
          name: 'cit_<snake_case_id>',
        }),
    }),
    defineField({
      name: 'title',
      title: 'Study Title',
      type: 'string',
      validation: (Rule) => Rule.required().min(5).max(260),
    }),
    defineField({
      name: 'authors',
      title: 'Authors',
      type: 'string',
      description: 'Formatted author list (e.g. "Flynn, F. J., & Adams, G. S.").',
      validation: (Rule) => Rule.required().min(3).max(200),
    }),
    defineField({
      name: 'year',
      title: 'Publication Year',
      type: 'number',
      validation: (Rule) => Rule.required().min(1900).max(2035).integer(),
    }),
    defineField({
      name: 'publication',
      title: 'Journal / Publication & Bibliographic Details',
      type: 'string',
      description:
        'Journal name, volume, issue, and page range (e.g. "Journal of Experimental Social Psychology, 45(2), 404–409").',
      validation: (Rule) => Rule.required().min(4).max(240),
    }),
    defineField({
      name: 'doiOrUrl',
      title: 'DOI or Canonical Study URL (HTTPS)',
      type: 'url',
      validation: (Rule) => Rule.required().uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'keyFinding',
      title: 'Plain-Language Study Finding Summary',
      type: 'text',
      description:
        'Displayed inside interactive citation popovers and article reference cards.',
      validation: (Rule) => Rule.required().min(30).max(550),
    }),
    defineField({
      name: 'limitations',
      title: 'Context, Scope & Limitations (Optional)',
      type: 'text',
      description:
        'Clarifies sample context or boundaries so editorial claims do not overstate laboratory findings.',
      validation: (Rule) => Rule.optional().max(450),
    }),
    defineField({
      name: 'verificationStatus',
      title: 'Verification Status',
      type: 'string',
      initialValue: 'verified-doi',
      options: {
        list: [
          { title: 'Verified DOI / Academic Source (verified-doi)', value: 'verified-doi' },
          { title: 'Sample / Development Fixture (sample-fixture)', value: 'sample-fixture' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
  ],
  orderings: [
    {
      title: 'Publication Year (Newest First)',
      name: 'yearDesc',
      by: [{ field: 'year', direction: 'desc' }],
    },
    {
      title: 'Authors (A–Z)',
      name: 'authorsAsc',
      by: [{ field: 'authors', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      authors: 'authors',
      year: 'year',
      title: 'title',
      publication: 'publication',
      citationId: 'citationId',
    },
    prepare({ authors, year, title, publication, citationId }) {
      return {
        title: `${authors || 'Unknown Authors'} (${year || 'n.d.'}) — ${title || 'Untitled Study'}`,
        subtitle: `${citationId ? `[${citationId}] ` : ''}${publication || ''}`,
      };
    },
  },
});
