import { describe, it, expect } from 'vitest';
import {
  createViewerState,
  applyZoomTransform,
  getZoomedScale,
  getVisibleDomain,
  getVisibleRangeSize,
  findLcbAtPosition,
  findHomologousPositions,
  pixelToPosition,
  positionToPixel,
} from './viewer-state.ts';
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

describe('createViewerState', () => {
  it('should create initial state with identity transform', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    expect(state.zoomTransform.k).toBe(1);
    expect(state.zoomTransform.x).toBe(0);
    expect(state.baseScales).toHaveLength(2);
    expect(state.innerWidth).toBe(890);
  });

  it('should create one base scale per genome', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    expect(state.baseScales[0]!.domain()).toEqual([1, 1000]);
    expect(state.baseScales[1]!.domain()).toEqual([1, 1200]);
  });
});

describe('applyZoomTransform', () => {
  it('should return new state with updated transform', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const newTransform = d3.zoomIdentity.translate(50, 0).scale(2);
    const updated = applyZoomTransform(state, newTransform);

    expect(updated.zoomTransform.k).toBe(2);
    expect(updated.zoomTransform.x).toBe(50);
    expect(updated.alignment).toBe(state.alignment);
  });

  it('should not mutate the original state', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const newTransform = d3.zoomIdentity.scale(3);
    applyZoomTransform(state, newTransform);

    expect(state.zoomTransform.k).toBe(1);
  });
});

describe('getZoomedScale', () => {
  it('should return base scale when no zoom applied', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const scale = getZoomedScale(state, 0);
    expect(scale.domain()).toEqual([1, 1000]);
  });

  it('should return rescaled domain when zoomed in', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const zoomed = applyZoomTransform(state, d3.zoomIdentity.scale(2));
    const scale = getZoomedScale(zoomed, 0);

    // At 2x zoom, the visible domain should be halved
    const [start, end] = scale.domain();
    expect(end - start).toBeCloseTo(999 / 2, 0);
  });

  it('should throw for invalid genome index', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    expect(() => getZoomedScale(state, 99)).toThrow('Invalid genome index');
  });
});

describe('getVisibleDomain', () => {
  it('should return full domain at identity zoom', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const [start, end] = getVisibleDomain(state, 0);
    expect(start).toBeCloseTo(1, 0);
    expect(end).toBeCloseTo(1000, 0);
  });
});

describe('getVisibleRangeSize', () => {
  it('should return full range at identity zoom', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const size = getVisibleRangeSize(state, 0);
    expect(size).toBeCloseTo(999, 0);
  });

  it('should return half range at 2x zoom', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const zoomed = applyZoomTransform(state, d3.zoomIdentity.scale(2));
    const size = getVisibleRangeSize(zoomed, 0);
    expect(size).toBeCloseTo(999 / 2, 0);
  });
});

describe('findLcbAtPosition', () => {
  it('should find LCB covering a position', () => {
    const alignment = makeAlignment();
    const result = findLcbAtPosition(alignment, 0, 250);
    expect(result).toBeDefined();
    expect(result!.lcbIndex).toBe(0);
    expect(result!.lcb.id).toBe(0);
  });

  it('should find second LCB', () => {
    const alignment = makeAlignment();
    const result = findLcbAtPosition(alignment, 0, 650);
    expect(result).toBeDefined();
    expect(result!.lcbIndex).toBe(1);
  });

  it('should return undefined for positions outside all LCBs', () => {
    const alignment = makeAlignment();
    const result = findLcbAtPosition(alignment, 0, 450);
    expect(result).toBeUndefined();
  });

  it('should return undefined for position at LCB boundary (inclusive)', () => {
    const alignment = makeAlignment();
    const resultLeft = findLcbAtPosition(alignment, 0, 100);
    expect(resultLeft).toBeDefined();
    const resultRight = findLcbAtPosition(alignment, 0, 400);
    expect(resultRight).toBeDefined();
  });
});

describe('findHomologousPositions', () => {
  it('should map positions between forward-strand LCBs', () => {
    const alignment = makeAlignment();
    // LCB 0: genome 0 [100,400], genome 1 [200,500], both forward
    // Position 250 in genome 0 = 50% through the LCB
    const positions = findHomologousPositions(alignment, 0, 250);

    expect(positions).toHaveLength(2);
    expect(positions[0]!.genomeIndex).toBe(0);
    expect(positions[0]!.position).toBe(250);

    // genome1: 200 + 0.5 * 300 = 350
    expect(positions[1]!.genomeIndex).toBe(1);
    expect(positions[1]!.position).toBe(350);
  });

  it('should handle reverse-strand mapping', () => {
    const alignment = makeAlignment();
    // LCB 1: genome 0 [500,800] forward, genome 1 [600,900] reverse
    // Position 650 in genome 0 = 50% through the LCB
    const positions = findHomologousPositions(alignment, 0, 650);

    expect(positions).toHaveLength(2);
    expect(positions[0]!.genomeIndex).toBe(0);
    expect(positions[0]!.position).toBe(650);

    // genome1 reverse: 900 - 0.5 * 300 = 750
    expect(positions[1]!.genomeIndex).toBe(1);
    expect(positions[1]!.position).toBe(750);
  });

  it('should return empty array for positions outside LCBs', () => {
    const alignment = makeAlignment();
    const positions = findHomologousPositions(alignment, 0, 450);
    expect(positions).toEqual([]);
  });

  it('should include all genomes in LCB', () => {
    const alignment: XmfaAlignment = {
      ...makeAlignment(),
      lcbs: [
        { id: 0, left: [100, 200, 300], right: [400, 500, 600], reverse: [false, false, false], weight: 301 },
      ],
      genomes: [
        { index: 1, name: 'g1.fa', length: 1000, format: 'FastA' },
        { index: 2, name: 'g2.fa', length: 1200, format: 'FastA' },
        { index: 3, name: 'g3.fa', length: 900, format: 'FastA' },
      ],
    };
    const positions = findHomologousPositions(alignment, 0, 250);
    expect(positions).toHaveLength(3);
  });
});

describe('pixelToPosition and positionToPixel', () => {
  it('should round-trip positions', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const pos = 500;
    const pixel = positionToPixel(state, 0, pos);
    const roundTripped = pixelToPosition(state, 0, pixel);
    expect(roundTripped).toBe(pos);
  });

  it('should work with zoomed state', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const zoomed = applyZoomTransform(state, d3.zoomIdentity.scale(2));
    const pos = 500;
    const pixel = positionToPixel(zoomed, 0, pos);
    const roundTripped = pixelToPosition(zoomed, 0, pixel);
    expect(roundTripped).toBe(pos);
  });
});
