import fs from 'fs';
import yaml from 'js-yaml';
import { AppConfig } from './types.js';

function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const camel = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
      result[camel] = toCamelCase(obj[key]);
    }
    return result;
  }
  return obj;
}

export function loadConfig(configPath: string): AppConfig {
  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = yaml.load(raw) as Record<string, any>;
  const config = toCamelCase(parsed) as AppConfig;
  config.configPath = configPath;

  if (!config || !config.vaults || config.vaults.length === 0) {
    throw new Error('Config must have at least one vault defined');
  }

  config.sync = {
    auto: true,
    intervalSeconds: 30,
    debounceMs: 2000,
    conflict: 'last-write-wins',
    encryption: 'none',
    ...config.sync,
  };

  config.transport = {
    type: 'webrtc',
    stunServers: ['stun:stun.l.google.com:19302'],
    turnServers: [],
    ...config.transport,
  };

  resolveActiveProfile(config);
  return config;
}

export function resolveActiveProfile(config: AppConfig): void {
  if (config.profiles && config.profiles.length > 0) {
    const active = config.profiles.find((p) => p.name === config.activeProfile) || config.profiles[0];
    config.activeProfile = active.name;
    config.peers = active.peers;
  }
}

export function saveConfig(config: AppConfig): void {
  if (!config.configPath) throw new Error('Config path not set');
  const doc: Record<string, any> = {
    profiles: config.profiles,
    activeProfile: config.activeProfile,
    vaults: config.vaults,
    sync: config.sync,
    transport: config.transport,
  };
  fs.writeFileSync(config.configPath, yaml.dump(doc, { indent: 2, lineWidth: 120 }), 'utf-8');
}

export function switchProfile(config: AppConfig, profileName: string): AppConfig {
  const profile = config.profiles?.find((p) => p.name === profileName);
  if (!profile) throw new Error(`Profile "${profileName}" not found`);
  config.activeProfile = profileName;
  config.peers = profile.peers;
  saveConfig(config);
  return config;
}
