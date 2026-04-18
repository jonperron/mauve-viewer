import { describe, expect, it } from 'vitest';
import { parseRawSequence } from './parser.ts';

describe('parseRawSequence', () => {
  it('parses raw sequence and strips whitespace', () => {
    const result = parseRawSequence('acgt nnn\nrysw\t');
    expect(result).toBe('ACGTNNNRYSW');
  });

  it('throws on empty content', () => {
    expect(() => parseRawSequence('   \n\t')).toThrow('Empty raw sequence content');
  });

  it('throws on invalid characters', () => {
    expect(() => parseRawSequence('ACTGZ')).toThrow('Invalid raw sequence character: Z');
  });
});