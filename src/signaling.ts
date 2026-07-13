import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'peer-joined' | 'peer-left';
  from: string;
  to?: string;
  data?: any;
}

export class SignalingClient extends EventEmitter {
  public peerId: string;
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(serverUrl: string, peerId: string) {
    super();
    this.serverUrl = serverUrl;
    this.peerId = peerId;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.on('open', () => {
        this.send({ type: 'join', from: this.peerId });
        resolve();
      });

      this.ws.on('message', (raw: Buffer) => {
        try {
          const msg: SignalingMessage = JSON.parse(raw.toString());
          this.emit('message', msg);
        } catch {}
      });

      this.ws.on('close', () => {
        this.emit('disconnected');
        this.scheduleReconnect();
      });

      this.ws.on('error', (err) => {
        reject(err);
      });
    });
  }

  async send(message: SignalingMessage): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {});
    }, 5000);
  }
}
