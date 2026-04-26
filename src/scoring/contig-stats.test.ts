import { describe, it, expect } from 'vitest';
import { computeContigStats } from './contig-stats.ts';
import type { XmfaAlignment } from '../import/xmfa/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAlignment(
  genomeLengths: number[],
): XmfaAlignment {
  const genomes = genomeLengths.map((len, i) => ({
    index: i,
    name: `genome${i}`,
    length: len,
    format: 'fasta',
  }));
  return {
    header: { formatVersion: '1', sequenceCount: genomeLengths.length, sequenceEntries: [] },
    blocks: [],
    lcbs: [],
    genomes,
  };
}

// ---------------------------------------------------------------------------
// Tests — empty / edge cases
// ---------------------------------------------------------------------------

describe('computeContigStats', () => {
  it('returns zero stats for an alignment with fewer than 2 genomes', () => {
    const alignment = makeAlignment([1000]);
    const stats = computeContigStats(alignment);
    expect(stats.n50).toBe(0);
    expect(stats.n90).toBe(0);
    expect(stats.minLength).toBe(0);
    expect(stats.maxLength).toBe(0);
    expect(stats.lengthDistribution).toEqual([]);
  });

  it('returns zero stats for an alignment with exactly 1 assembly contig of length 0', () => {
    const alignment = makeAlignment([500, 0]);
    const stats = computeContigStats(alignment);
    expect(stats.n50).toBe(0);
    expect(stats.n90).toBe(0);
    expect(stats.minLength).toBe(0);
    expect(stats.maxLength).toBe(0);
    expect(stats.lengthDistribution).toEqual([0]);
  });

  // ---------------------------------------------------------------------------
  // N50 / N90 — single contig
  // ---------------------------------------------------------------------------

  it('returns the contig length as both N50 and N90 for a single-contig assembly', () => {
    const alignment = makeAlignment([1000, 5000]);
    const stats = computeContigStats(alignment);
    expect(stats.n50).toBe(5000);
    expect(stats.n90).toBe(5000);
    expect(stats.minLength).toBe(5000);
    expect(stats.maxLength).toBe(5000);
    expect(stats.lengthDistribution).toEqual([5000]);
  });

  // ---------------------------------------------------------------------------
  // N50 — two equal contigs
  // ---------------------------------------------------------------------------

  it('N50 equals the common length when two equal contigs together reach 50% of total', () => {
    // two contigs of 1000 bp each — total 2000.
    // Sorted desc: [1000, 1000]. After first: cum=1000 >= 2000*0.5 → N50=1000.
    const alignment = makeAlignment([500, 1000, 1000]);
    const stats = computeContigStats(alignment);
    expect(stats.n50).toBe(1000);
    expect(stats.n90).toBe(1000);
  });

  // ---------------------------------------------------------------------------
  // N50 computation — classic example
  // ---------------------------------------------------------------------------

  it('computes N50 correctly for a classic set of contig lengths', () => {
    // Contigs: 100, 200, 300, 400, 500 — total = 1500
    // Sorted desc: 500, 400, 300, 200, 100
    // cum after 500 = 500 (< 750)
    // cum after 400 = 900 (>= 750) → N50 = 400
    const alignment = makeAlignment([0, 100, 200, 300, 400, 500]); // genome 0 = ref
    const stats = computeContigStats(alignment);
    expect(stats.n50).toBe(400);
  });

  it('computes N90 correctly for a classic set of contig lengths', () => {
    // Contigs: 100, 200, 300, 400, 500 — total = 1500, 90% = 1350
    // Sorted desc: 500, 400, 300, 200, 100
    // cum 500=500, +400=900, +300=1200, +200=1400 >= 1350 → N90 = 200
    const alignment = makeAlignment([0, 100, 200, 300, 400, 500]);
    const stats = computeContigStats(alignment);
    expect(stats.n90).toBe(200);
  });

  // ---------------------------------------------------------------------------
  // Min / max contig lengths
  // ---------------------------------------------------------------------------

  it('returns correct min and max contig lengths', () => {
    const alignment = makeAlignment([0, 50, 800, 300, 1200]);
    const stats = computeContigStats(alignment);
    expect(stats.minLength).toBe(50);
    expect(stats.maxLength).toBe(1200);
  });

  // ---------------------------------------------------------------------------
  // Length distribution
  // ---------------------------------------------------------------------------

  it('length distribution is sorted in ascending order', () => {
    const alignment = makeAlignment([0, 500, 100, 300, 200]);
    const stats = computeContigStats(alignment);
    expect(stats.lengthDistribution).toEqual([100, 200, 300, 500]);
  });

  // ---------------------------------------------------------------------------
  // Custom reference index
  // ---------------------------------------------------------------------------

  it('respects refGenomeIdx to exclude a non-zero reference', () => {
    // genome 0 = contig 400, genome 1 = reference, genome 2 = contig 600
    // assembly contigs = [400, 600], total = 1000
    // N50: sorted desc [600, 400]; cum 600 >= 500 → N50 = 600
    const alignment = makeAlignment([400, 1000, 600]);
    const stats = computeContigStats(alignment, 1);
    expect(stats.n50).toBe(600);
    expect(stats.minLength).toBe(400);
    expect(stats.maxLength).toBe(600);
    expect(stats.lengthDistribution).toEqual([400, 600]);
  });

  // ---------------------------------------------------------------------------
  // Multi-contig assembly (larger example)
  // ---------------------------------------------------------------------------

  it('handles a multi-contig assembly correctly', () => {
    // 5 assembly contigs: 1000, 2000, 3000, 4000, 5000 → total = 15000
    // Sorted desc: 5000, 4000, 3000, 2000, 1000
    // N50: cum 5000 < 7500; cum 5000+4000=9000 >= 7500 → N50 = 4000
    // N90: 90% of 15000 = 13500
    //      cum: 5000, 9000, 12000, 14000 >= 13500 → N90 = 2000
    const alignment = makeAlignment([99999, 1000, 2000, 3000, 4000, 5000]);
    const stats = computeContigStats(alignment);
    expect(stats.n50).toBe(4000);
    expect(stats.n90).toBe(2000);
    expect(stats.minLength).toBe(1000);
    expect(stats.maxLength).toBe(5000);
    expect(stats.lengthDistribution).toEqual([1000, 2000, 3000, 4000, 5000]);
  });
});
