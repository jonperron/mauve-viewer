export {
  extractSnps,
  formatSnpTable,
  exportSnps,
  resolveContig,
  downloadTextFile,
} from './snp-export.ts';

export type {
  SnpRecord,
  SnpGenomePosition,
  ContigMap,
} from './snp-export.ts';

export {
  extractGaps,
  formatGapTable,
  exportGaps,
} from './gap-export.ts';

export type {
  GapRecord,
} from './gap-export.ts';
