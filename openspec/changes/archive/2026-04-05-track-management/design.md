## Context

The XMFA viewer displays multi-genome alignments as stacked horizontal panels. Users need to reorder panels, change the reference genome (which affects LCB orientation), and hide genomes to simplify complex views. The legacy Mauve desktop app provides these features via a track control sidebar.

## Goals

- Provide interactive genome reordering, reference change, and hide/show via a sidebar control panel
- Maintain immutable state — all mutations create new `ViewerState` objects
- Compute visual reverse orientation on-the-fly using XOR logic, never mutating alignment data
- Show hidden genomes as collapsed placeholder bars (matching legacy Mauve behavior)
- Ensure at least one genome always remains visible

## Non-Goals

- Drag-and-drop reordering (button-based only for this phase)
- Keyboard shortcuts for track management
- Persistent track configuration across sessions

## Decisions

### D1: Immutable state with display order array
`ViewerState` holds a `genomeOrder: readonly number[]` mapping display indices to data indices. Reorder operations return a new array; alignment data is never mutated. This keeps rendering deterministic and enables future undo/redo.

### D2: XOR-based visual reverse
`isVisuallyReverse(lcb, genomeDataIndex, referenceGenomeIndex)` returns `refReverse !== genomeReverse`. This flips all genomes relative to the reference without touching the data. The reference genome's blocks always appear above the center line.

### D3: Collapsed bars for hidden genomes
Hidden genomes render as 20px placeholder bars (not removed from DOM). This preserves panel count awareness for the user and matches legacy behavior. The `HIDDEN_PANEL_HEIGHT` constant is exported for layout calculations.

### D4: Rebuild-on-change strategy for track controls
Track controls are fully destroyed and recreated on every state change (reorder, reference, visibility). This avoids complex DOM diffing for a small element count (4 buttons × N genomes) and ensures the UI always reflects the latest state.

### D5: Connecting lines skip hidden genomes
`getVisibleGenomeOrder()` returns only visible genome data indices. Connecting line trapezoids are drawn only between adjacent entries in this filtered list, so hidden genomes create no visual artifacts.

## Risks

- **Performance**: Rebuilding track controls on every state change is O(n) where n is genome count. Acceptable for typical alignments (< 20 genomes).
- **Layout shifts**: Hiding/showing genomes changes SVG height. Mitigated by recomputing `viewBox` on every rerender.
