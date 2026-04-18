import type { XmfaAlignment, AlignmentBlock } from '../../import/xmfa/types.ts';
import type { GenomicFeature } from '../../annotations/types.ts';
import type { AnnotationMap } from '../../viewer/rendering/annotations.ts';

// ── Types ────────────────────────────────────────────────────────────────────

/** A single amino acid substitution in a CDS */
export interface AaSubstitution {
  /** 1-based codon position within the CDS */
  readonly codonPosition: number;
  /** Reference amino acid (single letter) */
  readonly refAa: string;
  /** Assembly amino acid (single letter) */
  readonly assAa: string;
}

/** A premature stop codon found in an aligned CDS */
export interface PrematureStop {
  /** 1-based codon position within the CDS */
  readonly codonPosition: number;
  /** The original (reference) amino acid that became a stop */
  readonly originalAa: string;
}

/** A frameshift region in an aligned CDS */
export interface Frameshift {
  /** 1-based codon position where the frameshift starts */
  readonly startCodon: number;
  /** 1-based codon position where the frameshift ends */
  readonly endCodon: number;
}

/** A gap segment in an aligned CDS (codons interrupted by intra-codon gaps) */
export interface GapSegment {
  readonly startCodon: number;
  readonly endCodon: number;
}

/** Complete error report for a single CDS feature */
export interface BrokenCds {
  /** Genome index (0-based) that this CDS belongs to (always reference = 0) */
  readonly genomeIndex: number;
  /** Feature ID (locus_tag or gene qualifier) */
  readonly featureId: string;
  /** Peptide length (CDS nucleotide length / 3) */
  readonly peptideLength: number;
  /** Fraction of codons with errors (0–1) */
  readonly aaSubRate: number;
  /** Frameshift segments (broken reading frame) */
  readonly frameshifts: readonly Frameshift[];
  /** Gap segments (intra-codon gaps) */
  readonly gapSegments: readonly GapSegment[];
  /** Amino acid substitutions */
  readonly aaSubstitutions: readonly AaSubstitution[];
  /** Premature stop codons */
  readonly prematureStops: readonly PrematureStop[];
  /** Stop codons caused by insertions (assembly-only codons) */
  readonly insertionStops: readonly number[];
}

/** Result of CDS error detection */
export interface CdsErrorResult {
  /** Total number of CDS features analyzed */
  readonly totalCds: number;
  /** Number of CDS features with at least one error */
  readonly brokenCdsCount: number;
  /** Detailed error reports for broken CDS features */
  readonly brokenCds: readonly BrokenCds[];
}

// ── Codon translation table ──────────────────────────────────────────────────

/** Standard genetic code (NCBI translation table 1) */
const CODON_TABLE: Readonly<Record<string, string>> = {
  'ttt': 'F', 'ttc': 'F', 'tta': 'L', 'ttg': 'L',
  'ctt': 'L', 'ctc': 'L', 'cta': 'L', 'ctg': 'L',
  'att': 'I', 'atc': 'I', 'ata': 'I', 'atg': 'M',
  'gtt': 'V', 'gtc': 'V', 'gta': 'V', 'gtg': 'V',
  'tct': 'S', 'tcc': 'S', 'tca': 'S', 'tcg': 'S',
  'cct': 'P', 'ccc': 'P', 'cca': 'P', 'ccg': 'P',
  'act': 'T', 'acc': 'T', 'aca': 'T', 'acg': 'T',
  'gct': 'A', 'gcc': 'A', 'gca': 'A', 'gcg': 'A',
  'tat': 'Y', 'tac': 'Y', 'taa': '*', 'tag': '*',
  'cat': 'H', 'cac': 'H', 'caa': 'Q', 'cag': 'Q',
  'aat': 'N', 'aac': 'N', 'aaa': 'K', 'aag': 'K',
  'gat': 'D', 'gac': 'D', 'gaa': 'E', 'gag': 'E',
  'tgt': 'C', 'tgc': 'C', 'tga': '*', 'tgg': 'W',
  'cgt': 'R', 'cgc': 'R', 'cga': 'R', 'cgg': 'R',
  'agt': 'S', 'agc': 'S', 'aga': 'R', 'agg': 'R',
  'ggt': 'G', 'ggc': 'G', 'gga': 'G', 'ggg': 'G',
};

// ── Internal helpers ─────────────────────────────────────────────────────────

/** Translate a 3-base codon to an amino acid character. Returns '?' for unknown codons. */
export function translateCodon(codon: string): string {
  return CODON_TABLE[codon.toLowerCase()] ?? '?';
}

/** Check if a character is a valid nucleic acid (standard + IUPAC ambiguity) */
function isNucleicAcid(ch: string): boolean {
  const c = ch.toLowerCase();
  return 'acgtkmryswbvhdn'.includes(c);
}

/** Count gap characters in a string */
function countGaps(seq: string): number {
  let n = 0;
  for (const ch of seq) {
    if (ch === '-') n++;
  }
  return n;
}

/** Remove gap characters from a string */
function trimGaps(seq: string): string {
  let result = '';
  for (const ch of seq) {
    if (ch !== '-') result += ch;
  }
  return result;
}

/** Check if a byte sequence contains exactly 3 valid nucleic acid characters */
function isCodon(seq: string): boolean {
  let count = 0;
  for (const ch of seq) {
    if (isNucleicAcid(ch)) count++;
  }
  return count === 3;
}

/** Get the feature ID (locus_tag > gene > empty string) */
function getFeatureId(feature: GenomicFeature): string {
  return feature.qualifiers['locus_tag'] ?? feature.qualifiers['gene'] ?? '';
}

/**
 * Split a pairwise alignment into codon-aligned chunks based on the reference sequence.
 * Each chunk is a pair [refCodon, assCodon] where refCodon contains exactly 3 reference bases
 * (though it may also contain interleaved gaps). Inter-codon gap-only chunks are emitted separately.
 *
 * Mirrors the Java CDSErrorExporter.splitOnRefCodons().
 */
export function splitOnRefCodons(
  refSeq: string,
  assSeq: string,
): readonly (readonly [string, string])[] {
  const codons: [string, string][] = [];
  let codonStart = 0;
  let baseCount = 0;
  let prevCodonEnd = 0;
  let lookForNewCodonStart = false;
  let gapAccum = 0;

  for (let i = 0; i < refSeq.length; i++) {
    const ch = refSeq[i]!;

    if (isNucleicAcid(ch)) {
      if (lookForNewCodonStart) {
        // Emit inter-codon gap chunk if there is one
        if (prevCodonEnd !== i - 1) {
          codons.push([
            refSeq.slice(prevCodonEnd + 1, i),
            assSeq.slice(prevCodonEnd + 1, i),
          ]);
        }
        codonStart = i;
        lookForNewCodonStart = false;
      }
      baseCount++;
    } else {
      if (ch === '-') {
        gapAccum++;
      }
      // Emit gap-of-3 chunks (insertions in assembly)
      if (gapAccum === 3) {
        gapAccum = 0;
        const start = i - 2;
        codons.push([
          refSeq.slice(start, i + 1),
          assSeq.slice(start, i + 1),
        ]);
        prevCodonEnd = i;
      }
      if (lookForNewCodonStart) {
        codonStart = i + 1;
      }
    }

    if (baseCount === 3) {
      // Emit codon chunk
      codons.push([
        refSeq.slice(codonStart, i + 1),
        assSeq.slice(codonStart, i + 1),
      ]);
      baseCount = 0;
      gapAccum = 0;
      lookForNewCodonStart = true;
      prevCodonEnd = i;
    }
  }

  return codons;
}

/**
 * Extract pairwise alignment (ref vs assembly) for a given genomic region
 * from alignment blocks. Finds blocks where both genomes participate and
 * the reference segment overlaps the requested region.
 *
 * Returns the concatenated aligned sequences [refAligned, assAligned] with
 * only the portion overlapping the feature coordinates.
 */
export function extractPairwiseAlignment(
  blocks: readonly AlignmentBlock[],
  refGenomeIndex: number,
  assGenomeIndex: number,
  featureStart: number,
  featureEnd: number,
): { readonly refSeq: string; readonly assSeq: string } | undefined {
  // Find the block where the reference segment covers the feature
  for (const block of blocks) {
    const refSeg = block.segments.find((s) => s.sequenceIndex === refGenomeIndex);
    const assSeg = block.segments.find((s) => s.sequenceIndex === assGenomeIndex);
    if (!refSeg || !assSeg) continue;

    const segStart = Math.min(refSeg.start, refSeg.end);
    const segEnd = Math.max(refSeg.start, refSeg.end);

    // Check if the feature overlaps this block's reference segment
    if (segStart > featureEnd || segEnd < featureStart) continue;

    // Map feature coordinates to alignment columns
    const refData = refSeg.sequenceData;
    const assData = assSeg.sequenceData;

    // Build position→column mapping for reference
    let pos = refSeg.strand === '+' ? refSeg.start : refSeg.end;
    let startCol = -1;
    let endCol = -1;

    for (let col = 0; col < refData.length; col++) {
      if (refData[col] !== '-') {
        if (pos >= featureStart && pos <= featureEnd) {
          if (startCol === -1) startCol = col;
          endCol = col;
        }
        pos += refSeg.strand === '+' ? 1 : -1;
      }
    }

    if (startCol === -1) continue;

    return {
      refSeq: refData.slice(startCol, endCol + 1),
      assSeq: assData.slice(startCol, endCol + 1),
    };
  }

  return undefined;
}

/**
 * Analyze a single CDS for errors by comparing reference and assembly alignment.
 * Detects frameshifts, premature stop codons, AA substitutions, and gap segments.
 *
 * Mirrors the logic in Java CDSErrorExporter.refineBrokenCDS().
 */
export function analyzeCds(
  refSeq: string,
  assSeq: string,
  featureId: string,
  peptideLength: number,
): BrokenCds {
  const frameshifts: Frameshift[] = [];
  const gapSegments: GapSegment[] = [];
  const aaSubstitutions: AaSubstitution[] = [];
  const prematureStops: PrematureStop[] = [];
  const insertionStops: number[] = [];

  const codons = splitOnRefCodons(refSeq, assSeq);

  let numCodons = 0;
  let numBadCodons = 0;
  let frameShift = 0;
  let inFrame = true;
  let lastInFrame = 1;
  let inGap = false;
  let lastNoGap = 1;
  let assNaCount = 0;

  for (let cdnI = 0; cdnI < codons.length; cdnI++) {
    const [refCodon, assCodon] = codons[cdnI]!;
    const refGapCount = countGaps(refCodon);
    const assGapCount = countGaps(assCodon);
    assNaCount += assCodon.length - assGapCount;

    if (frameShift % 3 === 0) {
      // In-frame
      if (refGapCount === 0) {
        // Not an inter-codon gap
        numCodons++;

        if (isCodon(assCodon)) {
          // Assembly codon has exactly 3 bases
          const aaRef = translateCodon(trimGaps(refCodon));
          const aaAss = translateCodon(trimGaps(assCodon));

          if (aaRef !== aaAss) {
            numBadCodons++;
            if (aaAss === '*' && aaRef !== '*') {
              prematureStops.push({ codonPosition: numCodons, originalAa: aaRef });
            } else {
              aaSubstitutions.push({ codonPosition: numCodons, refAa: aaRef, assAa: aaAss });
            }
          } else {
            lastNoGap = numCodons;
          }

          if (inGap) {
            inGap = false;
            gapSegments.push({ startCodon: lastNoGap, endCodon: numCodons - 1 });
          }
        } else {
          // Bad codon (has intra-codon gaps)
          numBadCodons++;
          if (!inGap) {
            inGap = true;
            lastNoGap = numCodons;
          }
        }
        lastInFrame = numCodons;
      } else {
        // Reference codon is a gap (insertion in assembly)
        if (refCodon.length === 3 && isCodon(assCodon)) {
          const aa = translateCodon(assCodon);
          if (aa === '*') {
            insertionStops.push(Math.floor(assNaCount / 3));
          }
        }
      }
    } else {
      // Out of frame
      if (isCodon(refCodon)) {
        numCodons++;
        numBadCodons++;
      }
    }

    frameShift += assGapCount - refGapCount;

    if (inFrame) {
      if (frameShift % 3 !== 0) {
        inFrame = false;
        lastInFrame = numCodons;
      }
    } else {
      if (frameShift % 3 === 0 || cdnI === codons.length - 1) {
        inFrame = true;
        frameshifts.push({ startCodon: lastInFrame + 1, endCodon: numCodons });
      }
    }
  }

  const aaSubRate = numCodons > 0 ? numBadCodons / numCodons : 0;

  return {
    genomeIndex: 0,
    featureId,
    peptideLength,
    aaSubRate,
    frameshifts,
    gapSegments,
    aaSubstitutions,
    prematureStops,
    insertionStops,
  };
}

/**
 * Detect CDS errors across an alignment by projecting SNPs and gaps onto
 * annotated CDS features from the reference genome (index 0).
 *
 * Requires:
 * - An alignment with exactly 2 genomes
 * - GenBank annotations with CDS features for the reference genome
 *
 * Returns a CdsErrorResult with details of all broken CDS features.
 */
export function detectCdsErrors(
  alignment: XmfaAlignment,
  annotations: AnnotationMap,
): CdsErrorResult {
  const { genomes, blocks } = alignment;

  if (genomes.length < 2) {
    return { totalCds: 0, brokenCdsCount: 0, brokenCds: [] };
  }

  // Get reference genome annotations (index 0)
  const refGenomeIndex = genomes[0]!.index;
  const assGenomeIndex = genomes[1]!.index;
  const refAnnotations = annotations.get(0);

  if (!refAnnotations) {
    return { totalCds: 0, brokenCdsCount: 0, brokenCds: [] };
  }

  // Extract CDS features from reference genome
  const cdsFeatures = refAnnotations.features
    .filter((f) => f.type === 'CDS')
    .filter((f) => (f.end - f.start + 1) % 3 === 0)
    .sort((a, b) => a.start - b.start);

  const totalCds = cdsFeatures.length;
  const brokenCds: BrokenCds[] = [];

  for (const feature of cdsFeatures) {
    const featureId = getFeatureId(feature);
    const nucleotideLength = feature.end - feature.start + 1;
    const peptideLength = nucleotideLength / 3;

    // Extract pairwise alignment for this CDS region
    const pairwise = extractPairwiseAlignment(
      blocks,
      refGenomeIndex,
      assGenomeIndex,
      feature.start,
      feature.end,
    );

    if (!pairwise) continue;

    const { refSeq, assSeq } = pairwise;

    // Check if there are any differences at all
    const refBases = trimGaps(refSeq);
    if (refBases.length % 3 !== 0) continue;

    const result = analyzeCds(refSeq, assSeq, featureId, peptideLength);

    // Only include CDS with actual errors
    const hasErrors =
      result.frameshifts.length > 0 ||
      result.gapSegments.length > 0 ||
      result.aaSubstitutions.length > 0 ||
      result.prematureStops.length > 0 ||
      result.insertionStops.length > 0;

    if (hasErrors) {
      brokenCds.push(result);
    }
  }

  return {
    totalCds,
    brokenCdsCount: brokenCds.length,
    brokenCds,
  };
}

// ── Formatting ───────────────────────────────────────────────────────────────

/** Format a list of segments as comma-separated [start,end] pairs or '-' if empty */
function formatSegments(segments: readonly { readonly startCodon: number; readonly endCodon: number }[]): string {
  if (segments.length === 0) return '-';
  return segments.map((s) => `[${s.startCodon},${s.endCodon}]`).join(',');
}

/** Format substitution positions as comma-separated values or '-' if empty */
function formatSubPositions(subs: readonly AaSubstitution[]): string {
  if (subs.length === 0) return '-';
  return subs.map((s) => String(s.codonPosition)).join(',');
}

/** Format substitution patterns as comma-separated from->to or '-' if empty */
function formatSubPatterns(subs: readonly AaSubstitution[]): string {
  if (subs.length === 0) return '-';
  return subs.map((s) => `${s.refAa}->${s.assAa}`).join(',');
}

/** Format premature stop positions or '-' if empty */
function formatStopPositions(stops: readonly PrematureStop[]): string {
  if (stops.length === 0) return '-';
  return stops.map((s) => String(s.codonPosition)).join(',');
}

/** Format premature stop original residues or '-' if empty */
function formatStopResidues(stops: readonly PrematureStop[]): string {
  if (stops.length === 0) return '-';
  return stops.map((s) => s.originalAa).join(',');
}

/**
 * Format CDS error results as a tab-delimited string.
 *
 * Columns: FeatureID, Peptide_Length, Perc_Incorrect_AAs, Broken_Frame_Segments,
 * Gap_Segments, Substituted_Positions, Substitutions, Stop_Codon_Positions,
 * Original_Residue, Insertion_Stops
 *
 * Matches the legacy Java BrokenCDS.toString() format.
 */
export function formatCdsErrors(result: CdsErrorResult): string {
  if (result.brokenCds.length === 0) return '';

  const header = [
    'FeatureID',
    'Peptide_Length',
    'Perc_Incorrect_AAs',
    'Broken_Frame_Segments',
    'Gap_Segments',
    'Substituted_Positions',
    'Substitutions',
    'Stop_Codon_Positions',
    'Original_Residue',
    'Insertion_Stops',
  ].join('\t');

  const lines = result.brokenCds.map((cds) => {
    const parts = [
      cds.featureId,
      String(cds.peptideLength),
      cds.aaSubRate.toFixed(6),
      formatSegments(cds.frameshifts),
      formatSegments(cds.gapSegments),
      formatSubPositions(cds.aaSubstitutions),
      formatSubPatterns(cds.aaSubstitutions),
      formatStopPositions(cds.prematureStops),
      formatStopResidues(cds.prematureStops),
      cds.insertionStops.length > 0
        ? cds.insertionStops.join(',')
        : '-',
    ];
    return parts.join('\t');
  });

  return header + '\n' + lines.join('\n') + '\n';
}

/**
 * Export CDS errors from an alignment with annotations.
 * Returns tab-delimited content ready for file download.
 */
export function exportCdsErrors(
  alignment: XmfaAlignment,
  annotations: AnnotationMap,
): string {
  const result = detectCdsErrors(alignment, annotations);
  return formatCdsErrors(result);
}
