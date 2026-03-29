/** Metadata header from an XMFA file */
export interface XmfaHeader {
  readonly formatVersion: string;
  readonly sequenceCount: number;
  readonly sequenceEntries: readonly SequenceEntry[];
}

/** Metadata about a single sequence/genome referenced in the XMFA header */
export interface SequenceEntry {
  readonly index: number;
  readonly file: string;
  readonly format: string;
  readonly annotationFile?: string;
  readonly annotationFormat?: string;
}

/** A single aligned segment within an alignment block */
export interface AlignedSegment {
  readonly sequenceIndex: number;
  readonly start: number;
  readonly end: number;
  readonly strand: '+' | '-';
  readonly sourceFile: string;
  readonly sequenceData: string;
}

/** An alignment block (set of aligned segments) separated by '=' in XMFA */
export interface AlignmentBlock {
  readonly segments: readonly AlignedSegment[];
  readonly comment?: string;
}

/**
 * A Locally Collinear Block: a maximal region of homology
 * shared between two or more genomes without rearrangements.
 */
export interface Lcb {
  readonly id: number;
  readonly left: readonly number[];
  readonly right: readonly number[];
  readonly reverse: readonly boolean[];
  readonly weight: number;
}

/** A genome with its name, length, and source info */
export interface Genome {
  readonly index: number;
  readonly name: string;
  readonly length: number;
  readonly format: string;
}

/** Complete parsed XMFA alignment */
export interface XmfaAlignment {
  readonly header: XmfaHeader;
  readonly blocks: readonly AlignmentBlock[];
  readonly lcbs: readonly Lcb[];
  readonly genomes: readonly Genome[];
}
