import { Crop } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.image-cropper.title'),
  path: '/image-cropper',
  description: translate('tools.image-cropper.description'),
  keywords: ['image', 'crop', 'cropper', 'resize', 'ratio', 'background', 'convert', 'png', 'jpg', 'jpeg', 'webp', 'compress'],
  component: () => import('./image-cropper.vue'),
  icon: Crop,
});
