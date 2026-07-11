import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_provider.dart';
import '../services/support_service.dart';

final supportServiceProvider = Provider<SupportService>((ref) {
  final api = ref.watch(apiServiceProvider);
  return SupportService(api);
});

class SupportState {
  final List<dynamic> tickets;
  final Map<String, dynamic>? activeTicketDetails; // {ticket: Map, messages: List}
  final bool isLoading;
  final String? errorMessage;

  SupportState({
    required this.tickets,
    this.activeTicketDetails,
    required this.isLoading,
    this.errorMessage,
  });

  SupportState copyWith({
    List<dynamic>? tickets,
    Map<String, dynamic>? activeTicketDetails,
    bool? isLoading,
    String? errorMessage,
  }) {
    return SupportState(
      tickets: tickets ?? this.tickets,
      activeTicketDetails: activeTicketDetails ?? this.activeTicketDetails,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class SupportNotifier extends StateNotifier<SupportState> {
  final SupportService _supportService;

  SupportNotifier(this._supportService) : super(SupportState(
    tickets: [],
    isLoading: false,
  )) {
    loadTickets();
  }

  Future<void> loadTickets() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final list = await _supportService.fetchTickets();
    state = state.copyWith(tickets: list, isLoading: false);
  }

  Future<bool> createTicket(String subject, String message) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final res = await _supportService.createTicket(subject, message);
    state = state.copyWith(isLoading: false);

    if (res['success'] == true) {
      await loadTickets();
      return true;
    } else {
      state = state.copyWith(errorMessage: res['message']);
      return false;
    }
  }

  Future<void> selectTicket(String id) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final res = await _supportService.fetchTicketDetails(id);
    
    if (res['success'] == true) {
      state = state.copyWith(activeTicketDetails: res['data'], isLoading: false);
    } else {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to load chat thread');
    }
  }

  Future<bool> sendReply(String message) async {
    final ticketId = state.activeTicketDetails?['ticket']?['id']?.toString();
    if (ticketId == null) return false;

    state = state.copyWith(isLoading: true, errorMessage: null);
    final res = await _supportService.replyToTicket(ticketId, message);

    state = state.copyWith(isLoading: false);
    if (res['success'] == true) {
      await selectTicket(ticketId); // Refresh messages list
      return true;
    } else {
      state = state.copyWith(errorMessage: res['message']);
      return false;
    }
  }
}

final supportStateProvider = StateNotifierProvider<SupportNotifier, SupportState>((ref) {
  final service = ref.watch(supportServiceProvider);
  return SupportNotifier(service);
});
