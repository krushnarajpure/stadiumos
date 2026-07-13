import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fan_app/core/network/api_client.dart';

class ChatMessage {
  final String text;
  final bool isUser;
  final List<String>? citations;

  ChatMessage({
    required this.text,
    required this.isUser,
    this.citations,
  });
}

class ChatState {
  final List<ChatMessage> messages;
  final bool loading;
  final String? error;

  ChatState({
    required this.messages,
    required this.loading,
    this.error,
  });

  ChatState copyWith({
    List<ChatMessage>? messages,
    bool? loading,
    String? error,
  }) {
    return ChatState(
      messages: messages ?? this.messages,
      loading: loading ?? this.loading,
      error: error ?? this.error,
    );
  }
}

class ChatNotifier extends StateNotifier<ChatState> {
  final ApiClient _client = ApiClient();
  final String _sessionId = "fan_mobile_session_${DateTime.now().millisecondsSinceEpoch}";

  ChatNotifier() : super(ChatState(messages: [], loading: false));

  Future<void> sendMessage(String text) async {
    final userMsg = ChatMessage(text: text, isUser: true);
    state = state.copyWith(
      messages: [...state.messages, userMsg],
      loading: true,
      error: null,
    );

    try {
      final response = await _client.dio.post(
        '/api/v1/ai/chat',
        data: {
          'message': text,
          'session_id': _sessionId,
        },
      );

      final assistantMsg = ChatMessage(
        text: response.data['response_text'],
        isUser: false,
        citations: List<String>.from(response.data['citations'] ?? []),
      );

      state = state.copyWith(
        messages: [...state.messages, assistantMsg],
        loading: false,
      );
    } catch (e) {
      state = state.copyWith(
        loading: false,
        error: "Failed to dispatch message to AI Gateway",
      );
    }
  }
}

final chatProvider = StateNotifierProvider<ChatNotifier, ChatState>((ref) {
  return ChatNotifier();
});
