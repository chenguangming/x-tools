<script setup lang="ts">
import { useMessage } from 'naive-ui';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';
import type { Region } from 'wavesurfer.js/plugins/regions';
import TimelinePlugin from 'wavesurfer.js/plugins/timeline';
import type { Segment } from './audio-trimmer.service';
import { encodeMp3, encodeWav, formatTime, sliceBuffer, spliceBuffer } from './audio-trimmer.service';

type OutputFormat = 'wav' | 'mp3';

const { t } = useI18n();
const message = useMessage();

const MIN_LENGTH = 0.05;
const MAX_FILE_MB = 200;
const MAX_HISTORY = 20;
const MAX_ZOOM = 3000;
const REGION_COLOR = 'rgba(24, 160, 88, 0.28)';

const fileName = ref('audio');
const history = shallowRef<AudioBuffer[]>([]);
const cursor = ref(-1);
const start = ref(0);
const end = ref(0);
const currentTime = ref(0);
const isReady = ref(false);
const isBusy = ref(false);
const isPlaying = ref(false);
const pxPerSec = ref(0);

const isSaveOpen = ref(false);
const format = ref<OutputFormat>('mp3');
const bitrate = ref(192);
const isEncoding = ref(false);

const waveform = ref<HTMLDivElement>();

let ws: WaveSurfer | null = null;
let regions: RegionsPlugin | null = null;
const region = shallowRef<Region | null>(null);

const buffer = computed(() => history.value[cursor.value] ?? null);
const duration = computed(() => buffer.value?.duration ?? 0);
const canUndo = computed(() => cursor.value > 0 && !isBusy.value);
const canRedo = computed(() => cursor.value < history.value.length - 1 && !isBusy.value);
const selectedLength = computed(() => Math.max(0, end.value - start.value));
const remainingLength = computed(() => duration.value - selectedLength.value);
const isZoomed = computed(() => pxPerSec.value > 0);
const bitrateOptions = [96, 128, 192, 256, 320].map(value => ({ value, label: `${value} kbps` }));

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toWav(audio: AudioBuffer) {
  const { channels, sampleRate } = sliceBuffer(audio, [[0, audio.duration]]);
  return encodeWav(channels, sampleRate);
}

// without a region the whole audio is the selection, which also leaves empty space to drag a new one
function resetRegion() {
  regions?.clearRegions();
  region.value = null;
  start.value = 0;
  end.value = duration.value;
}

function setRegion(first: number, last: number) {
  if (region.value) {
    region.value.setOptions({ start: first, end: last });
  }
  else {
    regions?.addRegion({ start: first, end: last, color: REGION_COLOR, drag: true, resize: true });
  }
  start.value = first;
  end.value = last;
}

async function load(blob: Blob) {
  pxPerSec.value = 0;
  currentTime.value = 0;
  await ws!.loadBlob(blob);
}

async function showHistory(list: AudioBuffer[], index: number) {
  ws?.pause();
  isBusy.value = true;
  try {
    await load(toWav(list[index]));
    history.value = list;
    cursor.value = index;
    resetRegion();
  }
  catch {
    message.error(t('tools.audio-trimmer.decodeFailed'));
  }
  finally {
    isBusy.value = false;
  }
}

function commit(next: AudioBuffer) {
  const list = [...history.value.slice(0, cursor.value + 1), next].slice(-MAX_HISTORY);
  return showHistory(list, list.length - 1);
}

function undo() {
  if (canUndo.value) {
    showHistory(history.value, cursor.value - 1);
  }
}

function redo() {
  if (canRedo.value) {
    showHistory(history.value, cursor.value + 1);
  }
}

function trimToSelection() {
  if (buffer.value && !isBusy.value && selectedLength.value >= MIN_LENGTH) {
    commit(spliceBuffer(buffer.value, [[start.value, end.value]]));
  }
}

function deleteSelection() {
  if (!buffer.value || isBusy.value || remainingLength.value < MIN_LENGTH) {
    return;
  }
  const segments = ([[0, start.value], [end.value, duration.value]] as Segment[]).filter(([a, b]) => b - a > 0.0005);
  commit(spliceBuffer(buffer.value, segments));
}

function togglePlay() {
  ws?.playPause();
}

function playSelection() {
  ws?.play(start.value, end.value);
}

function applyZoom(value: number) {
  pxPerSec.value = value;
  ws?.zoom(value);
}

function zoomBy(factor: number) {
  const fit = ws!.getWidth() / duration.value;
  const next = (pxPerSec.value || fit) * factor;
  applyZoom(next <= fit * 1.01 ? 0 : Math.min(MAX_ZOOM, next));
}

function zoomToSelection() {
  const pad = selectedLength.value * 0.1;
  applyZoom(Math.min(MAX_ZOOM, ws!.getWidth() / (selectedLength.value + pad * 2)));
  ws!.setScrollTime(Math.max(0, start.value - pad));
}

function seek(value: number) {
  ws?.setTime(value);
  currentTime.value = value;
}

function setStart(value: number | null) {
  setRegion(clamp(value ?? 0, 0, end.value - MIN_LENGTH), end.value);
}

function setEnd(value: number | null) {
  setRegion(start.value, clamp(value ?? duration.value, start.value + MIN_LENGTH, duration.value));
}

async function onUpload(file: File) {
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    message.error(t('tools.audio-trimmer.tooLarge', { size: MAX_FILE_MB }));
    return;
  }
  isBusy.value = true;
  try {
    // wavesurfer decodes at a low sample rate for drawing, so keep a full-quality copy for editing and export
    const context = new AudioContext();
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    context.close().catch(() => {});
    await load(file);
    fileName.value = file.name.replace(/\.[^.]+$/, '') || 'audio';
    history.value = [decoded];
    cursor.value = 0;
    isReady.value = true;
    resetRegion();
  }
  catch {
    message.error(t('tools.audio-trimmer.decodeFailed'));
  }
  finally {
    isBusy.value = false;
  }
}

function chooseAnother() {
  ws?.pause();
  isReady.value = false;
  history.value = [];
  cursor.value = -1;
}

async function confirmSave() {
  if (!buffer.value) {
    return;
  }
  isEncoding.value = true;
  try {
    const { channels, sampleRate } = sliceBuffer(buffer.value, [[0, duration.value]]);
    const blob = format.value === 'wav'
      ? encodeWav(channels, sampleRate)
      : await encodeMp3(channels, sampleRate, bitrate.value);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.value}-trimmed.${format.value}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    isSaveOpen.value = false;
  }
  catch {
    message.error(t('tools.audio-trimmer.encodeFailed'));
  }
  finally {
    isEncoding.value = false;
  }
}

onMounted(() => {
  ws = WaveSurfer.create({
    container: waveform.value!,
    height: 160,
    waveColor: '#18a058',
    progressColor: '#0c7a43',
    cursorColor: '#f0a020',
    cursorWidth: 2,
    normalize: true,
    autoScroll: true,
    autoCenter: true,
    plugins: [TimelinePlugin.create()],
  });
  regions = ws.registerPlugin(RegionsPlugin.create());
  regions.enableDragSelection({ color: REGION_COLOR, drag: true, resize: true });

  regions.on('region-created', (created) => {
    regions!.getRegions().forEach((other) => {
      if (other !== created) {
        other.remove();
      }
    });
    region.value = created;
    start.value = created.start;
    end.value = created.end;
  });
  const syncRegion = (updated: Region) => {
    start.value = updated.start;
    end.value = updated.end;
  };
  regions.on('region-update', syncRegion);
  regions.on('region-updated', syncRegion);

  ws.on('timeupdate', time => (currentTime.value = time));
  ws.on('play', () => (isPlaying.value = true));
  ws.on('pause', () => (isPlaying.value = false));
  ws.on('finish', () => (isPlaying.value = false));
});

useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (!isReady.value || !(event.ctrlKey || event.metaKey) || (event.target as HTMLElement)?.tagName === 'INPUT') {
    return;
  }
  const key = event.key.toLowerCase();
  if (key === 'z' && !event.shiftKey) {
    event.preventDefault();
    undo();
  }
  else if (key === 'y' || (key === 'z' && event.shiftKey)) {
    event.preventDefault();
    redo();
  }
});

onBeforeUnmount(() => ws?.destroy());
</script>

<template>
  <div>
    <c-file-upload
      v-if="!isReady"
      accept="audio/*"
      :title="$t('tools.audio-trimmer.upload')"
      @file-upload="onUpload"
    />
    <div v-if="isBusy && !isReady" mt-3 text-center op-70>
      {{ $t('tools.audio-trimmer.decoding') }}
    </div>

    <div v-show="isReady" class="editor" flex flex-col gap-4>
      <div flex flex-wrap items-center justify-center gap-2>
        <c-button :disabled="!canUndo" @click="undo">
          {{ $t('tools.audio-trimmer.undo') }}
        </c-button>
        <c-button :disabled="!canRedo" @click="redo">
          {{ $t('tools.audio-trimmer.redo') }}
        </c-button>
        <c-button :disabled="isBusy" @click="zoomBy(2)">
          {{ $t('tools.audio-trimmer.zoomIn') }}
        </c-button>
        <c-button :disabled="isBusy || !isZoomed" @click="zoomBy(0.5)">
          {{ $t('tools.audio-trimmer.zoomOut') }}
        </c-button>
        <c-button :disabled="isBusy" @click="zoomToSelection">
          {{ $t('tools.audio-trimmer.zoomSelection') }}
        </c-button>
        <c-button :disabled="isBusy || !isZoomed" @click="applyZoom(0)">
          {{ $t('tools.audio-trimmer.zoomFit') }}
        </c-button>
      </div>

      <div ref="waveform" class="waveform" />

      <div flex items-center gap-3>
        <c-button :disabled="isBusy" @click="togglePlay">
          {{ isPlaying ? $t('tools.audio-trimmer.pause') : $t('tools.audio-trimmer.playAll') }}
        </c-button>
        <n-slider
          :value="currentTime"
          :min="0"
          :max="duration || 1"
          :step="0.01"
          :tooltip="false"
          class="flex-1"
          @update:value="seek"
        />
        <span class="time-label" op-70>{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
      </div>

      <div flex flex-wrap items-center gap-4>
        <div flex items-center gap-2>
          <span op-70>{{ $t('tools.audio-trimmer.start') }}</span>
          <n-input-number
            :value="Number(start.toFixed(2))"
            :min="0"
            :max="duration"
            :step="0.1"
            size="small"
            style="width: 120px"
            @update:value="setStart"
          >
            <template #suffix>
              s
            </template>
          </n-input-number>
        </div>
        <div flex items-center gap-2>
          <span op-70>{{ $t('tools.audio-trimmer.end') }}</span>
          <n-input-number
            :value="Number(end.toFixed(2))"
            :min="0"
            :max="duration"
            :step="0.1"
            size="small"
            style="width: 120px"
            @update:value="setEnd"
          >
            <template #suffix>
              s
            </template>
          </n-input-number>
        </div>
        <div op-70>
          {{ $t('tools.audio-trimmer.selected', { length: formatTime(selectedLength) }) }}
          · {{ $t('tools.audio-trimmer.total', { length: formatTime(duration) }) }}
        </div>
      </div>

      <div flex flex-wrap items-center justify-center gap-2>
        <c-button :disabled="isBusy" @click="playSelection">
          {{ $t('tools.audio-trimmer.play') }}
        </c-button>
        <c-button :disabled="isBusy || selectedLength >= duration - 0.001" @click="trimToSelection">
          {{ $t('tools.audio-trimmer.trimToSelection') }}
        </c-button>
        <c-button :disabled="isBusy || remainingLength < MIN_LENGTH" @click="deleteSelection">
          {{ $t('tools.audio-trimmer.deleteSelection') }}
        </c-button>
        <c-button :disabled="isBusy || !region" @click="resetRegion">
          {{ $t('tools.audio-trimmer.resetSelection') }}
        </c-button>
        <c-button @click="chooseAnother">
          {{ $t('tools.audio-trimmer.chooseAnother') }}
        </c-button>
        <c-button type="primary" class="solid-primary" :disabled="isBusy" @click="isSaveOpen = true">
          {{ $t('tools.audio-trimmer.save') }}
        </c-button>
      </div>
      <div text-center text-12px op-60>
        {{ $t('tools.audio-trimmer.hint') }}
      </div>
    </div>

    <c-modal v-model:open="isSaveOpen">
      <div class="save-dialog" flex flex-col gap-3>
        <div>
          <div mb-1 font-bold>
            {{ $t('tools.audio-trimmer.format') }}
          </div>
          <n-radio-group v-model:value="format" size="small">
            <n-radio-button value="mp3" label="MP3" />
            <n-radio-button value="wav" label="WAV" />
          </n-radio-group>
        </div>
        <div v-if="format === 'mp3'">
          <div mb-1 font-bold>
            {{ $t('tools.audio-trimmer.bitrate') }}
          </div>
          <n-select v-model:value="bitrate" :options="bitrateOptions" size="small" />
        </div>
        <div v-else text-12px op-60>
          {{ $t('tools.audio-trimmer.wavHint') }}
        </div>
        <div flex justify-end gap-2>
          <c-button :disabled="isEncoding" @click="isSaveOpen = false">
            {{ $t('tools.audio-trimmer.cancel') }}
          </c-button>
          <c-button type="primary" class="solid-primary" :disabled="isEncoding" @click="confirmSave">
            {{ isEncoding ? $t('tools.audio-trimmer.encoding') : $t('tools.audio-trimmer.download') }}
          </c-button>
        </div>
      </div>
    </c-modal>
  </div>
</template>

<style scoped>
.waveform {
  width: 0;
  min-width: 100%;
  height: 204px;
  padding: 4px 0;
  overflow: hidden;
  background: rgba(128, 128, 128, 0.12);
  border-radius: 6px;
}

.editor {
  min-width: 0;
  max-width: 100%;
}

.time-label {
  min-width: 150px;
  font-size: 12px;
  text-align: right;
  white-space: nowrap;
}

.save-dialog {
  min-width: min(320px, 80vw);
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
