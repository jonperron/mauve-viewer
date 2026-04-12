## Context

The color-schemes spec included backbone LCB and backbone multiplicity color schemes marked as DEFERRED pending backbone data support. Backbone computation is now available via `computeBackbone` from `src/analysis/backbone/index.ts`, enabling implementation of these schemes.

## Goals

- Implement backbone LCB color scheme matching spec behavior (mauve for backbone, multiplicity type colors for subset).
- Implement backbone multiplicity color scheme with HSB cylindrical space partitioning, ported from Java BackboneMultiplicityColor.java.
- Integrate backbone data computation into the alignment viewer so backbone schemes are available automatically.
- Export `generateDistinctColors` and `BACKBONE_COLOR_SCHEMES` for reuse.

## Non-Goals

- Full backbone file parsing (backbone is computed from LCBs, not loaded from a separate file).
- Backbone visualization or rendering changes (this change is color-scheme-only).

## Decisions

1. **Backbone data computed from LCBs**: Rather than requiring a separate backbone file, backbone segments are computed from the alignment LCBs using `computeBackbone` with `minMultiplicity: 2`. This makes backbone schemes available for any XMFA alignment with LCBs.

2. **Separate BACKBONE_COLOR_SCHEMES registry**: Backbone schemes are exported in a dedicated `BACKBONE_COLOR_SCHEMES` array rather than merged into `COLOR_SCHEMES`, keeping the base schemes clean and making it clear which schemes require backbone data.

3. **Intentional divergence from Java BackboneLcbColor**: Java BackboneLcbColor propagates LCB colors to backbone segments. This implementation follows the spec more closely: mauve for backbone regions, multiplicity type colors for non-backbone.

4. **62-genome limit for backbone schemes**: Backbone schemes require multiplicity type bitmask computation, so they inherit the same 62-sequence limit as multiplicity type schemes.

## Risks

- Backbone computation overhead for large alignments. Mitigated by computing once on load.
