## 1. HSB color conversion

- [x] Implement `hsbToHex()` matching Java `Color.getHSBColor`
- [x] Add tests for known HSB-to-hex conversions

## 2. Color scheme algorithms

- [x] Implement LCB color scheme with 1/6 hue bump
- [x] Implement Offset color scheme with generalized offset
- [x] Implement Normalized Offset color scheme with rank ordering
- [x] Implement Multiplicity color scheme with cycled hue
- [x] Implement Multiplicity Type color scheme with bitmask
- [x] Implement Normalized Multiplicity Type color scheme
- [x] Add tests for all 6 color scheme algorithms

## 3. Color scheme API

- [x] Define `ColorScheme` interface and `ColorSchemeId` type
- [x] Export `COLOR_SCHEMES` registry
- [x] Implement `getAvailableSchemes()` with filtering for multiplicity type > 62 sequences
- [x] Implement `applyColorScheme()` by ID
- [x] Set `DEFAULT_COLOR_SCHEME_ID` to `'lcb'`

## 4. Color scheme menu UI

- [x] Implement `createColorSchemeMenu()` with native `<select>` dropdown
- [x] Place menu in controls bar
- [x] Wire `onSchemeChange` callback for live recoloring
- [x] Add `ColorSchemeMenuHandle` to `ViewerHandle`
- [x] Add CSS styles in `index.html`
- [x] Add tests for menu component

## 5. Viewer integration

- [x] Remove old D3 `schemeCategory20` palette and `assignLcbColors()`
- [x] Replace with `applyColorScheme()` call in `renderAlignment()`
- [x] Wire color scheme change to `rerenderPanels()`

## 6. Deferred items

- [ ] Implement Backbone LCB color scheme (blocked by backbone data support)
- [ ] Implement Backbone Multiplicity color scheme (blocked by backbone data support)
- [ ] Add backbone schemes to `getAvailableSchemes()` filtering
