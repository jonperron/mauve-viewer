# Genome Controls

Each genome panel in the viewer has controls for reordering, changing the reference genome, and hiding or showing panels.

## Reordering Genomes

Use the **Up** (▲) and **Down** (▼) buttons next to a genome panel to move it up or down in the display order. Reordering changes the visual layout only — it does not modify the alignment data. Connecting lines between panels update automatically to reflect the new order.

## Setting the Reference Genome

Click the **R** button next to a genome to set it as the reference. The reference genome determines the coordinate system and the orientation of LCB blocks:

- Blocks in the reference genome always appear on the forward strand (above the center line).
- Other genomes show their blocks oriented relative to the reference using XOR logic, so inversions relative to the reference are displayed on the reverse strand.

Changing the reference genome updates all panels and connecting lines accordingly.

## Hiding and Showing Genomes

Click the **Minus** (−) button to hide a genome panel. The panel collapses to a 20-pixel placeholder bar. Hidden panels:

- Do not display LCB blocks or annotations.
- Are skipped by connecting lines between adjacent visible panels.
- Are excluded from cross-track cursor display.

Click the **Plus** (+) button on a collapsed panel to restore it to full size.

You cannot hide the last visible genome — at least one panel must remain visible at all times.
