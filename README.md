# ErpSynch

P2P Obsidian vault sync — WebRTC-based peer-to-peer file synchronization between a PC agent and Android devices.

## Architecture

```
┌─────────────────────┐         WebRTC          ┌─────────────────────┐
│    PC Agent         │ ◄────── Data Channel ──► │   Flutter App       │
│  (Node.js/TS)       │                          │   (Android)         │
│                     │    Signaling (WebSocket)  │                     │
│  - File watcher     │ ◄──────────────────────► │  - Sync engine       │
│  - SHA-256 hasher   │                          │  - Markdown viewer   │
│  - State tracker    │                          │  - Config editor     │
│  - Web GUI (:3456)  │                          │  - Background sync   │
│  - Profile mgmt     │                          │                     │
└─────────────────────┘                          └─────────────────────┘
```

## PC Agent

### Quick Start

```bash
npm install
npm run build
npm start -- start
```

### Commands

| Command | Description |
|---------|-------------|
| `npm start -- start` | Start sync agent |
| `npm start -- gui` | Start web dashboard on port 3456 |
| `npm start -- sync-now` | Trigger manual sync |
| `npm start -- status` | Show sync status |
| `npm start -- profile <name>` | Switch profile |

### Config (`config.yaml`)

```yaml
profiles:
  - name: home
    peers:
      - id: home-pc
        host: 192.168.1.10
        port: 9001
activeProfile: home
vaults:
  - local_path: C:\Users\Sami\SamiBrain\ERPsynch
    sync_to: D:\Obsidian\ERPsynch
sync:
  auto: true
  interval_seconds: 30
  debounce_ms: 2000
  conflict: last-write-wins
```

## Flutter App

### Quick Start

```bash
cd erpsynch_app
flutter pub get
flutter run
```

Syncs your Obsidian vault over WebRTC to a paired PC agent. Supports auto-sync, connection status, and profile switching.

## How It Works

1. **File watcher** (PC) detects vault changes via chokidar
2. **Hasher** computes SHA-256 of changed files
3. **State tracker** maintains per-file state to detect conflicts
4. **Signaling** establishes WebRTC connection via WebSocket
5. **Transport** sends file diffs over encrypted data channel
6. **Sync engine** applies remote changes with last-write-wins conflict resolution

## Profiles

Switch between network environments (home, office) without reconfiguring peers.

```bash
npm start -- profile office
```
