import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  escapeHtml,
  buildTooltipContent,
  buildDetailContent,
  createFeatureTooltip,
} from './feature-tooltip.ts';
import type { GenomicFeature } from '../../annotations/types.ts';

function makeFeature(overrides?: Partial<GenomicFeature>): GenomicFeature {
  return {
    type: 'CDS',
    start: 100,
    end: 500,
    strand: '+',
    qualifiers: {
      gene: 'testGene',
      product: 'Test protein',
      locus_tag: 'TAG001',
    },
    ...overrides,
  };
}

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).not.toContain('<script>');
  });

  it('passes through plain text', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });
});

describe('buildTooltipContent', () => {
  it('includes locus tag and gene name', () => {
    const content = buildTooltipContent(makeFeature());
    expect(content).toContain('TAG001');
    expect(content).toContain('testGene');
  });

  it('includes product line', () => {
    const content = buildTooltipContent(makeFeature());
    expect(content).toContain('Test protein');
  });

  it('includes coordinates', () => {
    const content = buildTooltipContent(makeFeature());
    expect(content).toContain('100..500');
    expect(content).toContain('(+)');
  });

  it('uses feature type as header when no qualifiers', () => {
    const content = buildTooltipContent(makeFeature({ qualifiers: {} }));
    expect(content).toContain('CDS');
  });

  it('omits product line when missing', () => {
    const content = buildTooltipContent(
      makeFeature({ qualifiers: { locus_tag: 'T1' } }),
    );
    expect(content).not.toContain('<div></div>');
  });
});

describe('buildDetailContent', () => {
  it('includes feature type and coordinates', () => {
    const content = buildDetailContent(makeFeature());
    expect(content).toContain('CDS');
    expect(content).toContain('100..500');
  });

  it('includes locus tag', () => {
    const content = buildDetailContent(makeFeature());
    expect(content).toContain('Locus tag: TAG001');
  });

  it('includes gene name', () => {
    const content = buildDetailContent(makeFeature());
    expect(content).toContain('Gene: testGene');
  });

  it('includes product', () => {
    const content = buildDetailContent(makeFeature());
    expect(content).toContain('Product: Test protein');
  });

  it('includes NCBI Protein link when protein_id present', () => {
    const content = buildDetailContent(
      makeFeature({
        qualifiers: { protein_id: 'NP_001234.1' },
      }),
    );
    expect(content).toContain('https://www.ncbi.nlm.nih.gov/protein/');
    expect(content).toContain('NP_001234.1');
    expect(content).toContain('target="_blank"');
    expect(content).toContain('rel="noopener noreferrer"');
  });

  it('includes NCBI Gene link when db_xref with GeneID present', () => {
    const content = buildDetailContent(
      makeFeature({
        qualifiers: { db_xref: 'GeneID:12345' },
      }),
    );
    expect(content).toContain('https://www.ncbi.nlm.nih.gov/gene/12345');
  });

  it('includes UniProt link when db_xref with UniProtKB present', () => {
    const content = buildDetailContent(
      makeFeature({ qualifiers: { db_xref: 'UniProtKB:P12345' } }),
    );
    expect(content).toContain('https://www.uniprot.org/uniprot/P12345');
    expect(content).toContain('target="_blank"');
    expect(content).toContain('rel="noopener noreferrer"');
  });

  it('includes UniProt link for UniProtKB/Swiss-Prot prefix', () => {
    const content = buildDetailContent(
      makeFeature({ qualifiers: { db_xref: 'UniProtKB/Swiss-Prot:P12345' } }),
    );
    expect(content).toContain('https://www.uniprot.org/uniprot/P12345');
  });

  it('includes PDB link when db_xref with PDB present', () => {
    const content = buildDetailContent(
      makeFeature({ qualifiers: { db_xref: 'PDB:1ABC' } }),
    );
    expect(content).toContain('https://www.rcsb.org/structure/1ABC');
  });

  it('includes GO link when db_xref with GO present', () => {
    const content = buildDetailContent(
      makeFeature({ qualifiers: { db_xref: 'GO:0006412' } }),
    );
    expect(content).toContain('https://www.ebi.ac.uk/QuickGO/term/GO:0006412');
  });

  it('includes InterPro link when db_xref with InterPro present', () => {
    const content = buildDetailContent(
      makeFeature({ qualifiers: { db_xref: 'InterPro:IPR001234' } }),
    );
    expect(content).toContain('https://www.ebi.ac.uk/interpro/entry/InterPro/IPR001234/');
  });

  it('includes KEGG link when db_xref with KEGG present', () => {
    const content = buildDetailContent(
      makeFeature({ qualifiers: { db_xref: 'KEGG:eco:b0001' } }),
    );
    expect(content).toContain('https://www.genome.jp/dbget-bin/www_bget?eco:b0001');
  });

  it('renders multiple db_xref links from semicolon-separated values', () => {
    const content = buildDetailContent(
      makeFeature({
        qualifiers: { db_xref: 'GeneID:12345; UniProtKB:P12345; PDB:1ABC' },
      }),
    );
    expect(content).toContain('https://www.ncbi.nlm.nih.gov/gene/12345');
    expect(content).toContain('https://www.uniprot.org/uniprot/P12345');
    expect(content).toContain('https://www.rcsb.org/structure/1ABC');
  });

  it('does not render db_xref raw in qualifier list', () => {
    const content = buildDetailContent(
      makeFeature({ qualifiers: { db_xref: 'GeneID:12345' } }),
    );
    expect(content).not.toContain('db_xref: GeneID');
  });

  it('skips translation qualifier', () => {
    const content = buildDetailContent(
      makeFeature({
        qualifiers: { translation: 'MKTLVW...' },
      }),
    );
    expect(content).not.toContain('MKTLVW');
  });

  it('includes other qualifiers', () => {
    const content = buildDetailContent(
      makeFeature({
        qualifiers: { note: 'Important note' },
      }),
    );
    expect(content).toContain('note: Important note');
  });
});

describe('createFeatureTooltip', () => {
  let handle: ReturnType<typeof createFeatureTooltip>;

  beforeEach(() => {
    handle = createFeatureTooltip();
  });

  afterEach(() => {
    handle.destroy();
  });

  it('creates tooltip element in DOM', () => {
    const tooltip = document.querySelector('.feature-tooltip');
    expect(tooltip).toBeTruthy();
  });

  it('show makes tooltip visible', () => {
    const event = new MouseEvent('mouseover', { clientX: 100, clientY: 200 });
    Object.defineProperty(event, 'pageX', { value: 100 });
    Object.defineProperty(event, 'pageY', { value: 200 });

    handle.show(makeFeature(), event);

    const tooltip = document.querySelector('.feature-tooltip') as HTMLElement;
    expect(tooltip.style.opacity).toBe('0.95');
  });

  it('hide makes tooltip invisible', () => {
    handle.hide();

    const tooltip = document.querySelector('.feature-tooltip') as HTMLElement;
    expect(tooltip.style.opacity).toBe('0');
  });

  it('destroy removes tooltip from DOM', () => {
    handle.destroy();

    const tooltip = document.querySelector('.feature-tooltip');
    expect(tooltip).toBeNull();
  });

  it('showDetails makes tooltip interactive', () => {
    const event = new MouseEvent('click', { clientX: 100, clientY: 200 });
    Object.defineProperty(event, 'pageX', { value: 100 });
    Object.defineProperty(event, 'pageY', { value: 200 });

    handle.showDetails(makeFeature(), event);

    const tooltip = document.querySelector('.feature-tooltip') as HTMLElement;
    expect(tooltip.style.pointerEvents).toBe('auto');
    expect(tooltip.style.opacity).toBe('0.95');
  });
});
