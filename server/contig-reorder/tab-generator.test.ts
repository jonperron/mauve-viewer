import { describe, it, expect } from 'vitest';
import {
  generateContigsTab,
  assignPseudocoordinates,
  SECTION_REVERSED,
  SECTION_ORDERED,
  SECTION_CONFLICTED,
  PREAMBLE,
} from './tab-generator.js';
import type { TabContigEntry, ContigsTabInput } from './tab-generator.js';

function makeEntry(
  name: string,
  start: number,
  end: number,
  forward = true,
): TabContigEntry {
  return { name, start, end, forward };
}

describe('assignPseudocoordinates', () => {
  it('assigns sequential coordinates starting at 1', () => {
    const lengths = new Map([
      ['c1', 1000],
      ['c2', 500],
    ]);
    const fwdFlags = new Map([
      ['c1', true],
      ['c2', false],
    ]);
    const result = assignPseudocoordinates(['c1', 'c2'], lengths, fwdFlags);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'c1', start: 1, end: 1000, forward: true });
    expect(result[1]).toEqual({ name: 'c2', start: 1001, end: 1500, forward: false });
  });

  it('handles a single contig', () => {
    const lengths = new Map([['only', 300]]);
    const fwdFlags = new Map([['only', true]]);
    const result = assignPseudocoordinates(['only'], lengths, fwdFlags);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: 'only', start: 1, end: 300, forward: true });
  });

  it('handles empty input', () => {
    const result = assignPseudocoordinates([], new Map(), new Map());
    expect(result).toHaveLength(0);
  });

  it('defaults to length 0 for missing length entries', () => {
    const result = assignPseudocoordinates(['x'], new Map(), new Map([['x', true]]));
    expect(result[0]?.start).toBe(1);
    expect(result[0]?.end).toBe(1); // 1 + max(0-1,0) = 1+0 = 1
  });

  it('defaults forward to true for missing flags', () => {
    const result = assignPseudocoordinates(['x'], new Map([['x', 100]]), new Map());
    expect(result[0]?.forward).toBe(true);
  });
});

describe('generateContigsTab', () => {
  it('starts with preamble text', () => {
    const input: ContigsTabInput = {
      toReverse: [],
      ordered: [makeEntry('c1', 1, 1000)],
      conflicted: [],
    };
    const output = generateContigsTab(input);
    expect(output.startsWith(PREAMBLE)).toBe(true);
  });

  it('includes Ordered Contigs section when ordered is non-empty', () => {
    const input: ContigsTabInput = {
      toReverse: [],
      ordered: [makeEntry('c1', 1, 500, true)],
      conflicted: [],
    };
    const output = generateContigsTab(input);
    expect(output).toContain(SECTION_ORDERED);
    expect(output).toContain('c1');
    expect(output).toContain('forward');
    expect(output).toContain('1\t500');
  });

  it('includes Reversed section when toReverse is non-empty', () => {
    const input: ContigsTabInput = {
      toReverse: [makeEntry('c2', 501, 1000, false)],
      ordered: [makeEntry('c1', 1, 500, true), makeEntry('c2', 501, 1000, false)],
      conflicted: [],
    };
    const output = generateContigsTab(input);
    expect(output).toContain(SECTION_REVERSED);
    expect(output).toContain('complement');
  });

  it('includes Conflicted section when conflicted is non-empty', () => {
    const input: ContigsTabInput = {
      toReverse: [],
      ordered: [makeEntry('c1', 1, 500, true)],
      conflicted: [makeEntry('cx', 501, 700, true)],
    };
    const output = generateContigsTab(input);
    expect(output).toContain(SECTION_CONFLICTED);
    expect(output).toContain('cx');
  });

  it('omits empty sections', () => {
    const input: ContigsTabInput = {
      toReverse: [],
      ordered: [makeEntry('c1', 1, 100, true)],
      conflicted: [],
    };
    const output = generateContigsTab(input);
    expect(output).not.toContain(SECTION_REVERSED);
    expect(output).not.toContain(SECTION_CONFLICTED);
  });

  it('includes tab-delimited column headers in each section', () => {
    const input: ContigsTabInput = {
      toReverse: [makeEntry('c2', 1, 200, false)],
      ordered: [makeEntry('c1', 1, 500, true)],
      conflicted: [],
    };
    const output = generateContigsTab(input);
    // Both sections should contain the header row
    const headerLine = 'type\tlabel\tcontig\tstrand\tleft\tright';
    const headerCount = (output.match(new RegExp(headerLine, 'g')) ?? []).length;
    expect(headerCount).toBe(2);
  });

  it('uses "contig" as the type field and "chromosome" as the contig field', () => {
    const input: ContigsTabInput = {
      toReverse: [],
      ordered: [makeEntry('c1', 1, 100, true)],
      conflicted: [],
    };
    const output = generateContigsTab(input);
    expect(output).toContain('contig\tc1\tchromosome');
  });

  it('produces sections in order: reversed, ordered, conflicted', () => {
    const input: ContigsTabInput = {
      toReverse: [makeEntry('c2', 1, 50, false)],
      ordered: [makeEntry('c1', 1, 100, true)],
      conflicted: [makeEntry('cx', 101, 200, true)],
    };
    const output = generateContigsTab(input);
    const revPos = output.indexOf(SECTION_REVERSED);
    const ordPos = output.indexOf(SECTION_ORDERED);
    const conPos = output.indexOf(SECTION_CONFLICTED);

    expect(revPos).toBeLessThan(ordPos);
    expect(ordPos).toBeLessThan(conPos);
  });
});
