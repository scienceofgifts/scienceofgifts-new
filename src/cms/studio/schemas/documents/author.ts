/**
 * Science of Gifts — Editorial Author Document Schema (`author`)
 */

import { defineField, defineType } from '../../sanityCore';

export const authorDocument = defineType({
  name: 'author',
  title: 'Editorial Author & Contributor',
  type: 'document',
  icon: 'User',
  description:
    'Editorial writer, behavioral researcher, or product curator referenced in Gift Guides and Stories.',
  initialValue: {
    isSampleAuthor: false,
  },
  fields: [
    defineField({
      name: 'authorId',
      title: 'Canonical Author ID (Immutable After Creation)',
      type: 'string',
      description:
        'Stable identifier (e.g. "author_clara_vance"). Locked once saved.',
      readOnly: ({ document, value }) =>
        Boolean(value && document && (document._createdAt || document._rev)),
      validation: (Rule) =>
        Rule.required().regex(/^author_[a-z0-9_]+$/, {
          name: 'author_<snake_case_id>',
        }),
    }),
    defineField({
      name: 'name',
      title: 'Full Name',
      type: 'string',
      validation: (Rule) => Rule.required().min(3).max(90),
    }),
    defineField({
      name: 'slug',
      title: 'Author Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 80 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Editorial Title / Role',
      type: 'string',
      description: 'E.g. "Behavioral Research Editor" or "Senior Curation Editor".',
      validation: (Rule) => Rule.required().min(3).max(110),
    }),
    defineField({
      name: 'bio',
      title: 'Editorial Biography',
      type: 'text',
      validation: (Rule) => Rule.required().min(20).max(450),
    }),
    defineField({
      name: 'avatar',
      title: 'Author Portrait Photograph',
      type: 'editorialImage',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'isSampleAuthor',
      title: 'Sample / Development Profile Flag',
      type: 'boolean',
      initialValue: false,
      description:
        'Enable only for placeholder development contributor profiles.',
      validation: (Rule) => Rule.optional(),
    }),
  ],
  preview: {
    select: {
      title: 'name',
      role: 'role',
      isSample: 'isSampleAuthor',
      media: 'avatar.asset',
    },
    prepare({ title, role, isSample, media }) {
      return {
        title: `${title || 'Untitled Author'}${isSample ? ' [SAMPLE]' : ''}`,
        subtitle: role || 'Editorial Contributor',
        media,
      };
    },
  },
});
