import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:fan_app/core/network/api_client.dart';

class AuthState {
  final bool isAuthenticated;
  final bool loading;
  final String? errorMessage;

  AuthState({
    required this.isAuthenticated,
    required this.loading,
    this.errorMessage,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? loading,
    String? errorMessage,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      loading: loading ?? this.loading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _client = ApiClient();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  AuthNotifier() : super(AuthState(isAuthenticated: false, loading: false)) {
    _checkToken();
  }

  Future<void> _checkToken() async {
    final token = await _storage.read(key: 'stadiumos_access_token');
    if (token != null) {
      state = AuthState(isAuthenticated: true, loading: false);
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(loading: true, errorMessage: null);
    try {
      final response = await _client.dio.post(
        '/api/v1/auth/login',
        data: {'email': email, 'password': password},
      );
      
      final token = response.data['access_token'];
      final refresh = response.data['refresh_token'];
      
      await _storage.write(key: 'stadiumos_access_token', value: token);
      await _storage.write(key: 'stadiumos_refresh_token', value: refresh);

      state = AuthState(isAuthenticated: true, loading: false);
    } catch (e) {
      state = state.copyWith(loading: false, errorMessage: "Invalid credentials. Try again.");
    }
  }

  Future<void> logout() async {
    state = state.copyWith(loading: true);
    try {
      final refresh = await _storage.read(key: 'stadiumos_refresh_token');
      if (refresh != null) {
        await _client.dio.post('/api/v1/auth/logout', data: {'refresh_token': refresh});
      }
    } catch (e) {
      // Offline fallback
    } finally {
      await _storage.delete(key: 'stadiumos_access_token');
      await _storage.delete(key: 'stadiumos_refresh_token');
      state = AuthState(isAuthenticated: false, loading: false);
    }
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
