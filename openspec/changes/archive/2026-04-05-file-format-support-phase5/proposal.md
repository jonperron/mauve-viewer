## Why

The viewer needs to support multiple input file formats beyond XMFA to match the legacy Mauve application's format support. Users need to load FASTA genome sequences, JSON LCB alignment data (from the legacy mauve-viewer web component), and mix alignment files with annotation files in a single drop operation. Format auto-detection removes the need for users to manually specify file types.

## What Changes

- Add FASTA parser supporting single/multi-entry files with bounds checking
- Add JSON LCB parser for the legacy mauve-viewer JSON format, converting to XmfaAlignment structures
- Add format auto-detection based on file extension
- Add lazy annotation manager for on-demand annotation loading with caching and deduplication
- Update main.ts to support multi-file drop (alignment + annotation files together) with format-based routing
- Update index.html to accept multiple file formats and multi-file input

## Capabilities

### New Capabilities

_None — all changes fall under existing file-format-support capability._

### Modified Capabilities

- `file-format-support`: FASTA parser implemented with multi-entry support and bounds checking. JSON LCB parser implemented converting legacy format to XmfaAlignment. Format auto-detection expanded to cover all supported extensions. Lazy annotation manager implemented with caching, deduplication, and rejection recovery. Multi-file loading integrated into main.ts with format-based routing.

## Impact

- New modules: `src/fasta/` (types, parser, index), `src/json-lcbs/` (parser, index), `src/format-detection/` (index), `src/annotations/lazy-loader.ts`
- Modified: `src/main.ts` (multi-file loading, format routing), `index.html` (multi-file input, expanded accept list)
- No breaking changes to existing APIs
