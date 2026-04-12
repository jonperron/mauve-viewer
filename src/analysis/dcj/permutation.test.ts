import { describe, expect, it } from 'vitest';
import {
  buildBlockIdMap,
  equalContents,
  lcbsToPermutationStrings,
  parsePermutationString,
} from './permutation.ts';
import { TAIL_TAG, HEAD_TAG, TELOMERE } from './types.ts';

describe('buildBlockIdMap', () => {
  it('extracts unique block names from a single permutation', () => {
    const map = buildBlockIdMap('1,-2,3$');
    expect(map.size).toBe(3);
    expect(map.has('1')).toBe(true);
    expect(map.has('2')).toBe(true);
    expect(map.has('3')).toBe(true);
  });

  it('merges blocks from multiple permutations', () => {
    const map = buildBlockIdMap('1,2$', '2,3$');
    expect(map.size).toBe(3);
    expect(map.get('1')).toBe(0);
    expect(map.get('2')).toBe(1);
    expect(map.get('3')).toBe(2);
  });

  it('handles circular chromosome markers', () => {
    const map = buildBlockIdMap('1,2*$');
    expect(map.size).toBe(2);
    expect(map.has('1')).toBe(true);
    expect(map.has('2')).toBe(true);
  });

  it('ignores empty tokens', () => {
    const map = buildBlockIdMap(',,1,,2,,');
    expect(map.size).toBe(2);
  });
});

describe('parsePermutationString', () => {
  it('parses a simple linear permutation', () => {
    const map = buildBlockIdMap('1,2,3$');
    const perm = parsePermutationString('1,2,3$', map, 'genome1');

    expect(perm.name).toBe('genome1');
    expect(perm.contigs).toHaveLength(1);
    expect(perm.contigs[0]!.blocks).toHaveLength(3);
    expect(perm.contigs[0]!.circular).toBe(false);
  });

  it('parses a circular contig', () => {
    const map = buildBlockIdMap('1,2*$');
    const perm = parsePermutationString('1,2*$', map);

    expect(perm.contigs[0]!.circular).toBe(true);
    // Circular: no telomeres, one wrap-around adjacency + internal
    expect(perm.adjacencies.every((a) => !a.telomere)).toBe(true);
  });

  it('parses inverted blocks', () => {
    const map = buildBlockIdMap('1,-2,3$');
    const perm = parsePermutationString('1,-2,3$', map);
    const blocks = perm.contigs[0]!.blocks;

    expect(blocks[0]!.inverted).toBe(false);
    expect(blocks[1]!.inverted).toBe(true);
    expect(blocks[2]!.inverted).toBe(false);
  });

  it('creates telomere adjacencies for linear chromosomes', () => {
    const map = buildBlockIdMap('1,2$');
    const perm = parsePermutationString('1,2$', map);

    const telomeres = perm.adjacencies.filter((a) => a.telomere);
    expect(telomeres).toHaveLength(2);
    expect(telomeres[0]!.second).toBe(TELOMERE);
    expect(telomeres[1]!.second).toBe(TELOMERE);
  });

  it('creates correct adjacencies for forward blocks', () => {
    const map = buildBlockIdMap('1,2$');
    const perm = parsePermutationString('1,2$', map);

    // For forward block 1: left=1_t, right=1_h
    // For forward block 2: left=2_t, right=2_h
    // Left telomere: {1_t, TELO}
    // Internal: {1_h, 2_t}
    // Right telomere: {2_h, TELO}
    const nonTelo = perm.adjacencies.filter((a) => !a.telomere);
    expect(nonTelo).toHaveLength(1);
    expect(nonTelo[0]!.first).toBe('1' + HEAD_TAG);
    expect(nonTelo[0]!.second).toBe('2' + TAIL_TAG);
  });

  it('creates correct adjacencies for inverted blocks', () => {
    const map = buildBlockIdMap('-1$');
    const perm = parsePermutationString('-1$', map);

    // Inverted block 1: left=1_h, right=1_t
    const telomeres = perm.adjacencies.filter((a) => a.telomere);
    expect(telomeres[0]!.first).toBe('1' + HEAD_TAG);
    expect(telomeres[1]!.first).toBe('1' + TAIL_TAG);
  });

  it('handles multiple contigs', () => {
    const map = buildBlockIdMap('1,2$3,4$');
    const perm = parsePermutationString('1,2$3,4$', map);

    expect(perm.contigs).toHaveLength(2);
    // 2 contigs, each linear → 4 telomeres + 2 internal = 6 adjacencies
    expect(perm.adjacencies).toHaveLength(6);
  });

  it('provides correct location lookup', () => {
    const map = buildBlockIdMap('1,2$');
    const perm = parsePermutationString('1,2$', map);

    const loc1 = perm.locations.get('1');
    const loc2 = perm.locations.get('2');
    expect(loc1).toBeDefined();
    expect(loc2).toBeDefined();
    // Each location is [tailIndex, headIndex]
    expect(loc1![0]).toBeGreaterThanOrEqual(0);
    expect(loc1![1]).toBeGreaterThanOrEqual(0);
  });
});

describe('lcbsToPermutationStrings', () => {
  it('converts LCBs to permutation strings for each genome', () => {
    const lcbs = [
      { id: 1, left: [100, 200], right: [300, 400], reverse: [false, true] },
      { id: 2, left: [400, 50], right: [600, 150], reverse: [false, false] },
    ];

    const result = lcbsToPermutationStrings(lcbs, 2);
    expect(result).toHaveLength(2);
    // Genome 0: LCB 1 at pos 100, LCB 2 at pos 400 → "1,2$"
    expect(result[0]).toBe('1,2$');
    // Genome 1: LCB 2 at pos 50, LCB 1 at pos 200 (reversed) → "2,-1$"
    expect(result[1]).toBe('2,-1$');
  });

  it('skips LCBs not present in a genome', () => {
    const lcbs = [
      { id: 1, left: [100, 0], right: [200, 0], reverse: [false, false] },
      { id: 2, left: [300, 100], right: [400, 200], reverse: [false, false] },
    ];

    const result = lcbsToPermutationStrings(lcbs, 2);
    expect(result[0]).toBe('1,2$');
    expect(result[1]).toBe('2$');
  });
});

describe('equalContents', () => {
  it('returns true for identical content', () => {
    expect(equalContents('1,2,3$', '1,2,3$')).toBe(true);
  });

  it('returns true for same content in different order', () => {
    expect(equalContents('1,2,3$', '3,1,2$')).toBe(true);
  });

  it('returns true ignoring signs', () => {
    expect(equalContents('1,-2,3$', '-1,2,-3$')).toBe(true);
  });

  it('returns false for different content', () => {
    expect(equalContents('1,2,3$', '1,2,4$')).toBe(false);
  });

  it('returns false for different sizes', () => {
    expect(equalContents('1,2$', '1,2,3$')).toBe(false);
  });
});
