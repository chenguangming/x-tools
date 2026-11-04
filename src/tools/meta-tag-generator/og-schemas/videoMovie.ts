import type { OGSchemaType } from '../OGSchemaType.type';

export const videoMovie: OGSchemaType = {
  name: 'tools.og-meta-generator.sectionMovieDetails',
  elements: [
    {
      type: 'input-multiple',
      label: 'tools.og-meta-generator.labelActor',
      key: 'video:actor',
      placeholder: 'tools.og-meta-generator.phActor',
    },
    {
      type: 'input-multiple',
      label: 'tools.og-meta-generator.labelDirector',
      key: 'video:director',
      placeholder: 'tools.og-meta-generator.phDirector',
    },
    {
      type: 'input-multiple',
      label: 'tools.og-meta-generator.labelWriter',
      key: 'video:writer',
      placeholder: 'tools.og-meta-generator.phWriter',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelDuration',
      key: 'video:duration',
      placeholder: 'tools.og-meta-generator.phMovieDuration',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelReleaseDate',
      key: 'video:release_date',
      placeholder: 'tools.og-meta-generator.phMovieReleaseDate',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelTag',
      key: 'video:tag',
      placeholder: 'tools.og-meta-generator.phMovieTag',
    },
  ],
};
