import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:fan_app/core/state/nav_provider.dart';

class NavigationPage extends ConsumerStatefulWidget {
  const NavigationPage({super.key});

  @override
  ConsumerState<NavigationPage> createState() => _NavigationPageState();
}

class _NavigationPageState extends ConsumerState<NavigationPage> {
  final _startController = TextEditingController(text: "NODE-GATE-A");
  final _endController = TextEditingController(text: "NODE-SEAT-1");
  bool _requiresAccessibility = false;

  @override
  void dispose() {
    _startController.dispose();
    _endController.dispose();
    super.dispose();
  }

  void _search() {
    final start = _startController.text.trim();
    final end = _endController.text.trim();
    if (start.isNotEmpty && end.isNotEmpty) {
      ref.read(navigationProvider.notifier).fetchRoute(
            start,
            end,
            requiresAccessibility: _requiresAccessibility,
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final nav = ref.watch(navigationProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0C0E12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF11141A),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.go('/home'),
        ),
        title: const Text('Smart Routing Map', style: TextStyle(color: Colors.white)),
      ),
      body: Column(
        children: [
          // Routing Inputs Drawer Panel
          Container(
            padding: const EdgeInsets.all(16),
            color: const Color(0xFF161920),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _startController,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(
                    labelText: 'Start Location',
                    labelStyle: TextStyle(color: Colors.grey),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _endController,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(
                    labelText: 'Seat Section Destination',
                    labelStyle: TextStyle(color: Colors.grey),
                  ),
                ),
                const SizedBox(height: 12),
                SwitchListTile(
                  title: const Text('Accessible Routing Options (Wheelchair)', style: TextStyle(color: Colors.white, fontSize: 14)),
                  value: _requiresAccessibility,
                  onChanged: (val) => setState(() => _requiresAccessibility = val),
                  activeColor: const Color(0xFF00E676),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: _search,
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF00E676)),
                  child: const Text('Calculate Optimal Path', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),

          // Map Area or Search Results list
          Expanded(
            child: nav.loading
                ? const Center(child: CircularProgressIndicator())
                : nav.error != null
                    ? Center(child: Text(nav.error!, style: const TextStyle(color: Colors.redAccent)))
                    : nav.path.isEmpty
                        ? const Center(child: Text('Enter your seat details to start navigation', style: TextStyle(color: Colors.grey)))
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(16),
                                color: const Color(0xFF1E232F),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('Distance: ${nav.distance.toStringAsFixed(1)} meters', style: const TextStyle(color: Colors.white)),
                                    Text('Est. Time: ${(nav.estTimeSeconds / 60.0).toStringAsFixed(1)} minutes', style: const TextStyle(color: Colors.white)),
                                  ],
                                ),
                              ),
                              Expanded(
                                child: ListView.builder(
                                  padding: const EdgeInsets.all(16),
                                  itemCount: nav.path.length,
                                  itemBuilder: (context, idx) {
                                    final node = nav.path[idx];
                                    return ListTile(
                                      leading: CircleAvatar(
                                        backgroundColor: const Color(0xFF1E232F),
                                        child: Text('${idx + 1}', style: const TextStyle(color: Color(0xFF00E676))),
                                      ),
                                      title: Text(node.name, style: const TextStyle(color: Colors.white)),
                                      subtitle: Text('${node.type} | Zone: ${node.zoneId} | Floor: ${node.floor}', style: const TextStyle(color: Colors.grey)),
                                    );
                                  },
                                ),
                              ),
                            ],
                          ),
          ),
        ],
      ),
    );
  }
}
