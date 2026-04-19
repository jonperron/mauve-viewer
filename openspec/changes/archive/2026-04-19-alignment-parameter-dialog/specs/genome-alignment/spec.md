## ADDED Requirements

### Requirement: Alignment parameter dialog
The system SHALL provide a modal dialog for configuring genome alignment parameters. The dialog SHALL be implemented as a native HTML `<dialog>` element opened via `showModal()`. It SHALL accept pre-loaded sequences and an `onConfirm` callback, and return a handle with `element` and `destroy()` for lifecycle control.

#### Scenario: Open alignment dialog
- **WHEN** the user triggers the alignment action
- **THEN** the system SHALL display a modal dialog titled "Align Sequences" with fields for algorithm selection, parameters, and sequence input

#### Scenario: Close dialog via Cancel button
- **WHEN** the user clicks the Cancel button
- **THEN** the dialog SHALL close and be removed from the DOM without invoking the confirm callback

#### Scenario: Close dialog via backdrop click
- **WHEN** the user clicks the dialog backdrop (outside the dialog content)
- **THEN** the dialog SHALL close and be removed from the DOM without invoking the confirm callback

#### Scenario: Close dialog via Escape key
- **WHEN** the user presses Escape while the dialog is open
- **THEN** the dialog SHALL close and be removed from the DOM without invoking the confirm callback

#### Scenario: Destroy dialog programmatically
- **WHEN** the caller invokes `destroy()` on the dialog handle
- **THEN** the dialog SHALL close (if open) and be removed from the DOM

### Requirement: Algorithm selection in dialog
The dialog SHALL provide a select control for choosing the alignment algorithm. The options SHALL be `progressiveMauve` (default) and `mauveAligner`. Selecting an algorithm SHALL show only the parameter fieldset relevant to that algorithm.

#### Scenario: Select mauveAligner algorithm
- **WHEN** the user selects "mauveAligner" from the algorithm dropdown
- **THEN** the dialog SHALL show the mauveAligner options (Extend LCBs) and hide the progressiveMauve options

#### Scenario: Select progressiveMauve algorithm
- **WHEN** the user selects "progressiveMauve" from the algorithm dropdown
- **THEN** the dialog SHALL show the progressiveMauve options (seed families, iterative refinement, sum-of-pairs scoring) and hide the mauveAligner options

### Requirement: Shared alignment parameter controls
The dialog SHALL provide controls for shared alignment parameters: seed weight mode (auto checkbox and numeric input, range 3–21), minimum LCB weight (text input accepting "default" or a positive integer), collinear genomes toggle (checkbox, unchecked by default), and full alignment toggle (checkbox, checked by default).

#### Scenario: Toggle custom seed weight
- **WHEN** the user unchecks "Default seed weight"
- **THEN** the dialog SHALL reveal a numeric input for seed weight with min 3, max 21

#### Scenario: Keep default seed weight
- **WHEN** the user leaves "Default seed weight" checked
- **THEN** the dialog SHALL hide the seed weight input and use `auto` in the result

#### Scenario: Set custom min LCB weight
- **WHEN** the user enters a numeric value in the min LCB weight field
- **THEN** the result params SHALL include the parsed integer as `minLcbWeight`

#### Scenario: Leave default min LCB weight
- **WHEN** the user leaves the min LCB weight field as "default" or empty
- **THEN** the result params SHALL omit `minLcbWeight` (undefined)

### Requirement: Algorithm-specific parameter controls
The dialog SHALL provide algorithm-specific checkboxes. For mauveAligner: "Extend LCBs" (checked by default). For progressiveMauve: "Use seed families" (unchecked by default), "Iterative refinement" (checked by default), "Sum-of-pairs LCB scoring" (checked by default).

#### Scenario: Configure mauveAligner options
- **WHEN** the user selects mauveAligner and modifies the "Extend LCBs" checkbox
- **THEN** the result params SHALL reflect the checkbox state in `extendLcbs`

#### Scenario: Configure progressiveMauve options
- **WHEN** the user selects progressiveMauve and modifies seed families, iterative refinement, or sum-of-pairs checkboxes
- **THEN** the result params SHALL reflect each checkbox state in `seedFamilies`, `iterativeRefinement`, and `sumOfPairsScoring`

### Requirement: Sequence input management
The dialog SHALL display pre-loaded sequences in a list showing name, format selector, and a remove button for each. Users SHALL be able to add sequences via drag-and-drop or file browser (click on drop zone). Supported file extensions SHALL be detected to set format: `.gbk`/`.gb`/`.genbank` → genbank, `.embl` → embl, `.fasta`/`.fa`/`.fna`/`.fas` → fasta; unknown extensions default to fasta. Each sequence's format SHALL be individually overridable via a select control.

#### Scenario: Display pre-loaded sequences
- **WHEN** the dialog opens with pre-loaded sequences
- **THEN** each sequence SHALL appear in the list with its name, detected format, and a remove button

#### Scenario: Add sequences via drag-and-drop
- **WHEN** the user drops files onto the drop zone
- **THEN** the dialog SHALL read each file, detect its format from extension, and add it to the sequence list

#### Scenario: Add sequences via file browser
- **WHEN** the user clicks the drop zone and selects files
- **THEN** the dialog SHALL read each file, detect its format from extension, and add it to the sequence list

#### Scenario: Remove a sequence
- **WHEN** the user clicks the remove button on a sequence
- **THEN** the sequence SHALL be removed from the list and the count updated

#### Scenario: Override sequence format
- **WHEN** the user changes the format selector for a sequence
- **THEN** the sequence's format SHALL be updated in the internal state

#### Scenario: Detect GenBank format from extension
- **WHEN** a file named "genome.gbk" is added
- **THEN** the format SHALL be set to "genbank"

### Requirement: Submit validation
The dialog submit button SHALL be disabled when fewer than 2 sequences are loaded. Clicking submit with 2 or more sequences SHALL invoke the `onConfirm` callback with an `AlignmentDialogResult` containing the configured sequences and parameters, then close the dialog.

#### Scenario: Submit disabled with fewer than 2 sequences
- **WHEN** fewer than 2 sequences are loaded
- **THEN** the Align button SHALL be disabled

#### Scenario: Submit enabled with 2+ sequences
- **WHEN** 2 or more sequences are loaded
- **THEN** the Align button SHALL be enabled

#### Scenario: Confirm alignment
- **WHEN** the user clicks Align with 2+ sequences loaded
- **THEN** the dialog SHALL invoke `onConfirm` with the structured result and close
