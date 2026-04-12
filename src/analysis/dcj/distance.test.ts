import { describe, expect, it } from 'vitest';
import { computeDistances, computeDistanceMatrix, computeDistanceMatrixFromLcbs } from './distance.ts';

describe('computeDistances', () => {
  it('returns zero distances for identical permutations', () => {
    const d = computeDistances('1,2,3$', '1,2,3$');
    expect(d.dcj).toBe(0);
    expect(d.breakpoint).toBe(0);
    expect(d.scj).toBe(0);
    expect(d.blocks).toBe(3);
  });

  it('computes DCJ distance 1 for a single block inversion', () => {
    // (1,2,3) vs (1,-2,3): middle block inverted changes 2 adjacencies
    const d = computeDistances('1,2,3$', '1,-2,3$');
    expect(d.dcj).toBe(1);
    expect(d.breakpoint).toBe(2);
    expect(d.blocks).toBe(3);
  });

  it('computes DCJ distance for block transposition', () => {
    // (1,2,3) vs (2,1,3): transposition requires 2 DCJ operations
    const d = computeDistances('1,2,3$', '2,1,3$');
    expect(d.dcj).toBe(2);
  });

  it('returns zero DCJ for complete reversal of linear chromosome', () => {
    // Complete reversal preserves all adjacencies in DCJ model
    const d = computeDistances('1,2,3$', '-3,-2,-1$');
    expect(d.dcj).toBe(0);
  });

  it('SCJ >= BP >= DCJ >= 0', () => {
    const d = computeDistances('1,2,3,4,5$', '3,-1,5,2,-4$');
    expect(d.dcj).toBeGreaterThanOrEqual(0);
    expect(d.breakpoint).toBeGreaterThanOrEqual(d.dcj);
    expect(d.scj).toBeGreaterThanOrEqual(d.breakpoint);
  });

  it('handles single-block permutations', () => {
    const d = computeDistances('1$', '1$');
    expect(d.dcj).toBe(0);
    expect(d.blocks).toBe(1);
  });

  it('single-block inversion has zero DCJ distance', () => {
    // A single block inversion has no adjacency change in DCJ model
    const d = computeDistances('1$', '-1$');
    expect(d.dcj).toBe(0);
  });

  it('handles identical multi-block linear permutations', () => {
    const d = computeDistances('1,2,3,4$', '1,2,3,4$');
    expect(d.dcj).toBe(0);
    expect(d.breakpoint).toBe(0);
    expect(d.scj).toBe(0);
  });

  it('computes correct distance for circular chromosomes', () => {
    const d = computeDistances('1,2,3*$', '1,2,3*$');
    expect(d.dcj).toBe(0);
  });
});

describe('computeDistanceMatrix', () => {
  it('produces a symmetric matrix with zero diagonal', () => {
    const perms = ['1,2,3$', '2,1,3$', '3,2,1$'];
    const labels = ['A', 'B', 'C'];
    const matrix = computeDistanceMatrix(perms, labels);

    expect(matrix.labels).toEqual(['A', 'B', 'C']);
    expect(matrix.distances).toHaveLength(3);

    // Diagonal is zero
    for (let i = 0; i < 3; i++) {
      expect(matrix.distances[i]![i]!.dcj).toBe(0);
    }

    // Symmetric
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < i; j++) {
        expect(matrix.distances[i]![j]!.dcj).toBe(matrix.distances[j]![i]!.dcj);
      }
    }
  });
});

describe('computeDistanceMatrixFromLcbs', () => {
  it('computes distances from LCB data', () => {
    const lcbs = [
      { id: 1, left: [100, 200], right: [200, 300], reverse: [false, false] },
      { id: 2, left: [300, 50], right: [400, 150], reverse: [false, true] },
    ];

    const matrix = computeDistanceMatrixFromLcbs(lcbs, 2, ['genome1', 'genome2']);
    expect(matrix.labels).toEqual(['genome1', 'genome2']);
    expect(matrix.distances).toHaveLength(2);
    // Same blocks but different arrangement → non-zero distance
    expect(matrix.distances[0]![0]!.dcj).toBe(0);
  });
});
