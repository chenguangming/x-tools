<script setup lang="ts">
import { useMessage } from 'naive-ui';
import type { OcrWorker } from './image-to-text.service';
import { createOcrWorker, prepareImage } from './image-to-text.service';
import { useCopy } from '@/composable/copy';

const { t, locale } = useI18n();
const message = useMessage();

const languageOptions = [
  { value: 'chi_sim+eng', label: '简体中文 + English' },
  { value: 'chi_tra+eng', label: '繁體中文 + English' },
  { value: 'eng', label: 'English' },
  { value: 'jpn+eng', label: '日本語 + English' },
  { value: 'kor+eng', label: '한국어 + English' },
];

function defaultLanguage() {
  if (locale.value === 'zh') {
    return 'chi_sim+eng';
  }
  if (locale.value === 'zh-TW') {
    return 'chi_tra+eng';
  }
  if (locale.value === 'ja') {
    return 'jpn+eng';
  }
  if (locale.value === 'ko') {
    return 'kor+eng';
  }
  return 'eng';
}

const imageUrl = ref('');
const imageFile = ref<File | null>(null);
const language = ref(defaultLanguage());
const text = ref('');
const progress = ref(0);
const isBusy = ref(false);
const isLoadingEngine = ref(false);
const hasResult = ref(false);

let worker: OcrWorker | null = null;
let workerLanguage = '';

const { copy } = useCopy({ createToast: false });

function setImage(file: File) {
  if (!file.type.startsWith('image/')) {
    message.error(t('tools.image-to-text.notAnImage'));
    return;
  }
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value);
  }
  imageFile.value = file;
  imageUrl.value = URL.createObjectURL(file);
  text.value = '';
  hasResult.value = false;
  progress.value = 0;
}

function chooseAnother() {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value);
  }
  imageUrl.value = '';
  imageFile.value = null;
  text.value = '';
  hasResult.value = false;
}

async function dropWorker() {
  const old = worker;
  worker = null;
  workerLanguage = '';
  await old?.terminate().catch(() => {});
}

// Tesseract puts spaces between CJK characters, which looks wrong in Chinese, Japanese and Korean text
function cleanText(raw: string) {
  return raw
    .replace(/([\u3000-\u9FFF\uAC00-\uD7AF\uFF00-\uFFEF]) +(?=[\u3000-\u9FFF\uAC00-\uD7AF\uFF00-\uFFEF])/g, '$1')
    .trim();
}

async function recognize() {
  if (!imageFile.value || isBusy.value) {
    return;
  }
  isBusy.value = true;
  progress.value = 0;
  hasResult.value = false;
  try {
    if (!worker || workerLanguage !== language.value) {
      await dropWorker();
      isLoadingEngine.value = true;
      worker = await createOcrWorker(language.value.split('+'), value => (progress.value = value));
      workerLanguage = language.value;
      isLoadingEngine.value = false;
    }
    const image = await prepareImage(imageFile.value);
    const { data } = await worker.recognize(image);
    text.value = cleanText(data.text);
    hasResult.value = true;
    if (!text.value) {
      message.warning(t('tools.image-to-text.noText'));
    }
  }
  catch {
    isLoadingEngine.value = false;
    await dropWorker();
    message.error(t('tools.image-to-text.failed'));
  }
  finally {
    isBusy.value = false;
  }
}

async function copyText() {
  await copy(text.value);
  message.success(t('tools.image-to-text.copied'));
}

function downloadText() {
  const url = URL.createObjectURL(new Blob([text.value], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${imageFile.value?.name.replace(/\.[^.]+$/, '') || 'text'}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function onPaste(event: ClipboardEvent) {
  const file = Array.from(event.clipboardData?.files ?? []).find(item => item.type.startsWith('image/'));
  if (file) {
    setImage(file);
  }
}

onMounted(() => window.addEventListener('paste', onPaste));
onBeforeUnmount(() => {
  window.removeEventListener('paste', onPaste);
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value);
  }
  dropWorker();
});

const statusText = computed(() => (isLoadingEngine.value
  ? t('tools.image-to-text.loadingEngine')
  : t('tools.image-to-text.recognizing', { percent: Math.round(progress.value * 100) })));
</script>

<template>
  <div>
    <c-file-upload
      v-if="!imageUrl"
      accept="image/*"
      :title="$t('tools.image-to-text.upload')"
      @file-upload="setImage"
    />
    <div v-if="!imageUrl" mt-2 text-center text-12px op-60>
      {{ $t('tools.image-to-text.pasteHint') }}
    </div>

    <n-grid v-else cols="1 900:2" x-gap="16" y-gap="16">
      <n-gi>
        <div class="preview">
          <img :src="imageUrl" alt="">
        </div>
        <div mt-3 flex flex-wrap items-center gap-2>
          <n-select v-model:value="language" :options="languageOptions" :disabled="isBusy" style="width: 210px" />
          <c-button type="primary" class="solid-primary" :disabled="isBusy" @click="recognize">
            {{ isBusy ? $t('tools.image-to-text.working') : $t('tools.image-to-text.recognize') }}
          </c-button>
          <c-button :disabled="isBusy" @click="chooseAnother">
            {{ $t('tools.image-to-text.chooseAnother') }}
          </c-button>
        </div>
        <n-progress
          v-if="isBusy"
          mt-3
          type="line"
          :percentage="isLoadingEngine ? 0 : Math.round(progress * 100)"
          :processing="isLoadingEngine"
          :show-indicator="false"
        />
        <div v-if="isBusy" mt-1 text-12px op-70>
          {{ statusText }}
        </div>
        <div v-else mt-2 text-12px op-60>
          {{ $t('tools.image-to-text.hint') }}
        </div>
      </n-gi>

      <n-gi>
        <n-input
          v-model:value="text"
          type="textarea"
          :placeholder="hasResult ? $t('tools.image-to-text.noText') : $t('tools.image-to-text.resultPlaceholder')"
          :autosize="{ minRows: 12, maxRows: 24 }"
        />
        <div mt-3 flex gap-2>
          <c-button :disabled="!text" @click="copyText">
            {{ $t('tools.image-to-text.copy') }}
          </c-button>
          <c-button :disabled="!text" @click="downloadText">
            {{ $t('tools.image-to-text.downloadTxt') }}
          </c-button>
        </div>
      </n-gi>
    </n-grid>
  </div>
</template>

<style scoped>
.preview {
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 480px;
  overflow: hidden;
  background: rgba(128, 128, 128, 0.12);
  border-radius: 6px;

  img {
    max-width: 100%;
    max-height: 480px;
    object-fit: contain;
  }
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
