const BASE = import.meta.env.BASE_URL;
const ORT_DIR = `${BASE}models/ort/`;
const MODEL_URL = `${BASE}models/modnet/model.onnx`;

// MODNet is trained on portraits: shortest edge ~512px, both sides a multiple of 32
const SHORT_EDGE = 512;
const DIVISOR = 32;

interface OrtTensor { data: Float32Array }
interface OrtSession {
  inputNames: string[]
  outputNames: string[]
  run: (feeds: Record<string, unknown>) => Promise<Record<string, OrtTensor>>
}
interface OrtModule {
  env: { wasm: { wasmPaths: string; numThreads: number } }
  InferenceSession: { create: (data: Uint8Array, options?: unknown) => Promise<OrtSession> }
  Tensor: new (type: 'float32', data: Float32Array, dims: number[]) => unknown
}

let sessionPromise: Promise<{ ort: OrtModule; session: OrtSession }> | null = null;

async function download(url: string, onProgress?: (ratio: number) => void) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}`);
  }

  const total = Number(response.headers.get('content-length')) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    received += value.length;
    if (total) {
      onProgress?.(Math.min(received / total, 1));
    }
  }

  const data = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.length;
  }
  return data;
}

function loadSession(onProgress?: (ratio: number) => void) {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ortUrl = new URL(`${ORT_DIR}ort.wasm.min.mjs`, window.location.origin).href;
      const ort = (await import(/* @vite-ignore */ ortUrl)) as OrtModule;
      ort.env.wasm.wasmPaths = new URL(ORT_DIR, window.location.origin).href;
      // a single thread avoids the need for cross-origin isolation headers
      ort.env.wasm.numThreads = 1;

      const model = await download(MODEL_URL, onProgress);
      const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
      return { ort, session };
    })().catch((error) => {
      sessionPromise = null;
      throw error;
    });
  }
  return sessionPromise;
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Removes the background of a portrait locally (MODNet via ONNX Runtime Web).
 * Returns a canvas of the same size as the input with a transparent background.
 */
export async function removeBackground(image: HTMLImageElement | HTMLCanvasElement, onProgress?: (ratio: number) => void) {
  const { ort, session } = await loadSession(onProgress);

  const width = image.width;
  const height = image.height;
  const scale = SHORT_EDGE / Math.min(width, height);
  const inWidth = Math.max(DIVISOR, Math.round((width * scale) / DIVISOR) * DIVISOR);
  const inHeight = Math.max(DIVISOR, Math.round((height * scale) / DIVISOR) * DIVISOR);

  const small = createCanvas(inWidth, inHeight);
  const smallCtx = small.getContext('2d')!;
  smallCtx.imageSmoothingQuality = 'high';
  smallCtx.drawImage(image, 0, 0, inWidth, inHeight);
  const { data: rgba } = smallCtx.getImageData(0, 0, inWidth, inHeight);

  const plane = inWidth * inHeight;
  const input = new Float32Array(plane * 3);
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) {
      input[c * plane + i] = (rgba[i * 4 + c] / 255 - 0.5) / 0.5;
    }
  }

  const feeds = { [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, inHeight, inWidth]) };
  const output = await session.run(feeds);
  const matte = output[session.outputNames[0]].data;

  const maskImage = smallCtx.createImageData(inWidth, inHeight);
  for (let i = 0; i < plane; i++) {
    maskImage.data[i * 4 + 3] = Math.round(Math.min(Math.max(matte[i], 0), 1) * 255);
  }
  const mask = createCanvas(inWidth, inHeight);
  mask.getContext('2d')!.putImageData(maskImage, 0, 0);

  const result = createCanvas(width, height);
  const ctx = result.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(mask, 0, 0, width, height);
  return result;
}
