import { describe, it, expect } from 'vitest';
import {
  hsbToHex,
  applyColorScheme,
  getAvailableSchemes,
  COLOR_SCHEMES,
  BACKBONE_COLOR_SCHEMES,
  DEFAULT_COLOR_SCHEME_ID,
  generateDistinctColors,
} from './color-schemes.ts';
import type { ColorSchemeId } from './color-schemes.ts';
import type { XmfaAlignment, Lcb, Genome } from '../xmfa/types.ts';
import type { BackboneSegment } from '../backbone/types.ts';

function makeGenomes(count: number): readonly Genome[] {
  return Array.from({ length: count }, (_, i) => ({
    index: i + 1,
    name: `genome${i + 1}.fasta`,
    length: 1000,
    format: 'FastA',
  }));
}

function makeLcb(id: number, positions: readonly { left: number; right: number; reverse: boolean }[]): Lcb {
  return {
    id,
    left: positions.map(p => p.left),
    right: positions.map(p => p.right),
    reverse: positions.map(p => p.reverse),
    weight: 100,
  };
}

function makeAlignment(genomeCount: number, lcbs: readonly Lcb[]): XmfaAlignment {
  return {
    header: {
      formatVersion: 'Mauve1',
      sequenceCount: genomeCount,
      sequenceEntries: Array.from({ length: genomeCount }, (_, i) => ({
        index: i + 1,
        file: `genome${i + 1}.fasta`,
        format: 'FastA',
      })),
    },
    blocks: [],
    lcbs: lcbs,
    genomes: makeGenomes(genomeCount),
  };
}

describe('hsbToHex', () => {
  it('should convert pure red (h=0, s=1, b=1)', () => {
    expect(hsbToHex(0, 1, 1)).toBe('#ff0000');
  });

  it('should convert pure green (h=1/3, s=1, b=1)', () => {
    expect(hsbToHex(1 / 3, 1, 1)).toBe('#00ff00');
  });

  it('should convert pure blue (h=2/3, s=1, b=1)', () => {
    expect(hsbToHex(2 / 3, 1, 1)).toBe('#0000ff');
  });

  it('should convert black (b=0)', () => {
    expect(hsbToHex(0, 0, 0)).toBe('#000000');
  });

  it('should convert white (s=0, b=1)', () => {
    expect(hsbToHex(0, 0, 1)).toBe('#ffffff');
  });

  it('should wrap hue values > 1', () => {
    expect(hsbToHex(1.5, 1, 1)).toBe(hsbToHex(0.5, 1, 1));
  });

  it('should handle negative hue values by wrapping', () => {
    expect(hsbToHex(-0.5, 1, 1)).toBe(hsbToHex(0.5, 1, 1));
  });
});

describe('LCB color scheme', () => {
  it('should return empty array for empty LCBs', () => {
    const alignment = makeAlignment(2, []);
    const colors = applyColorScheme('lcb', alignment);
    expect(colors).toEqual([]);
  });

  it('should return one color per LCB', () => {
    const lcbs = [
      makeLcb(0, [{ left: 100, right: 200, reverse: false }, { left: 50, right: 150, reverse: false }]),
      makeLcb(1, [{ left: 300, right: 400, reverse: false }, { left: 200, right: 300, reverse: true }]),
    ];
    const alignment = makeAlignment(2, lcbs);
    const colors = applyColorScheme('lcb', alignment);
    expect(colors).toHaveLength(2);
  });

  it('should produce distinct colors for multiple LCBs', () => {
    const lcbs = Array.from({ length: 5 }, (_, i) =>
      makeLcb(i, [
        { left: i * 100 + 1, right: i * 100 + 50, reverse: false },
        { left: i * 80 + 1, right: i * 80 + 40, reverse: false },
      ]),
    );
    const alignment = makeAlignment(2, lcbs);
    const colors = applyColorScheme('lcb', alignment);
    expect(colors).toHaveLength(5);
    const unique = new Set(colors);
    expect(unique.size).toBe(5);
  });

  it('should produce valid hex color strings', () => {
    const lcbs = [
      makeLcb(0, [{ left: 100, right: 200, reverse: false }, { left: 50, right: 150, reverse: false }]),
    ];
    const alignment = makeAlignment(2, lcbs);
    const colors = applyColorScheme('lcb', alignment);
    expect(colors[0]).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('Offset color scheme', () => {
  it('should return empty array for empty LCBs', () => {
    const alignment = makeAlignment(2, []);
    const colors = applyColorScheme('offset', alignment);
    expect(colors).toEqual([]);
  });

  it('should produce colors based on position sums', () => {
    const lcbs = [
      makeLcb(0, [{ left: 10, right: 50, reverse: false }, { left: 20, right: 60, reverse: false }]),
      makeLcb(1, [{ left: 500, right: 600, reverse: false }, { left: 400, right: 500, reverse: false }]),
    ];
    const alignment = makeAlignment(2, lcbs);
    const colors = applyColorScheme('offset', alignment);
    expect(colors).toHaveLength(2);
    expect(colors[0]).not.toBe(colors[1]);
  });

  it('should give same color to LCBs with identical offsets', () => {
    const lcbs = [
      makeLcb(0, [{ left: 100, right: 200, reverse: false }, { left: 100, right: 200, reverse: false }]),
      makeLcb(1, [{ left: 100, right: 200, reverse: false }, { left: 100, right: 200, reverse: false }]),
    ];
    const alignment = makeAlignment(2, lcbs);
    const colors = applyColorScheme('offset', alignment);
    expect(colors[0]).toBe(colors[1]);
  });
});

describe('Normalized offset color scheme', () => {
  it('should return empty array for empty LCBs', () => {
    const alignment = makeAlignment(2, []);
    const colors = applyColorScheme('normalized-offset', alignment);
    expect(colors).toEqual([]);
  });

  it('should use full spectrum for diverse offsets', () => {
    const lcbs = Array.from({ length: 10 }, (_, i) =>
      makeLcb(i, [
        { left: i * 100 + 1, right: i * 100 + 50, reverse: false },
        { left: i * 80 + 1, right: i * 80 + 40, reverse: false },
      ]),
    );
    const alignment = makeAlignment(2, lcbs);
    const colors = applyColorScheme('normalized-offset', alignment);
    expect(colors).toHaveLength(10);
    const unique = new Set(colors);
    expect(unique.size).toBe(10);
  });
});

describe('Multiplicity color scheme', () => {
  it('should return empty array for empty LCBs', () => {
    const alignment = makeAlignment(3, []);
    const colors = applyColorScheme('multiplicity', alignment);
    expect(colors).toEqual([]);
  });

  it('should color LCBs by number of genomes present', () => {
    const lcbs = [
      makeLcb(0, [{ left: 100, right: 200, reverse: false }, { left: 50, right: 150, reverse: false }, { left: 0, right: 0, reverse: false }]),
      makeLcb(1, [{ left: 300, right: 400, reverse: false }, { left: 200, right: 300, reverse: false }, { left: 100, right: 200, reverse: false }]),
    ];
    const alignment = makeAlignment(3, lcbs);
    const colors = applyColorScheme('multiplicity', alignment);
    expect(colors).toHaveLength(2);
    // LCB 0 has multiplicity 2, LCB 1 has multiplicity 3 -> different colors
    expect(colors[0]).not.toBe(colors[1]);
  });

  it('should give same color to LCBs with same multiplicity', () => {
    const lcbs = [
      makeLcb(0, [{ left: 100, right: 200, reverse: false }, { left: 50, right: 150, reverse: false }, { left: 0, right: 0, reverse: false }]),
      makeLcb(1, [{ left: 300, right: 400, reverse: false }, { left: 200, right: 300, reverse: false }, { left: 0, right: 0, reverse: false }]),
    ];
    const alignment = makeAlignment(3, lcbs);
    const colors = applyColorScheme('multiplicity', alignment);
    // Both have multiplicity 2
    expect(colors[0]).toBe(colors[1]);
  });
});

describe('Multiplicity type color scheme', () => {
  it('should return empty array for empty LCBs', () => {
    const alignment = makeAlignment(3, []);
    const colors = applyColorScheme('multiplicity-type', alignment);
    expect(colors).toEqual([]);
  });

  it('should differentiate LCBs by exact genome combination', () => {
    const lcbs = [
      // Present in genomes 0+1 only
      makeLcb(0, [{ left: 100, right: 200, reverse: false }, { left: 50, right: 150, reverse: false }, { left: 0, right: 0, reverse: false }]),
      // Present in genomes 1+2 only
      makeLcb(1, [{ left: 0, right: 0, reverse: false }, { left: 200, right: 300, reverse: false }, { left: 100, right: 200, reverse: false }]),
    ];
    const alignment = makeAlignment(3, lcbs);
    const colors = applyColorScheme('multiplicity-type', alignment);
    expect(colors).toHaveLength(2);
    expect(colors[0]).not.toBe(colors[1]);
  });

  it('should throw for more than 62 sequences', () => {
    const lcbs = [makeLcb(0, Array.from({ length: 63 }, () => ({ left: 1, right: 2, reverse: false })))];
    const alignment = makeAlignment(63, lcbs);
    expect(() => applyColorScheme('multiplicity-type', alignment)).toThrow('62 or fewer');
  });
});

describe('Normalized multiplicity type color scheme', () => {
  it('should return empty array for empty LCBs', () => {
    const alignment = makeAlignment(3, []);
    const colors = applyColorScheme('normalized-multiplicity-type', alignment);
    expect(colors).toEqual([]);
  });

  it('should normalize colors to only used multiplicity types', () => {
    const lcbs = [
      makeLcb(0, [{ left: 100, right: 200, reverse: false }, { left: 50, right: 150, reverse: false }, { left: 0, right: 0, reverse: false }]),
      makeLcb(1, [{ left: 0, right: 0, reverse: false }, { left: 200, right: 300, reverse: false }, { left: 100, right: 200, reverse: false }]),
      makeLcb(2, [{ left: 300, right: 400, reverse: false }, { left: 250, right: 350, reverse: false }, { left: 0, right: 0, reverse: false }]),
    ];
    const alignment = makeAlignment(3, lcbs);
    const colors = applyColorScheme('normalized-multiplicity-type', alignment);
    expect(colors).toHaveLength(3);
    // LCBs 0 and 2 have same type (genomes 0+1), LCB 1 has different type (genomes 1+2)
    expect(colors[0]).toBe(colors[2]);
    expect(colors[0]).not.toBe(colors[1]);
  });

  it('should throw for more than 62 sequences', () => {
    const lcbs = [makeLcb(0, Array.from({ length: 63 }, () => ({ left: 1, right: 2, reverse: false })))];
    const alignment = makeAlignment(63, lcbs);
    expect(() => applyColorScheme('normalized-multiplicity-type', alignment)).toThrow('62 or fewer');
  });
});

describe('getAvailableSchemes', () => {
  it('should include all non-backbone schemes for small alignments', () => {
    const alignment = makeAlignment(3, []);
    const schemes = getAvailableSchemes(alignment);
    const ids = schemes.map(s => s.id);
    expect(ids).toContain('lcb');
    expect(ids).toContain('offset');
    expect(ids).toContain('normalized-offset');
    expect(ids).toContain('multiplicity');
    expect(ids).toContain('multiplicity-type');
    expect(ids).toContain('normalized-multiplicity-type');
  });

  it('should exclude multiplicity type schemes for >62 genomes', () => {
    const alignment = makeAlignment(63, []);
    const schemes = getAvailableSchemes(alignment);
    const ids = schemes.map(s => s.id);
    expect(ids).not.toContain('multiplicity-type');
    expect(ids).not.toContain('normalized-multiplicity-type');
    expect(ids).toContain('lcb');
    expect(ids).toContain('offset');
  });

  it('should exclude backbone schemes when no backbone data', () => {
    const alignment = makeAlignment(3, []);
    const schemes = getAvailableSchemes(alignment);
    const ids = schemes.map(s => s.id);
    expect(ids).not.toContain('backbone-lcb');
    expect(ids).not.toContain('backbone-multiplicity');
  });

  it('should include backbone schemes when backbone data is present', () => {
    const lcbs = [
      makeLcb(0, [{ left: 100, right: 200, reverse: false }, { left: 50, right: 150, reverse: false }]),
    ];
    const alignment = makeAlignment(2, lcbs);
    const backbone: BackboneSegment[] = [{
      seqIndex: 0,
      intervals: [{ leftEnd: 100, rightEnd: 200 }, { leftEnd: 50, rightEnd: 150 }],
      isBackbone: true,
    }];
    const schemes = getAvailableSchemes(alignment, backbone);
    const ids = schemes.map(s => s.id);
    expect(ids).toContain('backbone-lcb');
    expect(ids).toContain('backbone-multiplicity');
  });

  it('should exclude backbone schemes for >62 genomes', () => {
    const positions = Array.from({ length: 63 }, () => ({ left: 1, right: 2, reverse: false }));
    const lcbs = [makeLcb(0, positions)];
    const alignment = makeAlignment(63, lcbs);
    const backbone: BackboneSegment[] = [{
      seqIndex: 0,
      intervals: Array.from({ length: 63 }, () => ({ leftEnd: 1, rightEnd: 2 })),
      isBackbone: true,
    }];
    const schemes = getAvailableSchemes(alignment, backbone);
    const ids = schemes.map(s => s.id);
    expect(ids).not.toContain('backbone-lcb');
    expect(ids).not.toContain('backbone-multiplicity');
  });
});

describe('applyColorScheme', () => {
  it('should throw for unknown scheme', () => {
    const alignment = makeAlignment(2, []);
    expect(() => applyColorScheme('unknown' as ColorSchemeId, alignment)).toThrow('Unknown color scheme');
  });
});

describe('COLOR_SCHEMES registry', () => {
  it('should contain 6 schemes', () => {
    expect(COLOR_SCHEMES).toHaveLength(6);
  });

  it('should have unique IDs', () => {
    const ids = COLOR_SCHEMES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('DEFAULT_COLOR_SCHEME_ID', () => {
  it('should be lcb', () => {
    expect(DEFAULT_COLOR_SCHEME_ID).toBe('lcb');
  });
});

describe('generateDistinctColors', () => {
  it('should return empty array for count 0', () => {
    expect(generateDistinctColors(0)).toEqual([]);
  });

  it('should return requested number of colors', () => {
    const colors = generateDistinctColors(5);
    expect(colors).toHaveLength(5);
  });

  it('should return valid hex color strings', () => {
    const colors = generateDistinctColors(3);
    for (const c of colors) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('should produce distinct colors', () => {
    const colors = generateDistinctColors(10);
    const unique = new Set(colors);
    expect(unique.size).toBe(10);
  });

  it('should cap at HUE_LEVELS * SAT_LEVELS * BRIGHT_LEVELS = 72', () => {
    const colors = generateDistinctColors(100);
    expect(colors.length).toBeLessThanOrEqual(72);
  });
});

describe('Backbone LCB color scheme', () => {
  function makeBackbone(lcbId: number, genomeCount: number, isBackbone: boolean): BackboneSegment {
    return {
      seqIndex: lcbId,
      intervals: Array.from({ length: genomeCount }, (_, gi) => ({ leftEnd: gi * 100 + 1, rightEnd: gi * 100 + 50 })),
      isBackbone,
    };
  }

  it('should return empty array for empty LCBs', () => {
    const alignment = makeAlignment(2, []);
    const colors = applyColorScheme('backbone-lcb', alignment, []);
    expect(colors).toEqual([]);
  });

  it('should return empty array when no backbone data', () => {
    const lcbs = [
      makeLcb(0, [{ left: 100, right: 200, reverse: false }, { left: 50, right: 150, reverse: false }]),
    ];
    const alignment = makeAlignment(2, lcbs);
    const colors = applyColorScheme('backbone-lcb', alignment);
    expect(colors).toEqual([]);
  });

  it('should assign mauve color to backbone LCBs', () => {
    const lcbs = [
      makeLcb(0, [{ left: 100, right: 200, reverse: false }, { left: 50, right: 150, reverse: false }]),
    ];
    const alignment = makeAlignment(2, lcbs);
    const backbone = [makeBackbone(0, 2, true)];
    const colors = applyColorScheme('backbone-lcb', alignment, backbone);
    expect(colors).toHaveLength(1);
    expect(colors[0]).toBe('#9370DB');
  });

  it('should assign multiplicity type colors to non-backbone LCBs', () => {
    const lcbs = [
      makeLcb(0, [{ left: 100, right: 200, reverse: false }, { left: 50, right: 150, reverse: false }, { left: 10, right: 60, reverse: false }]),
      makeLcb(1, [{ left: 300, right: 400, reverse: false }, { left: 200, right: 300, reverse: false }, { left: 0, right: 0, reverse: false }]),
    ];
    const alignment = makeAlignment(3, lcbs);
    const backbone: BackboneSegment[] = [
      makeBackbone(0, 3, true),
      { seqIndex: 1, intervals: [{ leftEnd: 300, rightEnd: 400 }, { leftEnd: 200, rightEnd: 300 }, { leftEnd: 0, rightEnd: 0 }], isBackbone: false },
    ];
    const colors = applyColorScheme('backbone-lcb', alignment, backbone);
    expect(colors).toHaveLength(2);
    expect(colors[0]).toBe('#9370DB'); // backbone
    expect(colors[1]).not.toBe('#9370DB'); // non-backbone
  });
});

describe('Backbone multiplicity color scheme', () => {
  it('should return empty array for empty LCBs', () => {
    const alignment = makeAlignment(2, []);
    const colors = applyColorScheme('backbone-multiplicity', alignment, []);
    expect(colors).toEqual([]);
  });

  it('should assign mauve to n-way backbone LCBs', () => {
    const lcbs = [
      makeLcb(0, [{ left: 100, right: 200, reverse: false }, { left: 50, right: 150, reverse: false }]),
    ];
    const alignment = makeAlignment(2, lcbs);
    const backbone: BackboneSegment[] = [{
      seqIndex: 0,
      intervals: [{ leftEnd: 100, rightEnd: 200 }, { leftEnd: 50, rightEnd: 150 }],
      isBackbone: true,
    }];
    const colors = applyColorScheme('backbone-multiplicity', alignment, backbone);
    expect(colors).toHaveLength(1);
    expect(colors[0]).toBe('#9370DB');
  });

  it('should assign distinct colors to different multiplicity types', () => {
    const lcbs = [
      makeLcb(0, [{ left: 100, right: 200, reverse: false }, { left: 50, right: 150, reverse: false }, { left: 10, right: 60, reverse: false }]),
      makeLcb(1, [{ left: 300, right: 400, reverse: false }, { left: 200, right: 300, reverse: false }, { left: 0, right: 0, reverse: false }]),
      makeLcb(2, [{ left: 0, right: 0, reverse: false }, { left: 400, right: 500, reverse: false }, { left: 100, right: 200, reverse: false }]),
    ];
    const alignment = makeAlignment(3, lcbs);
    const backbone: BackboneSegment[] = [
      { seqIndex: 0, intervals: [{ leftEnd: 100, rightEnd: 200 }, { leftEnd: 50, rightEnd: 150 }, { leftEnd: 10, rightEnd: 60 }], isBackbone: true },
      { seqIndex: 1, intervals: [{ leftEnd: 300, rightEnd: 400 }, { leftEnd: 200, rightEnd: 300 }, { leftEnd: 0, rightEnd: 0 }], isBackbone: false },
      { seqIndex: 2, intervals: [{ leftEnd: 0, rightEnd: 0 }, { leftEnd: 400, rightEnd: 500 }, { leftEnd: 100, rightEnd: 200 }], isBackbone: false },
    ];
    const colors = applyColorScheme('backbone-multiplicity', alignment, backbone);
    expect(colors).toHaveLength(3);
    expect(colors[0]).toBe('#9370DB'); // n-way backbone
    expect(colors[1]).not.toBe(colors[2]); // different multiplicity types
  });

  it('should assign same color to LCBs with same multiplicity type', () => {
    const lcbs = [
      makeLcb(0, [{ left: 100, right: 200, reverse: false }, { left: 50, right: 150, reverse: false }, { left: 0, right: 0, reverse: false }]),
      makeLcb(1, [{ left: 300, right: 400, reverse: false }, { left: 200, right: 300, reverse: false }, { left: 0, right: 0, reverse: false }]),
    ];
    const alignment = makeAlignment(3, lcbs);
    const backbone: BackboneSegment[] = [
      { seqIndex: 0, intervals: [{ leftEnd: 100, rightEnd: 200 }, { leftEnd: 50, rightEnd: 150 }, { leftEnd: 0, rightEnd: 0 }], isBackbone: false },
      { seqIndex: 1, intervals: [{ leftEnd: 300, rightEnd: 400 }, { leftEnd: 200, rightEnd: 300 }, { leftEnd: 0, rightEnd: 0 }], isBackbone: false },
    ];
    const colors = applyColorScheme('backbone-multiplicity', alignment, backbone);
    expect(colors[0]).toBe(colors[1]); // same multiplicity type pattern
  });
});

describe('BACKBONE_COLOR_SCHEMES registry', () => {
  it('should contain 2 schemes', () => {
    expect(BACKBONE_COLOR_SCHEMES).toHaveLength(2);
  });

  it('should have unique IDs', () => {
    const ids = BACKBONE_COLOR_SCHEMES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should all require backbone', () => {
    for (const scheme of BACKBONE_COLOR_SCHEMES) {
      expect(scheme.requiresBackbone).toBe(true);
    }
  });
});
