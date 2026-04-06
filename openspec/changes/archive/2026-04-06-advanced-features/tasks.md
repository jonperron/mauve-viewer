## 1. Region Selection

- [x] Create `region-selection.ts` with `setupRegionSelection()` and `RegionSelectionHandle`
- [x] Implement Shift+click+drag detection with 5px minimum threshold
- [x] Render selection highlight rectangle on source panel
- [x] Render dashed highlights on other visible panels
- [x] Integrate into `alignment-viewer.ts` and `ViewerHandle`
- [x] Add region selection tests

## 2. Image Export

- [x] Create `image-export.ts` with `exportSvgAsImage()` and `createImageExportDialog()`
- [x] Implement SVG-to-Canvas rendering with style inlining
- [x] Support PNG and JPEG formats with three quality presets
- [x] Add Ctrl+E shortcut via `setupExportShortcut()`
- [x] Integrate into `alignment-viewer.ts` destroy chain
- [x] Add image export tests

## 3. Print Support

- [x] Create `print-support.ts` with `setupPrintSupport()`
- [x] Implement print-isolation wrapper with landscape stylesheet
- [x] Add Ctrl+P shortcut with SVG clone and `window.print()`
- [x] Integrate into `alignment-viewer.ts` destroy chain
- [x] Add print support tests

## 4. Sequence Navigator

- [x] Create `sequence-navigator.ts` with `searchFeatures()` and `createSequenceNavigator()`
- [x] Implement feature search with exact/contains modes
- [x] Implement per-genome scope filtering
- [x] Implement go-to-position tab with genome selector
- [x] Add Ctrl+I shortcut via `setupNavigatorShortcut()`
- [x] Integrate into `alignment-viewer.ts` with annotation-conditional setup
- [x] Add sequence navigator tests

## 5. Integration

- [x] Extend `ViewerHandle` with `regionSelectionHandle`
- [x] Update `destroy()` to clean up all four features
- [x] Add CSS styles to `index.html` for new UI components
