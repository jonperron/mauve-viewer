# region-selection Delta Spec

## MODIFIED Requirements

### Requirement: Region selection via Shift+click+drag
The system SHALL allow the user to select a genomic region by holding Shift and clicking+dragging on any visible genome panel. During the drag, the system SHALL render a highlighted rectangle (light blue fill with blue border) on the source panel. On drag completion (minimum 5px drag distance), the system SHALL compute the selected genomic coordinates using `pixelToPosition` and render persistent selection highlights on the source panel (solid border) and corresponding visual-range highlights (dashed border) on all other visible panels. The highlights SHALL remain visible until the user explicitly clears them. An optional `RegionSelectCallback` MAY be invoked with the selection data on completion if provided to `setupRegionSelection`. Shift+clicking (drag distance < 5px) while a selection is active SHALL clear the current selection and remove all highlight rectangles. Pressing the Escape key while a region is selected SHALL clear the selection.

#### Scenario: Select region by Shift+drag creates persistent highlight
- **WHEN** user holds Shift and clicks+drags across a genome panel for more than 5 pixels
- **THEN** system renders a persistent highlighted rectangle on the source panel and matching dashed highlights on all other visible panels; highlights remain visible until explicitly cleared

#### Scenario: Shift+click clears selection
- **WHEN** user holds Shift and clicks on a genome panel with drag distance less than 5 pixels while a selection is active
- **THEN** system clears the current selection and removes all highlight rectangles

#### Scenario: Reject accidental selection with no prior selection
- **WHEN** user Shift+drags less than 5 pixels on a genome panel with no active selection
- **THEN** system does not create a selection and clears any drag preview

#### Scenario: Selection updates on zoom
- **WHEN** the zoom transform changes while a region is selected
- **THEN** system re-renders selection highlights at the updated pixel positions

#### Scenario: Clear selection via programmatic call
- **WHEN** `clearSelection()` is called on the `RegionSelectionHandle`
- **THEN** system removes all selection highlight rectangles

#### Scenario: Clear selection via Escape key
- **WHEN** user presses Escape while a region is selected
- **THEN** system clears the selection and removes all selection highlight rectangles

#### Scenario: No auto-zoom on selection
- **WHEN** user completes a Shift+drag region selection in the default viewer
- **THEN** the viewer does NOT automatically zoom to the selected region; the current zoom transform is unchanged

## ADDED Requirements

### Requirement: Default viewer does not wire onSelect callback
In the default `alignment-viewer.ts` setup, `setupRegionSelection` SHALL be called without an `onSelect` callback. The selection is purely visual (persistent highlight). Callers MAY provide their own `onSelect` callback for custom behavior.

#### Scenario: Default viewer setup
- **WHEN** the alignment viewer initializes region selection
- **THEN** `setupRegionSelection` is called without an `onSelect` callback and selection highlights are persistent with no side effects
