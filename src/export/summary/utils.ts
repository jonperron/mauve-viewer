/** Fraction of a feature's length that overlaps with a segment interval */
export function percentContained(
  featureLeft: number,
  featureRight: number,
  segLeft: number,
  segRight: number,
): number {
  const featureLen = featureRight - featureLeft + 1;
  if (featureLen <= 0) return 0;
  const overlapLeft = Math.max(featureLeft, segLeft);
  const overlapRight = Math.min(featureRight, segRight);
  const overlap = Math.max(0, overlapRight - overlapLeft + 1);
  return overlap / featureLen;
}
