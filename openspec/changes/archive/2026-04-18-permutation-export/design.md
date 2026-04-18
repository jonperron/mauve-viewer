## Context

The permutation export feature converts LCB (Locally Collinear Block) arrangements into signed permutation format used by genome rearrangement analysis tools. This is implemented in `src/analysis/export/permutation-export.ts` and exported via `src/analysis/export/index.ts`.

## Goals

- Accurately represent LCB rearrangements as signed permutations
- Support genome subset selection via LCB projection
- Group LCBs by contig/chromosome boundaries when available
- Produce output compatible with BADGER, GRAPPA, MGR, GRIMM formats

## Non-Goals

- LCB splitting at contig boundaries (would require modifying alignment data)
- Circular chromosome annotation (Genome type lacks circular property)
- UI integration for triggering the export (handled separately)

## Decisions

### Pipeline architecture
The export follows a three-stage pipeline: `projectLcbs` → `computePermutations` → `formatPermutationOutput`, composed by the top-level `exportPermutations` function. Each stage is independently testable.

### LCB numbering
LCBs are numbered 1..N in the order they appear in the projected (filtered) list. This numbering is shared across all genomes. Per-genome permutation lines then reference these shared numbers sorted by each genome's positional order.

### Contig grouping strategy
Rather than splitting LCBs at contig boundaries (as the Java legacy does), LCBs are assigned to contigs based on their left position. This is simpler and avoids modifying alignment data, though it means LCBs spanning multiple contigs are assigned to the contig of their start position.

### Output format
Uses `$` as chromosome delimiter (GRIMM convention). Comma-separated signed integers within each chromosome group. Header comments use `#` prefix.

## Risks

- LCBs spanning contig boundaries may produce incorrect chromosome assignments if a large LCB starts in one contig and extends into the next.
- Tools expecting strict GRIMM format may require space-separated integers instead of comma-separated (current format uses commas).
