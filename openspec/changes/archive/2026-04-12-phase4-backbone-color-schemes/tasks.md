## 1. Backbone Color Scheme Implementation

- [x] Implement `generateDistinctColors` using HSB cylindrical space partitioning
- [x] Implement backbone LCB color scheme (mauve for backbone, multiplicity type for subset)
- [x] Implement backbone multiplicity color scheme (distinct colors by bitmask, N-way = mauve)
- [x] Export `BACKBONE_COLOR_SCHEMES` registry with `requiresBackbone: true`
- [x] Add `backbone-lcb` and `backbone-multiplicity` to `ColorSchemeId` type

## 2. Integration

- [x] Update `getAvailableSchemes` to accept optional backbone parameter
- [x] Update `applyColorScheme` to accept optional backbone parameter
- [x] Compute backbone data from LCBs in alignment viewer on load
- [x] Include backbone schemes in dynamic menu when backbone data available and genomes ≤ 62

## 3. Spec Update

- [x] Remove DEFERRED status from backbone LCB and backbone multiplicity requirements
- [x] Add requirement for `generateDistinctColors` export
- [x] Add requirement for `BACKBONE_COLOR_SCHEMES` registry
- [x] Update dynamic menu requirement to include backbone data parameter and auto-computation
