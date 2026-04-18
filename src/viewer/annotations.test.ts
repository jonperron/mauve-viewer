import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderAlignment } from './alignment-viewer.ts';
import type { ViewerHandle } from './alignment-viewer.ts';
import type { XmfaAlignment } from '../import/xmfa/types.ts';
import type { GenomeAnnotations } from '../annotations/types.ts';
import type { AnnotationMap } from './annotations.ts';

function makeAlignment(): XmfaAlignment {
  return {
    header: {
      formatVersion: 'Mauve1',
      sequenceCount: 2,
      sequenceEntries: [
        { index: 1, file: 'genome1.fasta', format: 'FastA' },
        { index: 2, file: 'genome2.gbk', format: 'GenBank' },
      ],
    },
    blocks: [
      {
        segments: [
          { sequenceIndex: 1, start: 100, end: 400, strand: '+', sourceFile: 'genome1.fasta', sequenceData: 'ACGT' },
          { sequenceIndex: 2, start: 50, end: 350, strand: '+', sourceFile: 'genome2.gbk', sequenceData: 'ACGT' },
        ],
      },
    ],
    lcbs: [
      { id: 0, left: [100, 50], right: [400, 350], reverse: [false, false], weight: 301 },
    ],
    genomes: [
      { index: 1, name: 'genome1.fasta', length: 800, format: 'FastA' },
      { index: 2, name: 'genome2.gbk', length: 700, format: 'GenBank' },
    ],
  };
}

function makeAnnotations(): AnnotationMap {
  const annot1: GenomeAnnotations = {
    genomeIndex: 0,
    features: [
      { type: 'CDS', start: 150, end: 300, strand: '+', qualifiers: { gene: 'geneA', product: 'Protein A', locus_tag: 'TAG01' } },
      { type: 'CDS', start: 500, end: 600, strand: '-', qualifiers: { gene: 'geneB', product: 'Protein B', locus_tag: 'TAG02' } },
      { type: 'tRNA', start: 350, end: 420, strand: '+', qualifiers: { product: 'tRNA-Ala' } },
    ],
    contigs: [{ position: 400, name: 'contig2' }],
  };

  const annot2: GenomeAnnotations = {
    genomeIndex: 1,
    features: [
      { type: 'rRNA', start: 100, end: 250, strand: '+', qualifiers: { product: '16S rRNA' } },
    ],
    contigs: [],
  };

  return new Map([
    [0, annot1],
    [1, annot2],
  ]);
}

describe('Annotations integration', () => {
  let container: HTMLDivElement;
  let handle: ViewerHandle | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    handle?.destroy();
    handle = undefined;
    container.remove();
  });

  it('renders with annotations without errors', () => {
    const alignment = makeAlignment();
    const annotations = makeAnnotations();

    handle = renderAlignment(container, alignment, undefined, annotations);

    expect(handle.svg).toBeInstanceOf(SVGSVGElement);
    expect(handle.annotationsHandle).toBeDefined();
  });

  it('renders without annotations when none provided', () => {
    const alignment = makeAlignment();

    handle = renderAlignment(container, alignment);

    expect(handle.annotationsHandle).toBeUndefined();
  });

  it('renders contig boundary markers', () => {
    const alignment = makeAlignment();
    const annotations = makeAnnotations();

    handle = renderAlignment(container, alignment, undefined, annotations);

    const contigLines = handle.svg.querySelectorAll('.contig-boundary');
    expect(contigLines.length).toBeGreaterThan(0);
  });

  it('annotationsHandle.destroy removes annotations', () => {
    const alignment = makeAlignment();
    const annotations = makeAnnotations();

    handle = renderAlignment(container, alignment, undefined, annotations);

    expect(handle.annotationsHandle).toBeDefined();
    handle.annotationsHandle!.destroy();

    const annotGroups = handle.svg.querySelectorAll('.annotation-group');
    expect(annotGroups.length).toBe(0);
  });

  it('annotationsHandle has update method', () => {
    const alignment = makeAlignment();
    const annotations = makeAnnotations();

    handle = renderAlignment(container, alignment, undefined, annotations);

    expect(typeof handle.annotationsHandle!.update).toBe('function');
  });
});
