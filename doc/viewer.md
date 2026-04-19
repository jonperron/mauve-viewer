# Viewer

The Mauve Viewer displays multi-genome alignments as a set of stacked horizontal panels with colored blocks representing conserved regions. This page describes the visual layout and the three available display modes.

## Multi-Panel Layout

Each genome in the alignment occupies its own horizontal panel. Panels are stacked vertically with the following elements:

- **Position ruler** — A horizontal scale showing nucleotide positions along the genome.
- **Center line** — A horizontal line dividing the panel into forward and reverse strand areas.
- **Locally Collinear Blocks (LCBs)** — Colored rectangular blocks representing conserved sequence regions. Blocks above the center line are on the forward strand; blocks below are on the reverse strand.
- **Connecting lines** — Trapezoid shapes drawn between adjacent panels linking homologous blocks. These lines show which regions in one genome correspond to regions in the next.

When you reorder genomes or change the reference genome, connecting lines update automatically. See [Genome Controls](genome-controls.md).

## Display Modes

You can switch between three display modes using the selector in the navigation toolbar. Switching modes resets the zoom level.

### LCB Mode

The default mode. Each LCB appears as a colored bounding box spanning its genomic coordinates. Connecting lines link homologous blocks between genomes. This mode gives a high-level overview of genome structure, rearrangements, and conservation.

### Ungapped Match Mode

Displays individual ungapped matches as thin colored rectangles (8 pixels high). No connecting lines are drawn between panels. This mode is useful for examining fine-grained match patterns within and between LCBs.

### Similarity Profile Mode

Displays conservation as area charts within each panel. The profile height at each position reflects sequence similarity (based on Shannon entropy) across all genomes in the alignment. Higher peaks indicate more conserved regions. This mode is useful for identifying variable and conserved regions at a glance.

<!-- screenshot: three display modes side by side — LCB, Ungapped Match, Similarity Profile -->

## Hidden Genomes

You can hide individual genome panels to simplify the display. Hidden panels appear as a collapsed 20-pixel bar. Connecting lines skip hidden panels. See [Genome Controls](genome-controls.md) for details.
