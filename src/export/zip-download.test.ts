import { describe, it, expect, vi } from 'vitest';
import { buildZipBlob, downloadZip } from './zip-download.ts';
import type { ZipEntry } from './zip-download.ts';

// ── buildZipBlob tests ───────────────────────────────────────────────────────

describe('buildZipBlob', () => {
  it('returns a Blob with application/zip type', () => {
    const entries: ZipEntry[] = [{ filename: 'test.txt', content: 'hello' }];
    const blob = buildZipBlob(entries);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/zip');
  });

  it('produces valid ZIP signature (PK\\x03\\x04)', async () => {
    const entries: ZipEntry[] = [{ filename: 'a.txt', content: 'data' }];
    const blob = buildZipBlob(entries);
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    expect(bytes[0]).toBe(0x50); // P
    expect(bytes[1]).toBe(0x4B); // K
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
  });

  it('includes end-of-central-directory signature', async () => {
    const entries: ZipEntry[] = [{ filename: 'x.txt', content: 'abc' }];
    const blob = buildZipBlob(entries);
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // EOCD signature: 0x06054B50 (little-endian: 50 4B 05 06)
    const eocdOffset = bytes.length - 22;
    expect(bytes[eocdOffset]).toBe(0x50);
    expect(bytes[eocdOffset + 1]).toBe(0x4B);
    expect(bytes[eocdOffset + 2]).toBe(0x05);
    expect(bytes[eocdOffset + 3]).toBe(0x06);
  });

  it('stores correct entry count in EOCD', async () => {
    const entries: ZipEntry[] = [
      { filename: 'a.txt', content: 'aaa' },
      { filename: 'b.txt', content: 'bbb' },
      { filename: 'c.txt', content: 'ccc' },
    ];
    const blob = buildZipBlob(entries);
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);

    const eocdOffset = buffer.byteLength - 22;
    // Entries on this disk (offset +8)
    expect(view.getUint16(eocdOffset + 8, true)).toBe(3);
    // Total entries (offset +10)
    expect(view.getUint16(eocdOffset + 10, true)).toBe(3);
  });

  it('handles empty content', async () => {
    const entries: ZipEntry[] = [{ filename: 'empty.txt', content: '' }];
    const blob = buildZipBlob(entries);
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Should still be a valid ZIP
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4B);
  });

  it('handles UTF-8 filenames', async () => {
    const entries: ZipEntry[] = [{ filename: 'données.txt', content: 'test' }];
    const blob = buildZipBlob(entries);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('handles UTF-8 content', async () => {
    const entries: ZipEntry[] = [{ filename: 'test.txt', content: 'résumé avec accents éàü' }];
    const blob = buildZipBlob(entries);
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // The content should be stored after the local file header
    expect(bytes[0]).toBe(0x50);
  });

  it('produces correct CRC-32 for known input', async () => {
    // CRC-32 of empty string is 0x00000000
    const entries: ZipEntry[] = [{ filename: 'e.txt', content: '' }];
    const blob = buildZipBlob(entries);
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    // CRC-32 is at offset 14 in local file header
    expect(view.getUint32(14, true)).toBe(0x00000000);
  });

  it('produces different blobs for different content', async () => {
    const blob1 = buildZipBlob([{ filename: 'a.txt', content: 'hello' }]);
    const blob2 = buildZipBlob([{ filename: 'a.txt', content: 'world' }]);
    const buf1 = new Uint8Array(await blob1.arrayBuffer());
    const buf2 = new Uint8Array(await blob2.arrayBuffer());

    // Same size structure but different content bytes
    let differ = false;
    for (let i = 0; i < buf1.length; i++) {
      if (buf1[i] !== buf2[i]) { differ = true; break; }
    }
    expect(differ).toBe(true);
  });

  it('handles many entries', () => {
    const entries: ZipEntry[] = Array.from({ length: 50 }, (_, i) => ({
      filename: `file_${i}.tab`,
      content: `data for file ${i}\n`,
    }));
    const blob = buildZipBlob(entries);
    expect(blob.size).toBeGreaterThan(0);
  });
});

// ── downloadZip tests ────────────────────────────────────────────────────────

describe('downloadZip', () => {
  it('creates and clicks an anchor element with correct filename', () => {
    vi.useFakeTimers();
    const clickSpy = vi.fn();
    const anchorMock = {
      href: '',
      download: '',
      style: { display: '' },
      click: clickSpy,
    } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchorMock as unknown as HTMLElement);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const entries: ZipEntry[] = [{ filename: 'data.txt', content: 'hello' }];
    downloadZip(entries, 'export.zip');

    expect(anchorMock.download).toBe('export.zip');
    expect(anchorMock.href).toBe('blob:test-url');
    expect(clickSpy).toHaveBeenCalledTimes(1);

    // Cleanup is deferred
    expect(revokeSpy).not.toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(revokeSpy).toHaveBeenCalledWith('blob:test-url');
    expect(removeSpy).toHaveBeenCalled();

    vi.useRealTimers();
    vi.restoreAllMocks();
  });
});
