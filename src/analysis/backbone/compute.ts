import type { BackboneSegment, GenomeInterval } from '../../import/backbone/types.ts';
import type { Lcb } from '../../import/xmfa/types.ts';

export interface BackboneOptions {
  /** Minimum LCB weight to include (default: 0) */
  readonly minWeight?: number;
  /** Minimum number of genomes an LCB must span (default: all genomes) */
  readonly minMultiplicity?: number;
}

/** Count how many genomes an LCB spans (non-zero coordinates) */
function countMultiplicity(lcb: Lcb, genomeCount: number): number {
  let count = 0;
  for (let gi = 0; gi < genomeCount; gi++) {
    if ((lcb.left[gi] ?? 0) > 0 && (lcb.right[gi] ?? 0) > 0) {
      count++;
    }
  }
  return count;
}

/**
 * Compute backbone segments from LCB data.
 *
 * A backbone segment is a region conserved among genomes.
 * Segments where ALL genomes are present are marked `isBackbone: true`.
 * Segments conserved in a subset (multiplicity < genomeCount) are
 * included when `minMultiplicity` is set below genomeCount.
 */
export function computeBackbone(
  lcbs: readonly Lcb[],
  genomeCount: number,
  options: BackboneOptions = {},
): readonly BackboneSegment[] {
  const { minWeight = 0 } = options;
  const minMult = options.minMultiplicity ?? genomeCount;

  const segments: BackboneSegment[] = [];

  for (const lcb of lcbs) {
    if (lcb.weight < minWeight) continue;

    const multiplicity = countMultiplicity(lcb, genomeCount);
    if (multiplicity < minMult) continue;

    const intervals: GenomeInterval[] = [];
    for (let gi = 0; gi < genomeCount; gi++) {
      const leftEnd = lcb.left[gi] ?? 0;
      const rightEnd = lcb.right[gi] ?? 0;
      intervals.push({ leftEnd, rightEnd });
    }

    segments.push({
      seqIndex: lcb.id,
      intervals,
      isBackbone: multiplicity === genomeCount,
    });
  }

  return segments;
}

/** Get a bitmask representing which genomes are present in a segment */
export function getMultiplicityMask(segment: BackboneSegment): number {
  let mask = 0;
  for (let gi = 0; gi < segment.intervals.length; gi++) {
    const interval = segment.intervals[gi]!;
    if (interval.leftEnd > 0 && interval.rightEnd > 0) {
      mask |= 1 << gi;
    }
  }
  return mask;
}

/** Filter backbone segments by minimum LCB weight */
export function filterByWeight(
  segments: readonly BackboneSegment[],
  lcbs: readonly Lcb[],
  minWeight: number,
): readonly BackboneSegment[] {
  const lcbWeights = new Map(lcbs.map((l) => [l.id, l.weight]));
  return segments.filter((seg) => (lcbWeights.get(seg.seqIndex) ?? 0) >= minWeight);
}

/**
 * Compute non-backbone regions (islands) for a specific genome.
 * Returns intervals not covered by any backbone segment.
 */
export function computeIslands(
  segments: readonly BackboneSegment[],
  genomeIndex: number,
  genomeLength: number,
): readonly GenomeInterval[] {
  const backboneIntervals = segments
    .filter((seg) => seg.isBackbone)
    .map((seg) => seg.intervals[genomeIndex])
    .filter(
      (iv): iv is GenomeInterval =>
        iv !== undefined && iv.leftEnd > 0 && iv.rightEnd > 0,
    )
    .sort((a, b) => a.leftEnd - b.leftEnd);

  const islands: GenomeInterval[] = [];
  let pos = 1;
  for (const iv of backboneIntervals) {
    if (iv.leftEnd > pos) {
      islands.push({ leftEnd: pos, rightEnd: iv.leftEnd - 1 });
    }
    pos = Math.max(pos, iv.rightEnd + 1);
  }
  if (pos <= genomeLength) {
    islands.push({ leftEnd: pos, rightEnd: genomeLength });
  }

  return islands;
}
