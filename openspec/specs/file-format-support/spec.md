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
The system SHALL read genome sequences and annotations from GenBank flat files (.gbk extension). The parser SHALL extract features of types CDS, gene, tRNA, rRNA, and misc_RNA with their qualifiers (gene, product, locus_tag, protein_id, db_xref). The parser SHALL handle complement() locations for reverse-strand features and join() locations for multi-exon features by computing the full coordinate span. The parser SHALL support multi-record GenBank files, detecting contig boundaries between records and offsetting feature coordinates to global positions. Features with unparseable locations SHALL be silently skipped. If no FEATURES or ORIGIN section is found, the parser SHALL return an empty annotation set.

#### Scenario: Parse single-record GenBank file
- **WHEN** user provides a single-record .gbk file with CDS, tRNA, and rRNA features
- **THEN** system extracts each feature with type, start, end, strand, and qualifiers

#### Scenario: Parse complement location
- **WHEN** a feature has a complement() location (e.g., complement(1234..5678))
- **THEN** system records the feature with strand '-' and the correct coordinate range

#### Scenario: Parse join location
- **WHEN** a feature has a join() location (e.g., join(100..200,300..400))
- **THEN** system records the feature spanning the full range (100..400)

#### Scenario: Parse multi-record GenBank file
- **WHEN** user provides a GenBank file with multiple LOCUS records separated by //
- **THEN** system offsets feature coordinates to global positions and creates contig boundaries at record junctions

#### Scenario: Skip unparseable feature locations
- **WHEN** a feature has a location that cannot be parsed
- **THEN** system silently skips that feature without error

#### Scenario: Handle missing FEATURES section
- **WHEN** a GenBank file lacks a FEATURES or ORIGIN section
- **THEN** system returns an empty GenomeAnnotations with no features and no contigs

#### Scenario: Extract qualifier values
- **WHEN** a feature has /gene, /product, /locus_tag, /protein_id, or /db_xref qualifiers
- **THEN** system extracts each qualifier key-value pair into the feature's qualifiers record

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
The system SHALL read eXtended Multi-FASTA (XMFA) alignment files, parsing header metadata (format version, sequence files, formats, annotation references), gapped collinear sub-alignments separated by `=` signs, and constructing Locally Collinear Blocks (LCBs) from multi-sequence alignment blocks. The parser SHALL enforce bounds of 100,000 maximum alignment blocks and 100,000,000 maximum characters per sequence segment.

#### Scenario: Read XMFA alignment
- **WHEN** user opens an XMFA alignment file
- **THEN** system parses header metadata, all collinear sub-alignments, constructs LCBs from multi-sequence blocks, and extracts genome information

#### Scenario: Parse XMFA header metadata
- **WHEN** system reads the header section of an XMFA file
- **THEN** system extracts format version, sequence file paths, sequence formats, and annotation references for each genome

#### Scenario: Construct LCBs from alignment blocks
- **WHEN** an alignment block contains segments from two or more sequences
- **THEN** system creates an LCB with left/right coordinates, strand orientation, and weight computed as average segment length

#### Scenario: Skip single-sequence blocks for LCB construction
- **WHEN** an alignment block contains a segment from only one sequence
- **THEN** system does not create an LCB for that block

#### Scenario: Reject excessive alignment blocks
- **WHEN** an XMFA file contains more than 100,000 alignment blocks
- **THEN** system throws an error indicating the file exceeds parser bounds

#### Scenario: Reject excessive sequence data
- **WHEN** a single sequence segment exceeds 100,000,000 characters
- **THEN** system throws an error indicating the sequence data is too large

#### Scenario: Reject malformed deflines
- **WHEN** an XMFA file contains a defline that does not match the expected format
- **THEN** system throws a descriptive error with a truncated preview of the malformed line

#### Scenario: Reject incomplete header entries
- **WHEN** an XMFA header references a sequence without both file and format fields
- **THEN** system throws an error indicating incomplete sequence entry

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

