import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../providers/campaign_provider.dart';
import 'package:url_launcher/url_launcher.dart';

class AdViewerView extends ConsumerStatefulWidget {
  final Map<String, dynamic> ad;
  const AdViewerView({super.key, required this.ad});

  @override
  ConsumerState<AdViewerView> createState() => _AdViewerViewState();
}

class _AdViewerViewState extends ConsumerState<AdViewerView> {
  late int _secondsRemaining;
  Timer? _timer;
  bool _isCompleted = false;

  @override
  void initState() {
    super.initState();
    _secondsRemaining = widget.ad['duration_seconds'] ?? 15;
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 0) {
        setState(() {
          _secondsRemaining--;
        });
      } else {
        _timer?.cancel();
        _completeAd();
      }
    });
  }

  void _completeAd() async {
    setState(() {
      _isCompleted = true;
    });

    final success = await ref.read(campaignStateProvider.notifier).watchAdAndAward(
      widget.ad['id'].toString(),
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Reward of \$${widget.ad['reward_amount']} credited!'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  void _handleActionLink() async {
    // Log click event in backend
    ref.read(campaignStateProvider.notifier).clickAdLink(widget.ad['id'].toString());

    final urlStr = widget.ad['action_url']?.toString() ?? '';
    if (urlStr.isNotEmpty) {
      final uri = Uri.parse(urlStr);
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mediaUrl = (widget.ad['media_urls'] as List?)?.first?.toString() ?? '';
    final isVideo = widget.ad['ad_type']?.toString().contains('video') ?? false;

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            // Media player container
            Center(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: isVideo 
                    ? Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(LucideIcons.playCircle, size: 80, color: Colors.white24),
                          const SizedBox(height: 12),
                          const Text('Playing video stream...', style: TextStyle(color: Colors.white60)),
                          Text(widget.ad['title'] ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        ],
                      )
                    : ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.network(
                          mediaUrl,
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) {
                            return const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(LucideIcons.image, size: 80, color: Colors.white24),
                                SizedBox(height: 8),
                                Text('Loading banner asset...', style: TextStyle(color: Colors.white30)),
                              ],
                            );
                          },
                        ),
                      ),
              ),
            ),

            // Top bar countdown indicator
            Positioned(
              top: 20,
              left: 20,
              right: 20,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white24),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _isCompleted ? Icons.check_circle : Icons.hourglass_top,
                          color: _isCompleted ? Colors.green : Colors.amber,
                          size: 16,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          _isCompleted 
                              ? 'Watch complete!' 
                              : 'Wait $_secondsRemaining seconds...',
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                  if (_isCompleted)
                    IconButton(
                      icon: const CircleAvatar(
                        backgroundColor: Colors.white30,
                        child: Icon(Icons.close_rounded, color: Colors.white),
                      ),
                      onPressed: () => Navigator.pop(context),
                    ),
                ],
              ),
            ),

            // Bottom action card
            Positioned(
              bottom: 24,
              left: 24,
              right: 24,
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B).withOpacity(0.9),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      widget.ad['title'] ?? '',
                      style: GoogleFonts.outfit(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      widget.ad['description'] ?? '',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                    if (_isCompleted && widget.ad['action_url'] != null) ...[
                      const SizedBox(height: 18),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF38BDF8),
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: _handleActionLink,
                        icon: const Icon(LucideIcons.externalLink, size: 18),
                        label: const Text('Visit Website', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
