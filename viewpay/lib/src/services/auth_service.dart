import 'package:dio/dio.dart';
import '../constants/endpoints.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _apiService;

  AuthService(this._apiService);

  ApiService get apiService => _apiService;

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final res = await _apiService.dio.post(Endpoints.login, data: {
        'email': email,
        'password': password,
        'type': 'user',
      });

      if (res.statusCode == 200) {
        final data = res.data['data'];
        await _apiService.secureStorage.write(key: 'accessToken', value: data['accessToken']);
        await _apiService.secureStorage.write(key: 'refreshToken', value: data['refreshToken']);
        return {'success': true, 'user': data['user']};
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 403 && e.response?.data['unverified'] == true) {
        return {'success': false, 'unverified': true, 'message': 'Email not verified'};
      }
      return {'success': false, 'message': e.response?.data['message'] ?? 'Login failed'};
    }
    return {'success': false, 'message': 'An unexpected error occurred'};
  }

  Future<Map<String, dynamic>> register(String name, String email, String password, String? referralCode) async {
    try {
      final res = await _apiService.dio.post(Endpoints.registerUser, data: {
        'name': name,
        'email': email,
        'password': password,
        if (referralCode != null && referralCode.isNotEmpty) 'referralCode': referralCode,
      });

      if (res.statusCode == 201) {
        return {'success': true, 'message': 'Registration successful. OTP sent.'};
      }
    } on DioException catch (e) {
      return {'success': false, 'message': e.response?.data['message'] ?? 'Registration failed'};
    }
    return {'success': false, 'message': 'Registration failed'};
  }

  Future<Map<String, dynamic>> verifyOtp(String email, String code) async {
    try {
      final res = await _apiService.dio.post(Endpoints.verifyOtp, data: {
        'email': email,
        'code': code,
        'purpose': 'verify_email',
      });

      if (res.statusCode == 200) {
        return {'success': true, 'message': res.data['message']};
      }
    } on DioException catch (e) {
      return {'success': false, 'message': e.response?.data['message'] ?? 'OTP verification failed'};
    }
    return {'success': false, 'message': 'OTP verification failed'};
  }

  Future<void> logout() async {
    try {
      final refreshToken = await _apiService.secureStorage.read(key: 'refreshToken');
      if (refreshToken != null) {
        await _apiService.dio.post(Endpoints.logout, data: {'refreshToken': refreshToken});
      }
    } catch (_) {}
    await _apiService.logoutCleanup();
  }
}
