export interface VaultConfig {
  localPath: string;
  syncTo: string;
  includeAiConfig: boolean;
  aiConfigPaths?: string[];
}

export interface PeerConfig {
  id: string;
  host?: string;
  port?: number;
}

export interface SyncConfig {
  auto: boolean;
  intervalSeconds: number;
  debounceMs: number;
  conflict: 'last-write-wins';
  encryption: 'none';
}

export interface TransportConfig {
  type: 'webrtc';
  stunServers: string[];
  turnServers: string[];
}

export interface AppConfig {
  peers: PeerConfig[];
  vaults: VaultConfig[];
  sync: SyncConfig;
  transport: TransportConfig;
}

export interface FileChange {
  path: string;
  type: 'create' | 'modify' | 'delete';
  hash?: string;
  content?: Buffer;
  mtime: number;
}

export interface SyncState {
  filePath: string;
  hash: string;
  mtime: number;
}
