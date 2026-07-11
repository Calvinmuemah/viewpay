import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});

final authServiceProvider = Provider<AuthService>((ref) {
  final api = ref.watch(apiServiceProvider);
  return AuthService(api);
});

// Authentication state enum
enum AuthStatus { authenticated, unauthenticated, loading, verifyingOtp }

class AuthState {
  final AuthStatus status;
  final Map<String, dynamic>? user;
  final String? errorMessage;
  final String? verifyEmail;

  AuthState({
    required this.status,
    this.user,
    this.errorMessage,
    this.verifyEmail,
  });

  AuthState copyWith({
    AuthStatus? status,
    Map<String, dynamic>? user,
    String? errorMessage,
    String? verifyEmail,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: errorMessage ?? this.errorMessage,
      verifyEmail: verifyEmail ?? this.verifyEmail,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;

  AuthNotifier(this._authService) : super(AuthState(status: AuthStatus.unauthenticated)) {
    checkSession();
  }

  Future<void> checkSession() async {
    final token = await _authService.apiService.secureStorage.read(key: 'accessToken');
    if (token != null) {
      state = AuthState(status: AuthStatus.authenticated, user: {});
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    final result = await _authService.login(email, password);
    
    if (result['success'] == true) {
      state = AuthState(status: AuthStatus.authenticated, user: result['user']);
      return true;
    } else {
      if (result['unverified'] == true) {
        state = AuthState(status: AuthStatus.verifyingOtp, verifyEmail: email);
      } else {
        state = AuthState(status: AuthStatus.unauthenticated, errorMessage: result['message']);
      }
      return false;
    }
  }

  Future<bool> register(String name, String email, String password, String? referralCode) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    final result = await _authService.register(name, email, password, referralCode);

    if (result['success'] == true) {
      state = AuthState(status: AuthStatus.verifyingOtp, verifyEmail: email);
      return true;
    } else {
      state = AuthState(status: AuthStatus.unauthenticated, errorMessage: result['message']);
      return false;
    }
  }

  Future<bool> verifyOtp(String code) async {
    final email = state.verifyEmail;
    if (email == null) return false;

    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    final result = await _authService.verifyOtp(email, code);

    if (result['success'] == true) {
      state = AuthState(status: AuthStatus.unauthenticated, errorMessage: 'Verification complete! Please log in.');
      return true;
    } else {
      state = state.copyWith(status: AuthStatus.verifyingOtp, errorMessage: result['message']);
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    state = AuthState(status: AuthStatus.unauthenticated);
  }
}

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final service = ref.watch(authServiceProvider);
  return AuthNotifier(service);
});
