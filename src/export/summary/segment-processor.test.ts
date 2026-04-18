import { describe, it, expect } from 'vitest';
import type { BackboneSegment } from '../../import/backbone/types.ts';
import type { Lcb, Genome } from '../../import/xmfa/types.ts';
import {
  processSegments,
  genomeToMask,
  allGenomesMask,
  multiplicityLabel,
} from './segment-processor.ts';

// ── Helpers to build test data ───────────────────────────────────────────────

function makeLcb(id: number, lefts: number[], rights: number[], reverses: boolean[], weight = 1): Lcb {
  return { id, left: lefts, right: rights, reverse: reverses, weight };
}

function makeBackbone(seqIndex: number, intervals: [number, number][]): BackboneSegment {
  return {
    seqIndex,
    intervals: intervals.map(([l, r]) => ({ leftEnd: l, rightEnd: r })),
    isBackbone: intervals.every(([l]) => l > 0),
  };
}

function makeGenome(index: number, length: number, name?: string): Genome {
  return { index, name: name ?? `Genome_${index}`, length, format: 'FASTA' };
}

// ── Mask helpers ─────────────────────────────────────────────────────────────

describe('genomeToMask', () => {
  it('returns correct mask for each genome in a 3-genome setup', () => {
    expect(genomeToMask(0, 3)).toBe(0b100); // 4
    expect(genomeToMask(1, 3)).toBe(0b010); // 2
    expect(genomeToMask(2, 3)).toBe(0b001); // 1
  });
});

describe('allGenomesMask', () => {
  it('returns bitmask with all bits set', () => {
    expect(allGenomesMask(3)).toBe(0b111); // 7
    expect(allGenomesMask(2)).toBe(0b11);  // 3
    expect(allGenomesMask(1)).toBe(0b1);   // 1
  });
});

describe('multiplicityLabel', () => {
  it('returns binary string for given mask', () => {
    expect(multiplicityLabel(0b111, 3)).toBe('111');
    expect(multiplicityLabel(0b100, 3)).toBe('100');
    expect(multiplicityLabel(0b010, 3)).toBe('010');
    expect(multiplicityLabel(0b110, 3)).toBe('110');
  });
});

// ── processSegments ──────────────────────────────────────────────────────────

describe('processSegments', () => {
  it('builds chains for a simple 2-genome alignment', () => {
    const genomes = [makeGenome(0, 1000), makeGenome(1, 1000)];
    const lcbs = [
      makeLcb(1, [100, 200], [500, 600], [false, false]),
    ];
    const backbone = [
      makeBackbone(1, [[100, 500], [200, 600]]),
    ];

    const result = processSegments(backbone, lcbs, genomes);

    // Genome 0: island [1-99], backbone [100-500], island [501-1000]
    expect(result.chains[0]).toHaveLength(3);
    expect(result.chains[0]![0]!.typedId).toMatch(/^i_/);
    expect(result.chains[0]![1]!.typedId).toMatch(/^b_/);
    expect(result.chains[0]![2]!.typedId).toMatch(/^i_/);

    // Genome 1: island [1-199], backbone [200-600], island [601-1000]
    expect(result.chains[1]).toHaveLength(3);
    expect(result.chains[1]![0]!.typedId).toMatch(/^i_/);
    expect(result.chains[1]![1]!.typedId).toMatch(/^b_/);
    expect(result.chains[1]![2]!.typedId).toMatch(/^i_/);

    // The backbone segment should have the same ID in both chains
    expect(result.chains[0]![1]!.typedId).toBe(result.chains[1]![1]!.typedId);
  });

  it('handles backbone segment present in only one genome', () => {
    const genomes = [makeGenome(0, 500), makeGenome(1, 500)];
    const lcbs = [
      makeLcb(1, [100, 0], [200, 0], [false, false]),
    ];
    const backbone = [
      makeBackbone(1, [[100, 200], [0, 0]]),
    ];

    const result = processSegments(backbone, lcbs, genomes);

    // Genome 0: island [1-99], backbone-partial [100-200], island [201-500]
    expect(result.chains[0]).toHaveLength(3);
    // Genome 0 segment has only genome 0 bit set → i_ prefix
    expect(result.chains[0]![1]!.typedId).toMatch(/^i_/);

    // Genome 1: single island [1-500]
    expect(result.chains[1]).toHaveLength(1);
    expect(result.chains[1]![0]!.typedId).toMatch(/^i_/);
  });

  it('assigns b_i_ prefix for segments present in a subset of genomes', () => {
    const genomes = [makeGenome(0, 500), makeGenome(1, 500), makeGenome(2, 500)];
    const lcbs = [
      makeLcb(1, [100, 100, 0], [200, 200, 0], [false, false, false]),
    ];
    const backbone = [
      makeBackbone(1, [[100, 200], [100, 200], [0, 0]]),
    ];

    const result = processSegments(backbone, lcbs, genomes);

    // Genome 0 chain: island, partial-backbone (genomes 0+1), island
    const partialSeg = result.chains[0]![1]!;
    expect(partialSeg.typedId).toMatch(/^b_i_/);
    expect(partialSeg.multiplicityMask).toBe(0b110);
  });

  it('handles empty backbone (all islands)', () => {
    const genomes = [makeGenome(0, 100)];
    const result = processSegments([], [], genomes);

    expect(result.chains[0]).toHaveLength(1);
    expect(result.chains[0]![0]!.intervals[0]!.leftEnd).toBe(1);
    expect(result.chains[0]![0]!.intervals[0]!.rightEnd).toBe(100);
  });

  it('finds correct reference genome (no reversed segments)', () => {
    const genomes = [makeGenome(0, 500), makeGenome(1, 500)];
    const lcbs = [
      makeLcb(1, [100, 100], [200, 200], [true, false]),
    ];
    const backbone = [
      makeBackbone(1, [[100, 200], [100, 200]]),
    ];

    const result = processSegments(backbone, lcbs, genomes);
    // Genome 0 has reversed segment, genome 1 does not
    expect(result.referenceGenome).toBe(1);
  });

  it('handles contiguous backbone segments without gaps', () => {
    const genomes = [makeGenome(0, 300)];
    const lcbs = [
      makeLcb(1, [1], [150], [false]),
      makeLcb(2, [151], [300], [false]),
    ];
    const backbone = [
      makeBackbone(1, [[1, 150]]),
      makeBackbone(2, [[151, 300]]),
    ];

    const result = processSegments(backbone, lcbs, genomes);

    // No islands needed when backbone covers entire genome
    expect(result.chains[0]).toHaveLength(2);
    expect(result.chains[0]![0]!.typedId).toMatch(/^b_/);
    expect(result.chains[0]![1]!.typedId).toMatch(/^b_/);
  });

  it('assigns sequential IDs across genomes', () => {
    const genomes = [makeGenome(0, 200), makeGenome(1, 200)];
    const lcbs = [
      makeLcb(1, [50, 50], [100, 100], [false, false]),
    ];
    const backbone = [
      makeBackbone(1, [[50, 100], [50, 100]]),
    ];

    const result = processSegments(backbone, lcbs, genomes);

    // Collect all IDs
    const ids = new Set<string>();
    for (const chain of result.chains) {
      for (const seg of chain) {
        ids.add(seg.typedId);
      }
    }
    // Backbone segment shared → one ID; plus 4 island segments (2 per genome)
    // Total unique IDs should be 5
    expect(ids.size).toBe(5);
  });
});
