import type { OGSchemaType } from '../OGSchemaType.type';

export const twitter: OGSchemaType = {
  name: 'tools.og-meta-generator.sectionTwitter',
  elements: [
    {
      type: 'select',
      options: [
        { label: 'tools.og-meta-generator.optSummary', value: 'summary' },
        { label: 'tools.og-meta-generator.optSummaryLargeImage', value: 'summary_large_image' },
        { label: 'tools.og-meta-generator.optApplication', value: 'app' },
        { label: 'tools.og-meta-generator.optPlayer', value: 'player' },
      ],
      label: 'tools.og-meta-generator.labelCardType',
      placeholder: 'tools.og-meta-generator.phCardType',
      key: 'twitter:card',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelSiteAccount',
      placeholder: 'tools.og-meta-generator.phSiteAccount',
      key: 'twitter:site',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelCreatorAccount',
      placeholder: 'tools.og-meta-generator.phCreatorAccount',
      key: 'twitter:creator',
    },
  ],
};
