/** A reversal operation on a signed permutation */
export interface Reversal {
  /** 0-based start index (inclusive) */
  readonly start: number;
  /** 0-based end index (inclusive) */
  readonly end: number;
}

/** Result of GRIMM-style rearrangement analysis */
export interface GrimmResult {
  /** Signed reversal distance (for single chromosome: n+1-c, assuming no hurdles) */
  readonly reversalDistance: number;
  /** Number of cycles in the breakpoint graph */
  readonly cycleCount: number;
  /** Number of breakpoints */
  readonly breakpointCount: number;
  /** Sorting scenario (sequence of reversals) — may not be minimal */
  readonly scenario: readonly Reversal[];
  /** Input permutation */
  readonly permutation: readonly number[];
}
