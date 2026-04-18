import { describe, expect, it } from 'vitest';
import { computeBackbone, computeIslands, filterByWeight, getMultiplicityMask } from './compute.ts';
import type { Lcb } from '../../import/xmfa/types.ts';

function makeLcb(id: number, left: number[], right: number[], weight: number): Lcb {
  return {
    id,
    left,
    right,
    reverse: left.map(() => false),
    weight,
  };
}

describe('computeBackbone', () => {
  it('marks segments present in all genomes as backbone', () => {
    const lcbs: Lcb[] = [
      makeLcb(1, [100, 200, 300], [200, 400, 500], 50),
      makeLcb(2, [300, 500, 0], [400, 600, 0], 30),
    ];

    const segments = computeBackbone(lcbs, 3);
    expect(segments).toHaveLength(1); // Only LCB 1 is in all 3 genomes
    expect(segments[0]!.isBackbone).toBe(true);
    expect(segments[0]!.seqIndex).toBe(1);
  });

  it('includes subset-conserved segments with lower minMultiplicity', () => {
    const lcbs: Lcb[] = [
      makeLcb(1, [100, 200, 300], [200, 400, 500], 50),
      makeLcb(2, [300, 500, 0], [400, 600, 0], 30),
    ];

    const segments = computeBackbone(lcbs, 3, { minMultiplicity: 2 });
    expect(segments).toHaveLength(2);
    expect(segments[0]!.isBackbone).toBe(true);
    expect(segments[1]!.isBackbone).toBe(false);
  });

  it('filters by minimum weight', () => {
    const lcbs: Lcb[] = [
      makeLcb(1, [100, 200], [200, 400], 50),
      makeLcb(2, [300, 500], [400, 600], 10),
    ];

    const segments = computeBackbone(lcbs, 2, { minWeight: 30 });
    expect(segments).toHaveLength(1);
    expect(segments[0]!.seqIndex).toBe(1);
  });

  it('returns empty for no qualifying LCBs', () => {
    const lcbs: Lcb[] = [
      makeLcb(1, [100, 0], [200, 0], 50),
    ];

    const segments = computeBackbone(lcbs, 2);
    expect(segments).toHaveLength(0);
  });

  it('creates correct intervals for each genome', () => {
    const lcbs: Lcb[] = [
      makeLcb(1, [100, 200], [300, 400], 50),
    ];

    const segments = computeBackbone(lcbs, 2);
    expect(segments[0]!.intervals).toHaveLength(2);
    expect(segments[0]!.intervals[0]!.leftEnd).toBe(100);
    expect(segments[0]!.intervals[0]!.rightEnd).toBe(300);
    expect(segments[0]!.intervals[1]!.leftEnd).toBe(200);
    expect(segments[0]!.intervals[1]!.rightEnd).toBe(400);
  });
});

describe('getMultiplicityMask', () => {
  it('returns correct bitmask for genome presence', () => {
    const segment = {
      seqIndex: 1,
      intervals: [
        { leftEnd: 100, rightEnd: 200 },
        { leftEnd: 0, rightEnd: 0 },
        { leftEnd: 300, rightEnd: 400 },
      ],
      isBackbone: false,
    };

    const mask = getMultiplicityMask(segment);
    expect(mask).toBe(0b101); // genomes 0 and 2 present
  });
});

describe('filterByWeight', () => {
  it('filters segments by LCB weight', () => {
    const lcbs: Lcb[] = [
      makeLcb(1, [100, 200], [200, 300], 50),
      makeLcb(2, [300, 400], [400, 500], 10),
    ];
    const segments = computeBackbone(lcbs, 2);
    const filtered = filterByWeight(segments, lcbs, 30);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.seqIndex).toBe(1);
  });
});

describe('computeIslands', () => {
  it('identifies gaps between backbone segments', () => {
    const lcbs: Lcb[] = [
      makeLcb(1, [100, 100], [200, 200], 50),
      makeLcb(2, [400, 400], [500, 500], 50),
    ];
    const segments = computeBackbone(lcbs, 2);
    const islands = computeIslands(segments, 0, 1000);

    // Islands: [1, 99], [201, 399], [501, 1000]
    expect(islands).toHaveLength(3);
    expect(islands[0]!.leftEnd).toBe(1);
    expect(islands[0]!.rightEnd).toBe(99);
    expect(islands[1]!.leftEnd).toBe(201);
    expect(islands[1]!.rightEnd).toBe(399);
    expect(islands[2]!.leftEnd).toBe(501);
    expect(islands[2]!.rightEnd).toBe(1000);
  });

  it('returns whole genome as island when no backbone exists', () => {
    const islands = computeIslands([], 0, 1000);
    expect(islands).toHaveLength(1);
    expect(islands[0]!.leftEnd).toBe(1);
    expect(islands[0]!.rightEnd).toBe(1000);
  });

  it('returns no islands when backbone covers everything', () => {
    const segments = [{
      seqIndex: 1,
      intervals: [{ leftEnd: 1, rightEnd: 1000 }],
      isBackbone: true,
    }];
    const islands = computeIslands(segments, 0, 1000);
    expect(islands).toHaveLength(0);
  });
});
