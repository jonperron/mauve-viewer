## 1. SNP extraction module

- [x] Create `src/analysis/export/snp-export.ts` with `extractSnps`, `formatSnpTable`, `exportSnps` functions
- [x] Implement column-by-column polymorphism detection with IUPAC ambiguity support
- [x] Implement reverse strand position tracking
- [x] Implement `resolveContig` for contig-relative position mapping
- [x] Implement `downloadTextFile` for browser file download
- [x] Create barrel export `src/analysis/export/index.ts`

## 2. Tests

- [x] Create `src/analysis/export/snp-export.test.ts` with 28 tests covering extraction, formatting, contig resolution, and edge cases

## 3. Viewer integration

- [x] Add `onExportSnps` callback to `OptionsCallbacks` interface in `src/viewer/options-panel.ts`
- [x] Add "Export SNPs" button in Options panel (conditional on callback presence)
- [x] Wire SNP export in `src/viewer/alignment-viewer.ts` with contig map from annotations
- [x] Make export button conditional on `hasBlocks`

## 4. Spec update

- [x] Update `analysis-export` spec to reflect web-based SNP export implementation
