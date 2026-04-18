import { describe, it, expect } from 'vitest';
import { parseJsonLcbs } from './parser.ts';

describe('parseJsonLcbs', () => {
  it('parses a simple 2-genome LCB file', () => {
    const data = [
      [
        { name: 'genome1.fna', start: 100, end: 500, strand: '+', lcb_idx: 1, id: 1, groupID: 0 },
        { name: 'genome2.fna', start: 200, end: 600, strand: '-', lcb_idx: 2, id: 2, groupID: 0 },
      ],
    ];

    const result = parseJsonLcbs(JSON.stringify(data));

    expect(result.genomes).toHaveLength(2);
    expect(result.genomes[0]!.name).toBe('genome1.fna');
    expect(result.genomes[1]!.name).toBe('genome2.fna');
    expect(result.lcbs).toHaveLength(1);
    expect(result.lcbs[0]!.left).toEqual([100, 200]);
    expect(result.lcbs[0]!.right).toEqual([500, 600]);
    expect(result.lcbs[0]!.reverse).toEqual([false, true]);
  });

  it('parses a 3-genome LCB file', () => {
    const data = [
      [
        { name: 'g1.fna', start: 1, end: 1000, strand: '+', lcb_idx: 1 },
        { name: 'g2.fna', start: 500, end: 1500, strand: '+', lcb_idx: 2 },
        { name: 'g3.fna', start: 200, end: 1200, strand: '-', lcb_idx: 3 },
      ],
      [
        { name: 'g1.fna', start: 2000, end: 3000, strand: '+', lcb_idx: 1 },
        { name: 'g2.fna', start: 2500, end: 3500, strand: '-', lcb_idx: 2 },
      ],
    ];

    const result = parseJsonLcbs(JSON.stringify(data));

    expect(result.genomes).toHaveLength(3);
    expect(result.lcbs).toHaveLength(2);

    // First LCB has all 3 genomes
    expect(result.lcbs[0]!.left).toEqual([1, 500, 200]);
    expect(result.lcbs[0]!.right).toEqual([1000, 1500, 1200]);
    expect(result.lcbs[0]!.reverse).toEqual([false, false, true]);

    // Second LCB has only 2 genomes
    expect(result.lcbs[1]!.left).toEqual([2000, 2500, 0]);
    expect(result.lcbs[1]!.right).toEqual([3000, 3500, 0]);
  });

  it('skips single-region LCB groups', () => {
    const data = [
      [
        { name: 'g1.fna', start: 100, end: 500, strand: '+', lcb_idx: 1 },
      ],
      [
        { name: 'g1.fna', start: 600, end: 1000, strand: '+', lcb_idx: 1 },
        { name: 'g2.fna', start: 100, end: 500, strand: '+', lcb_idx: 2 },
      ],
    ];

    const result = parseJsonLcbs(JSON.stringify(data));

    expect(result.lcbs).toHaveLength(1);
    expect(result.lcbs[0]!.left).toEqual([600, 100]);
  });

  it('extracts filename from path', () => {
    const data = [
      [
        { name: 'path/to/genome1.fna', start: 1, end: 100, strand: '+', lcb_idx: 1 },
        { name: 'path/to/genome2.fna', start: 1, end: 100, strand: '+', lcb_idx: 2 },
      ],
    ];

    const result = parseJsonLcbs(JSON.stringify(data));

    expect(result.genomes[0]!.name).toBe('genome1.fna');
    expect(result.genomes[1]!.name).toBe('genome2.fna');
  });

  it('computes genome lengths from max end values', () => {
    const data = [
      [
        { name: 'g1.fna', start: 1, end: 500, strand: '+', lcb_idx: 1 },
        { name: 'g2.fna', start: 1, end: 300, strand: '+', lcb_idx: 2 },
      ],
      [
        { name: 'g1.fna', start: 600, end: 2000, strand: '+', lcb_idx: 1 },
        { name: 'g2.fna', start: 400, end: 1500, strand: '+', lcb_idx: 2 },
      ],
    ];

    const result = parseJsonLcbs(JSON.stringify(data));

    expect(result.genomes[0]!.length).toBe(2000);
    expect(result.genomes[1]!.length).toBe(1500);
  });

  it('builds correct header metadata', () => {
    const data = [
      [
        { name: 'g1.fna', start: 1, end: 100, strand: '+', lcb_idx: 1 },
        { name: 'g2.fna', start: 1, end: 100, strand: '+', lcb_idx: 2 },
      ],
    ];

    const result = parseJsonLcbs(JSON.stringify(data));

    expect(result.header.formatVersion).toBe('JSON');
    expect(result.header.sequenceCount).toBe(2);
    expect(result.header.sequenceEntries).toHaveLength(2);
  });

  it('assigns sequential LCB ids', () => {
    const data = [
      [
        { name: 'g1.fna', start: 1, end: 100, strand: '+', lcb_idx: 1 },
        { name: 'g2.fna', start: 1, end: 100, strand: '+', lcb_idx: 2 },
      ],
      [
        { name: 'g1.fna', start: 200, end: 300, strand: '+', lcb_idx: 1 },
        { name: 'g2.fna', start: 200, end: 300, strand: '+', lcb_idx: 2 },
      ],
    ];

    const result = parseJsonLcbs(JSON.stringify(data));

    expect(result.lcbs[0]!.id).toBe(0);
    expect(result.lcbs[1]!.id).toBe(1);
  });

  it('computes average weight from segment lengths', () => {
    const data = [
      [
        { name: 'g1.fna', start: 1, end: 100, strand: '+', lcb_idx: 1 },
        { name: 'g2.fna', start: 1, end: 200, strand: '+', lcb_idx: 2 },
      ],
    ];

    const result = parseJsonLcbs(JSON.stringify(data));

    // (100 + 200) / 2 = 150
    expect(result.lcbs[0]!.weight).toBe(150);
  });

  it('returns empty blocks array', () => {
    const data = [
      [
        { name: 'g1.fna', start: 1, end: 100, strand: '+', lcb_idx: 1 },
        { name: 'g2.fna', start: 1, end: 100, strand: '+', lcb_idx: 2 },
      ],
    ];

    const result = parseJsonLcbs(JSON.stringify(data));

    expect(result.blocks).toEqual([]);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseJsonLcbs('not json')).toThrow('Invalid JSON content');
  });

  it('throws when data is not an array', () => {
    expect(() => parseJsonLcbs('{"key": "value"}')).toThrow(
      'JSON LCB data must be an array',
    );
  });

  it('throws on invalid region structure', () => {
    const data = [[{ name: 'g1.fna', start: 1 }]];
    expect(() => parseJsonLcbs(JSON.stringify(data))).toThrow('Invalid region');
  });

  it('throws on invalid strand value', () => {
    const data = [
      [
        { name: 'g1.fna', start: 1, end: 100, strand: '*', lcb_idx: 1 },
        { name: 'g2.fna', start: 1, end: 100, strand: '+', lcb_idx: 2 },
      ],
    ];
    expect(() => parseJsonLcbs(JSON.stringify(data))).toThrow('Invalid region');
  });

  it('throws when no genomes found', () => {
    expect(() => parseJsonLcbs('[]')).toThrow('No genomes found');
  });
});
