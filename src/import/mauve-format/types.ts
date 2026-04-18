import type { XmfaAlignment } from '../xmfa/types.ts';

export interface MauveAnchorSegment {
  readonly sequenceIndex: number;
  readonly start: number;
  readonly end: number;
  readonly strand: '+' | '-';
}

export interface MauveAnchor {
  readonly groupId: number;
  readonly segments: readonly MauveAnchorSegment[];
}

export interface MauveCompactAlignment {
  readonly format: 'mauve' | 'mln';
  readonly anchors: readonly MauveAnchor[];
}

export interface MauveParseResult {
  readonly compact: MauveCompactAlignment;
  readonly xmfa: XmfaAlignment;
}