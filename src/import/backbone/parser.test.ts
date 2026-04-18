import { describe, expect, it } from 'vitest';
import {
  parseBackbone,
  parseIdentityMatrix,
  parseIslands,
  parseLcbCoords,
  parsePermutation,
} from './parser.ts';

describe('parseBackbone', () => {
  it('parses seq-indexed rows with coordinate pairs', () => {
    const content = '1\t10\t40\t5\t35\n2\t15\t45\t0\t0';
    const result = parseBackbone(content);

    expect(result).toHaveLength(2);
    expect(result[0]!.intervals).toHaveLength(2);
    expect(result[0]!.isBackbone).toBe(true);
    expect(result[1]!.isBackbone).toBe(false);
  });
});

describe('parseIslands', () => {
  it('parses islands rows', () => {
    const result = parseIslands('1 100 200 island_A');
    expect(result[0]!.genomeIndex).toBe(1);
    expect(result[0]!.label).toBe('island_A');
  });
});

describe('parseIdentityMatrix', () => {
  it('parses tab-delimited matrix', () => {
    const content = '\tA\tB\nA\t1\t0.8\nB\t0.8\t1';
    const result = parseIdentityMatrix(content);
    expect(result.labels).toEqual(['A', 'B']);
    expect(result.values[0]![1]).toBe(0.8);
  });
});

describe('parsePermutation', () => {
  it('parses signed permutation rows', () => {
    const result = parsePermutation('Genome1 +1 -2 +3');
    expect(result[0]!.genomeLabel).toBe('Genome1');
    expect(result[0]!.values).toEqual([1, -2, 3]);
  });
});

describe('parseLcbCoords', () => {
  it('parses lcb coordinate rows', () => {
    const result = parseLcbCoords('1\t2\t100\t220\t-');
    expect(result[0]!.lcbId).toBe(2);
    expect(result[0]!.strand).toBe('-');
  });
});