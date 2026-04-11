import { describe, expect, it } from 'vitest';
import { buildAdjacencyGraph } from './adjacency-graph.ts';
import { buildBlockIdMap, parsePermutationString } from './permutation.ts';

function buildPerms(x: string, y: string) {
  const map = buildBlockIdMap(x, y);
  return {
    a: parsePermutationString(x, map, 'A'),
    b: parsePermutationString(y, map, 'B'),
    blockCount: map.size,
  };
}

describe('buildAdjacencyGraph', () => {
  it('finds only matching components for identical permutations', () => {
    const { a, b } = buildPerms('1,2,3$', '1,2,3$');
    const stats = buildAdjacencyGraph(a, b);

    // Identical linear: internal adjacencies form 2-cycles,
    // telomere pairs form 1-edge paths (matching telo to telo)
    expect(stats.len2Cycles).toBe(2); // 2 internal multi-edge 2-cycles
    expect(stats.oddPaths).toBe(2);   // 2 telomere 1-paths
    expect(stats.len1Paths).toBe(2);
    expect(stats.pathsGte2).toBe(0);
  });

  it('detects rearrangement for block swap', () => {
    const { a, b } = buildPerms('1,2,3$', '2,1,3$');
    const stats = buildAdjacencyGraph(a, b);

    // Block swap creates non-matching adjacencies → longer paths/cycles
    // DCJ = N - (C + I/2) should be > 0
    const N = 3;
    const dcj = N - (stats.cycles + Math.floor(stats.oddPaths / 2));
    expect(dcj).toBeGreaterThan(0);
  });

  it('detects single block inversion', () => {
    const { a, b } = buildPerms('1,2,3$', '1,-2,3$');
    const stats = buildAdjacencyGraph(a, b);

    // Block 2 inverted: the internal adjacencies containing block 2 change
    // This creates a 4-node cycle plus 2 telomere pairs
    expect(stats.cycles).toBe(1);
    expect(stats.oddPaths).toBe(2);
    expect(stats.len1Paths).toBe(2);
  });

  it('handles circular chromosomes', () => {
    const { a, b } = buildPerms('1,2,3*$', '1,2,3*$');
    const stats = buildAdjacencyGraph(a, b);

    // Identical circular: all adjacencies match → all 2-cycles, no telomeres
    expect(stats.cycles).toBe(3);
    expect(stats.oddPaths).toBe(0);
    expect(stats.len2Cycles).toBe(3);
  });

  it('handles multiple contigs', () => {
    const { a, b } = buildPerms('1,2$3,4$', '1,2$3,4$');
    const stats = buildAdjacencyGraph(a, b);

    // 2 linear contigs: 2 internal 2-cycles + 4 telomere 1-paths
    expect(stats.len2Cycles).toBe(2);
    expect(stats.oddPaths).toBe(4);
    expect(stats.len1Paths).toBe(4);
  });

  it('handles single block permutations', () => {
    const { a, b } = buildPerms('1$', '1$');
    const stats = buildAdjacencyGraph(a, b);

    // 1 block linear: only 2 telomere pairs → 2 matching 1-paths
    expect(stats.cycles).toBe(0);
    expect(stats.oddPaths).toBe(2);
    expect(stats.len1Paths).toBe(2);
  });
});
