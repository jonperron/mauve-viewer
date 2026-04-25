## ADDED Requirements

### Requirement: Convergence detection
The server SHALL detect when a contig ordering repeats a previously seen arrangement using a `ConvergenceDetector` that stores a `Set` of serialised ordering keys.

#### Scenario: New ordering recorded
- **WHEN** `check()` is called with an ordering not seen before
- **THEN** the ordering is recorded and `false` is returned

#### Scenario: Repeated ordering triggers convergence
- **WHEN** `check()` is called with an ordering identical to one previously recorded
- **THEN** `true` is returned and the iterative process terminates

#### Scenario: Detector reset
- **WHEN** `reset()` is called
- **THEN** all recorded orderings are cleared and `iterationCount` returns 0

### Requirement: Tab file generation
The server SHALL generate `*_contigs.tab` file content via `generateContigsTab()` that matches the format produced by the Java `ContigFeatureWriter`, including a fixed preamble and three labelled sections.

#### Scenario: Full tab file output
- **WHEN** `generateContigsTab()` is called with non-empty `toReverse`, `ordered`, and `conflicted` entries
- **THEN** the output starts with the preamble paragraph followed by all three sections, each with a column-header row and tab-delimited data rows

#### Scenario: Empty section omitted
- **WHEN** a section has zero entries
- **THEN** that section's header and data are omitted from the output

#### Scenario: Strand label encoding
- **WHEN** an entry has `forward: true`
- **THEN** the strand column reads `forward`; `forward: false` produces `complement`

### Requirement: Pseudomolecule coordinate assignment
The server SHALL assign sequential pseudomolecule coordinates to ordered contigs via `assignPseudocoordinates()`, allocating each contig the range `[cursor, cursor + length − 1]`.

#### Scenario: Sequential coordinate allocation
- **WHEN** `assignPseudocoordinates()` is called with a list of contig names and a length map
- **THEN** the first contig starts at coordinate 1, and each subsequent contig starts immediately after the previous contig ends

#### Scenario: Unknown contig length
- **WHEN** a contig name is not found in the length map
- **THEN** a length of 0 is assumed and cursor advances by 1 to avoid zero-width ranges

### Requirement: Contig grouping algorithm
The server SHALL implement `groupContigs()` — a TypeScript port of the Java `ContigGrouper` — that groups draft contigs by reference alignment using `MAX_IGNORABLE_DIST = 50` and `MIN_LENGTH_RATIO = 0.01`.

#### Scenario: Adjacent LCBs grouped
- **WHEN** two consecutive LCBs in reference order have a gap ≤ `MAX_IGNORABLE_DIST` (50 bases)
- **THEN** they are placed in the same reference group

#### Scenario: Distant LCBs separate groups
- **WHEN** two consecutive LCBs have a reference gap > 50 bases
- **THEN** they start a new reference group

#### Scenario: Minimum coverage threshold
- **WHEN** an LCB covers less than `MIN_LENGTH_RATIO` (1 %) of a contig's length
- **THEN** that contig is not assigned to the LCB's reference group

#### Scenario: Conflicted contig detection
- **WHEN** a contig is solidly covered by LCBs in two or more non-proximate reference groups
- **THEN** it is placed in the `conflicted` output list

#### Scenario: Reversed contig detection
- **WHEN** a contig's majority LCB coverage is on the reverse strand
- **THEN** it is included in the `toReverse` output list

#### Scenario: Unaligned contigs appended
- **WHEN** a contig is not covered by any LCB
- **THEN** it is appended to the `ordered` list after all reference-placed contigs, preserving original input order

#### Scenario: Empty input
- **WHEN** `groupContigs()` is called with zero LCBs or zero contigs
- **THEN** it returns `toReverse: []`, `ordered` equal to all contig names in original order, `conflicted: []`
