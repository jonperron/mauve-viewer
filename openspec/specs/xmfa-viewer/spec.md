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
The system SHALL support zooming (Ctrl+Up/Down, magnifying glass toolbar buttons, mouse zoom mode) and scrolling (Ctrl+Left/Right, arrow toolbar buttons) with accelerated scrolling via Shift modifier.

#### Scenario: Zoom in via keyboard
- **WHEN** user presses Ctrl+Up
- **THEN** system zooms in 2× centered on the current view

#### Scenario: Scroll with acceleration
- **WHEN** user presses Shift+Ctrl+Right
- **THEN** system scrolls right by 20% of the visible range

### Requirement: Mouse-based interaction
The system SHALL highlight homologous sites across all genomes when the mouse moves over the similarity plot. Clicking aligns positionally homologous sites. Shift+click+drag selects a region.

#### Scenario: Highlight homologous sites on hover
- **WHEN** user moves the mouse over a position in one genome's similarity plot
- **THEN** system draws a black vertical bar at the corresponding homologous position in all genome panels

#### Scenario: Align homologous sites on click
- **WHEN** user clicks on the similarity plot
- **THEN** system centers all genome panels on the positionally homologous sites

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

