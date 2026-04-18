## 1. Core homolog extraction module

- [x] Create `src/export/homolog/homolog-export.ts` with `HomologExportParameters` interface and defaults
- [x] Implement feature extraction from genome annotations with deduplication
- [x] Implement backbone-based coordinate overlap detection
- [x] Implement pairwise nucleotide identity and coverage computation from alignment blocks
- [x] Implement pairwise ortholog mapping with threshold filtering
- [x] Implement transitive closure via DFS for group building
- [x] Implement singleton collection for unmatched features
- [x] Implement tab-delimited output formatting (`formatHomologTable`)
- [x] Export convenience function (`exportHomologs`)

## 2. Barrel and UI integration

- [x] Add homolog exports to `src/export/index.ts` barrel
- [x] Add `onExportHomologs` callback to Options panel
- [x] Add "Export Positional Orthologs" button with backbone+annotations visibility guard
- [x] Wire export callback in `src/viewer/alignment-viewer.ts`

## 3. Tests

- [x] Write unit tests for `extractHomologs` (11 tests covering: basic extraction, identity filtering, coverage filtering, transitive closure, singletons, empty inputs, deduplication, locus tag fallback, feature type filtering)
