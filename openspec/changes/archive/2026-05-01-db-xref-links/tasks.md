## 1. New module

- [x] Create `src/viewer/rendering/db-xref-links.ts` with `DbXrefLink` interface, `resolveDbXrefLink`, and `parseDbXrefLinks`

## 2. Feature tooltip integration

- [x] Import and use `parseDbXrefLinks` in `src/viewer/rendering/feature-tooltip.ts`
- [x] Render `db_xref` entries as `<a target="_blank" rel="noopener noreferrer">` links in `buildDetailContent`
- [x] Exclude `db_xref` from generic "other qualifiers" display
- [x] Include protein ID in NCBI Protein link label

## 3. Tests

- [x] 22 unit tests for `db-xref-links.ts` covering all databases, edge cases, and URL encoding
- [x] 7 new tests in `feature-tooltip.test.ts` for tooltip rendering with cross-reference links
