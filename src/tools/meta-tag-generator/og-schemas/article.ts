import type { OGSchemaType } from '../OGSchemaType.type';

export const article: OGSchemaType = {
  name: 'tools.og-meta-generator.sectionArticle',
  elements: [
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelPublishingDate',
      key: 'article:published_time',
      placeholder: 'tools.og-meta-generator.phPublishingDate',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelModificationDate',
      key: 'article:modified_time',
      placeholder: 'tools.og-meta-generator.phModificationDate',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelExpirationDate',
      key: 'article:expiration_time',
      placeholder: 'tools.og-meta-generator.phExpirationDate',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelAuthor',
      key: 'article:author',
      placeholder: 'tools.og-meta-generator.phArticleAuthor',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelSection',
      key: 'article:section',
      placeholder: 'tools.og-meta-generator.phArticleSection',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelTag',
      key: 'article:tag',
      placeholder: 'tools.og-meta-generator.phArticleTag',
    },
  ],
};
