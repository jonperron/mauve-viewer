## MODIFIED Requirements

### Requirement: Options panel
The system SHALL display an Options Panel in a controls bar above the alignment SVG. The Options Panel SHALL contain a toggle button labeled "Options" with `aria-label="Toggle options panel"`. Clicking the toggle button SHALL show or hide a dropdown containing four checkboxes: "Show Genome ID", "LCB Connecting Lines", "Show Features (zoomed)", and "Show Contigs". All checkboxes SHALL default to checked (enabled). When `onExportImage` or `onPrint` callbacks are provided, the dropdown SHALL include a horizontal rule separator followed by action buttons: an "Export Image (Ctrl+E)" button (if `onExportImage` is provided) and a "Print (Ctrl+P)" button (if `onPrint` is provided). Clicking an action button SHALL close the dropdown and invoke the corresponding callback. Clicking outside the panel SHALL close the dropdown. The controls bar SHALL group the Options Panel and the navigation toolbar on a single horizontal line using flexbox layout.

#### Scenario: Display options panel
- **WHEN** `renderAlignment` is called with a container element and alignment data
- **THEN** system inserts a controls bar above the SVG containing an "Options" toggle button and the navigation toolbar

#### Scenario: Open options dropdown
- **WHEN** user clicks the "Options" toggle button
- **THEN** the dropdown with four checkboxes is displayed

#### Scenario: Close options dropdown on outside click
- **WHEN** the dropdown is open and user clicks outside the options panel
- **THEN** the dropdown is hidden

#### Scenario: Default option values
- **WHEN** the options panel is created without explicit initial state
- **THEN** all four checkboxes (Show Genome ID, LCB Connecting Lines, Show Features, Show Contigs) are checked

#### Scenario: Export Image action button
- **WHEN** the options panel is created with an `onExportImage` callback and user clicks "Export Image (Ctrl+E)" in the dropdown
- **THEN** system closes the dropdown and invokes the `onExportImage` callback

#### Scenario: Print action button
- **WHEN** the options panel is created with an `onPrint` callback and user clicks "Print (Ctrl+P)" in the dropdown
- **THEN** system closes the dropdown and invokes the `onPrint` callback

#### Scenario: Action buttons separated from checkboxes
- **WHEN** the options panel dropdown contains action buttons
- **THEN** a horizontal rule separator visually separates the checkboxes from the action buttons

### Requirement: Zoom and scroll navigation
The system SHALL support zooming via Ctrl+scroll (mouse wheel with Ctrl held), drag-to-pan, programmatic zoom in/out/reset methods, and keyboard shortcuts. Ctrl+Up SHALL zoom in 2× centered on the current view. Ctrl+Down SHALL zoom out 2×. Ctrl+Left/Right SHALL scroll by 10% of the visible range. Shift+Ctrl+Left/Right SHALL scroll by 20% of the visible range (accelerated scrolling). The zoom range SHALL be constrained between 1× and 100,000× magnification. The system SHALL use D3 zoom behavior attached to the SVG element, applying the zoom transform uniformly to all genome panel scales. Double-click zoom SHALL be disabled. The D3 zoom behavior SHALL use a translateExtent of `[[0, 0], [width * 2, 0]]` to constrain horizontal panning and prevent scrolling past alignment boundaries.

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

#### Scenario: Pan clamping prevents overflow
- **WHEN** user pans horizontally to the edge of the alignment
- **THEN** the translateExtent constraint prevents scrolling past the alignment boundaries

### Requirement: Mouse-based interaction
The system SHALL display a cross-track cursor when the mouse hovers over any genome panel. The cursor SHALL appear as a black vertical bar (1.5px stroke) at the hovered nucleotide position and at the corresponding homologous positions in all other genome panels. Homologous position mapping SHALL use LCB-relative fractional offset: the fraction of the source position within its LCB is mapped to the same fraction in each target genome's corresponding LCB region, accounting for reverse-complement orientation. An info display SHALL show the genome name, nucleotide position, and LCB details (LCB number and coordinate range) for the hovered position. Clicking on a position SHALL smoothly center all genome panels on the homologous site with a 300ms animated transition. Transparent cursor overlay rectangles SHALL forward wheel events to the SVG element so that Ctrl+scroll zoom functions correctly when the mouse is over any genome panel overlay. When Ctrl is held during a wheel event on the overlay, the event SHALL be prevented from default behavior to avoid browser page zoom.

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

#### Scenario: Ctrl+scroll zoom over cursor overlays
- **WHEN** user holds Ctrl and scrolls the mouse wheel while hovering over a cursor overlay
- **THEN** the overlay forwards the wheel event to the SVG element, enabling D3 zoom behavior, and prevents default browser zoom
