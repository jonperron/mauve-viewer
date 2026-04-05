## Context

The xmfa-viewer provides multi-genome alignment visualization with LCB blocks and connecting lines. Phase 1 adds interactive navigation (zoom/pan) and cursor-based exploration (cross-track cursor, LCB highlighting, click-to-align) as the foundational interaction layer.

## Goals

- Enable smooth zoom and pan navigation across all genome panels simultaneously.
- Provide visual feedback for homologous positions via a cross-track cursor.
- Allow LCB exploration via hover-based highlighting of related blocks across genomes.
- Support click-to-align for centering on homologous sites with smooth animation.
- Expose a ViewerHandle API for programmatic control and lifecycle management.

## Non-Goals

- Genome reordering, reference genome change, or genome hiding (future phases).
- Annotation/feature display (requires separate data integration).
- Similarity profile rendering within LCB blocks.
- Region selection via Shift+click+drag.

## Decisions

### D1: D3 zoom behavior for zoom/pan
D3's built-in zoom behavior (`d3-zoom`) is used, attached to the SVG element. Ctrl+wheel triggers zoom; plain mousedown triggers drag-to-pan. Double-click zoom is disabled to avoid conflicts with click-to-align. The zoom transform is applied uniformly to all genome panel scales via `rescaleX`.

### D2: Immutable ViewerState with mutable closure
`ViewerState` is an immutable interface — each zoom transform change creates a new state object via `applyZoomTransform`. The mutable `currentState` variable is held in closures for D3 event callbacks, which is an intentional exception to the project's immutability rule (documented in code comments).

### D3: LCB-relative fractional mapping for homologous positions
Homologous positions are mapped using the fractional offset within the source LCB (accounting for reverse-complement), then applying the same fraction to each target genome's LCB region. This provides approximate positional correspondence without requiring per-column alignment data.

### D4: Separate modules for state, zoom, and cursor
Code is organized into `viewer-state.ts` (pure state functions), `zoom.ts` (D3 zoom setup), and `cursor.ts` (cursor/highlighting), with `alignment-viewer.ts` as the integrator. Each module returns a handle with a `destroy()` method for cleanup.

### D5: Click-to-align with 300ms transition
Clicking triggers a D3 transition that pans the view so the clicked position (and its homologs) are centered. The 300ms duration provides smooth visual feedback without being sluggish.

## Risks

- **Performance at high zoom levels**: At 100,000× zoom, rescaling many LCB blocks per frame could be slow for large alignments. Mitigated by D3's built-in throttling.
- **Fractional position mapping accuracy**: LCB-relative fractional mapping is approximate and may diverge from true column-level alignment for regions with insertions/deletions.
