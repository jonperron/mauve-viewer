export interface GenomeInterval {
  readonly leftEnd: number;
  readonly rightEnd: number;
}

export interface BackboneSegment {
  readonly seqIndex: number;
  readonly intervals: readonly GenomeInterval[];
  readonly isBackbone: boolean;
}

export interface IslandSegment {
  readonly genomeIndex: number;
  readonly start: number;
  readonly end: number;
  readonly label?: string;
}

export interface IdentityMatrix {
  readonly labels: readonly string[];
  readonly values: readonly (readonly number[])[];
}

export interface PermutationRow {
  readonly genomeLabel: string;
  readonly values: readonly number[];
}

export interface LcbBoundary {
  readonly genomeIndex: number;
  readonly lcbId: number;
  readonly left: number;
  readonly right: number;
  readonly strand: '+' | '-';
}