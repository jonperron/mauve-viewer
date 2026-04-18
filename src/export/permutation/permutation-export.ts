import type { Lcb, Genome, XmfaAlignment } from '../import/xmfa/types.ts';
import type { ContigBoundary } from '../annotations/types.ts';
import type { ContigMap } from '../snp/snp-export.ts';

/** A single chromosome's signed permutation values */
export interface PermutationChromosome {
  readonly values: readonly number[];
}

/** Permutation data for one genome */
export interface GenomePermutation {
  readonly genomeIndex: number;
  readonly chromosomes: readonly PermutationChromosome[];
}

/**
 * Filter LCBs to only those present in all selected genomes.
 * An LCB is present in a genome if its left coordinate is non-zero.
 */
export function projectLcbs(
  lcbs: readonly Lcb[],
  genomeIndices: readonly number[],
): readonly Lcb[] {
  return lcbs.filter((lcb) =>
    genomeIndices.every((gi) => lcb.left[gi] !== 0),
  );
}

/**
 * Find which contig a position belongs to.
 * Returns the index of the last contig whose boundary position <= the given position.
 */
function findContigIndex(
  position: number,
  contigs: readonly ContigBoundary[],
): number {
  let idx = 0;
  for (let i = 1; i < contigs.length; i++) {
    if (contigs[i]!.position <= position) {
      idx = i;
    } else {
      break;
    }
  }
  return idx;
}

/**
 * Compute signed permutations for the selected genomes.
 * LCBs are first projected to the selected genome subset, then numbered 1..N
 * in the order they appear in the projected list. For each genome, LCBs are
 * sorted by left position and grouped by contig boundaries.
 *
 * Each LCB produces a signed integer: positive if forward strand, negative if reverse.
 */
export function computePermutations(
  lcbs: readonly Lcb[],
  genomes: readonly Genome[],
  selectedIndices: readonly number[],
  contigMap?: ContigMap,
): readonly GenomePermutation[] {
  const projected = projectLcbs(lcbs, selectedIndices);

  if (projected.length === 0) {
    return selectedIndices.map((gi) => ({
      genomeIndex: gi,
      chromosomes: [],
    }));
  }

  // Build a map from original LCB id to 1-based permutation number
  const lcbNumberMap = new Map<number, number>();
  for (let i = 0; i < projected.length; i++) {
    lcbNumberMap.set(projected[i]!.id, i + 1);
  }

  return selectedIndices.map((gi) => {
    // Sort projected LCBs by left position in this genome
    const sorted = [...projected].sort((a, b) => a.left[gi]! - b.left[gi]!);
    const contigs = contigMap?.get(gi);

    const chromosomes = groupByContigs(sorted, gi, contigs, lcbNumberMap);

    return { genomeIndex: gi, chromosomes };
  });
}

/**
 * Group sorted LCBs by contig boundaries and produce signed permutation values.
 */
function groupByContigs(
  sortedLcbs: readonly Lcb[],
  genomeIndex: number,
  contigs: readonly ContigBoundary[] | undefined,
  lcbNumberMap: ReadonlyMap<number, number>,
): readonly PermutationChromosome[] {
  if (!contigs || contigs.length <= 1) {
    // Single chromosome — all LCBs in one group
    const values = sortedLcbs.map((lcb) => {
      const num = lcbNumberMap.get(lcb.id)!;
      return lcb.reverse[genomeIndex] ? -num : num;
    });
    return values.length > 0 ? [{ values }] : [];
  }

  // Multiple contigs — group LCBs by which contig they belong to
  const groups = new Map<number, number[]>();

  for (const lcb of sortedLcbs) {
    const leftPos = lcb.left[genomeIndex]!;
    const contigIdx = findContigIndex(leftPos, contigs);
    const num = lcbNumberMap.get(lcb.id)!;
    const signedNum = lcb.reverse[genomeIndex] ? -num : num;

    const group = groups.get(contigIdx);
    if (group) {
      group.push(signedNum);
    } else {
      groups.set(contigIdx, [signedNum]);
    }
  }

  // Convert to sorted chromosome array (by contig index order)
  const sortedKeys = [...groups.keys()].sort((a, b) => a - b);
  return sortedKeys.map((key) => ({ values: groups.get(key)! }));
}

/**
 * Format permutation data as a string with header comments and
 * comma-separated signed integers per chromosome, separated by `$`.
 *
 * Compatible with BADGER, GRAPPA, MGR, GRIMM input formats.
 */
export function formatPermutationOutput(
  permutations: readonly GenomePermutation[],
  genomes: readonly Genome[],
  selectedIndices: readonly number[],
): string {
  const lines: string[] = [];

  // Header comments with genome names
  lines.push('# Permutation export');
  for (const gi of selectedIndices) {
    const genome = genomes[gi];
    if (genome) {
      lines.push(`# Genome ${gi}: ${genome.name}`);
    }
  }

  // Permutation lines
  for (const perm of permutations) {
    if (perm.chromosomes.length === 0) continue;

    const chromoStrs = perm.chromosomes.map((chr) =>
      chr.values.join(',') + '$ ',
    );
    lines.push(chromoStrs.join('').trimEnd());
  }

  return lines.join('\n') + '\n';
}

/**
 * Export signed permutations from an XMFA alignment.
 * Returns the formatted string content for file download.
 *
 * @param alignment  The loaded XMFA alignment with LCBs
 * @param selectedGenomeIndices  Optional subset of genome indices to export (default: all)
 * @param contigMap  Optional contig boundaries for chromosome splitting
 */
export function exportPermutations(
  alignment: XmfaAlignment,
  selectedGenomeIndices?: readonly number[],
  contigMap?: ContigMap,
): string {
  const indices = selectedGenomeIndices
    ?? alignment.genomes.map((g) => g.index);

  const permutations = computePermutations(
    alignment.lcbs,
    alignment.genomes,
    indices,
    contigMap,
  );

  return formatPermutationOutput(permutations, alignment.genomes, indices);
}
