<script setup lang="ts">
import { useMessage } from 'naive-ui';
import type { PdfDocument } from './pdf-to-word.service';
import { convertPdfToDocx, openPdf } from './pdf-to-word.service';

const { t, locale } = useI18n();
const message = useMessage();

const ocrOptions = [
  { value: 'chi_sim+eng', label: '简体中文 + English' },
  { value: 'chi_tra+eng', label: '繁體中文 + English' },
  { value: 'eng', label: 'English' },
  { value: 'jpn+eng', label: '日本語 + English' },
  { value: 'kor+eng', label: '한국어 + English' },
];

function defaultLanguage() {
  const map: Record<string, string> = { 'zh': 'chi_sim+eng', 'zh-TW': 'chi_tra+eng', 'ja': 'jpn+eng', 'ko': 'kor+eng' };
  return map[locale.value] ?? 'eng';
}

const file = ref<File | null>(null);
const pageCount = ref(0);
const language = ref(defaultLanguage());
const useOcr = ref(true);
const isBusy = ref(false);
const status = ref('');
const percent = ref(0);
const resultUrl = ref('');
const resultName = ref('');
const resultNote = ref('');

let pdf: PdfDocument | null = null;
let cancelled = false;

function clearResult() {
  if (resultUrl.value) {
    URL.revokeObjectURL(resultUrl.value);
  }
  resultUrl.value = '';
  resultNote.value = '';
}

async function closePdf() {
  const old = pdf;
  pdf = null;
  await old?.destroy().catch(() => {});
}

async function setFile(selected: File) {
  if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
    message.error(t('tools.pdf-to-word.notAPdf'));
    return;
  }
  clearResult();
  await closePdf();
  try {
    pdf = await openPdf(await selected.arrayBuffer());
    pageCount.value = pdf.numPages;
    file.value = selected;
  }
  catch (error) {
    file.value = null;
    message.error((error as { name?: string })?.name === 'PasswordException'
      ? t('tools.pdf-to-word.encrypted')
      : t('tools.pdf-to-word.openFailed'));
  }
}

async function chooseAnother() {
  cancelled = true;
  clearResult();
  await closePdf();
  file.value = null;
  pageCount.value = 0;
}

async function convert() {
  if (!pdf || !file.value || isBusy.value) {
    return;
  }
  cancelled = false;
  isBusy.value = true;
  percent.value = 0;
  clearResult();
  try {
    const result = await convertPdfToDocx(pdf, {
      ocrLanguages: useOcr.value ? language.value.split('+') : [],
      isCancelled: () => cancelled,
      onProgress: ({ page, total, phase }) => {
        if (phase === 'engine') {
          status.value = t('tools.pdf-to-word.loadingEngine');
          percent.value = 0;
          return;
        }
        if (phase === 'build') {
          status.value = t('tools.pdf-to-word.building');
          percent.value = 100;
          return;
        }
        status.value = t(phase === 'ocr' ? 'tools.pdf-to-word.ocrPage' : 'tools.pdf-to-word.readPage', { page, total });
        percent.value = Math.round((phase === 'ocr' ? page - 1 : page) / total * 100);
      },
    });
    resultUrl.value = URL.createObjectURL(result.blob);
    resultName.value = `${file.value.name.replace(/\.pdf$/i, '')}.docx`;
    const notes: string[] = [];
    if (result.ocrPages) {
      notes.push(t('tools.pdf-to-word.ocrDone', { count: result.ocrPages }));
    }
    if (result.emptyPages) {
      notes.push(t('tools.pdf-to-word.emptyPages', { count: result.emptyPages }));
    }
    resultNote.value = notes.join(' ');
    download();
  }
  catch (error) {
    if ((error as Error).message !== 'cancelled') {
      message.error(t('tools.pdf-to-word.failed'));
    }
  }
  finally {
    isBusy.value = false;
  }
}

function download() {
  const a = document.createElement('a');
  a.href = resultUrl.value;
  a.download = resultName.value;
  a.click();
}

onBeforeUnmount(() => {
  cancelled = true;
  clearResult();
  closePdf();
});
</script>

<template>
  <div>
    <c-file-upload
      v-if="!file"
      accept="application/pdf,.pdf"
      :title="$t('tools.pdf-to-word.upload')"
      @file-upload="setFile"
    />

    <div v-else>
      <div class="file-card">
        <div break-all font-bold>
          {{ file.name }}
        </div>
        <div text-12px op-70>
          {{ $t('tools.pdf-to-word.pages', { count: pageCount }) }} · {{ (file.size / 1024 / 1024).toFixed(2) }} MB
        </div>
      </div>

      <div mt-4 flex flex-wrap items-center gap-3>
        <n-checkbox v-model:checked="useOcr" :disabled="isBusy">
          {{ $t('tools.pdf-to-word.ocrScanned') }}
        </n-checkbox>
        <n-select v-if="useOcr" v-model:value="language" :options="ocrOptions" :disabled="isBusy" style="width: 210px" />
      </div>

      <div mt-4 flex flex-wrap items-center gap-2>
        <c-button type="primary" class="solid-primary" :disabled="isBusy" @click="convert">
          {{ isBusy ? $t('tools.pdf-to-word.working') : $t('tools.pdf-to-word.convert') }}
        </c-button>
        <c-button v-if="isBusy" @click="cancelled = true">
          {{ $t('tools.pdf-to-word.cancel') }}
        </c-button>
        <c-button v-else @click="chooseAnother">
          {{ $t('tools.pdf-to-word.chooseAnother') }}
        </c-button>
        <c-button v-if="resultUrl && !isBusy" @click="download">
          {{ $t('tools.pdf-to-word.downloadAgain') }}
        </c-button>
      </div>

      <template v-if="isBusy">
        <n-progress mt-3 type="line" :percentage="percent" :processing="percent === 0" :show-indicator="false" />
        <div mt-1 text-12px op-70>
          {{ status }}
        </div>
      </template>
      <div v-else-if="resultUrl" mt-3 text-13px>
        <div>✅ {{ $t('tools.pdf-to-word.done') }}</div>
        <div v-if="resultNote" op-70>
          {{ resultNote }}
        </div>
      </div>

      <div mt-4 text-12px op-60>
        {{ $t('tools.pdf-to-word.hint') }}
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
