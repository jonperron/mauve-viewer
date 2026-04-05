import { describe, it, expect } from 'vitest';
import { detectFormat } from './index.ts';

describe('detectFormat', () => {
  it('detects XMFA format', () => {
    expect(detectFormat('alignment.xmfa')).toBe('xmfa');
    expect(detectFormat('data.alignment')).toBe('xmfa');
  });

  it('detects GenBank format', () => {
    expect(detectFormat('genome.gbk')).toBe('genbank');
    expect(detectFormat('genome.gb')).toBe('genbank');
    expect(detectFormat('genome.genbank')).toBe('genbank');
  });

  it('detects FASTA format', () => {
    expect(detectFormat('sequence.fasta')).toBe('fasta');
    expect(detectFormat('sequence.fa')).toBe('fasta');
    expect(detectFormat('sequence.fna')).toBe('fasta');
    expect(detectFormat('sequence.faa')).toBe('fasta');
  });

  it('detects JSON format', () => {
    expect(detectFormat('lcbs.json')).toBe('json');
  });

  it('detects raw format', () => {
    expect(detectFormat('sequence.raw')).toBe('raw');
  });

  it('detects EMBL format', () => {
    expect(detectFormat('sequence.embl')).toBe('embl');
  });

  it('detects XML format', () => {
    expect(detectFormat('sequences.xml')).toBe('xml');
  });

  it('defaults to FASTA for unrecognized extensions', () => {
    expect(detectFormat('file.txt')).toBe('fasta');
    expect(detectFormat('file.dat')).toBe('fasta');
    expect(detectFormat('file.seq')).toBe('fasta');
  });

  it('defaults to FASTA for files without extension', () => {
    expect(detectFormat('filename')).toBe('fasta');
  });

  it('is case-insensitive', () => {
    expect(detectFormat('genome.GBK')).toBe('genbank');
    expect(detectFormat('data.XMFA')).toBe('xmfa');
    expect(detectFormat('seq.FASTA')).toBe('fasta');
    expect(detectFormat('lcbs.JSON')).toBe('json');
  });

  it('handles paths with directories', () => {
    expect(detectFormat('/path/to/genome.gbk')).toBe('genbank');
    expect(detectFormat('data/alignment.xmfa')).toBe('xmfa');
  });

  it('uses last extension for multiple dots', () => {
    expect(detectFormat('genome.v2.gbk')).toBe('genbank');
    expect(detectFormat('data.backup.xmfa')).toBe('xmfa');
  });
});
