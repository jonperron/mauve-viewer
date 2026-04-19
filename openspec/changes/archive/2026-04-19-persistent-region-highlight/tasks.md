## 1. Remove auto-zoom wiring from alignment-viewer

- [x] Remove `onSelect` callback from `setupRegionSelection()` call in `alignment-viewer.ts`
- [x] Remove unused `computeRegionZoomTransform` import from `alignment-viewer.ts`

## 2. Update specifications

- [x] Update `region-selection` spec to reflect persistent highlight behavior
- [x] Add scenario for Shift+click clearing selection
- [x] Add scenario documenting no auto-zoom on selection
- [x] Add requirement for default viewer not wiring onSelect callback
