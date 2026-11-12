<script setup lang="ts">
import { useMessage } from 'naive-ui';
import type { SortableItem } from '../pdf-common/pdf-common';
import { downloadBlob, formatSize, loadPdfLib, nextId } from '../pdf-common/pdf-common';
import SortableFileList from '../pdf-common/sortable-file-list.vue';

const { t } = useI18n();
const message = useMessage();

interface Entry extends SortableItem { file: File }

const MAX_SIDE = 6000;
const PAGE_SIZES: Record<string, [number, number]> = { a4: [595.28, 841.89], letter: [612, 792] };

const entries = ref<Entry[]>([]);
const pageSize = ref<'fit' | 'a4' | 'letter'>('a4');
const margin = ref(20);
const isBusy = ref(false);

const sizeOptions = computed(() => [
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
  { value: 'fit', label: t('tools.image-to-pdf.sizeFit') },
]);
const marginOptions = computed(() => [
  { value: 0, label: t('tools.image-to-pdf.marginNone') },
  { value: 20, label: t('tools.image-to-pdf.marginSmall') },
  { value: 40, label: t('tools.image-to-pdf.marginNormal') },
]);

const items = computed({
  get: () => entries.value as SortableItem[],
  set: (value) => {
    const byId = new Map(entries.value.map(e => [e.id, e]));
    entries.value = value.map(v => byId.get(v.id)!);
  },
});

function addFiles(files: File[]) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      message.error(`${file.name}: ${t('tools.image-to-pdf.notAnImage')}`);
      continue;
    }
    entries.value.push({ id: nextId(), name: file.name, detail: formatSize(file.size), thumb: URL.createObjectURL(file), file });
  }
}

function remove(id: number) {
  const entry = entries.value.find(e => e.id === id);
  if (entry?.thumb) {
    URL.revokeObjectURL(entry.thumb);
  }
  entries.value = entries.value.filter(e => e.id !== id);
}

function clearAll() {
  entries.value.forEach(e => e.thumb && URL.revokeObjectURL(e.thumb));
  entries.value = [];
}

// Everything goes through a canvas so EXIF rotation is applied and formats pdf-lib cannot embed (webp, gif, bmp) work
async function encodeImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d')!;
  const isJpeg = file.type === 'image/jpeg';
  if (isJpeg) {
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), isJpeg ? 'image/jpeg' : 'image/png', 0.95));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), isJpeg };
}

async function convert() {
  if (!entries.value.length || isBusy.value) {
    return;
  }
  isBusy.value = true;
  try {
    const { PDFDocument } = await loadPdfLib();
    const doc = await PDFDocument.create();
    for (const entry of entries.value) {
      const { bytes, isJpeg } = await encodeImage(entry.file);
      const image = await (isJpeg ? doc.embedJpg(bytes) : doc.embedPng(bytes));
      if (pageSize.value === 'fit') {
        const page = doc.addPage([image.width * 0.75, image.height * 0.75]);
        page.drawImage(image, { x: 0, y: 0, width: image.width * 0.75, height: image.height * 0.75 });
        continue;
      }
      const [short, long] = PAGE_SIZES[pageSize.value];
      const landscape = image.width > image.height;
      const [pageWidth, pageHeight] = landscape ? [long, short] : [short, long];
      const page = doc.addPage([pageWidth, pageHeight]);
      const ratio = Math.min((pageWidth - margin.value * 2) / image.width, (pageHeight - margin.value * 2) / image.height);
      const width = image.width * ratio;
      const height = image.height * ratio;
      page.drawImage(image, { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height });
    }
    const out = await doc.save();
    downloadBlob(new Blob([out], { type: 'application/pdf' }), 'images.pdf');
    message.success(t('tools.image-to-pdf.done'));
  }
  catch {
    message.error(t('tools.image-to-pdf.failed'));
  }
  finally {
    isBusy.value = false;
  }
}

onBeforeUnmount(clearAll);
</script>

<template>
  <div>
    <c-file-upload
      multiple
      accept="image/*"
      :title="$t('tools.image-to-pdf.upload')"
      @files-upload="addFiles"
    />

    <div v-if="entries.length" mt-4>
      <SortableFileList v-model:items="items" :disabled="isBusy" @remove="remove" />
      <div mt-1 text-12px op-60>
        {{ $t('tools.image-to-pdf.dragHint') }}
      </div>

      <div mt-3 flex flex-wrap items-center gap-3>
        <n-select v-model:value="pageSize" :options="sizeOptions" :disabled="isBusy" style="width: 150px" />
        <n-select v-if="pageSize !== 'fit'" v-model:value="margin" :options="marginOptions" :disabled="isBusy" style="width: 150px" />
      </div>

      <div mt-3 flex gap-2>
        <c-button type="primary" class="solid-primary" :disabled="isBusy" @click="convert">
          {{ isBusy ? $t('tools.image-to-pdf.working') : $t('tools.image-to-pdf.convert') }}
        </c-button>
        <c-button :disabled="isBusy" @click="clearAll">
          {{ $t('tools.image-to-pdf.clear') }}
        </c-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.solid-primary {
  color: #fff !important;
  background-color: #18a058 !important;

  &:hover:not([disabled]) {
    background-color: #36ad6a !important;
  }

  &[disabled] {
    opacity: 0.6;
  }
}
</style>
