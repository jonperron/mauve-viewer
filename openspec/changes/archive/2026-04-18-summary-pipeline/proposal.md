## Why

The summary pipeline requirement in the analysis-export spec was a minimal placeholder with a single CLI-oriented scenario. The full implementation now covers segment processing, overview statistics, island coordinate/feature/gene output, trouble backbone detection, and partial FASTA extraction — all as in-browser exports. The spec must reflect the actual implemented capabilities.

## What Changes

- **MODIFIED** Summary pipeline requirement: expanded from a single scenario to full coverage of all output types, configurable options, segment processing logic, and browser-based file download
- Detailed island identification with per-genome chains and typed IDs (backbone `b_`, island `i_`, partial `b_i_`)
- Overview statistics: gene counts by multiplicity, segment/bp statistics per genome
- Island coordinate output with signed coordinates for reverse-strand segments
- Per-genome island feature files importable into Mauve
- Per-genome island gene and backbone gene files with overlap percentages
- Trouble backbone detection: identifies segments with high length variance across genomes
- Partial FASTA extraction from alignment blocks for specified regions
- Configurable options: island minimum length, backbone minimum length, max length ratio, minimum percent contained

## Capabilities

### New Capabilities

_(none — all changes are within the existing analysis-export capability)_

### Modified Capabilities

- **analysis-export**: Replaces the placeholder summary pipeline requirement with detailed requirements and scenarios covering all implemented outputs

## Impact

- `src/export/summary/` — new module with 8 source files
- `src/export/index.ts` — re-exports summary pipeline
- No breaking changes to existing exports
