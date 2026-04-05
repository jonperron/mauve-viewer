## 1. Navigation toolbar module

- [x] Create `src/viewer/navigation-toolbar.ts` with `createNavigationToolbar` function
- [x] Define `NavigationCallbacks` interface with `onZoomIn`, `onZoomOut`, `onPanLeft`, `onPanRight`, `onReset`
- [x] Define `NavigationToolbarHandle` interface with `element` and `destroy()`
- [x] Create five buttons (Reset, Pan Left, Zoom In, Zoom Out, Pan Right) with ARIA labels and tooltip hints
- [x] Insert toolbar as first child of container element

## 2. Integration with alignment viewer

- [x] Import and call `createNavigationToolbar` in `renderAlignment`
- [x] Wire toolbar callbacks to `ZoomHandle` methods
- [x] Add `toolbarHandle` to `ViewerHandle` interface
- [x] Call `toolbarHandle.destroy()` in `ViewerHandle.destroy()`

## 3. Styling

- [x] Add CSS styles for `.navigation-toolbar` and button classes in `index.html`

## 4. Tests

- [x] Write unit tests for all five toolbar buttons
- [x] Write test for toolbar cleanup on destroy
- [x] Verify ARIA attributes and toolbar role
