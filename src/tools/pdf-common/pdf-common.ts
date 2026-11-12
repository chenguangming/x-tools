import { vendorUrl } from '../pdf-to-word/pdf-to-word.service';

// pdf-lib (MIT) and fflate (MIT) are self-hosted under public/vendor and only fetched when a tool needs them
const scripts = new Map<string, Promise<void>>();
function loadScript(file: string) {
  if (!scripts.has(file)) {
    scripts.set(file, new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = vendorUrl(file);
      script.onload = () => resolve();
      script.onerror = () => {
        scripts.delete(file);
        reject(new Error(`Failed to load ${file}`));
      };
      document.head.appendChild(script);
    }));
  }
  return scripts.get(file)!;
}

export interface PdfLibImage { width: number; height: number }
export interface PdfLibPage {
  drawImage: (image: PdfLibImage, options: { x: number; y: number; width: number; height: number }) => void
}

export interface PdfLibDocument {
  getPageCount: () => number
  getPageIndices: () => number[]
  addPage: (page?: unknown) => PdfLibPage
  copyPages: (src: PdfLibDocument, indices: number[]) => Promise<unknown[]>
  embedJpg: (data: Uint8Array) => Promise<PdfLibImage>
  embedPng: (data: Uint8Array) => Promise<PdfLibImage>
  save: () => Promise<Uint8Array>
}
export interface PdfLib {
  PDFDocument: {
    create: () => Promise<PdfLibDocument>
    load: (data: ArrayBuffer | Uint8Array, options?: Record<string, unknown>) => Promise<PdfLibDocument>
  }
}

export async function loadPdfLib(): Promise<PdfLib> {
  await loadScript('pdf-lib.min.js');
  return (window as any).PDFLib;
}

export interface Fflate {
  zipSync: (files: Record<string, Uint8Array>, options?: { level?: number }) => Uint8Array
}

export async function loadFflate(): Promise<Fflate> {
  await loadScript('fflate.js');
  return (window as any).fflate;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function baseName(name: string) {
  return name.replace(/\.[^.]+$/, '') || 'file';
}

export function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Parses "1-3, 5, 8-" into zero-based, de-duplicated page indices in the order written. Returns null when invalid.
export function parsePageRanges(input: string, total: number): number[] | null {
  const result: number[] = [];
  const seen = new Set<number>();
  for (const part of input.split(/[,，;；\s]+/).filter(Boolean)) {
    const match = part.match(/^(\d*)(?:[-–~](\d*))?$/);
    if (!match || (match[1] === '' && match[2] === undefined) || (match[1] === '' && match[2] === '')) {
      return null;
    }
    const isRange = part.length > match[1].length;
    const from = match[1] === '' ? 1 : Number(match[1]);
    const to = isRange ? (match[2] === '' ? total : Number(match[2])) : from;
    if (from < 1 || to > total || from > to) {
      return null;
    }
    for (let p = from; p <= to; p++) {
      if (!seen.has(p - 1)) {
        seen.add(p - 1);
        result.push(p - 1);
      }
    }
  }
  return result.length ? result : null;
}

let uid = 0;
export function nextId() {
  uid += 1;
  return uid;
}

export interface SortableItem { id: number; name: string; detail?: string; thumb?: string }
