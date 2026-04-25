import { describe, it, expect } from 'vitest';
import { filterLcbsByWeight, maxLcbWeight, minLcbWeight } from './lcb-filter.ts';
import type { Lcb } from '../import/xmfa/types.ts';

function makeLcb(id: number, weight: number): Lcb {
  return {
    id,
    left: [0],
    right: [100],
    reverse: [false],
    weight,
  };
}

describe('filterLcbsByWeight', () => {
  const lcbs: readonly Lcb[] = [
    makeLcb(1, 100),
    makeLcb(2, 500),
    makeLcb(3, 50),
    makeLcb(4, 1000),
  ];

  it('returns all LCBs when minWeight is 0', () => {
    expect(filterLcbsByWeight(lcbs, 0)).toBe(lcbs);
  });

  it('returns all LCBs when minWeight is negative', () => {
    expect(filterLcbsByWeight(lcbs, -1)).toBe(lcbs);
  });

  it('filters out LCBs with weight strictly below threshold', () => {
    const result = filterLcbsByWeight(lcbs, 100);
    expect(result).toHaveLength(3);
    expect(result.map((l) => l.id)).toEqual([1, 2, 4]);
  });

  it('keeps LCBs with weight exactly equal to threshold', () => {
    const result = filterLcbsByWeight(lcbs, 500);
    expect(result).toHaveLength(2);
    expect(result.map((l) => l.id)).toEqual([2, 4]);
  });

  it('returns empty array when all LCBs are below threshold', () => {
    expect(filterLcbsByWeight(lcbs, 2000)).toHaveLength(0);
  });

  it('handles empty LCB list', () => {
    expect(filterLcbsByWeight([], 100)).toHaveLength(0);
  });
});

describe('maxLcbWeight', () => {
  it('returns 0 for an empty list', () => {
    expect(maxLcbWeight([])).toBe(0);
  });

  it('returns the maximum weight', () => {
    const lcbs: readonly Lcb[] = [makeLcb(1, 300), makeLcb(2, 100), makeLcb(3, 700)];
    expect(maxLcbWeight(lcbs)).toBe(700);
  });

  it('returns the single weight for a one-element list', () => {
    expect(maxLcbWeight([makeLcb(1, 42)])).toBe(42);
  });
});

describe('minLcbWeight', () => {
  it('returns 0 for an empty list', () => {
    expect(minLcbWeight([])).toBe(0);
  });

  it('returns the minimum weight', () => {
    const lcbs: readonly Lcb[] = [makeLcb(1, 300), makeLcb(2, 100), makeLcb(3, 700)];
    expect(minLcbWeight(lcbs)).toBe(100);
  });

  it('returns the single weight for a one-element list', () => {
    expect(minLcbWeight([makeLcb(1, 42)])).toBe(42);
  });
});
