## Context

CDS error detection projects alignment-level differences (SNPs, gaps) onto annotated coding sequences to identify mutations that affect protein products. This mirrors the legacy Java `CDSErrorExporter` class and is the last major analysis export feature.

## Goals

- Detect all mutation types affecting CDS: frameshifts, premature stops, AA substitutions, insertion stops, gap segments
- Produce output compatible with the legacy Java format (tab-delimited, same columns)
- Integrate into the existing Options panel export button pattern

## Non-Goals

- Support for non-standard genetic codes (only NCBI table 1)
- Support for more than 2 genomes (pairwise only, matching legacy behavior)
- Batch processing of multiple alignments

## Decisions

1. **Codon splitting follows reference sequence**: Codons are delineated by counting 3 non-gap bases in the reference sequence, matching the Java `splitOnRefCodons()` approach. Assembly gaps within a reference codon are kept together.

2. **Standard genetic code only**: Translation uses a hardcoded codon table (NCBI translation table 1). IUPAC ambiguity codes in codons translate to `?`.

3. **CDS length filter**: Only CDS features with nucleotide length divisible by 3 are analyzed. This filters malformed annotations early.

4. **Error-only output**: Only CDS features with at least one error appear in the output. Clean CDS are omitted to keep the file focused.

5. **Visibility condition**: The button requires both alignment blocks and annotations, since CDS analysis needs both data sources.

## Risks

- Complex CDS spanning multiple alignment blocks may not be fully covered if the block boundaries split the CDS. The current implementation uses the first overlapping block.
- Reverse-strand CDS coordinate mapping depends on correct strand annotation in the alignment segments.
