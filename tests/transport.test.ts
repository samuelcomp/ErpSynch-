import { describe, it, expect } from 'vitest';
import { Transport } from '../src/transport.js';
import { SignalingClient } from '../src/signaling.js';

describe('Transport', () => {
  it('creates a transport instance', () => {
    const signaling = new SignalingClient('ws://localhost:9001', 'test-peer');
    const transport = new Transport(signaling, true, {
      stunServers: ['stun:stun.l.google.com:19302'],
      turnServers: [],
    });
    expect(transport.connected).toBe(false);
    transport.destroy();
  });
});
