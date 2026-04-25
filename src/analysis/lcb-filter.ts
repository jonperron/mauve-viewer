import type { Lcb } from '../import/xmfa/types.ts';

/**
 * Filter an LCB list by minimum weight threshold.
 * LCBs with weight strictly below minWeight are excluded.
 * Returns the original array unchanged when minWeight is 0 or negative.
 */
export function filterLcbsByWeight(lcbs: readonly Lcb[], minWeight: number): readonly Lcb[] {
  if (minWeight <= 0) return lcbs;
  return lcbs.filter((lcb) => lcb.weight >= minWeight);
}

/**
 * Compute the maximum LCB weight in a list.
 * Returns 0 for an empty list.
 */
export function maxLcbWeight(lcbs: readonly Lcb[]): number {
  if (lcbs.length === 0) return 0;
  return lcbs.reduce((max, lcb) => (lcb.weight > max ? lcb.weight : max), 0);
}

/**
 * Compute the minimum LCB weight in a list.
 * Returns 0 for an empty list.
 */
export function minLcbWeight(lcbs: readonly Lcb[]): number {
  if (lcbs.length === 0) return 0;
  return lcbs.reduce((min, lcb) => (lcb.weight < min ? lcb.weight : min), Infinity);
}
