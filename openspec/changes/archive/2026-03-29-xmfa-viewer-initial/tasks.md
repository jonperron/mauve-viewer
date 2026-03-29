## 1. Project Setup

- [x] 1.1 Create feature branch `feat/xmfa-viewer`
- [x] 1.2 Install TypeScript, D3.js, and type definitions
- [x] 1.3 Configure tsconfig.json for web project with strict mode
- [x] 1.4 Configure ESLint with typescript-eslint
- [x] 1.5 Configure Vitest with jsdom environment and coverage

## 2. XMFA Parser

- [x] 2.1 Define immutable TypeScript types (XmfaAlignment, Lcb, Genome, AlignmentBlock, AlignedSegment)
- [x] 2.2 Write parser tests (header parsing, block parsing, LCB construction, genome extraction, error handling)
- [x] 2.3 Implement header metadata parser (format version, sequence entries, annotation references)
- [x] 2.4 Implement alignment block parser (defline parsing, multi-line sequence accumulation, block separation)
- [x] 2.5 Implement LCB construction from multi-sequence blocks (coordinates, strand, weight)
- [x] 2.6 Implement genome extraction from header and alignment data
- [x] 2.7 Add input validation (malformed deflines, incomplete headers, empty input, missing format version)
- [x] 2.8 Add parser bounds (100K block limit, 100M character limit per sequence, truncated error messages)

## 3. D3 Alignment Visualization

- [x] 3.1 Write visualization tests (SVG creation, panels, labels, blocks, connectors, rulers, re-render, custom config)
- [x] 3.2 Implement genome panel rendering (background, center line, genome label, coordinate ruler)
- [x] 3.3 Implement LCB block rendering (forward above / reverse below center line, color assignment)
- [x] 3.4 Implement connecting lines between adjacent genome panels (filled trapezoid connectors)
- [x] 3.5 Support configurable dimensions (width, panel height, gap, margins)

## 4. Web Entry Point

- [x] 4.1 Create index.html with drop zone and viewer container
- [x] 4.2 Implement drag-and-drop file loading with visual feedback
- [x] 4.3 Implement file picker fallback
- [x] 4.4 Add file size validation (500 MB limit)
- [x] 4.5 Add error display with safe textContent rendering

## 5. Quality Assurance

- [x] 5.1 Verify 80%+ test coverage (achieved 98%+)
- [x] 5.2 Pass TypeScript strict type checking with no errors
- [x] 5.3 Pass ESLint with no errors
- [x] 5.4 Code review: fix unsafe casts, immutability violations, function size
- [x] 5.5 Security review: fix file size limits, parser bounds, error message truncation
