## Why

Phase 8.3 implements sequence-level metrics for assembly quality scoring. The `assembly-scoring` spec already references this capability in a placeholder requirement but lacks the detailed interface, algorithm, and boundary-condition specifications needed to guide implementation and testing.

## What Changes

- Add full specification for the `computeSequenceMetrics()` function and its exported interfaces (`SubstitutionMatrix`, `GapLocation`, `SequenceMetrics`) to the `assembly-scoring` spec.
- Document algorithm behaviour: column-by-column comparison, gap-run tracking, SNP substitution matrix with ACGT-only accounting, ref-only/asm-only block handling, multi-contig support, and single-genome edge case.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `assembly-scoring`: Expand the "Sequence-level metrics" requirement with the concrete TypeScript interface, exported function signature, and detailed behavioural scenarios.

## Impact

- `openspec/specs/assembly-scoring/spec.md` — requirement expanded
- `src/scoring/sequence-metrics.ts` — already implemented (phase 8.3)
- `src/scoring/sequence-metrics.test.ts` — 25 unit tests already passing
