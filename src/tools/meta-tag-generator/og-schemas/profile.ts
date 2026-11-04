import type { OGSchemaType } from '../OGSchemaType.type';

export const profile: OGSchemaType = {
  name: 'tools.og-meta-generator.sectionProfile',
  elements: [
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelFirstName',
      placeholder: 'tools.og-meta-generator.phFirstName',
      key: 'profile:first_name',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelLastName',
      placeholder: 'tools.og-meta-generator.phLastName',
      key: 'profile:last_name',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelUsername',
      placeholder: 'tools.og-meta-generator.phUsername',
      key: 'profile:username',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelGender',
      placeholder: 'tools.og-meta-generator.phGender',
      key: 'profile:gender',
    },
  ],
};
