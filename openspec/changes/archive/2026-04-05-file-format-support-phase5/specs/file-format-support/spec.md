## MODIFIED Requirements

### Requirement: FASTA format support
The system SHALL read genome sequences in FASTA and Multi-FASTA format via the `parseFasta()` function. Files with unrecognized extensions default to FASTA. The parser SHALL support multi-line sequences, comment lines (starting with `;`), and Windows (`\r\n`) line endings. Multiple entries in a single file can be concatenated into one genome sequence via `concatenateFastaEntries()`. The parser SHALL enforce bounds of 100,000 maximum entries and 100,000,000 maximum characters per sequence. The parser SHALL throw on empty content, missing headers, or exceeded bounds.

#### Scenario: Load single-entry FASTA file
- **WHEN** user provides a .fasta file with one header and sequence
- **THEN** system parses it into a single `FastaEntry` with header and sequence fields

#### Scenario: Load multi-entry FASTA file
- **WHEN** user provides a Multi-FASTA file with multiple `>header` entries
- **THEN** system parses all entries into a `FastaResult` with one `FastaEntry` per header

#### Scenario: Concatenate multi-chromosomal genome
- **WHEN** user provides a Multi-FASTA file with multiple entries for one genome
- **THEN** `concatenateFastaEntries()` joins all entry sequences into a single string

#### Scenario: Handle comment lines
- **WHEN** a FASTA file contains lines starting with `;`
- **THEN** system skips those lines during parsing

#### Scenario: Handle Windows line endings
- **WHEN** a FASTA file uses `\r\n` line endings
- **THEN** system parses the file correctly

#### Scenario: Reject empty content
- **WHEN** user provides an empty or whitespace-only FASTA file
- **THEN** system throws an error indicating empty FASTA content

#### Scenario: Reject too many entries
- **WHEN** a FASTA file contains more than 100,000 entries
- **THEN** system throws an error indicating too many entries

#### Scenario: Reject oversized sequence
- **WHEN** a single FASTA entry sequence exceeds 100,000,000 characters
- **THEN** system throws an error indicating the sequence is too large

#### Scenario: Reject data before header
- **WHEN** sequence data appears before any `>` header line
- **THEN** system throws an error indicating sequence data found before header

### Requirement: Format auto-detection
The system SHALL determine input file format based on file extension using the `detectFormat()` function. Supported mappings: `.xmfa`/`.alignment` → xmfa, `.gbk`/`.gb`/`.genbank` → genbank, `.fasta`/`.fa`/`.fna`/`.faa` → fasta, `.json` → json, `.raw` → raw, `.embl` → embl, `.xml` → xml. Files with no extension or unrecognized extensions SHALL default to FASTA.

#### Scenario: Auto-detect XMFA format
- **WHEN** user provides a file with `.xmfa` or `.alignment` extension
- **THEN** system returns format `xmfa`

#### Scenario: Auto-detect GenBank format
- **WHEN** user provides a file with `.gbk`, `.gb`, or `.genbank` extension
- **THEN** system returns format `genbank`

#### Scenario: Auto-detect FASTA format
- **WHEN** user provides a file with `.fasta`, `.fa`, `.fna`, or `.faa` extension
- **THEN** system returns format `fasta`

#### Scenario: Auto-detect JSON format
- **WHEN** user provides a file with `.json` extension
- **THEN** system returns format `json`

#### Scenario: Default to FASTA for unknown extension
- **WHEN** user provides a file with an unrecognized extension or no extension
- **THEN** system returns format `fasta`

### Requirement: Lazy-loading annotation delegation
The system SHALL lazy-load feature annotations on demand using the `createLazyAnnotationManager()` factory function. The manager SHALL cache loaded annotations, deduplicate concurrent requests for the same genome index, and recover from rejected load attempts by removing failed requests from the pending queue. The manager provides `get`, `load`, `has`, `set`, and `getAll` methods. Pre-loaded annotations can be set directly via `set()`. The `load()` method accepts an optional `AnnotationLoader` callback provided at creation time.

#### Scenario: Load annotations on demand
- **WHEN** `load(genomeIndex)` is called and annotations are not cached
- **THEN** system invokes the `AnnotationLoader` callback, caches the result, and returns it

#### Scenario: Return cached annotations
- **WHEN** `load(genomeIndex)` is called and annotations are already cached
- **THEN** system returns the cached annotations without invoking the loader

#### Scenario: Deduplicate concurrent requests
- **WHEN** `load(genomeIndex)` is called multiple times before the first request completes
- **THEN** system returns the same pending promise for all callers

#### Scenario: Recover from rejected load
- **WHEN** the `AnnotationLoader` callback rejects
- **THEN** system removes the failed request from the pending queue, allowing future retry

#### Scenario: Set pre-loaded annotations
- **WHEN** `set(genomeIndex, annotations)` is called
- **THEN** system stores the annotations in cache, available via `get()` and `has()`

#### Scenario: Get all loaded annotations
- **WHEN** `getAll()` is called
- **THEN** system returns a read-only map of all currently cached genome annotations

## ADDED Requirements

### Requirement: JSON LCB format support
The system SHALL read alignment data from the legacy mauve-viewer JSON format via the `parseJsonLcbs()` function. The JSON format consists of an array of LCB groups, where each group is an array of region objects with `name` (string), `start` (number), `end` (number), `strand` (`"+"` or `"-"`), and `lcb_idx` (number, 1-based genome index) fields. The parser SHALL discover genomes from all regions, construct LCBs from groups with two or more regions (skipping single-region groups), and produce an `XmfaAlignment` structure. LCB weight SHALL be computed as the average segment length across regions in the group.

#### Scenario: Parse valid JSON LCB file
- **WHEN** user provides a `.json` file with an array of LCB groups
- **THEN** system parses it into an `XmfaAlignment` with genomes, LCBs, and header metadata

#### Scenario: Discover genomes from regions
- **WHEN** the JSON data contains regions with different `lcb_idx` values
- **THEN** system creates a sorted genome list with names extracted from filenames and lengths from maximum end positions

#### Scenario: Skip single-region groups
- **WHEN** an LCB group contains only one region
- **THEN** system does not create an LCB for that group

#### Scenario: Handle reverse strand regions
- **WHEN** a region has `strand` value `"-"`
- **THEN** system records the corresponding LCB entry with `reverse` set to `true`

#### Scenario: Reject invalid JSON
- **WHEN** the file content is not valid JSON
- **THEN** system throws an error indicating invalid JSON content

#### Scenario: Reject non-array top-level structure
- **WHEN** the parsed JSON is not an array
- **THEN** system throws an error indicating the data must be an array of LCB groups

#### Scenario: Validate region structure
- **WHEN** a region is missing required fields or has invalid strand values
- **THEN** system throws a descriptive error listing the required field types

### Requirement: Multi-file loading
The system SHALL support loading multiple files simultaneously (alignment + annotation files together). Files SHALL be classified by format: XMFA and JSON files are treated as alignment files, GenBank files as annotation files. When both alignment and annotation files are provided, the alignment file is loaded first, then annotation files are loaded and assigned to genomes by order (1-based index). If only annotation files are provided without an alignment file, the system SHALL display an error message. Annotation files that fail to parse SHALL be silently skipped. The file input SHALL accept `.xmfa`, `.alignment`, `.json`, `.gbk`, `.gb`, `.genbank` extensions and support the `multiple` attribute. Maximum file size SHALL be 500 MB.

#### Scenario: Load alignment with annotations
- **WHEN** user drops an XMFA file and a GenBank file together
- **THEN** system loads the XMFA alignment first, then associates the GenBank annotations with the first genome

#### Scenario: Load alignment only
- **WHEN** user drops a single XMFA or JSON file
- **THEN** system loads the alignment and renders it without annotations

#### Scenario: Reject annotation-only drop
- **WHEN** user drops only GenBank files without an alignment file
- **THEN** system displays a message indicating an alignment file is required

#### Scenario: Handle annotation parse failure
- **WHEN** an annotation file fails to parse during multi-file loading
- **THEN** system silently skips the failed file and renders the alignment with remaining annotations

#### Scenario: Enforce file size limit
- **WHEN** a file exceeds 500 MB
- **THEN** system displays an error message indicating the file is too large
