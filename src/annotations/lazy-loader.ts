import type { GenomeAnnotations } from '../annotations/types.ts';

/**
 * Callback type for lazy-loading annotations.
 * Called when the viewer needs annotations for a genome that hasn't been loaded yet.
 * Returns the loaded annotations, or undefined if unavailable.
 */
export type AnnotationLoader = (
  genomeIndex: number,
) => Promise<GenomeAnnotations | undefined>;

/**
 * Manages lazy-loading of annotation data.
 * Annotations are loaded on demand when the viewer zooms in below the feature threshold.
 */
export interface LazyAnnotationManager {
  /** Get annotations for a genome, loading them if necessary */
  readonly get: (genomeIndex: number) => GenomeAnnotations | undefined;
  /** Request loading of annotations for a genome (returns a promise) */
  readonly load: (genomeIndex: number) => Promise<GenomeAnnotations | undefined>;
  /** Check if annotations are available (already loaded) for a genome */
  readonly has: (genomeIndex: number) => boolean;
  /** Set pre-loaded annotations for a genome */
  readonly set: (genomeIndex: number, annotations: GenomeAnnotations) => void;
  /** Get all currently loaded annotations as a map */
  readonly getAll: () => ReadonlyMap<number, GenomeAnnotations>;
}

/**
 * Create a lazy annotation manager that uses the provided loader
 * to fetch annotations on demand.
 */
export function createLazyAnnotationManager(
  loader?: AnnotationLoader,
): LazyAnnotationManager {
  const cache = new Map<number, GenomeAnnotations>();
  const pending = new Map<number, Promise<GenomeAnnotations | undefined>>();

  function get(genomeIndex: number): GenomeAnnotations | undefined {
    return cache.get(genomeIndex);
  }

  function has(genomeIndex: number): boolean {
    return cache.has(genomeIndex);
  }

  function set(genomeIndex: number, annotations: GenomeAnnotations): void {
    cache.set(genomeIndex, annotations);
  }

  async function load(
    genomeIndex: number,
  ): Promise<GenomeAnnotations | undefined> {
    const cached = cache.get(genomeIndex);
    if (cached) return cached;

    // Avoid duplicate requests
    const existingRequest = pending.get(genomeIndex);
    if (existingRequest) return existingRequest;

    if (!loader) return undefined;

    const request = loader(genomeIndex)
      .then((result) => {
        if (result) {
          cache.set(genomeIndex, result);
        }
        return result;
      })
      .finally(() => {
        pending.delete(genomeIndex);
      });

    pending.set(genomeIndex, request);
    return request;
  }

  function getAll(): ReadonlyMap<number, GenomeAnnotations> {
    return new Map(cache);
  }

  return { get, load, has, set, getAll };
}
