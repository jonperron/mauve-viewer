## 1. Spec Update

- [x] Create delta spec `openspec/changes/sequence-metrics/specs/assembly-scoring/spec.md` with MODIFIED "Sequence-level metrics" requirement
- [x] Expand requirement with exported interfaces (`SubstitutionMatrix`, `GapLocation`, `SequenceMetrics`), function signature, module path, and algorithm details
- [x] Add scenarios: missed bases, extra bases, SNP detection, ambiguous base handling, gap-run tracking, case-insensitive comparison, multi-contig, single-genome edge case

## 2. Validation & Archive

- [x] Validate change with `openspec validate sequence-metrics`
- [x] Archive change with `openspec archive sequence-metrics -y`
