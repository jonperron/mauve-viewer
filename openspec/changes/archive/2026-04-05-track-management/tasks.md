## 1. ViewerState extensions

- [x] Add `genomeOrder`, `referenceGenomeIndex`, and `hiddenGenomes` to `ViewerState` interface
- [x] Implement `createViewerState()` to initialize `genomeOrder` as identity mapping, reference as 0, hidden as empty set
- [x] Implement `moveGenomeUp()` and `moveGenomeDown()` pure functions
- [x] Implement `setReferenceGenome()` pure function
- [x] Implement `hideGenome()` with last-visible guard
- [x] Implement `showGenome()` pure function
- [x] Implement `isVisuallyReverse()` with XOR logic
- [x] Implement `computePanelY()` accounting for hidden panel heights
- [x] Export `HIDDEN_PANEL_HEIGHT` constant (20px)
- [x] Implement `getVisibleGenomeOrder()` filter function

## 2. Track controls sidebar

- [x] Define `TrackControlCallbacks` interface
- [x] Define `TrackControlsHandle` interface with `element` and `destroy()`
- [x] Implement `createTrackControls()` with ▲/▼/R/−+ buttons per genome
- [x] Set `role="toolbar"` and `aria-label` on sidebar container
- [x] Add `aria-label` and `title` to each button
- [x] Disable up button for first genome, down button for last genome
- [x] Add `active` CSS class to R button for current reference

## 3. Alignment viewer integration

- [x] Import and wire `createTrackControls()` in `renderAlignment()`
- [x] Implement `rebuildTrackControls()` to destroy and recreate on state change
- [x] Wire move up/down callbacks to `moveGenomeUp()`/`moveGenomeDown()` + zoom reset + rerender
- [x] Wire set reference callback to `setReferenceGenome()` + rerender
- [x] Wire toggle visibility callback to `hideGenome()`/`showGenome()` + rerender
- [x] Add `trackControlsHandle` to `ViewerHandle` interface and return value
- [x] Call `trackControlsHandle.destroy()` in `ViewerHandle.destroy()`
- [x] Implement `renderHiddenPanel()` for collapsed 20px bars with italic gray text
- [x] Implement `computeTotalHeight()` accounting for hidden panels
- [x] Update `renderAllPanels()` to dispatch visible/hidden rendering
- [x] Update `renderConnectingLines()` to use `getVisibleGenomeOrder()` only
- [x] Pass `referenceGenomeIndex` to `renderLcbBlocks()` for visual reverse
- [x] Update zoom handler to skip hidden genomes

## 4. Testing

- [x] Unit tests for `moveGenomeUp()`, `moveGenomeDown()`
- [x] Unit tests for `setReferenceGenome()`
- [x] Unit tests for `hideGenome()` with last-visible guard
- [x] Unit tests for `showGenome()`
- [x] Unit tests for `isVisuallyReverse()` XOR logic
- [x] Unit tests for `computePanelY()` with mixed hidden/visible
- [x] Unit tests for `getVisibleGenomeOrder()`
- [x] Unit tests for `createTrackControls()` DOM output and callbacks
- [x] Integration tests for track controls in alignment viewer

## 5. Spec update

- [ ] Update xmfa-viewer spec with track management requirements
