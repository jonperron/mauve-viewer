## Purpose

Defines the sequence navigator and feature search system: multi-criteria feature search, exact/contains modes, per-genome search scope, direct coordinate navigation, and feature name lookup.

## Requirements

### Requirement: Feature search by multiple criteria
The system SHALL provide a sequence navigator interface (accessible via toolbar binoculars button or View → Go To → Find Features, Ctrl+I) that searches annotated features across all loaded genomes by locus_tag, gene, product, protein_id, note, db_xref, and other qualifiers.

#### Scenario: Search by product description
- **WHEN** user opens the sequence navigator and types "penicillin" in the search field
- **THEN** system searches all loaded genomes and displays matching features grouped by genome in a tree view

#### Scenario: Navigate to search result
- **WHEN** user clicks on a search result feature (e.g., dacC gene)
- **THEN** system refocuses the alignment display on the region surrounding that feature, highlighted in light blue

### Requirement: Search modes
The system SHALL support exact match and "contains" search modes.

#### Scenario: Exact match search
- **WHEN** user selects exact match mode and searches for "emrD"
- **THEN** system returns only features with exactly matching qualifier values

#### Scenario: Contains search
- **WHEN** user selects contains mode and searches for "efflux"
- **THEN** system returns all features with "efflux" appearing anywhere in their qualifiers

### Requirement: Per-genome search scope
The system SHALL allow filtering search to a specific genome via a combo box selector.

#### Scenario: Search in specific genome
- **WHEN** user selects "E. coli K12" from the genome combo box and searches
- **THEN** system returns results only from the selected genome

### Requirement: Go to sequence position
The system SHALL allow direct navigation to a specific coordinate via View → Go To → Sequence Position.

#### Scenario: Jump to coordinate
- **WHEN** user enters position 3850000 in the Go To dialog
- **THEN** system centers the view on that coordinate in the active genome

### Requirement: Go to feature by name
The system SHALL allow navigation to a specific named feature via View → Go To → Feature Name.

#### Scenario: Jump to named feature
- **WHEN** user enters "emrD" in the Go To Feature Name dialog
- **THEN** system navigates to the first feature matching that name
