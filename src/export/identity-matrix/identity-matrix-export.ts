import type { AlignmentBlock, XmfaAlignment } from '../import/xmfa/types.ts';
import type { BackboneSegment } from '../import/backbone/types.ts';

/** Result of identity matrix computation */
export interface IdentityMatrixResult {
  /** Number of genomes */
  readonly size: number;
  /** N×N divergence matrix (symmetric, 0 on diagonal) */
  readonly values: readonly (readonly number[])[];
}

/**
 * Check if a character is a standard unambiguous base.
 * Fixes legacy Java bug in SnpExporter.getBaseIdx() where A/a mapped to index 0
 * and was then excluded by the `b_i > 0 && b_j > 0` guard, causing all
 * adenine-involving substitutions to be silently dropped.
 */
function isUnambiguousBase(ch: string): boolean {
  return ch === 'a' || ch === 'c' || ch === 'g' || ch === 't';
}

/**
 * Count substitutions between two genomes across all alignment blocks.
 * A substitution is a column where both genomes have different unambiguous bases.
 * Gaps and ambiguity codes are excluded.
 *
 * @param blocks - Alignment blocks from XMFA
 * @param seqIndexI - sequenceIndex of genome I (1-based, matches Genome.index)
 * @param seqIndexJ - sequenceIndex of genome J (1-based, matches Genome.index)
 */
export function countPairwiseSubstitutions(
  blocks: readonly AlignmentBlock[],
  seqIndexI: number,
  seqIndexJ: number,
): number {
  let total = 0;

  for (const block of blocks) {
    const segI = block.segments.find((s) => s.sequenceIndex === seqIndexI);
    const segJ = block.segments.find((s) => s.sequenceIndex === seqIndexJ);
    if (!segI || !segJ) continue;

    const len = Math.min(segI.sequenceData.length, segJ.sequenceData.length);
    for (let col = 0; col < len; col++) {
      const ci = segI.sequenceData[col]!.toLowerCase();
      const cj = segJ.sequenceData[col]!.toLowerCase();
      if (isUnambiguousBase(ci) && isUnambiguousBase(cj) && ci !== cj) {
        total++;
      }
    }
  }

  return total;
}

/**
 * Compute shared backbone length between two genomes.
 * Sums the interval length (rightEnd - leftEnd + 1) of backbone segments
 * where both genomes participate (have non-zero intervals).
 * Uses genome I's interval for the length value.
 *
 * @param backbone - Parsed backbone segments
 * @param genomeI - 0-based genome array index
 * @param genomeJ - 0-based genome array index
 */
export function computeSharedBackboneLength(
  backbone: readonly BackboneSegment[],
  genomeI: number,
  genomeJ: number,
): number {
  let total = 0;

  for (const seg of backbone) {
    const intI = seg.intervals[genomeI];
    const intJ = seg.intervals[genomeJ];
    if (!intI || !intJ) continue;
    if (intI.leftEnd <= 0 || intI.rightEnd <= 0) continue;
    if (intJ.leftEnd <= 0 || intJ.rightEnd <= 0) continue;
    total += intI.rightEnd - intI.leftEnd + 1;
  }

  return total;
}

/**
 * Compute the identity matrix (pairwise divergence) for all genome pairs.
 * Each value represents substitution divergence: substitutions / shared_backbone_length.
 * 0 = identical, higher = more divergent.
 *
 * Matches legacy Java IdentityMatrix behavior: counts substitutions via aligned columns,
 * normalizes by shared backbone length.
 */
export function computeIdentityMatrix(
  alignment: XmfaAlignment,
  backbone: readonly BackboneSegment[],
): IdentityMatrixResult {
  const { genomes, blocks } = alignment;
  const n = genomes.length;

  const values: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(0),
  );

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const subs = countPairwiseSubstitutions(blocks, genomes[i]!.index, genomes[j]!.index);
      const sharedLen = computeSharedBackboneLength(backbone, i, j);
      // Zero shared backbone length means no comparable region exists between
      // the pair. Report as 0 rather than NaN since the export button is only
      // shown when backbone data is present, making this edge case unlikely.
      const divergence = sharedLen > 0 ? subs / sharedLen : 0;
      values[i]![j] = divergence;
      values[j]![i] = divergence;
    }
  }

  return { size: n, values };
}

/**
 * Format the identity matrix as a tab-delimited string.
 * Upper-triangular format matching legacy Java output:
 * - Diagonal and lower triangle are empty
 * - Upper triangle contains divergence values
 * - Rows separated by newlines, columns by tabs
 */
export function formatIdentityMatrix(
  result: IdentityMatrixResult,
): string {
  const { size, values } = result;
  const lines: string[] = [];

  for (let i = 0; i < size; i++) {
    const parts: string[] = [];
    for (let j = 0; j < size; j++) {
      if (j <= i) {
        parts.push('');
      } else {
        parts.push(String(values[i]![j]!));
      }
    }
    lines.push(parts.join('\t'));
  }

  return lines.join('\n') + '\n';
}

/**
 * Export identity matrix from alignment and backbone data.
 * Returns tab-delimited matrix content ready for file download.
 */
export function exportIdentityMatrix(
  alignment: XmfaAlignment,
  backbone: readonly BackboneSegment[],
): string {
  const result = computeIdentityMatrix(alignment, backbone);
  return formatIdentityMatrix(result);
}
