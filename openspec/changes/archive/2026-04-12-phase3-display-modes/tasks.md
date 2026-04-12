# Tasks: Phase 3 Display Modes & Similarity Profiles

## 1. Display Mode State Architecture

- [x] Add `DisplayMode` type (`'lcb' | 'ungapped-match' | 'similarity-profile'`) to `viewer-state.ts`
- [x] Add `displayMode` field to `ViewerState` interface
- [x] Implement `setDisplayMode()` returning updated immutable state
- [x] Update `createViewerState()` to accept optional initial `displayMode` parameter

## 2. Navigation Toolbar Display Mode Selector

- [x] Add display mode label map and type-safe validation in `navigation-toolbar.ts`
- [x] Implement `<select>` dropdown with display mode options
- [x] Only show selector when `availableModes.length > 1`
- [x] Add `onDisplayModeChange` optional callback to `NavigationCallbacks`
- [x] Wire mode change to `setDisplayMode()` + zoom reset + full re-render

## 3. Ungapped Match Renderer

- [x] Create `ungapped-match-renderer.ts` module
- [x] Implement `renderUngappedMatches()` rendering thin rectangles (8px height) per LCB block
- [x] Color blocks by LCB color from the current color scheme
- [x] Support hidden genome panels (skip rendering)
- [x] Implement `updateUngappedMatchesOnZoom()` for zoom-responsive position updates

## 4. Similarity Profile Renderer

- [x] Create `similarity-profile-renderer.ts` module
- [x] Define `SimilarityProfileData` interface with `ReadonlyMap<number, MultiLevelProfile>`
- [x] Implement `renderSimilarityProfiles()` as D3 filled area charts per LCB region
- [x] Use `selectProfileForZoom()` for zoom-adaptive resolution selection
- [x] Color area fills by LCB color with 0.6 fill-opacity
- [x] Implement `updateSimilarityProfilesOnZoom()` for zoom-responsive re-rendering

## 5. Unaligned Region Rendering

- [x] Create `unaligned-regions.ts` module
- [x] Implement `computeUnalignedRegions()` with interval merge-sort-gap algorithm
- [x] Implement `renderUnalignedRegions()` as white semi-transparent blocks with #ddd stroke
- [x] Implement `updateUnalignedRegionsOnZoom()` for zoom-responsive position updates
- [x] Render unaligned regions in all three display modes

## 6. Integration in alignment-viewer.ts

- [x] Detect available modes based on data (LCBs → ungapped-match, blocks → similarity-profile)
- [x] Dispatch `renderAllPanels()` to correct renderer by `displayMode`
- [x] Only draw connecting lines in LCB mode
- [x] Precompute `SimilarityProfileData` on load when blocks available
- [x] Mode change via toolbar triggers `setDisplayMode()` + zoom reset + `rerenderPanels()`
- [x] Update `renderAlignment()` to accept optional `initialDisplayMode` parameter

## 7. Spec Update

- [x] Update `openspec/specs/xmfa-viewer/spec.md` with expanded display mode requirements
