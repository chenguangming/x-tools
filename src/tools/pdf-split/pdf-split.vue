<script setup lang="ts">
import { useMessage } from 'naive-ui';
import type { PdfLibDocument } from '../pdf-common/pdf-common';
import { baseName, downloadBlob, formatSize, loadFflate, loadPdfLib, parsePageRanges } from '../pdf-common/pdf-common';

const { t } = useI18n();
const message = useMessage();

const file = ref<File | null>(null);
const data = ref<ArrayBuffer | null>(null);
const pageCount = ref(0);
const mode = ref<'extract' | 'each' | 'chunk'>('extract');
const ranges = ref('');
const chunkSize = ref(1);
const isBusy = ref(false);

const modeOptions = computed(() => [
  { value: 'extract', label: t('tools.pdf-split.modeExtract') },
  { value: 'each', label: t('tools.pdf-split.modeEach') },
  { value: 'chunk', label: t('tools.pdf-split.modeChunk') },
]);

async function setFile(selected: File) {
  if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
    message.error(t('tools.pdf-split.notAPdf'));
    return;
  }
  try {
    const { PDFDocument } = await loadPdfLib();
    const buffer = await selected.arrayBuffer();
    const doc = await PDFDocument.load(buffer);
    data.value = buffer;
    pageCount.value = doc.getPageCount();
    file.value = selected;
    ranges.value = '';
  }
  catch {
    message.error(t('tools.pdf-split.openFailed'));
  }
}

function reset() {
  file.value = null;
  data.value = null;
  pageCount.value = 0;
}

async function extract(source: PdfLibDocument, indices: number[]) {
  const { PDFDocument } = await loadPdfLib();
  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, indices);
  pages.forEach(page => output.addPage(page));
  return output.save();
}

async function split() {
  if (!file.value || !data.value || isBusy.value) {
    return;
  }
  const name = baseName(file.value.name);
  isBusy.value = true;
  try {
    const { PDFDocument } = await loadPdfLib();
    const source = await PDFDocument.load(data.value);

    if (mode.value === 'extract') {
      const indices = parsePageRanges(ranges.value, pageCount.value);
      if (!indices) {
        message.error(t('tools.pdf-split.invalidRange', { total: pageCount.value }));
        return;
      }
      const bytes = await extract(source, indices);
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${name}_extract.pdf`);
      return;
    }

    const size = mode.value === 'each' ? 1 : Math.max(1, Math.floor(chunkSize.value || 1));
    const files: Record<string, Uint8Array> = {};
    const digits = String(Math.ceil(pageCount.value / size)).length;
    for (let start = 0, part = 1; start < pageCount.value; start += size, part++) {
      const indices = Array.from({ length: Math.min(size, pageCount.value - start) }, (_, i) => start + i);
      files[`${name}_${String(part).padStart(digits, '0')}.pdf`] = await extract(source, indices);
    }
    const { zipSync } = await loadFflate();
    downloadBlob(new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' }), `${name}_split.zip`);
  }
  catch {
    message.error(t('tools.pdf-split.failed'));
  }
  finally {
    isBusy.value = false;
  }
}
</script>

<template>
  <div>
    <c-file-upload
      v-if="!file"
      accept="application/pdf,.pdf"
      :title="$t('tools.pdf-split.upload')"
      @file-upload="setFile"
    />

    <div v-else>
      <div class="file-card">
        <div break-all font-bold>
          {{ file.name }}
        </div>
        <div text-12px op-70>
          {{ $t('tools.pdf-split.pages', { count: pageCount }) }} · {{ formatSize(file.size) }}
        </div>
      </div>

      <div mt-4>
        <n-radio-group v-model:value="mode" :disabled="isBusy">
          <n-space vertical>
            <n-radio v-for="option in modeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </n-radio>
          </n-space>
        </n-radio-group>
      </div>

      <div mt-3>
        <template v-if="mode === 'extract'">
          <n-input v-model:value="ranges" :placeholder="$t('tools.pdf-split.rangePlaceholder', { total: pageCount })" :disabled="isBusy" style="max-width: 360px" @keyup.enter="split" />
          <div mt-1 text-12px op-60>
            {{ $t('tools.pdf-split.rangeHint') }}
          </div>
        </template>
        <div v-else-if="mode === 'chunk'" flex items-center gap-2>
          <span>{{ $t('tools.pdf-split.every') }}</span>
          <n-input-number v-model:value="chunkSize" :min="1" :max="Math.max(pageCount, 1)" :disabled="isBusy" style="width: 120px" />
          <span>{{ $t('tools.pdf-split.pagesUnit') }}</span>
        </div>
        <div v-else text-12px op-60>
          {{ $t('tools.pdf-split.zipHint') }}
        </div>
      </div>

      <div mt-4 flex gap-2>
        <c-button type="primary" class="solid-primary" :disabled="isBusy" @click="split">
          {{ isBusy ? $t('tools.pdf-split.working') : $t('tools.pdf-split.split') }}
        </c-button>
        <c-button :disabled="isBusy" @click="reset">
          {{ $t('tools.pdf-split.chooseAnother') }}
        </c-button>
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
