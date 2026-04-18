import { describe, expect, it } from 'vitest';
import { extractGaps, formatGapTable, exportGaps } from './gap-export.ts';
import type { GapRecord } from './gap-export.ts';
import type { XmfaAlignment, AlignmentBlock, Genome } from '../../xmfa/types.ts';
import type { ContigMap } from './snp-export.ts';

function makeAlignment(
  sequences: string[][],
  options?: {
    genomeLength?: number;
    starts?: number[][];
    strands?: ('+' | '-')[][];
  },
): XmfaAlignment {
  const genomeCount = sequences[0]!.length;
  const genomeLength = options?.genomeLength ?? 1000;
  const blocks: AlignmentBlock[] = sequences.map((seqs, blockIdx) => ({
    segments: seqs.map((seqData, gi) => {
      const nonGapLen = seqData.replace(/-/g, '').length;
      const start = options?.starts?.[blockIdx]?.[gi] ?? blockIdx * 100 + 1;
      const strand = options?.strands?.[blockIdx]?.[gi] ?? '+';
      return {
        sequenceIndex: gi + 1,
        start,
        end: start + nonGapLen - 1,
        strand,
        sourceFile: `genome${gi}.fasta`,
        sequenceData: seqData,
      };
    }),
  }));

  const genomes: Genome[] = Array.from({ length: genomeCount }, (_, i) => ({
    index: i + 1,
    name: `genome${i}`,
    length: genomeLength,
    format: 'fasta',
  }));

  return {
    header: { formatVersion: '1', sequenceCount: genomeCount, sequenceEntries: [] },
    blocks,
    lcbs: [],
    genomes,
  };
}

describe('extractGaps', () => {
  it('detects a single gap in one genome', () => {
    const alignment = makeAlignment([['AC--GT', 'ACTTGT']]);
    const gaps = extractGaps(alignment);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.genomeIndex).toBe(0);
    expect(gaps[0]!.genomeWidePosition).toBe(2);
    expect(gaps[0]!.length).toBe(2);
  });

  it('returns empty for sequences without gaps', () => {
    const alignment = makeAlignment([['ACGT', 'ACGT']]);
    const gaps = extractGaps(alignment);
    expect(gaps).toHaveLength(0);
  });

  it('detects gaps in multiple genomes', () => {
    const alignment = makeAlignment([['AC--GT', 'ACTT--']]);
    const gaps = extractGaps(alignment);
    expect(gaps).toHaveLength(2);
    const g0 = gaps.find((g) => g.genomeIndex === 0)!;
    const g1 = gaps.find((g) => g.genomeIndex === 1)!;
    expect(g0.length).toBe(2);
    expect(g1.length).toBe(2);
  });

  it('detects multiple gaps in one segment', () => {
    const alignment = makeAlignment([['A-C-G', 'ATCTG']]);
    const gaps = extractGaps(alignment);
    expect(gaps).toHaveLength(2);
    expect(gaps[0]!.genomeWidePosition).toBe(1);
    expect(gaps[0]!.length).toBe(1);
    expect(gaps[1]!.genomeWidePosition).toBe(2);
    expect(gaps[1]!.length).toBe(1);
  });

  it('handles gap at the beginning of a segment', () => {
    const alignment = makeAlignment([['--ACGT', 'TTACGT']]);
    const gaps = extractGaps(alignment);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.genomeIndex).toBe(0);
    expect(gaps[0]!.genomeWidePosition).toBe(1);
    expect(gaps[0]!.length).toBe(2);
  });

  it('handles gap at the end of a segment', () => {
    const alignment = makeAlignment([['ACGT--', 'ACGTTT']]);
    const gaps = extractGaps(alignment);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.genomeWidePosition).toBe(4);
    expect(gaps[0]!.length).toBe(2);
  });

  it('handles reverse strand positions', () => {
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 2, sequenceEntries: [] },
      blocks: [{
        segments: [
          { sequenceIndex: 1, start: 100, end: 105, strand: '+', sourceFile: 'g0.fa', sequenceData: 'ACTTGT' },
          { sequenceIndex: 2, start: 200, end: 203, strand: '-', sourceFile: 'g1.fa', sequenceData: 'AC--GT' },
        ],
      }],
      lcbs: [],
      genomes: [
        { index: 1, name: 'g0', length: 1000, format: 'fasta' },
        { index: 2, name: 'g1', length: 1000, format: 'fasta' },
      ],
    };
    const gaps = extractGaps(alignment);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.genomeIndex).toBe(1);
    // Reverse strand: A→203, C→202, gap, gap, G→201, T→200
    // Position of char after gap in column order (G at col 4) → 201
    expect(gaps[0]!.genomeWidePosition).toBe(201);
    expect(gaps[0]!.length).toBe(2);
  });

  it('handles multiple blocks', () => {
    const alignment = makeAlignment([
      ['A-C', 'ATC'],
      ['G-T', 'GAT'],
    ]);
    const gaps = extractGaps(alignment);
    expect(gaps).toHaveLength(2);
  });

  it('skips genomes absent from a block', () => {
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 2, sequenceEntries: [] },
      blocks: [{
        segments: [
          { sequenceIndex: 1, start: 1, end: 4, strand: '+', sourceFile: 'g0.fa', sequenceData: 'ACGT' },
        ],
      }],
      lcbs: [],
      genomes: [
        { index: 1, name: 'g0', length: 100, format: 'fasta' },
        { index: 2, name: 'g1', length: 100, format: 'fasta' },
      ],
    };
    const gaps = extractGaps(alignment);
    // Only genome 0's segment is present, and "ACGT" has no gaps
    expect(gaps).toHaveLength(0);
  });

  it('uses contig map when provided', () => {
    const alignment = makeAlignment([['AC--GT', 'ACTTGT']], { starts: [[500, 500]] });
    const contigMap: ContigMap = new Map([
      [0, [{ position: 1, name: 'contigA' }, { position: 400, name: 'contigB' }]],
    ]);
    const gaps = extractGaps(alignment, contigMap);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.contigName).toBe('contigB');
    expect(gaps[0]!.positionInContig).toBe(102);
  });

  it('uses genome name when no contigs', () => {
    const alignment = makeAlignment([['AC--GT', 'ACTTGT']]);
    const gaps = extractGaps(alignment);
    expect(gaps[0]!.contigName).toBe('genome0');
  });

  it('handles segment that is all gaps', () => {
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 2, sequenceEntries: [] },
      blocks: [{
        segments: [
          { sequenceIndex: 1, start: 1, end: 0, strand: '+', sourceFile: 'g0.fa', sequenceData: '----' },
          { sequenceIndex: 2, start: 1, end: 4, strand: '+', sourceFile: 'g1.fa', sequenceData: 'ACGT' },
        ],
      }],
      lcbs: [],
      genomes: [
        { index: 1, name: 'g0', length: 100, format: 'fasta' },
        { index: 2, name: 'g1', length: 100, format: 'fasta' },
      ],
    };
    const gaps = extractGaps(alignment);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.genomeIndex).toBe(0);
    expect(gaps[0]!.length).toBe(4);
    expect(gaps[0]!.genomeWidePosition).toBe(1);
  });

  it('sorts gaps by genome index then position', () => {
    const alignment = makeAlignment([['A-CG-T', '-ACGTT']]);
    const gaps = extractGaps(alignment);
    // Genome 0 has gaps at positions 1 and 4, genome 1 has gap at position 1
    expect(gaps.length).toBe(3);
    // Should be sorted: genome 0 first, then genome 1
    expect(gaps[0]!.genomeIndex).toBe(0);
    expect(gaps[1]!.genomeIndex).toBe(0);
    expect(gaps[2]!.genomeIndex).toBe(1);
    // Within genome 0, sorted by position
    expect(gaps[0]!.genomeWidePosition).toBeLessThanOrEqual(gaps[1]!.genomeWidePosition);
  });

  it('handles reverse strand gap at end of segment', () => {
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 2, sequenceEntries: [] },
      blocks: [{
        segments: [
          { sequenceIndex: 1, start: 100, end: 105, strand: '+', sourceFile: 'g0.fa', sequenceData: 'ACGTTT' },
          { sequenceIndex: 2, start: 200, end: 203, strand: '-', sourceFile: 'g1.fa', sequenceData: 'ACGT--' },
        ],
      }],
      lcbs: [],
      genomes: [
        { index: 1, name: 'g0', length: 1000, format: 'fasta' },
        { index: 2, name: 'g1', length: 1000, format: 'fasta' },
      ],
    };
    const gaps = extractGaps(alignment);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.genomeIndex).toBe(1);
    // Reverse strand A→203, C→202, G→201, T→200, gap at end: fallback to segment.end
    expect(gaps[0]!.genomeWidePosition).toBe(203);
    expect(gaps[0]!.length).toBe(2);
  });
});

describe('formatGapTable', () => {
  it('produces correct header', () => {
    const result = formatGapTable([]);
    const header = result.split('\n')[0]!;
    expect(header).toBe('Genome\tContig\tPosition_in_Contig\tGenomeWide_Position\tLength');
  });

  it('formats gap rows correctly', () => {
    const gaps: GapRecord[] = [{
      genomeIndex: 0,
      contigName: 'contig1',
      positionInContig: 50,
      genomeWidePosition: 150,
      length: 10,
    }];
    const result = formatGapTable(gaps);
    const lines = result.split('\n');
    expect(lines[1]).toBe('sequence_1\tcontig1\t50\t150\t10');
  });

  it('ends with newline', () => {
    const result = formatGapTable([]);
    expect(result.endsWith('\n')).toBe(true);
  });
});

describe('exportGaps', () => {
  it('produces a complete tab-delimited file', () => {
    const alignment = makeAlignment([['AC--GT', 'ACTTGT']]);
    const result = exportGaps(alignment);
    const lines = result.split('\n').filter((l) => l.length > 0);
    expect(lines.length).toBe(2); // header + 1 gap
    expect(lines[0]).toContain('Genome');
    expect(lines[1]).toContain('2'); // position
  });

  it('returns only header for no gaps', () => {
    const alignment = makeAlignment([['ACGT', 'ACGT']]);
    const result = exportGaps(alignment);
    const lines = result.split('\n').filter((l) => l.length > 0);
    expect(lines.length).toBe(1); // header only
  });
});
