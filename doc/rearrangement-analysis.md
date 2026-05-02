# Rearrangement Analysis

Mauve Viewer provides several algorithms for analyzing genomic rearrangements from a loaded alignment: DCJ distance computation, GRIMM-style reversal analysis, backbone identification, similarity index computation, and recombination detection via WeakARG.

Backbone data is automatically used by the viewer's color schemes (see [Color Schemes](color-schemes.md)). DCJ, GRIMM, similarity, and WeakARG are developer APIs accessible programmatically; they are not yet exposed through the viewer toolbar.

## DCJ Distance

The Double Cut and Join (DCJ) distance measures the minimum number of genome rearrangement operations required to transform one genome arrangement into another. Mauve Viewer computes three related distances:

| Distance | Description |
|----------|-------------|
| DCJ | Double Cut and Join distance (Yancopoulos et al. 2005) |
| Breakpoint | Number of breakpoints between the two arrangements |
| SCJ | Single Cut or Join distance (Feijao & Meidanis 2011) |

For multi-genome alignments, all pairwise distances are computed and returned as a distance matrix.

**Limitations:** Very large alignments (more than 100,000 alignment blocks combined) are rejected to prevent excessive memory use.

## GRIMM Analysis

GRIMM-style analysis computes a reversal sorting scenario for a single linear chromosome. It reports:

| Result | Description |
|--------|-------------|
| Reversal distance | Minimum number of reversals to sort the permutation (single linear chromosome) |
| Cycle count | Number of alternating cycles in the breakpoint graph |
| Breakpoint count | Number of breakpoints in the permutation |
| Sorting scenario | A greedy (not necessarily minimal) sequence of reversals that sorts the permutation |

**Limitations:** Operates on the first contig of the permutation only. Does not handle multiple chromosomes, hurdles, or fortress structures. The sorting scenario is produced by a greedy heuristic and may not be optimal. Permutations larger than 100,000 elements are rejected.

## Backbone Computation

A backbone segment is a region of the alignment that is conserved across all genomes. Regions conserved in a subset of genomes form accessory regions (islands). Backbone computation produces:

- **Backbone segments** — LCB intervals conserved in all genomes, marked `isBackbone: true`
- **Islands** — Regions of a specific genome not covered by any backbone segment

You can filter backbone segments by a minimum weight threshold or a minimum multiplicity (minimum number of genomes that must share a segment for it to be included). The Backbone LCB and Backbone Multiplicity color schemes use backbone data to color the alignment view — see [Color Schemes](color-schemes.md) for details.

## WeakARG Recombination Detection

WeakARG detects recombination events by parsing a WeakARG XML file produced by an external recombination analysis tool. The file contains recombination edges with start/end positions, source/target node indices, and age values. Mauve Viewer produces per-genome histograms of:

- **Incoming recombination events** — Events where the genome is the recipient
- **Outgoing recombination events** — Events where the genome is the donor

The parser supports both the native WeakARG XML format and a pre-processed JSON cache format for faster reloading.

**Limitations:** Very large datasets (more than 10 million edges) are rejected. Parsing may be slow for large files due to the per-position tally approach.

## Similarity Index

The similarity index measures sequence conservation at each position across genomes. It produces per-genome conservation profiles that the viewer uses for similarity-based color schemes. The similarity index is computed automatically from the loaded alignment data.

## LCB Weight Filtering

LCBs with low alignment weight can be filtered out before analysis. Filtering by a minimum weight threshold removes spurious or low-confidence blocks. This affects all downstream analysis (DCJ distances, backbone computation, etc.) that operates on the filtered LCB set.
