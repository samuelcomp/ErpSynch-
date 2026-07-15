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

export interface Profile {
  name: string;
  peers: PeerConfig[];
}

export interface AppConfig {
  profiles?: Profile[];
  activeProfile?: string;
  peers?: PeerConfig[];
  vaults: VaultConfig[];
  sync: SyncConfig;
  transport: TransportConfig;
  configPath?: string;
}

export interface SyncConfig {
  auto: boolean;
  intervalSeconds: number;
  debounceMs: number;
  conflict: 'last-write-wins' | 'keep-both';
  encryption: 'none';
}

export interface TransportConfig {
  type: 'webrtc';
  stunServers: string[];
  turnServers: string[];
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
