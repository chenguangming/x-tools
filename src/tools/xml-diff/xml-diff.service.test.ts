import { describe, expect, it } from 'vitest';
import { diffLines, normalizeXml } from './xml-diff.service';

describe('xml-diff', () => {
  it('detects added and removed lines', () => {
    const d = diffLines('a\nb\nc', 'a\nc\nd');
    expect(d.map(l => l.type)).toEqual(['same', 'del', 'same', 'add']);
  });

  it('ignores formatting differences when prettified', () => {
    const a = normalizeXml('<a><b>1</b></a>', true);
    const b = normalizeXml('<a>\n    <b>1</b>\n</a>', true);
    expect(diffLines(a, b).every(l => l.type === 'same')).toBe(true);
  });
});
