import { describe, expect, it } from 'vitest';
import { computeSimilarityProfile, computeMultiLevelProfile, selectProfileForZoom } from './compute.ts';
import type { XmfaAlignment, AlignmentBlock, Genome } from '../../import/xmfa/types.ts';

function makeAlignment(
  sequences: string[][],
  genomeLength: number,
): XmfaAlignment {
  const genomeCount = sequences[0]!.length;
  const blocks: AlignmentBlock[] = sequences.map((seqs, blockIdx) => ({
    segments: seqs.map((seqData, gi) => ({
      sequenceIndex: gi,
      start: blockIdx * 100 + 1,
      end: blockIdx * 100 + seqData.replace(/-/g, '').length,
      strand: '+' as const,
      sourceFile: `genome${gi}.fasta`,
      sequenceData: seqData,
    })),
  }));

  const genomes: Genome[] = Array.from({ length: genomeCount }, (_, i) => ({
    index: i,
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

describe('computeSimilarityProfile', () => {
  it('computes high similarity for identical sequences', () => {
    const alignment = makeAlignment([['ACGT', 'ACGT']], 4);
    const profile = computeSimilarityProfile(alignment, 0);

    expect(profile.genomeIndex).toBe(0);
    expect(profile.resolution).toBe(1);
    // Identical sequences should have zero entropy → similarity = 1
    for (const v of profile.values.slice(0, 4)) {
      expect(v).toBeCloseTo(1.0, 1);
    }
  });

  it('computes lower similarity for different sequences', () => {
    const alignment = makeAlignment([['AAAA', 'CCCC']], 4);
    const profile = computeSimilarityProfile(alignment, 0);

    // Completely different → entropy = 1 (for 2 equally frequent chars) → similarity = 0
    for (const v of profile.values.slice(0, 4)) {
      expect(v).toBeLessThan(0.5);
    }
  });

  it('handles gaps in sequences', () => {
    const alignment = makeAlignment([['A-GT', 'ACGT']], 3);
    const profile = computeSimilarityProfile(alignment, 0);

    // Should compute some values (at least for non-gap positions)
    expect(profile.values.length).toBeGreaterThan(0);
  });

  it('accounts for gaps in non-target sequences', () => {
    // Target genome (0) has no gaps, but genome 1 has a gap at column 1
    const alignment = makeAlignment([['ACGT', 'A-GT']], 4);
    const profile = computeSimilarityProfile(alignment, 0);

    // Column 1: target='C', other='-' → gap counts as unique char → entropy > 0
    expect(profile.values[1]).toBeLessThan(1.0);
  });

  it('returns zeros for uncovered positions', () => {
    const alignment = makeAlignment([['AC', 'AC']], 100);
    const profile = computeSimilarityProfile(alignment, 0);

    // Positions beyond the alignment block should be 0
    expect(profile.values[50]).toBe(0);
  });

  it('supports custom resolution', () => {
    const alignment = makeAlignment([['ACGTACGT', 'ACGTACGT']], 8);
    const profile = computeSimilarityProfile(alignment, 0, { resolution: 4 });

    expect(profile.resolution).toBe(4);
    expect(profile.values.length).toBe(2); // 8 / 4 = 2
  });

  it('handles reverse strand segments', () => {
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 2, sequenceEntries: [] },
      blocks: [{
        segments: [
          { sequenceIndex: 0, start: 1, end: 4, strand: '-', sourceFile: 'g0.fasta', sequenceData: 'ACGT' },
          { sequenceIndex: 1, start: 1, end: 4, strand: '+', sourceFile: 'g1.fasta', sequenceData: 'ACGT' },
        ],
      }],
      lcbs: [],
      genomes: [{ index: 0, name: 'g0', length: 4, format: 'fasta' }, { index: 1, name: 'g1', length: 4, format: 'fasta' }],
    };
    const profile = computeSimilarityProfile(alignment, 0);
    // Reverse strand should still compute valid similarity values
    expect(profile.values.length).toBe(4);
    for (const v of profile.values) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('throws for invalid genome index', () => {
    const alignment = makeAlignment([['ACGT', 'ACGT']], 4);
    expect(() => computeSimilarityProfile(alignment, 5)).toThrow('Invalid genome index');
  });
});

describe('computeMultiLevelProfile', () => {
  it('produces multiple resolution levels', () => {
    const alignment = makeAlignment([['ACGTACGTACGT', 'ACGTACGTACGT']], 12);
    const multiLevel = computeMultiLevelProfile(alignment, 0, [1, 4]);

    expect(multiLevel.genomeIndex).toBe(0);
    expect(multiLevel.levels).toHaveLength(2);
    expect(multiLevel.levels[0]!.resolution).toBe(1);
    expect(multiLevel.levels[1]!.resolution).toBe(4);
  });

  it('higher resolution levels aggregate lower levels', () => {
    const alignment = makeAlignment([['ACGTACGT', 'ACGTACGT']], 8);
    const multiLevel = computeMultiLevelProfile(alignment, 0, [1, 4]);

    expect(multiLevel.levels[1]!.values.length).toBe(2); // 8 / 4
  });

  it('aggregates sparse base profiles correctly', () => {
    // Short alignment with many uncovered positions at resolution 1
    const alignment = makeAlignment([['AC', 'AC']], 20);
    const multiLevel = computeMultiLevelProfile(alignment, 0, [1, 10]);

    // Coarser level should aggregate - uncovered positions (value=0) should not contribute
    const coarse = multiLevel.levels[1]!;
    expect(coarse.resolution).toBe(10);
    expect(coarse.values.length).toBe(2); // 20 / 10
    // First bin has some coverage, second has none
    expect(coarse.values[1]).toBe(0);
  });
});

describe('selectProfileForZoom', () => {
  it('selects the best resolution for the current zoom level', () => {
    const alignment = makeAlignment([['ACGTACGT', 'ACGTACGT']], 8);
    const multiLevel = computeMultiLevelProfile(alignment, 0, [1, 10, 100]);

    const profile = selectProfileForZoom(multiLevel, 5);
    expect(profile.resolution).toBe(10); // smallest resolution >= 5
  });

  it('returns finest level for very small bp/pixel', () => {
    const alignment = makeAlignment([['ACGTACGT', 'ACGTACGT']], 8);
    const multiLevel = computeMultiLevelProfile(alignment, 0, [1, 10, 100]);

    const profile = selectProfileForZoom(multiLevel, 0.5);
    expect(profile.resolution).toBe(1);
  });

  it('returns coarsest level when all are too fine', () => {
    const alignment = makeAlignment([['ACGT', 'ACGT']], 4);
    const multiLevel = computeMultiLevelProfile(alignment, 0, [1, 10]);

    const profile = selectProfileForZoom(multiLevel, 1000);
    expect(profile.resolution).toBe(10);
  });
});
