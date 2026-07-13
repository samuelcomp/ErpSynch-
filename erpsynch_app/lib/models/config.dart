class PeerConfig {
  final String id;
  final String? host;
  final int port;

  PeerConfig({required this.id, this.host, this.port = 9001});

  factory PeerConfig.fromJson(Map<String, dynamic> json) => PeerConfig(
    id: json['id'] ?? '',
    host: json['host'],
    port: json['port'] ?? 9001,
  );
}

class VaultConfig {
  final String localPath;
  final String syncTo;
  final bool includeAiConfig;

  VaultConfig({required this.localPath, required this.syncTo, this.includeAiConfig = false});

  factory VaultConfig.fromJson(Map<String, dynamic> json) => VaultConfig(
    localPath: json['localPath'] ?? json['local_path'] ?? '',
    syncTo: json['syncTo'] ?? json['sync_to'] ?? '',
    includeAiConfig: json['includeAiConfig'] ?? json['include_ai_config'] ?? false,
  );
}

class Profile {
  final String name;
  final List<PeerConfig> peers;

  Profile({required this.name, required this.peers});

  factory Profile.fromJson(Map<String, dynamic> json) => Profile(
    name: json['name'] ?? '',
    peers: (json['peers'] as List?)?.map((p) => PeerConfig.fromJson(p)).toList() ?? [],
  );
}

class AppConfig {
  List<Profile>? profiles;
  String? activeProfile;
  List<PeerConfig>? peers;
  List<VaultConfig> vaults;
  bool autoSync;
  int intervalSeconds;

  AppConfig({
    this.profiles,
    this.activeProfile,
    this.peers,
    required this.vaults,
    this.autoSync = true,
    this.intervalSeconds = 30,
  });

  factory AppConfig.fromJson(Map<String, dynamic> json) {
    final config = AppConfig(
      profiles: (json['profiles'] as List?)?.map((p) => Profile.fromJson(p)).toList(),
      activeProfile: json['activeProfile'] ?? json['active_profile'],
      vaults: (json['vaults'] as List?)?.map((v) => VaultConfig.fromJson(v)).toList() ?? [],
      autoSync: json['sync']?['auto'] ?? true,
      intervalSeconds: json['sync']?['intervalSeconds'] ?? json['sync']?['interval_seconds'] ?? 30,
    );
    if (config.profiles != null && config.profiles!.isNotEmpty) {
      final active = config.profiles!.firstWhere(
        (p) => p.name == config.activeProfile, orElse: () => config.profiles!.first);
      config.activeProfile = active.name;
      config.peers = active.peers;
    } else {
      config.peers = (json['peers'] as List?)?.map((p) => PeerConfig.fromJson(p)).toList();
    }
    return config;
  }
}
