import { describe, it, expect } from 'vitest';
import { computeCdsQualityMetrics } from './cds-quality.ts';
import type { XmfaAlignment, AlignmentBlock } from '../import/xmfa/types.ts';
import type { Genome } from '../import/xmfa/types.ts';
import type { GenomicFeature, GenomeAnnotations } from '../annotations/types.ts';
import type { AnnotationMap } from '../viewer/rendering/annotations.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAlignment(
  refSeq: string,
  assSeq: string,
  options?: { refStart?: number; refEnd?: number },
): XmfaAlignment {
  const refNonGap = refSeq.replace(/-/g, '').length;
  const assNonGap = assSeq.replace(/-/g, '').length;
  const refStart = options?.refStart ?? 1;
  const refEnd = options?.refEnd ?? refStart + refNonGap - 1;

  const blocks: AlignmentBlock[] = [
    {
      segments: [
        {
          sequenceIndex: 1,
          start: refStart,
          end: refEnd,
          strand: '+',
          sourceFile: 'ref.gbk',
          sequenceData: refSeq,
        },
        {
          sequenceIndex: 2,
          start: 1,
          end: assNonGap,
          strand: '+',
          sourceFile: 'asm.fasta',
          sequenceData: assSeq,
        },
      ],
    },
  ];

  const genomes: Genome[] = [
    { index: 1, name: 'reference', length: 10_000, format: 'genbank' },
    { index: 2, name: 'assembly', length: 10_000, format: 'fasta' },
  ];

  return {
    header: { formatVersion: '1', sequenceCount: 2, sequenceEntries: [] },
    blocks,
    lcbs: [],
    genomes,
  };
}

function makeSingleGenomeAlignment(): XmfaAlignment {
  return {
    header: { formatVersion: '1', sequenceCount: 1, sequenceEntries: [] },
    blocks: [],
    lcbs: [],
    genomes: [{ index: 1, name: 'ref', length: 1000, format: 'fasta' }],
  };
}

function makeCds(start: number, end: number, locusTag?: string): GenomicFeature {
  const qualifiers: Record<string, string> = {};
  if (locusTag) qualifiers['locus_tag'] = locusTag;
  return { type: 'CDS', start, end, strand: '+', qualifiers };
}

function makeAnnotations(features: readonly GenomicFeature[]): AnnotationMap {
  const genomeAnnotations: GenomeAnnotations = {
    genomeIndex: 0,
    features,
    contigs: [],
  };
  return new Map([[0, genomeAnnotations]]);
}

const EMPTY_ANNOTATIONS: AnnotationMap = new Map();

// ---------------------------------------------------------------------------
// Tests — edge cases
// ---------------------------------------------------------------------------

describe('computeCdsQualityMetrics', () => {
  it('returns zero metrics when alignment has fewer than 2 genomes', () => {
    const alignment = makeSingleGenomeAlignment();
    const metrics = computeCdsQualityMetrics(alignment, EMPTY_ANNOTATIONS);
    expect(metrics.totalCds).toBe(0);
    expect(metrics.completeCds).toBe(0);
    expect(metrics.brokenCdsCount).toBe(0);
    expect(metrics.frameshiftCount).toBe(0);
    expect(metrics.prematureStopCount).toBe(0);
    expect(metrics.aaSubstitutionCount).toBe(0);
    expect(metrics.brokenCds).toEqual([]);
  });

  it('returns zero metrics when no reference annotations provided', () => {
    const alignment = makeAlignment('ATGATGATG', 'ATGATGATG');
    const metrics = computeCdsQualityMetrics(alignment, EMPTY_ANNOTATIONS);
    expect(metrics.totalCds).toBe(0);
    expect(metrics.brokenCdsCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Tests — perfect alignment (no errors)
  // ---------------------------------------------------------------------------

  it('reports all CDS as complete when reference and assembly are identical', () => {
    // 9-base identical sequences: one CDS covering positions 1-9
    const alignment = makeAlignment('ATGATGATG', 'ATGATGATG');
    const annotations = makeAnnotations([makeCds(1, 9, 'gene1')]);
    const metrics = computeCdsQualityMetrics(alignment, annotations);
    expect(metrics.totalCds).toBe(1);
    expect(metrics.completeCds).toBe(1);
    expect(metrics.brokenCdsCount).toBe(0);
    expect(metrics.frameshiftCount).toBe(0);
    expect(metrics.prematureStopCount).toBe(0);
    expect(metrics.aaSubstitutionCount).toBe(0);
    expect(metrics.brokenCds).toHaveLength(0);
  });

  it('reports multiple intact CDS as complete', () => {
    // Two CDS: positions 1-9 and 10-18, identical sequences
    const refSeq = 'ATGATGATGATGATGATG'; // 18 bp
    const assSeq = 'ATGATGATGATGATGATG';
    const alignment = makeAlignment(refSeq, assSeq);
    const annotations = makeAnnotations([
      makeCds(1, 9, 'gene1'),
      makeCds(10, 18, 'gene2'),
    ]);
    const metrics = computeCdsQualityMetrics(alignment, annotations);
    expect(metrics.totalCds).toBe(2);
    expect(metrics.completeCds).toBe(2);
    expect(metrics.brokenCdsCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Tests — broken CDS (amino acid substitution)
  // ---------------------------------------------------------------------------

  it('detects a single amino acid substitution in a CDS', () => {
    // CDS: ATGCCCGGG (Met-Pro-Gly) vs ATGTCCGGG (Met-Ser-Gly) — 1 AA substitution
    const alignment = makeAlignment('ATGCCCGGG', 'ATGTCCGGG');
    const annotations = makeAnnotations([makeCds(1, 9, 'gene1')]);
    const metrics = computeCdsQualityMetrics(alignment, annotations);
    expect(metrics.totalCds).toBe(1);
    expect(metrics.brokenCdsCount).toBe(1);
    expect(metrics.completeCds).toBe(0);
    expect(metrics.aaSubstitutionCount).toBe(1);
    expect(metrics.frameshiftCount).toBe(0);
    expect(metrics.prematureStopCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Tests — broken CDS (premature stop codon)
  // ---------------------------------------------------------------------------

  it('detects a premature stop codon in a CDS', () => {
    // CDS: ATGCCCGGG vs ATGTAAGGG → TAA is a stop codon (premature)
    const alignment = makeAlignment('ATGCCCGGG', 'ATGTAAGGG');
    const annotations = makeAnnotations([makeCds(1, 9, 'gene1')]);
    const metrics = computeCdsQualityMetrics(alignment, annotations);
    expect(metrics.totalCds).toBe(1);
    expect(metrics.brokenCdsCount).toBe(1);
    expect(metrics.prematureStopCount).toBe(1);
    expect(metrics.aaSubstitutionCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Tests — broken CDS (frameshift)
  // ---------------------------------------------------------------------------

  it('detects a frameshift in a CDS', () => {
    // CDS: ATG CCC GGG vs ATG -CC GGG → gap in assembly creates frameshift
    const alignment = makeAlignment('ATGCCCGGG', 'ATG-CCGGG');
    const annotations = makeAnnotations([makeCds(1, 9, 'gene1')]);
    const metrics = computeCdsQualityMetrics(alignment, annotations);
    expect(metrics.totalCds).toBe(1);
    expect(metrics.brokenCdsCount).toBe(1);
    expect(metrics.frameshiftCount).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Tests — aggregation across multiple broken CDS
  // ---------------------------------------------------------------------------

  it('aggregates counts across multiple broken CDS', () => {
    // Two CDS, each with one AA substitution
    // CDS1: ATGCCCGGG vs ATGTCCGGG (C→T at position 4)
    // CDS2: TTTAAAGGG vs TTTCAAGGG (A→C at position 4 of second CDS)
    const refSeq = 'ATGCCCGGGTTTAAAGGG'; // 18 bp, 2 CDS
    const assSeq = 'ATGTCCGGGTTTCAAGGG';
    const alignment = makeAlignment(refSeq, assSeq);
    const annotations = makeAnnotations([
      makeCds(1, 9, 'gene1'),
      makeCds(10, 18, 'gene2'),
    ]);
    const metrics = computeCdsQualityMetrics(alignment, annotations);
    expect(metrics.totalCds).toBe(2);
    expect(metrics.brokenCdsCount).toBe(2);
    expect(metrics.completeCds).toBe(0);
    expect(metrics.aaSubstitutionCount).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // Tests — completeCds invariant
  // ---------------------------------------------------------------------------

  it('always satisfies completeCds + brokenCdsCount === totalCds', () => {
    const refSeq = 'ATGCCCGGGTTTAAAGGG';
    const assSeq = 'ATGTCCGGGTTTAAAGGG'; // only first CDS broken
    const alignment = makeAlignment(refSeq, assSeq);
    const annotations = makeAnnotations([
      makeCds(1, 9, 'gene1'),
      makeCds(10, 18, 'gene2'),
    ]);
    const metrics = computeCdsQualityMetrics(alignment, annotations);
    expect(metrics.completeCds + metrics.brokenCdsCount).toBe(metrics.totalCds);
  });

  // ---------------------------------------------------------------------------
  // Tests — brokenCds array content
  // ---------------------------------------------------------------------------

  it('populates brokenCds array with broken CDS details', () => {
    const alignment = makeAlignment('ATGCCCGGG', 'ATGTCCGGG');
    const annotations = makeAnnotations([makeCds(1, 9, 'gene1')]);
    const metrics = computeCdsQualityMetrics(alignment, annotations);
    expect(metrics.brokenCds).toHaveLength(1);
    expect(metrics.brokenCds[0]!.featureId).toBe('gene1');
    expect(metrics.brokenCds[0]!.aaSubstitutions).toHaveLength(1);
  });
});
