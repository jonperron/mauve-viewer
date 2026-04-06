## MODIFIED Requirements

### Requirement: Image export
The system SHALL export the current alignment view as a raster image (PNG or JPEG with three quality levels: low at 0.5, medium at 0.75, high at 0.95) via Ctrl+E. The export dialog SHALL allow configuring output width and height between 100 and 10000 pixels. The system SHALL clone the SVG, inline computed CSS styles for export accuracy, render to a Canvas element, and trigger a browser file download. JPEG export SHALL use a white background fill. The dialog SHALL be a modal with backdrop, dismissable via Cancel button, backdrop click, or Escape key.

#### Scenario: Export alignment as JPEG
- **WHEN** user presses Ctrl+E, selects JPEG format, chooses high quality, sets dimensions, and clicks Export
- **THEN** system renders the alignment view to a JPEG file at the specified dimensions and 0.95 quality, and triggers a download of `alignment.jpeg`

#### Scenario: Export alignment as PNG
- **WHEN** user presses Ctrl+E, selects PNG format, sets dimensions, and clicks Export
- **THEN** system renders the alignment view to a PNG file at the specified dimensions and triggers a download of `alignment.png`

#### Scenario: Dismiss export dialog
- **WHEN** user presses Escape, clicks Cancel, or clicks the backdrop
- **THEN** system closes the export dialog without exporting

#### Scenario: JPEG quality presets
- **WHEN** user selects JPEG format in the export dialog
- **THEN** system shows a quality dropdown with Low (0.5), Medium (0.75), and High (0.95) options
