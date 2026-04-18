import { describe, it, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { renderUngappedMatches, updateUngappedMatchesOnZoom } from './ungapped-match-renderer.ts';
import { createViewerState, applyZoomTransform } from '../viewer-state.ts';
import type { ViewerConfig } from '../alignment-viewer.ts';
import type { XmfaAlignment } from '../../import/xmfa/types.ts';

const TEST_CONFIG: ViewerConfig = {
  width: 1000,
  panelHeight: 100,
  panelGap: 30,
  margin: { top: 10, right: 10, bottom: 10, left: 100 },
};

function makeAlignment(): XmfaAlignment {
  return {
    header: {
      formatVersion: 'Mauve1',
      sequenceCount: 2,
      sequenceEntries: [
        { index: 1, file: 'g1.fa', format: 'FastA' },
        { index: 2, file: 'g2.fa', format: 'FastA' },
      ],
    },
    blocks: [],
    lcbs: [
      { id: 0, left: [100, 200], right: [400, 500], reverse: [false, false], weight: 301 },
      { id: 1, left: [500, 600], right: [800, 900], reverse: [false, true], weight: 301 },
    ],
    genomes: [
      { index: 1, name: 'g1.fa', length: 1000, format: 'FastA' },
      { index: 2, name: 'g2.fa', length: 1200, format: 'FastA' },
    ],
  };
}

describe('ungapped-match-renderer', () => {
  let svg: SVGSVGElement;
  let root: d3.Selection<SVGGElement, unknown, null, undefined>;

  beforeEach(() => {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(svg);
    root = d3.select(svg).append('g').attr('class', 'alignment-root');
  });

  function renderLabel(
    panel: d3.Selection<SVGGElement, unknown, null, undefined>,
    genome: { readonly name: string; readonly label?: string },
  ): void {
    panel.append('text').attr('class', 'genome-label').text(genome.name);
  }

  function renderRuler(
    panel: d3.Selection<SVGGElement, unknown, null, undefined>,
    xScale: d3.ScaleLinear<number, number>,
  ): void {
    panel.append('g').attr('class', 'ruler').call(d3.axisBottom(xScale).ticks(5));
  }

  it('should render match blocks for each genome', () => {
    const alignment = makeAlignment();
    const state = createViewerState(alignment, TEST_CONFIG, 'ungapped-match');
    const colors = ['#ff0000', '#00ff00'];

    renderUngappedMatches(root, state, alignment.lcbs, colors, TEST_CONFIG, true, renderLabel, renderRuler);

    const blocks = root.selectAll('.match-block');
    expect(blocks.size()).toBeGreaterThan(0);
  });

  it('should render match blocks with correct data attributes', () => {
    const alignment = makeAlignment();
    const state = createViewerState(alignment, TEST_CONFIG, 'ungapped-match');
    const colors = ['#ff0000', '#00ff00'];

    renderUngappedMatches(root, state, alignment.lcbs, colors, TEST_CONFIG, true, renderLabel, renderRuler);

    const block = root.select('.match-block');
    expect(block.attr('data-lcb-index')).not.toBeNull();
    expect(block.attr('data-genome-index')).not.toBeNull();
  });

  it('should render panels with correct CSS class', () => {
    const alignment = makeAlignment();
    const state = createViewerState(alignment, TEST_CONFIG, 'ungapped-match');
    const colors = ['#ff0000', '#00ff00'];

    renderUngappedMatches(root, state, alignment.lcbs, colors, TEST_CONFIG, true, renderLabel, renderRuler);

    const panels = root.selectAll('.ungapped-match-panel');
    expect(panels.size()).toBe(2);
  });

  it('should skip hidden genomes', () => {
    const alignment = makeAlignment();
    let state = createViewerState(alignment, TEST_CONFIG, 'ungapped-match');
    state = { ...state, hiddenGenomes: new Set([1]) };
    const colors = ['#ff0000', '#00ff00'];

    renderUngappedMatches(root, state, alignment.lcbs, colors, TEST_CONFIG, true, renderLabel, renderRuler);

    const panels = root.selectAll('.ungapped-match-panel');
    expect(panels.size()).toBe(1);
  });

  describe('updateUngappedMatchesOnZoom', () => {
    it('should update match block positions on zoom', () => {
      const alignment = makeAlignment();
      const state = createViewerState(alignment, TEST_CONFIG, 'ungapped-match');
      const colors = ['#ff0000', '#00ff00'];

      renderUngappedMatches(root, state, alignment.lcbs, colors, TEST_CONFIG, true, renderLabel, renderRuler);

      const blockBefore = root.select('.match-block');
      const xBefore = parseFloat(blockBefore.attr('x'));
      const widthBefore = parseFloat(blockBefore.attr('width'));

      const zoomedState = applyZoomTransform(state, d3.zoomIdentity.scale(2));
      updateUngappedMatchesOnZoom(root, zoomedState, alignment.lcbs);

      const blockAfter = root.select('.match-block');
      const xAfter = parseFloat(blockAfter.attr('x'));
      const widthAfter = parseFloat(blockAfter.attr('width'));

      // At 2x zoom, positions and widths should change
      expect(xAfter).not.toBe(xBefore);
      expect(widthAfter).toBeGreaterThan(widthBefore);
    });

    it('should update ruler on zoom', () => {
      const alignment = makeAlignment();
      const state = createViewerState(alignment, TEST_CONFIG, 'ungapped-match');
      const colors = ['#ff0000', '#00ff00'];

      renderUngappedMatches(root, state, alignment.lcbs, colors, TEST_CONFIG, true, renderLabel, renderRuler);

      const zoomedState = applyZoomTransform(state, d3.zoomIdentity.scale(2));
      updateUngappedMatchesOnZoom(root, zoomedState, alignment.lcbs);

      const rulers = root.selectAll('.ruler');
      expect(rulers.size()).toBe(2);
    });

    it('should skip hidden genomes during zoom update', () => {
      const alignment = makeAlignment();
      let state = createViewerState(alignment, TEST_CONFIG, 'ungapped-match');
      const colors = ['#ff0000', '#00ff00'];

      renderUngappedMatches(root, state, alignment.lcbs, colors, TEST_CONFIG, true, renderLabel, renderRuler);

      state = { ...state, hiddenGenomes: new Set([1]) };
      const zoomedState = applyZoomTransform(state, d3.zoomIdentity.scale(2));

      // Should not throw
      updateUngappedMatchesOnZoom(root, zoomedState, alignment.lcbs);
    });
  });

  it('should render reverse-oriented matches below', () => {
    const alignment = makeAlignment();
    const state = createViewerState(alignment, TEST_CONFIG, 'ungapped-match');
    const colors = ['#ff0000', '#00ff00'];

    renderUngappedMatches(root, state, alignment.lcbs, colors, TEST_CONFIG, true, renderLabel, renderRuler);

    // LCB 1 is reverse for genome 1
    const reverseBlocks = root.selectAll('.match-block[data-lcb-index="1"][data-genome-index="1"]');
    expect(reverseBlocks.size()).toBe(1);
    const y = parseFloat(reverseBlocks.attr('y'));
    // Reverse blocks should have a higher Y value than forward blocks
    const forwardBlocks = root.selectAll('.match-block[data-lcb-index="0"][data-genome-index="1"]');
    const forwardY = parseFloat(forwardBlocks.attr('y'));
    expect(y).toBeGreaterThan(forwardY);
  });
});
