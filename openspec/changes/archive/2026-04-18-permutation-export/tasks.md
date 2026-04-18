## 1. Core permutation export implementation

- [x] Implement `projectLcbs` function to filter LCBs to selected genome subsets
- [x] Implement `computePermutations` function with signed permutation computation
- [x] Implement contig boundary grouping in `groupByContigs` helper
- [x] Implement `formatPermutationOutput` with header comments and `$` delimiter format
- [x] Implement `exportPermutations` top-level composition function
- [x] Export types `PermutationChromosome` and `GenomePermutation`
- [x] Export functions from `src/analysis/export/index.ts`

## 2. Tests

- [x] Unit tests for `projectLcbs` (present in all, filtered, subset, empty)
- [x] Unit tests for `computePermutations` (forward/reverse strand, contig splitting, subset projection)
- [x] Unit tests for `formatPermutationOutput` (header, chromosome delimiters, empty)
- [x] Integration tests for `exportPermutations` (full pipeline, subset, contig map)

## 3. Spec update

- [x] Update `openspec/specs/analysis-export/spec.md` permutation export requirement with full implementation details
