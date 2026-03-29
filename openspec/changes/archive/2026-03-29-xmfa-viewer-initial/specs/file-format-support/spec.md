## MODIFIED Requirements

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
