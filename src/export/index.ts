export {
  extractSnps,
  formatSnpTable,
  exportSnps,
  resolveContig,
  downloadTextFile,
} from './snp/snp-export.ts';

export type {
  SnpRecord,
  SnpGenomePosition,
  ContigMap,
} from './snp/snp-export.ts';

export {
  extractGaps,
  formatGapTable,
  exportGaps,
} from './gap/gap-export.ts';

export type {
  GapRecord,
} from './gap/gap-export.ts';

export {
  projectLcbs,
  computePermutations,
  formatPermutationOutput,
  exportPermutations,
} from './permutation/permutation-export.ts';

export type {
  PermutationChromosome,
  GenomePermutation,
} from './permutation/permutation-export.ts';

export {
  extractHomologs,
  formatHomologTable,
  exportHomologs,
  DEFAULT_HOMOLOG_PARAMS,
} from './homolog/homolog-export.ts';

export type {
  HomologExportParameters,
  HomologMember,
  HomologGroup,
  HomologResult,
} from './homolog/homolog-export.ts';

export {
  countPairwiseSubstitutions,
  computeSharedBackboneLength,
  computeIdentityMatrix,
  formatIdentityMatrix,
  exportIdentityMatrix,
} from './identity-matrix/identity-matrix-export.ts';

export type {
  IdentityMatrixResult,
} from './identity-matrix/identity-matrix-export.ts';

export {
  detectCdsErrors,
  formatCdsErrors,
  exportCdsErrors,
} from './cds-errors/cds-error-detection.ts';

export type {
  BrokenCds,
  CdsErrorResult,
  AaSubstitution,
  PrematureStop,
  Frameshift,
  GapSegment,
} from './cds-errors/cds-error-detection.ts';

export {
  runSummaryPipeline,
  exportSummary,
} from './summary/summary-export.ts';

export {
  processSegments,
  genomeToMask,
  allGenomesMask,
  multiplicityLabel,
} from './summary/segment-processor.ts';

export {
  formatOverview,
  countGenesByMultiplicity,
} from './summary/overview.ts';

export {
  formatIslandCoordinates,
  formatIslandFeatures,
  formatIslandGeneFeatures,
} from './summary/island-output.ts';

export {
  formatTroubleBackbone,
  findTroubleBackbone,
} from './summary/trouble-backbone.ts';

export {
  extractPartialFasta,
} from './summary/partial-fasta.ts';

export type {
  SummarySegment,
  SummaryInterval,
  SummaryOptions,
  SummaryInput,
  SummaryResult,
  ProcessedSegmentData,
} from './summary/types.ts';

export {
  DEFAULT_SUMMARY_OPTIONS,
} from './summary/types.ts';

export type {
  TroubleRecord,
} from './summary/trouble-backbone.ts';

export type {
  FastaRegion,
} from './summary/partial-fasta.ts';
