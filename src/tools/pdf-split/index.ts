import { FileDiff } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.pdf-split.title'),
  path: '/pdf-split',
  description: translate('tools.pdf-split.description'),
  keywords: ['pdf', 'split', 'extract', 'pages', 'cut', 'pdf split', 'extract pages'],
  component: () => import('./pdf-split.vue'),
  icon: FileDiff,
  createdAt: new Date('2026-11-12'),
});
