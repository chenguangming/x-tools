import { FileText } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.pdf-to-word.title'),
  path: '/pdf-to-word',
  description: translate('tools.pdf-to-word.description'),
  keywords: ['pdf', 'word', 'docx', 'convert', 'document', 'ocr', 'pdf to word', 'pdf to docx'],
  component: () => import('./pdf-to-word.vue'),
  icon: FileText,
  createdAt: new Date('2026-11-12'),
});
