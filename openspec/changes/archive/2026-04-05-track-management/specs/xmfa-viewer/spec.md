## MODIFIED Requirements

### Requirement: Genome reordering and reference change
The system SHALL allow reordering the displayed genomes using up (▲) and down (▼) buttons in the track controls sidebar to the left of each genome panel, and changing the reference genome using an "R" button. The display order SHALL be maintained as a `genomeOrder` array that maps display indices to data indices; the original alignment data SHALL never be mutated. When the reference genome changes, LCB block orientation SHALL be computed visually using XOR logic: if the reference genome is on the reverse strand in an LCB, all genomes in that LCB SHALL have their visual orientation flipped. The `isVisuallyReverse()` function SHALL compute this on-the-fly without mutating alignment data. When genome order changes, the zoom SHALL reset to the initial 1× view.

#### Scenario: Move genome up
- **WHEN** user clicks the up arrow (▲) button next to a genome
- **THEN** system swaps that genome with the one above it in the display order and resets zoom to 1×

#### Scenario: Move genome down
- **WHEN** user clicks the down arrow (▼) button next to a genome
- **THEN** system swaps that genome with the one below it in the display order and resets zoom to 1×

#### Scenario: Cannot move first genome up
- **WHEN** user views the topmost genome in the display order
- **THEN** the up arrow button for that genome SHALL be disabled

#### Scenario: Cannot move last genome down
- **WHEN** user views the bottommost genome in the display order
- **THEN** the down arrow button for that genome SHALL be disabled

#### Scenario: Change reference genome
- **WHEN** user clicks the "R" button for a genome
- **THEN** system uses that genome as the reference for computing visual forward/reverse orientation of LCB blocks using XOR logic

#### Scenario: Visual reverse uses XOR logic
- **WHEN** the reference genome is on the reverse strand in an LCB
- **THEN** all genomes that are on the forward strand in that LCB SHALL be displayed below the center line (visually reversed), and genomes on the reverse strand SHALL be displayed above the center line (visually forward)

#### Scenario: Reorder preserves data integrity
- **WHEN** genomes are reordered via up/down buttons
- **THEN** the `genomeOrder` array is updated but the original alignment data arrays remain unmodified

### Requirement: Hide genomes
The system SHALL allow hiding individual genomes from the full display using a minus (−) button in the track controls sidebar. Hidden genomes SHALL render as collapsed 20px-height placeholder bars with the genome name displayed in italic gray text. Hidden genome panels SHALL NOT display LCB blocks, rulers, or center lines. Connecting lines SHALL NOT be drawn between hidden genome panels. The system SHALL prevent hiding the last visible genome — the hide button SHALL have no effect when only one genome remains visible. A hidden genome can be shown again by clicking the plus (+) button on its collapsed bar.

#### Scenario: Hide a genome
- **WHEN** user clicks the minus (−) button for a visible genome
- **THEN** system replaces that genome's full panel with a collapsed 20px placeholder bar showing the genome name in italic gray text

#### Scenario: Show a hidden genome
- **WHEN** user clicks the plus (+) button on a collapsed genome bar
- **THEN** system restores the full genome panel with LCB blocks, ruler, and center line

#### Scenario: Cannot hide last visible genome
- **WHEN** user attempts to hide a genome and only one genome remains visible
- **THEN** system SHALL not hide that genome; the state remains unchanged

#### Scenario: No connecting lines for hidden genomes
- **WHEN** a genome is hidden
- **THEN** connecting line trapezoids SHALL only be drawn between adjacent visible genome panels, skipping hidden genomes

#### Scenario: SVG height adjusts for hidden genomes
- **WHEN** one or more genomes are hidden
- **THEN** the total SVG height SHALL be recomputed, accounting for 20px collapsed bars instead of full panel heights

### Requirement: ViewerHandle lifecycle API
The `renderAlignment` function SHALL return a `ViewerHandle` object providing lifecycle management for the viewer. The `ViewerHandle` SHALL expose: a `destroy()` method that removes all event listeners and cleans up zoom, cursor, toolbar, and track controls behaviors; a `getState()` method returning the current immutable `ViewerState`; the `svg` element reference; the `zoomHandle` for programmatic zoom/pan control (with `zoomIn()`, `zoomOut()`, `panLeft()`, `panRight()`, `reset()` methods); the `cursorHandle` for cursor behavior management; the `toolbarHandle` for navigation toolbar lifecycle management; and the `trackControlsHandle` for track controls sidebar lifecycle management. On file reload, the caller SHALL call `destroy()` on the previous handle before creating a new viewer.

#### Scenario: Obtain viewer handle
- **WHEN** `renderAlignment` is called with a container element and alignment data
- **THEN** it returns a `ViewerHandle` with `svg`, `zoomHandle`, `cursorHandle`, `toolbarHandle`, `trackControlsHandle`, `getState()`, and `destroy()` members

#### Scenario: Destroy viewer on reload
- **WHEN** a new alignment file is loaded while a viewer is already active
- **THEN** the caller invokes `destroy()` on the existing `ViewerHandle` before rendering the new alignment, removing all event listeners, D3 behaviors, toolbar elements, and track controls

#### Scenario: Access current state
- **WHEN** `getState()` is called on the `ViewerHandle`
- **THEN** it returns the current immutable `ViewerState` including the alignment data, configuration, zoom transform, genome order, reference genome index, hidden genomes set, and computed scales

## ADDED Requirements

### Requirement: Track controls sidebar
The system SHALL display a track controls sidebar to the left of the alignment SVG. The sidebar SHALL contain one control group per genome panel, each with four buttons: move up (▲), move down (▼), set reference (R), and toggle visibility (−/+). The sidebar SHALL use a `<div>` with `role="toolbar"` and `aria-label="Track controls"`. Each button SHALL have a descriptive `aria-label` and `title` attribute. The R button for the current reference genome SHALL have an `active` CSS class. The sidebar SHALL be fully rebuilt on every state change (reorder, reference change, or visibility toggle). The sidebar SHALL be inserted as the first child of the viewer container element and removed from the DOM when `destroy()` is called on the `TrackControlsHandle`.

#### Scenario: Display track controls
- **WHEN** `renderAlignment` is called with a container element and alignment data
- **THEN** system inserts a track controls sidebar with one control group per genome, each containing ▲, ▼, R, and −/+ buttons

#### Scenario: Active reference indicator
- **WHEN** the track controls sidebar is displayed
- **THEN** the R button for the current reference genome SHALL have the `active` CSS class

#### Scenario: Track controls rebuild on state change
- **WHEN** user clicks any track control button (move up, move down, set reference, or toggle visibility)
- **THEN** the entire track controls sidebar is destroyed and recreated to reflect the updated state

#### Scenario: Track controls cleanup on destroy
- **WHEN** `destroy()` is called on the `TrackControlsHandle`
- **THEN** the sidebar element is removed from the DOM

#### Scenario: Track controls are accessible
- **WHEN** the track controls sidebar is rendered
- **THEN** each button has an `aria-label` attribute and a `title` tooltip describing its action

### Requirement: TrackControlsHandle lifecycle
The `renderAlignment` function SHALL return a `ViewerHandle` that includes a `trackControlsHandle` member of type `TrackControlsHandle`. The `TrackControlsHandle` SHALL expose: an `element` property referencing the sidebar DOM element, and a `destroy()` method that removes the sidebar from the DOM. When the `ViewerHandle.destroy()` method is called, it SHALL also call `trackControlsHandle.destroy()`.

#### Scenario: ViewerHandle includes trackControlsHandle
- **WHEN** `renderAlignment` is called
- **THEN** the returned `ViewerHandle` includes a `trackControlsHandle` with `element` and `destroy` members

#### Scenario: ViewerHandle destroy cleans up track controls
- **WHEN** `destroy()` is called on the `ViewerHandle`
- **THEN** `trackControlsHandle.destroy()` is invoked, removing the sidebar from the DOM
