import { describe, it, expect } from 'vitest';
import { computeUnalignedRegions } from './unaligned-regions.ts';
import type { Lcb } from '../../import/xmfa/types.ts';

function makeLcbs(): readonly Lcb[] {
  return [
    { id: 0, left: [100, 200], right: [400, 500], reverse: [false, false], weight: 301 },
    { id: 1, left: [600, 700], right: [800, 900], reverse: [false, true], weight: 201 },
  ];
}

describe('computeUnalignedRegions', () => {
  it('should find gaps before first LCB', () => {
    const gaps = computeUnalignedRegions(makeLcbs(), 0, 1000);
    const firstGap = gaps.find((g) => g.start === 1);
    expect(firstGap).toBeDefined();
    expect(firstGap!.end).toBe(99);
  });

  it('should find gaps between LCBs', () => {
    const gaps = computeUnalignedRegions(makeLcbs(), 0, 1000);
    const middleGap = gaps.find((g) => g.start === 401);
    expect(middleGap).toBeDefined();
    expect(middleGap!.end).toBe(599);
  });

  it('should find gaps after last LCB', () => {
    const gaps = computeUnalignedRegions(makeLcbs(), 0, 1000);
    const lastGap = gaps.find((g) => g.start === 801);
    expect(lastGap).toBeDefined();
    expect(lastGap!.end).toBe(1000);
  });

  it('should return entire genome as gap when no LCBs cover it', () => {
    const lcbs: Lcb[] = [
      { id: 0, left: [0, 100], right: [0, 500], reverse: [false, false], weight: 100 },
    ];
    const gaps = computeUnalignedRegions(lcbs, 0, 1000);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.start).toBe(1);
    expect(gaps[0]!.end).toBe(1000);
  });

  it('should return empty array when LCBs cover entire genome', () => {
    const lcbs: Lcb[] = [
      { id: 0, left: [1, 1], right: [1000, 1000], reverse: [false, false], weight: 1000 },
    ];
    const gaps = computeUnalignedRegions(lcbs, 0, 1000);
    expect(gaps).toHaveLength(0);
  });

  it('should handle overlapping LCBs', () => {
    const lcbs: Lcb[] = [
      { id: 0, left: [100, 100], right: [500, 500], reverse: [false, false], weight: 401 },
      { id: 1, left: [300, 300], right: [700, 700], reverse: [false, false], weight: 401 },
    ];
    const gaps = computeUnalignedRegions(lcbs, 0, 1000);
    // Gap before first: 1..99, gap after merged: 701..1000
    expect(gaps).toHaveLength(2);
    expect(gaps[0]!.start).toBe(1);
    expect(gaps[0]!.end).toBe(99);
    expect(gaps[1]!.start).toBe(701);
    expect(gaps[1]!.end).toBe(1000);
  });

  it('should handle adjacent LCBs with no gap', () => {
    const lcbs: Lcb[] = [
      { id: 0, left: [1, 1], right: [500, 500], reverse: [false, false], weight: 500 },
      { id: 1, left: [501, 501], right: [1000, 1000], reverse: [false, false], weight: 500 },
    ];
    const gaps = computeUnalignedRegions(lcbs, 0, 1000);
    expect(gaps).toHaveLength(0);
  });

  it('should use the correct genome index', () => {
    const lcbs = makeLcbs();
    const gaps0 = computeUnalignedRegions(lcbs, 0, 1000);
    const gaps1 = computeUnalignedRegions(lcbs, 1, 1200);
    // Different genomes should have different gap patterns
    expect(gaps0.length).toBeGreaterThan(0);
    expect(gaps1.length).toBeGreaterThan(0);
    // Genome 1 has LCBs at 200-500 and 700-900
    const firstGap1 = gaps1.find((g) => g.start === 1);
    expect(firstGap1).toBeDefined();
    expect(firstGap1!.end).toBe(199);
  });
});
