## Why

The original Mauve genome alignment viewer is a Java Swing desktop application. To make it accessible as a modern web application, we need to migrate its core functionality to TypeScript running in the browser. The first step is loading and visualizing XMFA alignment files — the primary input format for Mauve — using D3.js for rendering.

## What Changes

- XMFA file parser implemented in TypeScript, supporting header metadata, alignment blocks, LCB construction, and genome extraction
- D3-based multi-genome alignment visualization with colored LCB blocks, connecting lines between homologous regions, coordinate rulers, and genome labels
- Web entry point with drag-and-drop and file picker for loading XMFA files
- Project build tooling: TypeScript, Vite, Vitest, ESLint with TS support
- Input validation with file size limits (500 MB) and parser bounds (100K blocks, 100M chars per sequence)

## Capabilities

### New Capabilities

_None — this change implements a subset of existing specified capabilities._

### Modified Capabilities

- `xmfa-viewer`: Partial implementation — multi-genome panel display with LCB blocks (forward/reverse orientation), connecting lines, coordinate rulers, and drag-and-drop file loading are now implemented. Similarity profiles, annotated features, zoom/scroll, mouse interaction, genome reordering, hiding, printing, and image export are not yet implemented.
- `file-format-support`: Partial implementation — XMFA format reading is now implemented (header parsing, alignment block parsing, LCB construction). Other formats (FASTA, GenBank, EMBL, INSDseq, Raw, Mauve) and XMFA writing are not yet implemented.

## Impact

- New source files under `src/xmfa/` (parser, types) and `src/viewer/` (D3 renderer)
- New entry point `src/main.ts` and `index.html`
- New dev dependencies: TypeScript, D3, jsdom, eslint TS plugin, vitest coverage
- New runtime dependency: D3
- TypeScript and Vite configuration added
