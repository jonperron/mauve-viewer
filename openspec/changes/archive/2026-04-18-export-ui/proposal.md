## Why

Export actions that require user-configurable parameters (positional homolog export and summary pipeline) previously used hardcoded defaults. Users need the ability to tune thresholds before export. The summary export button also lacked a visibility condition.

## What Changes

- **Homolog export config dialog**: Clicking "Export Positional Orthologs" now opens a modal dialog where users configure identity range, coverage range, and feature type before exporting.
- **Summary export config dialog**: Clicking "Export Summary" now opens a modal dialog where users configure island min length, backbone min length, max length ratio, and min percent contained before exporting.
- **Summary export button visibility**: The "Export Summary" button is only visible when backbone data is loaded (`backbone.length > 0`).
- **Dialog stacking prevention**: Only one export config dialog can be open at a time; opening a new one destroys the previous.
- **Data-driven action buttons**: The Options panel renders export buttons from an ordered `ACTION_BUTTON_DEFS` array, each conditionally visible based on its callback being defined.

## Capabilities

### New Capabilities

### Modified Capabilities
- `analysis-export`: Add UI integration for summary pipeline (button visibility, config dialog), update positional homolog export UI to include config dialog, add dialog stacking prevention, document data-driven conditional button rendering.

## Impact

- `src/viewer/toolbar/options/options-panel.ts` — data-driven button rendering
- `src/viewer/toolbar/options/homolog-export-dialog.ts` — new dialog module
- `src/viewer/toolbar/options/summary-export-dialog.ts` — new dialog module
- `src/viewer/alignment-viewer.ts` — wiring dialogs and dialog lifecycle
