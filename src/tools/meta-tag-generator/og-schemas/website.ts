import type { OGSchemaType } from '../OGSchemaType.type';

const typeOptions = [
  { label: 'tools.og-meta-generator.optWebsite', value: 'website' },
  { label: 'tools.og-meta-generator.optArticle', value: 'article' },
  { label: 'tools.og-meta-generator.optBook', value: 'book' },
  { label: 'tools.og-meta-generator.optProfile', value: 'profile' },
  {
    type: 'group',
    label: 'tools.og-meta-generator.optGroupMusic',
    key: 'Music',
    children: [
      { label: 'tools.og-meta-generator.optSong', value: 'music.song' },
      { label: 'tools.og-meta-generator.optMusicAlbum', value: 'music.album' },
      { label: 'tools.og-meta-generator.optPlaylist', value: 'music.playlist' },
      { label: 'tools.og-meta-generator.optRadioStation', value: 'music.radio_station' },
    ],
  },
  {
    type: 'group',
    label: 'tools.og-meta-generator.optGroupVideo',
    key: 'Video',
    children: [
      { label: 'tools.og-meta-generator.optMovie', value: 'video.movie' },
      { label: 'tools.og-meta-generator.optEpisode', value: 'video.episode' },
      { label: 'tools.og-meta-generator.optTvShow', value: 'video.tv_show' },
      { label: 'tools.og-meta-generator.optOtherVideo', value: 'video.other' },
    ],
  },
];

export const website: OGSchemaType = {
  name: 'tools.og-meta-generator.sectionGeneralInformation',
  elements: [
    {
      type: 'select',
      label: 'tools.og-meta-generator.labelPageType',
      placeholder: 'tools.og-meta-generator.phPageType',
      key: 'type',
      options: typeOptions,
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelTitle',
      placeholder: 'tools.og-meta-generator.phTitle',
      key: 'title',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelDescription',
      placeholder: 'tools.og-meta-generator.phDescription',
      key: 'description',
    },
    {
      type: 'input',
      label: 'tools.og-meta-generator.labelPageUrl',
      placeholder: 'tools.og-meta-generator.phPageUrl',
      key: 'url',
    },
  ],
};
