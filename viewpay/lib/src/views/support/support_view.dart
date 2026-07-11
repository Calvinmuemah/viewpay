import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/support_provider.dart';

class SupportView extends ConsumerStatefulWidget {
  final Map<String, dynamic> ticket;
  const SupportView({super.key, required this.ticket});

  @override
  ConsumerState<SupportView> createState() => _SupportViewState();
}

class _SupportViewState extends ConsumerState<SupportView> {
  final _msgController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(supportStateProvider.notifier).selectTicket(
      widget.ticket['id'].toString(),
    ));
  }

  void _send() async {
    final text = _msgController.text.trim();
    if (text.isNotEmpty) {
      final ok = await ref.read(supportStateProvider.notifier).sendReply(text);
      if (ok && mounted) {
        _msgController.clear();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final supportState = ref.watch(supportStateProvider);
    final details = supportState.activeTicketDetails;
    final messages = details?['messages'] as List? ?? [];

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.ticket['subject'] ?? 'Support Chat'),
        backgroundColor: const Color(0xFF0F172A),
      ),
      backgroundColor: const Color(0xFF0F172A),
      body: Column(
        children: [
          // Messages thread
          Expanded(
            child: supportState.isLoading && messages.isEmpty
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF38BDF8)))
                : ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: messages.length,
                    itemBuilder: (context, idx) {
                      final m = messages[idx];
                      final isMe = m['sender_type'] == 'user';
                      return Align(
                        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.symmetric(vertical: 6),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: isMe 
                                ? const Color(0xFF38BDF8) 
                                : const Color(0xFF1E293B),
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(16),
                              topRight: const Radius.circular(16),
                              bottomLeft: isMe ? const Radius.circular(16) : Radius.zero,
                              bottomRight: isMe ? Radius.zero : const Radius.circular(16),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                            children: [
                              Text(
                                m['message'] ?? '',
                                style: TextStyle(
                                  color: isMe ? Colors.black : Colors.white,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                m['sender_type'] == 'user' ? 'You' : 'Support Agent',
                                style: TextStyle(
                                  color: isMe ? Colors.black54 : Colors.grey,
                                  fontSize: 8,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),

          // Message input bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _msgController,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Write a response message...',
                        hintStyle: const TextStyle(color: Colors.grey),
                        filled: true,
                        fillColor: const Color(0xFF1E293B),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  IconButton(
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xFF38BDF8),
                      padding: const EdgeInsets.all(14),
                    ),
                    icon: const Icon(Icons.send, color: Colors.black),
                    onPressed: _send,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
