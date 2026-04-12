## Why

The viewer has multiple keyboard shortcuts (zoom, pan, export, print, navigator) but no discoverable way for users to learn them. A help panel makes shortcuts visible on demand.

## What Changes

- **New shortcuts help panel**: A "?" button in the controls bar toggles a floating panel listing all keyboard shortcuts with their key bindings.
- **Controls bar order**: The controls bar now orders elements as: shortcuts help → navigation toolbar → color scheme menu → options panel.
- **ViewerHandle cleanup**: `shortcutsHelpHandle.destroy()` is called during viewer teardown.

## Capabilities

### New Capabilities

- `xmfa-viewer`: Keyboard shortcuts help panel requirement.

### Modified Capabilities

- `xmfa-viewer`: Controls bar element ordering in Navigation toolbar and Options panel requirements. ViewerHandle lifecycle includes shortcuts help cleanup.

## Impact

- New module `src/viewer/shortcuts-help.ts`.
- Controls bar element order changed (shortcuts help first, options panel last).
- ViewerHandle destroy includes shortcuts help cleanup.
