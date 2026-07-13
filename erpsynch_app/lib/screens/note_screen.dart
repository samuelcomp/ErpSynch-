import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'dart:io';

class NotesScreen extends StatefulWidget {
  const NotesScreen({super.key});

  @override
  State<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends State<NotesScreen> {
  List<FileSystemEntity> _files = [];
  String? _selectedContent;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadFiles();
  }

  void _loadFiles() {
    setState(() => _loading = true);
    try {
      final dir = Directory('/storage/emulated/0/ErpSynch');
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
    return Scaffold(
      appBar: AppBar(title: const Text('Notes')),
      body: _selectedContent != null
        ? Column(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _selectedContent = null),
                alignment: Alignment.centerLeft,
              ),
              Expanded(
                child: Markdown(data: _selectedContent!),
              ),
            ],
          )
        : _loading
          ? const Center(child: CircularProgressIndicator())
          : _files.isEmpty
            ? const Center(child: Text('No notes found'))
            : ListView.builder(
                itemCount: _files.length,
                itemBuilder: (_, i) {
                  final file = _files[i] as File;
                  return ListTile(
                    leading: const Icon(Icons.description),
                    title: Text(file.path.split('/').last),
                    onTap: () {
                      try {
                        final content = file.readAsStringSync();
                        setState(() => _selectedContent = content);
                      } catch (_) {}
                    },
                  );
                },
              ),
    );
  }
}
