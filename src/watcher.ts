import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';

export interface WatcherOptions {
  ignore?: string[];
  debounceMs?: number;
}

export interface WatcherEvent {
  path: string;
  type: 'create' | 'modify' | 'delete';
  mtime: number;
}

export class FileWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private basePath: string;
  private options: WatcherOptions;

  constructor(basePath: string, options: WatcherOptions = {}) {
    super();
    this.basePath = basePath;
    this.options = {
      ignore: ['.obsidian', '.git', 'node_modules'],
      debounceMs: 2000,
      ...options,
    };
  }

  async start(): Promise<void> {
    this.watcher = chokidar.watch(this.basePath, {
      ignored: (testPath: string) => {
        if (!this.options.ignore?.length) return false;
        const normalized = path.normalize(testPath).replace(/\\/g, '/');
        return this.options.ignore.some((p) => normalized.includes(`/${p}/`) || normalized.endsWith(`/${p}`));
      },
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (filePath) => this.emitEvent(filePath, 'create'))
      .on('change', (filePath) => this.emitEvent(filePath, 'modify'))
      .on('unlink', (filePath) => this.emitEvent(filePath, 'delete'));

    return new Promise((resolve) => {
      this.watcher!.on('ready', resolve);
    });
  }

  async stop(): Promise<void> {
    await this.watcher?.close();
    this.watcher = null;
  }

  private emitEvent(filePath: string, type: 'create' | 'modify' | 'delete'): void {
    try {
      const stats = type === 'delete' ? { mtimeMs: Date.now() } : fs.statSync(filePath);
      this.emit('change', {
        path: path.relative(this.basePath, filePath),
        type,
        mtime: stats.mtimeMs,
      } as WatcherEvent);
    } catch {
      // file may have been removed between event and stat
    }
  }
}
