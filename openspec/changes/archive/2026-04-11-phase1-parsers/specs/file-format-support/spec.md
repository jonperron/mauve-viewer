## MODIFIED Requirements

### Requirement: EMBL format support
The system SHALL read genome sequences and annotations from EMBL flat files via `parseEmbl()` (single record) and `parseEmblMulti()` (multi-record). The parser SHALL extract features of types CDS, gene, tRNA, rRNA, and misc_RNA from `FT`-prefixed lines. The parser SHALL handle `complement()` locations for reverse-strand features and `join()` locations for multi-exon features by computing the full coordinate span. Features with unparseable locations SHALL be silently skipped. Multi-record files SHALL be split on `//` record separators; feature coordinates SHALL be offset by the cumulative sequence length of preceding records, and contig boundaries SHALL be inserted at each record junction. The parser SHALL support qualifier values spanning multiple `FT` continuation lines.

#### Scenario: Parse EMBL feature types
- **WHEN** an EMBL file contains CDS, gene, tRNA, rRNA, or misc_RNA features in `FT` lines
- **THEN** system extracts each feature with type, start, end, strand, and qualifiers

#### Scenario: Parse EMBL complement location
- **WHEN** a feature has a `complement(start..end)` location
- **THEN** system records the feature with strand `'-'` and the correct coordinate range

#### Scenario: Parse EMBL join location
- **WHEN** a feature has a `join(a..b,c..d,...)` location
- **THEN** system records the feature spanning the full range (min start..max end) with strand `'+'`

#### Scenario: Skip unparseable EMBL locations
- **WHEN** an EMBL feature has a location that cannot be parsed
- **THEN** system silently skips that feature without error

#### Scenario: Parse multi-record EMBL file
- **WHEN** an EMBL file contains multiple records separated by `//`
- **THEN** system offsets feature coordinates to global positions and inserts contig boundaries at record junctions

#### Scenario: Extract EMBL qualifiers
- **WHEN** an EMBL feature has qualifier lines beginning with `/key=value`
- **THEN** system extracts each qualifier key-value pair into the feature's qualifiers record; flag qualifiers (no `=`) are stored as `'true'`

#### Scenario: Handle empty EMBL file
- **WHEN** an EMBL file contains no records after splitting on `//`
- **THEN** system returns a single `GenomeAnnotations` with empty features and contigs arrays

### Requirement: INSDseq XML format support
The system SHALL read genome sequences and annotations from INSDseq XML files via `parseInsdseq()` (single record) and `parseInsdseqMulti()` (multi-record) using `DOMParser`. The parser SHALL extract features from `INSDFeature` elements and resolve coordinates from `INSDInterval` sub-elements. The parser SHALL support multi-interval (join) features by computing the full span. The parser SHALL detect reverse-strand from `INSDInterval_iscomp` set to `'true'`. Qualifier keys SHALL be validated against the pattern `/^[A-Za-z_][A-Za-z0-9_]{0,63}$/`; keys failing validation SHALL be skipped. Multi-sequence files SHALL have contig boundaries inserted between sequences with coordinates offset by cumulative sequence length.

#### Scenario: Parse INSDseq single record
- **WHEN** user provides an INSDseq XML file with one `INSDSeq` element
- **THEN** system extracts features with type, start, end, strand, and qualifiers

#### Scenario: Parse INSDseq multi-sequence file
- **WHEN** an INSDseq XML file contains multiple `INSDSeq` elements
- **THEN** system offsets feature coordinates to global positions and inserts contig boundaries between sequences

#### Scenario: Resolve multi-interval INSDseq feature
- **WHEN** an `INSDFeature` contains multiple `INSDInterval` elements
- **THEN** system records the feature spanning the full range (min from..max to)

#### Scenario: Detect reverse strand in INSDseq
- **WHEN** any `INSDInterval_iscomp` is `'true'`
- **THEN** system records the feature with strand `'-'`

#### Scenario: Skip invalid INSDseq qualifier keys
- **WHEN** a qualifier key does not match `/^[A-Za-z_][A-Za-z0-9_]{0,63}$/`
- **THEN** system silently skips that qualifier

### Requirement: Raw format support
The system SHALL read raw nucleotide sequences via `parseRawSequence()`. The function SHALL strip all whitespace (spaces, tabs, newlines) from input before validating. The accepted character set is `[ACGTURYSWKMBDHVN]` (case-insensitive). The returned sequence SHALL be upper-case. The parser SHALL throw `'Empty raw sequence content'` when input is empty or whitespace-only. The parser SHALL throw `'Invalid raw sequence character: X'` (where X is the first invalid character found) when the sequence contains characters outside the accepted set.

#### Scenario: Parse valid raw sequence
- **WHEN** user provides a `.raw` file containing only valid IUPAC nucleotide characters
- **THEN** system returns a normalized upper-case string with all whitespace removed

#### Scenario: Strip whitespace from raw sequence
- **WHEN** a raw sequence file contains spaces, tabs, or newlines between characters
- **THEN** system strips whitespace and returns a single contiguous upper-case sequence string

#### Scenario: Reject empty raw sequence
- **WHEN** user provides an empty or whitespace-only raw sequence file
- **THEN** system throws `'Empty raw sequence content'`

#### Scenario: Reject invalid raw sequence character
- **WHEN** the raw sequence contains a character outside `[ACGTURYSWKMBDHVN]`
- **THEN** system throws `'Invalid raw sequence character: X'` identifying the first invalid character

### Requirement: Mauve alignment format
The system SHALL read the compact Mauve alignment format (`.mauve`, `.mln`) via `parseMauve()`, `parseMln()`, and `parseMauveAsXmfa()`. Each non-comment line encodes one anchor as an optional group ID followed by two or more segment tokens of the form `seqIndex:start-end[+-]`. The parser SHALL convert anchors to `XmfaAlignment`-compatible `Lcb` objects, deriving genome count from the maximum sequence index encountered and genome length from the maximum coordinate per sequence. LCB weight SHALL be computed as the mean segment length across all segments in the anchor. The parser SHALL enforce a maximum of 100,000 anchor lines and a maximum sequence index of 10,000; exceeding either limit SHALL throw a descriptive error.

#### Scenario: Parse Mauve anchor file
- **WHEN** user opens a `.mauve` or `.mln` file
- **THEN** system parses each anchor line into an `MauveAnchor` with group ID and segments

#### Scenario: Convert Mauve anchors to LCBs
- **WHEN** `parseMauveAsXmfa()` is called
- **THEN** system produces an `XmfaAlignment` with one `Lcb` per anchor, genomes derived from segment indices, and LCB weight as mean segment length

#### Scenario: Reject malformed segment token
- **WHEN** a segment token does not match `seqIndex:start-end[+-]`
- **THEN** system throws a descriptive error identifying the malformed token

#### Scenario: Reject anchor with fewer than 2 segments
- **WHEN** an anchor line contains fewer than 2 segment tokens
- **THEN** system throws an error indicating at least 2 segments are required

#### Scenario: Reject excessive anchor lines
- **WHEN** a Mauve file contains more than 100,000 anchor lines
- **THEN** system throws `'Too many Mauve anchor lines (max 100000)'`

#### Scenario: Reject excessive sequence count
- **WHEN** the maximum sequence index in a Mauve file exceeds 10,000
- **THEN** system throws an error indicating an unreasonable sequence count

#### Scenario: Reject empty Mauve file
- **WHEN** a `.mauve` file is empty or contains only comments
- **THEN** system throws `'Empty Mauve alignment content'`

### Requirement: Auxiliary output file generation
The system SHALL parse the five auxiliary output file types produced by Mauve alignment: backbone (`.backbone`), genomic islands (`.islands`), identity matrix (tab-delimited), permutation matrix (tab-delimited), and LCB coordinate file. All parsers SHALL skip blank lines and lines beginning with `#`. All parsers SHALL throw descriptive errors on invalid numeric values or missing required columns.

`parseBackbone(content)` — Parses tab-delimited rows of left/right coordinate pairs per genome. An optional leading `seqIndex` column is detected by odd column count. SHALL enforce a maximum of 10,000,000 rows.

`parseIslands(content)` — Parses rows of `genomeIndex start end [label]`. Label is optional.

`parseIdentityMatrix(content)` — Parses a tab-delimited matrix with a header row of genome labels. Requires at least one data row. Throws if any cell is non-numeric.

`parsePermutation(content)` — Parses rows of `genomeLabel int int ...` representing LCB order permutations.

`parseLcbCoords(content)` — Parses rows of `genomeIndex lcbId left right strand`. Strand must be `'+'` or `'-'`.

#### Scenario: Parse backbone file
- **WHEN** user provides a `.backbone` file with tab-delimited left/right coordinate pairs
- **THEN** system returns an array of `BackboneSegment` objects with `seqIndex`, `intervals`, and `isBackbone` fields

#### Scenario: Reject oversized backbone file
- **WHEN** a backbone file contains more than 10,000,000 data rows
- **THEN** system throws an error indicating the file is too large

#### Scenario: Parse islands file
- **WHEN** user provides a `.islands` file with genomeIndex, start, end, and optional label columns
- **THEN** system returns an array of `IslandSegment` objects

#### Scenario: Reject invalid islands row
- **WHEN** an islands row contains non-numeric genomeIndex, start, or end values
- **THEN** system throws `'Invalid islands row: <line>'`

#### Scenario: Parse identity matrix
- **WHEN** user provides a tab-delimited identity matrix with a header row
- **THEN** system returns an `IdentityMatrix` with genome labels and a 2D numeric values array

#### Scenario: Reject identity matrix with non-numeric values
- **WHEN** the identity matrix contains non-numeric cell values
- **THEN** system throws `'Identity matrix contains non-numeric values'`

#### Scenario: Reject identity matrix missing header
- **WHEN** an identity matrix file contains fewer than 2 lines
- **THEN** system throws `'Identity matrix must contain header and at least one row'`

#### Scenario: Parse permutation file
- **WHEN** user provides a permutation file with genome label and integer columns
- **THEN** system returns an array of `PermutationRow` objects with `genomeLabel` and `values`

#### Scenario: Reject invalid permutation row
- **WHEN** a permutation row is missing the genome label or contains non-numeric values
- **THEN** system throws `'Invalid permutation row: <line>'`

#### Scenario: Parse LCB coordinate file
- **WHEN** user provides a file with genomeIndex, lcbId, left, right, and strand columns
- **THEN** system returns an array of `LcbBoundary` objects

#### Scenario: Reject invalid LCB coordinate row
- **WHEN** an LCB coordinate row is missing required columns or has an invalid strand
- **THEN** system throws `'Invalid LCB coordinate row: <line>'`



### Requirement: Format auto-detection
The system SHALL determine input file format based on file extension using the `detectFormat()` function. Supported mappings: `.xmfa`/`.alignment` → `xmfa`, `.mauve`/`.mln` → `mauve`, `.gbk`/`.gb`/`.genbank` → `genbank`, `.fasta`/`.fa`/`.fna`/`.faa` → `fasta`, `.json` → `json`, `.raw` → `raw`, `.embl` → `embl`, `.xml`/`.insdc` → `xml`. Files with no extension or unrecognized extensions SHALL default to `fasta`.

#### Scenario: Auto-detect XMFA format
- **WHEN** user provides a file with `.xmfa` or `.alignment` extension
- **THEN** system returns format `xmfa`

#### Scenario: Auto-detect Mauve format
- **WHEN** user provides a file with `.mauve` or `.mln` extension
- **THEN** system returns format `mauve`

#### Scenario: Auto-detect GenBank format
- **WHEN** user provides a file with `.gbk`, `.gb`, or `.genbank` extension
- **THEN** system returns format `genbank`

#### Scenario: Auto-detect FASTA format
- **WHEN** user provides a file with `.fasta`, `.fa`, `.fna`, or `.faa` extension
- **THEN** system returns format `fasta`

#### Scenario: Auto-detect JSON format
- **WHEN** user provides a file with `.json` extension
- **THEN** system returns format `json`

#### Scenario: Auto-detect raw format
- **WHEN** user provides a file with `.raw` extension
- **THEN** system returns format `raw`

#### Scenario: Auto-detect EMBL format
- **WHEN** user provides a file with `.embl` extension
- **THEN** system returns format `embl`

#### Scenario: Auto-detect INSDseq/XML format
- **WHEN** user provides a file with `.xml` or `.insdc` extension
- **THEN** system returns format `xml`

#### Scenario: Default to FASTA for unknown extension
- **WHEN** user provides a file with an unrecognized extension or no extension
- **THEN** system returns format `fasta`

### Requirement: Multi-file loading
The system SHALL support loading multiple files simultaneously (alignment + annotation files together). Files SHALL be classified by format: XMFA, JSON, and Mauve files are treated as alignment files; GenBank, EMBL, and INSDseq/XML files are treated as annotation files. When both alignment and annotation files are provided, the alignment file is loaded first, then annotation files are loaded and assigned to genomes by order (1-based index). If only annotation files are provided without an alignment file, the system SHALL display an error message. Annotation files that fail to parse SHALL be silently skipped. The file input SHALL accept `.xmfa`, `.alignment`, `.json`, `.gbk`, `.gb`, `.genbank`, `.embl`, `.xml` extensions and support the `multiple` attribute. Maximum file size SHALL be 500 MB.

Annotation routing: `'genbank'` → `parseGenbankMulti`, `'embl'` → `parseEmblMulti`, `'xml'` → `parseInsdseqMulti`.

#### Scenario: Load alignment with annotations
- **WHEN** user drops an XMFA file and a GenBank file together
- **THEN** system loads the XMFA alignment first, then associates the GenBank annotations with the first genome

#### Scenario: Load Mauve alignment
- **WHEN** user drops a `.mauve` or `.mln` file
- **THEN** system classifies it as an alignment file and loads it via `parseMauveAsXmfa`

#### Scenario: Load EMBL annotation file
- **WHEN** user drops an EMBL annotation file alongside an alignment
- **THEN** system routes to `parseEmblMulti` and associates resulting annotations with the appropriate genome

#### Scenario: Load INSDseq annotation file
- **WHEN** user drops an `.xml` or `.insdc` annotation file alongside an alignment
- **THEN** system routes to `parseInsdseqMulti` and associates resulting annotations with the appropriate genome

#### Scenario: Load alignment only
- **WHEN** user drops a single XMFA, JSON, or Mauve file
- **THEN** system loads the alignment and renders it without annotations

#### Scenario: Reject annotation-only drop
- **WHEN** user drops only annotation files without an alignment file
- **THEN** system displays a message indicating an alignment file is required

#### Scenario: Handle annotation parse failure
- **WHEN** an annotation file fails to parse during multi-file loading
- **THEN** system silently skips the failed file and renders the alignment with remaining annotations

#### Scenario: Enforce file size limit
- **WHEN** a file exceeds 500 MB
- **THEN** system displays an error message indicating the file is too large

## ADDED Requirements

### Requirement: Newick guide tree parsing
The system SHALL parse Newick-format guide tree files via `parseNewick()`. The parser SHALL handle nested node groups with branch lengths (`:value`) and node labels. The parser SHALL enforce a maximum nesting depth of 5,000. Input MUST end with a semicolon (`;`). The parser SHALL throw descriptive errors for unbalanced parentheses, invalid branch length values, missing terminating semicolon, or trailing content before the semicolon.

#### Scenario: Parse simple Newick tree
- **WHEN** user provides a Newick string with leaf nodes and branch lengths
- **THEN** system returns a `NewickNode` tree structure with name and length fields

#### Scenario: Parse nested Newick tree
- **WHEN** a Newick string contains nested parenthesized groups
- **THEN** system returns a `NewickNode` with nested children arrays

#### Scenario: Reject missing Newick semicolon
- **WHEN** a Newick string does not end with `;`
- **THEN** system throws `'Invalid Newick: missing terminating semicolon'`

#### Scenario: Reject unbalanced Newick parentheses
- **WHEN** a Newick string has an unclosed `(`
- **THEN** system throws `'Unbalanced Newick tree: missing closing parenthesis'`

#### Scenario: Reject Newick tree exceeding depth limit
- **WHEN** a Newick tree is nested more than 5,000 levels deep
- **THEN** system throws `'Newick tree exceeds maximum nesting depth (5000)'`

#### Scenario: Reject invalid Newick branch length
- **WHEN** a branch length value in a Newick string is not a finite number
- **THEN** system throws `'Invalid Newick branch length: <value>'`
