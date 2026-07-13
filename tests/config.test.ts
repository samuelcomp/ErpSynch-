import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('Config', () => {
  const validConfig = {
    peers: [{ id: 'test-pc', host: '192.168.1.1', port: 9001 }],
    vaults: [{ localPath: '/vaults/test', syncTo: '/remote/vaults/test', includeAiConfig: true }],
    sync: { auto: true, intervalSeconds: 30, debounceMs: 2000, conflict: 'last-write-wins', encryption: 'none' },
    transport: { type: 'webrtc' as const, stunServers: ['stun:stun.l.google.com:19302'], turnServers: [] },
  };

  it('loads and validates a valid config file', () => {
    const tmpFile = path.join(os.tmpdir(), 'test-config-' + Date.now() + '.yaml');
    fs.writeFileSync(tmpFile, JSON.stringify(validConfig));
    const config = loadConfig(tmpFile);
    expect(config.vaults.length).toBe(1);
    expect(config.sync.conflict).toBe('last-write-wins');
    fs.unlinkSync(tmpFile);
  });

  it('throws for empty config', () => {
    const tmpFile = path.join(os.tmpdir(), 'empty-config-' + Date.now() + '.yaml');
    fs.writeFileSync(tmpFile, JSON.stringify({}));
    expect(() => loadConfig(tmpFile)).toThrow();
    fs.unlinkSync(tmpFile);
  });
});
