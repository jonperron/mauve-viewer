## 1. State Management

- [x] Create `ViewerState` interface with alignment, config, base scales, and zoom transform
- [x] Implement `createViewerState` to initialize scales from alignment genomes
- [x] Implement `applyZoomTransform` to produce updated state with new transform
- [x] Implement `getZoomedScale` to rescale genome scales with current zoom transform
- [x] Implement `getVisibleDomain` and `getVisibleRangeSize` helpers
- [x] Implement `pixelToPosition` and `positionToPixel` coordinate converters

## 2. Homologous Position Mapping

- [x] Implement `findLcbAtPosition` to locate the LCB covering a given genome position
- [x] Implement `findHomologousPositions` using LCB-relative fractional offset mapping
- [x] Handle reverse-complement orientation in fractional offset calculation

## 3. Zoom & Pan

- [x] Implement `setupZoom` with D3 zoom behavior on SVG element
- [x] Configure Ctrl+scroll filter for zoom and mousedown for pan
- [x] Disable double-click zoom
- [x] Implement programmatic `zoomIn`, `zoomOut`, `panLeft`, `panRight`, `reset` methods
- [x] Implement keyboard shortcuts: Ctrl+Up/Down for 2× zoom, Ctrl+Left/Right for scroll
- [x] Implement Shift+Ctrl+Left/Right for 20% accelerated scroll
- [x] Return `ZoomHandle` with `destroy()` for cleanup

## 4. Cross-track Cursor

- [x] Create transparent overlay rects on each genome panel to capture mouse events
- [x] Draw black vertical cursor lines (1.5px) at hovered position and homologous positions
- [x] Show info display with genome name, nucleotide position, and LCB details
- [x] Hide cursor and info on mouse leave

## 5. LCB Hover Highlighting

- [x] Highlight all LCB blocks with matching index on hover (stroke #222, 2.5px, fill-opacity 0.85)
- [x] Highlight connecting trapezoid lines on hover (fill-opacity 0.45, stroke-width 1.5px)
- [x] Reset to default appearance on mouse leave

## 6. Click to Align

- [x] Handle click events on genome panel overlays
- [x] Compute homologous positions for clicked location
- [x] Pan view to center on clicked position with 300ms D3 transition

## 7. ViewerHandle API

- [x] Change `renderAlignment` return type to `ViewerHandle`
- [x] Expose `svg`, `zoomHandle`, `cursorHandle`, `getState()`, `destroy()`
- [x] Integrate zoom and cursor into alignment-viewer rendering pipeline
- [x] Update `main.ts` to call `destroy()` on previous handle when loading new file

## 8. Zoom-responsive Rendering

- [x] Update LCB block positions on zoom transform change
- [x] Update ruler/axis tick marks on zoom transform change
- [x] Update connecting line trapezoid paths on zoom transform change
- [x] Update cursor state reference on zoom transform change
