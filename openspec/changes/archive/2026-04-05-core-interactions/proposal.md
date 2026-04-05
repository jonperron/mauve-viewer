## Why

The xmfa-viewer spec defines requirements for zoom/scroll navigation, mouse-based interaction (cursor, highlighting, click-to-align), but these were not yet implemented. Phase 1 "Core Interactions" delivers these interactive capabilities, enabling users to navigate and explore multi-genome alignments interactively.

## What Changes

- Zoom & pan via D3 zoom behavior: Ctrl+scroll zoom, drag-to-pan, programmatic zoom in/out/reset, keyboard shortcuts (Ctrl+Up/Down for 2× zoom, Ctrl+Left/Right for 10% scroll, Shift+Ctrl+Left/Right for 20% accelerated scroll).
- Cross-track cursor: hover draws a black vertical bar at homologous positions across all genome panels, with info display showing genome name, position, and LCB details.
- LCB hover highlighting: hovering over an LCB region highlights all homologous LCB blocks and connecting trapezoid lines across genomes.
- Click-to-align: clicking a position smoothly centers all genome panels on the homologous site with a 300ms transition.
- ViewerHandle API: `renderAlignment` returns a `ViewerHandle` with `destroy()`, `getState()`, and access to zoom/cursor handles for lifecycle management.

## Capabilities

### New Capabilities

_None — all features fall under the existing `xmfa-viewer` capability._

### Modified Capabilities

- `xmfa-viewer`: Updating requirements for zoom/scroll navigation, mouse-based interaction (cursor, LCB highlighting, click-to-align), and adding a new requirement for the ViewerHandle API.

## Impact

- New files: `src/viewer/viewer-state.ts`, `src/viewer/zoom.ts`, `src/viewer/cursor.ts`
- Modified files: `src/viewer/alignment-viewer.ts`, `src/main.ts`
- New dependency on D3 zoom behavior (`d3-zoom`)
- `renderAlignment` return type changed from `SVGSVGElement` to `ViewerHandle` (**BREAKING** for consumers using the previous return value)
