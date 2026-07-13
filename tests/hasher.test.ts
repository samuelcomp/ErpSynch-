import { describe, it, expect, afterEach } from 'vitest';
import { hashFile, hashContent } from '../src/hasher.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Hasher', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hasher-test-'));

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('computes SHA-256 for a file', () => {
    const testFile = path.join(tmpDir, 'test.txt');
    fs.writeFileSync(testFile, 'hello world');
    const result = hashFile(testFile);
    expect(result).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('returns empty string for non-existent file', () => {
    expect(hashFile('/nonexistent')).toBe('');
  });

  it('hashContent returns consistent hash for same content', () => {
    expect(hashContent('hello')).toBe(hashContent('hello'));
    expect(hashContent('hello')).not.toBe(hashContent('world'));
  });
});
