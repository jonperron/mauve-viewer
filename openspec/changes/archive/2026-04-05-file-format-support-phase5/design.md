## Context

The Mauve viewer initially only supported XMFA alignment files loaded via a single-file drop. The legacy mauve-viewer web component uses a JSON format for LCB data, and users commonly work with FASTA genome sequences and GenBank annotation files. This change adds multi-format support and enables loading multiple files at once.

## Goals

- Parse FASTA files for genome sequence loading with robust error handling
- Parse legacy JSON LCB format and convert to the existing XmfaAlignment structure
- Auto-detect file format from extension to route files to the correct parser
- Enable lazy-loading of annotations with caching and request deduplication
- Support multi-file drop combining alignment and annotation files

## Non-Goals

- EMBL format parsing (spec exists, not yet implemented)
- INSDseq XML format parsing (spec exists, not yet implemented)
- Content-based format detection (sniffing file headers)
- FASTA files as alignment input (only as genome sequences)

## Decisions

### FASTA parser as pure function
`parseFasta()` takes a string and returns a `FastaResult` with readonly `FastaEntry` array. `concatenateFastaEntries()` is a separate utility for joining multi-chromosomal entries. Both are stateless and side-effect free.

### JSON LCB to XmfaAlignment conversion
`parseJsonLcbs()` converts the legacy JSON format directly to `XmfaAlignment`, reusing existing types. Genomes are discovered from regions' `lcb_idx` fields and sorted by index. This avoids introducing new alignment types for the legacy format.

### Extension-based format detection
`detectFormat()` uses a static extension map rather than content-based detection. This is simpler, deterministic, and matches the legacy Mauve behavior. Unknown extensions default to FASTA per the original spec.

### Lazy annotation manager with factory pattern
`createLazyAnnotationManager()` returns a `LazyAnnotationManager` interface with closure-based state. Pending requests are tracked in a Map to deduplicate concurrent loads. The `finally` handler ensures failed requests are cleaned up for retry.

### Multi-file classification by format
Files are classified as alignment (xmfa, json) or annotation (genbank) at load time using `detectFormat()`. This separation allows loading them in the correct order: alignment first, then annotations assigned by positional index.

## Risks

- Positional annotation assignment (first GenBank → genome 1) may not match user intent if genomes are reordered. Mitigated by documenting the convention.
- JSON LCB format has no formal schema; validation relies on runtime type checking of region fields.
