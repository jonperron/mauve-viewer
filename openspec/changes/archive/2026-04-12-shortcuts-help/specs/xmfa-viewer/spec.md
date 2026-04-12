## ADDED Requirements

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

## MODIFIED Requirements

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
