## MODIFIED Requirements

### Requirement: Three display modes
The system SHALL support three display modes, selectable at runtime when data supports multiple modes. The `DisplayMode` type is `'lcb' | 'ungapped-match' | 'similarity-profile'`. The active mode is stored in `ViewerState.displayMode` and updated immutably via `setDisplayMode()`. Available modes are determined on load: LCB mode is always available; ungapped-match mode is available when LCBs are present; similarity-profile mode is available when alignment blocks are present. Switching modes triggers a zoom reset and full re-render. Connecting lines between genome panels SHALL only be drawn in LCB mode.

**Module**: `src/viewer/viewer-state.ts` (state), `src/viewer/alignment-viewer.ts` (dispatch)

#### Scenario: Display XMFA alignment in LCB mode
- **WHEN** user opens an XMFA alignment file and selects LCB display mode
- **THEN** system displays LCB bounding box outlines with connecting lines between homologous blocks

#### Scenario: Display alignment in ungapped match mode
- **WHEN** user selects ungapped match display mode
- **THEN** system displays thin colored rectangles (8px height) for each LCB block without connecting lines

#### Scenario: Display alignment in similarity profile mode
- **WHEN** user selects similarity profile display mode and alignment blocks are available
- **THEN** system displays filled D3 area charts within each genome panel representing local sequence conservation

#### Scenario: Mode switch resets zoom
- **WHEN** user changes the display mode via the toolbar selector
- **THEN** system resets the zoom to 1× and fully re-renders all genome panels in the new mode

#### Scenario: Connecting lines only in LCB mode
- **WHEN** display mode is ungapped-match or similarity-profile
- **THEN** connecting line trapezoids between genome panels SHALL NOT be drawn

#### Scenario: Available modes depend on data
- **WHEN** an alignment is loaded with LCBs but no alignment blocks
- **THEN** the available modes are LCB and ungapped-match (similarity-profile is unavailable)

#### Scenario: All modes available with full data
- **WHEN** an alignment is loaded with both LCBs and alignment blocks
- **THEN** all three display modes (LCB, ungapped-match, similarity-profile) are available

### Requirement: Navigation toolbar
The system SHALL display a navigation toolbar in a controls bar above the alignment SVG, alongside the Options Panel. The controls bar SHALL contain the options panel and the navigation toolbar on a single horizontal line. The toolbar SHALL contain five buttons: Reset, Pan Left, Zoom In, Zoom Out, and Pan Right. Each button SHALL invoke the corresponding `ZoomHandle` method (`reset()`, `panLeft()`, `zoomIn()`, `zoomOut()`, `panRight()`). The toolbar SHALL use a `<div>` with `role="toolbar"` and `aria-label="Navigation controls"`. Each button SHALL have a descriptive `aria-label` attribute and a `title` tooltip that includes the keyboard shortcut hint (e.g., "Zoom in (Ctrl+Up)"). The controls bar SHALL be inserted as the first child of the viewer container element. The toolbar SHALL be removed from the DOM when `destroy()` is called on the `NavigationToolbarHandle`. When multiple display modes are available, the toolbar SHALL include a display mode selector dropdown: a `<select>` element with class `display-mode-selector`, `aria-label="Display mode"`, and `title="Display mode"`. The dropdown SHALL only be rendered when more than one display mode is available. Options SHALL use labels: "LCB Display" for `lcb`, "Ungapped Matches" for `ungapped-match`, "Similarity Profile" for `similarity-profile`. Selecting a mode SHALL invoke `onDisplayModeChange` on `NavigationCallbacks` with type-safe validation via `isDisplayMode()`.

**Module**: `src/viewer/navigation-toolbar.ts`

#### Scenario: Display navigation toolbar
- **WHEN** `renderAlignment` is called with a container element and alignment data
- **THEN** system inserts a controls bar with a navigation toolbar containing Reset, Pan Left, Zoom In, Zoom Out, and Pan Right buttons above the SVG element

#### Scenario: Zoom in via toolbar button
- **WHEN** user clicks the Zoom In button in the navigation toolbar
- **THEN** system zooms in 2× centered on the current view (equivalent to Ctrl+Up)

#### Scenario: Zoom out via toolbar button
- **WHEN** user clicks the Zoom Out button in the navigation toolbar
- **THEN** system zooms out 2× centered on the current view (equivalent to Ctrl+Down)

#### Scenario: Pan left via toolbar button
- **WHEN** user clicks the Pan Left button in the navigation toolbar
- **THEN** system scrolls left by 10% of the visible range (equivalent to Ctrl+Left)

#### Scenario: Pan right via toolbar button
- **WHEN** user clicks the Pan Right button in the navigation toolbar
- **THEN** system scrolls right by 10% of the visible range (equivalent to Ctrl+Right)

#### Scenario: Reset view via toolbar button
- **WHEN** user clicks the Reset button in the navigation toolbar
- **THEN** system returns to the initial 1× zoom with no pan offset

#### Scenario: Toolbar buttons are accessible
- **WHEN** the navigation toolbar is rendered
- **THEN** each button has an `aria-label` attribute and a `title` tooltip with a keyboard shortcut hint

#### Scenario: Toolbar cleanup on destroy
- **WHEN** `destroy()` is called on the `NavigationToolbarHandle`
- **THEN** the toolbar element is removed from the DOM

#### Scenario: Show display mode selector
- **WHEN** the alignment has multiple available display modes
- **THEN** the navigation toolbar displays a dropdown selector with the available mode labels

#### Scenario: Hide display mode selector for single mode
- **WHEN** the alignment only supports one display mode (e.g., LCB only)
- **THEN** the navigation toolbar does not render the display mode selector

#### Scenario: Select ungapped match mode from dropdown
- **WHEN** user selects "Ungapped Matches" from the display mode dropdown
- **THEN** system validates the value, invokes `onDisplayModeChange('ungapped-match')`, resets zoom, and re-renders in ungapped match mode

#### Scenario: Display mode selector is accessible
- **WHEN** the display mode selector is rendered
- **THEN** it has `aria-label="Display mode"` and a `title="Display mode"` attribute

### Requirement: ViewerHandle lifecycle API
The `renderAlignment` function SHALL return a `ViewerHandle` object providing lifecycle management for the viewer. The function SHALL accept an optional `initialDisplayMode` parameter of type `DisplayMode` to set the initial display mode. The `ViewerHandle` SHALL expose: a `destroy()` method that removes all event listeners and cleans up zoom, cursor, toolbar, track controls, options panel, color scheme menu, region selection, annotations, feature tooltip, image export, print support, and sequence navigator behaviors; a `getState()` method returning the current immutable `ViewerState`; the `svg` element reference; the `zoomHandle` for programmatic zoom/pan control (with `zoomIn()`, `zoomOut()`, `panLeft()`, `panRight()`, `reset()` methods); the `cursorHandle` for cursor behavior management; the `toolbarHandle` for navigation toolbar lifecycle management; the `trackControlsHandle` for track controls sidebar lifecycle management; the `optionsPanelHandle` for options panel lifecycle management; the `colorSchemeMenuHandle` for color scheme menu lifecycle management; the `regionSelectionHandle` for region selection lifecycle management; and the `annotationsHandle` for annotation rendering lifecycle management (if annotations are provided). The `renderAlignment` function SHALL accept an optional `AnnotationMap` parameter. On file reload, the caller SHALL call `destroy()` on the previous handle before creating a new viewer.

#### Scenario: Obtain viewer handle
- **WHEN** `renderAlignment` is called with a container element and alignment data
- **THEN** it returns a `ViewerHandle` with `svg`, `zoomHandle`, `cursorHandle`, `toolbarHandle`, `trackControlsHandle`, `optionsPanelHandle`, `colorSchemeMenuHandle`, `regionSelectionHandle`, `annotationsHandle`, `getState()`, and `destroy()` members

#### Scenario: Destroy viewer on reload
- **WHEN** a new alignment file is loaded while a viewer is already active
- **THEN** the caller invokes `destroy()` on the existing `ViewerHandle` before rendering the new alignment, removing all event listeners, D3 behaviors, toolbar elements, track controls, options panel, color scheme menu, region selection, annotations, feature tooltips, image export shortcut, print support, and sequence navigator

#### Scenario: Access current state with display mode
- **WHEN** `getState()` is called on the `ViewerHandle`
- **THEN** it returns the current immutable `ViewerState` including the alignment data, configuration, zoom transform, genome order, reference genome index, hidden genomes set, display mode, and computed scales

#### Scenario: Render alignment with annotations
- **WHEN** `renderAlignment` is called with an `AnnotationMap` parameter
- **THEN** system sets up annotation rendering, feature tooltips, and sequence navigator shortcut (Ctrl+I), updating annotations on zoom/pan changes

#### Scenario: Annotations update on zoom
- **WHEN** the zoom transform changes and annotations are present
- **THEN** system updates annotation feature positions and visibility based on the new zoom level

#### Scenario: Render alignment with initial display mode
- **WHEN** `renderAlignment` is called with `initialDisplayMode` set to `'similarity-profile'`
- **THEN** the viewer starts in similarity profile mode if the data supports it

## ADDED Requirements

### Requirement: Ungapped match rendering
The system SHALL render ungapped match blocks as thin colored rectangles (8px height) within each genome panel when in ungapped-match display mode. Each LCB is rendered as a `<rect>` element with class `match-block`, colored by the current LCB color scheme with 0.7 opacity. Forward-orientation matches are vertically centered in the forward LCB zone; reverse-orientation matches in the reverse LCB zone. Hidden genome panels are skipped. The renderer accepts shared `renderLabel` and `renderRuler` callbacks for consistent panel layout across modes. On zoom, match block positions and widths SHALL be updated via `updateUngappedMatchesOnZoom()` using the zoomed scale, with a minimum rendered width of 2px.

**Module**: `src/viewer/ungapped-match-renderer.ts`

#### Scenario: Render ungapped matches for a genome
- **WHEN** display mode is ungapped-match and a genome has LCB data
- **THEN** system renders 8px-height colored rectangles for each LCB block present in that genome

#### Scenario: Reverse-orientation ungapped match placement
- **WHEN** an LCB is in reverse complement orientation relative to the reference genome
- **THEN** the match rectangle is placed in the reverse zone (below the center line)

#### Scenario: Zoom updates ungapped match positions
- **WHEN** user zooms while in ungapped-match mode
- **THEN** all match block x positions and widths are recalculated from the zoomed scale

#### Scenario: Hidden genomes skipped in ungapped mode
- **WHEN** a genome is hidden while in ungapped-match mode
- **THEN** no match blocks are rendered for that genome

### Requirement: Similarity profile rendering
The system SHALL render similarity profiles as filled D3 area charts within each genome panel when in similarity-profile display mode. Profiles are precomputed as `MultiLevelProfile` data (via `computeMultiLevelProfile()` from `src/analysis/similarity/compute.ts`) on alignment load. The appropriate resolution level is selected at render time via `selectProfileForZoom()` based on the current base-pairs-per-pixel ratio. Each LCB region is rendered as a separate filled area colored by the LCB color with 0.6 fill-opacity. The profile height represents local sequence conservation (0–100%), scaled to `PROFILE_HEIGHT = LCB_HEIGHT * 2`. Forward-orientation profiles grow upward from a baseline; reverse-orientation profiles grow downward. On zoom, profiles are fully re-rendered with the appropriate resolution level via `updateSimilarityProfilesOnZoom()`.

**Module**: `src/viewer/similarity-profile-renderer.ts`

**Data type**: `SimilarityProfileData { profiles: ReadonlyMap<number, MultiLevelProfile> }`

#### Scenario: Render similarity profiles for all genomes
- **WHEN** display mode is similarity-profile and multi-level profiles have been computed
- **THEN** system renders filled area charts within each visible genome panel, one per LCB region

#### Scenario: Zoom-adaptive profile resolution
- **WHEN** user zooms in while in similarity-profile mode
- **THEN** system selects a finer-grained profile resolution level and re-renders the area charts

#### Scenario: Per-LCB coloring
- **WHEN** similarity profiles are rendered
- **THEN** each LCB region's area fill uses the LCB's assigned color from the current color scheme with 0.6 fill-opacity

#### Scenario: Reverse-orientation profile direction
- **WHEN** an LCB is in reverse complement orientation relative to the reference genome
- **THEN** the similarity profile area grows downward from a lower baseline instead of upward

#### Scenario: Profiles precomputed on load
- **WHEN** an alignment with block data is loaded
- **THEN** system precomputes `MultiLevelProfile` for each genome and caches it in memory for the viewer session

### Requirement: Unaligned region rendering
The system SHALL compute and display unaligned genomic regions — regions not covered by any LCB — as white semi-transparent indicator blocks. The algorithm collects all LCB intervals for a genome, sorts by start position, merges overlapping intervals, and computes gaps. Gaps with size ≥ 1 bp are rendered as `<rect>` elements with class `unaligned-block`, filled white (`#ffffff`) with 0.85 fill-opacity and a light gray stroke (`#ddd`, 0.5px). The blocks span the full profile height (`LCB_HEIGHT * 2`) starting at `Y_POS_OFFSET`. Unaligned regions are rendered in all three display modes. On zoom, unaligned block positions are updated via `updateUnalignedRegionsOnZoom()`.

**Module**: `src/viewer/unaligned-regions.ts`

**Exported functions**:
- `computeUnalignedRegions(lcbs, genomeIndex, genomeLength)` → `readonly CoveredInterval[]`
- `renderUnalignedRegions(panel, genomeDataIndex, lcbs, genomeLength, xScale)` → void
- `updateUnalignedRegionsOnZoom(root, state, lcbs)` → void

#### Scenario: Compute unaligned gaps
- **WHEN** a genome has LCBs covering positions 100–500 and 800–1200 out of a 2000bp genome
- **THEN** `computeUnalignedRegions` returns gaps at 1–99, 501–799, and 1201–2000

#### Scenario: Render unaligned regions
- **WHEN** genome panels are rendered in any display mode
- **THEN** white semi-transparent blocks are overlaid on regions not covered by any LCB

#### Scenario: Zoom updates unaligned region positions
- **WHEN** user zooms while unaligned regions are visible
- **THEN** block x positions and widths are recalculated from the zoomed scale

#### Scenario: No unaligned regions when fully covered
- **WHEN** all positions in a genome are covered by LCBs with no gaps
- **THEN** no unaligned region blocks are rendered
