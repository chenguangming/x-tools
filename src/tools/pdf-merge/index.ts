import { FilePlus } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.pdf-merge.title'),
  path: '/pdf-merge',
  description: translate('tools.pdf-merge.description'),
  keywords: ['pdf', 'merge', 'combine', 'join', 'concatenate', 'pdf merge'],
  component: () => import('./pdf-merge.vue'),
  icon: FilePlus,
  createdAt: new Date('2026-11-12'),
});
