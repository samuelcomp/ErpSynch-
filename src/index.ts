import { Command } from 'commander';
import { loadConfig, switchProfile } from './config.js';
import { FileWatcher } from './watcher.js';
import { Transport } from './transport.js';
import { SignalingClient } from './signaling.js';
import { SyncEngine } from './sync-engine.js';
import { GuiServer } from './gui/server.js';
import { LocalDiscovery } from './discovery.js';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .name('erpsynch')
  .description('P2P Obsidian vault sync agent')
  .version('0.1.0');

program
  .command('start')
  .description('Start the sync agent')
  .option('-c, --config <path>', 'Config file path', 'config.yaml')
  .option('-w, --web', 'Launch web dashboard')
  .option('-p, --port <number>', 'Dashboard port', '3456')
  .action(async (options) => {
    const configPath = path.resolve(options.config);
    const config = loadConfig(configPath);
    const vault = config.vaults[0];

    if (!vault?.localPath || !fs.existsSync(vault.localPath)) {
      console.error(`Error: vault path not found: ${vault?.localPath || '(none)'}`);
      console.error('Edit config.yaml or use "gui" command to select via dashboard.');
      process.exit(1);
    }

    console.log(`Starting sync agent for: ${vault.localPath}`);

    const ignore = vault.includeAiConfig
      ? ['.obsidian', '.git', 'node_modules']
      : ['.obsidian', '.git', 'node_modules', '.opencode', '.claude', '.cursor'];
    const watcher = new FileWatcher(vault.localPath, { ignore });
    const engine = new SyncEngine(vault.localPath, config.vaults, config.sync, watcher);

    const peer = config.peers?.[0];
    if (peer?.host) {
      try {
        const signaling = new SignalingClient(
          `ws://${peer.host}:${peer.port || 9001}`,
          peer.id
        );
        await signaling.connect();
        const transport = new Transport(signaling, true, config.transport);
        engine.setTransport(transport);
        console.log(`Connected to peer: ${peer.id} (${peer.host})`);
      } catch {
        console.log(`Peer ${peer.id} offline — will retry. Start agent on other PC.`);
      }
    }

    await engine.start();
    console.log('Sync agent running. Press Ctrl+C to stop.');

    if (options.web) {
      const gui = new GuiServer(parseInt(options.port, 10));
      gui.setEngine(engine);
      gui.setConfig(config, configPath);
      
      const discovery = new LocalDiscovery(peer?.id || 'unknown', peer?.port || 9001);
      discovery.start();
      gui.setDiscovery(discovery);
      
      gui.start();

      process.on('SIGINT', async () => {
        discovery.stop();
        // ... handled below
      });
    }

    process.on('SIGINT', async () => {
      console.log('\nShutting down...');
      if (engine) await engine.stop();
      process.exit(0);
    });
  });

program
  .command('sync-now')
  .description('Trigger a manual sync')
  .option('-c, --config <path>', 'Config file path', 'config.yaml')
  .action(async (options) => {
    const config = loadConfig(path.resolve(options.config));
    const watcher = new FileWatcher(config.vaults[0].localPath);
    const engine = new SyncEngine(config.vaults[0].localPath, config.vaults, config.sync, watcher);
    await engine.triggerManualSync();
    console.log('Manual sync complete.');
    process.exit(0);
  });

program
  .command('status')
  .description('Show sync status')
  .option('-c, --config <path>', 'Config file path', 'config.yaml')
  .action((options) => {
    const config = loadConfig(path.resolve(options.config));
    console.log(`Vaults: ${config.vaults.length}`);
    console.log(`Auto sync: ${config.sync.auto} (every ${config.sync.intervalSeconds}s)`);
    console.log(`Conflict: ${config.sync.conflict}`);
    config.vaults.forEach((v, i) => {
      console.log(`  [${i}] ${v.localPath} \u2194 ${v.syncTo}`);
    });
  });

program
  .command('gui')
  .description('Start sync agent with web dashboard')
  .option('-c, --config <path>', 'Config file path', 'config.yaml')
  .option('-p, --port <number>', 'Dashboard port', '3456')
  .action(async (options) => {
    const configPath = path.resolve(options.config);
    const config = loadConfig(configPath);
    const vault = config.vaults[0];

    const gui = new GuiServer(parseInt(options.port, 10));
    gui.setConfig(config, configPath);

    const discovery = new LocalDiscovery(config.peers?.[0]?.id || 'unknown', config.peers?.[0]?.port || 9001);
    discovery.start();
    gui.setDiscovery(discovery);

    if (!vault?.localPath) {
      console.log('No vault path configured. Use the dashboard to select one.');
      gui.start();
      process.on('SIGINT', () => { discovery.stop(); gui.stop(); process.exit(0); });
      return;
    }

    if (!fs.existsSync(vault.localPath)) {
      console.log(`Vault path not found: ${vault.localPath}`);
      console.log('Use the dashboard file browser to select a valid directory.');
      gui.start();
      process.on('SIGINT', () => { discovery.stop(); gui.stop(); process.exit(0); });
      return;
    }

    console.log(`Starting sync agent for: ${vault.localPath}`);

    const ignore = vault.includeAiConfig
      ? ['.obsidian', '.git', 'node_modules']
      : ['.obsidian', '.git', 'node_modules', '.opencode', '.claude', '.cursor'];
    const watcher = new FileWatcher(vault.localPath, { ignore });
    const engine = new SyncEngine(vault.localPath, config.vaults, config.sync, watcher);

    const peer = config.peers?.[0];
    if (peer?.host) {
      try {
        const signaling = new SignalingClient(
          `ws://${peer.host}:${peer.port || 9001}`,
          peer.id
        );
        await signaling.connect();
        const transport = new Transport(signaling, true, config.transport);
        engine.setTransport(transport);
        console.log(`Connected to peer: ${peer.id} (${peer.host})`);
      } catch {
        console.log(`Peer ${peer.id} offline — will retry. Start agent on other PC.`);
      }
    }

    await engine.start();

    gui.setEngine(engine);
    gui.start();

    process.on('SIGINT', async () => {
      console.log('\nShutting down...');
      discovery.stop();
      gui.stop();
      await engine.stop();
      process.exit(0);
    });
  });

program
  .command('profile')
  .description('Switch active profile')
  .argument('<name>', 'Profile name')
  .option('-c, --config <path>', 'Config file path', 'config.yaml')
  .action((name, options) => {
    const configPath = path.resolve(options.config);
    const config = loadConfig(configPath);
    switchProfile(config, name);
    console.log(`Switched to profile: ${name}`);
  });

program.parse(process.argv);
