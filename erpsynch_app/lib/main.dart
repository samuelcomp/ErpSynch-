import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'models/config.dart';
import 'screens/home_screen.dart';
import 'screens/note_screen.dart';
import 'screens/config_screen.dart';

void main() {
  runApp(const ErpSynchApp());
}

class AppState extends ChangeNotifier {
  AppConfig? config;
  bool connected = false;
  int pendingCount = 0;
  List<String> logs = [];

  void updateStatus({bool? connected, int? pendingCount, String? log}) {
    if (connected != null) this.connected = connected;
    if (pendingCount != null) this.pendingCount = pendingCount;
    if (log != null) {
      logs.insert(0, log);
      if (logs.length > 50) logs.removeLast();
    }
    notifyListeners();
  }
}

class ErpSynchApp extends StatelessWidget {
  const ErpSynchApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState(),
      child: MaterialApp(
        title: 'ErpSynch',
        theme: ThemeData(
          brightness: Brightness.dark,
          colorSchemeSeed: Colors.blue,
          useMaterial3: true,
        ),
        home: const MainScreen(),
      ),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;

  final _screens = const [
    HomeScreen(),
    NotesScreen(),
    ConfigScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.description_outlined), label: 'Notes'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), label: 'Config'),
        ],
      ),
    );
  }
}
