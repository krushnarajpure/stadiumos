import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  final Dio dio = Dio();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ApiClient() {
    dio.options.baseUrl = 'http://10.0.2.2:8000'; // Standard Android Emulator localhost mapping
    dio.options.connectTimeout = const Duration(seconds: 15);
    dio.options.receiveTimeout = const Duration(seconds: 15);

    // Request Interceptor: Inject JWT token
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final accessToken = await _storage.read(key: 'stadiumos_access_token');
          if (accessToken != null) {
            options.headers['Authorization'] = 'Bearer $accessToken';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          // Automatic token refresh on 401
          if (e.response?.statusCode == 401) {
            final refreshToken = await _storage.read(key: 'stadiumos_refresh_token');
            if (refreshToken != null) {
              try {
                final refreshResponse = await dio.post(
                  '/api/v1/auth/refresh',
                  data: {'refresh_token': refreshToken},
                );
                
                final newAccessToken = refreshResponse.data['access_token'];
                await _storage.write(key: 'stadiumos_access_token', value: newAccessToken);
                
                // Retry failed request
                e.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
                final retryResponse = await dio.fetch(e.requestOptions);
                return handler.resolve(retryResponse);
              } catch (refreshErr) {
                // Clear tokens on refresh failure
                await _storage.delete(key: 'stadiumos_access_token');
                await _storage.delete(key: 'stadiumos_refresh_token');
              }
            }
          }
          return handler.next(e);
        },
      ),
    );
  }
}
