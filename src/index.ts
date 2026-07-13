import { Command } from 'commander';
import { loadConfig } from './config.js';
import { FileWatcher } from './watcher.js';
import { Transport } from './transport.js';
import { SignalingClient } from './signaling.js';
import { SyncEngine } from './sync-engine.js';
import { GuiServer } from './gui/server.js';
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

    console.log(`Starting sync agent for: ${vault.localPath}`);

    const ignore = vault.includeAiConfig
      ? ['.obsidian', '.git', 'node_modules']
      : ['.obsidian', '.git', 'node_modules', '.opencode', '.claude', '.cursor'];
    const watcher = new FileWatcher(vault.localPath, { ignore });
    const engine = new SyncEngine(vault.localPath, config.vaults, config.sync, watcher);

    const peer = config.peers[0];
    if (peer && peer.host) {
      const signaling = new SignalingClient(
        `ws://${peer.host}:${peer.port || 9001}`,
        peer.id
      );
      await signaling.connect();

      const transport = new Transport(signaling, true, config.transport);
      engine.setTransport(transport);
    }

    await engine.start();
    console.log('Sync agent running. Press Ctrl+C to stop.');

    if (options.web) {
      const gui = new GuiServer(parseInt(options.port, 10));
      gui.setEngine(engine);
      gui.start();
    }

    process.on('SIGINT', async () => {
      console.log('\nShutting down...');
      await engine.stop();
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

    console.log(`Starting sync agent for: ${vault.localPath}`);

    const ignore = vault.includeAiConfig
      ? ['.obsidian', '.git', 'node_modules']
      : ['.obsidian', '.git', 'node_modules', '.opencode', '.claude', '.cursor'];
    const watcher = new FileWatcher(vault.localPath, { ignore });
    const engine = new SyncEngine(vault.localPath, config.vaults, config.sync, watcher);

    const peer = config.peers[0];
    if (peer && peer.host) {
      const signaling = new SignalingClient(
        `ws://${peer.host}:${peer.port || 9001}`,
        peer.id
      );
      await signaling.connect();
      const transport = new Transport(signaling, true, config.transport);
      engine.setTransport(transport);
    }

    await engine.start();

    const gui = new GuiServer(parseInt(options.port, 10));
    gui.setEngine(engine);
    gui.start();

    process.on('SIGINT', async () => {
      console.log('\nShutting down...');
      gui.stop();
      await engine.stop();
      process.exit(0);
    });
  });

program.parse(process.argv);
