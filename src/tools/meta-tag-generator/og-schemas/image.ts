import type { OGSchemaType } from '../OGSchemaType.type';

export const image: OGSchemaType = {
  name: 'tools.og-meta-generator.sectionImage',
  elements: [
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelImageUrl',
      placeholder: 'tools.og-meta-generator.phImageUrl',
      key: 'image',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelImageAlt',
      placeholder: 'tools.og-meta-generator.phImageAlt',
      key: 'image:alt',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelWidth',
      placeholder: 'tools.og-meta-generator.phWidth',
      key: 'image:width',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelHeight',
      placeholder: 'tools.og-meta-generator.phHeight',
      key: 'image:height',
    },
  ],
};
