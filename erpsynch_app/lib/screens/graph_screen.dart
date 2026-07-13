import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';

class GraphNode {
  final int id;
  final String name;
  final String path;
  double x, y, vx, vy;

  GraphNode({required this.id, required this.name, required this.path, required this.x, required this.y})
    : vx = 0, vy = 0;
}

class GraphLink {
  final int source, target;
  GraphLink({required this.source, required this.target});
}

class GraphScreen extends StatefulWidget {
  const GraphScreen({super.key});

  @override
  State<GraphScreen> createState() => _GraphScreenState();
}

class _GraphScreenState extends State<GraphScreen> {
  List<GraphNode> _nodes = [];
  List<GraphLink> _links = [];
  String? _vaultPath;
  bool _loading = false;
  int? _hoveredId;

  Future<void> _pickVault() async {
    final path = await FilePicker.platform.getDirectoryPath(
      dialogTitle: 'Choose vault folder for graph',
    );
    if (path != null) {
      _vaultPath = path;
      _buildGraph();
    }
  }

  void _buildGraph() {
    if (_vaultPath == null) return;
    setState(() => _loading = true);

    final files = <String, String>{};
    final dir = Directory(_vaultPath!);
    if (!dir.existsSync()) { setState(() => _loading = false); return; }

    final allFiles = dir.listSync(recursive: true);
    for (final f in allFiles) {
      if (f is File && f.path.endsWith('.md')) {
        final name = f.path.split(Platform.pathSeparator).last.replaceAll('.md', '');
        files[name] = f.path;
      }
    }

    final nameToId = <String, int>{};
    final nodes = <GraphNode>[];
    final rng = Random(42);
    final cx = 0.0, cy = 0.0;

    var i = 0;
    for (final entry in files.entries) {
      final angle = 2 * pi * i / files.length;
      final r = 120.0 + rng.nextDouble() * 40;
      nodes.add(GraphNode(
        id: i, name: entry.key, path: entry.value,
        x: cx + r * cos(angle), y: cy + r * sin(angle),
      ));
      nameToId[entry.key] = i;
      i++;
    }

    final linkSet = <String>{};
    for (final node in nodes) {
      try {
        final content = File(node.path).readAsStringSync();
        final re = RegExp(r'\[\[([^\]]+?)]]');
        for (final m in re.allMatches(content)) {
          final target = m[1]!.split('|')[0].split('#')[0].trim();
          final tid = nameToId[target];
          if (tid != null) {
            linkSet.add('${node.id}-$tid');
          }
        }
      } catch (_) {}
    }

    _nodes = nodes;
    _links = linkSet.map((k) {
      final parts = k.split('-');
      return GraphLink(source: int.parse(parts[0]), target: int.parse(parts[1]));
    }).toList();

    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Graph'),
        actions: [
          if (_vaultPath != null)
            IconButton(
              icon: const Icon(Icons.folder_open),
              tooltip: 'Change vault',
              onPressed: _pickVault,
            ),
        ],
      ),
      body: _vaultPath == null
        ? Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.hub, size: 56, color: Colors.grey[700]),
                  const SizedBox(height: 16),
                  Text('No vault selected', style: TextStyle(color: Colors.grey[500], fontSize: 16)),
                  const SizedBox(height: 8),
                  Text('Pick a folder to see note connections',
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
          : _nodes.isEmpty
            ? const Center(child: Text('No notes found'))
            : _GraphWidget(
                nodes: _nodes, links: _links,
                onHover: (id) => setState(() => _hoveredId = id),
                hoveredId: _hoveredId,
              ),
    );
  }
}

class _GraphWidget extends StatefulWidget {
  final List<GraphNode> nodes;
  final List<GraphLink> links;
  final void Function(int?) onHover;
  final int? hoveredId;

  const _GraphWidget({required this.nodes, required this.links, required this.onHover, required this.hoveredId});

  @override
  State<_GraphWidget> createState() => _GraphWidgetState();
}

class _GraphWidgetState extends State<_GraphWidget> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  int? _dragId;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 1))
      ..repeat();
    _controller.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _simulate(Size size) {
    const linkDist = 100.0;
    const repel = 6000.0;
    const damping = 0.85;
    final cx = size.width / 2, cy = size.height / 2;
    final nodes = widget.nodes;

    if (nodes.isEmpty) return;

    for (int i = 0; i < nodes.length; i++) {
      for (int j = i + 1; j < nodes.length; j++) {
        final a = nodes[i], b = nodes[j];
        double dx = b.x - a.x, dy = b.y - a.y;
        double dist = sqrt(dx * dx + dy * dy);
        if (dist < 1) dist = 1;
        final force = repel / (dist * dist);
        final fx = force * (dx / dist), fy = force * (dy / dist);
        a.vx -= fx; a.vy -= fy;
        b.vx += fx; b.vy += fy;
      }
    }

    for (final link in widget.links) {
      final a = nodes[link.source], b = nodes[link.target];
      final dx = b.x - a.x, dy = b.y - a.y;
      final dist = sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;
      final force = (dist - linkDist) * 0.02;
      final fx = force * (dx / dist), fy = force * (dy / dist);
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }

    for (final n in nodes) {
      if (n.id == _dragId) continue;
      n.vx += (cx - n.x) * 0.001;
      n.vy += (cy - n.y) * 0.001;
      n.vx *= damping; n.vy *= damping;
      n.x += n.vx; n.y += n.vy;
      n.x = n.x.clamp(20, size.width - 20);
      n.y = n.y.clamp(20, size.height - 20);
    }
  }

  GraphNode? _hitTest(Offset pos, List<GraphNode> nodes) {
    for (final n in nodes) {
      if ((pos - Offset(n.x, n.y)).distance < 14) return n;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (_, constraints) {
      final size = Size(constraints.maxWidth, constraints.maxHeight);
      _simulate(size);
      return GestureDetector(
        onPanDown: (d) {
          final hit = _hitTest(d.localPosition, widget.nodes);
          if (hit != null) setState(() => _dragId = hit.id);
        },
        onPanUpdate: (d) {
          if (_dragId != null) {
            final n = widget.nodes.firstWhere((n) => n.id == _dragId);
            n.x = d.localPosition.dx; n.y = d.localPosition.dy;
          }
        },
        onPanEnd: (_) => _dragId = null,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: CustomPaint(
            size: size,
            painter: _GraphPainter(
              nodes: widget.nodes,
              links: widget.links,
              hoveredId: widget.hoveredId,
              onHover: widget.onHover,
            ),
          ),
        ),
      );
    });
  }
}

class _GraphPainter extends CustomPainter {
  final List<GraphNode> nodes;
  final List<GraphLink> links;
  final int? hoveredId;
  final void Function(int?)? onHover;

  _GraphPainter({required this.nodes, required this.links, this.hoveredId, this.onHover});

  @override
  void paint(Canvas canvas, Size size) {
    canvas.translate(0, 0);

    final linkPaint = Paint()..color = const Color(0xFF30363D)..strokeWidth = 1.2;
    for (final link in links) {
      final a = nodes[link.source], b = nodes[link.target];
      canvas.drawLine(Offset(a.x, a.y), Offset(b.x, b.y), linkPaint);
    }

    for (final n in nodes) {
      final isHovered = n.id == hoveredId;
      final fillPaint = Paint()..color = isHovered ? const Color(0xFF58A6FF) : const Color(0xFF3B82F6);
      final strokePaint = Paint()
        ..color = isHovered ? const Color(0xFF79C0FF) : const Color(0xFF1F4A8A)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2;
      canvas.drawCircle(Offset(n.x, n.y), 5, fillPaint);
      canvas.drawCircle(Offset(n.x, n.y), 5, strokePaint);
    }
  }

  @override
  bool shouldRepaint(_GraphPainter old) => true;
}
