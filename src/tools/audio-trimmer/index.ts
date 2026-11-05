import { Cut } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.audio-trimmer.title'),
  path: '/audio-trimmer',
  description: translate('tools.audio-trimmer.description'),
  keywords: ['audio', 'trim', 'cut', 'crop', 'clip', 'mp3', 'wav', 'music', 'ringtone', 'sound'],
  component: () => import('./audio-trimmer.vue'),
  icon: Cut,
  createdAt: new Date('2026-11-05'),
});
