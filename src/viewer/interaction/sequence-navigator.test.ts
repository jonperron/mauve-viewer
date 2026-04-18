import { describe, it, expect } from 'vitest';
import { searchFeatures } from './sequence-navigator.ts';
import type { AnnotationMap } from '../rendering/annotations.ts';
import type { GenomeAnnotations, GenomicFeature } from '../../annotations/types.ts';

function makeFeature(overrides: Partial<GenomicFeature> = {}): GenomicFeature {
  return {
    type: 'CDS',
    start: 100,
    end: 500,
    strand: '+',
    qualifiers: {
      locus_tag: 'b0001',
      gene: 'thrL',
      product: 'thr operon leader peptide',
    },
    ...overrides,
  };
}

function makeAnnotationMap(features: readonly GenomicFeature[], genomeIndex = 1): AnnotationMap {
  const annotations: GenomeAnnotations = {
    genomeIndex,
    features,
    contigs: [],
  };
  return new Map([[genomeIndex, annotations]]);
}

describe('searchFeatures', () => {
  const genomeNames = ['genome1.fasta', 'genome2.gbk'];

  it('should find features by locus_tag with contains mode', () => {
    const annotations = makeAnnotationMap([makeFeature()]);
    const results = searchFeatures(annotations, genomeNames, 'b0001', 'contains');
    expect(results).toHaveLength(1);
    expect(results[0]!.matchedField).toBe('locus_tag');
  });

  it('should find features by product with contains mode', () => {
    const annotations = makeAnnotationMap([makeFeature()]);
    const results = searchFeatures(annotations, genomeNames, 'operon', 'contains');
    expect(results).toHaveLength(1);
    expect(results[0]!.matchedField).toBe('product');
  });

  it('should find features by gene with exact mode', () => {
    const annotations = makeAnnotationMap([makeFeature()]);
    const results = searchFeatures(annotations, genomeNames, 'thrL', 'exact');
    expect(results).toHaveLength(1);
    expect(results[0]!.matchedField).toBe('gene');
  });

  it('should not find partial matches with exact mode', () => {
    const annotations = makeAnnotationMap([makeFeature()]);
    const results = searchFeatures(annotations, genomeNames, 'thr', 'exact');
    expect(results).toHaveLength(0);
  });

  it('should be case-insensitive', () => {
    const annotations = makeAnnotationMap([makeFeature()]);
    const results = searchFeatures(annotations, genomeNames, 'THRL', 'exact');
    expect(results).toHaveLength(1);
  });

  it('should return empty array for empty query', () => {
    const annotations = makeAnnotationMap([makeFeature()]);
    const results = searchFeatures(annotations, genomeNames, '', 'contains');
    expect(results).toHaveLength(0);
  });

  it('should filter by genome scope', () => {
    const map: AnnotationMap = new Map([
      [1, { genomeIndex: 1, features: [makeFeature({ qualifiers: { gene: 'geneA' } })], contigs: [] }],
      [2, { genomeIndex: 2, features: [makeFeature({ qualifiers: { gene: 'geneA' } })], contigs: [] }],
    ]);
    const results = searchFeatures(map, genomeNames, 'geneA', 'exact', 1);
    expect(results).toHaveLength(1);
    expect(results[0]!.genomeIndex).toBe(1);
  });

  it('should search all genomes when no scope specified', () => {
    const map: AnnotationMap = new Map([
      [1, { genomeIndex: 1, features: [makeFeature({ qualifiers: { gene: 'geneA' } })], contigs: [] }],
      [2, { genomeIndex: 2, features: [makeFeature({ qualifiers: { gene: 'geneA' } })], contigs: [] }],
    ]);
    const results = searchFeatures(map, genomeNames, 'geneA', 'exact');
    expect(results).toHaveLength(2);
  });

  it('should search protein_id field', () => {
    const feature = makeFeature({
      qualifiers: { protein_id: 'AAC73112.1' },
    });
    const annotations = makeAnnotationMap([feature]);
    const results = searchFeatures(annotations, genomeNames, 'AAC73112', 'contains');
    expect(results).toHaveLength(1);
    expect(results[0]!.matchedField).toBe('protein_id');
  });

  it('should search db_xref field', () => {
    const feature = makeFeature({
      qualifiers: { db_xref: 'GeneID:944742' },
    });
    const annotations = makeAnnotationMap([feature]);
    const results = searchFeatures(annotations, genomeNames, 'GeneID:944742', 'contains');
    expect(results).toHaveLength(1);
    expect(results[0]!.matchedField).toBe('db_xref');
  });

  it('should include genome name in results', () => {
    const annotations = makeAnnotationMap([makeFeature()]);
    const results = searchFeatures(annotations, genomeNames, 'thrL', 'exact');
    expect(results[0]!.genomeName).toBe('genome1.fasta');
  });

  it('should return feature coordinates in results', () => {
    const feature = makeFeature({ start: 200, end: 600 });
    const annotations = makeAnnotationMap([feature]);
    const results = searchFeatures(annotations, genomeNames, 'thrL', 'exact');
    expect(results[0]!.feature.start).toBe(200);
    expect(results[0]!.feature.end).toBe(600);
  });

  it('should match only one field per feature', () => {
    const feature = makeFeature({
      qualifiers: { locus_tag: 'test', gene: 'test', product: 'test' },
    });
    const annotations = makeAnnotationMap([feature]);
    const results = searchFeatures(annotations, genomeNames, 'test', 'exact');
    // Should return only one result per feature (breaks after first match)
    expect(results).toHaveLength(1);
  });
});
