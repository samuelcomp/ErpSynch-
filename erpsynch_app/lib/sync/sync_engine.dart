import 'dart:convert';
import 'dart:io';
import 'hasher.dart';
import 'state_tracker.dart';
import 'transport.dart';
import '../models/config.dart';

class SyncMessage {
  final String type;
  final int vaultIndex;
  final String relPath;
  final String changeType;
  final String? content;
  final String hash;
  final int mtime;

  SyncMessage({
    required this.type, required this.vaultIndex, required this.relPath,
    required this.changeType, this.content, required this.hash, required this.mtime,
  });

  Map<String, dynamic> toJson() => {
    'type': type, 'vaultIndex': vaultIndex, 'relPath': relPath,
    'changeType': changeType, if (content != null) 'content': content,
    'hash': hash, 'mtime': mtime,
  };

  factory SyncMessage.fromJson(Map<String, dynamic> json) => SyncMessage(
    type: json['type'], vaultIndex: json['vaultIndex'], relPath: json['relPath'],
    changeType: json['changeType'], content: json['content'],
    hash: json['hash'], mtime: json['mtime'],
  );
}

class SyncEngine {
  final Transport transport;
  final VaultConfig vault;
  final SyncStateTracker stateTracker = SyncStateTracker();
  final Map<String, PendingEvent> pendingQueue = {};
  bool processing = false;
  Function(String)? onSync;

  SyncEngine({required this.transport, required this.vault}) {
    transport.onMessage = (data) => _handleRemoteMessage(SyncMessage.fromJson(data));
  }

  void queueChange(String path, String type, int mtime) {
    pendingQueue[path] = PendingEvent(path: path, type: type, mtime: mtime);
  }

  int get pendingCount => pendingQueue.length;

  void flushPending() {
    if (processing) return;
    processing = true;

    for (final event in pendingQueue.values) {
      final fullPath = '${vault.localPath}/${event.path}';
      String? content;
      String hash = '';

      if (event.type != 'delete') {
        try {
          final file = File(fullPath);
          final bytes = file.readAsBytesSync();
          content = base64Encode(bytes);
          hash = hashContent(bytes);
        } catch (_) {
          continue;
        }
      }

      transport.send(SyncMessage(
        type: 'file-change', vaultIndex: 0, relPath: event.path,
        changeType: event.type, content: content, hash: hash, mtime: event.mtime,
      ).toJson());

      stateTracker.update(event.path, hash, event.mtime);
      onSync?.call('Synced: ${event.path}');
    }

    pendingQueue.clear();
    processing = false;
  }

  void _handleRemoteMessage(SyncMessage msg) {
    final targetPath = '${vault.syncTo}/${msg.relPath}';
    try {
      final file = File(targetPath);
      if (file.existsSync()) {
        final localMtime = file.lastModifiedSync().millisecondsSinceEpoch;
        if (localMtime > msg.mtime) return;
      }
    } catch (_) {}

    if (msg.changeType == 'delete') {
      File(targetPath).deleteSync();
    } else if (msg.content != null) {
      final dir = Directory(targetPath).parent;
      if (!dir.existsSync()) dir.createSync(recursive: true);
      File(targetPath).writeAsBytesSync(base64Decode(msg.content!));
      stateTracker.update(msg.relPath, msg.hash, msg.mtime);
      onSync?.call('Received: ${msg.relPath}');
    }
  }
}

class PendingEvent {
  final String path;
  final String type;
  final int mtime;
  PendingEvent({required this.path, required this.type, required this.mtime});
}
