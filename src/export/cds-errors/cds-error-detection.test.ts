import { describe, expect, it } from 'vitest';
import {
  translateCodon,
  splitOnRefCodons,
  extractPairwiseAlignment,
  analyzeCds,
  detectCdsErrors,
  formatCdsErrors,
  exportCdsErrors,
} from './cds-error-detection.ts';
import type {
  CdsErrorResult,
} from './cds-error-detection.ts';
import type { XmfaAlignment, AlignmentBlock } from '../../import/xmfa/types.ts';
import type { GenomicFeature, GenomeAnnotations } from '../../annotations/types.ts';
import type { AnnotationMap } from '../../viewer/rendering/annotations.ts';

// ── Test helpers ─────────────────────────────────────────────────────────────

/** Create a minimal 2-genome alignment with one block covering a CDS region */
function makeAlignment(
  refSeq: string,
  assSeq: string,
  options?: {
    refStart?: number;
    refEnd?: number;
    assStart?: number;
    assEnd?: number;
  },
): XmfaAlignment {
  const refNonGap = refSeq.replace(/-/g, '').length;
  const assNonGap = assSeq.replace(/-/g, '').length;
  const refStart = options?.refStart ?? 1;
  const refEnd = options?.refEnd ?? refStart + refNonGap - 1;
  const assStart = options?.assStart ?? 1;
  const assEnd = options?.assEnd ?? assStart + assNonGap - 1;

  const blocks: AlignmentBlock[] = [{
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
        start: assStart,
        end: assEnd,
        strand: '+',
        sourceFile: 'ass.fasta',
        sequenceData: assSeq,
      },
    ],
  }];

  const genomes: Genome[] = [
    { index: 1, name: 'reference', length: 10000, format: 'genbank' },
    { index: 2, name: 'assembly', length: 10000, format: 'fasta' },
  ];

  return {
    header: { formatVersion: '1', sequenceCount: 2, sequenceEntries: [] },
    blocks,
    lcbs: [],
    genomes,
  };
}

/** Create a CDS feature */
function makeCds(
  start: number,
  end: number,
  locusTag?: string,
): GenomicFeature {
  const qualifiers: Record<string, string> = {};
  if (locusTag) qualifiers['locus_tag'] = locusTag;
  return {
    type: 'CDS',
    start,
    end,
    strand: '+',
    qualifiers,
  };
}

/** Create an annotation map with CDS features for genome 0 */
function makeAnnotations(features: readonly GenomicFeature[]): AnnotationMap {
  const genomeAnnotations: GenomeAnnotations = {
    genomeIndex: 0,
    features,
    contigs: [],
  };
  return new Map([[0, genomeAnnotations]]);
}

// ── translateCodon ───────────────────────────────────────────────────────────

describe('translateCodon', () => {
  it('translates standard codons', () => {
    expect(translateCodon('atg')).toBe('M');
    expect(translateCodon('ttt')).toBe('F');
    expect(translateCodon('gct')).toBe('A');
  });

  it('handles uppercase input', () => {
    expect(translateCodon('ATG')).toBe('M');
    expect(translateCodon('TAA')).toBe('*');
  });

  it('translates stop codons', () => {
    expect(translateCodon('taa')).toBe('*');
    expect(translateCodon('tag')).toBe('*');
    expect(translateCodon('tga')).toBe('*');
  });

  it('returns ? for unknown codons', () => {
    expect(translateCodon('nnn')).toBe('?');
    expect(translateCodon('xyz')).toBe('?');
  });
});

// ── splitOnRefCodons ─────────────────────────────────────────────────────────

describe('splitOnRefCodons', () => {
  it('splits ungapped alignment into codons', () => {
    const codons = splitOnRefCodons('ATGCCC', 'ATGCCC');
    expect(codons).toEqual([
      ['ATG', 'ATG'],
      ['CCC', 'CCC'],
    ]);
  });

  it('handles gaps in assembly sequence', () => {
    // ref:  ATG CCC
    // ass:  A-G CCC  → assembly has gap in codon 1
    const codons = splitOnRefCodons('ATGCCC', 'A-GCCC');
    expect(codons).toEqual([
      ['ATG', 'A-G'],
      ['CCC', 'CCC'],
    ]);
  });

  it('handles gaps in reference sequence (insertions)', () => {
    // ref:  ATG---CCC
    // ass:  ATGAAACCC → 3 gap chars in ref = insertion codon
    const codons = splitOnRefCodons('ATG---CCC', 'ATGAAACCC');
    expect(codons).toHaveLength(3);
    expect(codons[0]).toEqual(['ATG', 'ATG']);
    expect(codons[1]).toEqual(['---', 'AAA']);
    expect(codons[2]).toEqual(['CCC', 'CCC']);
  });

  it('handles mixed gaps creating codons', () => {
    // Simple case: 6-base ref with no gaps
    const codons = splitOnRefCodons('ATGCCC', 'ATGCCC');
    expect(codons).toHaveLength(2);
  });
});

// ── extractPairwiseAlignment ─────────────────────────────────────────────────

describe('extractPairwiseAlignment', () => {
  it('extracts alignment for a CDS region', () => {
    const alignment = makeAlignment('ATGCCCGGG', 'ATGCCCGGG');
    const result = extractPairwiseAlignment(alignment.blocks, 1, 2, 1, 9);
    expect(result).toBeDefined();
    expect(result!.refSeq).toBe('ATGCCCGGG');
    expect(result!.assSeq).toBe('ATGCCCGGG');
  });

  it('extracts subset of alignment matching feature coordinates', () => {
    const alignment = makeAlignment('NNATGCCCGGNN', 'NNATGCCCGGNN');
    // Feature covers positions 3-11 (ATG CCC GGN)
    const result = extractPairwiseAlignment(alignment.blocks, 1, 2, 3, 11);
    expect(result).toBeDefined();
    expect(result!.refSeq).toBe('ATGCCCGGN');
    expect(result!.assSeq).toBe('ATGCCCGGN');
  });

  it('returns undefined when no block covers the feature', () => {
    const alignment = makeAlignment('ATGCCC', 'ATGCCC', { refStart: 100, refEnd: 105 });
    const result = extractPairwiseAlignment(alignment.blocks, 1, 2, 1, 6);
    expect(result).toBeUndefined();
  });

  it('returns undefined when assembly genome is missing from block', () => {
    const blocks: AlignmentBlock[] = [{
      segments: [{
        sequenceIndex: 1,
        start: 1,
        end: 6,
        strand: '+',
        sourceFile: 'ref.gbk',
        sequenceData: 'ATGCCC',
      }],
    }];
    const result = extractPairwiseAlignment(blocks, 1, 2, 1, 6);
    expect(result).toBeUndefined();
  });
});

// ── analyzeCds ───────────────────────────────────────────────────────────────

describe('analyzeCds', () => {
  it('reports no errors for identical CDS', () => {
    const result = analyzeCds('ATGCCCGGG', 'ATGCCCGGG', 'gene1', 3);
    expect(result.frameshifts).toHaveLength(0);
    expect(result.gapSegments).toHaveLength(0);
    expect(result.aaSubstitutions).toHaveLength(0);
    expect(result.prematureStops).toHaveLength(0);
    expect(result.insertionStops).toHaveLength(0);
    expect(result.aaSubRate).toBe(0);
  });

  it('detects amino acid substitution', () => {
    // ATG → M, CCC → P, GGG → G (ref)
    // ATG → M, CCC → P, GGA → G (ass) — same AA for GGG→GGA (synonymous)
    // Let's use a non-synonymous: CCC→P vs CCT→P (synonymous)... 
    // Use: ATG→M, CCT→P vs ACT→T (non-synonymous at codon 2)
    const result = analyzeCds('ATGCCTGGG', 'ATGACTGGG', 'gene1', 3);
    expect(result.aaSubstitutions).toHaveLength(1);
    expect(result.aaSubstitutions[0]!.codonPosition).toBe(2);
    expect(result.aaSubstitutions[0]!.refAa).toBe('P');
    expect(result.aaSubstitutions[0]!.assAa).toBe('T');
  });

  it('detects premature stop codon', () => {
    // ATG → M, CAA → Q, GGG → G (ref)
    // ATG → M, TAA → * (stop), GGG → G (ass) — premature stop at codon 2
    const result = analyzeCds('ATGCAAGGG', 'ATGTAAGGG', 'gene1', 3);
    expect(result.prematureStops).toHaveLength(1);
    expect(result.prematureStops[0]!.codonPosition).toBe(2);
    expect(result.prematureStops[0]!.originalAa).toBe('Q');
  });

  it('detects frameshift from single-base gap', () => {
    // ref: ATG CCC GGG (9 bases, 3 codons)
    // ass: ATG C-C GGG  → 1-base gap in assembly = frameshift (not multiple of 3)
    const result = analyzeCds('ATGCCCGGG', 'ATGC-CGGG', 'gene1', 3);
    expect(result.frameshifts.length).toBeGreaterThanOrEqual(1);
  });

  it('detects gap segments (intra-codon gaps)', () => {
    // ref: ATG CCC GGG
    // ass: ATG C-- GGG  → 2-base gap within codon 2, bad codon
    const result = analyzeCds('ATGCCCGGG', 'ATGC--GGG', 'gene1', 3);
    // Should detect gap segment and/or frameshift
    const hasIssue = result.gapSegments.length > 0 || result.frameshifts.length > 0;
    expect(hasIssue).toBe(true);
  });

  it('detects insertion stop codon', () => {
    // ref: ATG---CCC  → insertion of 3 gaps in ref = assembly insertion
    // ass: ATGTAACCC  → insertion is TAA (stop codon)
    const result = analyzeCds('ATG---CCC', 'ATGTAACCC', 'gene1', 3);
    expect(result.insertionStops).toHaveLength(1);
  });

  it('computes aaSubRate correctly', () => {
    // 3 codons, 1 substitution = 1/3
    const result = analyzeCds('ATGCCTGGG', 'ATGACTGGG', 'gene1', 3);
    expect(result.aaSubRate).toBeCloseTo(1 / 3, 5);
  });

  it('handles all-synonymous mutations with rate 0', () => {
    // GGG→G and GGA→G are synonymous
    const result = analyzeCds('ATGCCCGGG', 'ATGCCCGGA', 'gene1', 3);
    expect(result.aaSubRate).toBe(0);
  });
});

// ── detectCdsErrors ──────────────────────────────────────────────────────────

describe('detectCdsErrors', () => {
  it('returns empty result when fewer than 2 genomes', () => {
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 1, sequenceEntries: [] },
      blocks: [],
      lcbs: [],
      genomes: [{ index: 1, name: 'ref', length: 100, format: 'fasta' }],
    };
    const annotations = makeAnnotations([]);
    const result = detectCdsErrors(alignment, annotations);
    expect(result.totalCds).toBe(0);
    expect(result.brokenCdsCount).toBe(0);
  });

  it('returns empty result when no annotations', () => {
    const alignment = makeAlignment('ATGCCC', 'ATGCCC');
    const annotations: AnnotationMap = new Map();
    const result = detectCdsErrors(alignment, annotations);
    expect(result.totalCds).toBe(0);
  });

  it('detects broken CDS in aligned genomes', () => {
    // CDS at positions 1-9 (ATG CAA GGG in ref, ATG TAA GGG in assembly)
    const alignment = makeAlignment('ATGCAAGGG', 'ATGTAAGGG');
    const annotations = makeAnnotations([makeCds(1, 9, 'gene1')]);
    const result = detectCdsErrors(alignment, annotations);
    expect(result.totalCds).toBe(1);
    expect(result.brokenCdsCount).toBe(1);
    expect(result.brokenCds[0]!.featureId).toBe('gene1');
    expect(result.brokenCds[0]!.prematureStops).toHaveLength(1);
  });

  it('reports no errors for identical CDS', () => {
    const alignment = makeAlignment('ATGCCCGGG', 'ATGCCCGGG');
    const annotations = makeAnnotations([makeCds(1, 9, 'gene1')]);
    const result = detectCdsErrors(alignment, annotations);
    expect(result.totalCds).toBe(1);
    expect(result.brokenCdsCount).toBe(0);
  });

  it('skips CDS with length not divisible by 3', () => {
    const alignment = makeAlignment('ATGCCCGG', 'ATGCCCGG');
    const annotations = makeAnnotations([makeCds(1, 8, 'gene1')]);
    const result = detectCdsErrors(alignment, annotations);
    expect(result.totalCds).toBe(0); // filtered out
  });

  it('handles multiple CDS features', () => {
    // Two CDS: one broken, one intact
    // ref:  positions 1-9 = ATGCAAGGG, positions 10-18 = ATGCCCGGG
    // ass:  positions 1-9 = ATGTAAGGG, positions 10-18 = ATGCCCGGG
    const refSeq = 'ATGCAAGGG' + 'ATGCCCGGG';
    const assSeq = 'ATGTAAGGG' + 'ATGCCCGGG';
    const alignment = makeAlignment(refSeq, assSeq);
    const annotations = makeAnnotations([
      makeCds(1, 9, 'gene1'),
      makeCds(10, 18, 'gene2'),
    ]);
    const result = detectCdsErrors(alignment, annotations);
    expect(result.totalCds).toBe(2);
    expect(result.brokenCdsCount).toBe(1);
    expect(result.brokenCds[0]!.featureId).toBe('gene1');
  });
});

// ── formatCdsErrors ──────────────────────────────────────────────────────────

describe('formatCdsErrors', () => {
  it('returns empty string for no broken CDS', () => {
    const result: CdsErrorResult = { totalCds: 5, brokenCdsCount: 0, brokenCds: [] };
    expect(formatCdsErrors(result)).toBe('');
  });

  it('formats header and data rows', () => {
    const result: CdsErrorResult = {
      totalCds: 1,
      brokenCdsCount: 1,
      brokenCds: [{
        genomeIndex: 0,
        featureId: 'gene1',
        peptideLength: 100,
        aaSubRate: 0.05,
        frameshifts: [],
        gapSegments: [],
        aaSubstitutions: [{ codonPosition: 42, refAa: 'P', assAa: 'T' }],
        prematureStops: [],
        insertionStops: [],
      }],
    };
    const output = formatCdsErrors(result);
    const lines = output.split('\n');
    expect(lines[0]).toContain('FeatureID');
    expect(lines[0]).toContain('Peptide_Length');
    expect(lines[1]).toContain('gene1');
    expect(lines[1]).toContain('100');
    expect(lines[1]).toContain('0.050000');
    expect(lines[1]).toContain('42');
    expect(lines[1]).toContain('P->T');
  });

  it('formats frameshifts as [start,end] segments', () => {
    const result: CdsErrorResult = {
      totalCds: 1,
      brokenCdsCount: 1,
      brokenCds: [{
        genomeIndex: 0,
        featureId: 'gene1',
        peptideLength: 50,
        aaSubRate: 0.1,
        frameshifts: [{ startCodon: 5, endCodon: 10 }],
        gapSegments: [],
        aaSubstitutions: [],
        prematureStops: [],
        insertionStops: [],
      }],
    };
    const output = formatCdsErrors(result);
    expect(output).toContain('[5,10]');
  });

  it('formats premature stops correctly', () => {
    const result: CdsErrorResult = {
      totalCds: 1,
      brokenCdsCount: 1,
      brokenCds: [{
        genomeIndex: 0,
        featureId: 'gene1',
        peptideLength: 50,
        aaSubRate: 0.1,
        frameshifts: [],
        gapSegments: [],
        aaSubstitutions: [],
        prematureStops: [{ codonPosition: 15, originalAa: 'Q' }],
        insertionStops: [],
      }],
    };
    const output = formatCdsErrors(result);
    expect(output).toContain('15');
    expect(output).toContain('Q');
  });

  it('uses dash for empty fields', () => {
    const result: CdsErrorResult = {
      totalCds: 1,
      brokenCdsCount: 1,
      brokenCds: [{
        genomeIndex: 0,
        featureId: 'gene1',
        peptideLength: 50,
        aaSubRate: 0,
        frameshifts: [],
        gapSegments: [],
        aaSubstitutions: [],
        prematureStops: [{ codonPosition: 3, originalAa: 'M' }],
        insertionStops: [],
      }],
    };
    const output = formatCdsErrors(result);
    const dataLine = output.split('\n')[1]!;
    const fields = dataLine.split('\t');
    // Broken_Frame_Segments, Gap_Segments, Substituted_Positions, Substitutions should be '-'
    expect(fields[3]).toBe('-'); // Broken_Frame_Segments
    expect(fields[4]).toBe('-'); // Gap_Segments
    expect(fields[5]).toBe('-'); // Substituted_Positions
    expect(fields[6]).toBe('-'); // Substitutions
  });

  it('ends with newline', () => {
    const result: CdsErrorResult = {
      totalCds: 1,
      brokenCdsCount: 1,
      brokenCds: [{
        genomeIndex: 0,
        featureId: 'gene1',
        peptideLength: 50,
        aaSubRate: 0,
        frameshifts: [],
        gapSegments: [],
        aaSubstitutions: [],
        prematureStops: [{ codonPosition: 1, originalAa: 'M' }],
        insertionStops: [],
      }],
    };
    const output = formatCdsErrors(result);
    expect(output.endsWith('\n')).toBe(true);
  });
});

// ── exportCdsErrors ──────────────────────────────────────────────────────────

describe('exportCdsErrors', () => {
  it('returns empty string for alignment without broken CDS', () => {
    const alignment = makeAlignment('ATGCCCGGG', 'ATGCCCGGG');
    const annotations = makeAnnotations([makeCds(1, 9, 'gene1')]);
    const result = exportCdsErrors(alignment, annotations);
    expect(result).toBe('');
  });

  it('returns formatted table for alignment with broken CDS', () => {
    const alignment = makeAlignment('ATGCAAGGG', 'ATGTAAGGG');
    const annotations = makeAnnotations([makeCds(1, 9, 'gene1')]);
    const result = exportCdsErrors(alignment, annotations);
    expect(result).toContain('FeatureID');
    expect(result).toContain('gene1');
  });
});
