import type { XmfaAlignment, AlignedSegment } from '../../import/xmfa/types.ts';

/** Region to extract as FASTA */
export interface FastaRegion {
  readonly genomeIndex: number;
  readonly start: number;
  readonly end: number;
  readonly name?: string;
}

const FASTA_LINE_WIDTH = 70;

/**
 * Extract partial FASTA sequences from alignment data for specified regions.
 * Sequence data is gathered from alignment blocks covering each region.
 * Returns multi-FASTA formatted string.
 */
export function extractPartialFasta(
  alignment: XmfaAlignment,
  regions: readonly FastaRegion[],
): string {
  const lines: string[] = [];

  for (const region of regions) {
    const genomeName = region.name ??
      alignment.genomes[region.genomeIndex]?.name ??
      `genome_${region.genomeIndex}`;
    const header = `>${genomeName}:${region.start}-${region.end}`;

    // Collect sequence data from alignment blocks
    let sequence = '';
    for (const block of alignment.blocks) {
      const segment = block.segments.find(
        (s) => s.sequenceIndex === region.genomeIndex,
      );
      if (segment === undefined) continue;

      // Check overlap
      if (segment.end < region.start || segment.start > region.end) continue;

      // Extract the portion of this segment that overlaps with the region
      const bases = extractBases(segment, region.start, region.end);
      sequence += bases;
    }

    lines.push(header);
    // Wrap at FASTA_LINE_WIDTH characters per line
    for (let i = 0; i < sequence.length; i += FASTA_LINE_WIDTH) {
      lines.push(sequence.slice(i, i + FASTA_LINE_WIDTH));
    }
  }

  return lines.length > 0 ? lines.join('\n') + '\n' : '';
}

/**
 * Extract non-gap bases from a segment that fall within the given region.
 */
function extractBases(
  segment: AlignedSegment,
  regionStart: number,
  regionEnd: number,
): string {
  const seq = segment.sequenceData;
  let result = '';
  let genomePos = segment.strand === '+' ? segment.start : segment.end;

  for (let col = 0; col < seq.length; col++) {
    const ch = seq[col];
    if (ch === '-') continue;

    const pos = genomePos;
    if (segment.strand === '+') {
      genomePos++;
    } else {
      genomePos--;
    }

    if (pos >= regionStart && pos <= regionEnd) {
      result += ch;
    }
  }

  return result;
}
