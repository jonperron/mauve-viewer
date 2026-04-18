## 1. Core computation module

- [x] Create `src/export/identity-matrix/identity-matrix-export.ts`
- [x] Implement `countPairwiseSubstitutions()` — count substitutions between two genomes across alignment blocks
- [x] Implement `computeSharedBackboneLength()` — sum shared backbone interval lengths for genome pairs
- [x] Implement `computeIdentityMatrix()` — compute full N×N divergence matrix
- [x] Implement `formatIdentityMatrix()` — format as upper-triangular tab-delimited text
- [x] Implement `exportIdentityMatrix()` — convenience function combining compute + format
- [x] Fix legacy adenine substitution bug with `isUnambiguousBase()` helper

## 2. Export integration

- [x] Re-export identity matrix functions and types from `src/export/index.ts`

## 3. UI integration

- [x] Add `onExportIdentityMatrix` callback to options panel
- [x] Add "Export Identity Matrix" button in Options panel, visible when `backbone.length > 0`
- [x] Wire identity matrix export in `alignment-viewer.ts`

## 4. Tests

- [x] Write unit tests for `countPairwiseSubstitutions`
- [x] Write unit tests for `computeSharedBackboneLength`
- [x] Write unit tests for `computeIdentityMatrix`
- [x] Write unit tests for `formatIdentityMatrix`
- [x] Write unit tests for `exportIdentityMatrix`
- [x] Verify 20 tests pass
