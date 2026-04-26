/**
 * Sequence-level metrics for assembly quality scoring.
 *
 * Computes missed bases, extra bases, SNP count with a 4×4 substitution
 * matrix, and gap locations by comparing reference vs assembly alignment blocks.
 */
import type { XmfaAlignment, AlignmentBlock, AlignedSegment } from '../import/xmfa/types.ts';

/** Mapping of nucleotide characters to substitution-matrix row/column indices */
const BASE_INDEX: Readonly<Record<string, number>> = {
  a: 0, A: 0,
  c: 1, C: 1,
  t: 2, T: 2,
  g: 3, G: 3,
};

/**
 * 4×4 substitution matrix counting base changes between reference and assembly.
 * Row index = reference base, column index = assembly base.
 * Base ordering: A=0, C=1, T=2, G=3.
 * Diagonal entries are always 0 (identical bases are not SNPs).
 */
export interface SubstitutionMatrix {
  readonly counts: readonly (readonly number[])[];
}

/** A run of gap characters in an aligned sequence, with genomic position context */
export interface GapLocation {
  /**
   * Genomic position of the first base in the opposite sequence adjacent to
   * the gap run. For assembly gaps (asm has '-'), this is a reference position.
   * For reference gaps (ref has '-'), this is an assembly position.
   */
  readonly genomeWidePosition: number;
  /** Number of gap characters in the run */
  readonly length: number;
}

/** Sequence-level quality metrics comparing a reference genome to a draft assembly */
export interface SequenceMetrics {
  /** Reference bases not covered by assembly (assembly column is '-') */
  readonly missedBases: number;
  /** Fraction [0, 1] of reference bases not covered by assembly */
  readonly missedBasesPercent: number;
  /** Assembly bases not found in reference (reference column is '-') */
  readonly extraBases: number;
  /** Fraction [0, 1] of assembly bases not found in reference */
  readonly extraBasesPercent: number;
  /** Number of columns where both sequences have a base but they differ */
  readonly snpCount: number;
  /** Per-base substitution counts between reference and assembly */
  readonly substitutionMatrix: SubstitutionMatrix;
  /** Gap runs in the reference sequence (reference has '-', assembly has a base) */
  readonly refGaps: readonly GapLocation[];
  /** Gap runs in the assembly sequence (assembly has '-', reference has a base) */
  readonly assemblyGaps: readonly GapLocation[];
}

// ---------------------------------------------------------------------------
// Internal mutable accumulator
// ---------------------------------------------------------------------------

interface MutableStats {
  missedBases: number;
  extraBases: number;
  snpCount: number;
  substitutionMatrix: number[][];
  refGaps: GapLocation[];
  assemblyGaps: GapLocation[];
}

function createStats(): MutableStats {
  return {
    missedBases: 0,
    extraBases: 0,
    snpCount: 0,
    substitutionMatrix: Array.from({ length: 4 }, () => new Array<number>(4).fill(0)),
    refGaps: [],
    assemblyGaps: [],
  };
}

// ---------------------------------------------------------------------------
// Per-segment helpers
// ---------------------------------------------------------------------------

/**
 * Compute the genome-wide 1-based position for each column of a segment's
 * sequence data.  Gap columns receive position 0.
 */
function computePositions(segment: AlignedSegment): readonly number[] {
  const seqData = segment.sequenceData;
  const positions = new Array<number>(seqData.length).fill(0);
  let offset = 0;
  for (let col = 0; col < seqData.length; col++) {
    if (seqData[col] !== '-') {
      positions[col] =
        segment.strand === '+' ? segment.start + offset : segment.end - offset;
      offset++;
    }
  }
  return positions;
}

/** Count non-gap characters in a segment's sequence data */
function countBases(segment: AlignedSegment): number {
  let count = 0;
  for (const ch of segment.sequenceData) {
    if (ch !== '-') count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Block analysis
// ---------------------------------------------------------------------------

/**
 * Analyse a single alignment block, accumulating sequence-level statistics
 * into `stats`.
 *
 * Reference-only blocks contribute to missed bases.
 * Assembly-only blocks contribute to extra bases.
 * Mixed blocks are scanned column by column.
 */
function analyzeBlock(
  block: AlignmentBlock,
  refGenomeIdx: number,
  seqIndexMap: ReadonlyMap<number, number>,
  stats: MutableStats,
): void {
  let refSeg: AlignedSegment | undefined;
  const asmSegs: AlignedSegment[] = [];

  for (const seg of block.segments) {
    const arrayIdx = seqIndexMap.get(seg.sequenceIndex);
    if (arrayIdx === undefined) continue;
    if (arrayIdx === refGenomeIdx) {
      refSeg = seg;
    } else {
      asmSegs.push(seg);
    }
  }

  if (!refSeg && asmSegs.length === 0) return;

  if (!refSeg) {
    // Assembly-only block: all assembly bases are "extra"
    for (const asmSeg of asmSegs) {
      stats.extraBases += countBases(asmSeg);
    }
    return;
  }

  if (asmSegs.length === 0) {
    // Reference-only block: all reference bases are "missed"
    stats.missedBases += countBases(refSeg);
    return;
  }

  // Both reference and assembly segments: column-by-column comparison.
  // In a scoring alignment each block typically aligns the reference against
  // exactly one assembly contig, but we handle the multi-contig case by
  // comparing the reference against each assembly segment independently.
  for (const asmSeg of asmSegs) {
    analyzeColumnPairs(refSeg, asmSeg, stats);
  }
}

/**
 * Compare a reference segment and an assembly segment column by column.
 * Accumulates missed/extra bases, SNPs, substitution counts, and gap runs.
 */
function analyzeColumnPairs(
  refSeg: AlignedSegment,
  asmSeg: AlignedSegment,
  stats: MutableStats,
): void {
  const refData = refSeg.sequenceData;
  const asmData = asmSeg.sequenceData;
  const refPositions = computePositions(refSeg);
  const asmPositions = computePositions(asmSeg);
  const alignLen = Math.min(refData.length, asmData.length);

  // Track open gap runs: -1 means no active run
  let asmGapStart = -1; // assembly has '-', reference has a base
  let refGapStart = -1; // reference has '-', assembly has a base

  const flushAsmGap = (col: number): void => {
    if (asmGapStart === -1) return;
    // Gap is in assembly; record position from the reference sequence
    const pos = refPositions[asmGapStart] ?? 0;
    stats.assemblyGaps.push({ genomeWidePosition: pos, length: col - asmGapStart });
    asmGapStart = -1;
  };

  const flushRefGap = (col: number): void => {
    if (refGapStart === -1) return;
    // Gap is in reference; record position from the assembly sequence
    const pos = asmPositions[refGapStart] ?? 0;
    stats.refGaps.push({ genomeWidePosition: pos, length: col - refGapStart });
    refGapStart = -1;
  };

  for (let col = 0; col < alignLen; col++) {
    const refChar = refData[col]!;
    const asmChar = asmData[col]!;
    const refIsGap = refChar === '-';
    const asmIsGap = asmChar === '-';

    if (!refIsGap && asmIsGap) {
      // Missed base: reference has a base but assembly does not
      stats.missedBases++;
      flushRefGap(col);
      if (asmGapStart === -1) asmGapStart = col;
    } else if (refIsGap && !asmIsGap) {
      // Extra base: assembly has a base but reference does not
      stats.extraBases++;
      flushAsmGap(col);
      if (refGapStart === -1) refGapStart = col;
    } else {
      // Both gap or both non-gap — close any open gap runs
      flushAsmGap(col);
      flushRefGap(col);

      if (!refIsGap) {
        // Both have a base: check for SNP
        const refIdx = BASE_INDEX[refChar];
        const asmIdx = BASE_INDEX[asmChar];
        if (refIdx !== undefined && asmIdx !== undefined && refIdx !== asmIdx) {
          stats.snpCount++;
          stats.substitutionMatrix[refIdx]![asmIdx]!++;
        }
      }
    }
  }

  // Close any gap runs that extend to the end of the alignment block
  flushAsmGap(alignLen);
  flushRefGap(alignLen);
}

// ---------------------------------------------------------------------------
// Sequence-index map helper (mirrors the pattern used in snp-export.ts)
// ---------------------------------------------------------------------------

function buildSeqIndexMap(alignment: XmfaAlignment): ReadonlyMap<number, number> {
  const map = new Map<number, number>();
  for (let i = 0; i < alignment.genomes.length; i++) {
    map.set(alignment.genomes[i]!.index, i);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute sequence-level metrics from a scored reference-vs-assembly alignment.
 *
 * The reference genome occupies index `refGenomeIdx` (default 0); all other
 * genomes are treated as draft assembly contigs.
 *
 * @param alignment    - Parsed XMFA alignment of reference vs assembly.
 * @param refGenomeIdx - 0-based index of the reference genome (default: 0).
 */
export function computeSequenceMetrics(
  alignment: XmfaAlignment,
  refGenomeIdx = 0,
): SequenceMetrics {
  const { genomes, blocks } = alignment;

  const emptyMatrix = (): SubstitutionMatrix => ({
    counts: Array.from({ length: 4 }, () => new Array<number>(4).fill(0)),
  });

  if (genomes.length < 2) {
    return {
      missedBases: 0,
      missedBasesPercent: 0,
      extraBases: 0,
      extraBasesPercent: 0,
      snpCount: 0,
      substitutionMatrix: emptyMatrix(),
      refGaps: [],
      assemblyGaps: [],
    };
  }

  const refGenome = genomes[refGenomeIdx];
  const asmGenomes = genomes.filter((_, i) => i !== refGenomeIdx);
  const referenceBases = refGenome?.length ?? 0;
  const assemblyBases = asmGenomes.reduce((sum, g) => sum + g.length, 0);

  const seqIndexMap = buildSeqIndexMap(alignment);
  const stats = createStats();

  for (const block of blocks) {
    analyzeBlock(block, refGenomeIdx, seqIndexMap, stats);
  }

  return {
    missedBases: stats.missedBases,
    missedBasesPercent: referenceBases > 0 ? stats.missedBases / referenceBases : 0,
    extraBases: stats.extraBases,
    extraBasesPercent: assemblyBases > 0 ? stats.extraBases / assemblyBases : 0,
    snpCount: stats.snpCount,
    substitutionMatrix: { counts: stats.substitutionMatrix },
    refGaps: stats.refGaps,
    assemblyGaps: stats.assemblyGaps,
  };
}
