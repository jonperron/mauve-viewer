import { describe, it, expect } from 'vitest';
import { computeStructuralMetrics } from './structural-metrics.ts';
import type { XmfaAlignment, Lcb } from '../import/xmfa/types.ts';

function makeLcb(
  id: number,
  left: readonly number[],
  right: readonly number[],
  reverse: readonly boolean[],
  weight = 100,
): Lcb {
  return { id, left, right, reverse, weight };
}

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

describe('computeStructuralMetrics', () => {
  describe('genome counts and base totals', () => {
    it('returns empty metrics for a single-genome alignment', () => {
      const alignment = makeAlignment({
        genomes: [{ index: 1, name: 'ref', length: 1000, format: 'fasta' }],
      });
      const metrics = computeStructuralMetrics(alignment);
      expect(metrics.contigCount).toBe(0);
      expect(metrics.repliconCount).toBe(0);
      expect(metrics.referenceBases).toBe(0);
      expect(metrics.assemblyBases).toBe(0);
      expect(metrics.typeIErrors).toBe(0);
      expect(metrics.typeIIErrors).toBe(0);
    });

    it('reports reference and assembly base counts from genome lengths', () => {
      const metrics = computeStructuralMetrics(makeAlignment());
      expect(metrics.referenceBases).toBe(1000);
      expect(metrics.assemblyBases).toBe(900);
    });

    it('reports one contig and one replicon for a 2-genome alignment', () => {
      const metrics = computeStructuralMetrics(makeAlignment());
      expect(metrics.contigCount).toBe(1);
      expect(metrics.repliconCount).toBe(1);
    });

    it('counts assembly contigs from additional genomes in multi-contig alignment', () => {
      const alignment = makeAlignment({
        genomes: [
          { index: 1, name: 'ref', length: 1000, format: 'fasta' },
          { index: 2, name: 'contig1', length: 500, format: 'fasta' },
          { index: 3, name: 'contig2', length: 400, format: 'fasta' },
        ],
      });
      const metrics = computeStructuralMetrics(alignment);
      expect(metrics.contigCount).toBe(2);
      expect(metrics.assemblyBases).toBe(900);
      expect(metrics.repliconCount).toBe(1);
    });
  });

  describe('rearrangement distances', () => {
    it('returns zero distances when there are no LCBs', () => {
      const metrics = computeStructuralMetrics(makeAlignment());
      expect(metrics.distances.dcj).toBe(0);
      expect(metrics.distances.breakpoint).toBe(0);
      expect(metrics.distances.scj).toBe(0);
      expect(metrics.distances.blocks).toBe(0);
    });

    it('reports block count equal to number of shared LCBs', () => {
      const alignment = makeAlignment({
        lcbs: [
          makeLcb(0, [100, 100], [200, 200], [false, false]),
          makeLcb(1, [300, 300], [400, 400], [false, false]),
        ],
      });
      const metrics = computeStructuralMetrics(alignment);
      expect(metrics.distances.blocks).toBe(2);
    });

    it('returns non-zero DCJ distance for inverted LCB order in assembly', () => {
      const alignment = makeAlignment({
        lcbs: [
          makeLcb(0, [100, 300], [200, 400], [false, false]),
          makeLcb(1, [300, 100], [400, 200], [false, false]),
        ],
      });
      const metrics = computeStructuralMetrics(alignment);
      expect(metrics.distances.blocks).toBe(2);
      expect(metrics.distances.dcj).toBeGreaterThan(0);
    });

    it('returns zero distances when LCBs are in the same order in both genomes', () => {
      const alignment = makeAlignment({
        lcbs: [
          makeLcb(0, [100, 100], [200, 200], [false, false]),
          makeLcb(1, [300, 300], [400, 400], [false, false]),
        ],
      });
      const metrics = computeStructuralMetrics(alignment);
      expect(metrics.distances.dcj).toBe(0);
      expect(metrics.distances.breakpoint).toBe(0);
      expect(metrics.distances.scj).toBe(0);
    });
  });

  describe('Type I adjacency errors (wrong neighbor)', () => {
    it('returns zero errors when LCBs are in the same reference order', () => {
      const alignment = makeAlignment({
        lcbs: [
          makeLcb(0, [100, 100], [200, 200], [false, false]),
          makeLcb(1, [300, 300], [400, 400], [false, false]),
        ],
      });
      expect(computeStructuralMetrics(alignment).typeIErrors).toBe(0);
    });

    it('counts one Type I error when assembly places non-neighbors together', () => {
      // Reference order: LCB0 (rank 0), LCB1 (rank 1), LCB2 (rank 2)
      // Assembly order: LCB2, LCB0, LCB1
      // Pair (LCB2, LCB0): refDiff = 0 - 2 = -2 → |diff| ≠ 1 → Type I
      // Pair (LCB0, LCB1): refDiff = 1 - 0 = 1  → ok
      const alignment = makeAlignment({
        lcbs: [
          makeLcb(0, [100, 300], [200, 400], [false, false]),
          makeLcb(1, [300, 500], [400, 600], [false, false]),
          makeLcb(2, [500, 100], [600, 200], [false, false]),
        ],
      });
      const metrics = computeStructuralMetrics(alignment);
      expect(metrics.typeIErrors).toBe(1);
      expect(metrics.typeIIErrors).toBe(0);
    });

    it('counts multiple Type I errors for a fully shuffled assembly', () => {
      // Reference order: LCB0 (rank 0), LCB1 (rank 1), LCB2 (rank 2), LCB3 (rank 3)
      // Assembly order (by left[1]): LCB1 (100), LCB3 (200), LCB0 (300), LCB2 (400)
      // Pairs in assembly:
      //   (LCB1, LCB3): refDiff = 3 - 1 = 2  → Type I
      //   (LCB3, LCB0): refDiff = 0 - 3 = -3 → Type I
      //   (LCB0, LCB2): refDiff = 2 - 0 = 2  → Type I
      const alignment = makeAlignment({
        lcbs: [
          makeLcb(0, [100, 300], [200, 400], [false, false]),
          makeLcb(1, [200, 100], [300, 200], [false, false]),
          makeLcb(2, [300, 400], [400, 500], [false, false]),
          makeLcb(3, [400, 200], [500, 300], [false, false]),
        ],
      });
      const metrics = computeStructuralMetrics(alignment);
      expect(metrics.typeIErrors).toBe(3);
    });

    it('returns zero errors for fewer than 2 shared LCBs', () => {
      const alignment = makeAlignment({
        lcbs: [makeLcb(0, [100, 100], [200, 200], [false, false])],
      });
      expect(computeStructuralMetrics(alignment).typeIErrors).toBe(0);
    });

    it('ignores LCBs absent from the assembly genome', () => {
      // LCB1 has left[1]=0 → absent from assembly
      // Shared: LCB0 (refRank 0) and LCB2 (refRank 1) → adjacent in ref
      const alignment = makeAlignment({
        lcbs: [
          makeLcb(0, [100, 100], [200, 200], [false, false]),
          makeLcb(1, [300, 0], [400, 0], [false, false]),
          makeLcb(2, [500, 300], [600, 400], [false, false]),
        ],
      });
      expect(computeStructuralMetrics(alignment).typeIErrors).toBe(0);
    });
  });

  describe('Type II adjacency errors (wrong orientation)', () => {
    it('returns zero errors when LCBs are in the same orientation', () => {
      const alignment = makeAlignment({
        lcbs: [
          makeLcb(0, [100, 100], [200, 200], [false, false]),
          makeLcb(1, [300, 300], [400, 400], [false, false]),
        ],
      });
      expect(computeStructuralMetrics(alignment).typeIIErrors).toBe(0);
    });

    it('counts one Type II error when one adjacent block is inverted and the other is not', () => {
      // LCB0 inverted in assembly (false→true), LCB1 not inverted → inconsistent
      const alignment = makeAlignment({
        lcbs: [
          makeLcb(0, [100, 100], [200, 200], [false, true]),
          makeLcb(1, [300, 300], [400, 400], [false, false]),
        ],
      });
      const metrics = computeStructuralMetrics(alignment);
      expect(metrics.typeIErrors).toBe(0);
      expect(metrics.typeIIErrors).toBe(1);
    });

    it('does not count Type II when both adjacent blocks are inverted (consistent reversal)', () => {
      // Both inverted → net inversions are both true → consistent
      const alignment = makeAlignment({
        lcbs: [
          makeLcb(0, [100, 100], [200, 200], [false, true]),
          makeLcb(1, [300, 300], [400, 400], [false, true]),
        ],
      });
      const metrics = computeStructuralMetrics(alignment);
      expect(metrics.typeIErrors).toBe(0);
      expect(metrics.typeIIErrors).toBe(0);
    });

    it('does not count Type II when neither block is inverted', () => {
      const alignment = makeAlignment({
        lcbs: [
          makeLcb(0, [100, 100], [200, 200], [false, false]),
          makeLcb(1, [300, 300], [400, 400], [false, false]),
        ],
      });
      expect(computeStructuralMetrics(alignment).typeIIErrors).toBe(0);
    });

    it('does not count Type II for ref-neighbor pairs in reversed assembly order with consistent inversion', () => {
      // Assembly order is reverse of reference (LCB1 before LCB0).
      // Both are inverted in assembly → consistent (whole segment reversed).
      // refDiff for (LCB1 in ref rank 1, LCB0 in ref rank 0): rank[LCB0]-rank[LCB1] = -1 → adjacent
      const alignment = makeAlignment({
        lcbs: [
          makeLcb(0, [100, 300], [200, 400], [false, true]),
          makeLcb(1, [300, 100], [400, 200], [false, true]),
        ],
      });
      const metrics = computeStructuralMetrics(alignment);
      expect(metrics.typeIIErrors).toBe(0);
    });
  });

  describe('combined adjacency error scenarios', () => {
    it('correctly separates Type I and Type II errors in a mixed assembly', () => {
      // Reference order: LCB0, LCB1, LCB2
      // Assembly order: LCB0, LCB2 (wrong neighbor, Type I), then LCB1
      //   Pair (LCB0, LCB2): refDiff = 2 → Type I
      //   Pair (LCB2, LCB1): refDiff = -1 → adjacent in ref; LCB2 inverted, LCB1 not → Type II
      const alignment = makeAlignment({
        lcbs: [
          makeLcb(0, [100, 100], [200, 200], [false, false]),
          makeLcb(1, [300, 500], [400, 600], [false, false]),
          makeLcb(2, [500, 300], [600, 400], [false, true]),
        ],
      });
      const metrics = computeStructuralMetrics(alignment);
      expect(metrics.typeIErrors).toBe(1);
      expect(metrics.typeIIErrors).toBe(1);
    });
  });
});
