/** A single FASTA entry with header and sequence */
export interface FastaEntry {
  readonly header: string;
  readonly sequence: string;
}

/** Result of parsing a FASTA file */
export interface FastaResult {
  readonly entries: readonly FastaEntry[];
}
