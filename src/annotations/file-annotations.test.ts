import { describe, expect, it } from 'vitest';
import {
  loadAnnotationFiles,
  mergeAnnotationMaps,
  parseGenBankAnnotationFile,
} from './file-annotations.ts';
import type { GenomeAnnotations } from './index.ts';

const SIMPLE_GBK = `LOCUS       TEST_SEQ                5000 bp    DNA     linear   BCT 01-JAN-2024
DEFINITION  Test sequence.
ACCESSION   TEST001
FEATURES             Location/Qualifiers
     CDS             100..500
                     /gene="testA"
                     /locus_tag="TEST_0001"
                     /product="Test protein A"
ORIGIN
        1 atgcatgcat gcatgcatgc
//
`;

describe('mergeAnnotationMaps', () => {
  it('overrides existing genome entries with additions', () => {
    const base = new Map<number, GenomeAnnotations>([
      [1, { genomeIndex: 1, features: [], contigs: [] }],
      [2, { genomeIndex: 2, features: [], contigs: [] }],
    ]);
    const additions = new Map<number, GenomeAnnotations>([
      [2, { genomeIndex: 2, features: [{
        type: 'CDS',
        start: 1,
        end: 10,
        strand: '+',
        qualifiers: {},
      }], contigs: [] }],
    ]);

    const merged = mergeAnnotationMaps(base, additions);
    expect(merged.get(1)).toEqual(base.get(1));
    expect(merged.get(2)?.features).toHaveLength(1);
  });
});

describe('parseGenBankAnnotationFile', () => {
  it('parses annotations for a specific genome index', () => {
    const parsed = parseGenBankAnnotationFile(SIMPLE_GBK, 3);
    expect(parsed.genomeIndex).toBe(3);
    expect(parsed.features.length).toBeGreaterThan(0);
  });
});

describe('loadAnnotationFiles', () => {
  it('loads valid files and skips invalid files', async () => {
    const valid = new File([SIMPLE_GBK], 'a.gbk', { type: 'text/plain' });
    const invalid = new File(['not a genbank'], 'b.gbk', { type: 'text/plain' });

    const merged = await loadAnnotationFiles([valid, invalid], new Map());
    expect(merged.get(1)?.features.length).toBeGreaterThan(0);
    expect(merged.get(2)?.features).toEqual([]);
  });
});