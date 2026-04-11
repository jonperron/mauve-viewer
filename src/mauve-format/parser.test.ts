import { describe, expect, it } from 'vitest';
import { parseMauveAsXmfa, parseMln } from './parser.ts';

describe('parseMauveAsXmfa', () => {
  it('parses compact mauve anchors and builds LCBs', () => {
    const content = `1:100-200+ 2:300-400-\n1:500-560+ 2:700-760+`;
    const result = parseMauveAsXmfa(content, 'mauve');

    expect(result.compact.anchors).toHaveLength(2);
    expect(result.xmfa.lcbs).toHaveLength(2);
    expect(result.xmfa.lcbs[0]!.left).toEqual([100, 300]);
    expect(result.xmfa.lcbs[0]!.reverse).toEqual([false, true]);
  });

  it('throws on malformed segment token', () => {
    expect(() => parseMauveAsXmfa('1:100-200+ badtoken', 'mauve')).toThrow(
      'Malformed Mauve segment token',
    );
  });
});

describe('parseMln', () => {
  it('parses mln with explicit group id', () => {
    const content = `10 1:1-100+ 2:10-110+`;
    const result = parseMln(content);
    expect(result.anchors[0]!.groupId).toBe(10);
  });
});