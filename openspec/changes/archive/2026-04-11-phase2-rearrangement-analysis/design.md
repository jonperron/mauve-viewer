# Design: Phase 2 Rearrangement Analysis

## Context

The Mauve Viewer rearrangement analysis spec defines six algorithmic requirements. Phase 2 implements the computational core for all six as pure-function TypeScript modules under `src/analysis/`. These modules operate on the existing `Lcb`, `XmfaAlignment`, and `BackboneSegment` types from the XMFA and backbone parsers.

## Goals / Non-Goals

**Goals**:
- Implement all six rearrangement-analysis requirements as stateless, testable modules
- Match the legacy Java Mauve algorithms (DCJ, GRIMM, SimilarityIndex, Backbone) in correctness
- Provide direct LCB-to-result entry points for downstream viewer integration

**Non-Goals**:
- GUI integration (Phase 3)
- Disk-based profile caching (deferred; in-memory only)
- Multi-chromosome GRIMM analysis (single linear chromosome only)
- WeakARG visualization overlays (Phase 3)

## Decisions

### Module structure: one folder per algorithm under `src/analysis/`
**Rationale**: Each algorithm is self-contained with distinct types and no cross-dependencies between analysis modules. Folder-per-module keeps imports clean and allows independent testing.
**Alternatives considered**: Single `src/analysis.ts` mega-module — rejected for maintainability.

### Immutable types with readonly arrays
**Rationale**: Matches project coding conventions. All result types use `readonly` arrays and properties. Internal mutation uses local mutable arrays, exposed as readonly.

### DCJ: Adjacency graph via neighbor lists instead of Java's linked-list Vert/SB model
**Rationale**: The legacy Java DCJ uses a mutable linked-list of Vert objects with grey/black lines. The TypeScript implementation uses flat arrays with neighbor index lists, which is simpler and avoids class hierarchies. Produces identical distance results.

### GRIMM: Greedy sorting instead of optimal Hannenhalli-Pevzner
**Rationale**: The full H-P algorithm requires hurdle/fortress detection which adds significant complexity. Greedy sorting produces a valid (though possibly non-minimal) scenario and correct reversal distance via the breakpoint graph formula `d = n + 1 - c`.

### Similarity: Shannon entropy at runtime instead of pre-computed log tables
**Rationale**: JavaScript engines handle `Math.log2` efficiently. Pre-computed lookup tables (as in Java) add complexity without measurable benefit for typical genome sizes. `Float64Array` accumulators prevent floating-point drift.

### WeakARG: DOMParser-based XML parsing
**Rationale**: Runs in browser environments natively. Uses `DOMParser` to parse XML, then `querySelector` for element extraction. Validates for `parsererror` nodes.

## Risks / Trade-offs

- **[Performance] Similarity profile at resolution=1 for large genomes** → Multi-level zoom avoids recomputing; fine-grained profile is computed once and coarser levels derived from it.
- **[Correctness] GRIMM greedy scenario may not be minimal** → Reversal distance is exact; only the scenario sequence may have extra steps. Documented in spec.
- **[Memory] WeakARG per-position tallies for large genomes** → Bounded by `maxEdges` limit (10M). Could migrate to binned histograms in future.
- **[Browser compat] DOMParser availability** → Standard in all modern browsers and test environments (jsdom provides it in Vitest).

## Open Questions

- Should similarity profiles support Web Worker offloading for large alignments?
- Should GRIMM be extended to multi-chromosome analysis in a future phase?
