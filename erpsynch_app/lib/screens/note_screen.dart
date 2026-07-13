import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:io';

class NotesScreen extends StatefulWidget {
  const NotesScreen({super.key});

  @override
  State<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends State<NotesScreen> {
  List<FileSystemEntity> _files = [];
  String? _selectedContent;
  String? _selectedTitle;
  bool _loading = false;
  String? _vaultPath;

  Future<void> _pickVault() async {
    final path = await FilePicker.platform.getDirectoryPath(
      dialogTitle: 'Choose vault folder',
    );
    if (path != null) {
      _vaultPath = path;
      _loadFiles();
    }
  }

  void _loadFiles() {
    if (_vaultPath == null) return;
    setState(() => _loading = true);
    _files = [];
    try {
      final dir = Directory(_vaultPath!);
      if (dir.existsSync()) {
        _files = dir.listSync(recursive: true)
          .where((f) => f.path.endsWith('.md'))
          .toList();
      }
    } catch (_) {}
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notes'),
        actions: [
          if (_vaultPath != null)
            IconButton(
              icon: const Icon(Icons.folder_open),
              tooltip: 'Change vault folder',
              onPressed: _pickVault,
            ),
        ],
      ),
      body: _selectedContent != null && _selectedTitle != null
        ? Column(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(8, 4, 8, 4),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest.withAlpha(120),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back),
                      tooltip: 'Back to list',
                      onPressed: () => setState(() {
                        _selectedContent = null;
                        _selectedTitle = null;
                      }),
                    ),
                    Expanded(
                      child: Text(
                        _selectedTitle!,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Markdown(data: _selectedContent!),
              ),
            ],
          )
        : _vaultPath == null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.folder_open, size: 56, color: Colors.grey[700]),
                    const SizedBox(height: 16),
                    Text('No vault selected', style: TextStyle(color: Colors.grey[500], fontSize: 16)),
                    const SizedBox(height: 8),
                    Text('Pick a folder to browse your markdown notes',
                      style: TextStyle(color: Colors.grey[600], fontSize: 13),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    FilledButton.icon(
                      onPressed: _pickVault,
                      icon: const Icon(Icons.folder_open),
                      label: const Text('Choose Vault Folder'),
                    ),
                  ],
                ),
              ),
            )
          : _loading
            ? const Center(child: CircularProgressIndicator())
            : _files.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.note_add, size: 48, color: Colors.grey[700]),
                      const SizedBox(height: 12),
                      Text('No markdown files found', style: TextStyle(color: Colors.grey[500])),
                    ],
                  ),
                )
              : ListView.builder(
                  itemCount: _files.length,
                  itemBuilder: (_, i) {
                    final file = _files[i] as File;
                    final name = file.path.split(Platform.pathSeparator).last;
                    final parent = file.parent.path.split(Platform.pathSeparator).last;
                    return ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer.withAlpha(80),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(Icons.description, color: theme.colorScheme.primary),
                      ),
                      title: Text(name, style: const TextStyle(fontWeight: FontWeight.w500)),
                      subtitle: parent != '.' ? Text(parent, style: TextStyle(fontSize: 12, color: Colors.grey[600])) : null,
                      onTap: () {
                        try {
                          final content = file.readAsStringSync();
                          setState(() {
                            _selectedContent = content;
                            _selectedTitle = name;
                          });
                        } catch (_) {}
                      },
                    );
                  },
                ),
    );
  }
}
