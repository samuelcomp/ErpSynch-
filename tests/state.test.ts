import { describe, it, expect } from 'vitest';
import { SyncStateTracker } from '../src/state.js';

describe('SyncStateTracker', () => {
  it('tracks file state and detects changes', () => {
    const tracker = new SyncStateTracker();
    tracker.update('file.md', 'hash1', 1000);
    expect(tracker.hasChanged('file.md', 'hash2', 1001)).toBe(true);
  });

  it('returns false for unchanged file', () => {
    const tracker = new SyncStateTracker();
    tracker.update('file.md', 'samehash', 1000);
    expect(tracker.hasChanged('file.md', 'samehash', 999)).toBe(false);
  });

  it('returns all tracked paths', () => {
    const tracker = new SyncStateTracker();
    tracker.update('a.md', 'h1', 1);
    tracker.update('b.md', 'h2', 2);
    expect(tracker.getAllPaths().sort()).toEqual(['a.md', 'b.md']);
  });

  it('removes a tracked file', () => {
    const tracker = new SyncStateTracker();
    tracker.update('file.md', 'hash', 1000);
    tracker.remove('file.md');
    expect(tracker.size).toBe(0);
  });
});
