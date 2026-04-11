## Context

Eight Phase 1 parser modules were implemented and integrated into the viewer's file-loading pipeline. The `file-format-support` spec had stub requirements for several of these formats; those stubs must be replaced with the full requirement text and concrete scenarios reflecting the actual implementation.

## Goals

- Bring `openspec/specs/file-format-support/spec.md` into sync with the implemented parsers.
- Document bounds, error messages, and behavioral edge cases for each format so the spec can serve as the source of truth for QA and regression testing.

## Non-Goals

- Changing any parser behavior — this is a documentation-only sync.
- Adding new parser features not already implemented.

## Decisions

### EMBL flat-file parsing
`parseEmblRecord` extracts `FT`-prefixed feature lines. Locations are parsed by `parseLocation`, which handles `complement()` and `join()`. Qualifiers spanning multiple FT lines are reassembled. Multi-record files are split on `//` and feature coordinates are offset by cumulative sequence length. Contig boundaries are inserted at each record junction (position = offset before that record, name = record ID or `contig_N`).

### INSDseq XML parsing
`parseInsdseqMulti` uses the browser's `DOMParser` (MIME `text/xml`) to traverse `INSDSeq` elements. For each `INSDSeq`, features are extracted from `INSDFeature` elements; intervals come from `INSDInterval` children. Qualifier keys are validated against `/^[A-Za-z_][A-Za-z0-9_]{0,63}$/` before being stored. Coordinates are offset across records exactly as for EMBL.

### Raw sequence validation
`parseRawSequence` strips whitespace, uppercases, then validates against `/^[ACGTURYSWKMBDHVN]+$/i`. Error messages: `'Empty raw sequence content'` for empty input; `'Invalid raw sequence character: X'` (where X is the first offending character) for invalid chars.

### Mauve compact format
`parseMauve` / `parseMln` parse lines of the form `[groupId] seq:start-end[+-] seq:start-end[+-] ...`. `parseMauveAsXmfa` converts to `XmfaAlignment` by deriving genomes from max segment indices and computing LCB weight as mean segment length. Hard limits: 100,000 anchor lines (checked on the raw line array); 10,000 maximum genome index (checked after scanning all anchors).

### Backbone and auxiliary parsers
All five functions (`parseBackbone`, `parseIslands`, `parseIdentityMatrix`, `parsePermutation`, `parseLcbCoords`) share `normalizeDataLines`, which strips comments and blank lines. Backbone has a 10,000,000-row limit. Each function throws a descriptive error on invalid numeric values or missing columns. Identity matrix must have a tab-separated header row.

### Newick parser
Recursive descent parser. Hard limit: `MAX_NEWICK_DEPTH = 5000` prevents stack overflow from pathological inputs. Terminates on `;`. Throws on unbalanced parentheses, invalid branch lengths, or trailing content before `;`.

### Format detection
`EXTENSION_MAP` extended: `.mauve` → `'mauve'`, `.mln` → `'mauve'`, `.insdc` → `'xml'`. `.dat` was evaluated and intentionally excluded.

### Annotation loading routing
`ALIGNMENT_FORMATS` (`src/main.ts`) includes `'mauve'`. `ANNOTATION_FORMATS` includes `'embl'` and `'xml'`. The `loadAnnotations` function routes: `'genbank'` → `parseGenbankMulti`, `'embl'` → `parseEmblMulti`, `'xml'` → `parseInsdseqMulti`.

## Risks

- `DOMParser` is a browser API; Node.js test environments must provide a DOM shim (already provided via `vitest` JSDOM environment).
- Very large INSDseq XML documents could be slow to parse synchronously; this is acceptable for the current feature scope.
