<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { baseName, downloadBlob, formatSize, loadFflate, parsePageRanges } from '../pdf-common/pdf-common';
import type { PdfDocument } from '../pdf-to-word/pdf-to-word.service';
import { openPdf } from '../pdf-to-word/pdf-to-word.service';

const { t } = useI18n();
const message = useMessage();

interface Result { page: number; url: string; blob: Blob; width: number; height: number }

const MAX_SIDE = 8000;

const file = ref<File | null>(null);
const pageCount = ref(0);
const format = ref<'png' | 'jpeg'>('png');
const scale = ref(2);
const ranges = ref('');
const isBusy = ref(false);
const progress = ref(0);
const results = ref<Result[]>([]);

let pdf: PdfDocument | null = null;
let cancelled = false;

const formatOptions = [{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPG' }];
const scaleOptions = computed(() => [
  { value: 1, label: t('tools.pdf-to-image.scaleStandard') },
  { value: 2, label: t('tools.pdf-to-image.scaleHigh') },
  { value: 3, label: t('tools.pdf-to-image.scaleUltra') },
]);

function clearResults() {
  results.value.forEach(r => URL.revokeObjectURL(r.url));
  results.value = [];
}

async function closePdf() {
  const old = pdf;
  pdf = null;
  await old?.destroy().catch(() => {});
}

async function setFile(selected: File) {
  if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
    message.error(t('tools.pdf-to-image.notAPdf'));
    return;
  }
  clearResults();
  await closePdf();
  try {
    pdf = await openPdf(await selected.arrayBuffer());
    pageCount.value = pdf.numPages;
    file.value = selected;
    ranges.value = '';
  }
  catch (error) {
    message.error((error as { name?: string })?.name === 'PasswordException'
      ? t('tools.pdf-to-image.encrypted')
      : t('tools.pdf-to-image.openFailed'));
  }
}

async function chooseAnother() {
  cancelled = true;
  clearResults();
  await closePdf();
  file.value = null;
  pageCount.value = 0;
}

async function convert() {
  if (!pdf || isBusy.value) {
    return;
  }
  const indices = ranges.value.trim()
    ? parsePageRanges(ranges.value, pageCount.value)
    : Array.from({ length: pageCount.value }, (_, i) => i);
  if (!indices) {
    message.error(t('tools.pdf-to-image.invalidRange', { total: pageCount.value }));
    return;
  }
  cancelled = false;
  isBusy.value = true;
  progress.value = 0;
  clearResults();
  try {
    const mime = format.value === 'png' ? 'image/png' : 'image/jpeg';
    for (const [i, index] of indices.entries()) {
      if (cancelled) {
        break;
      }
      const page = await pdf.getPage(index + 1);
      const base = page.getViewport({ scale: 1 });
      const factor = Math.min(scale.value, MAX_SIDE / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale: factor });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), mime, 0.92));
      results.value.push({ page: index + 1, url: URL.createObjectURL(blob), blob, width: canvas.width, height: canvas.height });
      canvas.width = 0;
      progress.value = Math.round(((i + 1) / indices.length) * 100);
    }
  }
  catch {
    message.error(t('tools.pdf-to-image.failed'));
  }
  finally {
    isBusy.value = false;
  }
}

function fileName(result: Result) {
  const digits = String(pageCount.value).length;
  return `${baseName(file.value!.name)}_${String(result.page).padStart(digits, '0')}.${format.value === 'png' ? 'png' : 'jpg'}`;
}

async function downloadAll() {
  const { zipSync } = await loadFflate();
  const files: Record<string, Uint8Array> = {};
  for (const r of results.value) {
    files[fileName(r)] = new Uint8Array(await r.blob.arrayBuffer());
  }
  downloadBlob(new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' }), `${baseName(file.value!.name)}_images.zip`);
}

onBeforeUnmount(() => {
  cancelled = true;
  clearResults();
  closePdf();
});
</script>

<template>
  <div>
    <c-file-upload
      v-if="!file"
      accept="application/pdf,.pdf"
      :title="$t('tools.pdf-to-image.upload')"
      @file-upload="setFile"
    />

    <div v-else>
      <div class="file-card">
        <div break-all font-bold>
          {{ file.name }}
        </div>
        <div text-12px op-70>
          {{ $t('tools.pdf-to-image.pages', { count: pageCount }) }} · {{ formatSize(file.size) }}
        </div>
      </div>

      <div mt-4 flex flex-wrap items-center gap-3>
        <n-select v-model:value="format" :options="formatOptions" :disabled="isBusy" style="width: 100px" />
        <n-select v-model:value="scale" :options="scaleOptions" :disabled="isBusy" style="width: 190px" />
        <n-input v-model:value="ranges" :placeholder="$t('tools.pdf-to-image.rangePlaceholder')" :disabled="isBusy" style="width: 280px" />
      </div>

      <div mt-4 flex flex-wrap gap-2>
        <c-button type="primary" class="solid-primary" :disabled="isBusy" @click="convert">
          {{ isBusy ? $t('tools.pdf-to-image.working') : $t('tools.pdf-to-image.convert') }}
        </c-button>
        <c-button v-if="isBusy" @click="cancelled = true">
          {{ $t('tools.pdf-to-image.cancel') }}
        </c-button>
        <template v-else>
          <c-button @click="chooseAnother">
            {{ $t('tools.pdf-to-image.chooseAnother') }}
          </c-button>
          <c-button v-if="results.length > 1" @click="downloadAll">
            {{ $t('tools.pdf-to-image.downloadAll', { count: results.length }) }}
          </c-button>
        </template>
      </div>

      <n-progress v-if="isBusy" mt-3 type="line" :percentage="progress" :show-indicator="false" />

      <div v-if="results.length" class="grid">
        <div v-for="r in results" :key="r.page" class="card">
          <img :src="r.url" :alt="`${r.page}`">
          <div class="card-footer">
            <span text-12px op-70>{{ $t('tools.pdf-to-image.pageLabel', { page: r.page }) }} · {{ r.width }}×{{ r.height }}</span>
            <a :href="r.url" :download="fileName(r)" class="save">{{ $t('tools.pdf-to-image.save') }}</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-card {
  padding: 12px 16px;
  background: rgba(128, 128, 128, 0.12);
  border-radius: 6px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.card {
  overflow: hidden;
  background: rgba(128, 128, 128, 0.12);
  border-radius: 6px;

  img {
    display: block;
    width: 100%;
    background: #fff;
  }
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 10px;
}

.save {
  color: #18a058;
  text-decoration: none;
  font-size: 13px;
  white-space: nowrap;
}

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
