import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:fan_app/core/state/chat_provider.dart';

class ChatPage extends ConsumerStatefulWidget {
  const ChatPage({super.key});

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends ConsumerState<ChatPage> {
  final _inputController = TextEditingController();

  @override
  void dispose() {
    _inputController.dispose();
    super.dispose();
  }

  void _submit() {
    final text = _inputController.text.trim();
    if (text.isNotEmpty) {
      ref.read(chatProvider.notifier).sendMessage(text);
      _inputController.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final chat = ref.watch(chatProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0C0E12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF11141A),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.go('/home'),
        ),
        title: const Text('AI Stadium Guide', style: TextStyle(color: Colors.white)),
      ),
      body: Column(
        children: [
          // Chat logs area
          Expanded(
            child: chat.messages.isEmpty
                ? const Center(
                    child: Text(
                      'Ask me about bathrooms, ticket locations, shuttle buses, or emergency exits...',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: chat.messages.length,
                    itemBuilder: (context, idx) {
                      final msg = chat.messages[idx];
                      return Align(
                        alignment: msg.isUser ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: msg.isUser ? const Color(0xFF00E676) : const Color(0xFF1E232F),
                            borderRadius: BorderRadius.circular(16).copyWith(
                              bottomRight: msg.isUser ? const Radius.circular(0) : const Radius.circular(16),
                              topLeft: msg.isUser ? const Radius.circular(16) : const Radius.circular(0),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                msg.text,
                                style: TextStyle(color: msg.isUser ? Colors.black : Colors.white),
                              ),
                              if (msg.citations != null && msg.citations!.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Text(
                                  'Citations: ${msg.citations!.join(", ")}',
                                  style: const TextStyle(color: Colors.grey, fontSize: 10, fontStyle: FontStyle.italic),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),

          if (chat.loading) ...[
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00E676)))),
            ),
          ],

          // Input Form panel
          Container(
            padding: const EdgeInsets.all(12),
            color: const Color(0xFF161920),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _inputController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Type your question...',
                      hintStyle: const TextStyle(color: Colors.grey),
                      enabledBorder: OutlineInputBorder(
                        borderSide: const BorderSide(color: Color(0xFF1E232F)),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderSide: const BorderSide(color: Color(0xFF00E676)),
                        borderRadius: BorderRadius.circular(24),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.send, color: Color(0xFF00E676)),
                  onPressed: _submit,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
