import { FileExport } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.image-to-pdf.title'),
  path: '/image-to-pdf',
  description: translate('tools.image-to-pdf.description'),
  keywords: ['image', 'pdf', 'jpg', 'png', 'photo', 'convert', 'image to pdf', 'jpg to pdf', 'png to pdf', 'scan'],
  component: () => import('./image-to-pdf.vue'),
  icon: FileExport,
  createdAt: new Date('2026-11-12'),
});
