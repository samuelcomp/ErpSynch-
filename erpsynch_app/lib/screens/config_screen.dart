import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';

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

  @override
  void dispose() {
    _hostController.dispose();
    _portController.dispose();
    _localPathController.dispose();
    _syncToController.dispose();
    super.dispose();
  }

  Future<void> _pickFolder(TextEditingController controller) async {
    final path = await FilePicker.platform.getDirectoryPath(
      dialogTitle: 'Choose vault folder',
    );
    if (path != null) {
      controller.text = path;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
        children: [
          _SectionHeader(icon: Icons.router_outlined, title: 'PC Connection'),
          const SizedBox(height: 12),
          TextField(
            controller: _hostController,
            decoration: const InputDecoration(
              labelText: 'Host / IP',
              hintText: '192.168.1.10',
              prefixIcon: Icon(Icons.computer),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _portController,
            decoration: const InputDecoration(
              labelText: 'Port',
              prefixIcon: Icon(Icons.numbers),
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 28),
          _SectionHeader(icon: Icons.folder_outlined, title: 'Vault Folders'),
          const SizedBox(height: 12),
          _FolderField(
            controller: _localPathController,
            label: 'Local Vault (this phone)',
            hint: 'e.g. /storage/emulated/0/Obsidian',
            onBrowse: () => _pickFolder(_localPathController),
          ),
          const SizedBox(height: 16),
          _FolderField(
            controller: _syncToController,
            label: 'Sync To (PC vault path)',
            hint: 'e.g. D:/Obsidian/Notes',
            onBrowse: () => _pickFolder(_syncToController),
          ),
          const SizedBox(height: 28),
          _SectionHeader(icon: Icons.sync, title: 'Sync Options'),
          const SizedBox(height: 8),
          Card(
            child: SwitchListTile(
              title: const Text('Auto Sync'),
              subtitle: const Text('Sync changes automatically'),
              value: _autoSync,
              onChanged: (v) => setState(() => _autoSync = v),
            ),
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('Settings saved'),
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                );
              },
              icon: const Icon(Icons.save),
              label: const Text('Save Settings'),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;
  const _SectionHeader({required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 8),
        Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _FolderField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final VoidCallback onBrowse;

  const _FolderField({
    required this.controller,
    required this.label,
    required this.hint,
    required this.onBrowse,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 13, color: Colors.grey[400])),
        const SizedBox(height: 6),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                readOnly: true,
                decoration: InputDecoration(
                  hintText: hint,
                  border: const OutlineInputBorder(),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                  isDense: true,
                ),
                style: const TextStyle(fontSize: 13),
              ),
            ),
            const SizedBox(width: 8),
            FilledButton.tonalIcon(
              onPressed: onBrowse,
              icon: const Icon(Icons.folder_open, size: 18),
              label: const Text('Browse'),
            ),
          ],
        ),
      ],
    );
  }
}
