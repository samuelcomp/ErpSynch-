import { Bonjour, Service } from 'bonjour-service';
import { EventEmitter } from 'events';

export interface DiscoveredPeer {
  id: string;
  host: string;
  port: number;
  lastSeen: Date;
}

export class LocalDiscovery extends EventEmitter {
  private bonjour = new Bonjour();
  private service: any = null;
  private peers = new Map<string, DiscoveredPeer>();
  private peerId: string;
  private port: number;

  constructor(peerId: string, port: number) {
    super();
    this.peerId = peerId;
    this.port = port;
  }

  start() {
    // Broadcast this peer
    this.service = this.bonjour.publish({
      name: `ErpSynch-${this.peerId}`,
      type: 'erpsynch',
      port: this.port,
      txt: { id: this.peerId }
    });

    // Listen for other peers
    const browser = this.bonjour.find({ type: 'erpsynch' });
    
    browser.on('up', (service) => {
      const id = service.txt?.id;
      if (!id || id === this.peerId) return; // Skip self

      const host = service.addresses?.find(ip => !ip.includes(':')) || service.host; // Prefer IPv4
      if (!host) return;

      const peer: DiscoveredPeer = {
        id,
        host,
        port: service.port,
        lastSeen: new Date()
      };

      this.peers.set(id, peer);
      this.emit('peer:discovered', peer);
    });

    browser.on('down', (service) => {
      const id = service.txt?.id;
      if (id && this.peers.has(id)) {
        this.peers.delete(id);
        this.emit('peer:lost', id);
      }
    });

    // start browsing
    browser.start();
  }

  getPeers(): DiscoveredPeer[] {
    return Array.from(this.peers.values());
  }

  stop() {
    this.service?.stop();
    this.bonjour.destroy();
  }
}
