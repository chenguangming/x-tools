import type { OGSchemaType } from '../OGSchemaType.type';

export const musicAlbum: OGSchemaType = {
  name: 'tools.og-meta-generator.sectionAlbumDetails',
  elements: [
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelSong',
      key: 'music:song',
      placeholder: 'tools.og-meta-generator.phAlbumSong',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelDisc',
      key: 'music:song:disc',
      placeholder: 'tools.og-meta-generator.phDiscReverse',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelTrack',
      key: 'music:song:track',
      placeholder: 'tools.og-meta-generator.phTrackReverse',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelMusician',
      key: 'music:musician',
      placeholder: 'tools.og-meta-generator.phMusician',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelReleaseDate',
      key: 'music:release_date',
      placeholder: 'tools.og-meta-generator.phAlbumReleaseDate',
    },
  ],
};
