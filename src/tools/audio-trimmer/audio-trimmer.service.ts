export type Segment = [number, number];

export function sliceBuffer(buffer: AudioBuffer, segments: Segment[]) {
  const channels: Float32Array[] = [];
  for (let c = 0; c < Math.min(buffer.numberOfChannels, 2); c++) {
    const data = buffer.getChannelData(c);
    const parts = segments.map(([start, end]) => {
      const from = Math.max(0, Math.floor(start * buffer.sampleRate));
      const to = Math.min(buffer.length, Math.ceil(end * buffer.sampleRate));
      return data.subarray(from, to);
    });
    const out = new Float32Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    channels.push(out);
  }
  return { channels, sampleRate: buffer.sampleRate };
}

function toInt16(samples: Float32Array) {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return out;
}

export function encodeWav(channels: Float32Array[], sampleRate: number) {
  const numChannels = channels.length;
  const length = channels[0].length;
  const dataSize = length * numChannels * 2;
  const view = new DataView(new ArrayBuffer(44 + dataSize));
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const pcm = channels.map(toInt16);
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      view.setInt16(offset, pcm[c][i], true);
      offset += 2;
    }
  }
  return new Blob([view], { type: 'audio/wav' });
}

interface Mp3Module {
  Mp3Encoder: new (channels: number, sampleRate: number, kbps: number) => {
    encodeBuffer: (left: Int16Array, right?: Int16Array) => Uint8Array
    flush: () => Uint8Array
  }
}

// lamejs (LGPL-3.0) is shipped as a separate file so it stays replaceable and is only fetched when needed
export async function encodeMp3(channels: Float32Array[], sampleRate: number, kbps: number) {
  const url = new URL(`${import.meta.env.BASE_URL}vendor/lamejs.js`, window.location.origin).href;
  const { Mp3Encoder } = (await import(/* @vite-ignore */ url)) as Mp3Module;
  const encoder = new Mp3Encoder(channels.length, sampleRate, kbps);
  const left = toInt16(channels[0]);
  const right = channels[1] ? toInt16(channels[1]) : undefined;
  const chunks: Uint8Array[] = [];
  const blockSize = 1152 * 10;

  for (let i = 0; i < left.length; i += blockSize) {
    const chunk = right
      ? encoder.encodeBuffer(left.subarray(i, i + blockSize), right.subarray(i, i + blockSize))
      : encoder.encodeBuffer(left.subarray(i, i + blockSize));
    if (chunk.length) {
      chunks.push(chunk);
    }
    if (i % (blockSize * 20) === 0) {
      await new Promise(resolve => setTimeout(resolve));
    }
  }
  const tail = encoder.flush();
  if (tail.length) {
    chunks.push(tail);
  }
  return new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
}

export function spliceBuffer(buffer: AudioBuffer, segments: Segment[]) {
  const { channels, sampleRate } = sliceBuffer(buffer, segments);
  const result = new AudioBuffer({ numberOfChannels: channels.length, length: Math.max(1, channels[0].length), sampleRate });
  channels.forEach((data, index) => result.copyToChannel(data, index));
  return result;
}

export function formatTime(seconds: number) {
  const total = Math.max(0, seconds);
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}
