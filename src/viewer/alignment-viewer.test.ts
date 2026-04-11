import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderAlignment, getGenomeLabel } from './alignment-viewer.ts';
import type { ViewerHandle } from './alignment-viewer.ts';
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
  let handle: ViewerHandle | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    handle?.destroy();
    handle = undefined;
  });

  it('should create an SVG element', () => {
    const alignment = makeAlignment();
    handle = renderAlignment(container, alignment);
    expect(handle.svg).toBeInstanceOf(SVGSVGElement);
    expect(container.querySelector('svg')).toBe(handle.svg);
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
    // 2 LCBs, each with one midpoint-line path
    expect(connectors).toHaveLength(2);
  });

  it('should render coordinate rulers', () => {
    renderAlignment(container, makeAlignment());
    const rulers = container.querySelectorAll('.ruler');
    expect(rulers).toHaveLength(2);
  });

  it('should replace SVG on re-render', () => {
    const alignment = makeAlignment();
    handle = renderAlignment(container, alignment);
    handle.destroy();
    handle = renderAlignment(container, alignment);
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
    // 1 LCB with one midpoint-line path
    const connectors = container.querySelectorAll('.lcb-connector');
    expect(connectors).toHaveLength(1);
  });

  it('should accept custom config', () => {
    const alignment = makeAlignment();
    handle = renderAlignment(container, alignment, {
      width: 1200,
      panelHeight: 150,
      panelGap: 50,
      margin: { top: 30, right: 30, bottom: 30, left: 150 },
    });
    expect(handle.svg.getAttribute('width')).toBe('1200');
  });

  it('should return a handle with destroy method', () => {
    handle = renderAlignment(container, makeAlignment());
    expect(handle.destroy).toBeInstanceOf(Function);
    expect(handle.zoomHandle).toBeDefined();
    expect(handle.cursorHandle).toBeDefined();
    expect(handle.regionSelectionHandle).toBeDefined();
    expect(handle.getState).toBeInstanceOf(Function);
  });

  it('should provide current state via getState', () => {
    handle = renderAlignment(container, makeAlignment());
    const state = handle.getState();
    expect(state.alignment).toBeDefined();
    expect(state.zoomTransform.k).toBe(1);
  });

  it('should return a trackControlsHandle', () => {
    handle = renderAlignment(container, makeAlignment());
    expect(handle.trackControlsHandle).toBeDefined();
    expect(handle.trackControlsHandle.element).toBeInstanceOf(HTMLElement);
  });

  it('should create track controls with buttons for each genome', () => {
    handle = renderAlignment(container, makeAlignment());
    const groups = container.querySelectorAll('.track-control-group');
    expect(groups).toHaveLength(2);
  });

  it('should initialize genome order as sequential', () => {
    handle = renderAlignment(container, makeAlignment());
    const state = handle.getState();
    expect(state.genomeOrder).toEqual([0, 1]);
  });

  it('should initialize reference genome to 0', () => {
    handle = renderAlignment(container, makeAlignment());
    const state = handle.getState();
    expect(state.referenceGenomeIndex).toBe(0);
  });

  it('should have no hidden genomes initially', () => {
    handle = renderAlignment(container, makeAlignment());
    const state = handle.getState();
    expect(state.hiddenGenomes.size).toBe(0);
  });

  it('should reorder genomes when move-down button clicked', () => {
    handle = renderAlignment(container, makeAlignment());
    const downBtn = container.querySelector('.track-control-group:nth-child(1) .track-move-down') as HTMLButtonElement;
    downBtn.click();
    const state = handle.getState();
    expect(state.genomeOrder).toEqual([1, 0]);

    // Labels should now be in reverse order
    const labels = container.querySelectorAll('.genome-label');
    expect(labels[0]!.textContent).toBe('genome2.gbk');
    expect(labels[1]!.textContent).toBe('genome1.fasta');
  });

  it('should change reference genome when R button clicked', () => {
    handle = renderAlignment(container, makeAlignment());
    const refBtn = container.querySelector('.track-control-group:nth-child(2) .track-set-ref') as HTMLButtonElement;
    refBtn.click();
    const state = handle.getState();
    expect(state.referenceGenomeIndex).toBe(1);
  });

  it('should hide a genome when hide button clicked', () => {
    handle = renderAlignment(container, makeAlignment());
    const hideBtn = container.querySelector('.track-control-group:nth-child(2) .track-toggle-visibility') as HTMLButtonElement;
    hideBtn.click();
    const state = handle.getState();
    expect(state.hiddenGenomes.has(1)).toBe(true);

    // Hidden genome should render as collapsed
    const hiddenPanels = container.querySelectorAll('.genome-panel-hidden');
    expect(hiddenPanels).toHaveLength(1);
  });

  it('should show a hidden genome when show button clicked', () => {
    handle = renderAlignment(container, makeAlignment());
    // Hide genome
    const hideBtn = container.querySelector('.track-control-group:nth-child(2) .track-toggle-visibility') as HTMLButtonElement;
    hideBtn.click();
    expect(handle.getState().hiddenGenomes.has(1)).toBe(true);
    // Show genome — the track controls are rebuilt, so we need to re-query
    const showBtn = container.querySelector('.track-control-group:nth-child(2) .track-toggle-visibility') as HTMLButtonElement;
    showBtn.click();
    expect(handle.getState().hiddenGenomes.has(1)).toBe(false);
    const hiddenPanels = container.querySelectorAll('.genome-panel-hidden');
    expect(hiddenPanels).toHaveLength(0);
  });

  it('should render hidden genome with collapsed bar', () => {
    handle = renderAlignment(container, makeAlignment());
    const hideBtn = container.querySelector('.track-control-group:nth-child(1) .track-toggle-visibility') as HTMLButtonElement;
    hideBtn.click();
    // The first genome should be hidden
    const hiddenBg = container.querySelector('.genome-background-hidden');
    expect(hiddenBg).toBeTruthy();
    expect(hiddenBg?.getAttribute('height')).toBe('20');
  });

  it('should not render connecting lines involving hidden genomes', () => {
    handle = renderAlignment(container, makeAlignment());
    // Initially 2 connectors (2 LCBs between 2 genomes — wait, check again)
    let connectors = container.querySelectorAll('.lcb-connector');
    expect(connectors.length).toBeGreaterThan(0);
    // Hide one genome
    const hideBtn = container.querySelector('.track-control-group:nth-child(2) .track-toggle-visibility') as HTMLButtonElement;
    hideBtn.click();
    connectors = container.querySelectorAll('.lcb-connector');
    // With only 1 visible genome, no connecting lines
    expect(connectors).toHaveLength(0);
  });

  it('should update reference genome R button style after setting reference', () => {
    handle = renderAlignment(container, makeAlignment());
    // Initially, first R button is active
    let refBtns = container.querySelectorAll('.track-set-ref');
    expect((refBtns[0] as HTMLButtonElement).classList.contains('active')).toBe(true);
    expect((refBtns[1] as HTMLButtonElement).classList.contains('active')).toBe(false);

    // Set second genome as reference
    (refBtns[1] as HTMLButtonElement).click();
    refBtns = container.querySelectorAll('.track-set-ref');
    expect((refBtns[0] as HTMLButtonElement).classList.contains('active')).toBe(false);
    expect((refBtns[1] as HTMLButtonElement).classList.contains('active')).toBe(true);
  });

  it('should clean up track controls on destroy', () => {
    handle = renderAlignment(container, makeAlignment());
    expect(container.querySelector('.track-controls')).toBeTruthy();
    handle.destroy();
    handle = undefined;
    expect(container.querySelector('.track-controls')).toBeNull();
  });

  it('should flip LCB visual orientation when reference changes', () => {
    // LCB 1 has genome2 as reverse. When genome2 becomes reference, it should flip.
    const alignment = makeAlignment();
    handle = renderAlignment(container, alignment);

    // Before: genome2's LCB 1 is reverse (below centerline)
    const lcbBlocks1 = container.querySelectorAll('.lcb-block[data-genome-index="1"][data-lcb-index="1"]');
    expect(lcbBlocks1).toHaveLength(1);
    const yBefore = Number(lcbBlocks1[0]!.getAttribute('y'));

    // Set genome2 (data index 1) as reference
    const refBtn = container.querySelector('.track-control-group:nth-child(2) .track-set-ref') as HTMLButtonElement;
    refBtn.click();

    // After: genome2's LCB 1 should now be forward (above centerline)
    const lcbBlocks2 = container.querySelectorAll('.lcb-block[data-genome-index="1"][data-lcb-index="1"]');
    expect(lcbBlocks2).toHaveLength(1);
    const yAfter = Number(lcbBlocks2[0]!.getAttribute('y'));
    expect(yAfter).not.toBe(yBefore);
  });

  it('should create an options panel', () => {
    handle = renderAlignment(container, makeAlignment());
    expect(handle.optionsPanelHandle).toBeDefined();
    expect(container.querySelector('.options-panel')).not.toBeNull();
  });

  it('should toggle genome labels when genome ID option is unchecked', () => {
    handle = renderAlignment(container, makeAlignment());
    const labels = container.querySelectorAll('.genome-label');
    expect(labels[0]!.textContent).toBe('genome1.fasta');

    const cb = container.querySelector<HTMLInputElement>('input[name="showGenomeId"]')!;
    cb.click();

    expect(labels[0]!.textContent).toBe('genome1');
    expect(labels[1]!.textContent).toBe('genome2');
  });

  it('should restore genome labels when genome ID option is re-checked', () => {
    handle = renderAlignment(container, makeAlignment());
    const cb = container.querySelector<HTMLInputElement>('input[name="showGenomeId"]')!;
    cb.click(); // uncheck
    cb.click(); // re-check

    const labels = container.querySelectorAll('.genome-label');
    expect(labels[0]!.textContent).toBe('genome1.fasta');
    expect(labels[1]!.textContent).toBe('genome2.gbk');
  });

  it('should hide connecting lines when option is unchecked', () => {
    handle = renderAlignment(container, makeAlignment());
    expect(container.querySelectorAll('.lcb-connector').length).toBeGreaterThan(0);

    const cb = container.querySelector<HTMLInputElement>('input[name="showConnectingLines"]')!;
    cb.click();

    expect(container.querySelectorAll('.lcb-connector').length).toBe(0);
  });

  it('should restore connecting lines when option is re-checked', () => {
    handle = renderAlignment(container, makeAlignment());
    const cb = container.querySelector<HTMLInputElement>('input[name="showConnectingLines"]')!;
    cb.click(); // hide
    cb.click(); // show

    expect(container.querySelectorAll('.lcb-connector').length).toBeGreaterThan(0);
  });

  it('should clean up options panel on destroy', () => {
    handle = renderAlignment(container, makeAlignment());
    handle.destroy();
    handle = undefined;
    expect(container.querySelector('.options-panel')).toBeNull();
    expect(container.querySelector('.viewer-controls-bar')).toBeNull();
  });
});

describe('getGenomeLabel', () => {
  it('returns full name when showGenomeId is true', () => {
    expect(getGenomeLabel('genome1.fasta', true)).toBe('genome1.fasta');
  });

  it('strips extension when showGenomeId is false', () => {
    expect(getGenomeLabel('genome1.fasta', false)).toBe('genome1');
  });

  it('strips last extension for multi-dot names', () => {
    expect(getGenomeLabel('my.genome.file.gbk', false)).toBe('my.genome.file');
  });

  it('returns full name if no extension', () => {
    expect(getGenomeLabel('genome_no_ext', false)).toBe('genome_no_ext');
  });

  it('returns organism name for enriched labels when genome id display is off', () => {
    expect(getGenomeLabel('Brucella suis [520456.3]', false)).toBe('Brucella suis');
  });

  it('returns full enriched label when genome id display is on', () => {
    expect(getGenomeLabel('Brucella suis [520456.3]', true)).toBe('Brucella suis [520456.3]');
  });

  it('does not strip generic bracket suffixes that are not genome ids', () => {
    expect(getGenomeLabel('Sample [draft]', false)).toBe('Sample [draft]');
  });
});
