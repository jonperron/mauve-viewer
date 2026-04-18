## Why

The identity matrix computation specification was a minimal placeholder referencing only a CLI-based scenario. The feature has now been fully implemented as a web-based export with pairwise substitution divergence computation, backbone-based shared length calculation, and UI integration — the spec must reflect the actual implementation.

## What Changes

- Replace the placeholder identity matrix requirement with a full specification covering:
  - Pairwise substitution counting from alignment blocks (unambiguous bases only)
  - Shared backbone length computation from backbone segments
  - Divergence = substitutions / shared_backbone_length for all genome pairs
  - Upper-triangular N×N tab-delimited matrix output format
  - Fix for legacy Java bug where adenine substitutions were excluded
- Add UI integration: "Export Identity Matrix" button in Options panel, visible when backbone data is present
- Output file: `identity_matrix.tsv`

## Capabilities

### New Capabilities

### Modified Capabilities
- `analysis-export`: Replace placeholder identity matrix requirement with full specification matching the implemented feature

## Impact

- `src/export/identity-matrix/identity-matrix-export.ts` — new module with 5 exported functions
- `src/export/index.ts` — re-exports identity matrix functions/types
- `src/viewer/toolbar/options/options-panel.ts` — new export button
- `src/viewer/alignment-viewer.ts` — wiring of export callback
