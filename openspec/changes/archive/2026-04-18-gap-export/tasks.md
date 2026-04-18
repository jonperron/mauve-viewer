## 1. Gap extraction module

- [x] Create `src/analysis/export/gap-export.ts` with `extractGaps`, `formatGapTable`, `exportGaps` functions
- [x] Implement gap detection by scanning for runs of '-' characters in segment data
- [x] Implement forward and reverse strand position computation
- [x] Reuse `resolveContig` from SNP export for contig-relative position mapping
- [x] Add gap export re-exports to `src/analysis/export/index.ts`

## 2. Tests

- [x] Create `src/analysis/export/gap-export.test.ts` with 19 tests covering extraction, formatting, strand handling, contig resolution, sorting, and edge cases

## 3. Viewer integration

- [x] Add `onExportGaps` callback to `OptionsCallbacks` interface in `src/viewer/options-panel.ts`
- [x] Add "Export Gaps" button in Options panel (conditional on callback presence)
- [x] Wire gap export in `src/viewer/alignment-viewer.ts` with contig map from annotations
- [x] Make export button conditional on `hasBlocks`

## 4. Spec update

- [x] Update `analysis-export` spec to reflect web-based gap export implementation
