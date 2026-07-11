import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/endpoints.dart';

class ApiService {
  final Dio dio = Dio(BaseOptions(
    baseUrl: Endpoints.baseUrl,
    connectTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 5),
    headers: {
      'Content-Type': 'application/json',
    },
  ));

  final FlutterSecureStorage secureStorage = const FlutterSecureStorage();

  ApiService() {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await secureStorage.read(key: 'accessToken');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException error, handler) async {
        if (error.response?.statusCode == 401) {
          // Attempt token refresh rotation
          final refreshed = await attemptTokenRefresh();
          if (refreshed) {
            // Re-execute original request
            final options = error.requestOptions;
            final token = await secureStorage.read(key: 'accessToken');
            options.headers['Authorization'] = 'Bearer $token';
            
            try {
              final cloneReq = await dio.request(
                options.path,
                options: Options(
                  method: options.method,
                  headers: options.headers,
                ),
                data: options.data,
                queryParameters: options.queryParameters,
              );
              return handler.resolve(cloneReq);
            } catch (e) {
              return handler.next(error);
            }
          }
        }
        return handler.next(error);
      },
    ));
  }

  Future<bool> attemptTokenRefresh() async {
    final refreshToken = await secureStorage.read(key: 'refreshToken');
    if (refreshToken == null) return false;

    try {
      final res = await Dio().post(
        '${Endpoints.baseUrl}${Endpoints.refreshToken}',
        data: {'refreshToken': refreshToken},
      );

      if (res.statusCode == 200) {
        final newAccess = res.data['data']['accessToken'];
        await secureStorage.write(key: 'accessToken', value: newAccess);
        return true;
      }
    } catch (e) {
      // Clear expired session details
      await logoutCleanup();
    }
    return false;
  }

  Future<void> logoutCleanup() async {
    await secureStorage.delete(key: 'accessToken');
    await secureStorage.delete(key: 'refreshToken');
    await secureStorage.delete(key: 'userProfile');
  }
}
