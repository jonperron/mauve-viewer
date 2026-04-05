/** Supported file formats for the viewer */
export type FileFormat =
  | 'xmfa'
  | 'genbank'
  | 'fasta'
  | 'json'
  | 'raw'
  | 'embl'
  | 'xml';

const EXTENSION_MAP: Readonly<Record<string, FileFormat>> = {
  '.xmfa': 'xmfa',
  '.alignment': 'xmfa',
  '.gbk': 'genbank',
  '.gb': 'genbank',
  '.genbank': 'genbank',
  '.fasta': 'fasta',
  '.fa': 'fasta',
  '.fna': 'fasta',
  '.faa': 'fasta',
  '.json': 'json',
  '.raw': 'raw',
  '.embl': 'embl',
  '.xml': 'xml',
};

/**
 * Detect file format from filename extension.
 * Per spec: .gbk → GenBank, .raw → raw, .embl → EMBL,
 * .xml → INSDseq, all others default to FASTA.
 */
export function detectFormat(filename: string): FileFormat {
  const lower = filename.toLowerCase();
  const dotIndex = lower.lastIndexOf('.');
  if (dotIndex === -1) return 'fasta';

  const ext = lower.slice(dotIndex);
  return EXTENSION_MAP[ext] ?? 'fasta';
}
