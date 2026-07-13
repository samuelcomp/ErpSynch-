import 'package:flutter/material.dart';

import 'dart:io';

class ConfigScreen extends StatefulWidget {
  const ConfigScreen({super.key});

  @override
  State<ConfigScreen> createState() => _ConfigScreenState();
}

class _ConfigScreenState extends State<ConfigScreen> {
  final _hostController = TextEditingController();
  final _portController = TextEditingController(text: '9001');
  final _localPathController = TextEditingController();
  final _syncToController = TextEditingController();
  bool _autoSync = true;
  String _configYaml = '';

  @override
  void initState() {
    super.initState();
    _loadConfig();
  }

  void _loadConfig() {
    try {
      final file = File('${Directory.current.path}/assets/config.yaml');
      if (file.existsSync()) {
        _configYaml = file.readAsStringSync();
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _hostController.dispose();
    _portController.dispose();
    _localPathController.dispose();
    _syncToController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Config')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Peer', style: TextStyle(color: Colors.grey[400], fontSize: 12)),
          const SizedBox(height: 8),
          TextField(
            controller: _hostController,
            decoration: const InputDecoration(
              labelText: 'Host / IP',
              border: OutlineInputBorder(),
              hintText: '192.168.1.10',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _portController,
            decoration: const InputDecoration(
              labelText: 'Port',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 24),
          Text('Vault', style: TextStyle(color: Colors.grey[400], fontSize: 12)),
          const SizedBox(height: 8),
          TextField(
            controller: _localPathController,
            decoration: const InputDecoration(
              labelText: 'Local Path (phone)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _syncToController,
            decoration: const InputDecoration(
              labelText: 'Sync To (PC)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 24),
          SwitchListTile(
            title: const Text('Auto Sync'),
            value: _autoSync,
            onChanged: (v) => setState(() => _autoSync = v),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Config saved. Restart to apply.')),
              );
            },
            icon: const Icon(Icons.save),
            label: const Text('Save Config'),
          ),
          const SizedBox(height: 24),
          Text('Raw Config', style: TextStyle(color: Colors.grey[400], fontSize: 12)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.black26,
              borderRadius: BorderRadius.circular(8),
            ),
            child: SelectableText(
              _configYaml,
              style: TextStyle(fontFamily: 'monospace', fontSize: 11, color: Colors.grey[300]),
            ),
          ),
        ],
      ),
    );
  }
}
