import { describe, it, expect } from 'vitest';
import {
  groupContigs,
  getPrimaryContig,
  areProximate,
  MAX_IGNORABLE_DIST,
  MIN_LENGTH_RATIO,
} from './contig-grouper.js';
import type { ContigInfo, LcbSegment } from './contig-grouper.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContig(name: string, start: number, end: number): ContigInfo {
  return { name, start, end };
}

function makeLcb(
  refStart: number,
  refEnd: number,
  draftStart: number,
  draftEnd: number,
  forward = true,
  weight = 100,
): LcbSegment {
  return { referenceStart: refStart, referenceEnd: refEnd, draftStart, draftEnd, forward, weight };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('MAX_IGNORABLE_DIST is 50', () => {
    expect(MAX_IGNORABLE_DIST).toBe(50);
  });

  it('MIN_LENGTH_RATIO is 0.01', () => {
    expect(MIN_LENGTH_RATIO).toBe(0.01);
  });
});

// ---------------------------------------------------------------------------
// getPrimaryContig
// ---------------------------------------------------------------------------

describe('getPrimaryContig', () => {
  const contigs = [
    makeContig('c1', 1, 10000),
    makeContig('c2', 10001, 20000),
  ];

  it('returns the contig with the largest qualifying overlap', () => {
    const lcb = makeLcb(1, 100, 5000, 6000);
    expect(getPrimaryContig(lcb, contigs)?.name).toBe('c1');
  });

  it('returns undefined when overlap fraction is below MIN_LENGTH_RATIO', () => {
    // LCB covers only 0.5 bases of a 10000-bp contig → below 0.01
    const lcb = makeLcb(1, 100, 1, 0, true); // empty overlap
    expect(getPrimaryContig(lcb, contigs)).toBeUndefined();
  });

  it('returns undefined when LCB does not overlap any contig', () => {
    const lcb = makeLcb(1, 100, 50000, 51000);
    expect(getPrimaryContig(lcb, contigs)).toBeUndefined();
  });

  it('handles reverse-strand LCBs (draftStart > draftEnd)', () => {
    // Reverse-strand LCB: draft coordinates may be swapped
    const lcb = makeLcb(1, 100, 6000, 5000, false);
    expect(getPrimaryContig(lcb, contigs)?.name).toBe('c1');
  });

  it('prefers the contig with larger absolute overlap', () => {
    const contigs2 = [
      makeContig('small', 1, 100),
      makeContig('big', 50, 10000),
    ];
    // LCB covers bp 50..200 — overlaps 51bp of 'small' and 151bp of 'big'
    const lcb = makeLcb(1, 200, 50, 200);
    expect(getPrimaryContig(lcb, contigs2)?.name).toBe('big');
  });
});

// ---------------------------------------------------------------------------
// areProximate
// ---------------------------------------------------------------------------

describe('areProximate', () => {
  it('returns true when gap equals MAX_IGNORABLE_DIST', () => {
    // a ends at 100; b starts at 100 + MAX_IGNORABLE_DIST = 150 → gap = 50
    const a = makeLcb(1, 100, 1, 100);
    const b = makeLcb(100 + MAX_IGNORABLE_DIST, 200, 101, 200);
    expect(areProximate(a, b)).toBe(true);
  });

  it('returns false when gap exceeds MAX_IGNORABLE_DIST', () => {
    // a ends at 100; b starts at 100 + MAX_IGNORABLE_DIST + 1 = 151 → gap = 51
    const a = makeLcb(1, 100, 1, 100);
    const b = makeLcb(100 + MAX_IGNORABLE_DIST + 1, 200, 101, 200);
    expect(areProximate(a, b)).toBe(false);
  });

  it('returns true when LCBs overlap in the reference', () => {
    const a = makeLcb(1, 200, 1, 200);
    const b = makeLcb(150, 300, 150, 300);
    expect(areProximate(a, b)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// groupContigs
// ---------------------------------------------------------------------------

describe('groupContigs — basic cases', () => {
  it('returns all contigs in original order when no LCBs', () => {
    const contigs = [makeContig('c1', 1, 1000), makeContig('c2', 1001, 2000)];
    const result = groupContigs([], contigs);

    expect(result.ordered).toEqual(['c1', 'c2']);
    expect(result.toReverse).toHaveLength(0);
    expect(result.conflicted).toHaveLength(0);
  });

  it('returns empty result when no contigs', () => {
    const lcbs = [makeLcb(1, 100, 1, 100)];
    const result = groupContigs(lcbs, []);

    expect(result.ordered).toHaveLength(0);
    expect(result.toReverse).toHaveLength(0);
    expect(result.conflicted).toHaveLength(0);
  });

  it('orders two contigs by reference position', () => {
    const contigs = [
      makeContig('c1', 1, 1000),
      makeContig('c2', 1001, 2000),
    ];
    // In the reference: c2 comes before c1
    const lcbs = [
      makeLcb(1, 1000, 1001, 2000), // ref 1..1000 → draft c2
      makeLcb(1500, 2500, 1, 1000), // ref 1500..2500 → draft c1
    ];
    const result = groupContigs(lcbs, contigs);

    expect(result.ordered).toEqual(['c2', 'c1']);
  });

  it('marks a contig as reversed when LCB is on opposite strand', () => {
    const contigs = [makeContig('c1', 1, 1000)];
    const lcbs = [makeLcb(1, 500, 1000, 1, false)]; // reverse strand
    const result = groupContigs(lcbs, contigs);

    expect(result.toReverse).toContain('c1');
  });

  it('does not mark forward contigs as reversed', () => {
    const contigs = [makeContig('c1', 1, 1000)];
    const lcbs = [makeLcb(1, 500, 1, 500, true)];
    const result = groupContigs(lcbs, contigs);

    expect(result.toReverse).toHaveLength(0);
  });

  it('appends uncovered contigs at the end in original order', () => {
    const contigs = [
      makeContig('covered', 1, 1000),
      makeContig('free1', 1001, 2000),
      makeContig('free2', 2001, 3000),
    ];
    const lcbs = [makeLcb(1, 500, 1, 1000)];
    const result = groupContigs(lcbs, contigs);

    expect(result.ordered).toEqual(['covered', 'free1', 'free2']);
  });
});

describe('groupContigs — grouping and proximity', () => {
  it('groups proximate LCBs into the same reference region', () => {
    const contigs = [
      makeContig('c1', 1, 1000),
      makeContig('c2', 1001, 2000),
    ];
    // c1 aligns near ref 100..500, c2 aligns near ref 540..900
    // gap = 540 - 500 = 40 ≤ MAX_IGNORABLE_DIST → same group
    const lcbs = [
      makeLcb(100, 500, 1, 1000),
      makeLcb(540, 900, 1001, 2000),
    ];
    const result = groupContigs(lcbs, contigs);

    // Both should be in ordered (same group — neither is conflicted)
    expect(result.conflicted).toHaveLength(0);
    expect(result.ordered).toContain('c1');
    expect(result.ordered).toContain('c2');
  });

  it('flags a contig as conflicted when it appears in two non-proximate groups', () => {
    const contigs = [makeContig('ambiguous', 1, 2000)];
    // 'ambiguous' covers both ref regions: 1..100 and 2000..3000 (gap > 50)
    const lcbs = [
      makeLcb(1, 100, 1, 2000),
      makeLcb(2000, 3000, 1, 2000),
    ];
    const result = groupContigs(lcbs, contigs);

    expect(result.conflicted).toContain('ambiguous');
    expect(result.ordered).not.toContain('ambiguous');
  });
});

describe('groupContigs — LCB sorting', () => {
  it('sorts LCBs by reference start before grouping', () => {
    const contigs = [
      makeContig('c1', 1, 1000),
      makeContig('c2', 1001, 2000),
    ];
    // Provide LCBs out of reference order
    const lcbs = [
      makeLcb(1500, 2000, 1001, 2000), // c2 in ref second half
      makeLcb(1, 500, 1, 1000),         // c1 in ref first half
    ];
    const result = groupContigs(lcbs, contigs);

    expect(result.ordered[0]).toBe('c1');
    expect(result.ordered[1]).toBe('c2');
  });
});
