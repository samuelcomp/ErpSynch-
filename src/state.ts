import { SyncState } from './types.js';

export class SyncStateTracker {
  private states = new Map<string, SyncState>();

  update(filePath: string, hash: string, mtime: number): void {
    this.states.set(filePath, { filePath, hash, mtime });
  }

  hasChanged(filePath: string, hash: string, mtime: number): boolean {
    const existing = this.states.get(filePath);
    if (!existing) return true;
    return existing.hash !== hash && mtime > existing.mtime;
  }

  getState(filePath: string): SyncState | undefined {
    return this.states.get(filePath);
  }

  getAllPaths(): string[] {
    return Array.from(this.states.keys());
  }

  remove(filePath: string): void {
    this.states.delete(filePath);
  }

  get size(): number {
    return this.states.size;
  }
}
