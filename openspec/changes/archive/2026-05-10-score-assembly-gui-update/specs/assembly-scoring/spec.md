## MODIFIED Requirements

### Requirement: Assembly quality scoring
The system SHALL evaluate the quality of a genome assembly by comparing it to a reference genome and computing structural, sequence, and annotation metrics client-side from the currently loaded alignment.

#### Scenario: Score assembly via GUI
- **WHEN** the user opens the Analysis dropdown menu with exactly 2 genomes loaded and clicks "Score Assembly"
- **THEN** the system computes all assembly quality metrics client-side (`computeStructuralMetrics`, `computeSequenceMetrics`, `computeContigStats`, `computeCdsQualityMetrics`, `computeContentMetrics`) and displays the results in a `createScoringReport` modal dialog with Structural, Sequence, Contigs, CDS, and Content tabs

#### Scenario: Score assembly via CLI
- **WHEN** user runs `java -cp Mauve.jar org.gel.mauve.assembly.ScoreAssembly --ref <ref> --draft <draft> --output <dir>`
- **THEN** system aligns, computes metrics, and writes results to the output directory
