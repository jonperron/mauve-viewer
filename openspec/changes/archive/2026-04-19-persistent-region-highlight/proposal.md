## Why

The previous region selection behavior auto-zoomed to the selected region and cleared the highlight on completion. This diverged from the original Java Mauve RangeHighlightPanel, which keeps the highlight visible as a persistent annotation. Users need persistent highlights to visually compare regions across genomes without losing their zoom context.

## What Changes

- **MODIFIED**: Shift+drag selection now creates a persistent highlight that remains visible until explicitly cleared
- Shift+click (drag < 5px) clears the current selection highlight (matches Java Mauve clear behavior)
- Pressing Escape clears the selection highlight (unchanged)
- Removed auto-zoom on region selection completion from the default viewer setup
- The `onSelect` callback remains available in `setupRegionSelection` API but is no longer wired in `alignment-viewer.ts`

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `region-selection` — Selection is now persistent; no auto-zoom on completion; Shift+click clears

## Impact

- `src/viewer/alignment-viewer.ts` — Removed `onSelect` callback and `computeRegionZoomTransform` import from `setupRegionSelection()` call
- `src/viewer/interaction/region-selection.ts` — No code changes; `onSelect` parameter is still optional
- No breaking API changes; `onSelect` callback remains available for callers that want it
