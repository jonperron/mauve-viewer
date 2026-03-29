## Purpose

Defines how Mauve aligns two or more genome sequences using the mauveAligner (original) and progressiveMauve algorithms, including alignment execution, parameter tuning, and LCB weight-based filtering.

## Requirements

### Requirement: Multiple genome alignment with mauveAligner
The system SHALL align two or more genome sequences using the original mauveAligner algorithm, which uses anchored alignment with seed-and-extend multi-genome unique match detection, greedy breakpoint elimination for LCB selection, and ClustalW or MUSCLE for gapped global alignment within each LCB.

#### Scenario: Align two closely related bacterial genomes
- **WHEN** user provides two genome sequences (e.g., E. coli and Salmonella) and selects "Align sequences" from the File menu
- **THEN** system launches the native mauveAligner binary, produces an XMFA alignment file, and loads the result into the viewer

#### Scenario: Align with custom seed weight
- **WHEN** user sets a custom match seed weight in the alignment dialog
- **THEN** system uses the specified seed weight for anchor detection instead of the auto-calculated default

#### Scenario: Align with custom LCB weight
- **WHEN** user sets a minimum LCB weight in the alignment dialog
- **THEN** system applies greedy breakpoint elimination using the specified weight threshold to filter spurious rearrangements

#### Scenario: Align collinear genomes
- **WHEN** user selects "Assume collinear genomes" in the alignment dialog
- **THEN** system skips rearrangement detection and aligns genomes as a single collinear block

#### Scenario: Align without full alignment
- **WHEN** user deselects the "Full alignment" option
- **THEN** system identifies LCBs but does not perform recursive anchor search or gapped alignment

### Requirement: Progressive multiple genome alignment with progressiveMauve
The system SHALL align two or more genome sequences using the progressiveMauve algorithm, which aligns regions conserved among any subset of the input genomes (pan-genome), uses three palindromic spaced seed patterns, computes a guide tree from pairwise genome content distances, applies adaptive breakpoint penalties, and rejects forced alignment of unrelated sequence via an HMM.

#### Scenario: Align divergent genomes
- **WHEN** user provides genomes with as little as 50% nucleotide identity and selects "Align with progressiveMauve" from the File menu
- **THEN** system produces an alignment that includes regions conserved among subsets of the input genomes

#### Scenario: Use seed families for improved sensitivity
- **WHEN** user enables "Use seed families" in the progressiveMauve alignment dialog
- **THEN** system uses three spaced seed patterns instead of one for match detection

#### Scenario: Apply iterative refinement
- **WHEN** user enables "Iterative Refinement"
- **THEN** system applies MUSCLE tree-independent iterative refinement to avoid biasing phylogenetic inference with a single guide tree

#### Scenario: Sum-of-pairs LCB scoring
- **WHEN** user leaves "Sum-of-pairs LCB scoring" enabled (default)
- **THEN** system applies breakpoint penalties among all pairs of extant sequences during LCB computation

### Requirement: Alignment execution as external process
The system SHALL launch native alignment binaries (mauveAligner, progressiveMauve) as external processes via `Runtime.getRuntime().exec()`, manage process I/O with dedicated threads, and report completion via `AlignmentProcessListener`.

#### Scenario: Launch alignment binary
- **WHEN** user clicks "Align" in the alignment dialog
- **THEN** system spawns the appropriate native binary as an external process and displays a console dialog showing progress

#### Scenario: Cancel running alignment
- **WHEN** user clicks "Cancel alignment" while an alignment is in progress
- **THEN** system kills the running native process and returns to the alignment dialog

### Requirement: Alignment parameter auto-tuning
The system SHALL auto-select alignment parameters appropriate for the genome sizes when "Default seed weight" is enabled. The default seed size is approximately 11 for 1MB genomes and 15 for 5MB genomes, scaling with genome size.

#### Scenario: Auto-select seed weight
- **WHEN** user leaves "Default seed weight" enabled
- **THEN** system calculates a seed weight appropriate for the lengths of the input sequences

### Requirement: LCB weight-based filtering
The system SHALL support dynamic filtering of LCBs by minimum weight via a slider control. Adjusting the slider applies greedy breakpoint elimination to remove LCBs below the threshold, updating the visualization in real time.

#### Scenario: Increase LCB weight threshold
- **WHEN** user moves the LCB weight slider to a higher value
- **THEN** system removes LCBs with weight below the threshold and updates the display to show only the remaining LCBs
