# Proposal: Phase 2 Rearrangement Analysis

## Why

The rearrangement analysis spec (`openspec/specs/rearrangement-analysis/spec.md`) defines six core requirements—DCJ distance computation, extended DCJ permutation model, GRIMM analysis, WeakARG recombination detection, backbone computation, and similarity index computation—that were previously unimplemented. Phase 2 delivers the algorithmic core for all six, enabling downstream viewer integration and analysis export features.

## What Changes

- **New**: DCJ permutation model and adjacency graph (parse permutation strings, build block-endpoint adjacencies, compute graph statistics)
- **New**: DCJ/breakpoint/SCJ distance computation from permutation strings or LCB data, including pairwise distance matrix
- **New**: Backbone segment computation from LCBs with weight/multiplicity filtering, multiplicity masks, and island detection
- **New**: Shannon entropy–based similarity profiles with multi-level zoom support
- **New**: GRIMM signed permutation analysis (reversal distance via breakpoint graph, greedy sorting scenario)
- **New**: WeakARG XML parser producing per-genome recombination histograms with cache support

## Capabilities

### New Capabilities

_(none — all features map to existing requirements in `rearrangement-analysis`)_

### Modified Capabilities

- **rearrangement-analysis**: All six requirements now have detailed algorithmic specs reflecting the implemented modules, exported functions, types, formulas, and known limitations.

## Impact

- New modules under `src/analysis/`: `dcj/`, `backbone/`, `similarity/`, `grimm/`, `weakarg/`
- Depends on existing types from `src/xmfa/types.ts` and `src/backbone/types.ts`
- No breaking changes to existing code; all new exports are additive
