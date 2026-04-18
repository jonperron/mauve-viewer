import { describe, it, expect } from 'vitest';
import {
  createViewerState,
  setDisplayMode,
} from './viewer-state.ts';
import type { DisplayMode } from './viewer-state.ts';
import type { XmfaAlignment } from '../import/xmfa/types.ts';
import type { ViewerConfig } from './alignment-viewer.ts';

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

describe('DisplayMode state', () => {
  it('should default to lcb display mode', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    expect(state.displayMode).toBe('lcb');
  });

  it('should accept an initial display mode', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG, 'ungapped-match');
    expect(state.displayMode).toBe('ungapped-match');
  });

  it('should accept similarity-profile mode', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG, 'similarity-profile');
    expect(state.displayMode).toBe('similarity-profile');
  });

  it('should set display mode immutably', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG);
    const updated = setDisplayMode(state, 'ungapped-match');
    expect(updated.displayMode).toBe('ungapped-match');
    expect(state.displayMode).toBe('lcb');
    expect(updated.alignment).toBe(state.alignment);
  });

  it('should return same state when setting the same mode', () => {
    const state = createViewerState(makeAlignment(), TEST_CONFIG, 'lcb');
    const updated = setDisplayMode(state, 'lcb');
    expect(updated).toBe(state);
  });

  it('should transition between all modes', () => {
    const modes: DisplayMode[] = ['lcb', 'ungapped-match', 'similarity-profile'];
    let state = createViewerState(makeAlignment(), TEST_CONFIG);

    for (const mode of modes) {
      state = setDisplayMode(state, mode);
      expect(state.displayMode).toBe(mode);
    }
  });
});
