## Purpose

Defines the Mauve Contig Mover (MCM) which reorders draft genome contigs relative to a reference genome through an iterative alignment-and-reorder process, with GUI and command-line interfaces.

## Requirements

### Requirement: Iterative contig reordering
The Mauve Contig Mover (MCM) SHALL reorder draft genome contigs relative to a reference genome through an iterative process. The system aligns draft against reference using progressiveMauve, reorders contigs based on the alignment, and repeats until the order converges or a maximum of 15 iterations is reached.

#### Scenario: Reorder draft contigs via GUI
- **WHEN** user selects Tools → Order Contigs, specifies an output directory, provides a reference genome and a draft genome
- **THEN** system iteratively aligns and reorders contigs, producing alignment output in numbered subdirectories (alignment1/, alignment2/, ...) until the order stabilizes

#### Scenario: Convergence detection
- **WHEN** a contig ordering repeats a previously seen arrangement
- **THEN** system terminates the iterative process and reports completion

#### Scenario: Maximum iterations reached
- **WHEN** the ordering process reaches 15 iterations without convergence
- **THEN** system terminates and uses the last ordering as the final result

### Requirement: Two-sequence input constraint
The MCM SHALL accept exactly two sequences: the reference genome (first) and the draft genome (second). Only the second genome is reordered.

#### Scenario: Valid input
- **WHEN** user provides exactly one reference and one draft genome
- **THEN** system proceeds with reordering

### Requirement: Draft format constraint
The draft genome SHALL be provided in FASTA or GenBank format. If GenBank format is used, each contig SHALL have a unique identifier in the LOCUS tag.

#### Scenario: GenBank draft input
- **WHEN** user provides a GenBank file as draft with unique LOCUS tags per contig
- **THEN** system preserves and adjusts annotation coordinates through reordering

### Requirement: Contig grouping
The system SHALL group contigs based on proximity in the reference (max distance = 50 positions) and minimum length ratio (0.01), detecting inversions and ordering conflicts.

#### Scenario: Group adjacent contigs
- **WHEN** multiple contigs align to proximate regions of the reference
- **THEN** system groups them into a ContigGroup and orders them together

### Requirement: Output file generation
For each iteration, the system SHALL produce: standard Mauve alignment files, a contig ordering tab file (*_contigs.tab) with three sections (contigs to reverse, ordered contigs, contigs with conflicting order information), and if GenBank input, a features tab file (*_features.tab) with adjusted annotations.

#### Scenario: Generate contig tab file
- **WHEN** an iteration of reordering completes
- **THEN** system produces a *_contigs.tab file listing reversed contigs, ordered contigs with pseudocoordinates, and contigs with conflicting placement

#### Scenario: Preserve GenBank annotations
- **WHEN** draft genome was input as GenBank
- **THEN** system outputs a *_features.tab file with adjusted orientation and coordinates for each annotation

### Requirement: Command-line operation
The MCM SHALL support batch command-line operation via `java -cp Mauve.jar org.gel.mauve.contigs.ContigOrderer -output <dir> -ref <reference> -draft <draft>`.

#### Scenario: CLI contig reordering
- **WHEN** user runs the ContigOrderer from the command line with -output, -ref, and -draft arguments
- **THEN** system performs the full iterative reordering without GUI interaction

### Requirement: Cancellation support
The MCM SHALL allow cancellation at any point. If cancelled after the first iteration, intermediate reordered FASTA is available in the corresponding output directory.

#### Scenario: Cancel mid-process
- **WHEN** user cancels the reordering process after two iterations
- **THEN** system stops, and alignment1/ and alignment2/ contain usable results
