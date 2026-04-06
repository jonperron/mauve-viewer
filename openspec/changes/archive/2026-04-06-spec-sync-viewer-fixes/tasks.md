## 1. Update region-selection spec

- [x] Add Escape key clearing scenario to "Region selection via Shift+click+drag" requirement
- [x] Rename existing "Clear selection" scenario to "Clear selection via programmatic call" for clarity

## 2. Update xmfa-viewer spec

- [x] Add Export Image action button scenario to "Options panel" requirement
- [x] Add Print action button scenario to "Options panel" requirement
- [x] Add action button separator scenario to "Options panel" requirement
- [x] Add pan clamping scenario to "Zoom and scroll navigation" requirement
- [x] Add translateExtent constraint text to "Zoom and scroll navigation" requirement description
- [x] Add Ctrl+scroll over cursor overlay scenario to "Mouse-based interaction" requirement
- [x] Add wheel event forwarding text to "Mouse-based interaction" requirement description

## 3. Validate and archive

- [x] Run `openspec validate spec-sync-viewer-fixes`
- [x] Run `openspec archive spec-sync-viewer-fixes -y`
