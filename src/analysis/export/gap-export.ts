import type { XmfaAlignment, AlignmentBlock, AlignedSegment, Genome } from '../../xmfa/types.ts';
import type { ContigMap } from './snp-export.ts';
import { resolveContig } from './snp-export.ts';

/** A single gap record with position and length data */
export interface GapRecord {
  readonly genomeIndex: number;
  readonly contigName: string;
  readonly positionInContig: number;
  readonly genomeWidePosition: number;
  readonly length: number;
}

/**
 * Build a mapping from sequenceIndex to genome array index for fast lookups.
 */
function buildSequenceIndexMap(genomes: readonly Genome[]): ReadonlyMap<number, number> {
  const map = new Map<number, number>();
  for (let i = 0; i < genomes.length; i++) {
    map.set(genomes[i]!.index, i);
  }
  return map;
}

/**
 * Compute the genomic position array for non-gap characters in a segment.
 * Returns an array where positions[col] is the genome-wide position for non-gap
 * characters, or 0 for gap characters.
 */
function computePositions(segment: AlignedSegment): readonly number[] {
  const seqData = segment.sequenceData;
  const positions = new Array<number>(seqData.length).fill(0);
  let offset = 0;
  for (let col = 0; col < seqData.length; col++) {
    if (seqData[col] !== '-') {
      positions[col] = segment.strand === '+'
        ? segment.start + offset
        : segment.end - offset;
      offset++;
    }
  }
  return positions;
}

/**
 * Extract all intra-block gaps from an XMFA alignment.
 * Scans each segment's sequence data for runs of '-' characters.
 */
export function extractGaps(
  alignment: XmfaAlignment,
  contigMap?: ContigMap,
): readonly GapRecord[] {
  const { genomes, blocks } = alignment;
  const seqIndexMap = buildSequenceIndexMap(genomes);
  const gaps: GapRecord[] = [];

  for (const block of blocks) {
    extractBlockGaps(block, genomes, seqIndexMap, contigMap, gaps);
  }

  gaps.sort((a, b) => a.genomeIndex !== b.genomeIndex
    ? a.genomeIndex - b.genomeIndex
    : a.genomeWidePosition - b.genomeWidePosition);

  return gaps;
}

/** Extract gaps from all segments in a single alignment block */
function extractBlockGaps(
  block: AlignmentBlock,
  genomes: readonly Genome[],
  seqIndexMap: ReadonlyMap<number, number>,
  contigMap: ContigMap | undefined,
  gaps: GapRecord[],
): void {
  for (const segment of block.segments) {
    const arrayIdx = seqIndexMap.get(segment.sequenceIndex);
    if (arrayIdx === undefined) continue;
    extractSegmentGaps(segment, arrayIdx, genomes[arrayIdx]!, contigMap, gaps);
  }
}

/** Extract gaps from a single segment's sequence data */
function extractSegmentGaps(
  segment: AlignedSegment,
  genomeIndex: number,
  genome: Genome,
  contigMap: ContigMap | undefined,
  gaps: GapRecord[],
): void {
  const seqData = segment.sequenceData;
  const positions = computePositions(segment);

  let col = 0;
  while (col < seqData.length) {
    if (seqData[col] === '-') {
      const gapStart = col;

      while (col < seqData.length && seqData[col] === '-') {
        col++;
      }
      const gapLength = col - gapStart;

      const adjacentPos = computeAdjacentPosition(segment, positions, gapStart, col);
      const contigs = contigMap?.get(genomeIndex);
      const { contigName, positionInContig } = resolveContig(
        adjacentPos, contigs ?? [], genome.name,
      );

      gaps.push({
        genomeIndex,
        contigName,
        positionInContig,
        genomeWidePosition: adjacentPos,
        length: gapLength,
      });
    } else {
      col++;
    }
  }
}

/**
 * Compute the genomic position adjacent to a gap run.
 * For forward strand: position of the last non-gap base before the gap.
 * For reverse strand: position of the first non-gap base after the gap.
 * Falls back to segment boundary if no adjacent base exists.
 */
function computeAdjacentPosition(
  segment: AlignedSegment,
  positions: readonly number[],
  gapStart: number,
  gapEnd: number,
): number {
  if (segment.strand === '+') {
    // Use the last non-gap base before the gap
    if (gapStart > 0 && positions[gapStart - 1] !== 0) {
      return positions[gapStart - 1]!;
    }
    return segment.start;
  }
  // Reverse strand: use the first non-gap base after the gap
  if (gapEnd < positions.length && positions[gapEnd] !== 0) {
    return positions[gapEnd]!;
  }
  return segment.end;
}

/**
 * Format gap records as a tab-delimited string ready for file export.
 * Header: Genome, Contig, Position_in_Contig, GenomeWide_Position, Length
 */
export function formatGapTable(
  gaps: readonly GapRecord[],
): string {
  const lines: string[] = [];

  lines.push('Genome\tContig\tPosition_in_Contig\tGenomeWide_Position\tLength');

  for (const gap of gaps) {
    const genomeName = `sequence_${gap.genomeIndex + 1}`;
    lines.push([
      genomeName,
      gap.contigName,
      String(gap.positionInContig),
      String(gap.genomeWidePosition),
      String(gap.length),
    ].join('\t'));
  }

  return lines.join('\n') + '\n';
}

/**
 * Export gaps from an alignment as a downloadable file.
 * Returns the generated content string for testability.
 */
export function exportGaps(
  alignment: XmfaAlignment,
  contigMap?: ContigMap,
): string {
  const gaps = extractGaps(alignment, contigMap);
  return formatGapTable(gaps);
}
