import { createOcrWorker } from '../image-to-text/image-to-text.service';

interface PdfTextItem { str: string; transform: number[]; width: number; hasEOL?: boolean }
export interface PdfPage {
  getViewport: (o: { scale: number }) => { width: number; height: number }
  getTextContent: () => Promise<{ items: (PdfTextItem | { type: string })[] }>
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> }
}
export interface PdfDocument {
  numPages: number
  getPage: (n: number) => Promise<PdfPage>
  destroy: () => Promise<void>
}
interface PdfjsModule {
  GlobalWorkerOptions: { workerSrc: string }
  getDocument: (o: Record<string, unknown>) => { promise: Promise<PdfDocument> }
}

interface Block { text: string; size: number; align: 'left' | 'center'; pageStart: boolean }

export function vendorUrl(path: string) {
  return new URL(`${import.meta.env.BASE_URL}vendor/${path}`, window.location.origin).href;
}

// pdf.js (Apache-2.0) and docx (MIT) are self-hosted under public/vendor and only fetched when this tool is used
let pdfjsPromise: Promise<PdfjsModule> | null = null;
function loadPdfjs() {
  pdfjsPromise ??= (import(/* @vite-ignore */ vendorUrl('pdfjs/pdf.min.mjs')) as Promise<PdfjsModule>).then((m) => {
    m.GlobalWorkerOptions.workerSrc = vendorUrl('pdfjs/pdf.worker.min.mjs');
    return m;
  });
  return pdfjsPromise;
}

let docxPromise: Promise<any> | null = null;
function loadDocx() {
  docxPromise ??= new Promise((resolve, reject) => {
    if ((window as any).docx) {
      resolve((window as any).docx);
      return;
    }
    const script = document.createElement('script');
    script.src = vendorUrl('docx.iife.js');
    script.onload = () => resolve((window as any).docx);
    script.onerror = () => {
      docxPromise = null;
      reject(new Error('Failed to load docx'));
    };
    document.head.appendChild(script);
  });
  return docxPromise;
}

export async function openPdf(data: ArrayBuffer): Promise<PdfDocument> {
  const pdfjs = await loadPdfjs();
  return pdfjs.getDocument({
    data: new Uint8Array(data),
    cMapUrl: vendorUrl('pdfjs/cmaps/'),
    cMapPacked: true,
    isEvalSupported: false,
  }).promise;
}

const CJK = /[\u3000-\u9FFF\uAC00-\uD7AF\uFF00-\uFFEF]/;

interface Line { text: string; x: number; xEnd: number; y: number; size: number }

function buildLines(items: PdfTextItem[]): Line[] {
  const sorted = items
    .filter(i => i.str.trim() !== '')
    .map(i => ({ ...i, x: i.transform[4], y: i.transform[5], size: Math.hypot(i.transform[2], i.transform[3]) || 10 }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const groups: (typeof sorted)[] = [];
  for (const item of sorted) {
    const group = groups.find(g => Math.abs(g[0].y - item.y) <= Math.max(g[0].size, item.size) * 0.5);
    if (group) {
      group.push(item);
    }
    else {
      groups.push([item]);
    }
  }

  return groups
    .sort((a, b) => b[0].y - a[0].y)
    .map((group) => {
      group.sort((a, b) => a.x - b.x);
      let text = '';
      let prevEnd = group[0].x;
      for (const item of group) {
        const gap = item.x - prevEnd;
        const needSpace = text && gap > item.size * 0.2 && !/\s$/.test(text) && !/^\s/.test(item.str)
          && !(CJK.test(text.at(-1)!) && CJK.test(item.str[0]));
        text += (needSpace ? ' ' : '') + item.str;
        prevEnd = item.x + item.width;
      }
      const size = Math.max(...group.map(i => i.size));
      return { text: text.trim(), x: group[0].x, xEnd: prevEnd, y: group[0].y, size };
    })
    .filter(l => l.text);
}

// Joins lines into paragraphs: a paragraph breaks on a large vertical gap or when the previous line stops short of the right edge
function buildBlocks(lines: Line[], pageWidth: number): Block[] {
  const blocks: Block[] = [];
  if (!lines.length) {
    return blocks;
  }
  const left = Math.min(...lines.map(l => l.x));
  const right = Math.max(...lines.map(l => l.xEnd));
  const width = Math.max(right - left, 1);

  let prev: Line | null = null;
  let current: Block | null = null;
  for (const line of lines) {
    const centered = Math.abs((line.x + line.xEnd) / 2 - pageWidth / 2) < pageWidth * 0.03 && line.x - left > width * 0.1;
    const sameParagraph = prev && current
      && !centered
      && Math.abs(prev.size - line.size) < 1
      && prev.y - line.y < line.size * 1.8
      && prev.xEnd > left + width * 0.85
      && Math.abs(line.x - prev.x) < line.size * 2.5;
    if (sameParagraph && current) {
      const needSpace = !(CJK.test(current.text.at(-1)!) || CJK.test(line.text[0]));
      current.text += (needSpace ? ' ' : '') + line.text;
    }
    else {
      current = { text: line.text, size: line.size, align: centered ? 'center' : 'left', pageStart: false };
      blocks.push(current);
    }
    prev = line;
  }
  return blocks;
}

export interface ConvertOptions {
  ocrLanguages: string[]
  onProgress: (info: { page: number; total: number; phase: 'text' | 'ocr' | 'engine' | 'build' }) => void
  isCancelled: () => boolean
}

export interface ConvertResult { blob: Blob; ocrPages: number; emptyPages: number }

async function renderPage(page: PdfPage): Promise<Blob> {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, 3000 / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}

function cleanOcr(raw: string) {
  return raw.replace(/([\u3000-\u9FFF\uAC00-\uD7AF\uFF00-\uFFEF]) +(?=[\u3000-\u9FFF\uAC00-\uD7AF\uFF00-\uFFEF])/g, '$1');
}

// Tesseract only separates blocks with blank lines, so a line that stops well short of the longest one also ends a paragraph
function splitOcrParagraphs(text: string) {
  const result: string[] = [];
  for (const chunk of text.split(/\n{2,}/)) {
    const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
    const longest = Math.max(0, ...lines.map(l => l.length));
    let current = '';
    for (const line of lines) {
      const needSpace = current && !(CJK.test(current.at(-1)!) || CJK.test(line[0]));
      current += (needSpace ? ' ' : '') + line;
      if (line.length < longest * 0.7) {
        result.push(current);
        current = '';
      }
    }
    if (current) {
      result.push(current);
    }
  }
  return result;
}

export async function convertPdfToDocx(pdf: PdfDocument, options: ConvertOptions): Promise<ConvertResult> {
  const total = pdf.numPages;
  const pageBlocks: Block[][] = [];
  const scannedPages: number[] = [];
  const sizes: number[] = [];

  for (let n = 1; n <= total; n++) {
    if (options.isCancelled()) {
      throw new Error('cancelled');
    }
    options.onProgress({ page: n, total, phase: 'text' });
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const items = content.items.filter((i): i is PdfTextItem => 'str' in i);
    const blocks = buildBlocks(buildLines(items), page.getViewport({ scale: 1 }).width);
    if (blocks.length === 0) {
      scannedPages.push(n);
    }
    blocks.forEach(b => sizes.push(...Array.from({ length: Math.min(b.text.length, 200) }, () => b.size)));
    pageBlocks[n - 1] = blocks;
  }

  let ocrPages = 0;
  if (scannedPages.length && options.ocrLanguages.length) {
    options.onProgress({ page: 0, total: scannedPages.length, phase: 'engine' });
    const worker = await createOcrWorker(options.ocrLanguages, () => {});
    try {
      for (const [index, n] of scannedPages.entries()) {
        if (options.isCancelled()) {
          throw new Error('cancelled');
        }
        options.onProgress({ page: index + 1, total: scannedPages.length, phase: 'ocr' });
        const page = await pdf.getPage(n);
        const { data } = await worker.recognize(await renderPage(page));
        const paragraphs = splitOcrParagraphs(cleanOcr(data.text));
        pageBlocks[n - 1] = paragraphs.map(text => ({ text, size: 0, align: 'left', pageStart: false }));
        if (paragraphs.length) {
          ocrPages++;
        }
      }
    }
    finally {
      await worker.terminate().catch(() => {});
    }
  }

  options.onProgress({ page: total, total, phase: 'build' });
  const sorted = [...sizes].sort((a, b) => a - b);
  const bodySize = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 12;

  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await loadDocx();
  const children: unknown[] = [];
  pageBlocks.forEach((blocks, pageIndex) => {
    blocks.forEach((block, i) => {
      const isHeading = block.size > 0 && block.size >= bodySize * 1.25 && block.text.length < 120;
      const size = block.size > 0 ? Math.round(Math.min(Math.max(block.size, 8), 40) * 2) : undefined;
      children.push(new Paragraph({
        pageBreakBefore: pageIndex > 0 && i === 0,
        alignment: block.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 120 },
        children: [new TextRun({ text: block.text, bold: isHeading, size })],
      }));
    });
  });
  const emptyPages = pageBlocks.filter(b => b.length === 0).length;
  if (children.length === 0) {
    children.push(new Paragraph({ children: [] }));
  }

  const doc = new Document({ sections: [{ children }] });
  return { blob: await Packer.toBlob(doc), ocrPages, emptyPages };
}
