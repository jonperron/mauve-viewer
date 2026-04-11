## 1. Spec update — EMBL format support

- [x] Replace stub EMBL requirement with full text covering FT feature extraction, complement/join location parsing, multi-record offset, qualifier reassembly, and silent skip of unparseable locations
- [x] Add scenario: Parse EMBL feature types
- [x] Add scenario: Parse EMBL complement location
- [x] Add scenario: Parse EMBL join location
- [x] Add scenario: Skip unparseable EMBL locations
- [x] Add scenario: Parse multi-record EMBL file
- [x] Add scenario: Extract EMBL qualifiers
- [x] Add scenario: Handle empty EMBL file

## 2. Spec update — INSDseq XML format support

- [x] Replace stub INSDseq requirement with full text covering DOMParser usage, multi-sequence offsets, interval resolution, iscomp detection, qualifier key validation
- [x] Add scenario: Parse INSDseq single record
- [x] Add scenario: Parse INSDseq multi-sequence file
- [x] Add scenario: Resolve multi-interval INSDseq feature
- [x] Add scenario: Detect reverse strand in INSDseq
- [x] Add scenario: Skip invalid INSDseq qualifier keys

## 3. Spec update — Raw format support

- [x] Replace stub raw requirement with full text covering character set, whitespace stripping, upper-case output, and precise error messages
- [x] Add scenario: Parse valid raw sequence
- [x] Add scenario: Strip whitespace from raw sequence
- [x] Add scenario: Reject empty raw sequence
- [x] Add scenario: Reject invalid raw sequence character

## 4. Spec update — Mauve compact alignment format

- [x] Replace stub Mauve requirement with full text covering segment token format, anchor-to-LCB conversion, XmfaAlignment output, and bounds enforcement
- [x] Add scenario: Parse Mauve anchor file
- [x] Add scenario: Convert Mauve anchors to LCBs
- [x] Add scenario: Reject malformed segment token
- [x] Add scenario: Reject anchor with fewer than 2 segments
- [x] Add scenario: Reject excessive anchor lines (100,000)
- [x] Add scenario: Reject excessive sequence count (10,000)
- [x] Add scenario: Reject empty Mauve file

## 5. Spec update — Auxiliary alignment output file parsing

- [x] Replace stub auxiliary requirement with full text covering all five parsers, shared normalizeDataLines behavior, and row limits
- [x] Add scenario: Parse backbone file
- [x] Add scenario: Reject oversized backbone file (10,000,000 rows)
- [x] Add scenario: Parse islands file
- [x] Add scenario: Reject invalid islands row
- [x] Add scenario: Parse identity matrix
- [x] Add scenario: Reject identity matrix with non-numeric values
- [x] Add scenario: Reject identity matrix missing header
- [x] Add scenario: Parse permutation file
- [x] Add scenario: Reject invalid permutation row
- [x] Add scenario: Parse LCB coordinate file
- [x] Add scenario: Reject invalid LCB coordinate row

## 6. Spec update — Newick guide tree parsing

- [x] Replace stub Newick requirement with full text covering recursive descent, depth limit, semicolon termination, and error cases
- [x] Add scenario: Parse simple Newick tree
- [x] Add scenario: Parse nested Newick tree
- [x] Add scenario: Reject missing Newick semicolon
- [x] Add scenario: Reject unbalanced Newick parentheses
- [x] Add scenario: Reject Newick tree exceeding depth limit (5,000)
- [x] Add scenario: Reject invalid Newick branch length

## 7. Spec update — Format auto-detection

- [x] Update requirement text to include .mauve/.mln → mauve and .insdc → xml mappings
- [x] Add scenario: Auto-detect Mauve format (.mauve, .mln)
- [x] Add scenario: Auto-detect raw format (.raw)
- [x] Add scenario: Auto-detect EMBL format (.embl)
- [x] Add scenario: Auto-detect INSDseq/XML format (.xml, .insdc)
- [x] Retain all existing format detection scenarios

## 8. Spec update — Multi-file loading / annotation routing

- [x] Update requirement text to include Mauve in alignment formats and EMBL/XML in annotation formats
- [x] Document annotation routing: genbank → parseGenbankMulti, embl → parseEmblMulti, xml → parseInsdseqMulti
- [x] Add scenario: Load Mauve alignment
- [x] Add scenario: Load EMBL annotation file
- [x] Add scenario: Load INSDseq annotation file
- [x] Retain all existing multi-file loading scenarios

## 9. Validation and archive

- [x] Run `openspec validate phase1-parsers`
- [x] Run `openspec archive phase1-parsers -y`
