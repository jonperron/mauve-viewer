# Design: Phase 3 Display Modes & Similarity Profiles

## Context

The Mauve Viewer supports three display modes matching the legacy Java application: LCB display with bounding boxes and connecting lines, ungapped match display for `.mauve` files, and similarity profile display for full XMFA alignments with block data. Phase 3 implements the rendering pipelines and mode-switching architecture.

## Goals / Non-Goals

**Goals**:
- Implement display mode switching via immutable `ViewerState` updates
- Render ungapped matches as thin colored rectangles with zoom support
- Render similarity profiles as D3 area charts with multi-level zoom-adaptive resolution
- Compute and render unaligned regions as white indicator blocks
- Integrate display mode selector into the navigation toolbar
- Only show connecting lines in LCB mode

**Non-Goals**:
- Animated transitions between display modes (immediate re-render)
- Custom color schemes per display mode (all modes share the LCB color scheme)
- Profile caching to disk (in-memory multi-level profiles only)

## Decisions

### Display mode as ViewerState field
**Rationale**: Display mode is part of viewer state alongside zoom, genome order, and reference. Immutable state updates via `setDisplayMode()` maintain consistency with the existing state pattern.

### Full re-render on mode change
**Rationale**: Each mode uses fundamentally different SVG structures (rects vs area paths vs block outlines). A full clear-and-redraw is simpler and more correct than trying to morph between modes. Zoom resets on mode change to avoid scale inconsistencies.

### Display mode selector only shown when multiple modes available
**Rationale**: For single-mode data (e.g., only LCBs without blocks), showing a dropdown with one option adds noise. The selector is hidden when only one mode is available.

### Ungapped matches: 8px thin rectangles
**Rationale**: Matches the legacy Mauve behavior where ungapped matches are rendered as thinner blocks than LCB bounding boxes, providing visual distinction.

### Similarity profiles: per-LCB colored area charts
**Rationale**: Each LCB region gets its own filled area colored by LCB color, matching the legacy Java rendering. Uses `selectProfileForZoom()` to pick the appropriate resolution level based on current zoom, avoiding rendering millions of data points at overview zoom.

### Unaligned regions: merge-sort-gap algorithm
**Rationale**: Collect all LCB intervals, sort by start, merge overlapping intervals, then compute gaps. This is O(n log n) and straightforward. Rendered as white semi-transparent blocks with light gray stroke.

## Risks / Trade-offs

- **[Performance] Full re-render on mode switch** → Acceptable for typical genome counts (2-20 panels). Could optimize with retained SVG groups if needed.
- **[Visual] Unaligned regions overlap LCB blocks** → Semi-transparent white ensures underlying content is dimmed but not fully obscured.
- **[Data dependency] Similarity profiles require pre-computed multi-level data** → Computed once on load and cached in closure. May add startup latency for large alignments.
