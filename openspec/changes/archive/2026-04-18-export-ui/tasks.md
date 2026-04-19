## 1. Homolog export config dialog

- [x] Create `homolog-export-dialog.ts` with modal dialog for identity/coverage/feature-type configuration
- [x] Wire homolog export button to open dialog instead of using defaults
- [x] Add input clamping and validation for dialog fields
- [x] Add Cancel/Escape/backdrop dismissal

## 2. Summary export config dialog

- [x] Create `summary-export-dialog.ts` with modal dialog for summary pipeline options
- [x] Wire summary export button to open dialog
- [x] Add input clamping and validation for dialog fields
- [x] Add Cancel/Escape/backdrop dismissal

## 3. Options panel refactoring

- [x] Refactor button rendering to data-driven `ACTION_BUTTON_DEFS` array
- [x] Add `onExportSummary` callback to `OptionsCallbacks`
- [x] Ensure all 9 action buttons render conditionally

## 4. Dialog lifecycle management

- [x] Add `activeDialogHandle` to alignment viewer for stacking prevention
- [x] Set summary export button visibility to `backbone.length > 0`

## 5. Spec updates

- [x] Update positional homolog export requirement with config dialog UI
- [x] Update summary pipeline requirement with button visibility and config dialog UI
- [x] Add export button rendering requirement
