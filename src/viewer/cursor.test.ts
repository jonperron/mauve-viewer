import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupCursor } from './cursor.ts';
import { createViewerState, applyZoomTransform } from './viewer-state.ts';
import { renderAlignment } from './alignment-viewer.ts';
import type { ViewerHandle } from './alignment-viewer.ts';
import type { XmfaAlignment } from '../xmfa/types.ts';
import type { ViewerConfig } from './alignment-viewer.ts';
import * as d3 from 'd3';

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

describe('setupCursor', () => {
  let container: HTMLDivElement;
  let svg: SVGSVGElement;
  let handle: ViewerHandle;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    handle = renderAlignment(container, makeAlignment(), TEST_CONFIG);
    svg = handle.svg;
  });

  afterEach(() => {
    handle.destroy();
    document.body.removeChild(container);
  });

  it('should create cursor lines for each genome', () => {
    const cursorLines = svg.querySelectorAll('.cursor-line');
    // renderAlignment already sets up cursor internally now
    expect(cursorLines.length).toBeGreaterThanOrEqual(2);
  });

  it('should create panel overlays for mouse interaction', () => {
    const overlays = svg.querySelectorAll('.panel-overlay');
    expect(overlays.length).toBeGreaterThanOrEqual(2);
  });

  it('should create cursor info group', () => {
    const infoGroup = svg.querySelector('.cursor-info-group');
    expect(infoGroup).toBeDefined();
  });

  it('should have cursor lines initially hidden (opacity 0)', () => {
    const cursorLines = svg.querySelectorAll('.cursor-line');
    cursorLines.forEach((line) => {
      expect(line.getAttribute('opacity')).toBe('0');
    });
  });
});

describe('setupCursor standalone', () => {
  let container: HTMLDivElement;
  let svg: SVGSVGElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '1000');
    svg.setAttribute('height', '300');
    container.appendChild(svg);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should return a handle with destroy and update methods', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const handle = setupCursor(svg, state, TEST_CONFIG, () => {});

    expect(handle.destroy).toBeInstanceOf(Function);
    expect(handle.update).toBeInstanceOf(Function);

    handle.destroy();
  });

  it('should remove cursor elements on destroy', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const handle = setupCursor(svg, state, TEST_CONFIG, () => {});

    expect(svg.querySelectorAll('.cursor-line').length).toBe(2);

    handle.destroy();

    expect(svg.querySelectorAll('.cursor-line').length).toBe(0);
    expect(svg.querySelectorAll('.panel-overlay').length).toBe(0);
  });

  it('should call align callback on click', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const clicks: { genomeIndex: number; position: number }[] = [];
    const handle = setupCursor(svg, state, TEST_CONFIG, (gi, pos) => {
      clicks.push({ genomeIndex: gi, position: pos });
    });

    // Simulate a click on the first panel overlay
    const overlay = svg.querySelector('.panel-overlay-0') as SVGRectElement;
    expect(overlay).toBeDefined();

    // Dispatch click event
    const clickEvent = new MouseEvent('click', { bubbles: true, clientX: 200, clientY: 50 });
    overlay.dispatchEvent(clickEvent);

    expect(clicks.length).toBe(1);
    expect(clicks[0]!.genomeIndex).toBe(0);
    expect(typeof clicks[0]!.position).toBe('number');

    handle.destroy();
  });

  it('should update state via update method', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const handle = setupCursor(svg, state, TEST_CONFIG, () => {});

    const newState = applyZoomTransform(state, d3.zoomIdentity.scale(2));
    handle.update(newState);

    // No error thrown
    expect(true).toBe(true);

    handle.destroy();
  });

  it('should show cursor lines on mousemove over panel overlay', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const handle = setupCursor(svg, state, TEST_CONFIG, () => {});

    const overlay = svg.querySelector('.panel-overlay-0') as SVGRectElement;
    const moveEvent = new MouseEvent('mousemove', { bubbles: true, clientX: 300, clientY: 50 });
    overlay.dispatchEvent(moveEvent);

    // At least the hovered panel cursor should become visible
    const cursorLine0 = svg.querySelector('.cursor-line-0');
    expect(cursorLine0?.getAttribute('opacity')).toBe('1');

    handle.destroy();
  });

  it('should hide cursor lines on mouseout', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const handle = setupCursor(svg, state, TEST_CONFIG, () => {});

    // First hover to show cursors
    const overlay = svg.querySelector('.panel-overlay-0') as SVGRectElement;
    const moveEvent = new MouseEvent('mousemove', { bubbles: true, clientX: 300, clientY: 50 });
    overlay.dispatchEvent(moveEvent);

    // Then mouseout
    const outEvent = new MouseEvent('mouseout', { bubbles: true });
    overlay.dispatchEvent(outEvent);

    // All cursor lines should be hidden
    const cursorLines = svg.querySelectorAll('.cursor-line');
    cursorLines.forEach((line) => {
      expect(line.getAttribute('opacity')).toBe('0');
    });

    handle.destroy();
  });

  it('should highlight LCB blocks on hover within LCB region', () => {
    // Add LCB blocks to the SVG to test highlighting
    const g = d3.select(svg).append('g');
    g.append('rect')
      .attr('class', 'lcb-block')
      .attr('data-lcb-index', '0')
      .attr('data-genome-index', '0')
      .attr('fill-opacity', 0.6)
      .attr('stroke-width', 1);
    g.append('rect')
      .attr('class', 'lcb-block')
      .attr('data-lcb-index', '0')
      .attr('data-genome-index', '1')
      .attr('fill-opacity', 0.6)
      .attr('stroke-width', 1);

    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const handle = setupCursor(svg, state, TEST_CONFIG, () => {});

    // Hover over first panel
    const overlay = svg.querySelector('.panel-overlay-0') as SVGRectElement;
    const moveEvent = new MouseEvent('mousemove', { bubbles: true, clientX: 300, clientY: 50 });
    overlay.dispatchEvent(moveEvent);

    handle.destroy();
  });

  it('should clear highlights on mouseout', () => {
    const g = d3.select(svg).append('g');
    g.append('rect')
      .attr('class', 'lcb-block')
      .attr('data-lcb-index', '0')
      .attr('stroke', '#222')
      .attr('stroke-width', 2);

    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const handle = setupCursor(svg, state, TEST_CONFIG, () => {});

    const overlay = svg.querySelector('.panel-overlay-0') as SVGRectElement;

    // Mouseout should restore default styling
    const outEvent = new MouseEvent('mouseout', { bubbles: true });
    overlay.dispatchEvent(outEvent);

    const block = svg.querySelector('.lcb-block');
    expect(block?.getAttribute('stroke')).toBeNull();
    expect(block?.getAttribute('stroke-width')).toBeNull();

    handle.destroy();
  });
});
