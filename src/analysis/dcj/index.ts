export {
  buildBlockIdMap,
  parsePermutationString,
  lcbsToPermutationStrings,
  equalContents,
} from './permutation.ts';

export {
  buildAdjacencyGraph,
} from './adjacency-graph.ts';

export {
  computeDistances,
  computeDistanceMatrix,
  computeDistanceMatrixFromLcbs,
} from './distance.ts';

export type {
  Block,
  ContigDef,
  Adjacency,
  BlockLocation,
  Permutation,
  AdjacencyGraphStats,
  DistanceResult,
  DistanceMatrix,
} from './types.ts';

export {
  TAIL_TAG,
  HEAD_TAG,
  TELOMERE,
  CIRCULAR_CHAR,
} from './types.ts';
