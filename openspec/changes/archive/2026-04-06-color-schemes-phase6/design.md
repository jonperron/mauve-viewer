## Context

The viewer previously used a hardcoded D3 `schemeCategory20` palette (20 colors, modulo cycling) to color LCBs. The Java Mauve desktop application provides 8 color schemes computed via HSB color space, each revealing different alignment properties (positional relationships, genome conservation patterns, etc.). Phase 6 ports these algorithms to TypeScript.

## Goals / Non-Goals

**Goals:**
- Port 6 color scheme algorithms from Java Mauve (LCB, Offset, Normalized Offset, Multiplicity, Multiplicity Type, Normalized Multiplicity Type)
- Provide HSB-to-hex conversion matching Java's `Color.getHSBColor`
- Add a dropdown menu for switching color schemes at runtime
- Dynamic filtering of schemes based on alignment properties

**Non-Goals:**
- Backbone LCB and Backbone Multiplicity schemes (require backbone data — deferred)
- Color blind accessibility modes (not in legacy Mauve)

## Decisions

### HSB color conversion over RGB manipulation
HSB hue rotation is the core of all Java Mauve color schemes. Implementing `hsbToHex()` directly avoids dependency on color conversion libraries and matches Java's `Color.getHSBColor` exactly.

### Mutable color state in closure
`alignment-viewer.ts` holds `colors` and `currentSchemeId` as mutable `let` variables in the `renderAlignment` closure, which is an intentional exception to the project's immutability convention. This avoids unnecessary re-renders of the entire viewer when only colors change.

### HTML `<select>` over custom dropdown
A native `<select>` element was chosen over a custom dropdown for the color scheme menu. This provides accessibility for free and is consistent with simple UI needs.

### 62-sequence limit for multiplicity type schemes
The bitmask-based multiplicity type schemes use `2^genomeCount` possible types. Beyond 62 sequences, this exceeds JavaScript's safe integer range. The limit is enforced by both filtering (menu hides schemes) and throwing errors (scheme application rejects).

## Risks / Trade-offs

- [Precision] Floating-point differences between Java and JavaScript could produce slightly different colors for the same input → Mitigated by testing against known Java outputs
- [Backbone deferred] Two schemes from the spec are not yet available → Tracked as deferred in spec with clear prerequisite (backbone data support)

## Open Questions

_(none)_
