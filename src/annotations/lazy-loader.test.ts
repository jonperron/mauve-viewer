import { describe, it, expect, vi } from 'vitest';
import { createLazyAnnotationManager } from './lazy-loader.ts';
import type { GenomeAnnotations } from './types.ts';

function makeAnnotations(genomeIndex: number): GenomeAnnotations {
  return {
    genomeIndex,
    features: [
      { type: 'CDS', start: 100, end: 200, strand: '+', qualifiers: { gene: 'geneA' } },
    ],
    contigs: [],
  };
}

describe('createLazyAnnotationManager', () => {
  it('returns undefined for missing genome', () => {
    const manager = createLazyAnnotationManager();
    expect(manager.get(1)).toBeUndefined();
    expect(manager.has(1)).toBe(false);
  });

  it('stores and retrieves pre-loaded annotations', () => {
    const manager = createLazyAnnotationManager();
    const annotations = makeAnnotations(1);

    manager.set(1, annotations);

    expect(manager.has(1)).toBe(true);
    expect(manager.get(1)).toBe(annotations);
  });

  it('loads annotations via loader callback', async () => {
    const annotations = makeAnnotations(1);
    const loader = vi.fn().mockResolvedValue(annotations);

    const manager = createLazyAnnotationManager(loader);
    const result = await manager.load(1);

    expect(loader).toHaveBeenCalledWith(1);
    expect(result).toBe(annotations);
    expect(manager.has(1)).toBe(true);
  });

  it('returns cached annotations without calling loader again', async () => {
    const annotations = makeAnnotations(1);
    const loader = vi.fn().mockResolvedValue(annotations);

    const manager = createLazyAnnotationManager(loader);
    manager.set(1, annotations);

    const result = await manager.load(1);

    expect(loader).not.toHaveBeenCalled();
    expect(result).toBe(annotations);
  });

  it('deduplicates concurrent load requests', async () => {
    const annotations = makeAnnotations(1);
    const loader = vi.fn().mockResolvedValue(annotations);

    const manager = createLazyAnnotationManager(loader);
    const [result1, result2] = await Promise.all([
      manager.load(1),
      manager.load(1),
    ]);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(result1).toBe(annotations);
    expect(result2).toBe(annotations);
  });

  it('returns undefined when no loader is provided', async () => {
    const manager = createLazyAnnotationManager();
    const result = await manager.load(1);

    expect(result).toBeUndefined();
  });

  it('returns undefined when loader returns undefined', async () => {
    const loader = vi.fn().mockResolvedValue(undefined);

    const manager = createLazyAnnotationManager(loader);
    const result = await manager.load(1);

    expect(result).toBeUndefined();
    expect(manager.has(1)).toBe(false);
  });

  it('getAll returns all cached annotations', () => {
    const manager = createLazyAnnotationManager();
    const a1 = makeAnnotations(1);
    const a2 = makeAnnotations(2);

    manager.set(1, a1);
    manager.set(2, a2);

    const all = manager.getAll();
    expect(all.size).toBe(2);
    expect(all.get(1)).toBe(a1);
    expect(all.get(2)).toBe(a2);
  });

  it('allows retry after loader rejection', async () => {
    const annotations = makeAnnotations(1);
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(annotations);

    const manager = createLazyAnnotationManager(loader);

    await expect(manager.load(1)).rejects.toThrow('network error');
    expect(manager.has(1)).toBe(false);

    const result = await manager.load(1);
    expect(result).toBe(annotations);
    expect(manager.has(1)).toBe(true);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
