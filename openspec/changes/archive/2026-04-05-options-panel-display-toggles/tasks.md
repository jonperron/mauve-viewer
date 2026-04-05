## 1. Options Panel Module

- [x] Create `src/viewer/options-panel.ts` with `OptionsState`, `OptionsCallbacks`, `OptionsPanelHandle` interfaces
- [x] Implement `createOptionsPanel()` with dropdown toggle, four checkboxes, and outside-click close
- [x] Export `DEFAULT_OPTIONS` constant with all values defaulting to `true`
- [x] Implement `destroy()` to remove document listener and DOM element

## 2. Controls Bar & Integration

- [x] Create `.viewer-controls-bar` container in `renderAlignment()`
- [x] Insert options panel and navigation toolbar into controls bar
- [x] Wire option callbacks to update `optionsState` and trigger appropriate re-renders

## 3. Genome ID Toggle

- [x] Implement `getGenomeLabel(name, showGenomeId)` helper in `alignment-viewer.ts`
- [x] Pass `showGenomeId` flag to `renderAllPanels()` and panel rendering functions
- [x] Implement `updateGenomeLabels()` for in-place label updates

## 4. Connecting Lines Toggle

- [x] Wire `onToggleConnectingLines` callback to add/remove `.lcb-lines` groups
- [x] Guard connecting line updates in zoom callback with `optionsState.showConnectingLines`

## 5. Feature & Contig Display Toggles

- [x] Add `AnnotationDisplayOptions` interface to `annotations.ts`
- [x] Update `AnnotationsHandle.update()` to accept optional `displayOptions` parameter
- [x] Wire `onToggleFeatures` and `onToggleContigs` callbacks to pass display options
- [x] Respect display options in annotation rendering logic

## 6. ViewerHandle Update

- [x] Add `optionsPanelHandle` to `ViewerHandle` interface
- [x] Call `optionsPanelHandle.destroy()` in `ViewerHandle.destroy()`

## 7. CSS

- [x] Add `.viewer-controls-bar` styles (flexbox, alignment)
- [x] Add `.options-panel`, `.options-toggle`, `.options-dropdown`, `.options-item` styles

## 8. Tests

- [x] Tests for `getGenomeLabel()` — full name vs stripped extension
- [x] Tests for options panel rendering and ViewerHandle integration
