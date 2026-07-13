import { EventEmitter } from 'events';
import SimplePeer from 'simple-peer';
import { SignalingClient, SignalingMessage } from './signaling.js';

export interface TransportOptions {
  stunServers: string[];
  turnServers: string[];
}

export class Transport extends EventEmitter {
  private peer: SimplePeer.Instance | null = null;
  private signaling: SignalingClient;
  private initiator: boolean;

  constructor(signaling: SignalingClient, initiator: boolean, options: TransportOptions) {
    super();
    this.signaling = signaling;
    this.initiator = initiator;

    this.peer = new SimplePeer({
      initiator: this.initiator,
      trickle: true,
      config: {
        iceServers: [
          ...options.stunServers.map((url) => ({ urls: url })),
          ...options.turnServers.map((url) => ({ urls: url })),
        ],
      },
    });

    this.peer.on('signal', (data: any) => {
      const type = data.type === 'offer' ? 'offer' : data.type === 'answer' ? 'answer' : 'ice-candidate';
      this.signaling.send({
        type,
        from: this.signaling.peerId,
        data,
      });
    });

    this.peer.on('data', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.emit('message', message);
      } catch {}
    });

    this.peer.on('connect', () => {
      this.emit('connected');
    });

    this.peer.on('close', () => {
      this.emit('disconnected');
    });

    this.peer.on('error', (err: Error) => {
      this.emit('error', err);
    });

    this.signaling.on('message', (msg: SignalingMessage) => {
      if (msg.type === 'answer' || msg.type === 'ice-candidate') {
        this.peer?.signal(msg.data);
      }
    });
  }

  send(data: object): void {
    if (this.peer) {
      this.peer.send(JSON.stringify(data));
    }
  }

  destroy(): void {
    this.peer?.destroy();
    this.peer = null;
  }

  get connected(): boolean {
    return this.peer?.connected ?? false;
  }
}
