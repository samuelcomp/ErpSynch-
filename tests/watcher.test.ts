import { describe, it, expect, afterEach } from 'vitest';
import { FileWatcher } from '../src/watcher.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('FileWatcher', () => {
  let testDir: string;

  afterEach(() => {
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
  });

  it('emits create event for new files', async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'watcher-test-'));
    const watcher = new FileWatcher(testDir);
    const events: any[] = [];

    watcher.on('change', (event) => events.push(event));
    await watcher.start();

    const testFile = path.join(testDir, 'note.md');
    fs.writeFileSync(testFile, 'hello');

    await new Promise((r) => setTimeout(r, 1000));

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].type).toBe('create');

    await watcher.stop();
  });

  it('ignores .obsidian directory', async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'watcher-ignore-'));
    const watcher = new FileWatcher(testDir, { ignore: ['.obsidian'] });
    const events: any[] = [];

    watcher.on('change', (e) => events.push(e));
    await watcher.start();

    fs.mkdirSync(path.join(testDir, '.obsidian'));
    fs.writeFileSync(path.join(testDir, '.obsidian', 'config'), 'data');
    fs.writeFileSync(path.join(testDir, 'real-note.md'), 'content');

    await new Promise((r) => setTimeout(r, 1000));

    const obsidianEvents = events.filter((e) => e.path.includes('.obsidian'));
    expect(obsidianEvents.length).toBe(0);
    expect(events.some((e) => e.path === 'real-note.md')).toBe(true);

    await watcher.stop();
  });
});
