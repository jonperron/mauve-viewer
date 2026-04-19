## Context

Phase 6.2 of the Mauve Viewer project implements the alignment parameter UI. The server API (Phase 6.1) and client API functions already exist. This change adds the user-facing dialog that collects alignment configuration and feeds it to the client API.

## Goals

- Provide a complete alignment configuration UI matching legacy Java Mauve's `AlignFrame` dialogs
- Use native `<dialog>` element consistent with existing export dialogs
- Support pre-loaded sequences and runtime file addition via drag-and-drop
- Return structured data compatible with the existing `AlignmentRequest` type

## Non-Goals

- Job progress display (separate feature)
- Integration with the toolbar or menu system (wiring concern, not dialog concern)

## Decisions

1. **Native `<dialog>` element** — Consistent with existing export dialogs; no dependency on external modal libraries
2. **Format detection from file extension** — Simple heuristic matching legacy behavior; defaults to fasta for unknown extensions
3. **Shared + algorithm-specific fieldsets** — Algorithm selection toggles visibility of relevant fieldsets, mirroring legacy Java's separate `AlignFrame` subclasses
4. **Seed weight clamping** — Values outside 3–21 are clamped rather than rejected, matching the numeric input constraints
5. **CSS reuse** — Dialog reuses `.export-dialog-content` and `.export-actions` classes from export dialogs

## Risks

- File reading via `File.text()` may fail for very large genomes; current implementation silently ignores read failures
