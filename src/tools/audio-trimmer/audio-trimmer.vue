<script setup lang="ts">
import { useMessage } from 'naive-ui';
import type { Segment } from './audio-trimmer.service';
import { computePeaks, encodeMp3, encodeWav, formatTime, sliceBuffer, spliceBuffer } from './audio-trimmer.service';

type OutputFormat = 'wav' | 'mp3';

const { t } = useI18n();
const message = useMessage();

const MIN_LENGTH = 0.05;
const MIN_VIEW = 0.2;
const MAX_FILE_MB = 200;
const MAX_HISTORY = 20;

const fileName = ref('audio');
const history = shallowRef<AudioBuffer[]>([]);
const cursor = ref(-1);
const start = ref(0);
const end = ref(0);
const viewStart = ref(0);
const viewEnd = ref(0);
const isLoading = ref(false);
const isPlaying = ref(false);
const playhead = ref(0);

const isSaveOpen = ref(false);
const format = ref<OutputFormat>('mp3');
const bitrate = ref(192);
const isEncoding = ref(false);

const canvas = ref<HTMLCanvasElement>();
const track = ref<HTMLDivElement>();
const scroller = ref<HTMLDivElement>();

let audioContext: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let frame = 0;
// the loudest peak of the current audio, so quiet files still fill the waveform
let scaleFor: AudioBuffer | null = null;
let scale = 1;

const buffer = computed(() => history.value[cursor.value] ?? null);
const duration = computed(() => buffer.value?.duration ?? 0);
const canUndo = computed(() => cursor.value > 0);
const canRedo = computed(() => cursor.value < history.value.length - 1);
const selectedLength = computed(() => Math.max(0, end.value - start.value));
const remainingLength = computed(() => duration.value - selectedLength.value);
const viewLength = computed(() => viewEnd.value - viewStart.value);
const isZoomed = computed(() => viewLength.value < duration.value - 0.001);
const bitrateOptions = [96, 128, 192, 256, 320].map(value => ({ value, label: `${value} kbps` }));

function percent(time: number) {
  return viewLength.value ? ((time - viewStart.value) / viewLength.value) * 100 : 0;
}
const startPercent = computed(() => percent(start.value));
const endPercent = computed(() => percent(end.value));
const playheadPercent = computed(() => percent(playhead.value));
const thumbStyle = computed(() => ({
  left: `${(viewStart.value / duration.value) * 100}%`,
  width: `${(viewLength.value / duration.value) * 100}%`,
}));

function getContext() {
  audioContext ??= new AudioContext();
  return audioContext;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stop() {
  if (source) {
    source.onended = null;
    try {
      source.stop();
    }
    catch {}
    source.disconnect();
    source = null;
  }
  cancelAnimationFrame(frame);
  isPlaying.value = false;
}

function play() {
  if (!buffer.value) {
    return;
  }
  stop();
  const ctx = getContext();
  ctx.resume().catch(() => {});
  const from = start.value;
  const node = ctx.createBufferSource();
  node.buffer = buffer.value;
  node.connect(ctx.destination);
  node.onended = () => {
    if (source === node) {
      stop();
    }
  };
  source = node;
  const startedAt = ctx.currentTime;
  node.start(0, from, selectedLength.value);
  isPlaying.value = true;

  const tick = () => {
    if (!isPlaying.value) {
      return;
    }
    playhead.value = Math.min(end.value, from + (ctx.currentTime - startedAt));
    frame = requestAnimationFrame(tick);
  };
  tick();
}

function togglePlay() {
  if (isPlaying.value) {
    stop();
  }
  else {
    play();
  }
}

function drawWaveform() {
  const el = canvas.value;
  const audio = buffer.value;
  if (!el || !audio || !viewLength.value) {
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  const width = el.clientWidth;
  const height = el.clientHeight;
  el.width = Math.round(width * dpr);
  el.height = Math.round(height * dpr);
  const ctx = el.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#18a058';

  if (scaleFor !== audio) {
    scaleFor = audio;
    scale = Math.max(0.01, ...computePeaks(audio, 2000, 0, audio.duration));
  }
  const data = computePeaks(audio, width, viewStart.value, viewEnd.value);
  const mid = height / 2;
  for (let x = 0; x < width; x++) {
    const h = Math.max(1, Math.min(1, data[x] / scale) * (height - 8));
    ctx.fillRect(x, mid - h / 2, 1, h);
  }
}

function resetView() {
  viewStart.value = 0;
  viewEnd.value = duration.value;
}

function resetSelection() {
  start.value = 0;
  end.value = duration.value;
  playhead.value = 0;
}

function setHistory(list: AudioBuffer[], index: number) {
  stop();
  history.value = list;
  cursor.value = index;
  resetSelection();
  resetView();
}

function commit(next: AudioBuffer) {
  const list = [...history.value.slice(0, cursor.value + 1), next].slice(-MAX_HISTORY);
  setHistory(list, list.length - 1);
}

function undo() {
  if (canUndo.value) {
    setHistory(history.value, cursor.value - 1);
  }
}

function redo() {
  if (canRedo.value) {
    setHistory(history.value, cursor.value + 1);
  }
}

function trimToSelection() {
  if (buffer.value && selectedLength.value >= MIN_LENGTH) {
    commit(spliceBuffer(buffer.value, [[start.value, end.value]]));
  }
}

function deleteSelection() {
  if (!buffer.value || remainingLength.value < MIN_LENGTH) {
    return;
  }
  const segments = ([[0, start.value], [end.value, duration.value]] as Segment[]).filter(([a, b]) => b - a > 0.0005);
  commit(spliceBuffer(buffer.value, segments));
}

function zoomAround(factor: number, center: number) {
  const length = clamp(viewLength.value * factor, Math.min(MIN_VIEW, duration.value), duration.value);
  const ratio = (center - viewStart.value) / viewLength.value;
  const first = clamp(center - ratio * length, 0, duration.value - length);
  viewStart.value = first;
  viewEnd.value = first + length;
}

function zoomToSelection() {
  const pad = Math.max(selectedLength.value * 0.1, 0.02);
  let first = start.value - pad;
  let last = end.value + pad;
  const length = Math.min(Math.max(last - first, MIN_VIEW), duration.value);
  const mid = (first + last) / 2;
  first = clamp(mid - length / 2, 0, duration.value - length);
  last = first + length;
  viewStart.value = first;
  viewEnd.value = last;
}

function pan(delta: number) {
  const first = clamp(viewStart.value + delta, 0, duration.value - viewLength.value);
  viewEnd.value = first + viewLength.value;
  viewStart.value = first;
}

function onWheel(event: WheelEvent) {
  if (!buffer.value) {
    return;
  }
  const rect = track.value!.getBoundingClientRect();
  const time = viewStart.value + ((event.clientX - rect.left) / rect.width) * viewLength.value;
  if (event.ctrlKey || event.metaKey) {
    zoomAround(event.deltaY > 0 ? 1.25 : 0.8, time);
  }
  else if (isZoomed.value) {
    pan(((event.deltaX || event.deltaY) / rect.width) * viewLength.value);
  }
}

async function onUpload(file: File) {
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    message.error(t('tools.audio-trimmer.tooLarge', { size: MAX_FILE_MB }));
    return;
  }
  stop();
  isLoading.value = true;
  try {
    const decoded = await getContext().decodeAudioData(await file.arrayBuffer());
    fileName.value = file.name.replace(/\.[^.]+$/, '') || 'audio';
    setHistory([decoded], 0);
  }
  catch {
    message.error(t('tools.audio-trimmer.decodeFailed'));
  }
  finally {
    isLoading.value = false;
  }
}

function chooseAnother() {
  stop();
  history.value = [];
  cursor.value = -1;
}

function setStart(value: number | null) {
  start.value = clamp(value ?? 0, 0, end.value - MIN_LENGTH);
}

function setEnd(value: number | null) {
  end.value = clamp(value ?? duration.value, start.value + MIN_LENGTH, duration.value);
}

function timeAt(event: PointerEvent) {
  const rect = track.value!.getBoundingClientRect();
  return clamp(viewStart.value + ((event.clientX - rect.left) / rect.width) * viewLength.value, 0, duration.value);
}

let dragging: 'start' | 'end' | 'new' | null = null;
let anchor = 0;

function onPointerDown(event: PointerEvent) {
  if (!buffer.value) {
    return;
  }
  const rect = track.value!.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const startX = (percent(start.value) / 100) * rect.width;
  const endX = (percent(end.value) / 100) * rect.width;
  const grab = 12;

  if (Math.abs(x - startX) <= grab && Math.abs(x - startX) <= Math.abs(x - endX)) {
    dragging = 'start';
  }
  else if (Math.abs(x - endX) <= grab) {
    dragging = 'end';
  }
  else {
    dragging = 'new';
    anchor = timeAt(event);
  }
  stop();
  track.value!.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (!dragging) {
    return;
  }
  const time = timeAt(event);
  if (dragging === 'start') {
    setStart(time);
  }
  else if (dragging === 'end') {
    setEnd(time);
  }
  else {
    let a = Math.min(anchor, time);
    let b = Math.max(anchor, time);
    if (b - a < MIN_LENGTH) {
      b = Math.min(duration.value, a + MIN_LENGTH);
      a = b - MIN_LENGTH;
    }
    start.value = Math.max(0, a);
    end.value = b;
  }
  playhead.value = start.value;
}

function onPointerUp() {
  dragging = null;
}

// the scrollbar thumb pans the zoomed view
let thumbDrag: { x: number; first: number } | null = null;

function onThumbDown(event: PointerEvent) {
  thumbDrag = { x: event.clientX, first: viewStart.value };
  (event.target as HTMLElement).setPointerCapture(event.pointerId);
}

function onThumbMove(event: PointerEvent) {
  if (!thumbDrag) {
    return;
  }
  const width = scroller.value!.clientWidth;
  const first = thumbDrag.first + ((event.clientX - thumbDrag.x) / width) * duration.value;
  pan(first - viewStart.value);
}

function onThumbUp() {
  thumbDrag = null;
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

watch([cursor, viewStart, viewEnd], async () => {
  await nextTick();
  drawWaveform();
});

useEventListener(window, 'resize', drawWaveform);
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (!buffer.value || !(event.ctrlKey || event.metaKey) || (event.target as HTMLElement)?.tagName === 'INPUT') {
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
onBeforeUnmount(() => {
  stop();
  audioContext?.close().catch(() => {});
});
</script>

<template>
  <div>
    <c-file-upload
      v-if="!buffer"
      accept="audio/*"
      :title="$t('tools.audio-trimmer.upload')"
      @file-upload="onUpload"
    />
    <div v-if="isLoading" mt-3 text-center op-70>
      {{ $t('tools.audio-trimmer.decoding') }}
    </div>

    <div v-if="buffer" flex flex-col gap-4>
      <div flex flex-wrap items-center justify-center gap-2>
        <c-button :disabled="!canUndo" @click="undo">
          {{ $t('tools.audio-trimmer.undo') }}
        </c-button>
        <c-button :disabled="!canRedo" @click="redo">
          {{ $t('tools.audio-trimmer.redo') }}
        </c-button>
        <c-button @click="zoomAround(0.5, (viewStart + viewEnd) / 2)">
          {{ $t('tools.audio-trimmer.zoomIn') }}
        </c-button>
        <c-button :disabled="!isZoomed" @click="zoomAround(2, (viewStart + viewEnd) / 2)">
          {{ $t('tools.audio-trimmer.zoomOut') }}
        </c-button>
        <c-button @click="zoomToSelection">
          {{ $t('tools.audio-trimmer.zoomSelection') }}
        </c-button>
        <c-button :disabled="!isZoomed" @click="resetView">
          {{ $t('tools.audio-trimmer.zoomFit') }}
        </c-button>
      </div>

      <div class="wave-wrap">
        <div
          ref="track"
          class="wave-track"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @wheel.prevent="onWheel"
        >
          <canvas ref="canvas" class="wave-canvas" />
          <div class="selection" :style="{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }" />
          <div class="handle" :style="{ left: `${startPercent}%` }" />
          <div class="handle" :style="{ left: `${endPercent}%` }" />
          <div v-if="isPlaying" class="playhead" :style="{ left: `${playheadPercent}%` }" />
        </div>
        <div v-show="isZoomed" ref="scroller" class="scroller">
          <div
            class="thumb"
            :style="thumbStyle"
            @pointerdown="onThumbDown"
            @pointermove="onThumbMove"
            @pointerup="onThumbUp"
            @pointercancel="onThumbUp"
          />
        </div>
        <div mt-1 flex justify-between text-12px op-60>
          <span>{{ formatTime(viewStart) }}</span>
          <span>{{ formatTime(viewEnd) }}</span>
        </div>
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
        <c-button @click="togglePlay">
          {{ isPlaying ? $t('tools.audio-trimmer.stop') : $t('tools.audio-trimmer.play') }}
        </c-button>
        <c-button :disabled="selectedLength >= duration - 0.001" @click="trimToSelection">
          {{ $t('tools.audio-trimmer.trimToSelection') }}
        </c-button>
        <c-button :disabled="remainingLength < MIN_LENGTH" @click="deleteSelection">
          {{ $t('tools.audio-trimmer.deleteSelection') }}
        </c-button>
        <c-button @click="chooseAnother">
          {{ $t('tools.audio-trimmer.chooseAnother') }}
        </c-button>
        <c-button type="primary" class="solid-primary" @click="isSaveOpen = true">
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
.wave-track {
  position: relative;
  height: 160px;
  overflow: hidden;
  cursor: crosshair;
  touch-action: none;
  user-select: none;
  background: rgba(128, 128, 128, 0.12);
  border-radius: 6px;
}

.wave-canvas {
  width: 100%;
  height: 100%;
}

.selection {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(24, 160, 88, 0.12);
  pointer-events: none;

}

.handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  margin-left: -2px;
  cursor: ew-resize;
  background: #18a058;
}

.handle::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14px;
  height: 28px;
  content: '';
  background: #18a058;
  border-radius: 4px;
  transform: translate(-50%, -50%);
}

.scroller {
  position: relative;
  height: 10px;
  margin-top: 6px;
  background: rgba(128, 128, 128, 0.15);
  border-radius: 5px;
}

.thumb {
  position: absolute;
  top: 0;
  bottom: 0;
  min-width: 12px;
  cursor: grab;
  background: rgba(24, 160, 88, 0.7);
  border-radius: 5px;
  touch-action: none;
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #fff;
  pointer-events: none;
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
