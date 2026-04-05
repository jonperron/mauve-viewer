## MODIFIED Requirements

### Requirement: Annotated feature display
The system SHALL display annotated genomic features when viewing less than 1 Mbp of sequence. CDS and gene features SHALL be rendered as white boxes, tRNAs green, rRNAs red, and misc_RNA blue. Features on the reverse strand SHALL be shifted downward below the LCB block area. Features on the forward strand SHALL be rendered above the LCB block area. Hovering over a feature SHALL show a tooltip with the locus_tag, gene name, product description, and coordinates. Clicking on a feature SHALL show a detail popup with full qualifier information and links to NCBI Protein (if protein_id is present) and NCBI Gene (if db_xref contains a GeneID). All user-provided text in tooltips SHALL be escaped via escapeHtml to prevent XSS. All identifiers in NCBI URLs SHALL be encoded via encodeURIComponent. Contig boundaries SHALL be rendered as vertical red lines (#b50707) at contig junctions, visible at all zoom levels.

#### Scenario: Zoom in to show features
- **WHEN** user zooms in to view less than 1 Mbp of sequence from a GenBank-annotated genome
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
- **WHEN** a genome has contig boundaries from a multi-record GenBank file
- **THEN** system renders vertical red lines (#b50707) at each contig junction position, visible at all zoom levels

#### Scenario: Features hidden when zoomed out
- **WHEN** user is viewing 1 Mbp or more of sequence
- **THEN** system does not display annotated feature rectangles (contig boundaries remain visible)

#### Scenario: XSS protection in tooltips
- **WHEN** a feature qualifier contains HTML special characters
- **THEN** system escapes all text via escapeHtml before inserting into tooltip HTML

#### Scenario: Safe NCBI links
- **WHEN** a feature has a protein_id or GeneID used in NCBI links
- **THEN** system encodes the identifier via encodeURIComponent in the URL

### Requirement: ViewerHandle lifecycle API
The `renderAlignment` function SHALL return a `ViewerHandle` object providing lifecycle management for the viewer. The `ViewerHandle` SHALL expose: a `destroy()` method that removes all event listeners and cleans up zoom, cursor, toolbar, track controls, annotations, and feature tooltip behaviors; a `getState()` method returning the current immutable `ViewerState`; the `svg` element reference; the `zoomHandle` for programmatic zoom/pan control (with `zoomIn()`, `zoomOut()`, `panLeft()`, `panRight()`, `reset()` methods); the `cursorHandle` for cursor behavior management; the `toolbarHandle` for navigation toolbar lifecycle management; the `trackControlsHandle` for track controls sidebar lifecycle management; and the `annotationsHandle` for annotation rendering lifecycle management (if annotations are provided). The `renderAlignment` function SHALL accept an optional `AnnotationMap` parameter. On file reload, the caller SHALL call `destroy()` on the previous handle before creating a new viewer.

#### Scenario: Obtain viewer handle
- **WHEN** `renderAlignment` is called with a container element and alignment data
- **THEN** it returns a `ViewerHandle` with `svg`, `zoomHandle`, `cursorHandle`, `toolbarHandle`, `trackControlsHandle`, `annotationsHandle`, `getState()`, and `destroy()` members

#### Scenario: Destroy viewer on reload
- **WHEN** a new alignment file is loaded while a viewer is already active
- **THEN** the caller invokes `destroy()` on the existing `ViewerHandle` before rendering the new alignment, removing all event listeners, D3 behaviors, toolbar elements, track controls, annotations, and feature tooltips

#### Scenario: Access current state
- **WHEN** `getState()` is called on the `ViewerHandle`
- **THEN** it returns the current immutable `ViewerState` including the alignment data, configuration, zoom transform, genome order, reference genome index, hidden genomes set, and computed scales

#### Scenario: Render alignment with annotations
- **WHEN** `renderAlignment` is called with an `AnnotationMap` parameter
- **THEN** system sets up annotation rendering and feature tooltips, updating annotations on zoom/pan changes

#### Scenario: Annotations update on zoom
- **WHEN** the zoom transform changes and annotations are present
- **THEN** system updates annotation feature positions and visibility based on the new zoom level
