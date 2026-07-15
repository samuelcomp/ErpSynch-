import http from 'http';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { SyncEngine } from '../sync-engine.js';
import { AppConfig, VaultConfig } from '../types.js';
import { saveConfig, switchProfile } from '../config.js';
import { LocalDiscovery, DiscoveredPeer } from '../discovery.js';

const __dirname = import.meta.dirname;
const __projectRoot = path.resolve(__dirname, '../..');

interface LogEntry {
  time: string;
  type: 'sync' | 'conflict' | 'error' | 'info';
  message: string;
}

export class GuiServer {
  private server: http.Server;
  private wss: WebSocketServer;
  private engine: SyncEngine | null = null;
  private logs: LogEntry[] = [];
  private port: number;
  private config: AppConfig | null = null;
  private configPath: string = '';
  private clients: Set<WebSocket> = new Set();
  private discovery: LocalDiscovery | null = null;

  constructor(port = 3456) {
    this.port = port;
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
    this.wss = new WebSocketServer({ noServer: true });

    this.server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url || '/', `http://localhost:${port}`);
      if (url.pathname === '/ws') {
        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.clients.add(ws);
          ws.on('close', () => this.clients.delete(ws));
        });
      } else {
        socket.destroy();
      }
    });
  }

  setEngine(engine: SyncEngine): void {
    this.engine = engine;
    this.engine.on('synced', (msg: string) => this.addLog('sync', msg));
    this.engine.on('error', (err: Error) => this.addLog('error', err.message));
  }

  setConfig(config: AppConfig, configPath: string): void {
    this.config = config;
    this.configPath = configPath;
  }

  setDiscovery(discovery: LocalDiscovery): void {
    this.discovery = discovery;
    this.discovery.on('peer:discovered', (peer: DiscoveredPeer) => {
      this.addLog('info', `Discovered local peer: ${peer.id} at ${peer.host}:${peer.port}`);
    });
  }

  private addLog(type: LogEntry['type'], message: string): void {
    const entry: LogEntry = { time: new Date().toISOString(), type, message };
    this.logs.unshift(entry);
    if (this.logs.length > 50) this.logs.pop();
    const payload = JSON.stringify({ type: 'log', data: entry });
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }

  start(): void {
    this.server.listen(this.port, () => {
      console.log(`Dashboard: http://localhost:${this.port}`);
    });
  }

  stop(): void {
    this.wss.close();
    this.server.close();
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url || '/', `http://localhost:${this.port}`);
    const method = req.method || 'GET';

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (url.pathname === '/' && method === 'GET') {
      const htmlPath = path.join(__projectRoot, 'src', 'gui', 'dashboard.html');
      try {
        const html = fs.readFileSync(htmlPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch {
        res.writeHead(500);
        res.end('Dashboard not found');
      }
      return;
    }

    if (url.pathname === '/api/status' && method === 'GET') {
      const status = {
        running: true,
        pendingCount: this.engine?.pendingCount ?? 0,
        connected: (this.engine as any)?.transport?.connected ?? false,
        logs: this.logs.slice(0, 20),
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
      return;
    }

    if (url.pathname === '/api/sync' && method === 'POST') {
      this.engine?.triggerManualSync().then(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      }).catch((err) => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    if (url.pathname === '/api/logs' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.logs));
      return;
    }

    if (url.pathname === '/api/config' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.config || {}));
      return;
    }

    if (url.pathname === '/api/config' && method === 'PUT') {
      let body = '';
      req.on('data', (chunk) => body += chunk);
      req.on('end', () => {
        try {
          const updated = JSON.parse(body);
          if (this.config) {
            Object.assign(this.config, updated);
            saveConfig(this.config);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (e: any) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if (url.pathname === '/api/profile' && method === 'POST') {
      let body = '';
      req.on('data', (chunk) => body += chunk);
      req.on('end', () => {
        try {
          const { name } = JSON.parse(body);
          if (this.config) {
            switchProfile(this.config, name);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, activeProfile: this.config?.activeProfile }));
        } catch (e: any) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if (url.pathname === '/api/graph' && method === 'GET') {
      const data = this.buildGraph();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (url.pathname === '/api/peers' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.discovery ? this.discovery.getPeers() : []));
      return;
    }

    if (url.pathname === '/api/fs/list' && method === 'GET') {
      const dirParam = url.searchParams.get('dir') || 'C:\\Users';
      try {
        const targetDir = path.resolve(dirParam);
        const entries = fs.readdirSync(targetDir, { withFileTypes: true });
        const folders = entries
          .filter(e => e.isDirectory() && !e.name.startsWith('.'))
          .map(e => ({ name: e.name, path: path.join(targetDir, e.name) }));
        
        // Add parent directory link
        const parentPath = path.dirname(targetDir);
        if (parentPath !== targetDir) {
          folders.unshift({ name: '..', path: parentPath });
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ current: targetDir, folders }));
      } catch (e: any) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  }

  private buildGraph(): { nodes: { id: number; name: string; path: string }[]; links: { source: number; target: number }[] } {
    const vault = this.config?.vaults?.[0];
    if (!vault) return { nodes: [], links: [] };

    const files: { name: string; fullPath: string; relPath: string }[] = [];
    const walkDir = (dir: string) => {
      let entries: fs.Dirent[];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) { walkDir(fullPath); continue; }
        if (!e.name.endsWith('.md')) continue;
        files.push({ name: e.name.replace(/\.md$/, ''), fullPath, relPath: path.relative(vault.localPath, fullPath) });
      }
    };
    try { walkDir(vault.localPath); } catch { return { nodes: [], links: [] }; }

    const nameToId = new Map<string, number>();
    const nodes = files.map((f, i) => { nameToId.set(f.name, i); return { id: i, name: f.name, path: f.relPath }; });

    const linkSet = new Set<string>();
    for (let fi = 0; fi < files.length; fi++) {
      const file = files[fi];
      try {
        const content = fs.readFileSync(file.fullPath, 'utf-8');
        const matches = content.matchAll(/\[\[([^\]]+?)]]/g);
        for (const m of matches) {
          const target = m[1].split('|')[0].split('#')[0].trim();
          const targetId = nameToId.get(target);
          if (targetId !== undefined) {
            const key = `${fi}-${targetId}`;
            if (!linkSet.has(key)) { linkSet.add(key); }
          }
        }
      } catch {}
    }

    const links = [...linkSet].map(k => {
      const [s, t] = k.split('-').map(Number);
      return { source: s, target: t };
    });

    return { nodes, links };
  }
}
