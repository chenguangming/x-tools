import { IdBadge } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.id-photo.title'),
  path: '/id-photo',
  description: translate('tools.id-photo.description'),
  keywords: ['id', 'photo', 'passport', 'visa', 'portrait', 'crop', 'size', 'background', 'blue', 'red', 'white', 'inch', 'zhengjianzhao'],
  component: () => import('./id-photo.vue'),
  icon: IdBadge,
  createdAt: new Date('2026-11-04'),
});
