import { describe, it, expect } from 'vitest';
import { computeSequenceMetrics } from './sequence-metrics.ts';
import type { XmfaAlignment, AlignmentBlock, AlignedSegment } from '../import/xmfa/types.ts';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeAlignment(overrides?: Partial<XmfaAlignment>): XmfaAlignment {
  return {
    header: { formatVersion: '1', sequenceCount: 2, sequenceEntries: [] },
    blocks: [],
    lcbs: [],
    genomes: [
      { index: 1, name: 'reference.fasta', length: 1000, format: 'fasta' },
      { index: 2, name: 'assembly.fasta', length: 900, format: 'fasta' },
    ],
    ...overrides,
  };
}

function makeSegment(
  sequenceIndex: number,
  start: number,
  end: number,
  sequenceData: string,
  strand: '+' | '-' = '+',
): AlignedSegment {
  return { sequenceIndex, start, end, strand, sourceFile: 'test', sequenceData };
}

function makeBlock(segments: AlignedSegment[], comment?: string): AlignmentBlock {
  return { segments, comment };
}

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('computeSequenceMetrics — edge cases', () => {
  it('returns zero metrics for a single-genome alignment', () => {
    const alignment = makeAlignment({
      genomes: [{ index: 1, name: 'ref', length: 1000, format: 'fasta' }],
    });
    const m = computeSequenceMetrics(alignment);
    expect(m.missedBases).toBe(0);
    expect(m.extraBases).toBe(0);
    expect(m.snpCount).toBe(0);
    expect(m.refGaps).toHaveLength(0);
    expect(m.assemblyGaps).toHaveLength(0);
  });

  it('returns zero metrics when there are no alignment blocks', () => {
    const m = computeSequenceMetrics(makeAlignment());
    expect(m.missedBases).toBe(0);
    expect(m.extraBases).toBe(0);
    expect(m.snpCount).toBe(0);
  });

  it('returns zero percentages when genome lengths are zero', () => {
    const alignment = makeAlignment({
      genomes: [
        { index: 1, name: 'ref', length: 0, format: 'fasta' },
        { index: 2, name: 'asm', length: 0, format: 'fasta' },
      ],
    });
    const m = computeSequenceMetrics(alignment);
    expect(m.missedBasesPercent).toBe(0);
    expect(m.extraBasesPercent).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Missed bases (assembly has '-')
// ---------------------------------------------------------------------------

describe('computeSequenceMetrics — missed bases', () => {
  it('counts columns where assembly has a gap but reference has a base', () => {
    // ref:  ACGT
    // asm:  A--T
    const block = makeBlock([
      makeSegment(1, 1, 4, 'ACGT'),
      makeSegment(2, 1, 2, 'A--T'),
    ]);
    const alignment = makeAlignment({ blocks: [block] });
    const m = computeSequenceMetrics(alignment);
    expect(m.missedBases).toBe(2);
  });

  it('computes missedBasesPercent relative to reference genome length', () => {
    // ref:  ACGT  (ref genome length 1000)
    // asm:  A--T  => 2 missed out of 1000
    const block = makeBlock([
      makeSegment(1, 1, 4, 'ACGT'),
      makeSegment(2, 1, 2, 'A--T'),
    ]);
    const alignment = makeAlignment({ blocks: [block] });
    const m = computeSequenceMetrics(alignment);
    expect(m.missedBasesPercent).toBeCloseTo(2 / 1000);
  });

  it('counts all reference bases as missed in reference-only block', () => {
    // A block with only the reference segment: assembly never aligned here
    const block = makeBlock([makeSegment(1, 1, 5, 'ACGTA')]);
    const alignment = makeAlignment({ blocks: [block] });
    const m = computeSequenceMetrics(alignment);
    expect(m.missedBases).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Extra bases (reference has '-')
// ---------------------------------------------------------------------------

describe('computeSequenceMetrics — extra bases', () => {
  it('counts columns where reference has a gap but assembly has a base', () => {
    // ref:  A--T
    // asm:  ACGT
    const block = makeBlock([
      makeSegment(1, 1, 2, 'A--T'),
      makeSegment(2, 1, 4, 'ACGT'),
    ]);
    const alignment = makeAlignment({ blocks: [block] });
    const m = computeSequenceMetrics(alignment);
    expect(m.extraBases).toBe(2);
  });

  it('computes extraBasesPercent relative to assembly genome length', () => {
    // asm genome length 900; 2 extra bases => 2/900
    const block = makeBlock([
      makeSegment(1, 1, 2, 'A--T'),
      makeSegment(2, 1, 4, 'ACGT'),
    ]);
    const alignment = makeAlignment({ blocks: [block] });
    const m = computeSequenceMetrics(alignment);
    expect(m.extraBasesPercent).toBeCloseTo(2 / 900);
  });

  it('counts all assembly bases as extra in assembly-only block', () => {
    // Block with no reference segment
    const block = makeBlock([makeSegment(2, 1, 4, 'ACGT')]);
    const alignment = makeAlignment({ blocks: [block] });
    const m = computeSequenceMetrics(alignment);
    expect(m.extraBases).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// SNPs and substitution matrix
// ---------------------------------------------------------------------------

describe('computeSequenceMetrics — SNPs', () => {
  it('counts columns where both sequences have different non-gap bases', () => {
    // ref:  ACGT
    // asm:  ATGT  => col 1: C→T, SNP
    const block = makeBlock([
      makeSegment(1, 1, 4, 'ACGT'),
      makeSegment(2, 1, 4, 'ATGT'),
    ]);
    const alignment = makeAlignment({ blocks: [block] });
    const m = computeSequenceMetrics(alignment);
    expect(m.snpCount).toBe(1);
  });

  it('does not count identical columns as SNPs', () => {
    const block = makeBlock([
      makeSegment(1, 1, 4, 'ACGT'),
      makeSegment(2, 1, 4, 'ACGT'),
    ]);
    const alignment = makeAlignment({ blocks: [block] });
    const m = computeSequenceMetrics(alignment);
    expect(m.snpCount).toBe(0);
  });

  it('does not count gap columns as SNPs', () => {
    // ref:  A-GT
    // asm:  AC-T
    const block = makeBlock([
      makeSegment(1, 1, 3, 'A-GT'),
      makeSegment(2, 1, 3, 'AC-T'),
    ]);
    const alignment = makeAlignment({ blocks: [block] });
    const m = computeSequenceMetrics(alignment);
    expect(m.snpCount).toBe(0);
  });

  it('ignores ambiguity codes (non-ACGT characters) in the substitution matrix', () => {
    // 'N' is not in BASE_INDEX, so N→A should not be counted
    const block = makeBlock([
      makeSegment(1, 1, 2, 'NA'),
      makeSegment(2, 1, 2, 'AA'),
    ]);
    const alignment = makeAlignment({ blocks: [block] });
    const m = computeSequenceMetrics(alignment);
    expect(m.snpCount).toBe(0);
    expect(m.substitutionMatrix.counts[0]![0]).toBe(0); // no A→A
  });

  it('populates the substitution matrix correctly', () => {
    // ref:  ACGA
    // asm:  ATGC  => A→A (match), C→T (sub), G→G (match), A→C (sub)
    const block = makeBlock([
      makeSegment(1, 1, 4, 'ACGA'),
      makeSegment(2, 1, 4, 'ATGC'),
    ]);
    const alignment = makeAlignment({ blocks: [block] });
    const m = computeSequenceMetrics(alignment);
    // A=0, C=1, T=2, G=3
    expect(m.snpCount).toBe(2);
    expect(m.substitutionMatrix.counts[1]![2]).toBe(1); // C→T
    expect(m.substitutionMatrix.counts[0]![1]).toBe(1); // A→C
  });

  it('accumulates SNPs across multiple blocks', () => {
    const block1 = makeBlock([
      makeSegment(1, 1, 2, 'AC'),
      makeSegment(2, 1, 2, 'AT'),
    ]);
    const block2 = makeBlock([
      makeSegment(1, 10, 11, 'GG'),
      makeSegment(2, 10, 11, 'GA'),
    ]);
    const alignment = makeAlignment({ blocks: [block1, block2] });
    const m = computeSequenceMetrics(alignment);
    expect(m.snpCount).toBe(2);
  });

  it('is case-insensitive for base comparison', () => {
    // lowercase vs uppercase
    const block = makeBlock([
      makeSegment(1, 1, 2, 'ac'),
      makeSegment(2, 1, 2, 'AT'),
    ]);
    const alignment = makeAlignment({ blocks: [block] });
    const m = computeSequenceMetrics(alignment);
    expect(m.snpCount).toBe(1); // a=A, c→T is a SNP
  });
});

// ---------------------------------------------------------------------------
// Gap locations
// ---------------------------------------------------------------------------

describe('computeSequenceMetrics — gap locations', () => {
  it('records assembly gap runs with reference genomic position', () => {
    // ref:  ACGT  positions 1,2,3,4
    // asm:  A--T  gap in asm at columns 1,2 (0-indexed) → ref position 2 (start of gap)
    const block = makeBlock([
      makeSegment(1, 1, 4, 'ACGT'),
      makeSegment(2, 1, 2, 'A--T'),
    ]);
    const alignment = makeAlignment({ blocks: [block] });
    const m = computeSequenceMetrics(alignment);
    expect(m.assemblyGaps).toHaveLength(1);
    expect(m.assemblyGaps[0]!.length).toBe(2);
    // ref positions: col 0→1, col 1→2, col 2→3, col 3→4
    // gap starts at col 1 → refPositions[1] = 2
    expect(m.assemblyGaps[0]!.genomeWidePosition).toBe(2);
  });

  it('records reference gap runs with assembly genomic position', () => {
    // ref:  A--T  positions 1 and 2 (non-gap at col 0 and col 3)
    // asm:  ACGT  positions 1,2,3,4
    const block = makeBlock([
      makeSegment(1, 1, 2, 'A--T'),
      makeSegment(2, 1, 4, 'ACGT'),
    ]);
    const alignment = makeAlignment({ blocks: [block] });
    const m = computeSequenceMetrics(alignment);
    expect(m.refGaps).toHaveLength(1);
    expect(m.refGaps[0]!.length).toBe(2);
    // asm positions: col 0→1, col 1→2, col 2→3, col 3→4
    // gap starts at col 1 → asmPositions[1] = 2
    expect(m.refGaps[0]!.genomeWidePosition).toBe(2);
  });

  it('records multiple separate gap runs in the same block', () => {
    // ref:  ACGTA CGTAC
    // asm:  A--TA --TAC  => asm gaps at cols 1-2 and cols 5-6
    const block = makeBlock([
      makeSegment(1, 1, 10, 'ACGTACGTAC'),
      makeSegment(2, 1, 6, 'A--TA--TAC'),
    ]);
    const alignment = makeAlignment({ blocks: [block] });
    const m = computeSequenceMetrics(alignment);
    expect(m.assemblyGaps).toHaveLength(2);
    expect(m.assemblyGaps[0]!.length).toBe(2);
    expect(m.assemblyGaps[1]!.length).toBe(2);
  });

  it('accumulates gaps across multiple blocks', () => {
    const block1 = makeBlock([
      makeSegment(1, 1, 4, 'ACGT'),
      makeSegment(2, 1, 2, 'A--T'),
    ]);
    const block2 = makeBlock([
      makeSegment(1, 10, 13, 'GCTA'),
      makeSegment(2, 10, 11, 'G--A'),
    ]);
    const alignment = makeAlignment({ blocks: [block1, block2] });
    const m = computeSequenceMetrics(alignment);
    expect(m.assemblyGaps).toHaveLength(2);
    expect(m.missedBases).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Multi-contig assembly
// ---------------------------------------------------------------------------

describe('computeSequenceMetrics — multi-contig assembly', () => {
  it('accumulates missed bases across multiple assembly contigs', () => {
    const alignment = makeAlignment({
      genomes: [
        { index: 1, name: 'ref', length: 1000, format: 'fasta' },
        { index: 2, name: 'contig1', length: 500, format: 'fasta' },
        { index: 3, name: 'contig2', length: 400, format: 'fasta' },
      ],
      blocks: [
        makeBlock([makeSegment(1, 1, 4, 'ACGT'), makeSegment(2, 1, 2, 'A--T')]),
        makeBlock([makeSegment(1, 10, 13, 'ACGT'), makeSegment(3, 10, 11, 'A--T')]),
      ],
    });
    const m = computeSequenceMetrics(alignment);
    expect(m.missedBases).toBe(4);
    expect(m.missedBasesPercent).toBeCloseTo(4 / 1000);
  });

  it('sums assembly bases from all non-reference genomes for extraBasesPercent', () => {
    // contig1 length 500, contig2 length 400 => assemblyBases = 900
    // 2 extra bases => 2/900
    const alignment = makeAlignment({
      genomes: [
        { index: 1, name: 'ref', length: 1000, format: 'fasta' },
        { index: 2, name: 'contig1', length: 500, format: 'fasta' },
        { index: 3, name: 'contig2', length: 400, format: 'fasta' },
      ],
      blocks: [
        makeBlock([makeSegment(1, 1, 2, 'A--T'), makeSegment(2, 1, 4, 'ACGT')]),
      ],
    });
    const m = computeSequenceMetrics(alignment);
    expect(m.extraBases).toBe(2);
    expect(m.extraBasesPercent).toBeCloseTo(2 / 900);
  });

  it('respects a non-zero refGenomeIdx', () => {
    // Genome at index 1 is the assembly; genome at index 0 is reference but
    // we specify refGenomeIdx = 1 to flip the roles
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 2, sequenceEntries: [] },
      blocks: [
        makeBlock([
          makeSegment(1, 1, 4, 'ACGT'), // genome array index 0
          makeSegment(2, 1, 2, 'A--T'), // genome array index 1 → now treated as reference
        ]),
      ],
      lcbs: [],
      genomes: [
        { index: 1, name: 'asm.fasta', length: 1000, format: 'fasta' },
        { index: 2, name: 'ref.fasta', length: 900, format: 'fasta' },
      ],
    };
    // With refGenomeIdx = 1, genome array index 1 is reference (seq index 2 → 'A--T')
    // Reference has '-' at cols 1,2 → extra bases in asm (genome idx 0)
    const m = computeSequenceMetrics(alignment, 1);
    expect(m.extraBases).toBe(2);
    expect(m.missedBases).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Mixed scenarios
// ---------------------------------------------------------------------------

describe('computeSequenceMetrics — combined metrics', () => {
  it('computes missed, extra, and SNPs from a single block', () => {
    // ref:  ACG-T
    // asm:  A-GCT
    // col 0: A=A (match)
    // col 1: C vs - (missed)
    // col 2: G=G (match)
    // col 3: - vs C (extra)
    // col 4: T=T (match)
    const block = makeBlock([
      makeSegment(1, 1, 4, 'ACG-T'),
      makeSegment(2, 1, 4, 'A-GCT'),
    ]);
    const alignment = makeAlignment({ blocks: [block] });
    const m = computeSequenceMetrics(alignment);
    expect(m.missedBases).toBe(1);
    expect(m.extraBases).toBe(1);
    expect(m.snpCount).toBe(0);
    expect(m.assemblyGaps).toHaveLength(1);
    expect(m.refGaps).toHaveLength(1);
  });

  it('computes SNPs alongside gaps without contamination', () => {
    // ref:  ACGTA
    // asm:  ATGCA  => col 1: C→T (SNP), col 3: T→C (SNP)
    // plus a second block with a missed base
    const block1 = makeBlock([
      makeSegment(1, 1, 5, 'ACGTA'),
      makeSegment(2, 1, 5, 'ATGCA'),
    ]);
    const block2 = makeBlock([
      makeSegment(1, 10, 13, 'CCCC'),
      makeSegment(2, 10, 11, 'C--C'),
    ]);
    const alignment = makeAlignment({ blocks: [block1, block2] });
    const m = computeSequenceMetrics(alignment);
    expect(m.snpCount).toBe(2);
    expect(m.missedBases).toBe(2);
    expect(m.substitutionMatrix.counts[1]![2]).toBe(1); // C→T
    expect(m.substitutionMatrix.counts[2]![1]).toBe(1); // T→C
  });
});
