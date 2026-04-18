## Why

The existing SNP export spec described both CLI and GUI export paths matching the Java Mauve desktop application. The web reimplementation replaces the CLI-based SnpExporter with a browser-based extraction and download flow. The spec needs to reflect the actual implemented behavior: in-browser SNP extraction from parsed XMFA data, tab-delimited formatting, and file download via the Options menu.

## What Changes

- SNP export is now triggered from the Options panel ("Export SNPs" button), not from a Tools → Export menu or CLI
- The export button is only visible when alignment blocks are loaded
- SNP extraction works on in-memory `XmfaAlignment` data (no file I/O)
- IUPAC ambiguity codes are treated as distinct from standard bases — identical ambiguity codes at the same position are NOT polymorphic
- Gaps are excluded from polymorphism detection
- Base comparison is case-insensitive
- Reverse strand handling: positions count down from segment end
- Output is a tab-delimited `.tsv` file with columns: SNP pattern, per-genome Contig/PosInContig/GenWidePos
- File download uses Blob URL + anchor click pattern
- CLI export scenario removed (web-only application)

## Capabilities

### New Capabilities

_None_ — SNP export is already defined in `analysis-export`.

### Modified Capabilities

- `analysis-export`: The SNP export requirement is updated to reflect the web-based implementation — GUI trigger changes from Tools menu to Options panel, CLI path removed, polymorphism rules clarified.

## Impact

- `src/analysis/export/snp-export.ts` — new module with extraction, formatting, and download functions
- `src/analysis/export/index.ts` — barrel export
- `src/viewer/options-panel.ts` — `onExportSnps` callback added to `OptionsCallbacks`
- `src/viewer/alignment-viewer.ts` — wires SNP export button, builds contig map from annotations
