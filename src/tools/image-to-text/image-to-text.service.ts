export interface OcrWorker {
  recognize: (image: Blob) => Promise<{ data: { text: string; confidence: number } }>
  terminate: () => Promise<unknown>
}

interface TesseractModule {
  createWorker: (
    langs: string[],
    oem: number,
    options: Record<string, unknown>,
  ) => Promise<OcrWorker>
}

const MAX_SIDE = 3500;

function vendorUrl(path: string) {
  return new URL(`${import.meta.env.BASE_URL}vendor/tesseract/${path}`, window.location.origin).href;
}

// Tesseract.js, its WASM core and the language data are self-hosted under public/vendor/tesseract,
// so nothing is fetched from third-party CDNs and they are only downloaded when OCR is used.
export async function createOcrWorker(langs: string[], onProgress: (progress: number) => void): Promise<OcrWorker> {
  const module = await import(/* @vite-ignore */ vendorUrl('tesseract.esm.min.js')) as { default: TesseractModule };
  return module.default.createWorker(langs, 1, {
    workerPath: vendorUrl('worker.min.js'),
    corePath: vendorUrl(''),
    langPath: vendorUrl('lang'),
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        onProgress(m.progress);
      }
    },
  });
}

// Very large photos make recognition slow and memory hungry without improving accuracy
export async function prepareImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}
