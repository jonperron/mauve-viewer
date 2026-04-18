import { describe, expect, it } from 'vitest';
import {
  extractHomologs,
  formatHomologTable,
  exportHomologs,
} from './homolog-export.ts';
import type { XmfaAlignment, Lcb, Genome, AlignmentBlock, AlignedSegment } from '../import/xmfa/types.ts';
import type { BackboneSegment } from '../import/backbone/types.ts';
import type { GenomicFeature, GenomeAnnotations } from '../annotations/types.ts';
import type { HomologExportParameters } from './homolog-export.ts';

function makeLcb(
  id: number,
  left: readonly number[],
  right: readonly number[],
  reverse: readonly boolean[],
  weight = 1,
): Lcb {
  return { id, left, right, reverse, weight };
}

function makeGenomes(count: number): readonly Genome[] {
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    name: `genome${i}`,
    length: 10000,
    format: 'fasta',
  }));
}

function makeSegment(
  sequenceIndex: number,
  start: number,
  end: number,
  strand: '+' | '-',
  sequenceData: string,
): AlignedSegment {
  return { sequenceIndex, start, end, strand, sourceFile: `genome${sequenceIndex}`, sequenceData };
}

function makeBlock(segments: readonly AlignedSegment[]): AlignmentBlock {
  return { segments };
}

function makeFeature(
  type: GenomicFeature['type'],
  start: number,
  end: number,
  strand: '+' | '-',
  locusTag: string,
): GenomicFeature {
  return { type, start, end, strand, qualifiers: { locus_tag: locusTag } };
}

function makeAnnotations(
  genomeIndex: number,
  features: readonly GenomicFeature[],
): GenomeAnnotations {
  return { genomeIndex, features, contigs: [] };
}

function makeBackboneSegment(
  seqIndex: number,
  intervals: readonly { readonly leftEnd: number; readonly rightEnd: number }[],
  isBackbone = true,
): BackboneSegment {
  return { seqIndex, intervals, isBackbone };
}

function makeAlignment(
  lcbs: readonly Lcb[],
  genomes: readonly Genome[],
  blocks: readonly AlignmentBlock[] = [],
): XmfaAlignment {
  return {
    header: { formatVersion: '1', sequenceCount: genomes.length, sequenceEntries: [] },
    blocks,
    lcbs,
    genomes,
  };
}

describe('extractHomologs', () => {
  it('finds a simple 1:1 ortholog pair between two genomes', () => {
    const genomes = makeGenomes(2);
    const lcbs = [makeLcb(0, [100, 200], [500, 600], [false, false])];

    // Backbone covering both genomes for this LCB
    const backbone = [
      makeBackboneSegment(0, [
        { leftEnd: 100, rightEnd: 500 },
        { leftEnd: 200, rightEnd: 600 },
      ]),
    ];

    // Block with aligned data — high identity, 20bp covering the 20bp features
    const blocks = [
      makeBlock([
        makeSegment(0, 150, 169, '+', 'ATCGATCGATCGATCGATCG'),
        makeSegment(1, 250, 269, '+', 'ATCGATCGATCGATCGATCG'),
      ]),
    ];

    const annotations = new Map<number, GenomeAnnotations>([
      [0, makeAnnotations(0, [makeFeature('CDS', 150, 170, '+', 'gene_A')])],
      [1, makeAnnotations(1, [makeFeature('CDS', 250, 270, '+', 'gene_B')])],
    ]);

    const alignment = makeAlignment(lcbs, genomes, blocks);
    const params: HomologExportParameters = {
      minIdentity: 0.6,
      maxIdentity: 1.0,
      minCoverage: 0.7,
      maxCoverage: 1.0,
      featureType: 'CDS',
    };

    const result = extractHomologs(alignment, backbone, annotations, params);
    expect(result.groups.length).toBeGreaterThanOrEqual(1);

    // At least one group should contain features from both genomes
    const multiGenomeGroup = result.groups.find(
      (g) => g.members.some((m) => m.genomeIndex === 0) && g.members.some((m) => m.genomeIndex === 1),
    );
    expect(multiGenomeGroup).toBeDefined();
  });

  it('returns singletons for features with no orthologs', () => {
    const genomes = makeGenomes(2);
    const lcbs = [makeLcb(0, [100, 200], [500, 600], [false, false])];

    const backbone = [
      makeBackboneSegment(0, [
        { leftEnd: 100, rightEnd: 500 },
        { leftEnd: 200, rightEnd: 600 },
      ]),
    ];

    // Block with completely different sequences — zero identity
    const blocks = [
      makeBlock([
        makeSegment(0, 150, 160, '+', 'AAAAAAAAAA'),
        makeSegment(1, 250, 260, '+', 'CCCCCCCCCC'),
      ]),
    ];

    const annotations = new Map<number, GenomeAnnotations>([
      [0, makeAnnotations(0, [makeFeature('CDS', 150, 160, '+', 'gene_A')])],
      [1, makeAnnotations(1, [makeFeature('CDS', 250, 260, '+', 'gene_B')])],
    ]);

    const alignment = makeAlignment(lcbs, genomes, blocks);
    const params: HomologExportParameters = {
      minIdentity: 0.9,
      maxIdentity: 1.0,
      minCoverage: 0.7,
      maxCoverage: 1.0,
      featureType: 'CDS',
    };

    const result = extractHomologs(alignment, backbone, annotations, params);
    // Both features should appear as singletons
    expect(result.singletons.length).toBe(2);
  });

  it('returns empty results when no annotations exist', () => {
    const genomes = makeGenomes(2);
    const lcbs = [makeLcb(0, [100, 200], [500, 600], [false, false])];
    const backbone = [
      makeBackboneSegment(0, [
        { leftEnd: 100, rightEnd: 500 },
        { leftEnd: 200, rightEnd: 600 },
      ]),
    ];
    const blocks = [
      makeBlock([
        makeSegment(0, 150, 250, '+', 'ATCGATCGATCG'),
        makeSegment(1, 250, 350, '+', 'ATCGATCGATCG'),
      ]),
    ];

    const annotations = new Map<number, GenomeAnnotations>();
    const alignment = makeAlignment(lcbs, genomes, blocks);

    const result = extractHomologs(alignment, backbone, annotations);
    expect(result.groups).toHaveLength(0);
    expect(result.singletons).toHaveLength(0);
  });

  it('filters by feature type', () => {
    const genomes = makeGenomes(2);
    const lcbs = [makeLcb(0, [100, 200], [500, 600], [false, false])];
    const backbone = [
      makeBackboneSegment(0, [
        { leftEnd: 100, rightEnd: 500 },
        { leftEnd: 200, rightEnd: 600 },
      ]),
    ];
    const blocks = [
      makeBlock([
        makeSegment(0, 150, 169, '+', 'ATCGATCGATCGATCGATCG'),
        makeSegment(1, 250, 269, '+', 'ATCGATCGATCGATCGATCG'),
      ]),
    ];

    const annotations = new Map<number, GenomeAnnotations>([
      [0, makeAnnotations(0, [
        makeFeature('CDS', 150, 170, '+', 'cds_A'),
        makeFeature('tRNA', 300, 320, '+', 'trna_A'),
      ])],
      [1, makeAnnotations(1, [
        makeFeature('CDS', 250, 270, '+', 'cds_B'),
        makeFeature('tRNA', 400, 420, '+', 'trna_B'),
      ])],
    ]);

    const alignment = makeAlignment(lcbs, genomes, blocks);
    const params: HomologExportParameters = {
      minIdentity: 0.6,
      maxIdentity: 1.0,
      minCoverage: 0.5,
      maxCoverage: 1.0,
      featureType: 'tRNA',
    };

    const result = extractHomologs(alignment, backbone, annotations, params);
    // Only tRNA features should be included
    for (const group of result.groups) {
      for (const member of group.members) {
        expect(member.featureType).toBe('tRNA');
      }
    }
    for (const singleton of result.singletons) {
      expect(singleton.featureType).toBe('tRNA');
    }
  });

  it('applies transitive closure: A↔B and B↔C yields group {A,B,C}', () => {
    // 3 genomes with overlapping backbone in pairs
    const genomes = makeGenomes(3);
    const lcbs = [
      makeLcb(0, [100, 200, 300], [500, 600, 700], [false, false, false]),
    ];
    const backbone = [
      makeBackboneSegment(0, [
        { leftEnd: 100, rightEnd: 500 },
        { leftEnd: 200, rightEnd: 600 },
        { leftEnd: 300, rightEnd: 700 },
      ]),
    ];

    // All three genomes share identical sequences at overlapping positions
    const seq = 'ATCGATCGATCGATCGATCG';
    const blocks = [
      makeBlock([
        makeSegment(0, 150, 169, '+', seq),
        makeSegment(1, 250, 269, '+', seq),
        makeSegment(2, 350, 369, '+', seq),
      ]),
    ];

    const annotations = new Map<number, GenomeAnnotations>([
      [0, makeAnnotations(0, [makeFeature('CDS', 150, 170, '+', 'gene_A')])],
      [1, makeAnnotations(1, [makeFeature('CDS', 250, 270, '+', 'gene_B')])],
      [2, makeAnnotations(2, [makeFeature('CDS', 350, 370, '+', 'gene_C')])],
    ]);

    const alignment = makeAlignment(lcbs, genomes, blocks);
    const params: HomologExportParameters = {
      minIdentity: 0.6,
      maxIdentity: 1.0,
      minCoverage: 0.5,
      maxCoverage: 1.0,
      featureType: 'CDS',
    };

    const result = extractHomologs(alignment, backbone, annotations, params);

    // Should have a group with members from all 3 genomes (via transitivity)
    const tripleGroup = result.groups.find(
      (g) => {
        const gIndices = new Set(g.members.map((m) => m.genomeIndex));
        return gIndices.size === 3;
      },
    );
    expect(tripleGroup).toBeDefined();
  });

  it('respects coverage thresholds', () => {
    const genomes = makeGenomes(2);
    const lcbs = [makeLcb(0, [100, 200], [500, 600], [false, false])];
    const backbone = [
      makeBackboneSegment(0, [
        { leftEnd: 100, rightEnd: 500 },
        { leftEnd: 200, rightEnd: 600 },
      ]),
    ];

    // Short overlapping alignment relative to CDS size
    const blocks = [
      makeBlock([
        makeSegment(0, 150, 155, '+', 'ATCGA'),
        makeSegment(1, 250, 255, '+', 'ATCGA'),
      ]),
    ];

    // CDS features are much larger than the aligned region
    const annotations = new Map<number, GenomeAnnotations>([
      [0, makeAnnotations(0, [makeFeature('CDS', 100, 400, '+', 'big_gene_A')])],
      [1, makeAnnotations(1, [makeFeature('CDS', 200, 500, '+', 'big_gene_B')])],
    ]);

    const alignment = makeAlignment(lcbs, genomes, blocks);

    // Require 90% coverage - the 5bp overlap on 300bp CDS = ~1.7% → should fail
    const params: HomologExportParameters = {
      minIdentity: 0.0,
      maxIdentity: 1.0,
      minCoverage: 0.9,
      maxCoverage: 1.0,
      featureType: 'CDS',
    };

    const result = extractHomologs(alignment, backbone, annotations, params);
    expect(result.groups).toHaveLength(0);
    expect(result.singletons).toHaveLength(2);
  });
});

describe('formatHomologTable', () => {
  it('formats homolog groups as tab-delimited text', () => {
    const output = formatHomologTable({
      groups: [
        {
          members: [
            { genomeIndex: 0, locusTag: 'gene_A', left: 150, right: 250, featureType: 'CDS' },
            { genomeIndex: 1, locusTag: 'gene_B', left: 250, right: 350, featureType: 'CDS' },
          ],
        },
      ],
      singletons: [
        { genomeIndex: 2, locusTag: 'gene_C', left: 400, right: 500, featureType: 'CDS' },
      ],
    });

    const lines = output.trim().split('\n');
    // Group line: members separated by tabs
    expect(lines[0]).toContain('0:gene_A:150-250');
    expect(lines[0]).toContain('1:gene_B:250-350');
    // Singleton line
    expect(lines[1]).toBe('2:gene_C:400-500');
  });

  it('returns empty string for empty results', () => {
    const output = formatHomologTable({ groups: [], singletons: [] });
    expect(output).toBe('');
  });

  it('handles groups with multiple members from same genome', () => {
    const output = formatHomologTable({
      groups: [
        {
          members: [
            { genomeIndex: 0, locusTag: 'gene_A1', left: 100, right: 200, featureType: 'CDS' },
            { genomeIndex: 0, locusTag: 'gene_A2', left: 300, right: 400, featureType: 'CDS' },
            { genomeIndex: 1, locusTag: 'gene_B', left: 200, right: 300, featureType: 'CDS' },
          ],
        },
      ],
      singletons: [],
    });

    const lines = output.trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('0:gene_A1:100-200');
    expect(lines[0]).toContain('0:gene_A2:300-400');
    expect(lines[0]).toContain('1:gene_B:200-300');
  });
});

describe('exportHomologs', () => {
  it('returns formatted string for a valid alignment with backbone and annotations', () => {
    const genomes = makeGenomes(2);
    const lcbs = [makeLcb(0, [100, 200], [500, 600], [false, false])];
    const backbone = [
      makeBackboneSegment(0, [
        { leftEnd: 100, rightEnd: 500 },
        { leftEnd: 200, rightEnd: 600 },
      ]),
    ];
    const blocks = [
      makeBlock([
        makeSegment(0, 150, 169, '+', 'ATCGATCGATCGATCGATCG'),
        makeSegment(1, 250, 269, '+', 'ATCGATCGATCGATCGATCG'),
      ]),
    ];
    const annotations = new Map<number, GenomeAnnotations>([
      [0, makeAnnotations(0, [makeFeature('CDS', 150, 170, '+', 'gene_A')])],
      [1, makeAnnotations(1, [makeFeature('CDS', 250, 270, '+', 'gene_B')])],
    ]);

    const alignment = makeAlignment(lcbs, genomes, blocks);
    const content = exportHomologs(alignment, backbone, annotations);
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
  });

  it('returns empty string when no features exist', () => {
    const genomes = makeGenomes(2);
    const alignment = makeAlignment([], genomes);
    const content = exportHomologs(alignment, [], new Map());
    expect(content).toBe('');
  });
});
