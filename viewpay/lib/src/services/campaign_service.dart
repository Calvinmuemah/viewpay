import 'package:dio/dio.dart';
import '../constants/endpoints.dart';
import 'api_service.dart';

class CampaignService {
  final ApiService _apiService;

  CampaignService(this._apiService);

  Future<List<dynamic>> fetchEligibleAds({String country = 'US', String device = 'mobile'}) async {
    try {
      final res = await _apiService.dio.get(
        Endpoints.eligibleAds,
        queryParameters: {'country': country, 'device': device},
      );

      if (res.statusCode == 200) {
        return res.data['data'] ?? [];
      }
    } catch (_) {}
    return [];
  }

  Future<Map<String, dynamic>> logAdEvent(String adId, String eventType) async {
    try {
      final res = await _apiService.dio.post(Endpoints.logAdEvent, data: {
        'adId': adId,
        'eventType': eventType,
      });

      if (res.statusCode == 200) {
        return {'success': true, 'data': res.data['data']};
      }
    } on DioException catch (e) {
      return {'success': false, 'message': e.response?.data['message'] ?? 'Failed to log ad action'};
    }
    return {'success': false};
  }

  Future<Map<String, dynamic>> fetchDailyRewardStatus() async {
    try {
      final res = await _apiService.dio.get(Endpoints.dailyRewardStatus);
      if (res.statusCode == 200) {
        return {'success': true, 'data': res.data['data']};
      }
    } catch (_) {}
    return {'success': false};
  }

  Future<Map<String, dynamic>> claimDailyReward() async {
    try {
      final res = await _apiService.dio.post(Endpoints.dailyRewardClaim);
      if (res.statusCode == 200) {
        return {'success': true, 'data': res.data['data']};
      }
    } on DioException catch (e) {
      return {'success': false, 'message': e.response?.data['message'] ?? 'Claim failed'};
    }
    return {'success': false};
  }

  Future<Map<String, dynamic>> claimSpinReward() async {
    try {
      final res = await _apiService.dio.post(Endpoints.spinRewardClaim);
      if (res.statusCode == 200) {
        return {'success': true, 'data': res.data['data']};
      }
    } on DioException catch (e) {
      return {'success': false, 'message': e.response?.data['message'] ?? 'Spin claim failed'};
    }
    return {'success': false};
  }

  Future<List<dynamic>> fetchLeaderboard() async {
    try {
      final res = await _apiService.dio.get(Endpoints.leaderboard);
      if (res.statusCode == 200) {
        return res.data['data'] ?? [];
      }
    } catch (_) {}
    return [];
  }

  Future<Map<String, dynamic>> fetchAchievements() async {
    try {
      final res = await _apiService.dio.get(Endpoints.achievements);
      if (res.statusCode == 200) {
        return {'success': true, 'data': res.data['data']};
      }
    } catch (_) {}
    return {'success': false};
  }
}
