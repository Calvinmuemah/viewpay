class Endpoints {
  // Use 10.0.2.2 for Android Emulator, localhost for iOS simulator/web, 
  // or a custom hosting domain (e.g. production domain).
  static const String baseUrl = 'http://10.0.2.2:5000/api/v1';

  // Authentication endpoints
  static const String registerUser = '/auth/register/user';
  static const String login = '/auth/login';
  static const String verifyOtp = '/auth/verify-otp';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';
  static const String refreshToken = '/auth/refresh-token';
  static const String logout = '/auth/logout';

  // User endpoints
  static const String profile = '/users/profile';
  static const String kycSubmit = '/users/kyc/submit';
  static const String dailyRewardStatus = '/users/rewards/daily/status';
  static const String dailyRewardClaim = '/users/rewards/daily/claim';
  static const String spinRewardClaim = '/users/rewards/spin/claim';
  static const String dashboardSummary = '/users/dashboard/summary';
  static const String leaderboard = '/users/leaderboard';
  static const String achievements = '/users/achievements';

  // Campaign endpoints
  static const String eligibleAds = '/campaigns/ads/eligible';
  static const String logAdEvent = '/campaigns/ads/event';

  // Payment / Wallet endpoints
  static const String withdrawRequest = '/payments/withdraw/request';
  static const String withdrawHistory = '/payments/withdraw/history';
  static const String walletTransactions = '/payments/wallet/transactions';

  // Support / Help Desk endpoints
  static const String tickets = '/support/tickets';
  static const String myTickets = '/support/tickets/my';
}
