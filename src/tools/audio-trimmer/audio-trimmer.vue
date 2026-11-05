<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { computePeaks, encodeMp3, encodeWav, formatTime, sliceBuffer } from './audio-trimmer.service';

type OutputFormat = 'wav' | 'mp3';

const { t } = useI18n();
const message = useMessage();

const PEAK_COUNT = 1600;
const MIN_LENGTH = 0.05;
const MAX_FILE_MB = 200;

const fileName = ref('audio');
const buffer = shallowRef<AudioBuffer | null>(null);
const peaks = shallowRef<Float32Array | null>(null);
const duration = ref(0);
const start = ref(0);
const end = ref(0);
const isLoading = ref(false);
const isPlaying = ref(false);
const playhead = ref(0);

const isSaveOpen = ref(false);
const format = ref<OutputFormat>('mp3');
const bitrate = ref(192);
const isEncoding = ref(false);

const canvas = ref<HTMLCanvasElement>();
const track = ref<HTMLDivElement>();

let audioContext: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let frame = 0;

const selectedLength = computed(() => Math.max(0, end.value - start.value));
const startPercent = computed(() => (duration.value ? (start.value / duration.value) * 100 : 0));
const endPercent = computed(() => (duration.value ? (end.value / duration.value) * 100 : 100));
const playheadPercent = computed(() => (duration.value ? (playhead.value / duration.value) * 100 : 0));
const bitrateOptions = [96, 128, 192, 256, 320].map(value => ({ value, label: `${value} kbps` }));

function getContext() {
  audioContext ??= new AudioContext();
  return audioContext;
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
  const length = selectedLength.value;
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
  node.start(0, from, length);
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
  const data = peaks.value;
  if (!el || !data) {
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

  const mid = height / 2;
  const max = Math.max(...data, 0.01);
  for (let x = 0; x < width; x++) {
    const index = Math.min(data.length - 1, Math.floor((x / width) * data.length));
    const h = Math.max(1, (data[index] / max) * (height - 8));
    ctx.fillRect(x, mid - h / 2, 1, h);
  }
}

function resetSelection() {
  start.value = 0;
  end.value = duration.value;
  playhead.value = 0;
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
    buffer.value = decoded;
    peaks.value = computePeaks(decoded, PEAK_COUNT);
    duration.value = decoded.duration;
    fileName.value = file.name.replace(/\.[^.]+$/, '') || 'audio';
    resetSelection();
    await nextTick();
    drawWaveform();
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
  buffer.value = null;
  peaks.value = null;
  duration.value = 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function setStart(value: number | null) {
  start.value = clamp(value ?? 0, 0, end.value - MIN_LENGTH);
}

function setEnd(value: number | null) {
  end.value = clamp(value ?? duration.value, start.value + MIN_LENGTH, duration.value);
}

function timeAt(event: PointerEvent) {
  const rect = track.value!.getBoundingClientRect();
  return clamp(((event.clientX - rect.left) / rect.width) * duration.value, 0, duration.value);
}

let dragging: 'start' | 'end' | 'new' | null = null;
let anchor = 0;

function onPointerDown(event: PointerEvent) {
  if (!buffer.value) {
    return;
  }
  const rect = track.value!.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const startX = (start.value / duration.value) * rect.width;
  const endX = (end.value / duration.value) * rect.width;
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

async function confirmSave() {
  if (!buffer.value) {
    return;
  }
  isEncoding.value = true;
  try {
    const { channels, sampleRate } = sliceBuffer(buffer.value, start.value, end.value);
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

useEventListener(window, 'resize', drawWaveform);
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
      <div class="wave-wrap">
        <div
          ref="track"
          class="wave-track"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <canvas ref="canvas" class="wave-canvas" />
          <div class="dim" :style="{ left: 0, width: `${startPercent}%` }" />
          <div class="dim" :style="{ left: `${endPercent}%`, right: 0 }" />
          <div class="selection" :style="{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }" />
          <div class="handle" :style="{ left: `${startPercent}%` }" />
          <div class="handle" :style="{ left: `${endPercent}%` }" />
          <div v-if="isPlaying" class="playhead" :style="{ left: `${playheadPercent}%` }" />
        </div>
        <div mt-1 flex justify-between text-12px op-60>
          <span>00:00.00</span>
          <span>{{ formatTime(duration) }}</span>
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
        </div>
      </div>

      <div flex flex-wrap items-center justify-center gap-2>
        <c-button @click="togglePlay">
          {{ isPlaying ? $t('tools.audio-trimmer.stop') : $t('tools.audio-trimmer.play') }}
        </c-button>
        <c-button @click="resetSelection">
          {{ $t('tools.audio-trimmer.reset') }}
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

.dim {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  pointer-events: none;
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
