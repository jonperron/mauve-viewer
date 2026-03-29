## Purpose

Defines supported input sequence formats (FASTA, GenBank, EMBL, INSDseq, Raw), alignment output formats (XMFA, Mauve format), auxiliary output files, format auto-detection, and lazy-loading annotation delegation.

## Requirements

### Requirement: FASTA format support
The system SHALL read genome sequences in FASTA and Multi-FASTA format. Files with unrecognized extensions default to FASTA. Multiple entries in a single file are concatenated as one genome (multi-chromosomal support). Alternatively, a Multi-FASTA file with one entry per genome can align entries to each other.

#### Scenario: Load FASTA genome
- **WHEN** user provides a .fasta file as input for alignment
- **THEN** system reads the sequences and makes them available for alignment

#### Scenario: Load multi-chromosomal genome
- **WHEN** user provides a Multi-FASTA file with multiple entries for one genome
- **THEN** system concatenates all entries into a single genome sequence

### Requirement: GenBank format support
The system SHALL read genome sequences and annotations from GenBank flat files (.gbk extension). Annotations (CDS, gene, tRNA, rRNA, misc_RNA) are loaded and available for visualization and analysis.

#### Scenario: Load GenBank genome with annotations
- **WHEN** user provides a .gbk file with annotated features
- **THEN** system loads sequences and makes annotations available for display when zoomed in

### Requirement: EMBL format support
The system SHALL read genome sequences and annotations from EMBL format files.

#### Scenario: Load EMBL genome
- **WHEN** user provides an EMBL format file
- **THEN** system reads sequences and annotations

### Requirement: INSDseq XML format support
The system SHALL read genome sequences from INSDseq XML format files.

#### Scenario: Load INSDseq genome
- **WHEN** user provides an INSDseq XML file
- **THEN** system reads the sequences from the XML structure

### Requirement: Raw format support
The system SHALL read raw sequence data from .raw files.

#### Scenario: Load raw sequence
- **WHEN** user provides a .raw file
- **THEN** system reads the raw nucleotide sequence

### Requirement: XMFA alignment format
The system SHALL read and write eXtended Multi-FASTA (XMFA) alignment files, storing gapped collinear sub-alignments separated by `=` signs. The Mauve GUI requires that every nucleotide appears exactly once and that the first LCB lists all input genomes.

#### Scenario: Read XMFA alignment
- **WHEN** user opens an XMFA alignment file
- **THEN** system parses all collinear sub-alignments, builds interval indices, and makes the alignment available for visualization

#### Scenario: Validate XMFA completeness
- **WHEN** system loads an XMFA file
- **THEN** every nucleotide of each input genome is represented exactly once across all alignment entries

### Requirement: Mauve alignment format
The system SHALL read the compact Mauve alignment format (.mauve, .mln) which stores multi-MUM anchor coordinates rather than full nucleotide alignments.

#### Scenario: Read Mauve alignment
- **WHEN** user opens a .mauve file
- **THEN** system parses interval definitions with anchor coordinates and inter-anchor alignments

### Requirement: Auxiliary output file generation
The system SHALL generate auxiliary output files during alignment: backbone file (.backbone), islands file (.islands), guide tree (Newick format), identity matrix (tab-delimited), permutation matrix (tab-delimited LCB orders), and LCB boundary file (tab-delimited coordinates).

#### Scenario: Generate backbone file
- **WHEN** alignment completes
- **THEN** system produces a .backbone file with tab-delimited coordinates of conserved regions per genome

#### Scenario: Generate islands file
- **WHEN** alignment completes with island detection enabled
- **THEN** system produces a .islands file with tab-delimited coordinates of genomic islands

### Requirement: Format auto-detection
The system SHALL determine input file format based on file extension: .gbk for GenBank, .raw for raw sequence, .embl for EMBL, .xml for INSDseq, and all others default to FASTA.

#### Scenario: Auto-detect GenBank
- **WHEN** user provides a file with .gbk extension
- **THEN** system reads it using the GenBank parser

#### Scenario: Default to FASTA
- **WHEN** user provides a file with an unrecognized extension
- **THEN** system reads it as FASTA format

### Requirement: Lazy-loading annotation delegation
The system SHALL lazy-load feature annotations on demand using a delegation pattern to avoid loading all features into memory for large genomes.

#### Scenario: Access features on zoom
- **WHEN** user zooms in to less than 1 Mbp and features have not yet been loaded
- **THEN** system loads annotations from the backing sequence file on demand
