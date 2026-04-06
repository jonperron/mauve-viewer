import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupRegionSelection } from './region-selection.ts';
import type { RegionSelectionHandle } from './region-selection.ts';
import type { ViewerState } from './viewer-state.ts';
import type { ViewerConfig } from './alignment-viewer.ts';
import * as d3 from 'd3';

function makeState(): ViewerState {
  const config: ViewerConfig = {
    width: 1000,
    panelHeight: 74,
    panelGap: 66,
    margin: { top: 20, right: 20, bottom: 20, left: 120 },
  };
  const innerWidth = config.width - config.margin.left - config.margin.right;
  return {
    alignment: {
      header: {
        formatVersion: 'Mauve1',
        sequenceCount: 2,
        sequenceEntries: [
          { index: 1, file: 'g1.fa', format: 'FastA' },
          { index: 2, file: 'g2.fa', format: 'FastA' },
        ],
      },
      blocks: [],
      lcbs: [],
      genomes: [
        { index: 1, name: 'g1.fa', length: 1000, format: 'FastA' },
        { index: 2, name: 'g2.fa', length: 800, format: 'FastA' },
      ],
    },
    config,
    innerWidth,
    baseScales: [
      d3.scaleLinear().domain([0, 1000]).range([1, innerWidth + 1]),
      d3.scaleLinear().domain([0, 800]).range([1, innerWidth + 1]),
    ],
    zoomTransform: d3.zoomIdentity,
    genomeOrder: [0, 1],
    referenceGenomeIndex: 0,
    hiddenGenomes: new Set(),
  };
}

describe('setupRegionSelection', () => {
  let svg: SVGSVGElement;
  let handle: RegionSelectionHandle | undefined;
  const config: ViewerConfig = {
    width: 1000,
    panelHeight: 74,
    panelGap: 66,
    margin: { top: 20, right: 20, bottom: 20, left: 120 },
  };

  beforeEach(() => {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '1000');
    svg.setAttribute('height', '300');
    document.body.appendChild(svg);
  });

  afterEach(() => {
    handle?.destroy();
    handle = undefined;
    svg.remove();
  });

  it('should create a region selection group', () => {
    handle = setupRegionSelection(svg, makeState(), config);
    const group = svg.querySelector('.region-selection-group');
    expect(group).not.toBeNull();
  });

  it('should return undefined selection initially', () => {
    handle = setupRegionSelection(svg, makeState(), config);
    expect(handle.getSelection()).toBeUndefined();
  });

  it('should clear selection', () => {
    handle = setupRegionSelection(svg, makeState(), config);
    handle.clearSelection();
    expect(handle.getSelection()).toBeUndefined();
  });

  it('should remove elements on destroy', () => {
    handle = setupRegionSelection(svg, makeState(), config);
    handle.destroy();
    handle = undefined;
    expect(svg.querySelector('.region-selection-group')).toBeNull();
    expect(svg.querySelector('.region-drag-overlay')).toBeNull();
  });

  it('should create drag overlay', () => {
    handle = setupRegionSelection(svg, makeState(), config);
    const overlay = svg.querySelector('.region-drag-overlay');
    expect(overlay).not.toBeNull();
  });

  it('should accept onSelect callback', () => {
    const onSelect = vi.fn();
    handle = setupRegionSelection(svg, makeState(), config, onSelect);
    expect(handle).toBeDefined();
  });

  it('should update state without error', () => {
    handle = setupRegionSelection(svg, makeState(), config);
    const newState = makeState();
    expect(() => handle!.update(newState)).not.toThrow();
  });

  it('should rebuild overlays without error', () => {
    handle = setupRegionSelection(svg, makeState(), config);
    const newState = makeState();
    expect(() => handle!.rebuildOverlays(newState)).not.toThrow();
  });

  it('should not start drag without shift key', () => {
    handle = setupRegionSelection(svg, makeState(), config);
    const event = new MouseEvent('mousedown', {
      clientX: 200,
      clientY: 60,
      shiftKey: false,
      bubbles: true,
    });
    svg.dispatchEvent(event);
    // No drag → no selection rects
    expect(svg.querySelectorAll('.region-selection-rect')).toHaveLength(0);
  });

  it('should start drag with shift key on a genome panel', () => {
    const state = makeState();
    handle = setupRegionSelection(svg, state, config);

    // Shift+mousedown inside first panel area
    const mousedown = new MouseEvent('mousedown', {
      clientX: 200,
      clientY: config.margin.top + 30, // Inside first genome panel
      shiftKey: true,
      bubbles: true,
    });
    Object.defineProperty(mousedown, 'offsetY', { value: config.margin.top + 30 });
    svg.dispatchEvent(mousedown);

    // Simulate mousemove
    const mousemove = new MouseEvent('mousemove', {
      clientX: 400,
      clientY: config.margin.top + 30,
      shiftKey: true,
      bubbles: true,
    });
    svg.dispatchEvent(mousemove);

    // During drag, a rect should exist
    const rects = svg.querySelectorAll('.region-selection-rect');
    expect(rects.length).toBeGreaterThanOrEqual(1);
  });

  it('should complete drag and set selection on mouseup', () => {
    const state = makeState();
    const onSelect = vi.fn();
    handle = setupRegionSelection(svg, state, config, onSelect);

    // Simulate a complete shift+drag
    const mousedown = new MouseEvent('mousedown', {
      clientX: 200,
      clientY: config.margin.top + 30,
      shiftKey: true,
      bubbles: true,
    });
    Object.defineProperty(mousedown, 'offsetY', { value: config.margin.top + 30 });
    svg.dispatchEvent(mousedown);

    const mousemove = new MouseEvent('mousemove', {
      clientX: 500,
      clientY: config.margin.top + 30,
      bubbles: true,
    });
    svg.dispatchEvent(mousemove);

    const mouseup = new MouseEvent('mouseup', {
      clientX: 500,
      clientY: config.margin.top + 30,
      bubbles: true,
    });
    svg.dispatchEvent(mouseup);

    expect(onSelect).toHaveBeenCalledOnce();
    const selection = handle.getSelection();
    expect(selection).toBeDefined();
    expect(selection!.genomeIndex).toBe(0);
    expect(selection!.start).toBeLessThan(selection!.end);
  });

  it('should discard small drags (<5px)', () => {
    const state = makeState();
    const onSelect = vi.fn();
    handle = setupRegionSelection(svg, state, config, onSelect);

    const mousedown = new MouseEvent('mousedown', {
      clientX: 200,
      clientY: config.margin.top + 30,
      shiftKey: true,
      bubbles: true,
    });
    Object.defineProperty(mousedown, 'offsetY', { value: config.margin.top + 30 });
    svg.dispatchEvent(mousedown);

    const mousemove = new MouseEvent('mousemove', {
      clientX: 202,
      clientY: config.margin.top + 30,
      bubbles: true,
    });
    svg.dispatchEvent(mousemove);

    const mouseup = new MouseEvent('mouseup', {
      clientX: 202,
      clientY: config.margin.top + 30,
      bubbles: true,
    });
    svg.dispatchEvent(mouseup);

    expect(onSelect).not.toHaveBeenCalled();
    expect(handle.getSelection()).toBeUndefined();
  });

  it('should not start drag outside genome panels', () => {
    handle = setupRegionSelection(svg, makeState(), config);

    const mousedown = new MouseEvent('mousedown', {
      clientX: 200,
      clientY: 5, // Above margin.top, outside panels
      shiftKey: true,
      bubbles: true,
    });
    Object.defineProperty(mousedown, 'offsetY', { value: 5 });
    svg.dispatchEvent(mousedown);

    // No drag rects
    expect(svg.querySelectorAll('.region-selection-rect')).toHaveLength(0);
  });

  it('should render selection highlights on visible panels after selection', () => {
    const state = makeState();
    handle = setupRegionSelection(svg, state, config);

    // Complete a shift+drag
    const mousedown = new MouseEvent('mousedown', {
      clientX: 200,
      clientY: config.margin.top + 30,
      shiftKey: true,
      bubbles: true,
    });
    Object.defineProperty(mousedown, 'offsetY', { value: config.margin.top + 30 });
    svg.dispatchEvent(mousedown);

    svg.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: config.margin.top + 30, bubbles: true }));
    svg.dispatchEvent(new MouseEvent('mouseup', { clientX: 500, clientY: config.margin.top + 30, bubbles: true }));

    // Should have selection rects for both visible genomes
    const rects = svg.querySelectorAll('.region-selection-rect');
    expect(rects.length).toBe(2);
  });

  it('should update selection highlights on state update', () => {
    const state = makeState();
    handle = setupRegionSelection(svg, state, config);

    // Complete a drag
    const mousedown = new MouseEvent('mousedown', {
      clientX: 200,
      clientY: config.margin.top + 30,
      shiftKey: true,
      bubbles: true,
    });
    Object.defineProperty(mousedown, 'offsetY', { value: config.margin.top + 30 });
    svg.dispatchEvent(mousedown);
    svg.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: config.margin.top + 30, bubbles: true }));
    svg.dispatchEvent(new MouseEvent('mouseup', { clientX: 500, clientY: config.margin.top + 30, bubbles: true }));

    // Update should re-render selection rects
    handle.update(state);
    const rects = svg.querySelectorAll('.region-selection-rect');
    expect(rects.length).toBe(2);
  });

  it('should clear selection rects on clearSelection', () => {
    const state = makeState();
    handle = setupRegionSelection(svg, state, config);

    // Complete a drag
    const mousedown = new MouseEvent('mousedown', {
      clientX: 200,
      clientY: config.margin.top + 30,
      shiftKey: true,
      bubbles: true,
    });
    Object.defineProperty(mousedown, 'offsetY', { value: config.margin.top + 30 });
    svg.dispatchEvent(mousedown);
    svg.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: config.margin.top + 30, bubbles: true }));
    svg.dispatchEvent(new MouseEvent('mouseup', { clientX: 500, clientY: config.margin.top + 30, bubbles: true }));

    handle.clearSelection();
    expect(svg.querySelectorAll('.region-selection-rect')).toHaveLength(0);
    expect(handle.getSelection()).toBeUndefined();
  });
});
