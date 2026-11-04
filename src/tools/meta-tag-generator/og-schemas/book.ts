import type { OGSchemaType } from '../OGSchemaType.type';

export const book: OGSchemaType = {
  name: 'tools.og-meta-generator.sectionBook',
  elements: [
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelAuthor',
      key: 'book:author',
      placeholder: 'tools.og-meta-generator.phBookAuthor',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelIsbn',
      key: 'book:isbn',
      placeholder: 'tools.og-meta-generator.phIsbn',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelReleaseDate',
      key: 'book:release_date',
      placeholder: 'tools.og-meta-generator.phBookReleaseDate',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelTag',
      key: 'book:tag',
      placeholder: 'tools.og-meta-generator.phBookTag',
    },
  ],
};
