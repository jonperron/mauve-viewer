import { describe, it, expect } from 'vitest';
import { parseContigsTab } from './tab-parser.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTab({
  preamble = '',
  reversed = '',
  ordered = '',
  conflicted = '',
}: {
  preamble?: string;
  reversed?: string;
  ordered?: string;
  conflicted?: string;
}): string {
  const headerRow = 'type\tlabel\tcontig\tstrand\tleft\tright';
  const parts: string[] = [];

  if (preamble) parts.push(preamble, '');

  if (reversed) {
    parts.push('Contigs to reverse', headerRow, reversed, '');
  }

  if (ordered) {
    parts.push('Ordered Contigs', headerRow, ordered, '');
  }

  if (conflicted) {
    parts.push(
      'Contigs with conflicting ordering information',
      headerRow,
      conflicted,
      '',
    );
  }

  return parts.join('\n');
}

const SAMPLE_ROW_FWD = 'contig\tc1\tchromosome\tforward\t1\t1000';
const SAMPLE_ROW_COMP = 'contig\tc2\tchromosome\tcomplement\t1001\t2000';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseContigsTab — basic parsing', () => {
  it('returns empty sections for empty input', () => {
    const result = parseContigsTab('');
    expect(result.toReverse).toHaveLength(0);
    expect(result.ordered).toHaveLength(0);
    expect(result.conflicted).toHaveLength(0);
  });

  it('parses a forward-strand ordered contig', () => {
    const content = buildTab({ ordered: SAMPLE_ROW_FWD });
    const result = parseContigsTab(content);

    expect(result.ordered).toHaveLength(1);
    expect(result.ordered[0]).toEqual({
      name: 'c1',
      strand: 'forward',
      start: 1,
      end: 1000,
    });
  });

  it('parses a complement-strand reversed contig', () => {
    const content = buildTab({ reversed: SAMPLE_ROW_COMP });
    const result = parseContigsTab(content);

    expect(result.toReverse).toHaveLength(1);
    expect(result.toReverse[0]).toEqual({
      name: 'c2',
      strand: 'complement',
      start: 1001,
      end: 2000,
    });
  });

  it('parses conflicted contigs', () => {
    const content = buildTab({ conflicted: SAMPLE_ROW_FWD });
    const result = parseContigsTab(content);

    expect(result.conflicted).toHaveLength(1);
    expect(result.conflicted[0]?.name).toBe('c1');
  });
});

describe('parseContigsTab — full file with all three sections', () => {
  it('correctly populates all three sections', () => {
    const content = buildTab({
      preamble: 'Contigs in Reversed Category are those reversed from the order immediately preceding.',
      reversed: SAMPLE_ROW_COMP,
      ordered: [SAMPLE_ROW_FWD, SAMPLE_ROW_COMP].join('\n'),
      conflicted: 'contig\tcx\tchromosome\tforward\t2001\t3000',
    });

    const result = parseContigsTab(content);

    expect(result.toReverse).toHaveLength(1);
    expect(result.toReverse[0]?.name).toBe('c2');

    expect(result.ordered).toHaveLength(2);
    expect(result.ordered.map((e) => e.name)).toEqual(['c1', 'c2']);

    expect(result.conflicted).toHaveLength(1);
    expect(result.conflicted[0]?.name).toBe('cx');
  });
});

describe('parseContigsTab — robustness', () => {
  it('ignores preamble lines before first section', () => {
    const content =
      'Contigs in Reversed Category are those reversed...\n' +
      '  The strand is forward...\n' +
      '\n' +
      'Ordered Contigs\n' +
      'type\tlabel\tcontig\tstrand\tleft\tright\n' +
      SAMPLE_ROW_FWD + '\n';

    const result = parseContigsTab(content);
    expect(result.ordered).toHaveLength(1);
    expect(result.toReverse).toHaveLength(0);
  });

  it('skips the column header row', () => {
    const content = buildTab({ ordered: SAMPLE_ROW_FWD });
    const result = parseContigsTab(content);

    // Header row should not appear as an entry
    expect(result.ordered.some((e) => e.name === 'type')).toBe(false);
  });

  it('skips blank lines within sections', () => {
    const content =
      'Ordered Contigs\n' +
      'type\tlabel\tcontig\tstrand\tleft\tright\n' +
      '\n' +
      SAMPLE_ROW_FWD + '\n' +
      '\n' +
      SAMPLE_ROW_COMP + '\n';

    const result = parseContigsTab(content);
    expect(result.ordered).toHaveLength(2);
  });

  it('handles Windows-style line endings (CRLF)', () => {
    const content = 'Ordered Contigs\r\ntype\tlabel\tcontig\tstrand\tleft\tright\r\n' + SAMPLE_ROW_FWD + '\r\n';
    const result = parseContigsTab(content);
    expect(result.ordered).toHaveLength(1);
  });

  it('ignores rows with fewer than 6 columns', () => {
    const content =
      'Ordered Contigs\n' +
      'type\tlabel\tcontig\tstrand\tleft\tright\n' +
      'contig\tc1\tchromosome\tforward\n'; // only 4 columns

    const result = parseContigsTab(content);
    expect(result.ordered).toHaveLength(0);
  });

  it('ignores rows with non-numeric coordinates', () => {
    const content =
      'Ordered Contigs\n' +
      'type\tlabel\tcontig\tstrand\tleft\tright\n' +
      'contig\tc1\tchromosome\tforward\tNaN\t1000\n';

    const result = parseContigsTab(content);
    expect(result.ordered).toHaveLength(0);
  });
});
