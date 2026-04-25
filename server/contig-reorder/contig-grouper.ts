/**
 * Contig grouping for Mauve Contig Mover (MCM).
 *
 * Groups draft genome contigs based on their alignment to a reference genome.
 * Two LCBs are "proximate" in the reference if their boundaries are within
 * MAX_IGNORABLE_DIST (50) bases. A contig must have at least MIN_LENGTH_RATIO
 * (0.01) of its length covered by an LCB to be considered solidly placed on it.
 *
 * Mirrors: org.gel.mauve.contigs.ContigGrouper and ContigReorderer
 *
 * Constants from org.gel.mauve.contigs.ContigReorderer:
 *   MAX_IGNORABLE_DIST = 50
 *   MIN_LENGTH_RATIO   = 0.01
 */

/** Maximum distance (in reference coordinates) between proximate LCBs */
export const MAX_IGNORABLE_DIST = 50;

/** Minimum fraction of contig length that must be covered by an LCB */
export const MIN_LENGTH_RATIO = 0.01;

/** A contig (chromosome) in the draft genome */
export interface ContigInfo {
  readonly name: string;
  /** 1-based start coordinate in the draft genome */
  readonly start: number;
  /** 1-based end coordinate in the draft genome (inclusive) */
  readonly end: number;
}

/** An LCB segment expressed in both reference and draft coordinate systems */
export interface LcbSegment {
  /** Start coordinate in the reference genome (1-based) */
  readonly referenceStart: number;
  /** End coordinate in the reference genome (1-based, inclusive) */
  readonly referenceEnd: number;
  /** Start coordinate in the draft genome (1-based) */
  readonly draftStart: number;
  /** End coordinate in the draft genome (1-based, inclusive) */
  readonly draftEnd: number;
  /** true = same strand as reference; false = reverse complement */
  readonly forward: boolean;
  /** Total alignment columns (weight) */
  readonly weight: number;
}

/** Result of contig grouping */
export interface ContigGroupingResult {
  /**
   * Contig names that should be reversed relative to the draft input orientation.
   * These contigs aligned to the reference in the opposite strand.
   */
  readonly toReverse: readonly string[];
  /**
   * All non-conflicted contig names in reference-based order.
   * Contigs not covered by any LCB are appended at the end in their original order.
   */
  readonly ordered: readonly string[];
  /**
   * Contig names with ambiguous reference placement
   * (appeared solidly in multiple distinct reference regions).
   */
  readonly conflicted: readonly string[];
}

/** Compute the overlap length between interval [a1, a2] and [b1, b2] */
function overlapLength(a1: number, a2: number, b1: number, b2: number): number {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1) + 1);
}

/**
 * Determine which contig an LCB primarily covers in the draft genome.
 *
 * The overlap between the LCB and the contig must be at least MIN_LENGTH_RATIO
 * of the contig's length (mirrors the "solidly on contig" check in ContigGrouper).
 *
 * Returns the contig with the largest qualifying overlap, or undefined if none.
 */
export function getPrimaryContig(
  lcb: LcbSegment,
  contigs: readonly ContigInfo[],
): ContigInfo | undefined {
  const lcbStart = Math.min(lcb.draftStart, lcb.draftEnd);
  const lcbEnd = Math.max(lcb.draftStart, lcb.draftEnd);

  let best: ContigInfo | undefined;
  let bestOverlap = 0;

  for (const contig of contigs) {
    const contigLength = contig.end - contig.start + 1;
    const overlap = overlapLength(lcbStart, lcbEnd, contig.start, contig.end);
    if (overlap === 0) continue;

    const fractionOfContig = overlap / contigLength;
    if (fractionOfContig >= MIN_LENGTH_RATIO && overlap > bestOverlap) {
      bestOverlap = overlap;
      best = contig;
    }
  }

  return best;
}

/**
 * Determine whether two LCBs are proximate in the reference genome.
 *
 * Two LCBs are proximate when the gap between the end of the first and the
 * start of the second is at most MAX_IGNORABLE_DIST bases, meaning they
 * likely cover the same region and should be grouped together.
 *
 * Assumes lcbA.referenceStart <= lcbB.referenceStart.
 */
export function areProximate(lcbA: LcbSegment, lcbB: LcbSegment): boolean {
  return lcbB.referenceStart - lcbA.referenceEnd <= MAX_IGNORABLE_DIST;
}

/**
 * Group draft genome contigs based on their reference alignment positions.
 *
 * Algorithm:
 * 1. Sort LCBs by reference start position.
 * 2. Walk sorted LCBs; start a new group whenever two consecutive LCBs are
 *    not proximate (gap > MAX_IGNORABLE_DIST).
 * 3. For each LCB, identify the draft contig it primarily covers.
 * 4. Assign each contig to a reference group and track its strand orientation.
 * 5. A contig seen solidly in more than one non-proximate group is conflicted.
 * 6. Order non-conflicted contigs by their representative reference midpoint.
 * 7. Contigs not covered by any LCB are appended at the end in original order.
 * 8. Reversed contigs are those whose majority strand is reverse complement.
 *
 * @param lcbs    LCBs from a two-genome (reference + draft) alignment
 * @param contigs Contigs of the draft genome in their current order
 */
export function groupContigs(
  lcbs: readonly LcbSegment[],
  contigs: readonly ContigInfo[],
): ContigGroupingResult {
  if (lcbs.length === 0 || contigs.length === 0) {
    return {
      toReverse: [],
      ordered: contigs.map((c) => c.name),
      conflicted: [],
    };
  }

  // Sort LCBs by reference start position
  const sorted = [...lcbs].sort(
    (a, b) => a.referenceStart - b.referenceStart,
  );

  // Track the reference midpoint assigned to each contig for ordering
  const contigRefMidpoint = new Map<string, number>();
  // Track orientation: true = forward, false = reverse complement
  const contigForward = new Map<string, boolean>();
  // Track which group index each contig was first assigned to
  const contigGroup = new Map<string, number>();

  const conflicted = new Set<string>();

  let groupIndex = 0;
  let prevLcb: LcbSegment | undefined;

  for (const lcb of sorted) {
    if (prevLcb !== undefined && !areProximate(prevLcb, lcb)) {
      groupIndex++;
    }
    prevLcb = lcb;

    const contig = getPrimaryContig(lcb, contigs);
    if (contig === undefined) continue;

    const existingGroup = contigGroup.get(contig.name);
    if (existingGroup !== undefined && existingGroup !== groupIndex) {
      // Contig appears solidly in two distinct reference regions → conflict
      conflicted.add(contig.name);
      contigRefMidpoint.delete(contig.name);
      contigForward.delete(contig.name);
    } else if (!conflicted.has(contig.name)) {
      contigGroup.set(contig.name, groupIndex);

      // Use the reference midpoint as the sort key; keep the earliest if multiple
      const refMid = (lcb.referenceStart + lcb.referenceEnd) / 2;
      const existing = contigRefMidpoint.get(contig.name);
      if (existing === undefined || refMid < existing) {
        contigRefMidpoint.set(contig.name, refMid);
      }

      // First assignment wins for orientation
      if (!contigForward.has(contig.name)) {
        contigForward.set(contig.name, lcb.forward);
      }
    }
  }

  // Build ordered list from non-conflicted, covered contigs sorted by refMid
  const coveredNames = [...contigRefMidpoint.keys()];
  coveredNames.sort((a, b) => (contigRefMidpoint.get(a) ?? 0) - (contigRefMidpoint.get(b) ?? 0));

  // Append uncovered contigs at end, preserving original order
  const coveredSet = new Set(coveredNames);
  const uncovered = contigs
    .filter((c) => !coveredSet.has(c.name) && !conflicted.has(c.name))
    .map((c) => c.name);

  const ordered = [...coveredNames, ...uncovered];

  // Contigs to reverse: those assigned reverse complement orientation
  const toReverse = coveredNames.filter((name) => !(contigForward.get(name) ?? true));

  return {
    toReverse,
    ordered,
    conflicted: [...conflicted],
  };
}
