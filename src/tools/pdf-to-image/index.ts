import { Photo } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.pdf-to-image.title'),
  path: '/pdf-to-image',
  description: translate('tools.pdf-to-image.description'),
  keywords: ['pdf', 'image', 'png', 'jpg', 'jpeg', 'convert', 'screenshot', 'pdf to image', 'pdf to png', 'pdf to jpg'],
  component: () => import('./pdf-to-image.vue'),
  icon: Photo,
  createdAt: new Date('2026-11-12'),
});
