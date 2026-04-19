export {
  submitAlignment,
  getAlignmentStatus,
  cancelAlignment,
  getAlignmentResult,
  subscribeToProgress,
} from './api-client.ts';

export type {
  AlignmentAlgorithm,
  AlignmentClientConfig,
  AlignmentJobCreated,
  AlignmentJobStatus,
  AlignmentJobStatusResponse,
  AlignmentParams,
  AlignmentProgressEvent,
  AlignmentRequest,
  AlignmentSequenceInput,
  MauveAlignerParams,
  ProgressiveMauveParams,
} from './types.ts';
