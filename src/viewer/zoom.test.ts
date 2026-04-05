import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupZoom } from './zoom.ts';
import { createViewerState } from './viewer-state.ts';
import type { ViewerState } from './viewer-state.ts';
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
    ],
    genomes: [
      { index: 1, name: 'g1.fa', length: 1000, format: 'FastA' },
      { index: 2, name: 'g2.fa', length: 1200, format: 'FastA' },
    ],
  };
}

describe('setupZoom', () => {
  let container: HTMLDivElement;
  let svg: SVGSVGElement;
  let state: ViewerState;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '1000');
    svg.setAttribute('height', '300');
    container.appendChild(svg);

    state = createViewerState(makeAlignment(), TEST_CONFIG);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should return a zoom handle with all methods', () => {
    const transforms: d3.ZoomTransform[] = [];
    const handle = setupZoom(svg, state, (t) => transforms.push(t));

    expect(handle.zoomBehavior).toBeDefined();
    expect(handle.destroy).toBeInstanceOf(Function);
    expect(handle.zoomIn).toBeInstanceOf(Function);
    expect(handle.zoomOut).toBeInstanceOf(Function);
    expect(handle.panLeft).toBeInstanceOf(Function);
    expect(handle.panRight).toBeInstanceOf(Function);
    expect(handle.reset).toBeInstanceOf(Function);

    handle.destroy();
  });

  it('should fire onChange when zoomIn is called', () => {
    const transforms: d3.ZoomTransform[] = [];
    const handle = setupZoom(svg, state, (t) => transforms.push(t));

    handle.zoomIn();

    expect(transforms.length).toBeGreaterThan(0);
    const last = transforms[transforms.length - 1]!;
    expect(last.k).toBe(2);

    handle.destroy();
  });

  it('should fire onChange when zoomOut is called', () => {
    const transforms: d3.ZoomTransform[] = [];
    const handle = setupZoom(svg, state, (t) => transforms.push(t));

    // First zoom in, then zoom out
    handle.zoomIn();
    const countAfterIn = transforms.length;
    handle.zoomOut();

    expect(transforms.length).toBeGreaterThan(countAfterIn);
    const last = transforms[transforms.length - 1]!;
    expect(last.k).toBeCloseTo(1, 5);

    handle.destroy();
  });

  it('should pan right when panRight is called', () => {
    const transforms: d3.ZoomTransform[] = [];
    const handle = setupZoom(svg, state, (t) => transforms.push(t));

    handle.panRight();

    expect(transforms.length).toBeGreaterThan(0);
    const last = transforms[transforms.length - 1]!;
    expect(last.x).toBeLessThan(0);

    handle.destroy();
  });

  it('should pan left when panLeft is called', () => {
    const transforms: d3.ZoomTransform[] = [];
    const handle = setupZoom(svg, state, (t) => transforms.push(t));

    // First pan right to move away from origin, then pan left back toward 0
    handle.panRight();
    const afterRight = transforms[transforms.length - 1]!;
    expect(afterRight.x).toBeLessThan(0);

    handle.panLeft();
    const afterLeft = transforms[transforms.length - 1]!;
    expect(afterLeft.x).toBeGreaterThan(afterRight.x);

    handle.destroy();
  });

  it('should clamp panLeft at zero when already at origin', () => {
    const transforms: d3.ZoomTransform[] = [];
    const handle = setupZoom(svg, state, (t) => transforms.push(t));

    handle.panLeft();

    expect(transforms.length).toBeGreaterThan(0);
    const last = transforms[transforms.length - 1]!;
    expect(last.x).toBe(0);

    handle.destroy();
  });

  it('should reset to identity transform', () => {
    const transforms: d3.ZoomTransform[] = [];
    const handle = setupZoom(svg, state, (t) => transforms.push(t));

    handle.zoomIn();
    handle.reset();

    const last = transforms[transforms.length - 1]!;
    expect(last.k).toBe(1);
    expect(last.x).toBe(0);

    handle.destroy();
  });

  it('should not zoom beyond max scale', () => {
    const transforms: d3.ZoomTransform[] = [];
    const handle = setupZoom(svg, state, (t) => transforms.push(t), {
      minScale: 1,
      maxScale: 4,
      zoomFactor: 2,
      scrollPercent: 0.1,
      acceleratedScrollPercent: 0.2,
    });

    handle.zoomIn(); // 2x
    handle.zoomIn(); // 4x (at max)
    handle.zoomIn(); // should stay at 4x

    const last = transforms[transforms.length - 1]!;
    expect(last.k).toBeLessThanOrEqual(4);

    handle.destroy();
  });

  it('should clean up event listeners on destroy', () => {
    const transforms: d3.ZoomTransform[] = [];
    const handle = setupZoom(svg, state, (t) => transforms.push(t));

    handle.destroy();

    // After destroy, zoom interactions should not fire
    const countBefore = transforms.length;

    // Dispatching a keyboard event should not trigger zoom
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', ctrlKey: true }),
    );

    expect(transforms.length).toBe(countBefore);
  });

  it('should zoom in via Ctrl+ArrowUp keyboard shortcut', () => {
    const transforms: d3.ZoomTransform[] = [];
    const handle = setupZoom(svg, state, (t) => transforms.push(t));

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', ctrlKey: true, bubbles: true }),
    );

    expect(transforms.length).toBeGreaterThan(0);
    const last = transforms[transforms.length - 1]!;
    expect(last.k).toBe(2);

    handle.destroy();
  });

  it('should zoom out via Ctrl+ArrowDown keyboard shortcut', () => {
    const transforms: d3.ZoomTransform[] = [];
    const handle = setupZoom(svg, state, (t) => transforms.push(t));

    // First zoom in, then test zoom out
    handle.zoomIn();
    const countAfterIn = transforms.length;

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, bubbles: true }),
    );

    expect(transforms.length).toBeGreaterThan(countAfterIn);
    const last = transforms[transforms.length - 1]!;
    expect(last.k).toBeCloseTo(1, 5);

    handle.destroy();
  });

  it('should scroll left via Ctrl+ArrowLeft', () => {
    const transforms: d3.ZoomTransform[] = [];
    const handle = setupZoom(svg, state, (t) => transforms.push(t));

    // First scroll right, then scroll left back toward 0
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true, bubbles: true }),
    );
    const afterRight = transforms[transforms.length - 1]!;
    expect(afterRight.x).toBeLessThan(0);

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', ctrlKey: true, bubbles: true }),
    );
    const afterLeft = transforms[transforms.length - 1]!;
    expect(afterLeft.x).toBeGreaterThan(afterRight.x);

    handle.destroy();
  });

  it('should clamp Ctrl+ArrowLeft at zero when at origin', () => {
    const transforms: d3.ZoomTransform[] = [];
    const handle = setupZoom(svg, state, (t) => transforms.push(t));

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', ctrlKey: true, bubbles: true }),
    );

    expect(transforms.length).toBeGreaterThan(0);
    const last = transforms[transforms.length - 1]!;
    expect(last.x).toBe(0);

    handle.destroy();
  });

  it('should scroll right via Ctrl+ArrowRight', () => {
    const transforms: d3.ZoomTransform[] = [];
    const handle = setupZoom(svg, state, (t) => transforms.push(t));

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true, bubbles: true }),
    );

    expect(transforms.length).toBeGreaterThan(0);
    const last = transforms[transforms.length - 1]!;
    expect(last.x).toBeLessThan(0);

    handle.destroy();
  });

  it('should scroll faster with Shift+Ctrl+ArrowRight', () => {
    const transforms: d3.ZoomTransform[] = [];
    const handle = setupZoom(svg, state, (t) => transforms.push(t));

    // Regular scroll
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true, bubbles: true }),
    );
    const regularShift = Math.abs(transforms[transforms.length - 1]!.x);

    handle.reset();

    // Accelerated scroll
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true, shiftKey: true, bubbles: true }),
    );
    const acceleratedShift = Math.abs(transforms[transforms.length - 1]!.x);

    expect(acceleratedShift).toBeGreaterThan(regularShift);

    handle.destroy();
  });

  it('should ignore keyboard events without Ctrl key', () => {
    const transforms: d3.ZoomTransform[] = [];
    const handle = setupZoom(svg, state, (t) => transforms.push(t));

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
    );

    expect(transforms.length).toBe(0);

    handle.destroy();
  });
});
