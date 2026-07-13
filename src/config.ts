import fs from 'fs';
import yaml from 'js-yaml';
import { AppConfig } from './types.js';

export function loadConfig(path: string): AppConfig {
  const raw = fs.readFileSync(path, 'utf-8');
  const config = yaml.load(raw) as AppConfig;

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

  return config;
}
