import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../main.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('ErpSynch')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: _StatusCard(
                    icon: Icons.wifi,
                    label: 'Status',
                    value: state.connected ? 'Connected' : 'Disconnected',
                    color: state.connected ? Colors.green : Colors.orange,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatusCard(
                    icon: Icons.hourglass_bottom,
                    label: 'Pending',
                    value: '${state.pendingCount}',
                    color: state.connected ? theme.colorScheme.primary : Colors.grey,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: double.infinity,
              height: 48,
              child: FilledButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: const Text('Sync started'),
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  );
                },
                icon: const Icon(Icons.sync),
                label: const Text('Sync Now'),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Icon(Icons.history, size: 18, color: Colors.grey[500]),
                const SizedBox(width: 6),
                Text('Sync Log', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.grey[300])),
              ],
            ),
            const SizedBox(height: 8),
            Expanded(
              child: state.logs.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.sync_disabled, size: 40, color: Colors.grey[700]),
                        const SizedBox(height: 8),
                        Text('No sync activity yet', style: TextStyle(color: Colors.grey[600])),
                      ],
                    ),
                  )
                : ListView.builder(
                    itemCount: state.logs.length,
                    itemBuilder: (_, i) => ListTile(
                      dense: true,
                      leading: Icon(Icons.sync, size: 16, color: theme.colorScheme.primary),
                      title: Text(state.logs[i], style: const TextStyle(fontSize: 13)),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatusCard({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 14, color: color),
                const SizedBox(width: 4),
                Text(label, style: TextStyle(color: Colors.grey[400], fontSize: 12)),
              ],
            ),
            const SizedBox(height: 8),
            Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }
}
