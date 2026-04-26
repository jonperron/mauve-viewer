import { describe, it, expect } from 'vitest';
import { computeContentMetrics } from './content-metrics.ts';
import type { XmfaAlignment, AlignmentBlock } from '../import/xmfa/types.ts';
import type { Genome } from '../import/xmfa/types.ts';
import type { GenomeAnnotations, ContigBoundary } from '../annotations/types.ts';
import type { AnnotationMap } from '../viewer/rendering/annotations.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal 2-genome alignment with one block covering the reference */
function makeTwoGenomeAlignment(
  refSeqIndex: number,
  asmSeqIndex: number,
  refStart: number,
  refEnd: number,
  asmStart: number,
  asmEnd: number,
  refLength = 1000,
  asmLength = 1000,
): XmfaAlignment {
  const blocks: AlignmentBlock[] = [
    {
      segments: [
        {
          sequenceIndex: refSeqIndex,
          start: refStart,
          end: refEnd,
          strand: '+',
          sourceFile: 'ref.fasta',
          sequenceData: 'A'.repeat(refEnd - refStart + 1),
        },
        {
          sequenceIndex: asmSeqIndex,
          start: asmStart,
          end: asmEnd,
          strand: '+',
          sourceFile: 'asm.fasta',
          sequenceData: 'A'.repeat(asmEnd - asmStart + 1),
        },
      ],
    },
  ];

  const genomes: Genome[] = [
    { index: refSeqIndex, name: 'reference', length: refLength, format: 'fasta' },
    { index: asmSeqIndex, name: 'contig1', length: asmLength, format: 'fasta' },
  ];

  return {
    header: { formatVersion: '1', sequenceCount: 2, sequenceEntries: [] },
    blocks,
    lcbs: [],
    genomes,
  };
}

/** Build an alignment with no blocks (reference and assembly are disconnected) */
function makeDisconnectedAlignment(refLength = 1000, asmLength = 500): XmfaAlignment {
  const genomes: Genome[] = [
    { index: 1, name: 'reference', length: refLength, format: 'fasta' },
    { index: 2, name: 'contig1', length: asmLength, format: 'fasta' },
  ];
  return {
    header: { formatVersion: '1', sequenceCount: 2, sequenceEntries: [] },
    blocks: [],
    lcbs: [],
    genomes,
  };
}

function makeAnnotationMap(
  seqIndex: number,
  contigs: ContigBoundary[],
): AnnotationMap {
  const genomeAnnotations: GenomeAnnotations = {
    genomeIndex: seqIndex,
    features: [],
    contigs,
  };
  return new Map([[seqIndex, genomeAnnotations]]);
}

const EMPTY_ANNOTATIONS: AnnotationMap = new Map();

// ---------------------------------------------------------------------------
// Tests — edge cases
// ---------------------------------------------------------------------------

describe('computeContentMetrics', () => {
  it('returns empty metrics when alignment has fewer than 2 genomes', () => {
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 1, sequenceEntries: [] },
      blocks: [],
      lcbs: [],
      genomes: [{ index: 1, name: 'ref', length: 500, format: 'fasta' }],
    };
    const metrics = computeContentMetrics(alignment, EMPTY_ANNOTATIONS);
    expect(metrics.missingChromosomes).toEqual([]);
    expect(metrics.missingChromosomeCount).toBe(0);
    expect(metrics.extraContigs).toEqual([]);
    expect(metrics.extraContigCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Tests — no missing chromosomes / no extra contigs
  // ---------------------------------------------------------------------------

  it('reports no missing chromosomes and no extra contigs when fully aligned', () => {
    // Reference (seqIndex=1) covers 1-1000; assembly (seqIndex=2) aligns to it.
    const alignment = makeTwoGenomeAlignment(1, 2, 1, 1000, 1, 1000);
    const metrics = computeContentMetrics(alignment, EMPTY_ANNOTATIONS);
    expect(metrics.missingChromosomeCount).toBe(0);
    expect(metrics.extraContigCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Tests — missing chromosomes
  // ---------------------------------------------------------------------------

  it('reports the reference as a missing chromosome when no blocks exist', () => {
    const alignment = makeDisconnectedAlignment(500, 300);
    const metrics = computeContentMetrics(alignment, EMPTY_ANNOTATIONS);
    expect(metrics.missingChromosomeCount).toBe(1);
    expect(metrics.missingChromosomes[0]!.name).toBe('reference');
    expect(metrics.missingChromosomes[0]!.chromosomeIndex).toBe(1);
    expect(metrics.missingChromosomes[0]!.length).toBe(500);
  });

  it('uses contig boundaries to detect missing individual chromosomes', () => {
    // Reference genome has 2 chromosomes via contig boundaries:
    //   chr1: positions 1–500
    //   chr2: positions 501–1000
    // The alignment block only covers chr1 (positions 1-500).
    const alignment = makeTwoGenomeAlignment(1, 2, 1, 500, 1, 500, 1000, 500);
    const annotations = makeAnnotationMap(1, [
      { position: 1, name: 'chr1' },
      { position: 501, name: 'chr2' },
    ]);
    const metrics = computeContentMetrics(alignment, annotations);
    expect(metrics.missingChromosomeCount).toBe(1);
    expect(metrics.missingChromosomes[0]!.name).toBe('chr2');
    expect(metrics.missingChromosomes[0]!.chromosomeIndex).toBe(2);
    expect(metrics.missingChromosomes[0]!.length).toBe(500);
  });

  it('reports no missing chromosomes when all chromosome regions are covered', () => {
    // Two chromosomes; separate alignment blocks cover each.
    const blocks: AlignmentBlock[] = [
      {
        segments: [
          {
            sequenceIndex: 1,
            start: 1,
            end: 500,
            strand: '+',
            sourceFile: 'ref.fasta',
            sequenceData: 'A'.repeat(500),
          },
          {
            sequenceIndex: 2,
            start: 1,
            end: 500,
            strand: '+',
            sourceFile: 'asm.fasta',
            sequenceData: 'A'.repeat(500),
          },
        ],
      },
      {
        segments: [
          {
            sequenceIndex: 1,
            start: 501,
            end: 1000,
            strand: '+',
            sourceFile: 'ref.fasta',
            sequenceData: 'A'.repeat(500),
          },
          {
            sequenceIndex: 2,
            start: 501,
            end: 1000,
            strand: '+',
            sourceFile: 'asm.fasta',
            sequenceData: 'A'.repeat(500),
          },
        ],
      },
    ];
    const genomes: Genome[] = [
      { index: 1, name: 'reference', length: 1000, format: 'fasta' },
      { index: 2, name: 'contig1', length: 1000, format: 'fasta' },
    ];
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 2, sequenceEntries: [] },
      blocks,
      lcbs: [],
      genomes,
    };
    const annotations = makeAnnotationMap(1, [
      { position: 1, name: 'chr1' },
      { position: 501, name: 'chr2' },
    ]);
    const metrics = computeContentMetrics(alignment, annotations);
    expect(metrics.missingChromosomeCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Tests — extra contigs
  // ---------------------------------------------------------------------------

  it('reports an extra contig when the assembly genome has no alignment blocks', () => {
    const alignment = makeDisconnectedAlignment(500, 300);
    const metrics = computeContentMetrics(alignment, EMPTY_ANNOTATIONS);
    expect(metrics.extraContigCount).toBe(1);
    expect(metrics.extraContigs[0]!.name).toBe('contig1');
    expect(metrics.extraContigs[0]!.genomeIndex).toBe(2);
    expect(metrics.extraContigs[0]!.length).toBe(300);
  });

  it('reports multiple extra contigs when several assembly genomes are unaligned', () => {
    const genomes: Genome[] = [
      { index: 1, name: 'reference', length: 1000, format: 'fasta' },
      { index: 2, name: 'contig1', length: 300, format: 'fasta' },
      { index: 3, name: 'contig2', length: 200, format: 'fasta' },
    ];
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 3, sequenceEntries: [] },
      blocks: [],
      lcbs: [],
      genomes,
    };
    const metrics = computeContentMetrics(alignment, EMPTY_ANNOTATIONS);
    expect(metrics.extraContigCount).toBe(2);
    const names = metrics.extraContigs.map((c) => c.name);
    expect(names).toContain('contig1');
    expect(names).toContain('contig2');
  });

  it('does not report assembly contig as extra when it aligns to reference', () => {
    const alignment = makeTwoGenomeAlignment(1, 2, 1, 1000, 1, 1000);
    const metrics = computeContentMetrics(alignment, EMPTY_ANNOTATIONS);
    expect(metrics.extraContigCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Tests — reference-only blocks do not count as assembly coverage
  // ---------------------------------------------------------------------------

  it('treats reference-only blocks as missing chromosome coverage', () => {
    // Block has only the reference segment (no assembly segment).
    const blocks: AlignmentBlock[] = [
      {
        segments: [
          {
            sequenceIndex: 1,
            start: 1,
            end: 1000,
            strand: '+',
            sourceFile: 'ref.fasta',
            sequenceData: 'A'.repeat(1000),
          },
        ],
      },
    ];
    const genomes: Genome[] = [
      { index: 1, name: 'reference', length: 1000, format: 'fasta' },
      { index: 2, name: 'contig1', length: 500, format: 'fasta' },
    ];
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 2, sequenceEntries: [] },
      blocks,
      lcbs: [],
      genomes,
    };
    const metrics = computeContentMetrics(alignment, EMPTY_ANNOTATIONS);
    // Reference is covered only by a reference-only block → missing chromosome.
    expect(metrics.missingChromosomeCount).toBe(1);
    // Assembly contig has no blocks with reference → extra contig.
    expect(metrics.extraContigCount).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Tests — chromosomeIndex numbering
  // ---------------------------------------------------------------------------

  it('assigns 1-based chromosomeIndex values in boundary order', () => {
    const alignment = makeDisconnectedAlignment(900);
    const annotations = makeAnnotationMap(1, [
      { position: 1, name: 'chrA' },
      { position: 301, name: 'chrB' },
      { position: 601, name: 'chrC' },
    ]);
    const metrics = computeContentMetrics(alignment, annotations);
    expect(metrics.missingChromosomeCount).toBe(3);
    const indices = metrics.missingChromosomes.map((c) => c.chromosomeIndex);
    expect(indices).toEqual([1, 2, 3]);
  });
});
