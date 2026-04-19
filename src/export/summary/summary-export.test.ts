import { describe, it, expect, vi } from 'vitest';
import type { BackboneSegment } from '../../import/backbone/types.ts';
import type { Lcb, Genome, XmfaAlignment } from '../../import/xmfa/types.ts';
import type { GenomeAnnotations, GenomicFeature } from '../../annotations/types.ts';
import { runSummaryPipeline, exportSummary, buildSummaryBlobUrl } from './summary-export.ts';
import { extractPartialFasta } from './partial-fasta.ts';
import { formatTroubleBackbone, findTroubleBackbone } from './trouble-backbone.ts';
import { formatIslandCoordinates, formatIslandFeatures, formatIslandGeneFeatures } from './island-output.ts';
import { formatOverview, countGenesByMultiplicity } from './overview.ts';
import { processSegments } from './segment-processor.ts';
import type { SummaryOptions } from './types.ts';
import { DEFAULT_SUMMARY_OPTIONS } from './types.ts';

// ── Test data builders ───────────────────────────────────────────────────────

function makeLcb(id: number, lefts: number[], rights: number[], reverses: boolean[], weight = 1): Lcb {
  return { id, left: lefts, right: rights, reverse: reverses, weight };
}

function makeBackbone(seqIndex: number, intervals: [number, number][]): BackboneSegment {
  return {
    seqIndex,
    intervals: intervals.map(([l, r]) => ({ leftEnd: l, rightEnd: r })),
    isBackbone: intervals.every(([l]) => l > 0),
  };
}

function makeGenome(index: number, length: number, name?: string): Genome {
  return { index, name: name ?? `Genome_${index}`, length, format: 'FASTA' };
}

function makeFeature(type: string, start: number, end: number, locusTag: string): GenomicFeature {
  return {
    type: type as GenomicFeature['type'],
    start, end,
    strand: '+',
    qualifiers: { locus_tag: locusTag },
  };
}

function makeAnnotations(genomeIndex: number, features: GenomicFeature[]): GenomeAnnotations {
  return { genomeIndex, features, contigs: [] };
}

// ── Overview tests ───────────────────────────────────────────────────────────

describe('formatOverview', () => {
  it('includes reference genome info and column headers', () => {
    const genomes = [makeGenome(0, 1000), makeGenome(1, 1000)];
    // Genome 1 has reverse → only genome 0 qualifies as reference
    const lcbs = [makeLcb(1, [100, 200], [500, 600], [false, true])];
    const backbone = [makeBackbone(1, [[100, 500], [200, 600]])];
    const { chains, referenceGenome } = processSegments(backbone, lcbs, genomes);

    const result = formatOverview(chains, genomes, undefined, DEFAULT_SUMMARY_OPTIONS, referenceGenome);

    expect(result).toContain('Sequence 0 is the reference sequence.');
    expect(result).toContain('num_genes');
    expect(result).toContain('num_segments');
    expect(result).toContain('Genome 0:');
    expect(result).toContain('Genome 1:');
  });

  it('counts genes by multiplicity when annotations provided', () => {
    const genomes = [makeGenome(0, 1000)];
    const lcbs = [makeLcb(1, [200], [800], [false])];
    const backbone = [makeBackbone(1, [[200, 800]])];
    const annotations = [
      makeAnnotations(0, [
        makeFeature('CDS', 300, 400, 'gene1'),  // inside backbone
        makeFeature('CDS', 50, 100, 'gene2'),   // inside island
      ]),
    ];
    const { chains, referenceGenome } = processSegments(backbone, lcbs, genomes);
    const result = formatOverview(chains, genomes, annotations, DEFAULT_SUMMARY_OPTIONS, referenceGenome);

    // Should have gene counts for different multiplicities
    expect(result).toContain('Totals');
  });
});

describe('countGenesByMultiplicity', () => {
  it('assigns genes to segments based on overlap', () => {
    const genomes = [makeGenome(0, 1000)];
    const lcbs = [makeLcb(1, [200], [800], [false])];
    const backbone = [makeBackbone(1, [[200, 800]])];
    const { chains } = processSegments(backbone, lcbs, genomes);

    const features = [
      makeFeature('CDS', 300, 400, 'gene1'),  // inside backbone [200-800]
      makeFeature('CDS', 50, 100, 'gene2'),   // inside island [1-199]
    ];

    const counts = countGenesByMultiplicity(chains[0]!, features, 0, 0.5);
    const total = [...counts.values()].reduce((s, c) => s + c, 0);
    expect(total).toBe(2);
  });

  it('respects minimum percent contained', () => {
    const genomes = [makeGenome(0, 1000), makeGenome(1, 1000)];
    const lcbs = [makeLcb(1, [100, 100], [200, 200], [false, false])];
    const backbone = [makeBackbone(1, [[100, 200], [100, 200]])];
    const { chains } = processSegments(backbone, lcbs, genomes);

    // Feature spans 150-300, 151 bp long
    // Backbone [100-200] overlap: 51/151 = 33.8% < 80%
    // Island [201-1000] overlap: 100/151 = 66.2% < 80%
    // With 0.8 threshold → not assigned to any segment
    const features = [makeFeature('CDS', 150, 300, 'gene1')];
    const counts = countGenesByMultiplicity(chains[0]!, features, 0, 0.8);
    expect([...counts.values()].reduce((s, c) => s + c, 0)).toBe(0);
  });
});

// ── Island coordinate tests ──────────────────────────────────────────────────

describe('formatIslandCoordinates', () => {
  it('lists non-backbone segments with coordinates', () => {
    const genomes = [makeGenome(0, 1000), makeGenome(1, 1000)];
    // Genome 1 has reverse → genome 0 is reference
    const lcbs = [makeLcb(1, [200, 300], [800, 700], [false, true])];
    const backbone = [makeBackbone(1, [[200, 800], [300, 700]])];
    const { chains, referenceGenome } = processSegments(backbone, lcbs, genomes);

    const result = formatIslandCoordinates(chains, genomes, DEFAULT_SUMMARY_OPTIONS, referenceGenome);

    expect(result).toContain('Sequence 0 is the reference sequence.');
    expect(result).toContain('seq0_left');
    expect(result).toContain('label');
    // Should have island entries (i_ prefix)
    expect(result).toMatch(/i_\d+/);
  });

  it('excludes backbone segments', () => {
    const genomes = [makeGenome(0, 1000), makeGenome(1, 1000)];
    const lcbs = [makeLcb(1, [1, 1], [1000, 1000], [false, false])];
    const backbone = [makeBackbone(1, [[1, 1000], [1, 1000]])];
    const { chains, referenceGenome } = processSegments(backbone, lcbs, genomes);

    const result = formatIslandCoordinates(chains, genomes, DEFAULT_SUMMARY_OPTIONS, referenceGenome);

    // No non-backbone segments → only header lines
    expect(result).not.toMatch(/i_\d+/);
  });
});

// ── Island features tests ────────────────────────────────────────────────────

describe('formatIslandFeatures', () => {
  it('lists islands for a specific genome', () => {
    // Need 2+ genomes so islands have a different mask than allGenomesMask
    const genomes = [makeGenome(0, 1000, 'MyGenome'), makeGenome(1, 1000, 'Other')];
    const lcbs = [makeLcb(1, [200, 200], [800, 800], [false, false])];
    const backbone = [makeBackbone(1, [[200, 800], [200, 800]])];
    const { chains } = processSegments(backbone, lcbs, genomes);

    const result = formatIslandFeatures(chains[0]!, 0, genomes, [], DEFAULT_SUMMARY_OPTIONS);

    expect(result).toContain('type\tlabel\tcontig\tstrand\tleft\tright\tmultiplicity');
    expect(result).toContain('island');
    expect(result).toContain('MyGenome');
  });
});

// ── Island gene features tests ───────────────────────────────────────────────

describe('formatIslandGeneFeatures', () => {
  it('lists genes in island segments', () => {
    // Need 2+ genomes so islands have a different mask than allGenomesMask
    const genomes = [makeGenome(0, 1000, 'MyGenome'), makeGenome(1, 1000, 'Other')];
    const lcbs = [makeLcb(1, [200, 200], [800, 800], [false, false])];
    const backbone = [makeBackbone(1, [[200, 800], [200, 800]])];
    const { chains } = processSegments(backbone, lcbs, genomes);

    const annotations = makeAnnotations(0, [
      makeFeature('CDS', 50, 100, 'island_gene1'),
    ]);

    const result = formatIslandGeneFeatures(
      chains[0]!, 0, genomes, annotations, [], DEFAULT_SUMMARY_OPTIONS, false,
    );

    expect(result).toContain('island_gene1');
    expect(result).toContain('island_gene');
  });

  it('lists genes in backbone segments when isBackbone=true', () => {
    // Need 2+ genomes so backbone has allGenomesMask distinction
    const genomes = [makeGenome(0, 1000, 'MyGenome'), makeGenome(1, 1000, 'Other')];
    const lcbs = [makeLcb(1, [200, 200], [800, 800], [false, false])];
    const backbone = [makeBackbone(1, [[200, 800], [200, 800]])];
    const { chains } = processSegments(backbone, lcbs, genomes);

    const annotations = makeAnnotations(0, [
      makeFeature('CDS', 300, 400, 'bb_gene1'),
    ]);

    const result = formatIslandGeneFeatures(
      chains[0]!, 0, genomes, annotations, [], DEFAULT_SUMMARY_OPTIONS, true,
    );

    expect(result).toContain('bb_gene1');
  });
});

// ── Trouble backbone tests ───────────────────────────────────────────────────

describe('findTroubleBackbone', () => {
  it('identifies backbone segments with high length variance', () => {
    const genomes = [makeGenome(0, 1000), makeGenome(1, 1000)];
    const lcbs = [
      makeLcb(1, [100, 100], [200, 600], [false, false]),
    ];
    const backbone = [makeBackbone(1, [[100, 200], [100, 600]])];
    const { allSegments } = processSegments(backbone, lcbs, genomes);

    const options: SummaryOptions = { ...DEFAULT_SUMMARY_OPTIONS, maxLengthRatio: 1.0 };
    const records = findTroubleBackbone(allSegments, 2, options);

    // Lengths: 101 vs 501, diff=400, avg=301, ratio=1.33 > 1.0
    expect(records.length).toBe(1);
    expect(records[0]!.lengthRatio).toBeGreaterThan(1.0);
  });

  it('does not flag segments with similar lengths', () => {
    const genomes = [makeGenome(0, 1000), makeGenome(1, 1000)];
    const lcbs = [
      makeLcb(1, [100, 100], [200, 210], [false, false]),
    ];
    const backbone = [makeBackbone(1, [[100, 200], [100, 210]])];
    const { allSegments } = processSegments(backbone, lcbs, genomes);

    const records = findTroubleBackbone(allSegments, 2, DEFAULT_SUMMARY_OPTIONS);
    expect(records.length).toBe(0);
  });
});

describe('formatTroubleBackbone', () => {
  it('produces tab-delimited output with headers', () => {
    const genomes = [makeGenome(0, 1000), makeGenome(1, 1000)];
    const lcbs = [makeLcb(1, [100, 100], [200, 900], [false, false])];
    const backbone = [makeBackbone(1, [[100, 200], [100, 900]])];
    const { allSegments, referenceGenome } = processSegments(backbone, lcbs, genomes);

    const options: SummaryOptions = { ...DEFAULT_SUMMARY_OPTIONS, maxLengthRatio: 0.5 };
    const result = formatTroubleBackbone(allSegments, 2, options, referenceGenome);

    expect(result).toContain('seq0_left');
    expect(result).toContain('avg_lngth');
    expect(result).toContain('diff_to_lngth');
  });
});

// ── Partial FASTA tests ──────────────────────────────────────────────────────

describe('extractPartialFasta', () => {
  it('extracts bases from alignment blocks covering the region', () => {
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 1, sequenceEntries: [] },
      blocks: [{
        segments: [{
          sequenceIndex: 0,
          start: 10,
          end: 20,
          strand: '+',
          sourceFile: 'test',
          sequenceData: 'ATCGATCGATC',
        }],
      }],
      lcbs: [],
      genomes: [makeGenome(0, 100, 'TestGenome')],
    };

    const result = extractPartialFasta(alignment, [
      { genomeIndex: 0, start: 10, end: 20 },
    ]);

    expect(result).toContain('>TestGenome:10-20');
    expect(result).toContain('ATCGATCGATC');
  });

  it('returns empty string for no regions', () => {
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 0, sequenceEntries: [] },
      blocks: [],
      lcbs: [],
      genomes: [],
    };

    expect(extractPartialFasta(alignment, [])).toBe('');
  });
});

// ── Full pipeline integration test ───────────────────────────────────────────

describe('runSummaryPipeline', () => {
  it('produces all output files', () => {
    const genomes = [makeGenome(0, 1000, 'GenomeA'), makeGenome(1, 1000, 'GenomeB')];
    const lcbs = [
      makeLcb(1, [200, 300], [800, 700], [false, false]),
    ];
    const backbone = [makeBackbone(1, [[200, 800], [300, 700]])];
    const annotations = [
      makeAnnotations(0, [
        makeFeature('CDS', 50, 100, 'geneA1'),
        makeFeature('CDS', 300, 400, 'geneA2'),
      ]),
      makeAnnotations(1, [
        makeFeature('CDS', 400, 500, 'geneB1'),
      ]),
    ];

    const result = runSummaryPipeline({
      backboneSegments: backbone,
      lcbs,
      genomes,
      annotations,
    });

    // Overview should exist and contain genome info
    expect(result.overview).toContain('GenomeA');
    expect(result.overview).toContain('GenomeB');

    // Island coordinates
    expect(result.islandCoordinates).toContain('label');

    // Per-genome outputs
    expect(result.islandFeatures).toHaveLength(2);
    expect(result.islandGenes).toHaveLength(2);
    expect(result.backboneGenes).toHaveLength(2);

    // Trouble backbone
    expect(result.troubleBackbone).toContain('avg_lngth');
  });

  it('handles alignment with no backbone', () => {
    const genomes = [makeGenome(0, 100)];
    const result = runSummaryPipeline({
      backboneSegments: [],
      lcbs: [],
      genomes,
    });

    expect(result.overview).toContain('Genome 0');
    expect(result.islandFeatures).toHaveLength(1);
  });
});

// ── exportSummary tests ──────────────────────────────────────────────────────

describe('exportSummary', () => {
  it('downloads a single ZIP file with all outputs', () => {
    vi.useFakeTimers();
    // Mock DOM elements needed by downloadZip
    const clickSpy = vi.fn();
    const anchorMock = {
      href: '',
      download: '',
      style: { display: '' },
      click: clickSpy,
    } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchorMock as unknown as HTMLElement);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const genomes = [makeGenome(0, 1000, 'GenomeA'), makeGenome(1, 1000, 'GenomeB')];
    const lcbs = [makeLcb(1, [200, 300], [800, 700], [false, false])];
    const backbone = [makeBackbone(1, [[200, 800], [300, 700]])];
    const annotations = [
      makeAnnotations(0, [makeFeature('CDS', 50, 100, 'geneA1')]),
      makeAnnotations(1, [makeFeature('CDS', 400, 500, 'geneB1')]),
    ];

    const result = runSummaryPipeline({ backboneSegments: backbone, lcbs, genomes, annotations });
    exportSummary(result, 'test');

    // Should trigger exactly one download (the ZIP)
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(anchorMock.download).toBe('test_summary.zip');

    vi.advanceTimersByTime(200);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
});

// ── buildSummaryBlobUrl tests ─────────────────────────────────────────────────

describe('buildSummaryBlobUrl', () => {
  it('returns a blob URL, filename, and revoke function', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-id');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const genomes = [makeGenome(0, 1000, 'GenomeA'), makeGenome(1, 1000, 'GenomeB')];
    const lcbs = [makeLcb(1, [200, 300], [800, 700], [false, false])];
    const backbone = [makeBackbone(1, [[200, 800], [300, 700]])];

    const result = runSummaryPipeline({ backboneSegments: backbone, lcbs, genomes });
    const blobResult = buildSummaryBlobUrl(result, 'test');

    expect(blobResult.blobUrl).toBe('blob:test-id');
    expect(blobResult.filename).toBe('test_summary.zip');
    expect(typeof blobResult.revoke).toBe('function');

    blobResult.revoke();
    expect(revokeSpy).toHaveBeenCalledWith('blob:test-id');

    vi.restoreAllMocks();
  });
});

// ── Reverse strand FASTA test ────────────────────────────────────────────────

describe('extractPartialFasta reverse strand', () => {
  it('extracts bases from reverse-strand segments', () => {
    const alignment: XmfaAlignment = {
      header: { formatVersion: '1', sequenceCount: 1, sequenceEntries: [] },
      blocks: [{
        segments: [{
          sequenceIndex: 0,
          start: 10,
          end: 14,
          strand: '-',
          sourceFile: 'test',
          sequenceData: 'ATCGA',
        }],
      }],
      lcbs: [],
      genomes: [makeGenome(0, 100, 'RevGenome')],
    };

    const result = extractPartialFasta(alignment, [
      { genomeIndex: 0, start: 10, end: 14 },
    ]);

    expect(result).toContain('>RevGenome:10-14');
    // Reverse strand: positions go 14,13,12,11,10
    expect(result).toContain('ATCGA');
  });
});

// ── Contig resolution in island features ─────────────────────────────────────

describe('formatIslandFeatures with contigs', () => {
  it('resolves positions to contig names', () => {
    const genomes = [makeGenome(0, 1000, 'MyGenome'), makeGenome(1, 1000, 'Other')];
    const lcbs = [makeLcb(1, [200, 200], [800, 800], [false, false])];
    const backbone = [makeBackbone(1, [[200, 800], [200, 800]])];
    const { chains } = processSegments(backbone, lcbs, genomes);

    const contigs = [
      { position: 1, name: 'contig1' },
      { position: 500, name: 'contig2' },
    ];

    const result = formatIslandFeatures(chains[0]!, 0, genomes, contigs, DEFAULT_SUMMARY_OPTIONS);

    expect(result).toContain('contig1');
    // Island [801-1000] should resolve to contig2
    expect(result).toContain('contig2');
  });
});

describe('formatIslandGeneFeatures with contigs', () => {
  it('resolves gene positions to contig names', () => {
    const genomes = [makeGenome(0, 1000, 'MyGenome'), makeGenome(1, 1000, 'Other')];
    const lcbs = [makeLcb(1, [200, 200], [800, 800], [false, false])];
    const backbone = [makeBackbone(1, [[200, 800], [200, 800]])];
    const { chains } = processSegments(backbone, lcbs, genomes);

    const contigs = [
      { position: 1, name: 'ctg_A' },
      { position: 500, name: 'ctg_B' },
    ];
    const annotations = makeAnnotations(0, [
      makeFeature('CDS', 50, 100, 'gene_in_ctgA'),
    ]);

    const result = formatIslandGeneFeatures(
      chains[0]!, 0, genomes, annotations, contigs, DEFAULT_SUMMARY_OPTIONS, false,
    );

    expect(result).toContain('gene_in_ctgA');
    expect(result).toContain('ctg_A');
  });
});
