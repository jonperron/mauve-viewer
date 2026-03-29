## MODIFIED Requirements

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
