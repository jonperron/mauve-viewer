## 1. FASTA parser

- [x] Define `FastaEntry` and `FastaResult` types in `src/fasta/types.ts`
- [x] Implement `parseFasta()` with multi-line sequence support, comment skipping, and Windows line endings
- [x] Implement `concatenateFastaEntries()` for multi-chromosomal genome concatenation
- [x] Add bounds checking (100K entries, 100M characters per sequence)
- [x] Export public API from `src/fasta/index.ts`
- [x] Add unit tests for FASTA parser

## 2. JSON LCB parser

- [x] Implement `parseJsonLcbs()` converting legacy JSON format to `XmfaAlignment`
- [x] Implement genome discovery from regions' `lcb_idx` fields
- [x] Implement LCB construction from multi-region groups (skip single-region groups)
- [x] Implement region validation with descriptive error messages
- [x] Export public API from `src/json-lcbs/index.ts`
- [x] Add unit tests for JSON LCB parser

## 3. Format auto-detection

- [x] Implement `detectFormat()` with extension-based mapping for all supported formats
- [x] Define `FileFormat` type union covering xmfa, genbank, fasta, json, raw, embl, xml
- [x] Default unknown/missing extensions to FASTA
- [x] Export public API from `src/format-detection/index.ts`
- [x] Add unit tests for format detection

## 4. Lazy annotation manager

- [x] Define `AnnotationLoader` callback type and `LazyAnnotationManager` interface
- [x] Implement `createLazyAnnotationManager()` with caching and request deduplication
- [x] Handle rejection recovery (remove failed requests from pending queue)
- [x] Implement `get`, `load`, `has`, `set`, `getAll` methods
- [x] Add unit tests for lazy annotation manager

## 5. Multi-file loading integration

- [x] Classify files by format into alignment vs annotation categories in `main.ts`
- [x] Load alignment file first, then annotation files assigned by positional index
- [x] Handle annotation-only drops with error message
- [x] Silently skip annotation files that fail to parse
- [x] Enforce 500 MB file size limit
- [x] Update `index.html` with `multiple` attribute and expanded `accept` list
