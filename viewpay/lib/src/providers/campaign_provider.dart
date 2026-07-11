import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_provider.dart';
import '../services/campaign_service.dart';

final campaignServiceProvider = Provider<CampaignService>((ref) {
  final api = ref.watch(apiServiceProvider);
  return CampaignService(api);
});

class CampaignState {
  final List<dynamic> ads;
  final List<dynamic> leaderboard;
  final List<dynamic> earnedAchievements;
  final List<dynamic> unearnedAchievements;
  final Map<String, dynamic> dailyRewards; // {claimedToday: bool, currentStreakDay: int, nextRewardAmount: double}
  final bool isLoading;
  final String? errorMessage;

  CampaignState({
    required this.ads,
    required this.leaderboard,
    required this.earnedAchievements,
    required this.unearnedAchievements,
    required this.dailyRewards,
    required this.isLoading,
    this.errorMessage,
  });

  CampaignState copyWith({
    List<dynamic>? ads,
    List<dynamic>? leaderboard,
    List<dynamic>? earnedAchievements,
    List<dynamic>? unearnedAchievements,
    Map<String, dynamic>? dailyRewards,
    bool? isLoading,
    String? errorMessage,
  }) {
    return CampaignState(
      ads: ads ?? this.ads,
      leaderboard: leaderboard ?? this.leaderboard,
      earnedAchievements: earnedAchievements ?? this.earnedAchievements,
      unearnedAchievements: unearnedAchievements ?? this.unearnedAchievements,
      dailyRewards: dailyRewards ?? this.dailyRewards,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class CampaignNotifier extends StateNotifier<CampaignState> {
  final CampaignService _campaignService;

  CampaignNotifier(this._campaignService) : super(CampaignState(
    ads: [],
    leaderboard: [],
    earnedAchievements: [],
    unearnedAchievements: [],
    dailyRewards: {'claimedToday': false, 'currentStreakDay': 0, 'nextRewardAmount': 0.01},
    isLoading: false,
  )) {
    refreshAllData();
  }

  Future<void> refreshAllData() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    
    final adsList = await _campaignService.fetchEligibleAds();
    final leadRes = await _campaignService.fetchLeaderboard();
    final rewardRes = await _campaignService.fetchDailyRewardStatus();
    final achRes = await _campaignService.fetchAchievements();

    Map<String, dynamic> dailyInfo = state.dailyRewards;
    if (rewardRes['success'] == true) {
      dailyInfo = Map<String, dynamic>.from(rewardRes['data']);
    }

    List<dynamic> earned = [];
    List<dynamic> unearned = [];
    if (achRes['success'] == true) {
      earned = achRes['data']['earned'] ?? [];
      unearned = achRes['data']['unearned'] ?? [];
    }

    state = CampaignState(
      ads: adsList,
      leaderboard: leadRes,
      earnedAchievements: earned,
      unearnedAchievements: unearned,
      dailyRewards: dailyInfo,
      isLoading: false,
    );
  }

  Future<bool> watchAdAndAward(String adId) async {
    state = state.copyWith(isLoading: true);
    // Log view event
    final viewRes = await _campaignService.logAdEvent(adId, 'view');
    state = state.copyWith(isLoading: false);
    
    if (viewRes['success'] == true) {
      await refreshAllData();
      return true;
    } else {
      state = state.copyWith(errorMessage: viewRes['message']);
      return false;
    }
  }

  Future<void> clickAdLink(String adId) async {
    // Log click event
    await _campaignService.logAdEvent(adId, 'click');
  }

  Future<bool> claimDailyCheckin() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final res = await _campaignService.claimDailyReward();
    state = state.copyWith(isLoading: false);

    if (res['success'] == true) {
      await refreshAllData();
      return true;
    } else {
      state = state.copyWith(errorMessage: res['message']);
      return false;
    }
  }

  Future<Map<String, dynamic>?> claimLuckySpin() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final res = await _campaignService.claimSpinReward();
    state = state.copyWith(isLoading: false);

    if (res['success'] == true) {
      await refreshAllData();
      return res['data'];
    } else {
      state = state.copyWith(errorMessage: res['message']);
      return null;
    }
  }
}

final campaignStateProvider = StateNotifierProvider<CampaignNotifier, CampaignState>((ref) {
  final service = ref.watch(campaignServiceProvider);
  return CampaignNotifier(service);
});
