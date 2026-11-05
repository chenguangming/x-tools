<script setup lang="ts">
import { VueCropper } from 'vue-cropper';
import 'vue-cropper/dist/index.css';
import { useMessage } from 'naive-ui';
import { removeBackground } from '@/modules/background-removal/background-removal';

type OutputFormat = 'jpeg' | 'png';

// Pixel sizes are at 300 dpi
const presets = [
  { key: 'oneInch', width: 295, height: 413, mm: '25×35' },
  { key: 'smallOneInch', width: 260, height: 378, mm: '22×32' },
  { key: 'bigOneInch', width: 390, height: 567, mm: '33×48' },
  { key: 'twoInch', width: 413, height: 579, mm: '35×49' },
  { key: 'smallTwoInch', width: 413, height: 531, mm: '35×45' },
  { key: 'bigTwoInch', width: 413, height: 626, mm: '35×53' },
  { key: 'square2in', width: 600, height: 600, mm: '51×51' },
] as const;

const backgrounds = [
  { key: 'white', color: '#ffffff' },
  { key: 'blue', color: '#438edb' },
  { key: 'red', color: '#d9271c' },
  { key: 'gray', color: '#e6e6e6' },
] as const;

const { t } = useI18n();
const message = useMessage();

const cropper = ref<any>(null);
const imageUrl = ref('');
const fileName = ref('id-photo');
const presetKey = ref<string>('oneInch');
const customWidth = ref<number | null>(295);
const customHeight = ref<number | null>(413);
const background = ref('#438edb');
const format = ref<OutputFormat>('jpeg');
const maxSizeKb = ref<number | null>(null);
const replaceBackground = ref(true);
const brightness = ref(0);
const contrast = ref(0);
const saturation = ref(0);
const hasAdjustments = computed(() => brightness.value !== 0 || contrast.value !== 0 || saturation.value !== 0);
const progressText = ref('');
let cutoutCache: { key: string; canvas: HTMLCanvasElement } | null = null;

const result = ref({ url: '', size: 0, width: 0, height: 0 });
const isBusy = ref(false);

const presetOptions = computed(() => [
  ...presets.map(p => ({
    value: p.key,
    label: `${t(`tools.id-photo.presets.${p.key}`)} · ${p.mm} mm · ${p.width}×${p.height} px`,
  })),
  { value: 'custom', label: t('tools.id-photo.presets.custom') },
]);

const outputSize = computed(() => {
  if (presetKey.value === 'custom') {
    return { width: customWidth.value || 1, height: customHeight.value || 1 };
  }
  const preset = presets.find(p => p.key === presetKey.value)!;
  return { width: preset.width, height: preset.height };
});

const ratio = computed<[number, number]>(() => [outputSize.value.width, outputSize.value.height]);
const extension = computed(() => (format.value === 'jpeg' ? 'jpg' : 'png'));

const adjustSliders = [
  { key: 'brightness', model: brightness },
  { key: 'contrast', model: contrast },
  { key: 'saturation', model: saturation },
];

function resetAdjustments() {
  brightness.value = 0;
  contrast.value = 0;
  saturation.value = 0;
}

// Same formulas as the CSS brightness/contrast/saturate filters; alpha is left untouched
function adjustColors(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  const b = 1 + brightness.value / 100;
  const c = 1 + contrast.value / 100;
  const s = 1 + saturation.value / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] * b;
    let g = data[i + 1] * b;
    let bl = data[i + 2] * b;

    r = (r - 127.5) * c + 127.5;
    g = (g - 127.5) * c + 127.5;
    bl = (bl - 127.5) * c + 127.5;

    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    data[i] = gray + (r - gray) * s;
    data[i + 1] = gray + (g - gray) * s;
    data[i + 2] = gray + (bl - gray) * s;
  }

  ctx.putImageData(image, 0, 0);
}

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
  if (!file.type.startsWith('image/')) {
    message.error(t('tools.id-photo.notAnImage'));
    return;
  }

  cutoutCache = null;
  revokeResult();
  revokeImage();
  fileName.value = `${file.name.replace(/\.[^.]+$/, '') || 'photo'}-id`;
  imageUrl.value = URL.createObjectURL(file);
}

function chooseAnother() {
  cutoutCache = null;
  revokeResult();
  revokeImage();
}

watch(ratio, async () => {
  await nextTick();
  cropper.value?.goAutoCrop();
});

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

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality));
}

async function generate() {
  if (!cropper.value || !imageUrl.value) {
    return null;
  }

  isBusy.value = true;
  try {
    const croppedUrl = await getCroppedDataUrl();
    const cropped = await loadImage(croppedUrl);
    const { width, height } = outputSize.value;

    let subject: CanvasImageSource = cropped;
    if (replaceBackground.value) {
      if (cutoutCache?.key !== croppedUrl) {
        progressText.value = t('tools.id-photo.loadingModel');
        const canvas = await removeBackground(cropped, (ratio) => {
          progressText.value = t('tools.id-photo.downloadingModel', { percent: Math.round(ratio * 100) });
        });
        cutoutCache = { key: croppedUrl, canvas };
      }
      subject = cutoutCache.canvas;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = background.value;
    ctx.fillRect(0, 0, width, height);

    if (hasAdjustments.value) {
      // adjust the person only, so the background keeps exactly the chosen color
      const layer = document.createElement('canvas');
      layer.width = width;
      layer.height = height;
      const layerCtx = layer.getContext('2d', { willReadFrequently: true })!;
      layerCtx.imageSmoothingQuality = 'high';
      layerCtx.drawImage(subject, 0, 0, width, height);
      adjustColors(layerCtx, width, height);
      ctx.drawImage(layer, 0, 0);
    }
    else {
      ctx.drawImage(subject, 0, 0, width, height);
    }

    let quality = 0.92;
    let blob = await toBlob(canvas, `image/${format.value}`, format.value === 'jpeg' ? quality : undefined);

    // lower the JPG quality step by step until it fits the size limit
    if (blob && format.value === 'jpeg' && maxSizeKb.value) {
      const limit = maxSizeKb.value * 1024;
      while (blob && blob.size > limit && quality > 0.3) {
        quality = Math.round((quality - 0.05) * 100) / 100;
        blob = await toBlob(canvas, 'image/jpeg', quality);
      }
      if (blob && blob.size > limit) {
        message.warning(t('tools.id-photo.sizeLimitNotReached', { size: maxSizeKb.value }));
      }
    }

    if (!blob) {
      message.error(t('tools.id-photo.cropFailed'));
      return null;
    }

    revokeResult();
    result.value = { url: URL.createObjectURL(blob), size: blob.size, width, height };
    return result.value;
  }
  catch (error) {
    message.error(replaceBackground.value ? t('tools.id-photo.matteFailed') : t('tools.id-photo.cropFailed'));
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
  a.download = `${fileName.value}.${extension.value}`;
  a.click();
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Re-render the preview while sliders move, if one is already shown
const regenerateOnAdjust = useDebounceFn(() => {
  if (result.value.url && !isBusy.value) {
    generate();
  }
}, 300);
watch([brightness, contrast, saturation], regenerateOnAdjust);

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
      :title="$t('tools.id-photo.upload')"
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
            :fixed="true"
            :fixed-number="ratio"
            :full="true"
            :center-box="false"
            :info="true"
            :info-true="true"
            :limit-min-size="[20, 20]"
            mode="contain"
          />
          <div v-if="result.url" class="result-overlay">
            <img :src="result.url" class="result-img">
            <div text-12px>
              {{ result.width }} × {{ result.height }} px · {{ formatSize(result.size) }}
            </div>
          </div>
        </div>
        <div mt-3 flex flex-wrap items-center gap-2>
          <c-button @click="cropper?.rotateLeft()">
            {{ $t('tools.id-photo.rotateLeft') }}
          </c-button>
          <c-button @click="cropper?.rotateRight()">
            {{ $t('tools.id-photo.rotateRight') }}
          </c-button>
          <c-button @click="cropper?.changeScale(1)">
            {{ $t('tools.id-photo.zoomIn') }}
          </c-button>
          <c-button @click="cropper?.changeScale(-1)">
            {{ $t('tools.id-photo.zoomOut') }}
          </c-button>
          <c-button @click="cropper?.refresh()">
            {{ $t('tools.id-photo.reset') }}
          </c-button>
          <c-button @click="chooseAnother">
            {{ $t('tools.id-photo.chooseAnother') }}
          </c-button>
        </div>
        <div mt-2 text-12px op-60>
          {{ $t('tools.id-photo.hint') }}
        </div>
      </n-gi>

      <n-gi>
        <n-form label-placement="top" :show-feedback="false">
          <n-form-item :label="$t('tools.id-photo.size')" mb-3>
            <div w-full flex flex-col gap-2>
              <n-select v-model:value="presetKey" :options="presetOptions" />
              <div v-if="presetKey === 'custom'" flex items-center gap-2>
                <n-input-number v-model:value="customWidth" :min="10" :max="10000" />
                <span>×</span>
                <n-input-number v-model:value="customHeight" :min="10" :max="10000" />
                <span text-12px op-60>px</span>
              </div>
              <span text-12px op-60>{{ $t('tools.id-photo.sizeHint') }}</span>
            </div>
          </n-form-item>

          <n-form-item :label="$t('tools.id-photo.background')" mb-3>
            <div w-full flex flex-col gap-2>
              <div flex flex-wrap items-center gap-2>
                <n-tooltip v-for="bg in backgrounds" :key="bg.key">
                  <template #trigger>
                    <button
                      type="button"
                      class="swatch"
                      :class="{ active: background.toLowerCase() === bg.color }"
                      :style="{ background: bg.color }"
                      :aria-label="$t(`tools.id-photo.colors.${bg.key}`)"
                      @click="background = bg.color"
                    />
                  </template>
                  {{ $t(`tools.id-photo.colors.${bg.key}`) }}
                </n-tooltip>
              </div>
              <n-color-picker v-model:value="background" :modes="['hex']" :show-alpha="false" />
            </div>
          </n-form-item>

          <n-form-item :label="$t('tools.id-photo.replaceBackground')" mb-3>
            <div flex flex-col gap-1>
              <n-switch v-model:value="replaceBackground" />
              <span text-12px op-60>{{ $t('tools.id-photo.replaceBackgroundHint') }}</span>
            </div>
          </n-form-item>

          <n-form-item :label="$t('tools.id-photo.adjust')" mb-3>
            <div w-full flex flex-col gap-1>
              <div v-for="item in adjustSliders" :key="item.key" flex items-center gap-2>
                <span w-60px shrink-0 text-12px>{{ $t(`tools.id-photo.${item.key}`) }}</span>
                <n-slider v-model:value="item.model.value" :min="-100" :max="100" :step="1" flex-1 />
                <span w-32px shrink-0 text-right text-12px op-70>{{ item.model.value }}</span>
              </div>
              <div>
                <c-button size="small" :disabled="!hasAdjustments" @click="resetAdjustments">
                  {{ $t('tools.id-photo.resetAdjust') }}
                </c-button>
              </div>
            </div>
          </n-form-item>

          <n-form-item :label="$t('tools.id-photo.format')" mb-3>
            <n-radio-group v-model:value="format" size="small">
              <n-radio-button value="jpeg" label="JPG" />
              <n-radio-button value="png" label="PNG" />
            </n-radio-group>
          </n-form-item>

          <n-form-item v-if="format === 'jpeg'" :label="$t('tools.id-photo.maxSize')" mb-3>
            <n-input-number v-model:value="maxSizeKb" :min="5" :max="10000" clearable :placeholder="$t('tools.id-photo.noLimit')" w-full>
              <template #suffix>
                KB
              </template>
            </n-input-number>
          </n-form-item>
        </n-form>

        <div flex gap-2>
          <c-button :disabled="isBusy" @click="generate">
            {{ $t('tools.id-photo.preview') }}
          </c-button>
          <c-button :disabled="isBusy" @click="saveResult">
            {{ $t('tools.id-photo.save') }}
          </c-button>
        </div>

        <div v-if="progressText" mt-2 text-12px op-70>
          {{ progressText }}
        </div>
      </n-gi>
    </n-grid>
  </div>
</template>

<style scoped>
.cropper-box {
  position: relative;
  width: 100%;
  height: 480px;
}

/* sits in the empty side area of the editor and never blocks dragging the photo */
.result-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  max-width: 28%;
  padding: 6px;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 6px;
  pointer-events: none;
}

.swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #8886;
  cursor: pointer;
  padding: 0;
}

.swatch.active {
  border-color: #18a058;
  box-shadow: 0 0 0 2px #18a05855;
}

.result-img {
  max-width: 100%;
  max-height: 200px;
  box-shadow: 0 1px 6px #0003;
}
</style>
