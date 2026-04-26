/**
 * Contig size statistics for assembly quality scoring.
 *
 * Computes N50, N90, minimum contig length, maximum contig length, and the
 * full length distribution from an XMFA alignment in which one genome is the
 * reference and the remaining genomes are draft assembly contigs.
 */
import type { XmfaAlignment } from '../import/xmfa/types.ts';

/** Contig size statistics derived from the draft assembly genomes */
export interface ContigStats {
  /**
   * N50: the minimum contig length L such that contigs of length ≥ L together
   * account for at least 50% of the total assembly bases.
   * 0 when the assembly contains no bases.
   */
  readonly n50: number;
  /**
   * N90: the minimum contig length L such that contigs of length ≥ L together
   * account for at least 90% of the total assembly bases.
   * 0 when the assembly contains no bases.
   */
  readonly n90: number;
  /** Shortest contig in the assembly. 0 when the assembly is empty. */
  readonly minLength: number;
  /** Longest contig in the assembly. 0 when the assembly is empty. */
  readonly maxLength: number;
  /**
   * Contig lengths sorted in ascending order.
   * Empty when there are no assembly contigs.
   */
  readonly lengthDistribution: readonly number[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Return the minimum contig length needed so that contigs of that length or
 * longer together cover at least `targetFraction` of `totalBases`.
 *
 * `sortedDesc` must be sorted in descending order.
 * Returns 0 when `totalBases` is 0.
 */
function computeNx(sortedDesc: readonly number[], totalBases: number, targetFraction: number): number {
  if (totalBases === 0) return 0;
  const threshold = totalBases * targetFraction;
  let cumulative = 0;
  for (const len of sortedDesc) {
    cumulative += len;
    if (cumulative >= threshold) return len;
  }
  return sortedDesc[sortedDesc.length - 1] ?? 0;
}

const EMPTY_STATS: ContigStats = {
  n50: 0,
  n90: 0,
  minLength: 0,
  maxLength: 0,
  lengthDistribution: [],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute contig size statistics from a scoring alignment.
 *
 * The reference genome is identified by `refGenomeIdx` (default: 0).
 * All other genomes are treated as draft assembly contigs.
 *
 * @param alignment    - Parsed XMFA alignment of reference vs assembly.
 * @param refGenomeIdx - 0-based index of the reference genome (default: 0).
 */
export function computeContigStats(alignment: XmfaAlignment, refGenomeIdx = 0): ContigStats {
  const { genomes } = alignment;

  if (genomes.length < 2) {
    return EMPTY_STATS;
  }

  const contigLengths = genomes
    .filter((_, i) => i !== refGenomeIdx)
    .map((g) => g.length);

  const totalBases = contigLengths.reduce((s, l) => s + l, 0);

  if (totalBases === 0) {
    const sorted = [...contigLengths].sort((a, b) => a - b);
    return {
      n50: 0,
      n90: 0,
      minLength: sorted[0] ?? 0,
      maxLength: sorted[sorted.length - 1] ?? 0,
      lengthDistribution: sorted,
    };
  }

  // Sort ascending for the distribution; descending for Nx computation.
  const sortedAsc = [...contigLengths].sort((a, b) => a - b);
  const sortedDesc = [...sortedAsc].reverse();

  return {
    n50: computeNx(sortedDesc, totalBases, 0.5),
    n90: computeNx(sortedDesc, totalBases, 0.9),
    minLength: sortedAsc[0] ?? 0,
    maxLength: sortedAsc[sortedAsc.length - 1] ?? 0,
    lengthDistribution: sortedAsc,
  };
}
