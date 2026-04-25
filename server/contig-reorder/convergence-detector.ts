/**
 * Convergence detection for Mauve Contig Mover (MCM).
 *
 * Tracks the sequence of contig orderings across iterations and detects when
 * a previously seen arrangement repeats, indicating convergence.
 *
 * Mirrors: org.gel.mauve.contigs.ContigOrderer (past_orders tracking logic)
 */

/**
 * Detects convergence in MCM iterations by comparing contig orderings.
 * Convergence occurs when the current ordering matches any previous ordering.
 */
export class ConvergenceDetector {
  private seenOrders = new Set<string>();

  /**
   * Check if the given ordering has been seen before.
   * If it has not been seen, records it and returns false.
   * If it has been seen, returns true (convergence detected).
   *
   * @param ordering - Ordered list of contig names from this iteration
   * @returns true if this ordering repeats a previous one
   */
  check(ordering: readonly string[]): boolean {
    const key = ordering.join('\x00');
    if (this.seenOrders.has(key)) {
      return true;
    }
    this.seenOrders.add(key);
    return false;
  }

  /** Number of distinct orderings recorded so far */
  get iterationCount(): number {
    return this.seenOrders.size;
  }

  /** Reset the detector to its initial state */
  reset(): void {
    this.seenOrders = new Set<string>();
  }
}
