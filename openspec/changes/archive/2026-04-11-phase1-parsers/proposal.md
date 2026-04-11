## Why

The Phase 1 file format parsers have been implemented but the `file-format-support` spec still contains stub requirements (one-line descriptions with a single generic scenario) for EMBL, INSDseq, raw, Mauve compact, auxiliary output files, and format detection. The specs must be updated to fully document the implemented behavior so that the spec serves as an accurate contract for future contributors and QA.

## What Changes

- **EMBL**: Expand stub requirement with multi-record support, complement/join location parsing, qualifier extraction, and contig offset behavior.
- **INSDseq**: Expand stub requirement with DOMParser-based XML parsing, multi-sequence with contig boundaries, interval resolution, qualifier validation.
- **Raw**: Expand stub requirement with accepted character set (`[ACGTURYSWKMBDHVN]`), whitespace stripping, and precise error messages (empty vs. invalid character).
- **Mauve compact format**: Expand stub requirement with anchor-to-LCB conversion, segment token format (`seq:start-end[+-]`), max-bounds enforcement (100,000 anchor lines, 10,000 genomes), and `XmfaAlignment`-compatible output.
- **Backbone/auxiliary parsers**: Expand stub to cover `parseBackbone`, `parseIslands`, `parseIdentityMatrix`, `parsePermutation`, and `parseLcbCoords` with validation behaviors and row limits.
- **Newick**: Add parsing scenario, depth limit (5,000), and error cases.
- **Format detection**: Add `.mauve` → `mauve`, `.mln` → `mauve`, `.insdc` → `xml` mappings.
- **Multi-file / annotation loading**: Add routing scenarios for EMBL (`parseEmblMulti`) and INSDseq (`parseInsdseqMulti`); document `ANNOTATION_FORMATS` set including `'embl'` and `'xml'`; document `ALIGNMENT_FORMATS` including `'mauve'`.

## Capabilities

### New Capabilities
- (none — all changes expand existing capabilities)

### Modified Capabilities
- `file-format-support`: Expand EMBL, INSDseq, raw, Mauve compact, auxiliary output, Newick, format detection, and multi-file loading requirements with detailed scenarios and bounds.

## Impact

- `src/raw/parser.ts`, `src/embl/parser.ts`, `src/insdseq/parser.ts`, `src/mauve-format/parser.ts`, `src/backbone/parser.ts`, `src/newick/parser.ts`, `src/format-detection/index.ts`, `src/main.ts`
- `openspec/specs/file-format-support/spec.md` (delta spec)
