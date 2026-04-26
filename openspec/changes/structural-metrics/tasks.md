## 1. Structural Metrics Module

- [x] Define `StructuralMetrics` interface in `src/scoring/structural-metrics.ts`
- [x] Export `computeStructuralMetrics(alignment, refGenomeIdx?)` function
- [x] Compute `contigCount` (number of non-reference genomes) and `repliconCount` (always 1)
- [x] Compute `referenceBases` (reference genome length) and `assemblyBases` (sum of assembly genome lengths)
- [x] Compute DCJ / breakpoint / SCJ distances via `computeDistanceMatrixFromLcbs`
- [x] Filter shared LCBs to those present in both reference and assembly (non-zero left coordinate for both genomes)
- [x] Compute Type I adjacency errors: consecutive assembly-sorted pairs with |Δrank| ≠ 1 in reference order
- [x] Compute Type II adjacency errors: consecutive assembly-sorted pairs with |Δrank| = 1 but inconsistent net inversions
- [x] Return zero-valued metrics for alignments with fewer than 2 genomes
