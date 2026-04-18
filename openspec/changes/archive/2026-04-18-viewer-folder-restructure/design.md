## Context

The `src/viewer/` directory accumulated 15+ modules at the root level. This restructuring groups them by concern into `rendering/`, `interaction/`, and `toolbar/` subdirectories.

## Goals

- Improve code discoverability by grouping related modules
- Reduce `alignment-viewer.ts` size by extracting rendering functions

## Non-Goals

- No behavioral changes
- No API changes
- No new features

## Decisions

1. **Three subdirectories**: `rendering/` for visual output, `interaction/` for user input handling, `toolbar/` for navigation controls (already existed)
2. **Extract from alignment-viewer**: Panel rendering, connecting lines, and panel update logic extracted into `rendering/` as new modules
3. **Move existing modules**: Files moved to appropriate subdirectory based on their concern

## Risks

- None — pure structural refactoring with updated imports
