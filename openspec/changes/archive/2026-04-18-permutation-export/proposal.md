## Why

The permutation export feature has been implemented in `src/analysis/export/permutation-export.ts` but the spec at `openspec/specs/analysis-export/spec.md` only has a minimal placeholder requirement. The spec needs to be updated to reflect the actual implementation: LCB projection, signed permutation computation, contig/chromosome boundary grouping, header comments, and output formatting.

## What Changes

- **MODIFIED** the "Permutation export" requirement in the analysis-export spec to fully describe:
  - LCB projection to genome subsets (filtering to LCBs present in all selected genomes)
  - Signed permutation computation (positive for forward strand, negative for reverse)
  - Contig/chromosome boundary grouping with `$` delimiter
  - Header comments with genome names
  - Output format: comma-separated signed integers per chromosome
  - Known limitations: no LCB splitting at contig boundaries, no circular chromosome marker

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `analysis-export`: Expanding the permutation export requirement to match the implemented behavior

## Impact

- Spec file: `openspec/specs/analysis-export/spec.md` — Permutation export requirement section
- Source: `src/analysis/export/permutation-export.ts` — already implemented
- Tests: `src/analysis/export/permutation-export.test.ts` — already passing
