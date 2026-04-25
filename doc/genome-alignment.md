# Genome Alignment

This guide explains how to run a new multi-genome alignment when your Mauve Viewer deployment enables the alignment feature and alignment server.

## Before You Start

Genome alignment requires a server deployment with native Mauve binaries.

- The server must expose alignment endpoints.
- The host running the server must provide mauveAligner and progressiveMauve binaries.
- You need at least 2 input sequences.

Supported sequence formats in the alignment dialog:

- fasta
- genbank
- embl
- raw

## Run a New Alignment

1. Open the alignment action in your viewer deployment.
2. In the Align Sequences dialog, add at least 2 sequences:
	- drag and drop files into the sequence area, or
	- click the drop zone to browse files.
3. Confirm or change each sequence format in the per-sequence format selector.
4. Choose the algorithm:
	- progressiveMauve (default), or
	- mauveAligner.
5. Configure shared parameters.
6. Configure algorithm-specific options.
7. Click Align.
8. Follow progress in the Alignment Progress dialog.
9. When the job completes, retrieve the XMFA (eXtended Multi-FastA) result and load it into the viewer.

## Shared Parameters

| Parameter | Description | Default |
|---|---|---|
| Default seed weight | Automatically chooses seed size from input genome lengths | enabled |
| Seed weight | Manual seed size when default mode is disabled (range 3-21) | 15 |
| Min LCB weight | Filters weak Locally Collinear Blocks (LCBs) below the threshold | default |
| Assume collinear genomes | Aligns as collinear when rearrangement detection is not needed | disabled |
| Full alignment | Runs gapped alignment refinement after LCB detection | enabled |

## Algorithm-Specific Options

### progressiveMauve

| Option | Effect | Default |
|---|---|---|
| Use seed families | Uses multiple spaced seed patterns for sensitivity | disabled |
| Iterative refinement | Runs extra refinement iterations | enabled |
| Sum-of-pairs LCB scoring | Scores LCBs using pairwise scheme; disable for ancestral scoring mode | enabled |

### mauveAligner

| Option | Effect | Default |
|---|---|---|
| Extend LCBs | Extends candidate LCBs before final filtering | enabled |

## Track Progress and Cancel Jobs

After submission, the progress dialog shows:

- current status message
- cumulative log output
- a Cancel button while the job is active

If you cancel:

- the server stops queued or running work
- the job transitions to cancelled
- you can close the dialog

## Common Errors

| Symptom | Typical Cause | What to Do |
|---|---|---|
| At least two sequences are required | Fewer than 2 sequences were submitted | Add one or more sequences |
| Invalid algorithm | Unsupported algorithm value | Use progressiveMauve or mauveAligner |
| Invalid sequence format | Unsupported format value | Switch format to fasta, genbank, embl, or raw |
| Result not available | Job is still running, failed, or cancelled | If running, wait for completion. If failed, adjust parameters or inputs and resubmit. If cancelled, submit again. |

## Related Guides

- [File Formats](file-formats.md)
- [Viewer](viewer.md)
- [Navigation](navigation.md)
- [Data Export](export.md)
