import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:fan_app/core/state/auth_provider.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: const Color(0xFF0C0E12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF11141A),
        title: const Text('StadiumOS Fan Console', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Live Match Information Card
            Card(
              color: const Color(0xFF161920),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: const Padding(
                padding: EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('LIVE MATCH TODAY', style: TextStyle(color: Color(0xFF00E676), fontSize: 12, fontWeight: FontWeight.bold)),
                    SizedBox(height: 10),
                    Text('Argentina vs France', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                    SizedBox(height: 4),
                    Text('FIFA World Cup Final 2026', style: TextStyle(color: Colors.grey, fontSize: 13)),
                    SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.between,
                      children: [
                        Text('Kickoff: 18:00 Local', style: TextStyle(color: Colors.white, fontSize: 14)),
                        Text('MetLife Stadium', style: TextStyle(color: Colors.white, fontSize: 14)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Dynamic Ticket View
            Card(
              color: const Color(0xFF1E232F),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: const ListTile(
                leading: Icon(Icons.qr_code, color: Colors.white, size: 40),
                title: Text('Your Mobile Ticket', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                subtitle: Text('Section 104, Row G, Seat 12', style: TextStyle(color: Colors.grey)),
                trailing: Icon(Icons.arrow_forward_ios, color: Colors.white, size: 16),
              ),
            ),
            const SizedBox(height: 24),

            // Navigation Options
            const Text(
              'Intelligent Assistance',
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => context.go('/navigation'),
                    child: Container(
                      height: 110,
                      decoration: BoxDecoration(
                        color: const Color(0xFF161920),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF1E232F)),
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.directions, color: Color(0xFF00E676), size: 36),
                          SizedBox(height: 8),
                          Text('Stadium Route', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: GestureDetector(
                    onTap: () => context.go('/chat'),
                    child: Container(
                      height: 110,
                      decoration: BoxDecoration(
                        color: const Color(0xFF161920),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF1E232F)),
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.chat_bubble_outline, color: Color(0xFF2979FF), size: 36),
                          SizedBox(height: 8),
                          Text('AI Assistant', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Emergency SOS Panic Button
            ElevatedButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('SOS Triggered: Medical/Security teams have been coordinates to your seat location.'),
                    backgroundColor: Colors.redAccent,
                  ),
                );
              },
              icon: const Icon(Icons.warning, color: Colors.white),
              label: const Text('EMERGENCY SOS', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
