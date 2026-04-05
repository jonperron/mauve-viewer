export type {
  FeatureType,
  GenomicFeature,
  ContigBoundary,
  GenomeAnnotations,
} from './types.ts';
export { FEATURE_COLORS, FEATURE_ZOOM_THRESHOLD } from './types.ts';
export { parseGenBank, parseGenBankMulti } from './genbank-parser.ts';
export { createLazyAnnotationManager } from './lazy-loader.ts';
export type { AnnotationLoader, LazyAnnotationManager } from './lazy-loader.ts';
