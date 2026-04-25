## Context

The MCM REST API (job submission, status polling, result retrieval) and the job manager were implemented in phases 7.1–7.2. Phases 7.3–7.4 add (a) the browser-side module tree that calls the API, parses outputs, and shows progress/results UI, and (b) the server-side algorithm modules that implement the contig-grouping and output-file logic originally written in Java.

## Goals / Non-Goals

**Goals:**
- Complete the client-side MCM workflow so a user can submit a job, watch progress, and view structured results
- Port three Java algorithm classes (`ContigGrouper`, `ContigOrderer` convergence logic, `ContigFeatureWriter`) to TypeScript without changing the observable output format
- Keep client types as a thin mirror of server types to avoid runtime drift

**Non-Goals:**
- Rendering the reordered genome in the alignment canvas (handled downstream by the viewer)
- GenBank annotation coordinate adjustment (`*_features.tab`) — deferred to a later phase
- Persistent UI state (progress dialogs are ephemeral, results dialogs are modal)

## Decisions

**Sequential polling via `setTimeout`**  
`setInterval` can queue overlapping requests if a status fetch is slow. `setTimeout` schedules the next poll only after the previous response arrives, preventing request pile-up on slow networks.

**HTML escaping in results viewer**  
Contig names come from user-supplied FASTA/GenBank input and must be HTML-escaped before insertion to prevent XSS. A local `escapeHtml()` helper is used rather than `textContent` assignment so that the full row HTML can be built as a string and injected once with `innerHTML`.

**`Set<string>` for convergence detection**  
Orderings are serialised to a null-byte-delimited string (`name\x00name…`) and stored in a `Set`. Null bytes cannot appear in valid contig names, making the key collision-free without a separator that could be confused with a name character.

**Tab file format fidelity**  
`generateContigsTab()` mirrors `ContigFeatureWriter` byte-for-byte (preamble text, column order, section names) so that downstream tools that parse `*_contigs.tab` continue to work unchanged.

**`MIN_LENGTH_RATIO` and `MAX_IGNORABLE_DIST` as named exports**  
The two algorithm constants are exported to allow unit tests to reference them symbolically and to simplify future tuning without grep-hunting magic numbers.

## Risks / Trade-offs

- [Risk] Preamble text drift — if the Java preamble changes in a future Mauve release, `tab-generator.ts` will produce different output.  
  → Mitigation: The preamble string is a named constant `PREAMBLE`; a single diff shows any divergence.

- [Risk] `parseContigsTab` silently ignores malformed rows — parsers errors are not surfaced to the user.  
  → Mitigation: Acceptable for a trusted server output; add explicit error reporting if third-party tab files are ever supported.

- [Risk] Progress dialog leaks if the caller never calls `destroy()`.  
  → Mitigation: The dialog attaches to a caller-provided container and `destroy()` is exposed via the returned handle; documentation notes the caller's responsibility.
