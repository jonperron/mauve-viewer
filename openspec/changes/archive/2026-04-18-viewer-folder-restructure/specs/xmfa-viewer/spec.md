# xmfa-viewer (delta)

Updates module path references after viewer folder restructuring.

## MODIFIED Requirements

### Requirement: Navigation toolbar
The system SHALL display a navigation toolbar in a controls bar above the alignment SVG. The controls bar SHALL arrange its children in the following order: shortcuts help button, navigation toolbar, color scheme menu, and options panel, displayed on a single horizontal line using flexbox layout. The toolbar SHALL contain five buttons: Reset, Pan Left, Zoom In, Zoom Out, and Pan Right. Each button SHALL invoke the corresponding `ZoomHandle` method (`reset()`, `panLeft()`, `zoomIn()`, `zoomOut()`, `panRight()`). The toolbar SHALL use a `<div>` with `role="toolbar"` and `aria-label="Navigation controls"`. Each button SHALL have a descriptive `aria-label` attribute and a `title` tooltip that includes the keyboard shortcut hint (e.g., "Zoom in (Ctrl+Up)"). The controls bar SHALL be inserted as the first child of the viewer container element. The toolbar SHALL be removed from the DOM when `destroy()` is called on the `NavigationToolbarHandle`. When multiple display modes are available, the toolbar SHALL include a display mode selector dropdown: a `<select>` element with class `display-mode-selector`, `aria-label="Display mode"`, and `title="Display mode"`. The dropdown SHALL only be rendered when more than one display mode is available. Options SHALL use labels: "LCB Display" for `lcb`, "Ungapped Matches" for `ungapped-match`, "Similarity Profile" for `similarity-profile`. Selecting a mode SHALL invoke `onDisplayModeChange` on `NavigationCallbacks` with type-safe validation via `isDisplayMode()`.

**Module**: `src/viewer/toolbar/navigation-toolbar.ts`

#### Scenario: Display navigation toolbar
- **WHEN** `renderAlignment` is called with a container element and alignment data
- **THEN** system inserts a controls bar with a navigation toolbar containing Reset, Pan Left, Zoom In, Zoom Out, and Pan Right buttons above the SVG element

### Requirement: Ungapped match rendering
The system SHALL render ungapped match blocks as thin colored rectangles (8px height) within each genome panel when in ungapped-match display mode. Each LCB is rendered as a `<rect>` element with class `match-block`, colored by the current LCB color scheme with 0.7 opacity. Forward-orientation matches are vertically centered in the forward LCB zone; reverse-orientation matches in the reverse LCB zone. Hidden genome panels are skipped. The renderer accepts shared `renderLabel` and `renderRuler` callbacks for consistent panel layout across modes. On zoom, match block positions and widths SHALL be updated via `updateUngappedMatchesOnZoom()` using the zoomed scale, with a minimum rendered width of 2px.

**Module**: `src/viewer/rendering/ungapped-match-renderer.ts`

#### Scenario: Render ungapped matches for a genome
- **WHEN** display mode is ungapped-match and a genome has LCB data
- **THEN** system renders 8px-height colored rectangles for each LCB block present in that genome

### Requirement: Similarity profile rendering
The system SHALL render similarity profiles as filled D3 area charts within each genome panel when in similarity-profile display mode. Profiles are precomputed as `MultiLevelProfile` data (via `computeMultiLevelProfile()` from `src/analysis/similarity/compute.ts`) on alignment load. The appropriate resolution level is selected at render time via `selectProfileForZoom()` based on the current base-pairs-per-pixel ratio. Each LCB region is rendered as a separate filled area colored by the LCB color with 0.6 fill-opacity. The profile height represents local sequence conservation (0–100%), scaled to `PROFILE_HEIGHT = LCB_HEIGHT * 2`. Forward-orientation profiles grow upward from a baseline; reverse-orientation profiles grow downward. On zoom, profiles are fully re-rendered with the appropriate resolution level via `updateSimilarityProfilesOnZoom()`.

**Module**: `src/viewer/rendering/similarity-profile-renderer.ts`

**Data type**: `SimilarityProfileData { profiles: ReadonlyMap<number, MultiLevelProfile> }`

#### Scenario: Render similarity profiles for all genomes
- **WHEN** display mode is similarity-profile and multi-level profiles have been computed
- **THEN** system renders filled area charts within each visible genome panel, one per LCB region

### Requirement: Unaligned region rendering
The system SHALL compute and display unaligned genomic regions — regions not covered by any LCB — as white semi-transparent indicator blocks. The algorithm collects all LCB intervals for a genome, sorts by start position, merges overlapping intervals, and computes gaps. Gaps with size ≥ 1 bp are rendered as `<rect>` elements with class `unaligned-block`, filled white (`#ffffff`) with 0.85 fill-opacity and a light gray stroke (`#ddd`, 0.5px). The blocks span the full profile height (`LCB_HEIGHT * 2`) starting at `Y_POS_OFFSET`. Unaligned regions are rendered in all three display modes. On zoom, unaligned block positions are updated via `updateUnalignedRegionsOnZoom()`.

**Module**: `src/viewer/rendering/unaligned-regions.ts`

**Exported functions**:
- `computeUnalignedRegions(lcbs, genomeIndex, genomeLength)` → `readonly CoveredInterval[]`
- `renderUnalignedRegions(panel, genomeDataIndex, lcbs, genomeLength, xScale)` → void
- `updateUnalignedRegionsOnZoom(root, state, lcbs)` → void

#### Scenario: Compute unaligned gaps
- **WHEN** a genome has LCBs covering positions 100–500 and 800–1200 out of a 2000bp genome
- **THEN** `computeUnalignedRegions` returns gaps at 1–99, 501–799, and 1201–2000

### Requirement: Keyboard shortcuts help panel
The system SHALL display a keyboard shortcuts help panel in the controls bar above the alignment SVG. The help panel SHALL consist of a circular "?" button (`aria-label="Keyboard shortcuts"`, `title="Keyboard shortcuts (?)"`) and a toggleable floating box listing all keyboard shortcuts. The shortcuts list SHALL be rendered as a definition list (`<dl>`) with each shortcut showing key bindings in `<kbd>` elements and a description. The listed shortcuts SHALL include: Ctrl+Up (Zoom in), Ctrl+Down (Zoom out), Ctrl+Left (Pan left), Ctrl+Right (Pan right), Ctrl+Shift+Left/Right (Pan faster), Ctrl+E (Export image), Ctrl+P (Print), Ctrl+I (Sequence navigator), Escape (Close dialog / clear selection), and ? (Toggle this help). Pressing the "?" key (without Ctrl, Alt, or Meta modifiers) SHALL toggle the help box visibility. The "?" keydown handler SHALL be ignored when the active element is an INPUT, TEXTAREA, or SELECT to avoid interfering with form input. Clicking outside the shortcuts help wrapper SHALL close the help box. The `ShortcutsHelpHandle.destroy()` method SHALL remove the keydown and click event listeners and remove the wrapper element from the DOM. The shortcuts help button SHALL be the first element appended to the controls bar.

**Module**: `src/viewer/interaction/shortcuts-help.ts`

#### Scenario: Display shortcuts help button
- **WHEN** `renderAlignment` is called with a container element and alignment data
- **THEN** the controls bar contains a circular "?" button with `aria-label="Keyboard shortcuts"` as its first element
