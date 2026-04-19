# Navigation

Mauve Viewer provides several ways to explore genome alignments: zooming, panning, a cross-track cursor, region selection, and a feature search interface.

## Zooming

You can zoom in and out to view the alignment at different scales, from a full-genome overview down to individual nucleotide positions.

| Action | Effect |
|--------|--------|
| Ctrl + Up | Zoom in 2x |
| Ctrl + Down | Zoom out 2x |
| Ctrl + Scroll wheel | Zoom in or out at the mouse position |
| Toolbar zoom buttons | Zoom in or out 2x |

The zoom range spans from 1x (full overview) to 100,000x (nucleotide level).

## Panning

Move the visible region left or right along the genome.

| Action | Effect |
|--------|--------|
| Drag | Pan by dragging directly on the alignment |
| Ctrl + Left | Scroll left by 10% of the visible region |
| Ctrl + Right | Scroll right by 10% of the visible region |
| Ctrl + Shift + Left | Scroll left by 20% of the visible region |
| Ctrl + Shift + Right | Scroll right by 20% of the visible region |
| Toolbar pan buttons | Scroll left or right |

## Cross-Track Cursor

When you hover over a genome panel, a black vertical bar appears at the cursor position. Corresponding vertical bars appear at the homologous positions in all other visible genomes. This lets you visually track how a position in one genome maps to the others through the alignment.

The information display shows:

- Genome name
- Nucleotide position
- LCB details (if hovering over a block)

When you hover over an LCB block, it is highlighted with a thicker stroke and higher opacity.

## Centering on Homologous Sites

Click on any position in a genome panel to smoothly center all panels on the corresponding homologous positions. The centering animation takes 300 milliseconds.

## Region Selection

You can select a rectangular region for visual highlighting.

1. Hold **Shift** and **drag** across a genome panel (minimum 5 pixels).
2. A solid-bordered highlight rectangle appears on the source panel.
3. Dashed-bordered rectangles appear on other panels at the corresponding homologous regions.

To clear the selection:

- **Shift + click** without dragging (less than 5 pixels of movement), or
- Press **Escape**.

The selection is purely visual and does not trigger automatic zooming.

<!-- screenshot: region selection with solid border on source panel and dashed borders on other panels -->

## Sequence Navigator

Press **Ctrl + I** to open the Sequence Navigator. This panel is only available when annotation files are loaded alongside the alignment.

### Find Features Tab

Search for genomic features by entering a query term and selecting search criteria.

**Search fields:**

- locus_tag
- gene
- product
- protein_id
- note
- db_xref

**Search modes:**

- **Exact** — Matches the full field value (case-insensitive)
- **Contains** — Matches any substring (case-insensitive)

**Scope:**

- All genomes (default)
- A specific genome

Results display up to 100 matches. Each result shows the feature type, genome, locus_tag, gene name, product, coordinates, and strand. If more than 100 matches exist, the overflow count is displayed.

Click a result to navigate the viewer to that feature's position.

### Go To Position Tab

Jump directly to a specific nucleotide coordinate.

1. Select a genome from the dropdown.
2. Enter a position number.
3. Press Enter or click the Go button.

Invalid or non-positive positions are rejected with an error message.
