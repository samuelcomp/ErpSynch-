import { describe, it, expect } from 'vitest';
import { SignalingClient } from '../src/signaling.js';

describe('SignalingClient', () => {
  it('stores peer ID', () => {
    const client = new SignalingClient('ws://localhost:9001', 'test-peer');
    expect(client.peerId).toBe('test-peer');
  });

  it('fails to connect to non-existent server', async () => {
    const client = new SignalingClient('ws://localhost:1', 'test-peer');
    await expect(client.connect()).rejects.toThrow();
  });
});
