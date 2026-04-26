/**
 * Content metrics for assembly quality scoring.
 *
 * Identifies:
 * - Missing chromosomes: reference chromosome regions (derived from annotation
 *   contig boundaries or the full reference genome) with no alignment blocks
 *   connecting them to any assembly contig.
 * - Extra contigs: assembly genomes that appear in no alignment block alongside
 *   the reference genome.
 */
import type { XmfaAlignment, AlignmentBlock } from '../import/xmfa/types.ts';
import type { AnnotationMap } from '../viewer/rendering/annotations.ts';
import type { ContigBoundary } from '../annotations/types.ts';

/** A reference chromosome / replicon with no coverage from any assembly contig */
export interface MissingChromosome {
  /** 1-based ordinal position of this chromosome in the reference */
  readonly chromosomeIndex: number;
  /** Name of the reference chromosome (from contig boundary metadata) */
  readonly name: string;
  /** Length of the chromosome in bases */
  readonly length: number;
}

/** An assembly contig genome that maps to no reference region */
export interface ExtraContig {
  /** Sequence index of this genome (matches {@link Genome.index}) */
  readonly genomeIndex: number;
  /** Name of the assembly contig genome */
  readonly name: string;
  /** Total bases in the assembly contig genome */
  readonly length: number;
}

/** Content-level metrics comparing reference chromosomes to assembly contig coverage */
export interface ContentMetrics {
  /** Reference chromosomes not covered by any assembly alignment block */
  readonly missingChromosomes: readonly MissingChromosome[];
  /** Number of missing reference chromosomes */
  readonly missingChromosomeCount: number;
  /** Assembly contigs with no alignment to the reference */
  readonly extraContigs: readonly ExtraContig[];
  /** Number of extra assembly contigs */
  readonly extraContigCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPTY_METRICS: ContentMetrics = {
  missingChromosomes: [],
  missingChromosomeCount: 0,
  extraContigs: [],
  extraContigCount: 0,
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Genomic region (1-based, inclusive) with a name */
interface ChromosomeRegion {
  readonly name: string;
  readonly start: number;
  readonly end: number;
}

/**
 * Build a list of chromosome regions for the reference genome.
 *
 * Uses contig boundaries from annotations when available.  Each boundary
 * marks the start of a new chromosome; the end of chromosome i is the start
 * of chromosome i+1 minus 1, and the last chromosome ends at `refLength`.
 *
 * When no contig boundaries are present, treats the entire reference genome
 * as a single chromosome named `refName`.
 */
function buildChromosomeRegions(
  refLength: number,
  refName: string,
  contigs: readonly ContigBoundary[],
): readonly ChromosomeRegion[] {
  if (contigs.length === 0) {
    return [{ name: refName, start: 1, end: refLength }];
  }

  const sorted = [...contigs].sort((a, b) => a.position - b.position);
  return sorted.map((contig, i): ChromosomeRegion => {
    const start = contig.position;
    const end = (sorted[i + 1]?.position ?? refLength + 1) - 1;
    return { name: contig.name, start, end };
  });
}

/**
 * Return true when at least one alignment block has a reference segment
 * overlapping [start, end] AND at least one non-reference segment.
 *
 * @param blocks       - All alignment blocks.
 * @param refSeqIndex  - `genome.index` of the reference (used to match
 *                       `segment.sequenceIndex`).
 * @param start        - Chromosome region start (1-based, inclusive).
 * @param end          - Chromosome region end (1-based, inclusive).
 */
function hasAssemblyCoverage(
  blocks: readonly AlignmentBlock[],
  refSeqIndex: number,
  start: number,
  end: number,
): boolean {
  for (const block of blocks) {
    const refSeg = block.segments.find((s) => s.sequenceIndex === refSeqIndex);
    if (!refSeg) continue;

    const hasAssembly = block.segments.some((s) => s.sequenceIndex !== refSeqIndex);
    if (!hasAssembly) continue;

    const segMin = Math.min(refSeg.start, refSeg.end);
    const segMax = Math.max(refSeg.start, refSeg.end);
    if (segMin <= end && segMax >= start) {
      return true;
    }
  }
  return false;
}

/**
 * Return true when the given assembly genome appears in at least one block
 * alongside the reference genome.
 *
 * @param blocks        - All alignment blocks.
 * @param refSeqIndex   - `genome.index` of the reference.
 * @param asmSeqIndex   - `genome.index` of the assembly contig.
 */
function isMappedToReference(
  blocks: readonly AlignmentBlock[],
  refSeqIndex: number,
  asmSeqIndex: number,
): boolean {
  for (const block of blocks) {
    const hasRef = block.segments.some((s) => s.sequenceIndex === refSeqIndex);
    const hasAsm = block.segments.some((s) => s.sequenceIndex === asmSeqIndex);
    if (hasRef && hasAsm) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute content metrics comparing reference chromosomes to assembly contig
 * coverage.
 *
 * Reference chromosome boundaries are taken from `annotations` when present.
 * If no contig boundary data is available the entire reference genome is
 * treated as a single chromosome.
 *
 * When the alignment contains fewer than 2 genomes, returns zero-valued metrics.
 *
 * @param alignment    - Parsed XMFA alignment of reference vs assembly.
 * @param annotations  - Annotation map keyed by `genome.index`.
 * @param refGenomeIdx - 0-based array index of the reference genome (default: 0).
 */
export function computeContentMetrics(
  alignment: XmfaAlignment,
  annotations: AnnotationMap,
  refGenomeIdx = 0,
): ContentMetrics {
  const { genomes, blocks } = alignment;

  if (genomes.length < 2) {
    return EMPTY_METRICS;
  }

  const refGenome = genomes[refGenomeIdx];
  if (!refGenome) return EMPTY_METRICS;

  // Use genome.index (1-based sequence index) for matching against segment.sequenceIndex.
  const refSeqIndex = refGenome.index;

  // Retrieve contig boundaries for the reference genome from annotations.
  const refAnnotations = annotations.get(refGenome.index);
  const contigs = refAnnotations?.contigs ?? [];

  // Build the list of reference chromosome regions.
  const chromosomes = buildChromosomeRegions(refGenome.length, refGenome.name, contigs);

  // Detect missing chromosomes: reference regions with no assembly coverage.
  const missingChromosomes: MissingChromosome[] = [];
  chromosomes.forEach(({ name, start, end }, i) => {
    if (!hasAssemblyCoverage(blocks, refSeqIndex, start, end)) {
      missingChromosomes.push({
        chromosomeIndex: i + 1,
        name,
        length: end - start + 1,
      });
    }
  });

  // Detect extra contigs: assembly genomes with no alignment to the reference.
  const extraContigs: ExtraContig[] = [];
  for (const genome of genomes) {
    if (genome.index === refSeqIndex) continue;
    if (!isMappedToReference(blocks, refSeqIndex, genome.index)) {
      extraContigs.push({
        genomeIndex: genome.index,
        name: genome.name,
        length: genome.length,
      });
    }
  }

  return {
    missingChromosomes,
    missingChromosomeCount: missingChromosomes.length,
    extraContigs,
    extraContigCount: extraContigs.length,
  };
}
