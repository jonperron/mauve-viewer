import { describe, expect, it } from 'vitest';
import { parseNewick } from './parser.ts';

describe('parseNewick', () => {
  it('parses a simple binary tree', () => {
    const tree = parseNewick('(A:0.1,B:0.2)Root:1.0;');
    expect(tree.name).toBe('Root');
    expect(tree.children).toHaveLength(2);
    expect(tree.children?.[0]?.name).toBe('A');
    expect(tree.children?.[1]?.length).toBe(0.2);
  });

  it('throws when semicolon is missing', () => {
    expect(() => parseNewick('(A,B)Root')).toThrow('Invalid Newick: missing terminating semicolon');
  });
});