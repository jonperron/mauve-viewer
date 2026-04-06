## MODIFIED Requirements

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

### Requirement: ViewerHandle lifecycle API
The `renderAlignment` function SHALL return a `ViewerHandle` object providing lifecycle management for the viewer. The `ViewerHandle` SHALL expose: a `destroy()` method that removes all event listeners and cleans up zoom, cursor, toolbar, track controls, options panel, color scheme menu, region selection, annotations, feature tooltip, image export, print support, and sequence navigator behaviors; a `getState()` method returning the current immutable `ViewerState`; the `svg` element reference; the `zoomHandle` for programmatic zoom/pan control (with `zoomIn()`, `zoomOut()`, `panLeft()`, `panRight()`, `reset()` methods); the `cursorHandle` for cursor behavior management; the `toolbarHandle` for navigation toolbar lifecycle management; the `trackControlsHandle` for track controls sidebar lifecycle management; the `optionsPanelHandle` for options panel lifecycle management; the `colorSchemeMenuHandle` for color scheme menu lifecycle management; the `regionSelectionHandle` for region selection lifecycle management; and the `annotationsHandle` for annotation rendering lifecycle management (if annotations are provided). The `renderAlignment` function SHALL accept an optional `AnnotationMap` parameter. On file reload, the caller SHALL call `destroy()` on the previous handle before creating a new viewer.

#### Scenario: Obtain viewer handle
- **WHEN** `renderAlignment` is called with a container element and alignment data
- **THEN** it returns a `ViewerHandle` with `svg`, `zoomHandle`, `cursorHandle`, `toolbarHandle`, `trackControlsHandle`, `optionsPanelHandle`, `colorSchemeMenuHandle`, `regionSelectionHandle`, `annotationsHandle`, `getState()`, and `destroy()` members

#### Scenario: Destroy viewer on reload
- **WHEN** a new alignment file is loaded while a viewer is already active
- **THEN** the caller invokes `destroy()` on the existing `ViewerHandle` before rendering the new alignment, removing all event listeners, D3 behaviors, toolbar elements, track controls, options panel, color scheme menu, region selection, annotations, feature tooltips, image export shortcut, print support, and sequence navigator

#### Scenario: Access current state
- **WHEN** `getState()` is called on the `ViewerHandle`
- **THEN** it returns the current immutable `ViewerState` including the alignment data, configuration, zoom transform, genome order, reference genome index, hidden genomes set, and computed scales

#### Scenario: Render alignment with annotations
- **WHEN** `renderAlignment` is called with an `AnnotationMap` parameter
- **THEN** system sets up annotation rendering, feature tooltips, and sequence navigator shortcut (Ctrl+I), updating annotations on zoom/pan changes

#### Scenario: Annotations update on zoom
- **WHEN** the zoom transform changes and annotations are present
- **THEN** system updates annotation feature positions and visibility based on the new zoom level
