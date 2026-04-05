## ADDED Requirements

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

## MODIFIED Requirements

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
