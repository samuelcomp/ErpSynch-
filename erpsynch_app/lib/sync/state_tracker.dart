class SyncState {
  final String filePath;
  final String hash;
  final int mtime;

  SyncState({required this.filePath, required this.hash, required this.mtime});
}

class SyncStateTracker {
  final Map<String, SyncState> _states = {};

  void update(String filePath, String hash, int mtime) {
    _states[filePath] = SyncState(filePath: filePath, hash: hash, mtime: mtime);
  }

  bool hasChanged(String filePath, String hash, int mtime) {
    final existing = _states[filePath];
    if (existing == null) return true;
    return existing.hash != hash && mtime > existing.mtime;
  }

  SyncState? getState(String filePath) => _states[filePath];

  List<String> getAllPaths() => _states.keys.toList();

  void remove(String filePath) => _states.remove(filePath);

  int get size => _states.length;
}
