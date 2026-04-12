## Purpose

Defines the interactive genome alignment visualization system: multi-panel display layout, LCB blocks and connecting lines, similarity profiles, annotated feature rendering, zoom/scroll navigation, mouse interaction, genome reordering, printing, and image export.
## Requirements
### Requirement: Multi-genome alignment visualization
The system SHALL display genome alignments as a set of horizontal panels, one per input genome, each containing a genome name, coordinate ruler, center line, and colored block outlines (LCBs above for forward, below for reverse orientation).

#### Scenario: Display pairwise alignment
- **WHEN** user opens an XMFA alignment file containing two genomes
- **THEN** system displays two horizontal panels with colored LCB blocks and connecting lines between homologous blocks

#### Scenario: Display inverted regions
- **WHEN** an LCB is in reverse complement orientation relative to the reference genome
- **THEN** system draws that LCB block below the center line

#### Scenario: Display unaligned regions
- **WHEN** a genome region has no detectable homology among input genomes
- **THEN** system displays that region as completely white outside any colored block

#### Scenario: Display multi-genome alignment
- **WHEN** user opens an XMFA alignment file containing three or more genomes
- **THEN** system displays one horizontal panel per genome with LCB blocks and connecting lines between each pair of adjacent panels

### Requirement: LCB connecting lines
The system SHALL draw colored trapezoid connectors between homologous LCB blocks across adjacent genome panels to indicate which regions in each genome are homologous.

#### Scenario: Show connecting lines
- **WHEN** an alignment is displayed with multiple genome panels
- **THEN** system draws filled trapezoid connectors between corresponding block boundaries across adjacent genome panels

### Requirement: Annotated feature display
The system SHALL display annotated genomic features when viewing less than 1 Mbp of sequence, subject to the "Show Features (zoomed)" display toggle being enabled. CDS and gene features SHALL be rendered as white boxes, tRNAs green, rRNAs red, and misc_RNA blue. Features on the reverse strand SHALL be shifted downward below the LCB block area. Features on the forward strand SHALL be rendered above the LCB block area. Hovering over a feature SHALL show a tooltip with the locus_tag, gene name, product description, and coordinates. Clicking on a feature SHALL show a detail popup with full qualifier information and links to NCBI Protein (if protein_id is present) and NCBI Gene (if db_xref contains a GeneID). All user-provided text in tooltips SHALL be escaped via escapeHtml to prevent XSS. All identifiers in NCBI URLs SHALL be encoded via encodeURIComponent. Contig boundaries SHALL be rendered as vertical red lines (#b50707) at contig junctions, subject to the "Show Contigs" display toggle being enabled. When the "Show Contigs" toggle is disabled, contig lines SHALL not be rendered regardless of zoom level.

#### Scenario: Zoom in to show features
- **WHEN** user zooms in to view less than 1 Mbp of sequence from a GenBank-annotated genome and the "Show Features" toggle is enabled
- **THEN** system displays annotated features as color-coded rectangles (CDS/gene=white, tRNA=green, rRNA=red, misc_RNA=blue), with reverse-strand features shifted downward

#### Scenario: Hover over a feature
- **WHEN** user hovers over an annotated feature
- **THEN** system shows a tooltip displaying the locus_tag, gene name, product description, feature type, and coordinates

#### Scenario: Click on a feature
- **WHEN** user clicks on an annotated feature
- **THEN** system shows a detail popup with full qualifier information, an NCBI Protein link (if protein_id qualifier exists), and an NCBI Gene link (if db_xref contains GeneID)

#### Scenario: Detail popup closes on outside click
- **WHEN** user clicks outside the detail popup
- **THEN** system closes the detail popup

#### Scenario: Display contig boundaries
- **WHEN** a genome has contig boundaries from a multi-record GenBank file and the "Show Contigs" toggle is enabled
- **THEN** system renders vertical red lines (#b50707) at each contig junction position, visible at all zoom levels

#### Scenario: Features hidden when zoomed out
- **WHEN** user is viewing 1 Mbp or more of sequence
- **THEN** system does not display annotated feature rectangles (contig boundaries remain visible if the "Show Contigs" toggle is enabled)

#### Scenario: XSS protection in tooltips
- **WHEN** a feature qualifier contains HTML special characters
- **THEN** system escapes all text via escapeHtml before inserting into tooltip HTML

#### Scenario: Safe NCBI links
- **WHEN** a feature has a protein_id or GeneID used in NCBI links
- **THEN** system encodes the identifier via encodeURIComponent in the URL

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

### Requirement: Printing and image export
The system SHALL support printing the current view via Ctrl+P using the browser's native print dialog with a print-optimized stylesheet that isolates the alignment SVG in landscape orientation. The print stylesheet SHALL hide all non-alignment content and scale the SVG to fit the page width. The system SHALL support exporting the current view as a raster image via Ctrl+E, which opens a modal dialog with format selection (PNG or JPEG), JPEG quality presets (low at 0.5, medium at 0.75, high at 0.95), and configurable width and height (100–10000 px). The export SHALL clone the SVG, inline computed styles, render to a Canvas element, and trigger a file download. The dialog SHALL be dismissable via Cancel button, backdrop click, or Escape key.

#### Scenario: Export as PNG
- **WHEN** user presses Ctrl+E, selects PNG format, sets custom dimensions, and clicks Export
- **THEN** system renders the current alignment view to a PNG file and triggers a download of `alignment.png`

#### Scenario: Export as JPEG with quality presets
- **WHEN** user presses Ctrl+E, selects JPEG format, chooses a quality level (low/medium/high), and clicks Export
- **THEN** system renders the current alignment view to a JPEG file at the selected quality and triggers a download of `alignment.jpeg`

#### Scenario: Print alignment
- **WHEN** user presses Ctrl+P
- **THEN** system clones the alignment SVG into a print-isolation wrapper, applies a landscape print stylesheet, invokes the browser print dialog, and removes the wrapper after the dialog closes

#### Scenario: Cancel export dialog
- **WHEN** user presses Escape, clicks Cancel, or clicks the backdrop in the export dialog
- **THEN** system closes the dialog without exporting

### Requirement: Drag-and-drop file loading
The system SHALL accept alignment files dropped onto a drop zone or selected via a file picker dialog. The system SHALL reject files larger than 500 MB.

#### Scenario: Drop alignment file
- **WHEN** user drags an XMFA alignment file onto the drop zone
- **THEN** system loads and displays the alignment

#### Scenario: Select alignment file via picker
- **WHEN** user clicks the drop zone and selects an XMFA file from the file picker
- **THEN** system loads and displays the alignment

#### Scenario: Reject oversized file
- **WHEN** user provides a file larger than 500 MB
- **THEN** system displays an error message without attempting to parse

#### Scenario: Display parse error
- **WHEN** user provides a malformed XMFA file
- **THEN** system displays a descriptive error message without exposing internal paths or stack traces

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

### Requirement: LCB hover highlighting
The system SHALL highlight all homologous LCB blocks and their connecting trapezoid lines when the user hovers over any LCB region. Highlighted LCB blocks SHALL have increased stroke width (2.5px), darker stroke (#222), and increased fill opacity (0.85). Highlighted connecting lines SHALL have increased fill opacity (0.45) and stroke width (1.5px). When the mouse leaves the LCB region, all blocks and connectors SHALL return to their default appearance (1px stroke, 0.6 fill opacity for blocks; 0.5px stroke, 0.2 fill opacity for connectors).

#### Scenario: Highlight LCB on hover
- **WHEN** user hovers over an LCB block in any genome panel
- **THEN** system highlights all blocks with the same LCB index across all genome panels and their connecting trapezoid lines with increased opacity and stroke

#### Scenario: Clear highlight on mouse leave
- **WHEN** user moves the mouse away from the LCB region
- **THEN** system returns all LCB blocks and connectors to their default appearance

### Requirement: ViewerHandle lifecycle API
The `renderAlignment` function SHALL return a `ViewerHandle` object providing lifecycle management for the viewer. The function SHALL accept an optional `initialDisplayMode` parameter of type `DisplayMode` to set the initial display mode. The `ViewerHandle` SHALL expose: a `destroy()` method that removes all event listeners and cleans up zoom, cursor, toolbar, track controls, options panel, color scheme menu, shortcuts help, region selection, annotations, feature tooltip, image export, print support, and sequence navigator behaviors; a `getState()` method returning the current immutable `ViewerState`; the `svg` element reference; the `zoomHandle` for programmatic zoom/pan control (with `zoomIn()`, `zoomOut()`, `panLeft()`, `panRight()`, `reset()` methods); the `cursorHandle` for cursor behavior management; the `toolbarHandle` for navigation toolbar lifecycle management; the `trackControlsHandle` for track controls sidebar lifecycle management; the `optionsPanelHandle` for options panel lifecycle management; the `colorSchemeMenuHandle` for color scheme menu lifecycle management; the `regionSelectionHandle` for region selection lifecycle management; and the `annotationsHandle` for annotation rendering lifecycle management (if annotations are provided). The `renderAlignment` function SHALL accept an optional `AnnotationMap` parameter. On file reload, the caller SHALL call `destroy()` on the previous handle before creating a new viewer.

#### Scenario: Obtain viewer handle
- **WHEN** `renderAlignment` is called with a container element and alignment data
- **THEN** it returns a `ViewerHandle` with `svg`, `zoomHandle`, `cursorHandle`, `toolbarHandle`, `trackControlsHandle`, `optionsPanelHandle`, `colorSchemeMenuHandle`, `regionSelectionHandle`, `annotationsHandle`, `getState()`, and `destroy()` members

#### Scenario: Destroy viewer on reload
- **WHEN** a new alignment file is loaded while a viewer is already active
- **THEN** the caller invokes `destroy()` on the existing `ViewerHandle` before rendering the new alignment, removing all event listeners, D3 behaviors, toolbar elements, track controls, options panel, color scheme menu, shortcuts help, region selection, annotations, feature tooltips, image export shortcut, print support, and sequence navigator

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

### Requirement: Homologous position mapping
The system SHALL map positions across genomes using LCB-relative fractional offset. For a given nucleotide position within a source genome's LCB, the system SHALL compute the fractional position within that LCB (accounting for reverse-complement strand), then map it to the corresponding fractional position in each target genome's LCB region. The mapping SHALL return an array of `HomologousPosition` objects containing the genome index, mapped position, and LCB identifier.

#### Scenario: Map position to homologous sites
- **WHEN** a position within an LCB is queried for homologous positions
- **THEN** the system returns the mapped positions in all genomes that participate in that LCB, computed via fractional offset within the LCB region

#### Scenario: No homologous position outside LCB
- **WHEN** a position that is not within any LCB is queried
- **THEN** the system returns an empty array of homologous positions

### Requirement: Navigation toolbar
The system SHALL display a navigation toolbar in a controls bar above the alignment SVG. The controls bar SHALL arrange its children in the following order: shortcuts help button, navigation toolbar, color scheme menu, and options panel, displayed on a single horizontal line using flexbox layout. The toolbar SHALL contain five buttons: Reset, Pan Left, Zoom In, Zoom Out, and Pan Right. Each button SHALL invoke the corresponding `ZoomHandle` method (`reset()`, `panLeft()`, `zoomIn()`, `zoomOut()`, `panRight()`). The toolbar SHALL use a `<div>` with `role="toolbar"` and `aria-label="Navigation controls"`. Each button SHALL have a descriptive `aria-label` attribute and a `title` tooltip that includes the keyboard shortcut hint (e.g., "Zoom in (Ctrl+Up)"). The controls bar SHALL be inserted as the first child of the viewer container element. The toolbar SHALL be removed from the DOM when `destroy()` is called on the `NavigationToolbarHandle`. When multiple display modes are available, the toolbar SHALL include a display mode selector dropdown: a `<select>` element with class `display-mode-selector`, `aria-label="Display mode"`, and `title="Display mode"`. The dropdown SHALL only be rendered when more than one display mode is available. Options SHALL use labels: "LCB Display" for `lcb`, "Ungapped Matches" for `ungapped-match`, "Similarity Profile" for `similarity-profile`. Selecting a mode SHALL invoke `onDisplayModeChange` on `NavigationCallbacks` with type-safe validation via `isDisplayMode()`.

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

### Requirement: Options panel
The system SHALL display an Options Panel in a controls bar above the alignment SVG. The Options Panel SHALL contain a toggle button labeled "Options" with `aria-label="Toggle options panel"`. Clicking the toggle button SHALL show or hide a dropdown containing four checkboxes: "Show Genome ID", "LCB Connecting Lines", "Show Features (zoomed)", and "Show Contigs". All checkboxes SHALL default to checked (enabled). When `onExportImage` or `onPrint` callbacks are provided, the dropdown SHALL include a horizontal rule separator followed by action buttons: an "Export Image (Ctrl+E)" button (if `onExportImage` is provided) and a "Print (Ctrl+P)" button (if `onPrint` is provided). Clicking an action button SHALL close the dropdown and invoke the corresponding callback. Clicking outside the panel SHALL close the dropdown. The controls bar SHALL arrange its children in the following order: shortcuts help button, navigation toolbar, color scheme menu, and options panel, displayed on a single horizontal line using flexbox layout.

#### Scenario: Display options panel
- **WHEN** `renderAlignment` is called with a container element and alignment data
- **THEN** system inserts a controls bar above the SVG containing an "Options" toggle button alongside the shortcuts help button, navigation toolbar, and color scheme menu

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

### Requirement: Genome ID display toggle
The system SHALL toggle genome labels between the full filename (e.g. "genome1.fasta") and the name without extension (e.g. "genome1") when the "Show Genome ID" checkbox is toggled. The `getGenomeLabel(name, showGenomeId)` function SHALL return the full name when `showGenomeId` is true, and the name with the last file extension stripped when `showGenomeId` is false. If the name has no extension (no dot, or dot at position 0), the full name SHALL be returned unchanged. Label updates SHALL be applied in-place to all visible genome panel labels without re-rendering the entire view.

#### Scenario: Show full genome ID
- **WHEN** user enables the "Show Genome ID" checkbox
- **THEN** genome labels display the full filename (e.g. "genome1.fasta")

#### Scenario: Show genome name without extension
- **WHEN** user disables the "Show Genome ID" checkbox
- **THEN** genome labels display the filename with the last extension removed (e.g. "genome1")

#### Scenario: Name without extension for dotless filename
- **WHEN** `getGenomeLabel` is called with a name that has no dot or a dot only at position 0
- **THEN** the full name is returned unchanged

### Requirement: LCB connecting lines toggle
The system SHALL show or hide LCB connecting line trapezoids between adjacent genome panels when the "LCB Connecting Lines" checkbox is toggled. When disabled, all `.lcb-lines` SVG groups SHALL be removed. When re-enabled, connecting lines SHALL be re-rendered and updated to the current zoom state. During zoom/pan updates, connecting lines SHALL only be updated if the toggle is enabled.

#### Scenario: Hide connecting lines
- **WHEN** user disables the "LCB Connecting Lines" checkbox
- **THEN** all connecting line trapezoids between genome panels are removed

#### Scenario: Show connecting lines
- **WHEN** user enables the "LCB Connecting Lines" checkbox after disabling it
- **THEN** connecting line trapezoids are re-rendered between adjacent visible genome panels at the current zoom level

#### Scenario: Zoom update respects connecting lines toggle
- **WHEN** user zooms or pans while connecting lines are disabled
- **THEN** connecting line positions are not updated (no wasted rendering)

### Requirement: Feature annotations display toggle
The system SHALL show or hide annotated feature rectangles when the "Show Features (zoomed)" checkbox is toggled. The toggle SHALL be independent of the zoom-level threshold — when disabled, features SHALL not render regardless of zoom level. When enabled, the normal zoom threshold (<1 Mbp) continues to apply. The `AnnotationsHandle.update()` method SHALL accept an optional `AnnotationDisplayOptions` parameter with `showFeatures` and `showContigs` boolean flags.

#### Scenario: Hide features
- **WHEN** user disables the "Show Features (zoomed)" checkbox
- **THEN** annotated feature rectangles are not rendered, even when zoomed below 1 Mbp

#### Scenario: Show features
- **WHEN** user enables the "Show Features (zoomed)" checkbox while zoomed below 1 Mbp
- **THEN** annotated feature rectangles are rendered normally

#### Scenario: Feature toggle combined with zoom threshold
- **WHEN** the "Show Features" checkbox is enabled but user is viewing ≥1 Mbp
- **THEN** features remain hidden per the existing zoom threshold rule

### Requirement: Contig boundaries display toggle
The system SHALL show or hide contig boundary vertical lines when the "Show Contigs" checkbox is toggled. When disabled, contig boundary lines SHALL not be rendered. When re-enabled, contig boundaries SHALL be re-rendered at their positions.

#### Scenario: Hide contigs
- **WHEN** user disables the "Show Contigs" checkbox
- **THEN** contig boundary vertical lines are not rendered

#### Scenario: Show contigs
- **WHEN** user enables the "Show Contigs" checkbox after disabling it
- **THEN** contig boundary vertical lines are re-rendered at their positions

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

### Requirement: Keyboard shortcuts help panel
The system SHALL display a keyboard shortcuts help panel in the controls bar above the alignment SVG. The help panel SHALL consist of a circular "?" button (`aria-label="Keyboard shortcuts"`, `title="Keyboard shortcuts (?)"`) and a toggleable floating box listing all keyboard shortcuts. The shortcuts list SHALL be rendered as a definition list (`<dl>`) with each shortcut showing key bindings in `<kbd>` elements and a description. The listed shortcuts SHALL include: Ctrl+Up (Zoom in), Ctrl+Down (Zoom out), Ctrl+Left (Pan left), Ctrl+Right (Pan right), Ctrl+Shift+Left/Right (Pan faster), Ctrl+E (Export image), Ctrl+P (Print), Ctrl+I (Sequence navigator), Escape (Close dialog / clear selection), and ? (Toggle this help). Pressing the "?" key (without Ctrl, Alt, or Meta modifiers) SHALL toggle the help box visibility. The "?" keydown handler SHALL be ignored when the active element is an INPUT, TEXTAREA, or SELECT to avoid interfering with form input. Clicking outside the shortcuts help wrapper SHALL close the help box. The `ShortcutsHelpHandle.destroy()` method SHALL remove the keydown and click event listeners and remove the wrapper element from the DOM. The shortcuts help button SHALL be the first element appended to the controls bar.

**Module**: `src/viewer/shortcuts-help.ts`

#### Scenario: Display shortcuts help button
- **WHEN** `renderAlignment` is called with a container element and alignment data
- **THEN** the controls bar contains a circular "?" button with `aria-label="Keyboard shortcuts"` as its first element

#### Scenario: Toggle help panel via button click
- **WHEN** user clicks the "?" button
- **THEN** system toggles the visibility of the shortcuts help box listing all keyboard shortcuts

#### Scenario: Toggle help panel via "?" key
- **WHEN** user presses the "?" key without Ctrl, Alt, or Meta modifiers and focus is not on a form element
- **THEN** system toggles the visibility of the shortcuts help box

#### Scenario: "?" key ignored in form elements
- **WHEN** user presses the "?" key while focus is on an INPUT, TEXTAREA, or SELECT element
- **THEN** system does not toggle the shortcuts help box

#### Scenario: Close help panel on outside click
- **WHEN** the shortcuts help box is visible and user clicks outside the shortcuts help wrapper
- **THEN** system closes the shortcuts help box

#### Scenario: Shortcuts help cleanup on destroy
- **WHEN** `destroy()` is called on the `ShortcutsHelpHandle`
- **THEN** system removes the keydown and click document event listeners and removes the wrapper element from the DOM

