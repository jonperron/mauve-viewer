## MODIFIED Requirements

### Requirement: Region selection via Shift+click+drag
The system SHALL allow the user to select a genomic region by holding Shift and clicking+dragging on any visible genome panel. During the drag, the system SHALL render a highlighted rectangle (light blue fill with blue border) on the source panel. On drag completion (minimum 5px drag distance), the system SHALL compute the selected genomic coordinates using `pixelToPosition` and render selection highlights on the source panel and corresponding visual-range highlights (dashed border) on all other visible panels. The selection SHALL be represented as a `SelectedRegion` with `genomeIndex`, `start`, and `end` fields. An optional `RegionSelectCallback` SHALL be invoked with the selection data on completion. Pressing the Escape key while a region is selected SHALL clear the selection.

#### Scenario: Select region by Shift+drag
- **WHEN** user holds Shift and clicks+drags across a genome panel for more than 5 pixels
- **THEN** system renders a highlighted rectangle on the source panel and matching dashed highlights on all other visible panels, and invokes the selection callback with the selected region

#### Scenario: Reject accidental selection
- **WHEN** user Shift+drags less than 5 pixels on a genome panel
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
