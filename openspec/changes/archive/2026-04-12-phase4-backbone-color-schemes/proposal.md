## Why

The backbone color schemes (Backbone LCB and Backbone Multiplicity) were previously deferred in the color-schemes spec pending backbone data support. Backbone computation is now available and both schemes have been implemented. The spec must be updated to reflect the current implementation and remove the DEFERRED status.

## What Changes

- Backbone LCB color scheme is now implemented: colors backbone segments in mauve (#9370DB), subset-conserved segments in multiplicity type colors.
- Backbone Multiplicity color scheme is now implemented: assigns maximally distinct colors via HSB cylindrical space partitioning based on genome presence/absence bitmask; N-way backbone always gets mauve.
- `generateDistinctColors` utility is exported for HSB cylindrical space color generation.
- `BACKBONE_COLOR_SCHEMES` is exported as a separate registry of backbone-requiring schemes.
- `getAvailableSchemes` and `applyColorScheme` accept optional backbone data parameter.
- Dynamic menu now includes backbone schemes when backbone data is available and genome count ≤ 62.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `color-schemes`: Remove DEFERRED status from backbone LCB and backbone multiplicity requirements. Add detail on `generateDistinctColors`, `BACKBONE_COLOR_SCHEMES` export, and backbone data parameter signatures.

## Impact

- `src/viewer/color-schemes.ts`: New backbone scheme implementations, `generateDistinctColors` export, `BACKBONE_COLOR_SCHEMES` export.
- `src/viewer/alignment-viewer.ts`: Backbone data computed from LCBs, passed to color scheme functions and menu.
