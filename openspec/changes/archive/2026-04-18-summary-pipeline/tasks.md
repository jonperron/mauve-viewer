## 1. Core types and utilities

- [x] Define SummaryInterval, SummarySegment, SummaryOptions, SummaryInput, SummaryResult, ProcessedSegmentData types
- [x] Implement percentContained utility function
- [x] Define DEFAULT_SUMMARY_OPTIONS with legacy-compatible defaults

## 2. Segment processing

- [x] Implement multiplicity bitmask helpers (genomeToMask, allGenomesMask, multiplicityLabel)
- [x] Implement reference genome detection (findReferenceGenome)
- [x] Implement per-genome chain building with island gap filling (buildGenomeChain)
- [x] Implement typed ID assignment across all chains (assignIds)
- [x] Implement processSegments public API
- [x] Write segment-processor tests (10 tests)

## 3. Output formatters

- [x] Implement overview statistics formatter (formatOverview)
- [x] Implement island coordinate formatter (formatIslandCoordinates)
- [x] Implement island feature formatter (formatIslandFeatures)
- [x] Implement island gene feature formatter (formatIslandGeneFeatures)
- [x] Implement backbone gene feature formatter (reuses formatIslandGeneFeatures with isBackbone flag)
- [x] Implement trouble backbone detection and formatting (findTroubleBackbone, formatTroubleBackbone)
- [x] Implement partial FASTA extraction (extractPartialFasta)

## 4. Orchestration and export

- [x] Implement runSummaryPipeline orchestration function
- [x] Implement exportSummary browser download function
- [x] Write summary-export integration tests (20 tests)

## 5. Spec update

- [x] Update analysis-export spec with full summary pipeline requirement and scenarios
