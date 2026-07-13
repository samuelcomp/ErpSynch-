import { describe, it, expect } from 'vitest';
import { SyncEngine } from '../src/sync-engine.js';
import { FileWatcher } from '../src/watcher.js';

describe('SyncEngine', () => {
  it('queues file changes for sync', () => {
    const watcher = new FileWatcher('/tmp');
    const engine = new SyncEngine('/tmp', [], { auto: false, intervalSeconds: 30, debounceMs: 2000, conflict: 'last-write-wins', encryption: 'none' }, watcher);
    engine.queueChange({ path: 'note.md', type: 'create', mtime: 1000 });
    expect(engine.pendingCount).toBe(1);
  });

  it('deduplicates same file', () => {
    const watcher = new FileWatcher('/tmp');
    const engine = new SyncEngine('/tmp', [], { auto: false, intervalSeconds: 30, debounceMs: 2000, conflict: 'last-write-wins', encryption: 'none' }, watcher);
    engine.queueChange({ path: 'note.md', type: 'modify', mtime: 1000 });
    engine.queueChange({ path: 'note.md', type: 'modify', mtime: 1001 });
    expect(engine.pendingCount).toBe(1);
  });
});
