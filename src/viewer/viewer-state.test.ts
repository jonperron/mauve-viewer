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
  moveGenomeUp,
  moveGenomeDown,
  setReferenceGenome,
  hideGenome,
  showGenome,
  getVisibleGenomeOrder,
  isVisuallyReverse,
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

function makeThreeGenomeAlignment(): XmfaAlignment {
  return {
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
      { id: 0, left: [100, 200, 300], right: [400, 500, 600], reverse: [false, true, false], weight: 301 },
    ],
    genomes: [
      { index: 1, name: 'g1.fa', length: 1000, format: 'FastA' },
      { index: 2, name: 'g2.fa', length: 1200, format: 'FastA' },
      { index: 3, name: 'g3.fa', length: 900, format: 'FastA' },
    ],
  };
}

describe('createViewerState (track management fields)', () => {
  it('should initialize genomeOrder as sequential indices', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    expect(state.genomeOrder).toEqual([0, 1]);
  });

  it('should initialize referenceGenomeIndex to 0', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    expect(state.referenceGenomeIndex).toBe(0);
  });

  it('should initialize hiddenGenomes as empty set', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    expect(state.hiddenGenomes.size).toBe(0);
  });

  it('should initialize with three genomes', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    expect(state.genomeOrder).toEqual([0, 1, 2]);
  });
});

describe('moveGenomeUp', () => {
  it('should swap a genome with the one above it', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const updated = moveGenomeUp(state, 1);
    expect(updated.genomeOrder).toEqual([1, 0, 2]);
  });

  it('should return unchanged state if at top (displayIndex 0)', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const updated = moveGenomeUp(state, 0);
    expect(updated).toBe(state);
  });

  it('should return unchanged state for negative index', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const updated = moveGenomeUp(state, -1);
    expect(updated).toBe(state);
  });

  it('should return unchanged state for out-of-bounds index', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const updated = moveGenomeUp(state, 5);
    expect(updated).toBe(state);
  });

  it('should not mutate the original state', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    moveGenomeUp(state, 1);
    expect(state.genomeOrder).toEqual([0, 1, 2]);
  });

  it('should swap last genome up', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const updated = moveGenomeUp(state, 2);
    expect(updated.genomeOrder).toEqual([0, 2, 1]);
  });
});

describe('moveGenomeDown', () => {
  it('should swap a genome with the one below it', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const updated = moveGenomeDown(state, 0);
    expect(updated.genomeOrder).toEqual([1, 0, 2]);
  });

  it('should return unchanged state if at bottom', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const updated = moveGenomeDown(state, 2);
    expect(updated).toBe(state);
  });

  it('should return unchanged state for negative index', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const updated = moveGenomeDown(state, -1);
    expect(updated).toBe(state);
  });

  it('should not mutate the original state', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    moveGenomeDown(state, 0);
    expect(state.genomeOrder).toEqual([0, 1, 2]);
  });
});

describe('setReferenceGenome', () => {
  it('should set a new reference genome', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const updated = setReferenceGenome(state, 1);
    expect(updated.referenceGenomeIndex).toBe(1);
  });

  it('should return unchanged state if already reference', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const updated = setReferenceGenome(state, 0);
    expect(updated).toBe(state);
  });

  it('should return unchanged state for out-of-bounds index', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const updated = setReferenceGenome(state, 99);
    expect(updated).toBe(state);
  });

  it('should return unchanged state for negative index', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const updated = setReferenceGenome(state, -1);
    expect(updated).toBe(state);
  });

  it('should not mutate the original state', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    setReferenceGenome(state, 2);
    expect(state.referenceGenomeIndex).toBe(0);
  });
});

describe('hideGenome', () => {
  it('should hide a genome', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const updated = hideGenome(state, 1);
    expect(updated.hiddenGenomes.has(1)).toBe(true);
    expect(updated.hiddenGenomes.size).toBe(1);
  });

  it('should return unchanged state if already hidden', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const hidden = hideGenome(state, 1);
    const again = hideGenome(hidden, 1);
    expect(again).toBe(hidden);
  });

  it('should return unchanged state for out-of-bounds index', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const updated = hideGenome(state, 99);
    expect(updated).toBe(state);
  });

  it('should not mutate the original state', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    hideGenome(state, 1);
    expect(state.hiddenGenomes.size).toBe(0);
  });

  it('should prevent hiding the last visible genome', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const hidden1 = hideGenome(state, 0);
    expect(hidden1.hiddenGenomes.has(0)).toBe(true);
    // Trying to hide the second genome should fail (would leave 0 visible)
    const hidden2 = hideGenome(hidden1, 1);
    expect(hidden2).toBe(hidden1);
    expect(hidden2.hiddenGenomes.has(1)).toBe(false);
  });
});

describe('showGenome', () => {
  it('should show a hidden genome', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const hidden = hideGenome(state, 1);
    const shown = showGenome(hidden, 1);
    expect(shown.hiddenGenomes.has(1)).toBe(false);
    expect(shown.hiddenGenomes.size).toBe(0);
  });

  it('should return unchanged state if not hidden', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const updated = showGenome(state, 1);
    expect(updated).toBe(state);
  });

  it('should not mutate the original state', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const hidden = hideGenome(state, 1);
    showGenome(hidden, 1);
    expect(hidden.hiddenGenomes.has(1)).toBe(true);
  });
});

describe('getVisibleGenomeOrder', () => {
  it('should return all genomes when none hidden', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    expect(getVisibleGenomeOrder(state)).toEqual([0, 1, 2]);
  });

  it('should exclude hidden genomes', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const hidden = hideGenome(state, 1);
    expect(getVisibleGenomeOrder(hidden)).toEqual([0, 2]);
  });

  it('should respect display order', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const reordered = moveGenomeDown(state, 0);
    expect(getVisibleGenomeOrder(reordered)).toEqual([1, 0, 2]);
  });

  it('should combine reorder with hide', () => {
    const state = createViewerState(makeThreeGenomeAlignment(), TEST_CONFIG);
    const reordered = moveGenomeDown(state, 0);       // [1, 0, 2]
    const hidden = hideGenome(reordered, 0);           // hide data index 0
    expect(getVisibleGenomeOrder(hidden)).toEqual([1, 2]);
  });
});

describe('isVisuallyReverse', () => {
  it('should return original reverse when reference is forward', () => {
    // LCB: g0=forward, g1=reverse, g2=forward
    const lcb = makeThreeGenomeAlignment().lcbs[0]!;
    expect(isVisuallyReverse(lcb, 0, 0)).toBe(false);  // g0 forward, ref=g0 forward
    expect(isVisuallyReverse(lcb, 1, 0)).toBe(true);   // g1 reverse, ref=g0 forward
    expect(isVisuallyReverse(lcb, 2, 0)).toBe(false);  // g2 forward, ref=g0 forward
  });

  it('should flip all when reference is reverse in this LCB', () => {
    // LCB: g0=forward, g1=reverse, g2=forward. Reference=g1 (reverse)
    const lcb = makeThreeGenomeAlignment().lcbs[0]!;
    expect(isVisuallyReverse(lcb, 0, 1)).toBe(true);   // XOR: false != true = true
    expect(isVisuallyReverse(lcb, 1, 1)).toBe(false);  // XOR: true != true = false (ref always forward)
    expect(isVisuallyReverse(lcb, 2, 1)).toBe(true);   // XOR: false != true = true
  });

  it('should handle LCB where reference is forward (no flip)', () => {
    // All-forward LCB
    const lcb = { id: 0, left: [100, 200], right: [400, 500], reverse: [false, false], weight: 301 };
    expect(isVisuallyReverse(lcb, 0, 0)).toBe(false);
    expect(isVisuallyReverse(lcb, 1, 0)).toBe(false);
  });

  it('should handle all-reverse LCB with reference at index 0', () => {
    const lcb = { id: 0, left: [100, 200], right: [400, 500], reverse: [true, true], weight: 301 };
    // ref=g0 (reverse), so both get flipped
    expect(isVisuallyReverse(lcb, 0, 0)).toBe(false);  // both true => XOR = false
    expect(isVisuallyReverse(lcb, 1, 0)).toBe(false);  // both true => XOR = false
  });
});
