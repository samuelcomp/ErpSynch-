import { WebSocketServer, WebSocket } from 'ws';

interface PeerConnection {
  ws: WebSocket;
  peerId: string;
}

const peers = new Map<string, PeerConnection>();
const port = parseInt(process.env.PORT || '9001', 10);

const wss = new WebSocketServer({ port });

wss.on('connection', (ws) => {
  let peerId: string | null = null;

  ws.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'join') {
        peerId = msg.from;
        peers.set(peerId, { ws, peerId });
        console.log(`Peer joined: ${peerId}`);
        return;
      }

      if (msg.to && peers.has(msg.to)) {
        const target = peers.get(msg.to)!;
        if (target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(raw.toString());
        }
      }
    } catch {}
  });

  ws.on('close', () => {
    if (peerId) {
      peers.delete(peerId);
      console.log(`Peer left: ${peerId}`);
    }
  });
});

console.log(`Signaling server running on port ${port}`);
