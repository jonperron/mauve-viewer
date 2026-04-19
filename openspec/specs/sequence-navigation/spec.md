## Purpose

Defines the sequence navigator and feature search system: multi-criteria feature search, exact/contains modes, per-genome search scope, direct coordinate navigation, and feature name lookup.
## Requirements
### Requirement: Feature search by multiple criteria
The system SHALL provide a sequence navigator interface (accessible via Ctrl+G keyboard shortcut) that searches annotated features across all loaded genomes by locus_tag, gene, product, protein_id, note, and db_xref qualifiers. The navigator SHALL be a panel with a dialog role and "Sequence navigator" aria-label, containing two tabs: "Find Features" and "Go To Position". Search results SHALL be displayed as a scrollable list (max 100 results shown, with a count of additional results) with each result showing feature type, genome name, locus_tag, gene name, product, coordinates, and strand. Clicking a search result SHALL navigate to the midpoint of that feature. All user-provided text in the navigator SHALL be escaped via escapeHtml to prevent XSS.

#### Scenario: Search by product description
- **WHEN** user presses Ctrl+G, types "penicillin" in the search field, and clicks Search
- **THEN** system searches all loaded genomes and displays matching features in a scrollable result list

#### Scenario: Navigate to search result
- **WHEN** user clicks on a search result feature
- **THEN** system navigates the alignment display to center on the midpoint of that feature

#### Scenario: Close navigator
- **WHEN** user presses Escape or clicks the close button on the navigator panel
- **THEN** system removes the navigator panel from the DOM

#### Scenario: Toggle navigator with Ctrl+G
- **WHEN** user presses Ctrl+G while the navigator is open
- **THEN** system closes the navigator panel

### Requirement: Search modes
The system SHALL support exact match and "contains" search modes via a dropdown selector. In exact mode, the system SHALL match qualifier values that are identical to the query (case-insensitive). In contains mode, the system SHALL match qualifier values that include the query as a substring (case-insensitive).

#### Scenario: Exact match search
- **WHEN** user selects "Exact match" from the mode dropdown and searches for "emrD"
- **THEN** system returns only features with a qualifier value exactly matching "emrD" (case-insensitive)

#### Scenario: Contains search
- **WHEN** user selects "Contains" from the mode dropdown and searches for "efflux"
- **THEN** system returns all features with "efflux" appearing anywhere in their qualifier values (case-insensitive)

### Requirement: Per-genome search scope
The system SHALL allow filtering search to a specific genome via a dropdown selector with options for "All genomes" and each individual genome. When a specific genome is selected, only features from that genome SHALL appear in results.

#### Scenario: Search in specific genome
- **WHEN** user selects a genome from the scope dropdown and performs a search
- **THEN** system returns results only from the selected genome

#### Scenario: Search across all genomes
- **WHEN** user selects "All genomes" from the scope dropdown and performs a search
- **THEN** system returns results from all loaded genomes

### Requirement: Go to sequence position
The system SHALL allow direct navigation to a specific coordinate via the "Go To Position" tab in the sequence navigator. The tab SHALL contain a genome selector dropdown and a numeric position input. When the user enters a position and clicks Go, the system SHALL center the alignment view on that coordinate in the selected genome.

#### Scenario: Jump to coordinate
- **WHEN** user switches to the "Go To Position" tab, selects a genome, enters position 3850000, and clicks Go
- **THEN** system centers the view on position 3850000 in the selected genome

#### Scenario: Reject invalid position
- **WHEN** user enters a non-positive or non-numeric position and clicks Go
- **THEN** system does not navigate (no-op)

### Requirement: Go to feature by name
The system SHALL allow navigation to a specific named feature via View → Go To → Feature Name.

#### Scenario: Jump to named feature
- **WHEN** user enters "emrD" in the Go To Feature Name dialog
- **THEN** system navigates to the first feature matching that name

### Requirement: Sequence navigator available only with annotations
The system SHALL only enable the Ctrl+G sequence navigator shortcut when annotations are loaded. Without annotations, the shortcut SHALL have no effect.

#### Scenario: Navigator unavailable without annotations
- **WHEN** user presses Ctrl+G with no annotations loaded
- **THEN** system does not open the sequence navigator

