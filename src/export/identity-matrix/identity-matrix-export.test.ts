import { describe, expect, it } from 'vitest';
import {
  countPairwiseSubstitutions,
  computeSharedBackboneLength,
  computeIdentityMatrix,
  formatIdentityMatrix,
  exportIdentityMatrix,
} from './identity-matrix-export.ts';
import type { IdentityMatrixResult } from './identity-matrix-export.ts';
import type { XmfaAlignment, AlignmentBlock, Genome } from '../import/xmfa/types.ts';
import type { BackboneSegment } from '../import/backbone/types.ts';

/** Create a minimal alignment with given block sequences and genome count */
function makeAlignment(
  blockSequences: string[][],
  options?: {
    genomeLength?: number;
    starts?: number[][];
  },
): XmfaAlignment {
  const genomeCount = blockSequences[0]!.length;
  const genomeLength = options?.genomeLength ?? 1000;
  const blocks: AlignmentBlock[] = blockSequences.map((seqs, blockIdx) => ({
    segments: seqs.map((seqData, gi) => {
      const nonGapLen = seqData.replace(/-/g, '').length;
      const start = options?.starts?.[blockIdx]?.[gi] ?? blockIdx * 100 + 1;
      return {
        sequenceIndex: gi + 1,
        start,
        end: start + nonGapLen - 1,
        strand: '+' as const,
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

/** Create backbone segments with given interval specs */
function makeBackbone(
  specs: { intervals: [number, number][]; seqIndex?: number }[],
): readonly BackboneSegment[] {
  return specs.map((spec) => ({
    seqIndex: spec.seqIndex ?? 0,
    intervals: spec.intervals.map(([left, right]) => ({
      leftEnd: left,
      rightEnd: right,
    })),
    isBackbone: spec.intervals.every(([left, right]) => left > 0 && right > 0),
  }));
}

describe('countPairwiseSubstitutions', () => {
  it('counts substitutions between two genomes in a single block', () => {
    //         pos: 1234567890
    // genome0:     ACGTACGTAC
    // genome1:     ATGTACGTAC  → differs at col 2 (C→T) = 1 sub
    const alignment = makeAlignment([['ACGTACGTAC', 'ATGTACGTAC']]);
    const subs = countPairwiseSubstitutions(alignment.blocks, 1, 2);
    expect(subs).toBe(1);
  });

  it('returns zero for identical sequences', () => {
    const alignment = makeAlignment([['ACGTACGT', 'ACGTACGT']]);
    const subs = countPairwiseSubstitutions(alignment.blocks, 1, 2);
    expect(subs).toBe(0);
  });

  it('ignores gap positions', () => {
    // g0: AC-TACGT  → non-gap: ACTACGT
    // g1: ACGTACGT
    // At col 3, g0 has '-' → skip (not a substitution)
    const alignment = makeAlignment([['AC-TACGT', 'ACGTACGT']]);
    const subs = countPairwiseSubstitutions(alignment.blocks, 1, 2);
    expect(subs).toBe(0);
  });

  it('ignores ambiguity codes', () => {
    // g0: ACNTACGT  → N at col 3 is ambiguous, skip
    // g1: ACGTACGT
    const alignment = makeAlignment([['ACNTACGT', 'ACGTACGT']]);
    const subs = countPairwiseSubstitutions(alignment.blocks, 1, 2);
    expect(subs).toBe(0);
  });

  it('counts substitutions across multiple blocks', () => {
    // Block 1: 1 sub between g0 and g1
    // Block 2: 1 sub between g0 and g1
    const alignment = makeAlignment([
      ['ACGTACGTAC', 'ATGTACGTAC'],  // 1 sub at col 2
      ['TTTTTTTTTT', 'TTTTTTCTTT'],  // 1 sub at col 7
    ]);
    const subs = countPairwiseSubstitutions(alignment.blocks, 1, 2);
    expect(subs).toBe(2);
  });

  it('counts only substitutions for the requested pair in multi-genome alignment', () => {
    // 3 genomes, count subs between g0 and g2 only
    const alignment = makeAlignment([
      ['ACGTACGTAC', 'ATGTACGTAC', 'ACGAACGTAC'],
    ]);
    // g0 vs g2: col 4 (T→A) = 1 sub
    const subs = countPairwiseSubstitutions(alignment.blocks, 1, 3);
    expect(subs).toBe(1);
  });

  it('returns zero when genomes share no blocks', () => {
    // Block only has genome 0 and 1, genome 2 is absent
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 3, sequenceEntries: [] },
      blocks: [{
        segments: [
          { sequenceIndex: 1, start: 1, end: 10, strand: '+', sourceFile: 'g0.fa', sequenceData: 'ACGTACGTAC' },
          { sequenceIndex: 2, start: 1, end: 10, strand: '+', sourceFile: 'g1.fa', sequenceData: 'ATGTACGTAC' },
        ],
      }],
      lcbs: [],
      genomes: [
        { index: 1, name: 'g0', length: 100, format: 'fasta' },
        { index: 2, name: 'g1', length: 100, format: 'fasta' },
        { index: 3, name: 'g2', length: 100, format: 'fasta' },
      ],
    };
    const subs = countPairwiseSubstitutions(alignment.blocks, 1, 3);
    expect(subs).toBe(0);
  });
});

describe('computeSharedBackboneLength', () => {
  it('sums lengths of backbone segments where both genomes participate', () => {
    const backbone = makeBackbone([
      { intervals: [[1, 10], [1, 10], [1, 10]] },  // all 3 genomes
      { intervals: [[11, 20], [11, 20], [0, 0]] },  // g0 and g1 only
    ]);
    // g0 vs g1: seg1 (10) + seg2 (10) = 20
    expect(computeSharedBackboneLength(backbone, 0, 1)).toBe(20);
  });

  it('excludes segments where a genome does not participate', () => {
    const backbone = makeBackbone([
      { intervals: [[1, 10], [1, 10], [1, 10]] },
      { intervals: [[11, 20], [11, 20], [0, 0]] },
    ]);
    // g0 vs g2: only seg1 (10), seg2 has g2={0,0}
    expect(computeSharedBackboneLength(backbone, 0, 2)).toBe(10);
  });

  it('returns zero when no shared backbone segments exist', () => {
    const backbone = makeBackbone([
      { intervals: [[1, 10], [0, 0], [0, 0]] },  // only g0
    ]);
    expect(computeSharedBackboneLength(backbone, 0, 1)).toBe(0);
  });

  it('handles empty backbone', () => {
    expect(computeSharedBackboneLength([], 0, 1)).toBe(0);
  });
});

describe('computeIdentityMatrix', () => {
  it('computes pairwise divergence for all genome pairs', () => {
    // 3 genomes, 2 blocks
    const alignment = makeAlignment([
      ['ACGTACGTAC', 'ATGTACGTAC', 'ACGAACGTAC'],
      ['TTTTTTTTTT', 'TTTTTTCTTT'],
    ], {
      starts: [[1, 1, 1], [11, 11]],
    });
    // Add genome 2 (index 3) missing from block 2
    // Subs: g0-g1: 1+1=2, g0-g2: 1, g1-g2: 2 (col2 T/C + col4 T/A)
    // Wait: g1 vs g2 in block 1:
    //   g1: ATGTACGTAC
    //   g2: ACGAACGTAC
    //   col 2: T vs C → sub
    //   col 4: T vs A → sub
    //   = 2 subs

    const backbone = makeBackbone([
      { intervals: [[1, 10], [1, 10], [1, 10]] },
      { intervals: [[11, 20], [11, 20], [0, 0]] },
    ]);

    const result = computeIdentityMatrix(alignment, backbone);

    expect(result.size).toBe(3);
    // g0 vs g1: 2 subs / 20 shared = 0.1
    expect(result.values[0]![1]).toBeCloseTo(0.1);
    // g0 vs g2: 1 sub / 10 shared = 0.1
    expect(result.values[0]![2]).toBeCloseTo(0.1);
    // g1 vs g2: 2 subs / 10 shared = 0.2
    expect(result.values[1]![2]).toBeCloseTo(0.2);
  });

  it('produces a symmetric matrix', () => {
    const alignment = makeAlignment([['ACGT', 'ATGT']]);
    const backbone = makeBackbone([
      { intervals: [[1, 4], [1, 4]] },
    ]);

    const result = computeIdentityMatrix(alignment, backbone);
    expect(result.values[0]![1]).toBe(result.values[1]![0]);
  });

  it('returns zero divergence for identical genomes', () => {
    const alignment = makeAlignment([['ACGTACGT', 'ACGTACGT']]);
    const backbone = makeBackbone([
      { intervals: [[1, 8], [1, 8]] },
    ]);

    const result = computeIdentityMatrix(alignment, backbone);
    expect(result.values[0]![1]).toBe(0);
  });

  it('handles zero shared backbone length gracefully', () => {
    const alignment = makeAlignment([['ACGT', 'ATGT']]);
    const backbone = makeBackbone([
      { intervals: [[1, 4], [0, 0]] },  // g1 not in backbone
    ]);

    const result = computeIdentityMatrix(alignment, backbone);
    // No shared backbone → divergence should be 0 (avoid division by zero)
    expect(result.values[0]![1]).toBe(0);
  });

  it('diagonal is always zero', () => {
    const alignment = makeAlignment([['ACGT', 'ATGT', 'AGGT']]);
    const backbone = makeBackbone([
      { intervals: [[1, 4], [1, 4], [1, 4]] },
    ]);

    const result = computeIdentityMatrix(alignment, backbone);
    for (let i = 0; i < result.size; i++) {
      expect(result.values[i]![i]).toBe(0);
    }
  });
});

describe('formatIdentityMatrix', () => {
  it('formats as upper-triangular tab-delimited matrix', () => {
    const result: IdentityMatrixResult = {
      size: 3,
      values: [
        [0, 0.1, 0.3],
        [0.1, 0, 0.2],
        [0.3, 0.2, 0],
      ],
    };

    const output = formatIdentityMatrix(result);
    // Output ends with \n; split produces size+1 elements (last is empty)
    const lines = output.split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[3]).toBe('');

    // Row 0: empty, 0.1, 0.3
    const row0 = lines[0]!.split('\t');
    expect(row0[0]).toBe('');
    expect(Number(row0[1])).toBeCloseTo(0.1);
    expect(Number(row0[2])).toBeCloseTo(0.3);

    // Row 1: empty, empty, 0.2
    const row1 = lines[1]!.split('\t');
    expect(row1[0]).toBe('');
    expect(row1[1]).toBe('');
    expect(Number(row1[2])).toBeCloseTo(0.2);

    // Row 2: all empty
    const row2 = lines[2]!.split('\t');
    expect(row2.every((v) => v === '')).toBe(true);
  });

  it('handles single genome (1x1 matrix)', () => {
    const result: IdentityMatrixResult = {
      size: 1,
      values: [[0]],
    };

    const output = formatIdentityMatrix(result);
    // Single row: empty cell → "\n"
    const lines = output.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('');
    expect(lines[1]).toBe('');
  });

  it('formats 2x2 matrix correctly', () => {
    const result: IdentityMatrixResult = {
      size: 2,
      values: [
        [0, 0.05],
        [0.05, 0],
      ],
    };

    const output = formatIdentityMatrix(result);
    const lines = output.split('\n');
    expect(lines).toHaveLength(3);
    const row0 = lines[0]!.split('\t');
    expect(row0[0]).toBe('');
    expect(Number(row0[1])).toBeCloseTo(0.05);
  });
});

describe('exportIdentityMatrix', () => {
  it('produces complete tab-delimited output from alignment and backbone', () => {
    const alignment = makeAlignment([['ACGTACGT', 'ATGTACGT']]);
    const backbone = makeBackbone([
      { intervals: [[1, 8], [1, 8]] },
    ]);

    const output = exportIdentityMatrix(alignment, backbone);
    expect(output).toContain('\t');
    expect(output.endsWith('\n')).toBe(true);

    // 1 sub (col 2, C→T), shared len = 8, divergence = 1/8 = 0.125
    const lines = output.trimEnd().split('\n');
    const row0 = lines[0]!.split('\t');
    expect(Number(row0[1])).toBeCloseTo(0.125);
  });
});
