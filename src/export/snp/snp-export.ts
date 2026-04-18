import type { XmfaAlignment, AlignmentBlock, AlignedSegment, Genome } from '../import/xmfa/types.ts';
import type { ContigBoundary } from '../annotations/types.ts';

/** A single SNP record with per-genome position data */
export interface SnpRecord {
  readonly pattern: string;
  readonly genomePositions: readonly SnpGenomePosition[];
}

/** Position data for a SNP in a single genome */
export interface SnpGenomePosition {
  readonly contigName: string;
  readonly positionInContig: number;
  readonly genomeWidePosition: number;
}

/** Contig info per genome, used to resolve positions to contig names */
export type ContigMap = ReadonlyMap<number, readonly ContigBoundary[]>;

/** IUPAC ambiguity codes — treated as potential polymorphisms (not identical to any single base) */
const AMBIGUITY_CODES = new Set([
  'r', 'y', 'k', 'm', 's', 'w', 'b', 'd', 'h', 'v', 'n', 'x',
]);

/** Check if a character is a standard unambiguous base */
function isUnambiguousBase(ch: string): boolean {
  return ch === 'a' || ch === 'c' || ch === 'g' || ch === 't';
}

/** Check if a character is a gap or absent */
function isGap(ch: string): boolean {
  return ch === '-';
}

/**
 * Resolve a genome-wide position to a contig name and position within that contig.
 * Contigs are sorted ascending by position. A position belongs to the last contig
 * whose boundary position is <= the given position. If no contigs, use the genome name.
 */
export function resolveContig(
  position: number,
  contigs: readonly ContigBoundary[],
  genomeName: string,
): { readonly contigName: string; readonly positionInContig: number } {
  if (contigs.length === 0) {
    return { contigName: genomeName, positionInContig: position };
  }

  // Find the contig that contains this position (last contig with boundary <= position)
  let contigIndex = -1;
  for (let i = 0; i < contigs.length; i++) {
    if (contigs[i]!.position <= position) {
      contigIndex = i;
    } else {
      break;
    }
  }

  if (contigIndex === -1) {
    // Position is before the first contig boundary — use first contig
    const first = contigs[0]!;
    return { contigName: first.name, positionInContig: position };
  }

  const contig = contigs[contigIndex]!;
  return {
    contigName: contig.name,
    positionInContig: position - contig.position + 1,
  };
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

/** Tracks non-gap positions per genome in a block */
interface PositionTracker {
  readonly getPosition: (genomeArrayIdx: number, col: number) => number;
}

/**
 * Track genome-wide non-gap position per sequence within a block.
 * Accounts for strand orientation of segments.
 */
function buildPositionTrackers(
  block: AlignmentBlock,
  seqIndexMap: ReadonlyMap<number, number>,
): PositionTracker {
  // Pre-index segments by genome array index
  const segmentByGenome = new Map<number, AlignedSegment>();
  for (const segment of block.segments) {
    const arrayIdx = seqIndexMap.get(segment.sequenceIndex);
    if (arrayIdx !== undefined) {
      segmentByGenome.set(arrayIdx, segment);
    }
  }

  // Pre-compute non-gap offsets for each genome segment
  const nonGapOffsets = new Map<number, Int32Array>();
  for (const [arrayIdx, segment] of segmentByGenome) {
    const offsets = new Int32Array(segment.sequenceData.length);
    let offset = 0;
    for (let col = 0; col < segment.sequenceData.length; col++) {
      const ch = segment.sequenceData[col]!;
      if (isGap(ch)) {
        offsets[col] = -1; // gap marker
      } else {
        offsets[col] = offset;
        offset++;
      }
    }
    nonGapOffsets.set(arrayIdx, offsets);
  }

  return {
    getPosition: (genomeArrayIdx: number, col: number): number => {
      const segment = segmentByGenome.get(genomeArrayIdx);
      if (!segment) return 0;
      const offsets = nonGapOffsets.get(genomeArrayIdx)!;
      if (offsets[col] === -1) return 0; // gap
      const offset = offsets[col]!;
      if (segment.strand === '-') {
        return segment.end - offset;
      }
      return segment.start + offset;
    },
  };
}

/**
 * Extract all SNPs from an XMFA alignment.
 * A column is polymorphic if it contains at least two different non-gap bases
 * (ignoring case). IUPAC ambiguity codes are treated as distinct from standard bases.
 */
export function extractSnps(
  alignment: XmfaAlignment,
  contigMap?: ContigMap,
): readonly SnpRecord[] {
  const { genomes, blocks } = alignment;
  const genomeCount = genomes.length;
  const seqIndexMap = buildSequenceIndexMap(genomes);
  const snps: SnpRecord[] = [];

  for (const block of blocks) {
    if (block.segments.length < 2) continue;
    extractBlockSnps(block, genomes, genomeCount, seqIndexMap, contigMap, snps);
  }

  return snps;
}

/** Extract SNPs from a single alignment block */
function extractBlockSnps(
  block: AlignmentBlock,
  genomes: readonly Genome[],
  genomeCount: number,
  seqIndexMap: ReadonlyMap<number, number>,
  contigMap: ContigMap | undefined,
  snps: SnpRecord[],
): void {
  const tracker = buildPositionTrackers(block, seqIndexMap);
  const alignLength = Math.min(...block.segments.map((s) => s.sequenceData.length));

  const basesByGenome = new Map<number, string>();
  for (const segment of block.segments) {
    const arrayIdx = seqIndexMap.get(segment.sequenceIndex);
    if (arrayIdx !== undefined) {
      basesByGenome.set(arrayIdx, segment.sequenceData);
    }
  }

  for (let col = 0; col < alignLength; col++) {
    const bases: string[] = new Array(genomeCount).fill('-') as string[];
    for (const [arrayIdx, seqData] of basesByGenome) {
      bases[arrayIdx] = seqData[col]!;
    }

    if (!isPolymorphic(bases)) continue;

    const genomePositions: SnpGenomePosition[] = [];
    const patternChars: string[] = [];

    for (let gi = 0; gi < genomeCount; gi++) {
      const base = bases[gi]!;
      patternChars.push(base);

      const genomeWidePosition = tracker.getPosition(gi, col);
      const genome = genomes[gi]!;
      const contigs = contigMap?.get(gi);
      const { contigName, positionInContig } = genomeWidePosition > 0
        ? resolveContig(genomeWidePosition, contigs ?? [], genome.name)
        : { contigName: genome.name, positionInContig: 0 };

      genomePositions.push({ contigName, positionInContig, genomeWidePosition });
    }

    snps.push({ pattern: patternChars.join(''), genomePositions });
  }
}

/**
 * Check if a column of bases is polymorphic.
 * A column is polymorphic if there are at least two distinct non-gap bases
 * (compared case-insensitively). Ambiguity codes count as distinct bases.
 */
function isPolymorphic(bases: readonly string[]): boolean {
  let firstBase = '';
  for (const raw of bases) {
    const base = raw.toLowerCase();
    if (isGap(base)) continue;
    if (AMBIGUITY_CODES.has(base)) {
      if (firstBase !== '' && firstBase !== base) return true;
      if (firstBase === '') firstBase = base;
      continue;
    }
    if (!isUnambiguousBase(base)) continue;
    if (firstBase === '') {
      firstBase = base;
    } else if (firstBase !== base) {
      return true;
    }
  }
  return false;
}

/**
 * Format SNP records as a tab-delimited string ready for file export.
 */
export function formatSnpTable(
  snps: readonly SnpRecord[],
  genomes: readonly Genome[],
): string {
  const lines: string[] = [];

  // Header line
  const headerParts = ['SNP pattern'];
  for (let i = 0; i < genomes.length; i++) {
    const seq = `sequence_${i + 1}_`;
    headerParts.push(`${seq}Contig`, `${seq}PosInContg`, `${seq}GenWidePos`);
  }
  lines.push(headerParts.join('\t'));

  // Data lines
  for (const snp of snps) {
    const parts: string[] = [snp.pattern];
    for (const pos of snp.genomePositions) {
      parts.push(String(pos.contigName), String(pos.positionInContig), String(pos.genomeWidePosition));
    }
    lines.push(parts.join('\t'));
  }

  return lines.join('\n') + '\n';
}

/**
 * Export SNPs from an alignment as a downloadable file.
 * Returns the generated content string for testability.
 */
export function exportSnps(
  alignment: XmfaAlignment,
  contigMap?: ContigMap,
): string {
  const snps = extractSnps(alignment, contigMap);
  return formatSnpTable(snps, alignment.genomes);
}

/**
 * Trigger a browser download of a text file.
 */
export function downloadTextFile(content: string, filename: string, mimeType = 'text/tab-separated-values'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
