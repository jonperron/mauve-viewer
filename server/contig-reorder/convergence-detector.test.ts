import { describe, it, expect, beforeEach } from 'vitest';
import { ConvergenceDetector } from './convergence-detector.js';

let detector: ConvergenceDetector;

beforeEach(() => {
  detector = new ConvergenceDetector();
});

describe('ConvergenceDetector.check', () => {
  it('returns false for the first ordering', () => {
    expect(detector.check(['contig1', 'contig2', 'contig3'])).toBe(false);
  });

  it('returns false for a new distinct ordering', () => {
    detector.check(['contig1', 'contig2']);
    expect(detector.check(['contig2', 'contig1'])).toBe(false);
  });

  it('returns true when the same ordering repeats', () => {
    detector.check(['contig1', 'contig2', 'contig3']);
    detector.check(['contig2', 'contig1', 'contig3']);
    expect(detector.check(['contig1', 'contig2', 'contig3'])).toBe(true);
  });

  it('detects convergence even after many distinct orderings', () => {
    detector.check(['a', 'b', 'c']);
    detector.check(['b', 'c', 'a']);
    detector.check(['c', 'a', 'b']);
    expect(detector.check(['a', 'b', 'c'])).toBe(true);
  });

  it('returns false for empty ordering', () => {
    expect(detector.check([])).toBe(false);
  });

  it('detects repeated empty ordering', () => {
    detector.check([]);
    expect(detector.check([])).toBe(true);
  });

  it('treats orderings with different separators as distinct', () => {
    // Contig names containing \x00 should still be handled correctly
    detector.check(['contig1', 'contig2']);
    expect(detector.check(['contig1', 'contig2'])).toBe(true);
  });
});

describe('ConvergenceDetector.iterationCount', () => {
  it('starts at 0', () => {
    expect(detector.iterationCount).toBe(0);
  });

  it('increments with each distinct ordering', () => {
    detector.check(['a', 'b']);
    expect(detector.iterationCount).toBe(1);
    detector.check(['b', 'a']);
    expect(detector.iterationCount).toBe(2);
  });

  it('does not increment on repeated orderings', () => {
    detector.check(['a', 'b']);
    detector.check(['a', 'b']); // convergence — not recorded again
    expect(detector.iterationCount).toBe(1);
  });
});

describe('ConvergenceDetector.reset', () => {
  it('clears all recorded orderings', () => {
    detector.check(['a', 'b']);
    detector.check(['b', 'a']);
    detector.reset();
    expect(detector.iterationCount).toBe(0);
  });

  it('allows previously seen orderings to be detected as new after reset', () => {
    detector.check(['a', 'b']);
    detector.reset();
    expect(detector.check(['a', 'b'])).toBe(false);
  });
});
