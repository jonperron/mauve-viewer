/**
 * Minimal ZIP file creation (STORE method, no compression) and download.
 * Follows PKWare APPNOTE 6.3.3 format specification.
 * Suitable for bundling multiple text-based export files.
 */

/** A single entry to include in the ZIP archive */
export interface ZipEntry {
  readonly filename: string;
  readonly content: string;
}

// ── CRC-32 computation (ISO 3309 / ITU-T V.42) ──────────────────────────────

/** Precomputed CRC-32 lookup table */
const CRC_TABLE: readonly number[] = buildCrcTable();

function buildCrcTable(): readonly number[] {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table.push(c);
  }
  return table;
}

/** Compute CRC-32 for a Uint8Array */
function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]!) & 0xFF]! ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ── ZIP structure helpers ────────────────────────────────────────────────────

/** Write a 16-bit little-endian value into a DataView */
function writeU16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

/** Write a 32-bit little-endian value into a DataView */
function writeU32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true);
}

/** Encode a string to UTF-8 bytes */
function encodeUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// ── Local file header (30 bytes + filename) ──────────────────────────────────

const LOCAL_HEADER_SIGNATURE = 0x04034B50;
const LOCAL_HEADER_FIXED_SIZE = 30;

function localHeaderSize(filenameBytes: Uint8Array): number {
  return LOCAL_HEADER_FIXED_SIZE + filenameBytes.length;
}

function writeLocalHeader(
  view: DataView,
  offset: number,
  filenameBytes: Uint8Array,
  crc: number,
  size: number,
  buffer: Uint8Array,
): number {
  writeU32(view, offset, LOCAL_HEADER_SIGNATURE);
  writeU16(view, offset + 4, 20);    // version needed: 2.0
  writeU16(view, offset + 6, 0x0800); // general purpose bit flag: UTF-8
  writeU16(view, offset + 8, 0);     // compression method: STORE
  writeU16(view, offset + 10, 0);    // mod time
  writeU16(view, offset + 12, 0);    // mod date
  writeU32(view, offset + 14, crc);
  writeU32(view, offset + 18, size); // compressed size
  writeU32(view, offset + 22, size); // uncompressed size
  writeU16(view, offset + 26, filenameBytes.length);
  writeU16(view, offset + 28, 0);   // extra field length

  buffer.set(filenameBytes, offset + LOCAL_HEADER_FIXED_SIZE);

  return offset + LOCAL_HEADER_FIXED_SIZE + filenameBytes.length;
}

// ── Central directory header (46 bytes + filename) ───────────────────────────

const CENTRAL_DIR_SIGNATURE = 0x02014B50;
const CENTRAL_DIR_FIXED_SIZE = 46;

function centralDirEntrySize(filenameBytes: Uint8Array): number {
  return CENTRAL_DIR_FIXED_SIZE + filenameBytes.length;
}

function writeCentralDirEntry(
  view: DataView,
  offset: number,
  filenameBytes: Uint8Array,
  crc: number,
  size: number,
  localHeaderOffset: number,
  buffer: Uint8Array,
): number {
  writeU32(view, offset, CENTRAL_DIR_SIGNATURE);
  writeU16(view, offset + 4, 20);    // version made by: 2.0
  writeU16(view, offset + 6, 20);    // version needed: 2.0
  writeU16(view, offset + 8, 0x0800); // general purpose bit flag: UTF-8
  writeU16(view, offset + 10, 0);    // compression method: STORE
  writeU16(view, offset + 12, 0);    // mod time
  writeU16(view, offset + 14, 0);    // mod date
  writeU32(view, offset + 16, crc);
  writeU32(view, offset + 20, size); // compressed size
  writeU32(view, offset + 24, size); // uncompressed size
  writeU16(view, offset + 28, filenameBytes.length);
  writeU16(view, offset + 30, 0);   // extra field length
  writeU16(view, offset + 32, 0);   // file comment length
  writeU16(view, offset + 34, 0);   // disk number start
  writeU16(view, offset + 36, 0);   // internal file attributes
  writeU32(view, offset + 38, 0);   // external file attributes
  writeU32(view, offset + 42, localHeaderOffset);

  buffer.set(filenameBytes, offset + CENTRAL_DIR_FIXED_SIZE);

  return offset + CENTRAL_DIR_FIXED_SIZE + filenameBytes.length;
}

// ── End of central directory (22 bytes) ──────────────────────────────────────

const END_CENTRAL_DIR_SIGNATURE = 0x06054B50;
const END_CENTRAL_DIR_SIZE = 22;

function writeEndOfCentralDir(
  view: DataView,
  offset: number,
  entryCount: number,
  centralDirSize: number,
  centralDirOffset: number,
): void {
  writeU32(view, offset, END_CENTRAL_DIR_SIGNATURE);
  writeU16(view, offset + 4, 0);           // disk number
  writeU16(view, offset + 6, 0);           // central dir start disk
  writeU16(view, offset + 8, entryCount);  // entries on this disk
  writeU16(view, offset + 10, entryCount); // total entries
  writeU32(view, offset + 12, centralDirSize);
  writeU32(view, offset + 16, centralDirOffset);
  writeU16(view, offset + 20, 0);          // comment length
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Build a ZIP archive as a Blob from the given entries */
export function buildZipBlob(entries: readonly ZipEntry[]): Blob {
  // Precompute all entry data
  const prepared = entries.map((entry) => {
    const filenameBytes = encodeUtf8(entry.filename);
    const contentBytes = encodeUtf8(entry.content);
    const crc = crc32(contentBytes);
    return { filenameBytes, contentBytes, crc };
  });

  // Calculate total buffer size
  let totalSize = 0;

  // Local headers + data
  for (const p of prepared) {
    totalSize += localHeaderSize(p.filenameBytes) + p.contentBytes.length;
  }

  const centralDirOffset = totalSize;

  // Central directory entries
  let centralDirSize = 0;
  for (const p of prepared) {
    centralDirSize += centralDirEntrySize(p.filenameBytes);
  }
  totalSize += centralDirSize;

  // End of central directory
  totalSize += END_CENTRAL_DIR_SIZE;

  // Allocate and fill buffer
  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);
  let offset = 0;
  const localOffsets: number[] = [];

  // Write local headers + file data
  for (const p of prepared) {
    localOffsets.push(offset);
    offset = writeLocalHeader(view, offset, p.filenameBytes, p.crc, p.contentBytes.length, buffer);
    buffer.set(p.contentBytes, offset);
    offset += p.contentBytes.length;
  }

  // Write central directory
  for (let i = 0; i < prepared.length; i++) {
    const p = prepared[i]!;
    offset = writeCentralDirEntry(
      view, offset, p.filenameBytes, p.crc, p.contentBytes.length, localOffsets[i]!, buffer,
    );
  }

  // Write end of central directory
  writeEndOfCentralDir(view, offset, prepared.length, centralDirSize, centralDirOffset);

  return new Blob([buffer], { type: 'application/zip' });
}

/** Download multiple text files as a single ZIP archive */
export function downloadZip(entries: readonly ZipEntry[], zipFilename: string): void {
  const blob = buildZipBlob(entries);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFilename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Defer cleanup so the browser can start the download before the blob URL is revoked
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}
