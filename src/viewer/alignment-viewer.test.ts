import { describe, it, expect, beforeEach } from 'vitest';
import { renderAlignment } from './alignment-viewer.ts';
import type { XmfaAlignment } from '../xmfa/types.ts';

function makeAlignment(overrides?: Partial<XmfaAlignment>): XmfaAlignment {
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
      {
        segments: [
          { sequenceIndex: 1, start: 500, end: 800, strand: '+', sourceFile: 'genome1.fasta', sequenceData: 'TTTT' },
          { sequenceIndex: 2, start: 400, end: 700, strand: '-', sourceFile: 'genome2.gbk', sequenceData: 'AAAA' },
        ],
      },
    ],
    lcbs: [
      { id: 0, left: [100, 50], right: [400, 350], reverse: [false, false], weight: 301 },
      { id: 1, left: [500, 400], right: [800, 700], reverse: [false, true], weight: 301 },
    ],
    genomes: [
      { index: 1, name: 'genome1.fasta', length: 800, format: 'FastA' },
      { index: 2, name: 'genome2.gbk', length: 700, format: 'GenBank' },
    ],
    ...overrides,
  };
}

describe('renderAlignment', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('should create an SVG element', () => {
    const alignment = makeAlignment();
    const svg = renderAlignment(container, alignment);
    expect(svg).toBeInstanceOf(SVGSVGElement);
    expect(container.querySelector('svg')).toBe(svg);
  });

  it('should create a panel for each genome', () => {
    renderAlignment(container, makeAlignment());
    const panels = container.querySelectorAll('.genome-panel');
    expect(panels).toHaveLength(2);
  });

  it('should display genome labels', () => {
    renderAlignment(container, makeAlignment());
    const labels = container.querySelectorAll('.genome-label');
    expect(labels).toHaveLength(2);
    expect(labels[0]!.textContent).toBe('genome1.fasta');
    expect(labels[1]!.textContent).toBe('genome2.gbk');
  });

  it('should render LCB blocks', () => {
    renderAlignment(container, makeAlignment());
    const blocks = container.querySelectorAll('.lcb-block');
    // 2 LCBs x 2 genomes = 4 blocks
    expect(blocks).toHaveLength(4);
  });

  it('should render connecting lines between panels', () => {
    renderAlignment(container, makeAlignment());
    const connectors = container.querySelectorAll('.lcb-connector');
    // 2 LCBs, 1 gap between 2 genomes = 2 connectors
    expect(connectors).toHaveLength(2);
  });

  it('should render center lines', () => {
    renderAlignment(container, makeAlignment());
    const lines = container.querySelectorAll('.center-line');
    expect(lines).toHaveLength(2);
  });

  it('should render coordinate rulers', () => {
    renderAlignment(container, makeAlignment());
    const rulers = container.querySelectorAll('.ruler');
    expect(rulers).toHaveLength(2);
  });

  it('should replace SVG on re-render', () => {
    const alignment = makeAlignment();
    renderAlignment(container, alignment);
    renderAlignment(container, alignment);
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
  });

  it('should handle alignment with single-sequence blocks (no LCBs)', () => {
    const alignment = makeAlignment({
      lcbs: [],
      blocks: [
        {
          segments: [
            { sequenceIndex: 1, start: 1, end: 100, strand: '+', sourceFile: 'g1.fa', sequenceData: 'ACGT' },
          ],
        },
      ],
    });
    renderAlignment(container, alignment);
    const blocks = container.querySelectorAll('.lcb-block');
    expect(blocks).toHaveLength(0);
  });

  it('should handle three genomes with connecting lines', () => {
    const alignment: XmfaAlignment = {
      header: {
        formatVersion: 'Mauve1',
        sequenceCount: 3,
        sequenceEntries: [
          { index: 1, file: 'g1.fa', format: 'FastA' },
          { index: 2, file: 'g2.fa', format: 'FastA' },
          { index: 3, file: 'g3.fa', format: 'FastA' },
        ],
      },
      blocks: [],
      lcbs: [
        { id: 0, left: [100, 50, 200], right: [400, 350, 500], reverse: [false, false, false], weight: 300 },
      ],
      genomes: [
        { index: 1, name: 'g1.fa', length: 500, format: 'FastA' },
        { index: 2, name: 'g2.fa', length: 400, format: 'FastA' },
        { index: 3, name: 'g3.fa', length: 600, format: 'FastA' },
      ],
    };
    renderAlignment(container, alignment);
    const panels = container.querySelectorAll('.genome-panel');
    expect(panels).toHaveLength(3);
    // 1 LCB x 2 gaps = 2 connecting lines
    const connectors = container.querySelectorAll('.lcb-connector');
    expect(connectors).toHaveLength(2);
  });

  it('should accept custom config', () => {
    const alignment = makeAlignment();
    const svg = renderAlignment(container, alignment, {
      width: 1200,
      panelHeight: 150,
      panelGap: 50,
      margin: { top: 30, right: 30, bottom: 30, left: 150 },
    });
    expect(svg.getAttribute('width')).toBe('1200');
  });
});
