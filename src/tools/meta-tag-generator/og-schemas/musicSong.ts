import type { OGSchemaType } from '../OGSchemaType.type';

export const musicSong: OGSchemaType = {
  name: 'tools.og-meta-generator.sectionSongDetails',
  elements: [
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelDuration',
      placeholder: 'tools.og-meta-generator.phSongDuration',
      key: 'music:duration',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelAlbum',
      placeholder: 'tools.og-meta-generator.phSongAlbum',
      key: 'music:album',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelDisc',
      placeholder: 'tools.og-meta-generator.phSongDisc',
      key: 'music:album:disk',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelTrack',
      placeholder: 'tools.og-meta-generator.phSongTrack',
      key: 'music:album:track',
    },
    {
      type: 'input-multiple',
      label: 'tools.og-meta-generator.labelMusician',
      placeholder: 'tools.og-meta-generator.phMusician',
      key: 'music:musician',
    },
  ],
};
