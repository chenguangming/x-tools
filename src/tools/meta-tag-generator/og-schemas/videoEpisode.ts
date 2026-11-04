import type { OGSchemaType } from '../OGSchemaType.type';
import { videoMovie } from './videoMovie';

export const videoEpisode: OGSchemaType = {
  name: 'tools.og-meta-generator.sectionVideoEpisodeDetails',
  elements: [
    ...videoMovie.elements,
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelSeries',
      key: 'video:series',
      placeholder: 'tools.og-meta-generator.phSeries',
    },
  ],
};
