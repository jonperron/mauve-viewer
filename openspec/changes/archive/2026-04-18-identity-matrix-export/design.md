## Context

The identity matrix export computes pairwise substitution divergence between all genomes in an alignment, using backbone segments to determine shared regions and alignment blocks to count substitutions. This replaces a placeholder spec that referenced only a CLI scenario from the legacy Java implementation.

## Goals

- Accurately compute pairwise divergence (substitutions / shared backbone length) for all genome pairs
- Produce upper-triangular tab-delimited output matching legacy format
- Fix legacy adenine substitution bug
- Integrate into the Options panel UI

## Non-Goals

- Distance-based phylogenetic tree construction (separate feature)
- Custom distance metrics or correction models (e.g., Jukes-Cantor)

## Decisions

1. **Module location**: `src/export/identity-matrix/` follows the existing export module pattern (snp, gap, homolog, permutation)
2. **Divergence metric**: Raw substitution count divided by shared backbone length, matching legacy Java `IdentityMatrix` behavior
3. **Backbone length from genome i**: When computing shared backbone length for pair (i, j), the interval length is taken from genome i's coordinates, consistent with legacy behavior
4. **Zero-length fallback**: Returns 0 instead of NaN when no shared backbone exists, since the button is only shown when backbone data is present
5. **Adenine bug fix**: The `isUnambiguousBase()` function treats A/C/G/T equally, unlike legacy `getBaseIdx()` which mapped A to index 0

## Risks

- None significant — the feature is self-contained and follows established patterns
