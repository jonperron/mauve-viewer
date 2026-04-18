## Context

The legacy Mauve Java application provides positional ortholog export via `OneToOneOrthologExporter.java`. This reimplements the same algorithm as a pure TypeScript module operating on in-memory alignment, backbone, and annotation data structures.

## Goals

- Faithfully replicate the legacy backbone-based ortholog detection algorithm
- Provide configurable identity and coverage thresholds matching legacy defaults
- Support transitive closure grouping via DFS
- Produce tab-delimited output compatible with downstream analysis
- Integrate into the Options panel with appropriate visibility guards

## Non-Goals

- XMFA alignment output per ortholog group (deferred — listed as known limitation)
- Custom feature type selection UI (uses CDS default; parameters are configurable programmatically)
- Performance optimization for very large genomes (current O(n²) pairwise approach matches legacy)

## Decisions

1. **Backbone-based mapping**: Features are mapped across genomes using backbone segments rather than direct alignment column mapping. This matches the legacy approach and handles rearrangements correctly.
2. **Coordinate-span coverage**: Coverage is measured as the genomic coordinate span covered by the alignment, not the count of aligned columns. This matches the legacy `CdsOverlap.length_i/length_j` semantics.
3. **Bidirectional pairwise storage**: Ortholog pairs are stored bidirectionally (gI→gJ and gJ→gI) to simplify the transitive closure DFS traversal.
4. **DFS expansion**: Transitive closure uses iterative depth-first search with a stack to avoid recursion depth issues.
5. **Tab-delimited output**: Output uses `genome:locus_tag:left-right` format per member, tab-separated within groups, matching legacy output format.
6. **Visibility guard**: Button requires both `backbone.length > 0` and `annotations.size > 0`, wired in `alignment-viewer.ts`.

## Risks

- Large genomes with many features may be slow due to O(features² × genomes²) pairwise comparison. Mitigation: matches legacy behavior; can optimize later with spatial indexing if needed.
