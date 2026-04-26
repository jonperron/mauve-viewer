# Contig Reordering

The Mauve Contig Mover (MCM) reorders the contigs of a draft genome relative to a reference genome. It aligns the draft against the reference using progressiveMauve, infers the optimal contig order and orientation from the alignment, then repeats until the order stabilises or the iteration limit is reached.

This feature requires a server deployment with the progressiveMauve binary.

## When to Use It

Use contig reordering when you have:

- A **complete or near-complete reference genome** (single chromosome or multiple replicons).
- A **draft assembly** consisting of unordered contigs.

The goal is to arrange the draft contigs in the most likely order given the reference, to facilitate downstream comparison or annotation.

## Required Files

| Role | Accepted formats | Notes |
|------|-----------------|-------|
| Reference genome | FASTA (`.fasta`, `.fa`, `.fna`), GenBank (`.gbk`, `.gb`), EMBL (`.embl`), raw (`.raw`) | Complete genome; used as the ordering template |
| Draft genome | FASTA (`.fasta`, `.fa`, `.fna`), GenBank (`.gbk`, `.gb`) | Must contain multiple contigs; GenBank requires a unique LOCUS tag per contig |

Exactly two files are required: one reference and one draft. Providing more than two files or omitting either is an error.

## How to Run

1. Load any alignment in the viewer (or open the viewer directly).
2. Open the **Tools** menu in the toolbar.
3. Click **Order Contigs**.
4. In the dialog:
   - Browse or drag and drop the reference genome file.
   - Browse or drag and drop the draft genome file.
   - Optionally adjust **Max iterations** (default: 15, range: 1–100).
5. Click **Start**.
6. The progress dialog shows the current iteration count. Click **Cancel** at any time to stop.
7. When the job completes, review the result summary showing which contigs were reversed, ordered, or flagged as conflicted.

## Output

For each completed iteration, the server writes output to a numbered subdirectory (`alignment1/`, `alignment2/`, …):

| File | Description |
|------|-------------|
| `*_contigs.tab` | Tab-separated table listing contigs to reverse, ordered contigs with pseudocoordinates, and contigs with conflicting placement |
| Reordered FASTA or GenBank | The draft sequence rewritten in the inferred order with reversed contigs complemented |
| `*_features.tab` | Adjusted annotation coordinates (GenBank draft input only) |

The final result is taken from the last completed iteration.

## Convergence and Cancellation

The process stops automatically when:

- A contig order repeats a previously seen arrangement (convergence), or
- The maximum number of iterations is reached.

If you cancel after at least one iteration, the output in `alignment1/` is still available and usable.

## Contig Classification

Each contig in the result belongs to one of three categories:

| Category | Meaning |
|----------|---------|
| Ordered | Contig was placed unambiguously relative to the reference |
| Reversed | Contig was placed but in reverse-complement orientation |
| Conflicted | Contig aligns to multiple non-adjacent reference regions; manual inspection required |

Unaligned contigs (no match to the reference) are appended at the end in their original input order.
