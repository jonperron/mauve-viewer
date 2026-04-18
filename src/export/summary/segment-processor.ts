import type { BackboneSegment } from '../../import/backbone/types.ts';
import type { Lcb, Genome } from '../../import/xmfa/types.ts';
import type {
  SummarySegment,
  SummaryInterval,
  ProcessedSegmentData,
} from './types.ts';

// ── Multiplicity helpers ─────────────────────────────────────────────────────

/** Compute bitmask for a single genome (MSB = genome 0) */
export function genomeToMask(genomeIndex: number, genomeCount: number): number {
  return 1 << (genomeCount - genomeIndex - 1);
}

/** Compute all-genomes bitmask */
export function allGenomesMask(genomeCount: number): number {
  return (1 << genomeCount) - 1;
}

/** Compute multiplicity bitmask for a backbone segment */
function computeMask(segment: BackboneSegment, genomeCount: number): number {
  let mask = 0;
  for (let gi = 0; gi < genomeCount; gi++) {
    const iv = segment.intervals[gi];
    if (iv !== undefined && iv.leftEnd > 0 && iv.rightEnd > 0) {
      mask |= genomeToMask(gi, genomeCount);
    }
  }
  return mask;
}

/** Human-readable multiplicity label: binary string e.g. "110" */
export function multiplicityLabel(mask: number, genomeCount: number): string {
  let label = '';
  for (let i = 0; i < genomeCount; i++) {
    label += (mask & genomeToMask(i, genomeCount)) !== 0 ? '1' : '0';
  }
  return label;
}

// ── Reference genome detection ───────────────────────────────────────────────

/** Find the reference genome: one with no reversed backbone segments */
function findReferenceGenome(
  backboneSegments: readonly BackboneSegment[],
  lcbs: readonly Lcb[],
  genomeCount: number,
): number {
  const lcbMap = new Map(lcbs.map((l) => [l.id, l]));
  const hasReverse = new Array<boolean>(genomeCount).fill(false);

  for (const bs of backboneSegments) {
    const lcb = lcbMap.get(bs.seqIndex);
    if (lcb === undefined) continue;
    for (let gi = 0; gi < genomeCount; gi++) {
      if (lcb.reverse[gi] === true) {
        hasReverse[gi] = true;
      }
    }
  }

  // Pick last genome that never has reverse; fallback to 0
  let ref = 0;
  for (let gi = 0; gi < genomeCount; gi++) {
    if (!hasReverse[gi]) {
      ref = gi;
    }
  }
  return ref;
}

// ── Build per-genome segment chains ──────────────────────────────────────────

/** Intermediate segment before ID assignment */
interface PreSegment {
  readonly intervals: readonly SummaryInterval[];
  readonly multiplicityMask: number;
  readonly backboneId?: number;
}

/**
 * Build a per-genome ordered chain of segments (backbone + islands) for one genome.
 * Backbone segments present in this genome are sorted by left position;
 * island segments are inserted to fill gaps.
 */
function buildGenomeChain(
  backboneSegments: readonly BackboneSegment[],
  lcbMap: ReadonlyMap<number, Lcb>,
  genomeIndex: number,
  genomeCount: number,
  genomeLength: number,
): readonly PreSegment[] {
  // Filter backbone segments present in this genome, sorted by leftEnd
  const present = backboneSegments
    .filter((bs) => {
      const iv = bs.intervals[genomeIndex];
      return iv !== undefined && iv.leftEnd > 0 && iv.rightEnd > 0;
    })
    .sort((a, b) => {
      const aLeft = a.intervals[genomeIndex]!.leftEnd;
      const bLeft = b.intervals[genomeIndex]!.leftEnd;
      return aLeft - bLeft;
    });

  const chain: PreSegment[] = [];
  let pos = 1;

  for (const bs of present) {
    const iv = bs.intervals[genomeIndex]!;
    const lcb = lcbMap.get(bs.seqIndex);

    // Insert island before this backbone segment if there's a gap
    if (iv.leftEnd > pos) {
      chain.push(makeIslandSegment(genomeIndex, genomeCount, pos, iv.leftEnd - 1));
    }

    // Add backbone segment with full per-genome intervals
    const intervals: SummaryInterval[] = [];
    for (let gi = 0; gi < genomeCount; gi++) {
      const bsIv = bs.intervals[gi];
      intervals.push({
        leftEnd: bsIv?.leftEnd ?? 0,
        rightEnd: bsIv?.rightEnd ?? 0,
        reverse: lcb?.reverse[gi] ?? false,
      });
    }

    chain.push({
      intervals,
      multiplicityMask: computeMask(bs, genomeCount),
      backboneId: bs.seqIndex,
    });

    pos = Math.max(pos, iv.rightEnd + 1);
  }

  // Trailing island
  if (pos <= genomeLength) {
    chain.push(makeIslandSegment(genomeIndex, genomeCount, pos, genomeLength));
  }

  return chain;
}

/** Create an island segment for a single genome */
function makeIslandSegment(
  genomeIndex: number,
  genomeCount: number,
  left: number,
  right: number,
): PreSegment {
  const intervals: SummaryInterval[] = [];
  for (let gi = 0; gi < genomeCount; gi++) {
    intervals.push(
      gi === genomeIndex
        ? { leftEnd: left, rightEnd: right, reverse: false }
        : { leftEnd: 0, rightEnd: 0, reverse: false },
    );
  }
  return {
    intervals,
    multiplicityMask: genomeToMask(genomeIndex, genomeCount),
  };
}

// ── ID assignment ────────────────────────────────────────────────────────────

/**
 * Walk all genome chains and assign typed IDs.
 * Backbone segments shared across genomes get their ID from the first encounter.
 * ID format: b_N (all genomes), i_N (single genome), b_i_N (subset).
 */
function assignIds(
  chains: readonly (readonly PreSegment[])[],
  genomeCount: number,
): readonly (readonly SummarySegment[])[] {
  const allMask = allGenomesMask(genomeCount);
  const idMap = new Map<number, string>(); // backboneId → typedId
  let counter = 1;

  const result: SummarySegment[][] = [];

  for (let gi = 0; gi < genomeCount; gi++) {
    const chain = chains[gi] ?? [];
    const genMask = genomeToMask(gi, genomeCount);
    const assigned: SummarySegment[] = [];

    for (const seg of chain) {
      let typedId: string;

      if (seg.backboneId !== undefined && idMap.has(seg.backboneId)) {
        typedId = idMap.get(seg.backboneId)!;
      } else {
        const prefix =
          seg.multiplicityMask === allMask
            ? 'b_'
            : seg.multiplicityMask === genMask
              ? 'i_'
              : 'b_i_';
        typedId = `${prefix}${counter++}`;
        if (seg.backboneId !== undefined) {
          idMap.set(seg.backboneId, typedId);
        }
      }

      assigned.push({
        intervals: seg.intervals,
        multiplicityMask: seg.multiplicityMask,
        typedId,
        backboneId: seg.backboneId,
      });
    }

    result.push(assigned);
  }

  return result;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Process backbone segments into summary chains with islands and typed IDs.
 */
export function processSegments(
  backboneSegments: readonly BackboneSegment[],
  lcbs: readonly Lcb[],
  genomes: readonly Genome[],
): ProcessedSegmentData {
  const genomeCount = genomes.length;
  const lcbMap = new Map(lcbs.map((l) => [l.id, l]));

  // Build per-genome chains (unassigned IDs)
  const preChains: PreSegment[][] = [];
  for (let gi = 0; gi < genomeCount; gi++) {
    const length = genomes[gi]?.length ?? 0;
    preChains.push([...buildGenomeChain(backboneSegments, lcbMap, gi, genomeCount, length)]);
  }

  // Assign typed IDs
  const chains = assignIds(preChains, genomeCount);

  // Collect all unique segments
  const seen = new Set<string>();
  const allSegments: SummarySegment[] = [];
  for (const chain of chains) {
    for (const seg of chain) {
      if (!seen.has(seg.typedId)) {
        seen.add(seg.typedId);
        allSegments.push(seg);
      }
    }
  }

  const referenceGenome = findReferenceGenome(backboneSegments, lcbs, genomeCount);

  return { allSegments, chains, referenceGenome };
}
