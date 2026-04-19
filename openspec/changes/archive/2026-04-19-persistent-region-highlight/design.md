## Context

The Mauve Viewer region selection feature was originally implemented with auto-zoom behavior: completing a Shift+drag selection would zoom the viewer to the selected region and clear the highlight. This differs from the original Java Mauve's `RangeHighlightPanel`, which keeps selection highlights persistent.

## Goals

- Match Java Mauve RangeHighlightPanel behavior: persistent selection highlights
- Provide Shift+click as a clear mechanism (matching Java Mauve)
- Keep `onSelect` callback as an optional API for callers who want custom behavior

## Non-Goals

- Changing the region selection rendering logic
- Modifying the `RegionSelectionHandle` API surface

## Decisions

1. **Remove auto-zoom wiring**: The `setupRegionSelection()` call in `alignment-viewer.ts` no longer passes an `onSelect` callback that auto-zooms and clears. The selection stays visible.
2. **Shift+click clears**: The existing < 5px drag threshold behavior already clears the selection. This is now the primary user-facing clear mechanism alongside Escape.
3. **Preserve optional callback**: The `onSelect` parameter stays in the `setupRegionSelection` API signature for consumers who want to hook into selection events.

## Risks

- None significant. The change is a simplification (removing wiring, not adding complexity).
