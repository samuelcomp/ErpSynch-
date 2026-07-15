import { EventEmitter } from 'events';
import { FileWatcher, WatcherEvent } from './watcher.js';
import { hashContent } from './hasher.js';
import { SyncStateTracker } from './state.js';
import { Transport } from './transport.js';
import { VaultConfig, AppConfig } from './types.js';
import fs from 'fs';
import path from 'path';

export interface SyncMessage {
  type: 'file-change';
  vaultIndex: number;
  relPath: string;
  changeType: 'create' | 'modify' | 'delete';
  content?: string;
  hash: string;
  mtime: number;
}

export class SyncEngine extends EventEmitter {
  private watcher: FileWatcher;
  private state: SyncStateTracker;
  private transport: Transport | null = null;
  private vaults: VaultConfig[];
  private pendingQueue: Map<string, WatcherEvent> = new Map();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private processing = false;
  private basePath: string;
  private syncConfig: AppConfig['sync'];

  constructor(basePath: string, vaults: VaultConfig[], syncConfig: AppConfig['sync'], watcher: FileWatcher) {
    super();
    this.basePath = basePath;
    this.vaults = vaults;
    this.syncConfig = syncConfig;
    this.watcher = watcher;
    this.state = new SyncStateTracker();
  }

  setTransport(transport: Transport): void {
    this.transport = transport;
    this.transport.on('message', (msg: SyncMessage) => this.handleRemoteMessage(msg));
    this.transport.on('connected', () => this.flushPending());
  }

  async start(): Promise<void> {
    this.watcher.on('change', (event: WatcherEvent) => this.queueChange(event));
    await this.watcher.start();

    if (this.syncConfig.auto) {
      this.syncTimer = setInterval(() => this.flushPending(), this.syncConfig.intervalSeconds * 1000);
    }
  }

  queueChange(event: WatcherEvent): void {
    this.pendingQueue.set(event.path, event);
  }

  get pendingCount(): number {
    return this.pendingQueue.size;
  }

  async flushPending(): Promise<void> {
    if (this.processing || !this.transport?.connected) return;
    this.processing = true;

    for (const [relPath, event] of this.pendingQueue) {
      const fullPath = path.join(this.basePath, relPath);
      let content: string | undefined;
      let hash = '';

      if (event.type !== 'delete') {
        try {
          const buf = fs.readFileSync(fullPath);
          content = buf.toString('base64');
          hash = hashContent(buf);
        } catch {
          continue;
        }
      }

      const msg: SyncMessage = {
        type: 'file-change',
        vaultIndex: 0,
        relPath,
        changeType: event.type,
        content,
        hash,
        mtime: event.mtime,
      };

      this.transport.send(msg);
      this.state.update(relPath, hash, event.mtime);
    }

    this.pendingQueue.clear();
    this.processing = false;
  }

  private handleRemoteMessage(msg: SyncMessage): void {
    const vault = this.vaults[msg.vaultIndex];
    if (!vault) return;

    const targetPath = path.join(vault.syncTo, msg.relPath);

    let isConflict = false;
    try {
      const localMtime = fs.statSync(targetPath).mtimeMs;
      if (localMtime > msg.mtime) {
        if (this.syncConfig.conflict === 'keep-both') {
          isConflict = true;
        } else {
          return; // last-write-wins (default)
        }
      }
    } catch {}

    if (msg.changeType === 'delete') {
      if (!isConflict) {
        try { fs.unlinkSync(targetPath); } catch {}
      }
    } else if (msg.content) {
      const dir = path.dirname(targetPath);
      fs.mkdirSync(dir, { recursive: true });
      
      let writePath = targetPath;
      if (isConflict) {
        writePath = targetPath.replace(/\.md$/, `.conflict-${Date.now()}.md`);
        this.emit('error', new Error(`Conflict detected on ${msg.relPath}. Saved remote as conflict file.`));
      } else {
        this.emit('synced', `Updated ${msg.relPath}`);
      }
      
      fs.writeFileSync(writePath, Buffer.from(msg.content, 'base64'));
      if (!isConflict) {
        this.state.update(msg.relPath, msg.hash, msg.mtime);
      }
    }
  }

  async stop(): Promise<void> {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.transport?.destroy();
    await this.watcher.stop();
  }

  async triggerManualSync(): Promise<void> {
    for (const vault of this.vaults) {
      await this.scanVault(vault);
    }
    await this.flushPending();
  }

  private isAiConfigFile(name: string): boolean {
    const aiFiles = ['opencode.json', 'opencode.jsonc', 'CLAUDE.md', 'GEMINI.md', 'AGENTS.md'];
    const aiDirs = ['.opencode', '.claude', '.cursor', '.github'];
    return aiFiles.includes(name) || aiDirs.includes(name);
  }

  private async scanVault(vault: VaultConfig): Promise<void> {
    const walkDir = (dir: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.name.startsWith('.') && !entry.name.startsWith('.open') && !entry.name.startsWith('.clau')) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile()) {
          const isMd = entry.name.endsWith('.md');
          const isAiConfig = vault.includeAiConfig && this.isAiConfigFile(entry.name);
          if (!isMd && !isAiConfig) continue;
          const relPath = path.relative(vault.localPath, fullPath);
          try {
            const stats = fs.statSync(fullPath);
            const buf = fs.readFileSync(fullPath);
            const hash = hashContent(buf);
            if (this.state.hasChanged(relPath, hash, stats.mtimeMs)) {
              this.queueChange({ path: relPath, type: 'modify', mtime: stats.mtimeMs });
            }
          } catch {}
        }
      }
    };
    walkDir(vault.localPath);
  }
}
