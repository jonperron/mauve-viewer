import { describe, expect, it } from 'vitest';
import { analyzePermutation, permutationStringToArray } from './solver.ts';

describe('permutationStringToArray', () => {
  it('converts a simple permutation string', () => {
    expect(permutationStringToArray('1,2,3$')).toEqual([1, 2, 3]);
  });

  it('handles negative (inverted) elements', () => {
    expect(permutationStringToArray('1,-2,3$')).toEqual([1, -2, 3]);
  });

  it('uses only the first contig', () => {
    expect(permutationStringToArray('1,2$3,4$')).toEqual([1, 2]);
  });

  it('throws for invalid elements', () => {
    expect(() => permutationStringToArray('1,abc,3$')).toThrow('Invalid permutation element');
  });

  it('throws for zero elements', () => {
    expect(() => permutationStringToArray('1,0,3$')).toThrow('Invalid permutation element');
  });
});

describe('analyzePermutation', () => {
  it('returns zero distance for identity permutation', () => {
    const result = analyzePermutation([1, 2, 3]);
    expect(result.reversalDistance).toBe(0);
    expect(result.scenario).toHaveLength(0);
    expect(result.breakpointCount).toBe(0);
  });

  it('computes distance for a single inversion', () => {
    const result = analyzePermutation([-1]);
    expect(result.reversalDistance).toBeGreaterThanOrEqual(1);
    expect(result.breakpointCount).toBeGreaterThanOrEqual(1);
  });

  it('finds a sorting scenario', () => {
    const result = analyzePermutation([2, 1]);
    expect(result.scenario.length).toBeGreaterThanOrEqual(1);
    // Apply scenario should yield identity (sorted)
    let perm = [...result.permutation];
    for (const rev of result.scenario) {
      perm = applyReversalHelper(perm, rev.start, rev.end);
    }
    expect(perm).toEqual([1, 2]);
  });

  it('finds a sorting scenario for larger permutation', () => {
    const result = analyzePermutation([3, -1, 2]);
    expect(result.scenario.length).toBeGreaterThanOrEqual(1);
    let perm = [...result.permutation];
    for (const rev of result.scenario) {
      perm = applyReversalHelper(perm, rev.start, rev.end);
    }
    expect(perm).toEqual([1, 2, 3]);
  });

  it('handles already-sorted permutation', () => {
    const result = analyzePermutation([1, 2, 3, 4, 5]);
    expect(result.reversalDistance).toBe(0);
    expect(result.scenario).toHaveLength(0);
  });

  it('handles completely reversed permutation', () => {
    const result = analyzePermutation([-3, -2, -1]);
    expect(result.reversalDistance).toBeGreaterThanOrEqual(1);
    let perm = [...result.permutation];
    for (const rev of result.scenario) {
      perm = applyReversalHelper(perm, rev.start, rev.end);
    }
    expect(perm).toEqual([1, 2, 3]);
  });

  it('handles single element', () => {
    const result = analyzePermutation([1]);
    expect(result.reversalDistance).toBe(0);
  });
});

/** Helper to apply a reversal for testing */
function applyReversalHelper(perm: number[], start: number, end: number): number[] {
  const result = [...perm];
  let i = start;
  let j = end;
  while (i < j) {
    const tmp = result[i]!;
    result[i] = -result[j]!;
    result[j] = -tmp;
    i++;
    j--;
  }
  if (i === j) {
    result[i] = -result[i]!;
  }
  return result;
}
