import type { OGSchemaType } from '../OGSchemaType.type';

export const musicPlaylist: OGSchemaType = {
  name: 'tools.og-meta-generator.sectionPlaylistDetails',
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
      label: 'tools.og-meta-generator.labelCreator',
      key: 'music:creator',
      placeholder: 'tools.og-meta-generator.phPlaylistCreator',
    },
  ],
};
