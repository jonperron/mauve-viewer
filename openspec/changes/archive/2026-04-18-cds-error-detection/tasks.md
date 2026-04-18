## 1. Core detection logic

- [x] Implement codon translation with standard genetic code (NCBI table 1)
- [x] Implement reference-based codon splitting (`splitOnRefCodons`)
- [x] Implement pairwise alignment extraction for CDS regions
- [x] Implement CDS analysis: frameshift, premature stop, AA substitution, gap segment, insertion stop detection
- [x] Implement error rate computation

## 2. Formatting and export

- [x] Implement TSV formatting with 10-column header
- [x] Implement dash placeholders for empty error fields
- [x] Implement `exportCdsErrors` pipeline function
- [x] Re-export types and functions from `src/export/index.ts`

## 3. UI integration

- [x] Add `onExportCdsErrors` callback to `OptionsCallbacks`
- [x] Add "Export CDS Errors" button to Options panel
- [x] Wire export callback in alignment viewer with visibility condition (blocks + annotations)
- [x] Download as `cds_errors.tsv` only when errors are detected

## 4. Testing

- [x] Unit tests for `translateCodon`
- [x] Unit tests for `splitOnRefCodons`
- [x] Unit tests for `extractPairwiseAlignment`
- [x] Unit tests for `analyzeCds` (all error types)
- [x] Unit tests for `detectCdsErrors` integration
- [x] Unit tests for `formatCdsErrors` output format
- [x] Unit tests for `exportCdsErrors` end-to-end

## 5. Specification

- [x] Update CDS error detection requirement in analysis-export spec
