## MODIFIED Requirements

### Requirement: Zoom and scroll navigation
The system SHALL support zooming via Ctrl+scroll (mouse wheel with Ctrl held), drag-to-pan, programmatic zoom in/out/reset methods, and keyboard shortcuts. Ctrl+Up SHALL zoom in 2× centered on the current view. Ctrl+Down SHALL zoom out 2×. Ctrl+Left/Right SHALL scroll by 10% of the visible range. Shift+Ctrl+Left/Right SHALL scroll by 20% of the visible range (accelerated scrolling). The zoom range SHALL be constrained between 1× and 100,000× magnification. The system SHALL use D3 zoom behavior attached to the SVG element, applying the zoom transform uniformly to all genome panel scales. Double-click zoom SHALL be disabled.

#### Scenario: Zoom in via keyboard
- **WHEN** user presses Ctrl+Up
- **THEN** system zooms in 2× centered on the current view

#### Scenario: Zoom out via keyboard
- **WHEN** user presses Ctrl+Down
- **THEN** system zooms out 2× centered on the current view

#### Scenario: Scroll with acceleration
- **WHEN** user presses Shift+Ctrl+Right
- **THEN** system scrolls right by 20% of the visible range

#### Scenario: Scroll without acceleration
- **WHEN** user presses Ctrl+Right
- **THEN** system scrolls right by 10% of the visible range

#### Scenario: Zoom with mouse wheel
- **WHEN** user holds Ctrl and scrolls the mouse wheel over the alignment view
- **THEN** system zooms in or out centered on the cursor position

#### Scenario: Drag to pan
- **WHEN** user clicks and drags on the alignment view
- **THEN** system pans horizontally by the drag distance

#### Scenario: Reset zoom
- **WHEN** the zoom reset method is invoked
- **THEN** system returns to the initial 1× zoom with no pan offset

#### Scenario: Zoom rescales all panels
- **WHEN** the zoom transform changes
- **THEN** system updates LCB block positions, ruler tick marks, and connecting line trapezoids for all genome panels simultaneously

### Requirement: Mouse-based interaction
The system SHALL display a cross-track cursor when the mouse hovers over any genome panel. The cursor SHALL appear as a black vertical bar (1.5px stroke) at the hovered nucleotide position and at the corresponding homologous positions in all other genome panels. Homologous position mapping SHALL use LCB-relative fractional offset: the fraction of the source position within its LCB is mapped to the same fraction in each target genome's corresponding LCB region, accounting for reverse-complement orientation. An info display SHALL show the genome name, nucleotide position, and LCB details (LCB number and coordinate range) for the hovered position. Clicking on a position SHALL smoothly center all genome panels on the homologous site with a 300ms animated transition.

#### Scenario: Highlight homologous sites on hover
- **WHEN** user moves the mouse over a position in one genome panel
- **THEN** system draws a black vertical bar at that position and at the corresponding homologous position in all other genome panels

#### Scenario: Display cursor info
- **WHEN** user hovers over a genome panel
- **THEN** system displays an info overlay showing the genome name, nucleotide position, and LCB details (LCB number and coordinate range)

#### Scenario: Align homologous sites on click
- **WHEN** user clicks on a position in a genome panel
- **THEN** system smoothly centers all genome panels on the positionally homologous site with a 300ms animated transition

#### Scenario: Cursor disappears on mouse leave
- **WHEN** user moves the mouse away from all genome panels
- **THEN** system hides all cursor lines and the info overlay

## ADDED Requirements

### Requirement: LCB hover highlighting
The system SHALL highlight all homologous LCB blocks and their connecting trapezoid lines when the user hovers over any LCB region. Highlighted LCB blocks SHALL have increased stroke width (2.5px), darker stroke (#222), and increased fill opacity (0.85). Highlighted connecting lines SHALL have increased fill opacity (0.45) and stroke width (1.5px). When the mouse leaves the LCB region, all blocks and connectors SHALL return to their default appearance (1px stroke, 0.6 fill opacity for blocks; 0.5px stroke, 0.2 fill opacity for connectors).

#### Scenario: Highlight LCB on hover
- **WHEN** user hovers over an LCB block in any genome panel
- **THEN** system highlights all blocks with the same LCB index across all genome panels and their connecting trapezoid lines with increased opacity and stroke

#### Scenario: Clear highlight on mouse leave
- **WHEN** user moves the mouse away from the LCB region
- **THEN** system returns all LCB blocks and connectors to their default appearance

### Requirement: ViewerHandle lifecycle API
The `renderAlignment` function SHALL return a `ViewerHandle` object providing lifecycle management for the viewer. The `ViewerHandle` SHALL expose: a `destroy()` method that removes all event listeners and cleans up zoom and cursor behaviors; a `getState()` method returning the current immutable `ViewerState`; the `svg` element reference; the `zoomHandle` for programmatic zoom/pan control (with `zoomIn()`, `zoomOut()`, `panLeft()`, `panRight()`, `reset()` methods); and the `cursorHandle` for cursor behavior management. On file reload, the caller SHALL call `destroy()` on the previous handle before creating a new viewer.

#### Scenario: Obtain viewer handle
- **WHEN** `renderAlignment` is called with a container element and alignment data
- **THEN** it returns a `ViewerHandle` with `svg`, `zoomHandle`, `cursorHandle`, `getState()`, and `destroy()` members

#### Scenario: Destroy viewer on reload
- **WHEN** a new alignment file is loaded while a viewer is already active
- **THEN** the caller invokes `destroy()` on the existing `ViewerHandle` before rendering the new alignment, removing all event listeners and D3 behaviors

#### Scenario: Access current state
- **WHEN** `getState()` is called on the `ViewerHandle`
- **THEN** it returns the current immutable `ViewerState` including the alignment data, configuration, zoom transform, and computed scales

### Requirement: Homologous position mapping
The system SHALL map positions across genomes using LCB-relative fractional offset. For a given nucleotide position within a source genome's LCB, the system SHALL compute the fractional position within that LCB (accounting for reverse-complement strand), then map it to the corresponding fractional position in each target genome's LCB region. The mapping SHALL return an array of `HomologousPosition` objects containing the genome index, mapped position, and LCB identifier.

#### Scenario: Map position to homologous sites
- **WHEN** a position within an LCB is queried for homologous positions
- **THEN** the system returns the mapped positions in all genomes that participate in that LCB, computed via fractional offset within the LCB region

#### Scenario: No homologous position outside LCB
- **WHEN** a position that is not within any LCB is queried
- **THEN** the system returns an empty array of homologous positions
