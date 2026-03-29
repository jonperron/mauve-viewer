## Context

The original Mauve genome alignment viewer is a Java Swing desktop application (source in `mauve/src/org/gel/mauve/`). This change migrates the core XMFA file loading and alignment visualization to a TypeScript web application using Vite, D3.js, and Vitest.

The existing Java codebase uses `XMFAAlignment.java` as a stateful parser with a 6-state state machine, `LCB.java`/`Match.java` for the data model, and Java2D/Swing for rendering. The web migration uses a functional parser returning immutable data structures and D3.js SVG rendering.

## Goals / Non-Goals

**Goals:**
- Parse XMFA files in the browser with correct header, alignment block, and LCB extraction
- Render multi-genome alignment panels with colored LCB blocks, center lines, coordinate rulers, genome labels, and connecting lines
- Accept files via drag-and-drop or file picker
- Enforce input validation and size limits for security
- Achieve 80%+ test coverage

**Non-Goals:**
- Similarity profiles (requires per-column entropy computation — deferred)
- Annotated feature display (requires GenBank/EMBL parsing — deferred)
- Zoom/scroll navigation, mouse interaction, genome reordering (deferred)
- XMFA writing, other format support (FASTA, GenBank, EMBL, etc.)
- Web Worker-based parsing for large files (deferred)

## Decisions

### Functional parser over stateful class
The Java parser uses a mutable state machine (`XMFAAlignment.java`). The TypeScript implementation uses a functional approach: `parseXmfa(content: string): XmfaAlignment` returns a fully immutable data structure. This aligns with project coding conventions (immutability-first) and simplifies testing.

**Alternatives considered:** Streaming parser with async iteration — rejected because XMFA files are read entirely via `FileReader.readAsText()` and typical genome alignment files are manageable in memory.

### D3.js for SVG rendering
D3 provides fine-grained control over SVG elements needed for genome panels, LCB blocks, connecting trapezoids, and rulers. It supports the data-driven update pattern needed for future interactive features (zoom, hover, click).

**Alternatives considered:** Canvas-based rendering — rejected because SVG provides better accessibility, CSS styling, and DOM-based interaction; Canvas would be considered later only for very large alignments where SVG performance degrades.

### Immutable readonly types
All data types use `readonly` arrays and properties. The parser builds mutable arrays internally and returns them as readonly. This prevents accidental mutation downstream while keeping parser internals simple.

### File size and parser bounds
A 500 MB file size limit is enforced before `FileReader.readAsText()`. The parser enforces 100K max blocks and 100M max characters per sequence segment. These bounds prevent browser tab crashes from crafted inputs.

## Risks / Trade-offs

- **[Large file UI freeze]** Parsing and rendering run synchronously on the main thread. Files over ~50 MB may cause noticeable UI freezes. → Mitigation: deferred to a future change using Web Workers.
- **[No similarity profiles]** The current visualization shows LCB blocks without the entropy-based similarity profile inside each block, which is a key visual feature of Mauve. → Mitigation: planned for a follow-up change once per-column alignment analysis is implemented.
- **[TypeScript 6 / eslint compatibility]** `typescript-eslint` does not officially support TypeScript 6. → Mitigation: installed with `--legacy-peer-deps`; functionally works but may need updating.
