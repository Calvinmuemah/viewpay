import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_provider.dart';
import '../services/wallet_service.dart';

final walletServiceProvider = Provider<WalletService>((ref) {
  final api = ref.watch(apiServiceProvider);
  return WalletService(api);
});

class WalletState {
  final double balance;
  final double pendingEarnings;
  final String kycStatus;
  final List<dynamic> transactions;
  final List<dynamic> withdrawals;
  final bool isLoading;
  final String? errorMessage;

  WalletState({
    required this.balance,
    required this.pendingEarnings,
    required this.kycStatus,
    required this.transactions,
    required this.withdrawals,
    required this.isLoading,
    this.errorMessage,
  });

  WalletState copyWith({
    double? balance,
    double? pendingEarnings,
    String? kycStatus,
    List<dynamic>? transactions,
    List<dynamic>? withdrawals,
    bool? isLoading,
    String? errorMessage,
  }) {
    return WalletState(
      balance: balance ?? this.balance,
      pendingEarnings: pendingEarnings ?? this.pendingEarnings,
      kycStatus: kycStatus ?? this.kycStatus,
      transactions: transactions ?? this.transactions,
      withdrawals: withdrawals ?? this.withdrawals,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class WalletNotifier extends StateNotifier<WalletState> {
  final WalletService _walletService;

  WalletNotifier(this._walletService) : super(WalletState(
    balance: 0.0,
    pendingEarnings: 0.0,
    kycStatus: 'unsubmitted',
    transactions: [],
    withdrawals: [],
    isLoading: false,
  )) {
    loadWalletData();
  }

  Future<void> loadWalletData() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final profileRes = await _walletService.fetchProfile();
    
    if (profileRes['success'] == true) {
      final p = profileRes['profile'];
      final txs = await _walletService.fetchTransactionHistory();
      final withs = await _walletService.fetchWithdrawalHistory();

      state = WalletState(
        balance: double.tryParse(p['balance'].toString()) ?? 0.0,
        pendingEarnings: double.tryParse(p['pendingEarnings'].toString()) ?? 0.0,
        kycStatus: p['kycStatus'] ?? 'unsubmitted',
        transactions: txs,
        withdrawals: withs,
        isLoading: false,
      );
    } else {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to sync wallet data');
    }
  }

  Future<bool> submitKyc({
    required String documentType,
    required String documentNumber,
    required String documentFrontUrl,
    String? documentBackUrl,
  }) async {
    state = state.copyWith(isLoading: true);
    final res = await _walletService.submitKyc(
      documentType: documentType,
      documentNumber: documentNumber,
      documentFrontUrl: documentFrontUrl,
      documentBackUrl: documentBackUrl,
    );

    state = state.copyWith(isLoading: false);
    if (res['success'] == true) {
      await loadWalletData();
      return true;
    } else {
      state = state.copyWith(errorMessage: res['message']);
      return false;
    }
  }

  Future<bool> requestCashout({
    required double amount,
    required String method,
    required Map<String, dynamic> details,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final res = await _walletService.requestWithdrawal(
      amount: amount,
      paymentMethod: method,
      paymentDetails: details,
    );

    state = state.copyWith(isLoading: false);
    if (res['success'] == true) {
      await loadWalletData();
      return true;
    } else {
      state = state.copyWith(errorMessage: res['message']);
      return false;
    }
  }
}

final walletStateProvider = StateNotifierProvider<WalletNotifier, WalletState>((ref) {
  final service = ref.watch(walletServiceProvider);
  return WalletNotifier(service);
});
