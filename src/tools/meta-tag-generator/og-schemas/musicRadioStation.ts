import type { OGSchemaType } from '../OGSchemaType.type';

export const musicRadioStation: OGSchemaType = {
  name: 'tools.og-meta-generator.sectionRadioStationDetails',
  elements: [
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelCreator',
      key: 'music:creator',
      placeholder: 'tools.og-meta-generator.phRadioCreator',
    },
  ],
};
