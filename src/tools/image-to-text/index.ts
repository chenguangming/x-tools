import { Typography } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.image-to-text.title'),
  path: '/image-to-text',
  description: translate('tools.image-to-text.description'),
  keywords: ['ocr', 'image', 'text', 'recognize', 'recognition', 'screenshot', 'extract', 'scan', 'photo', 'picture to text'],
  component: () => import('./image-to-text.vue'),
  icon: Typography,
  createdAt: new Date('2026-11-12'),
});
