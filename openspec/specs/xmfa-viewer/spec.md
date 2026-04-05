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
The system SHALL display annotated genomic features when viewing less than 1 Mbp of sequence. CDS features are white boxes, tRNAs green, rRNAs red, and misc_RNA blue. Hovering shows the /product qualifier; clicking shows full qualifier details and a link to NCBI Entrez.

#### Scenario: Zoom in to show features
- **WHEN** user zooms in to view less than 1 Mbp of sequence from a GenBank-annotated genome
- **THEN** system displays annotated features with color-coded boxes, with genes on the reverse strand shifted downward

#### Scenario: Click on a feature
- **WHEN** user clicks on an annotated feature
- **THEN** system shows a popup with full feature qualifiers and an NCBI Entrez link

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

### Requirement: Genome reordering and reference change
The system SHALL allow reordering the displayed genomes using up/down buttons to the left of each genome, and changing the reference genome using an "R" button.

#### Scenario: Move genome up
- **WHEN** user clicks the up arrow button next to a genome
- **THEN** system swaps that genome with the one above it in the display order

#### Scenario: Change reference genome
- **WHEN** user clicks the "R" button for a genome
- **THEN** system uses that genome as the reference for assigning forward/reverse orientation to LCB blocks

### Requirement: Hide genomes
The system SHALL allow hiding individual genomes from the display using a minus button at the left of each genome panel, simplifying the view for alignments with many genomes.

#### Scenario: Hide a genome
- **WHEN** user clicks the minus button for a genome
- **THEN** system removes that genome's panel from the visualization

### Requirement: Printing and image export
The system SHALL support printing the current view (Ctrl+P), page setup, print preview (Ctrl+Shift+P), and exporting the current view as a raster image (JPEG with 3 quality levels or PNG with custom dimensions) via File → Export Image (Ctrl+E). Print output uses 300 DPI for publication-quality vector graphics via PostScript/PDF.

#### Scenario: Export as PNG
- **WHEN** user selects File → Export Image and chooses PNG format with custom dimensions
- **THEN** system renders the current alignment view to a PNG file at the specified resolution

#### Scenario: Print to PDF
- **WHEN** user selects File → Print and chooses a PDF output option
- **THEN** system renders a publication-quality vector graphic of the alignment view

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
The system SHALL support three display modes depending on data type: ungapped match display (from .mauve files), LCB display with bounding boxes and connecting lines, and full XMFA display with similarity profiles.

#### Scenario: Display XMFA alignment
- **WHEN** user opens an XMFA alignment file
- **THEN** system displays the full alignment with similarity profiles, LCB outlines, and annotated features

#### Scenario: Display match-only alignment
- **WHEN** user opens a .mauve alignment file without full alignment
- **THEN** system displays ungapped local match regions between genomes

### Requirement: LCB hover highlighting
The system SHALL highlight all homologous LCB blocks and their connecting trapezoid lines when the user hovers over any LCB region. Highlighted LCB blocks SHALL have increased stroke width (2.5px), darker stroke (#222), and increased fill opacity (0.85). Highlighted connecting lines SHALL have increased fill opacity (0.45) and stroke width (1.5px). When the mouse leaves the LCB region, all blocks and connectors SHALL return to their default appearance (1px stroke, 0.6 fill opacity for blocks; 0.5px stroke, 0.2 fill opacity for connectors).

#### Scenario: Highlight LCB on hover
- **WHEN** user hovers over an LCB block in any genome panel
- **THEN** system highlights all blocks with the same LCB index across all genome panels and their connecting trapezoid lines with increased opacity and stroke

#### Scenario: Clear highlight on mouse leave
- **WHEN** user moves the mouse away from the LCB region
- **THEN** system returns all LCB blocks and connectors to their default appearance

### Requirement: ViewerHandle lifecycle API
The `renderAlignment` function SHALL return a `ViewerHandle` object providing lifecycle management for the viewer. The `ViewerHandle` SHALL expose: a `destroy()` method that removes all event listeners and cleans up zoom, cursor, and toolbar behaviors; a `getState()` method returning the current immutable `ViewerState`; the `svg` element reference; the `zoomHandle` for programmatic zoom/pan control (with `zoomIn()`, `zoomOut()`, `panLeft()`, `panRight()`, `reset()` methods); the `cursorHandle` for cursor behavior management; and the `toolbarHandle` for navigation toolbar lifecycle management. On file reload, the caller SHALL call `destroy()` on the previous handle before creating a new viewer.

#### Scenario: Obtain viewer handle
- **WHEN** `renderAlignment` is called with a container element and alignment data
- **THEN** it returns a `ViewerHandle` with `svg`, `zoomHandle`, `cursorHandle`, `toolbarHandle`, `getState()`, and `destroy()` members

#### Scenario: Destroy viewer on reload
- **WHEN** a new alignment file is loaded while a viewer is already active
- **THEN** the caller invokes `destroy()` on the existing `ViewerHandle` before rendering the new alignment, removing all event listeners, D3 behaviors, and toolbar elements

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

### Requirement: Navigation toolbar
The system SHALL display a navigation toolbar above the alignment SVG containing five buttons: Reset, Pan Left, Zoom In, Zoom Out, and Pan Right. Each button SHALL invoke the corresponding `ZoomHandle` method (`reset()`, `panLeft()`, `zoomIn()`, `zoomOut()`, `panRight()`). The toolbar SHALL use a `<div>` with `role="toolbar"` and `aria-label="Navigation controls"`. Each button SHALL have a descriptive `aria-label` attribute and a `title` tooltip that includes the keyboard shortcut hint (e.g., "Zoom in (Ctrl+Up)"). The toolbar SHALL be inserted as the first child of the viewer container element. The toolbar SHALL be removed from the DOM when `destroy()` is called on the `NavigationToolbarHandle`.

#### Scenario: Display navigation toolbar
- **WHEN** `renderAlignment` is called with a container element and alignment data
- **THEN** system inserts a navigation toolbar with Reset, Pan Left, Zoom In, Zoom Out, and Pan Right buttons above the SVG element

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

