## Context

Phase 8.3 adds `src/scoring/sequence-metrics.ts`, which computes sequence-level assembly quality metrics from a parsed XMFA alignment. The module is standalone and depends only on the XMFA import types.

## Goals

- Document the exact TypeScript interfaces and function signature so the spec is self-contained.
- Cover all boundary conditions exercised by the 25-test test suite.

## Non-Goals

- No changes to the scoring REST API or GUI (those are separate phases).
- No integration with annotation quality metrics (phase 8.4+).

## Decisions

- **Column-by-column analysis**: aligns naturally with XMFA block structure and avoids genome-wide coordinate mapping complexity.
- **ACGT-only SNPs**: ambiguous characters (N, R, Y, …) are ignored to avoid false SNP inflation on low-quality assemblies.
- **Gap-run merging**: produces fewer, more informative `GapLocation` entries than per-column reporting.
- **Multi-contig support**: each assembly segment is compared independently against the reference within the same block; counts are aggregated.

## Risks

- None: module is purely computational with no I/O or external dependencies.
