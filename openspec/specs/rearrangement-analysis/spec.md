## Purpose

Defines genome rearrangement analysis capabilities: DCJ distance computation, extended DCJ permutation model, GRIMM analysis, recombination detection via WeakARG, backbone computation, and similarity index computation.

## Requirements

### Requirement: DCJ distance computation
The system SHALL compute Double Cut and Join (DCJ) distance between genome arrangements, along with breakpoint distance and Single Cut or Join (SCJ) distance.

#### Scenario: Compute DCJ distance via GUI
- **WHEN** user clicks the DCJ toolbar button with an alignment loaded
- **THEN** system computes DCJ, breakpoint, and SCJ distances and displays results

#### Scenario: Compute pairwise DCJ distances
- **WHEN** an alignment with multiple genomes is loaded
- **THEN** system can compute pairwise DCJ distances between any pair of genomes

### Requirement: Extended DCJ permutation model
The system SHALL support an extended DCJ analysis using a full permutation model with Block, Adjacency, Contig, Head/Tail endpoints, and FastAccessTable for efficient queries.

#### Scenario: Analyze block adjacencies
- **WHEN** DCJ analysis runs on a multi-genome alignment
- **THEN** system constructs the full adjacency graph and identifies block rearrangements

### Requirement: GRIMM analysis
The system SHALL support launching GRIMM rearrangement analysis from the toolbar when n-way LCB data is available.

#### Scenario: Run GRIMM analysis
- **WHEN** user clicks the GRIMM toolbar button with n-way LCB data computed
- **THEN** system performs GRIMM genome rearrangement analysis on the LCB permutations

### Requirement: Recombination detection via WeakARG
The system SHALL support loading and visualizing recombination analysis data via the WeakARG model (Ctrl+R).

#### Scenario: Load WeakARG data
- **WHEN** user presses Ctrl+R and provides WeakARG data
- **THEN** system loads the recombination data model and overlays recombination signals on the alignment display

### Requirement: Backbone computation
The system SHALL compute backbone—regions conserved among all input genomes—from multi-genome LCB hits, applying weight and multiplicity filters. Progressive Mauve backbone supports regions conserved among subsets.

#### Scenario: Compute backbone from progressiveMauve alignment
- **WHEN** a progressiveMauve alignment is loaded
- **THEN** system computes backbone segments including those conserved among subsets, producing backbone data for visualization and export

### Requirement: Similarity index computation
The system SHALL compute per-genome similarity profiles (SimilarityIndex) at multiple zoom levels from the XMFA alignment. Profiles are cached to disk for performance.

#### Scenario: Compute similarity index
- **WHEN** an XMFA alignment is loaded
- **THEN** system computes or loads cached similarity profiles for each genome and uses them for the similarity plot display
