import { formatXml, isValidXML } from '../xml-formatter/xml-formatter.service';

export { diffLines, normalizeXml, isValidXML };
export type { DiffLine };

interface DiffLine { type: 'same' | 'add' | 'del'; text: string; oldNo?: number; newNo?: number }

function normalizeXml(xml: string, prettify: boolean): string {
  const trimmed = xml.trim();
  if (!prettify || trimmed === '' || !isValidXML(trimmed)) {
    return trimmed;
  }
  return formatXml(trimmed, { indentation: '  ', collapseContent: true, lineSeparator: '\n' });
}

function diffLines(a: string, b: string): DiffLine[] {
  const x = a === '' ? [] : a.split(/\r?\n/);
  const y = b === '' ? [] : b.split(/\r?\n/);
  const n = x.length;
  const m = y.length;
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = x[i] === y[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) {
      result.push({ type: 'same', text: x[i], oldNo: i + 1, newNo: j + 1 });
      i++;
      j++;
    }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      result.push({ type: 'del', text: x[i], oldNo: i + 1 });
      i++;
    }
    else {
      result.push({ type: 'add', text: y[j], newNo: j + 1 });
      j++;
    }
  }
  for (; i < n; i++) {
    result.push({ type: 'del', text: x[i], oldNo: i + 1 });
  }
  for (; j < m; j++) {
    result.push({ type: 'add', text: y[j], newNo: j + 1 });
  }
  return result;
}
