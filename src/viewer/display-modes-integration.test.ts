import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderAlignment } from './alignment-viewer.ts';
import type { ViewerHandle } from './alignment-viewer.ts';
import type { XmfaAlignment } from '../xmfa/types.ts';

function makeAlignment(overrides?: Partial<XmfaAlignment>): XmfaAlignment {
  return {
    header: {
      formatVersion: 'Mauve1',
      sequenceCount: 2,
      sequenceEntries: [
        { index: 1, file: 'genome1.fasta', format: 'FastA' },
        { index: 2, file: 'genome2.gbk', format: 'FastA' },
      ],
    },
    blocks: [
      {
        segments: [
          { sequenceIndex: 0, start: 100, end: 400, strand: '+', sourceFile: 'genome1.fasta', sequenceData: 'ACGT' },
          { sequenceIndex: 1, start: 50, end: 350, strand: '+', sourceFile: 'genome2.gbk', sequenceData: 'ACGT' },
        ],
      },
      {
        segments: [
          { sequenceIndex: 0, start: 500, end: 800, strand: '+', sourceFile: 'genome1.fasta', sequenceData: 'TTTT' },
          { sequenceIndex: 1, start: 400, end: 700, strand: '-', sourceFile: 'genome2.gbk', sequenceData: 'AAAA' },
        ],
      },
    ],
    lcbs: [
      { id: 0, left: [100, 50], right: [400, 350], reverse: [false, false], weight: 301 },
      { id: 1, left: [500, 400], right: [800, 700], reverse: [false, true], weight: 301 },
    ],
    genomes: [
      { index: 1, name: 'genome1.fasta', length: 800, format: 'FastA' },
      { index: 2, name: 'genome2.gbk', length: 700, format: 'FastA' },
    ],
    ...overrides,
  };
}

describe('renderAlignment with display modes', () => {
  let container: HTMLDivElement;
  let handle: ViewerHandle | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    handle?.destroy();
    handle = undefined;
    container.remove();
  });

  describe('LCB mode (default)', () => {
    it('should render LCB blocks in default mode', () => {
      handle = renderAlignment(container, makeAlignment());
      const blocks = container.querySelectorAll('.lcb-block');
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should render connecting lines in LCB mode', () => {
      handle = renderAlignment(container, makeAlignment());
      const connectors = container.querySelectorAll('.lcb-connector');
      expect(connectors.length).toBeGreaterThan(0);
    });

    it('should have lcb display mode in state', () => {
      handle = renderAlignment(container, makeAlignment());
      expect(handle.getState().displayMode).toBe('lcb');
    });

    it('should render unaligned regions in LCB mode', () => {
      handle = renderAlignment(container, makeAlignment());
      const unaligned = container.querySelectorAll('.unaligned-block');
      expect(unaligned.length).toBeGreaterThan(0);
    });
  });

  describe('Ungapped match mode', () => {
    it('should render match blocks in ungapped-match mode', () => {
      handle = renderAlignment(container, makeAlignment(), undefined, undefined, 'ungapped-match');
      const blocks = container.querySelectorAll('.match-block');
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should NOT render LCB blocks in ungapped-match mode', () => {
      handle = renderAlignment(container, makeAlignment(), undefined, undefined, 'ungapped-match');
      const blocks = container.querySelectorAll('.lcb-block');
      expect(blocks.length).toBe(0);
    });

    it('should NOT render connecting lines in ungapped-match mode', () => {
      handle = renderAlignment(container, makeAlignment(), undefined, undefined, 'ungapped-match');
      const connectors = container.querySelectorAll('.lcb-connector');
      expect(connectors.length).toBe(0);
    });

    it('should have ungapped-match display mode in state', () => {
      handle = renderAlignment(container, makeAlignment(), undefined, undefined, 'ungapped-match');
      expect(handle.getState().displayMode).toBe('ungapped-match');
    });

    it('should render unaligned regions in ungapped-match mode', () => {
      handle = renderAlignment(container, makeAlignment(), undefined, undefined, 'ungapped-match');
      const unaligned = container.querySelectorAll('.unaligned-block');
      expect(unaligned.length).toBeGreaterThan(0);
    });

    it('should render genome labels in ungapped-match mode', () => {
      handle = renderAlignment(container, makeAlignment(), undefined, undefined, 'ungapped-match');
      const labels = container.querySelectorAll('.genome-label');
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  describe('Similarity profile mode', () => {
    it('should render similarity area charts in similarity-profile mode', () => {
      handle = renderAlignment(container, makeAlignment(), undefined, undefined, 'similarity-profile');
      const areas = container.querySelectorAll('.similarity-area');
      expect(areas.length).toBeGreaterThan(0);
    });

    it('should NOT render LCB blocks in similarity-profile mode', () => {
      handle = renderAlignment(container, makeAlignment(), undefined, undefined, 'similarity-profile');
      const blocks = container.querySelectorAll('.lcb-block');
      expect(blocks.length).toBe(0);
    });

    it('should NOT render connecting lines in similarity-profile mode', () => {
      handle = renderAlignment(container, makeAlignment(), undefined, undefined, 'similarity-profile');
      const connectors = container.querySelectorAll('.lcb-connector');
      expect(connectors.length).toBe(0);
    });

    it('should have similarity-profile display mode in state', () => {
      handle = renderAlignment(container, makeAlignment(), undefined, undefined, 'similarity-profile');
      expect(handle.getState().displayMode).toBe('similarity-profile');
    });

    it('should render unaligned regions in similarity-profile mode', () => {
      handle = renderAlignment(container, makeAlignment(), undefined, undefined, 'similarity-profile');
      const unaligned = container.querySelectorAll('.unaligned-block');
      expect(unaligned.length).toBeGreaterThan(0);
    });
  });

  describe('Display mode selector', () => {
    it('should show display mode selector when blocks are available', () => {
      handle = renderAlignment(container, makeAlignment());
      const selector = container.querySelector('.display-mode-selector');
      expect(selector).not.toBeNull();
    });

    it('should not show display mode selector when only one mode available', () => {
      const emptyAlignment = makeAlignment({ blocks: [], lcbs: [] });
      handle = renderAlignment(container, emptyAlignment);
      const selector = container.querySelector('.display-mode-selector');
      // With no LCBs and no blocks, only 'lcb' mode is available
      expect(selector).toBeNull();
    });
  });
});
