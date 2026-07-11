import 'package:dio/dio.dart';
import '../constants/endpoints.dart';
import 'api_service.dart';

class WalletService {
  final ApiService _apiService;

  WalletService(this._apiService);

  Future<Map<String, dynamic>> fetchProfile() async {
    try {
      final res = await _apiService.dio.get(Endpoints.profile);
      if (res.statusCode == 200) {
        return {'success': true, 'profile': res.data['data']};
      }
    } on DioException catch (e) {
      return {'success': false, 'message': e.response?.data['message'] ?? 'Failed to load profile'};
    }
    return {'success': false};
  }

  Future<Map<String, dynamic>> submitKyc({
    required String documentType,
    required String documentNumber,
    required String documentFrontUrl,
    String? documentBackUrl,
  }) async {
    try {
      final res = await _apiService.dio.post(Endpoints.kycSubmit, data: {
        'documentType': documentType,
        'documentNumber': documentNumber,
        'documentFrontUrl': documentFrontUrl,
        if (documentBackUrl != null) 'documentBackUrl': documentBackUrl,
      });

      if (res.statusCode == 200) {
        return {'success': true, 'data': res.data['data']};
      }
    } on DioException catch (e) {
      return {'success': false, 'message': e.response?.data['message'] ?? 'Failed to submit KYC'};
    }
    return {'success': false};
  }

  Future<Map<String, dynamic>> requestWithdrawal({
    required double amount,
    required String paymentMethod,
    required Map<String, dynamic> paymentDetails,
  }) async {
    try {
      final res = await _apiService.dio.post(Endpoints.withdrawRequest, data: {
        'amount': amount,
        'paymentMethod': paymentMethod,
        'paymentDetails': paymentDetails,
      });

      if (res.statusCode == 201) {
        return {'success': true, 'withdrawal': res.data['data']};
      }
    } on DioException catch (e) {
      return {'success': false, 'message': e.response?.data['message'] ?? 'Withdrawal request failed'};
    }
    return {'success': false};
  }

  Future<List<dynamic>> fetchTransactionHistory({int page = 1}) async {
    try {
      final res = await _apiService.dio.get('${Endpoints.walletTransactions}?page=$page');
      if (res.statusCode == 200) {
        return res.data['data']['transactions'] ?? [];
      }
    } catch (_) {}
    return [];
  }

  Future<List<dynamic>> fetchWithdrawalHistory() async {
    try {
      final res = await _apiService.dio.get(Endpoints.withdrawHistory);
      if (res.statusCode == 200) {
        return res.data['data'] ?? [];
      }
    } catch (_) {}
    return [];
  }
}
