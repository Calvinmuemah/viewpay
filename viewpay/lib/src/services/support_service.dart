import 'package:dio/dio.dart';
import '../constants/endpoints.dart';
import 'api_service.dart';

class SupportService {
  final ApiService _apiService;

  SupportService(this._apiService);

  Future<List<dynamic>> fetchTickets() async {
    try {
      final res = await _apiService.dio.get(Endpoints.myTickets);
      if (res.statusCode == 200) {
        return res.data['data'] ?? [];
      }
    } catch (_) {}
    return [];
  }

  Future<Map<String, dynamic>> createTicket(String subject, String message) async {
    try {
      final res = await _apiService.dio.post(Endpoints.tickets, data: {
        'subject': subject,
        'message': message,
      });

      if (res.statusCode == 201) {
        return {'success': true, 'ticket': res.data['data']};
      }
    } on DioException catch (e) {
      return {'success': false, 'message': e.response?.data['message'] ?? 'Failed to open ticket'};
    }
    return {'success': false};
  }

  Future<Map<String, dynamic>> fetchTicketDetails(String ticketId) async {
    try {
      final res = await _apiService.dio.get('${Endpoints.tickets}/$ticketId');
      if (res.statusCode == 200) {
        return {'success': true, 'data': res.data['data']};
      }
    } catch (_) {}
    return {'success': false};
  }

  Future<Map<String, dynamic>> replyToTicket(String ticketId, String message) async {
    try {
      final res = await _apiService.dio.post('${Endpoints.tickets}/$ticketId/reply', data: {
        'message': message,
      });

      if (res.statusCode == 200) {
        return {'success': true, 'data': res.data['data']};
      }
    } on DioException catch (e) {
      return {'success': false, 'message': e.response?.data['message'] ?? 'Failed to send response'};
    }
    return {'success': false};
  }
}
