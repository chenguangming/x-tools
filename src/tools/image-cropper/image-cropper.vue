<script setup lang="ts">
import { VueCropper } from 'vue-cropper';
import 'vue-cropper/dist/index.css';
import { useMessage } from 'naive-ui';
import { removeBackground } from '@/modules/background-removal/background-removal';

type OutputFormat = 'png' | 'jpeg' | 'webp';

const { t } = useI18n();
const message = useMessage();

const ratios: Record<string, [number, number] | null> = {
  'free': null,
  '1:1': [1, 1],
  '4:3': [4, 3],
  '3:4': [3, 4],
  '3:2': [3, 2],
  '2:3': [2, 3],
  '16:9': [16, 9],
  '9:16': [9, 16],
  '21:9': [21, 9],
};

const cropper = ref<any>(null);
const imageUrl = ref('');
const fileName = ref('image');
const ratioKey = ref('free');
const outputWidth = ref<number | null>(null);
const outputHeight = ref<number | null>(null);
const format = ref<OutputFormat>('webp');
const quality = ref(85);
const transparent = ref(true);
const background = ref('#ffffff');
const removeBg = ref(false);
const progressText = ref('');
let cutoutCache: { key: string; canvas: HTMLCanvasElement } | null = null;

const result = ref({ url: '', size: 0, width: 0, height: 0 });
const isBusy = ref(false);

const ratio = computed(() => ratios[ratioKey.value]);
const ratioOptions = computed(() => Object.keys(ratios).map(key => ({
  value: key,
  label: key === 'free' ? t('tools.image-cropper.ratioFree') : key,
})));
const formatOptions = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPG' },
  { value: 'webp', label: 'WebP' },
];
const isLossy = computed(() => format.value !== 'png');
const formatLabel = computed(() => (format.value === 'jpeg' ? 'JPG' : format.value.toUpperCase()));
const extension = computed(() => (format.value === 'jpeg' ? 'jpg' : format.value));
// JPG cannot hold transparency, so transparent areas are flattened onto white
const fillColor = computed(() => {
  if (!transparent.value) {
    return background.value;
  }
  return format.value === 'jpeg' ? '#ffffff' : null;
});

function revokeResult() {
  if (result.value.url) {
    URL.revokeObjectURL(result.value.url);
  }
  result.value = { url: '', size: 0, width: 0, height: 0 };
}

function revokeImage() {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value);
  }
  imageUrl.value = '';
}

function onUpload(file: File) {
  cutoutCache = null;
  if (!file.type.startsWith('image/')) {
    message.error(t('tools.image-cropper.notAnImage'));
    return;
  }

  revokeResult();
  revokeImage();
  fileName.value = file.name.replace(/\.[^.]+$/, '') || 'image';
  imageUrl.value = URL.createObjectURL(file);
}

function chooseAnother() {
  cutoutCache = null;
  revokeResult();
  revokeImage();
}

watch(ratioKey, async () => {
  outputWidth.value = null;
  outputHeight.value = null;
  await nextTick();
  cropper.value?.goAutoCrop();
});

function onWidthChange(value: number | null) {
  outputWidth.value = value;
  if (ratio.value && value) {
    outputHeight.value = Math.max(1, Math.round((value * ratio.value[1]) / ratio.value[0]));
  }
}

function onHeightChange(value: number | null) {
  outputHeight.value = value;
  if (ratio.value && value) {
    outputWidth.value = Math.max(1, Math.round((value * ratio.value[0]) / ratio.value[1]));
  }
}

function getCroppedDataUrl() {
  return new Promise<string>(resolve => cropper.value.getCropData(resolve));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function generate() {
  if (!cropper.value || !imageUrl.value) {
    return null;
  }

  isBusy.value = true;
  try {
    const croppedUrl = await getCroppedDataUrl();
    const cropped = await loadImage(croppedUrl);

    let subject: CanvasImageSource = cropped;
    if (removeBg.value) {
      if (cutoutCache?.key !== croppedUrl) {
        progressText.value = t('tools.image-cropper.loadingModel');
        const canvas = await removeBackground(cropped, (ratio) => {
          progressText.value = t('tools.image-cropper.downloadingModel', { percent: Math.round(ratio * 100) });
        });
        cutoutCache = { key: croppedUrl, canvas };
      }
      subject = cutoutCache.canvas;
    }

    const width = outputWidth.value || cropped.naturalWidth;
    const height = outputHeight.value || cropped.naturalHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    if (fillColor.value) {
      ctx.fillStyle = fillColor.value;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(subject, 0, 0, width, height);

    const mimeType = `image/${format.value}`;
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, mimeType, isLossy.value ? quality.value / 100 : undefined));

    // browsers silently fall back to PNG when they cannot encode the requested type
    if (!blob || blob.type !== mimeType) {
      message.error(t('tools.image-cropper.formatUnsupported'));
      return null;
    }

    revokeResult();
    result.value = { url: URL.createObjectURL(blob), size: blob.size, width, height };
    return result.value;
  }
  catch (error) {
    message.error(removeBg.value ? t('tools.image-cropper.matteFailed') : t('tools.image-cropper.cropFailed'));
    console.error(error);
    return null;
  }
  finally {
    progressText.value = '';
    isBusy.value = false;
  }
}

async function saveResult() {
  const generated = await generate();
  if (!generated) {
    return;
  }

  const a = document.createElement('a');
  a.href = generated.url;
  a.download = `${fileName.value}-cropped.${extension.value}`;
  a.click();
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

onBeforeUnmount(() => {
  revokeResult();
  revokeImage();
});
</script>

<template>
  <div>
    <c-file-upload
      v-if="!imageUrl"
      accept="image/*"
      :title="$t('tools.image-cropper.upload')"
      @file-upload="onUpload"
    />

    <n-grid v-else cols="1 900:3" x-gap="16" y-gap="16">
      <n-gi span="2">
        <div class="cropper-box">
          <VueCropper
            ref="cropper"
            :img="imageUrl"
            output-type="png"
            :auto-crop="true"
            :fixed="!!ratio"
            :fixed-number="ratio ?? [1, 1]"
            :full="true"
            :center-box="false"
            :info="true"
            :info-true="true"
            :limit-min-size="[20, 20]"
            mode="contain"
          />
        </div>
        <div mt-3 flex flex-wrap items-center gap-2>
          <c-button @click="cropper?.rotateLeft()">
            {{ $t('tools.image-cropper.rotateLeft') }}
          </c-button>
          <c-button @click="cropper?.rotateRight()">
            {{ $t('tools.image-cropper.rotateRight') }}
          </c-button>
          <c-button @click="cropper?.changeScale(1)">
            {{ $t('tools.image-cropper.zoomIn') }}
          </c-button>
          <c-button @click="cropper?.changeScale(-1)">
            {{ $t('tools.image-cropper.zoomOut') }}
          </c-button>
          <c-button @click="cropper?.refresh()">
            {{ $t('tools.image-cropper.reset') }}
          </c-button>
          <c-button @click="chooseAnother">
            {{ $t('tools.image-cropper.chooseAnother') }}
          </c-button>
        </div>
        <div mt-2 text-12px op-60>
          {{ $t('tools.image-cropper.hint') }}
        </div>
      </n-gi>

      <n-gi>
        <n-form label-placement="top" :show-feedback="false">
          <n-form-item :label="$t('tools.image-cropper.ratio')" mb-3>
            <n-select v-model:value="ratioKey" :options="ratioOptions" />
          </n-form-item>

          <n-form-item :label="$t('tools.image-cropper.outputSize')" mb-3>
            <div flex items-center gap-2>
              <n-input-number :value="outputWidth" :min="1" :max="16384" :placeholder="$t('tools.image-cropper.auto')" @update:value="onWidthChange" />
              <span>×</span>
              <n-input-number :value="outputHeight" :min="1" :max="16384" :placeholder="$t('tools.image-cropper.auto')" @update:value="onHeightChange" />
            </div>
          </n-form-item>

          <n-form-item :label="$t('tools.image-cropper.removeBackground')" mb-3>
            <div flex flex-col gap-1>
              <n-switch v-model:value="removeBg" />
              <span text-12px op-60>{{ $t('tools.image-cropper.removeBackgroundHint') }}</span>
            </div>
          </n-form-item>

          <n-form-item :label="$t('tools.image-cropper.background')" mb-3>
            <div w-full flex flex-col gap-2>
              <n-switch v-model:value="transparent">
                <template #checked>
                  {{ $t('tools.image-cropper.transparent') }}
                </template>
                <template #unchecked>
                  {{ $t('tools.image-cropper.solidColor') }}
                </template>
              </n-switch>
              <n-color-picker v-if="!transparent" v-model:value="background" :modes="['hex']" :show-alpha="false" />
              <div v-else-if="format === 'jpeg'" text-12px op-60>
                {{ $t('tools.image-cropper.jpgNoAlpha') }}
              </div>
            </div>
          </n-form-item>

          <n-form-item :label="$t('tools.image-cropper.format')" mb-3>
            <n-radio-group v-model:value="format" size="small">
              <n-radio-button v-for="option in formatOptions" :key="option.value" :value="option.value" :label="option.label" />
            </n-radio-group>
          </n-form-item>

          <n-form-item v-if="isLossy" :label="`${$t('tools.image-cropper.quality')}: ${quality}%`" mb-3>
            <n-slider v-model:value="quality" :min="1" :max="100" />
          </n-form-item>
        </n-form>

        <div flex gap-2>
          <c-button :disabled="isBusy" @click="generate">
            {{ $t('tools.image-cropper.preview') }}
          </c-button>
          <c-button :disabled="isBusy" @click="saveResult">
            {{ $t('tools.image-cropper.saveAs', { format: formatLabel }) }}
          </c-button>
        </div>

        <div v-if="progressText" mt-2 text-12px op-70>
          {{ progressText }}
        </div>

        <div v-if="result.url" mt-4 flex flex-col items-center gap-2>
          <div class="result-box">
            <img :src="result.url" max-h-240px max-w-full>
          </div>
          <div text-12px op-70>
            {{ result.width }} × {{ result.height }} · {{ formatSize(result.size) }}
          </div>
        </div>
      </n-gi>
    </n-grid>
  </div>
</template>

<style scoped>
.cropper-box {
  width: 100%;
  height: 460px;
}

.result-box {
  background-image: linear-gradient(45deg, #8884 25%, transparent 25%), linear-gradient(-45deg, #8884 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #8884 75%), linear-gradient(-45deg, transparent 75%, #8884 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}
</style>
