/**
 * Structural metrics for assembly quality scoring.
 *
 * Computes rearrangement distances and adjacency errors by comparing
 * a draft assembly to a reference genome using XMFA alignment data.
 */
import type { XmfaAlignment, Lcb } from '../import/xmfa/types.ts';
import type { DistanceResult } from '../analysis/dcj/types.ts';
import { computeDistanceMatrixFromLcbs } from '../analysis/dcj/distance.ts';

/** Structural metrics derived from aligning a draft assembly to a reference genome */
export interface StructuralMetrics {
  /** Number of contigs in the draft assembly */
  readonly contigCount: number;
  /** Number of chromosomes / replicons in the reference */
  readonly repliconCount: number;
  /** Total bases in the draft assembly */
  readonly assemblyBases: number;
  /** Total bases in the reference genome */
  readonly referenceBases: number;
  /** DCJ, breakpoint, and SCJ distances between reference and assembly */
  readonly distances: DistanceResult;
  /**
   * Type I adjacency errors (false positive joins):
   * pairs of consecutive assembly blocks that are NOT neighbors in the reference.
   */
  readonly typeIErrors: number;
  /**
   * Type II adjacency errors (wrong orientation):
   * pairs of consecutive assembly blocks that ARE neighbors in the reference
   * but whose relative orientation is inconsistent (one block is inverted in
   * the assembly relative to the reference while the adjacent block is not).
   */
  readonly typeIIErrors: number;
}

const ZERO_DISTANCES: DistanceResult = { dcj: 0, breakpoint: 0, scj: 0, blocks: 0 };

function emptyMetrics(): StructuralMetrics {
  return {
    contigCount: 0,
    repliconCount: 0,
    assemblyBases: 0,
    referenceBases: 0,
    distances: ZERO_DISTANCES,
    typeIErrors: 0,
    typeIIErrors: 0,
  };
}

/**
 * Compute structural metrics from a scored alignment.
 *
 * In a scoring alignment the reference occupies genome index `refGenomeIdx`
 * (default 0) and the remaining genomes represent draft assembly contigs.
 *
 * @param alignment     - Parsed XMFA alignment of reference vs assembly.
 * @param refGenomeIdx  - 0-based index of the reference genome (default: 0).
 */
export function computeStructuralMetrics(
  alignment: XmfaAlignment,
  refGenomeIdx = 0,
): StructuralMetrics {
  const { genomes, lcbs } = alignment;

  if (genomes.length < 2) {
    return emptyMetrics();
  }

  // The reference is one genome; all others are draft assembly contigs.
  const refGenome = genomes[refGenomeIdx];
  const asmGenomes = genomes.filter((_, i) => i !== refGenomeIdx);

  const repliconCount = 1;
  const contigCount = asmGenomes.length;
  const referenceBases = refGenome?.length ?? 0;
  const assemblyBases = asmGenomes.reduce((sum, g) => sum + g.length, 0);

  // Identify the assembly genome index for pairwise distance and adjacency.
  // In a 2-genome alignment this is simply the other genome.
  const asmGenomeIdx = genomes.findIndex((_, i) => i !== refGenomeIdx);

  // Rearrangement distances via permutation comparison.
  const genomeLabels = genomes.map((g) => g.name);
  const distMatrix = computeDistanceMatrixFromLcbs(lcbs, genomes.length, genomeLabels);
  const distances: DistanceResult =
    distMatrix.distances[refGenomeIdx]?.[asmGenomeIdx] ?? ZERO_DISTANCES;

  // Adjacency errors between reference and first assembly contig.
  const { typeIErrors, typeIIErrors } = computeAdjacencyErrors(
    lcbs,
    refGenomeIdx,
    asmGenomeIdx,
  );

  return {
    contigCount,
    repliconCount,
    assemblyBases,
    referenceBases,
    distances,
    typeIErrors,
    typeIIErrors,
  };
}

/**
 * Count Type I and Type II adjacency errors between two genomes.
 *
 * Only LCBs present in both genomes (non-zero left coordinate) are considered.
 *
 * Type I  — wrong neighbor: consecutive blocks in assembly order whose
 * reference ranks are not consecutive (|Δrank| ≠ 1).
 *
 * Type II — wrong orientation: consecutive blocks in assembly order that ARE
 * reference-neighbors (|Δrank| = 1) but have inconsistent net inversions —
 * i.e. one block's strand changed between reference and assembly while the
 * adjacent block's strand did not.
 */
function computeAdjacencyErrors(
  lcbs: readonly Lcb[],
  refGenomeIdx: number,
  asmGenomeIdx: number,
): { readonly typeIErrors: number; readonly typeIIErrors: number } {
  // Filter to blocks present in both genomes.
  const shared = lcbs.filter(
    (lcb) =>
      (lcb.left[refGenomeIdx] ?? 0) > 0 &&
      (lcb.left[asmGenomeIdx] ?? 0) > 0,
  );

  if (shared.length < 2) {
    return { typeIErrors: 0, typeIIErrors: 0 };
  }

  // Assign reference rank: sort by position in the reference genome.
  const refSorted = [...shared].sort(
    (a, b) => (a.left[refGenomeIdx] ?? 0) - (b.left[refGenomeIdx] ?? 0),
  );
  const refRank = new Map<number, number>(refSorted.map((lcb, i) => [lcb.id, i]));

  // Sort by assembly position to identify assembly-adjacent pairs.
  const asmSorted = [...shared].sort(
    (a, b) => (a.left[asmGenomeIdx] ?? 0) - (b.left[asmGenomeIdx] ?? 0),
  );

  let typeIErrors = 0;
  let typeIIErrors = 0;

  for (let i = 0; i < asmSorted.length - 1; i++) {
    const a = asmSorted[i]!;
    const b = asmSorted[i + 1]!;

    const rankA = refRank.get(a.id)!;
    const rankB = refRank.get(b.id)!;
    const refDiff = rankB - rankA;

    if (Math.abs(refDiff) !== 1) {
      // Not consecutive in the reference → Type I (wrong neighbor).
      typeIErrors++;
    } else {
      // Consecutive in the reference → check relative orientation.
      //
      // Net inversion: true when a block's strand changed between the
      // reference genome and the assembly genome.
      const netInvA =
        (a.reverse[refGenomeIdx] ?? false) !== (a.reverse[asmGenomeIdx] ?? false);
      const netInvB =
        (b.reverse[refGenomeIdx] ?? false) !== (b.reverse[asmGenomeIdx] ?? false);

      // Inconsistent inversion states → Type II (wrong orientation).
      if (netInvA !== netInvB) {
        typeIIErrors++;
      }
    }
  }

  return { typeIErrors, typeIIErrors };
}
