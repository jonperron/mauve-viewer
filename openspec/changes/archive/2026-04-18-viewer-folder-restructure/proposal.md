## Why

The `src/viewer/` directory contained 15+ files at the root level, mixing rendering, interaction, and toolbar concerns. This refactoring organizes modules into `rendering/`, `interaction/`, and `toolbar/` subdirectories for better discoverability and separation of concerns.

## What Changes

- Rendering modules (`annotations.ts`, `feature-tooltip.ts`, `similarity-profile-renderer.ts`, `ungapped-match-renderer.ts`, `unaligned-regions.ts`) moved to `src/viewer/rendering/`
- New rendering modules (`panel-renderer.ts`, `connecting-lines.ts`, `panel-update.ts`) extracted from `alignment-viewer.ts` into `src/viewer/rendering/`
- Interaction modules (`cursor.ts`, `region-selection.ts`, `track-controls.ts`, `sequence-navigator.ts`, `shortcuts-help.ts`) moved to `src/viewer/interaction/`
- `alignment-viewer.ts` reduced from ~960 to ~560 lines
- No behavioral changes, no API changes, no new features

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `xmfa-viewer` — Module path references updated for relocated files

## Impact

- All imports referencing moved viewer modules updated
- No public API changes
- No behavioral changes
