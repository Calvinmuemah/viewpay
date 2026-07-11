import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../providers/auth_provider.dart';
import '../../providers/wallet_provider.dart';
import '../../providers/campaign_provider.dart';
import '../../providers/support_provider.dart';

class DashboardView extends ConsumerStatefulWidget {
  const DashboardView({super.key});

  @override
  ConsumerState<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends ConsumerState<DashboardView> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final walletState = ref.watch(walletStateProvider);
    final campaignState = ref.watch(campaignStateProvider);

    final List<Widget> tabs = [
      HomeTab(walletState: walletState, campaignState: campaignState),
      AdsTab(campaignState: campaignState),
      RewardsTab(campaignState: campaignState),
      SupportTab(),
      ProfileTab(walletState: walletState),
    ];

    return Scaffold(
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) {
          setState(() {
            _currentIndex = idx;
          });
        },
        destinations: const [
          NavigationDestination(icon: Icon(LucideIcons.home), label: 'Home'),
          NavigationDestination(icon: Icon(LucideIcons.playCircle), label: 'Watch Ads'),
          NavigationDestination(icon: Icon(LucideIcons.gift), label: 'Rewards'),
          NavigationDestination(icon: Icon(LucideIcons.helpCircle), label: 'Support'),
          NavigationDestination(icon: Icon(LucideIcons.user), label: 'Profile'),
        ],
      ),
      body: walletState.isLoading || campaignState.isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF38BDF8)))
          : tabs[_currentIndex],
    );
  }
}

// ----------------------------------------------------------------------
// HOME TAB
// ----------------------------------------------------------------------
class HomeTab extends ConsumerWidget {
  final WalletState walletState;
  final CampaignState campaignState;

  const HomeTab({
    super.key,
    required this.walletState,
    required this.campaignState,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final daily = campaignState.dailyRewards;
    final claimedToday = daily['claimedToday'] as bool? ?? false;
    final streak = daily['currentStreakDay'] as int? ?? 0;

    return Scaffold(
      body: Container(
        color: const Color(0xFF0F172A),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ViewPay Balance',
                          style: GoogleFonts.outfit(
                            fontSize: 16,
                            color: Colors.grey,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '\$${walletState.balance.toStringAsFixed(4)}',
                          style: GoogleFonts.outfit(
                            fontSize: 36,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF38BDF8),
                          ),
                        ),
                      ],
                    ),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF38BDF8),
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: () => context.push('/wallet'),
                      icon: const Icon(Icons.account_balance_wallet_outlined),
                      label: const Text('Cashout', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                
                // Pending earnings widget
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Pending Earnings (Withdrawal Processing):',
                        style: TextStyle(color: Colors.grey, fontSize: 13),
                      ),
                      Text(
                        '\$${walletState.pendingEarnings.toStringAsFixed(4)}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // Daily check-in streak bubbles
                Text(
                  'Daily Check-In Streak',
                  style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: List.generate(7, (idx) {
                          final dayNum = idx + 1;
                          final isClaimed = dayNum <= streak;
                          return Column(
                            children: [
                              Text('Day $dayNum', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                              const SizedBox(height: 8),
                              CircleAvatar(
                                radius: 18,
                                backgroundColor: isClaimed 
                                    ? const Color(0xFF38BDF8) 
                                    : const Color(0xFF0F172A),
                                child: Icon(
                                  Icons.check_rounded,
                                  size: 18,
                                  color: isClaimed ? Colors.black : Colors.white24,
                                ),
                              ),
                            ],
                          );
                        }),
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size.fromHeight(50),
                          backgroundColor: claimedToday 
                              ? Colors.white10 
                              : const Color(0xFF38BDF8),
                          foregroundColor: claimedToday ? Colors.white30 : Colors.black,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: claimedToday ? null : () async {
                          final ok = await ref.read(campaignStateProvider.notifier).claimDailyCheckin();
                          if (ok && context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Daily reward claimed successfully!')),
                            );
                            ref.read(walletStateProvider.notifier).loadWalletData();
                          }
                        },
                        child: Text(
                          claimedToday ? 'Claimed Today' : 'Claim Daily Reward',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // Achievements summary
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'My Achievements',
                      style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '${campaignState.earnedAchievements.length} Unlocked',
                      style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 13),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: campaignState.earnedAchievements.length + campaignState.unearnedAchievements.length,
                  itemBuilder: (context, idx) {
                    final isEarned = idx < campaignState.earnedAchievements.length;
                    final ach = isEarned 
                        ? campaignState.earnedAchievements[idx]
                        : campaignState.unearnedAchievements[idx - campaignState.earnedAchievements.length];
                    
                    return Card(
                      color: const Color(0xFF1E293B),
                      margin: const EdgeInsets.only(bottom: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: isEarned ? const Color(0xFF38BDF8).withOpacity(0.1) : Colors.white10,
                          child: Icon(
                            isEarned ? Icons.workspace_premium_rounded : Icons.lock_outline,
                            color: isEarned ? const Color(0xFF38BDF8) : Colors.grey,
                          ),
                        ),
                        title: Text(
                          ach['title'] ?? '',
                          style: TextStyle(
                            color: isEarned ? Colors.white : Colors.white60,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        subtitle: Text(ach['description'] ?? '', style: const TextStyle(fontSize: 12)),
                        trailing: Text(
                          '+\$${ach['reward_amount']}',
                          style: const TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ----------------------------------------------------------------------
// ADS TAB
// ----------------------------------------------------------------------
class AdsTab extends ConsumerWidget {
  final CampaignState campaignState;

  const AdsTab({
    super.key,
    required this.campaignState,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ads = campaignState.ads;

    return Scaffold(
      appBar: AppBar(
        title: Text('Available Advertisements', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
      ),
      backgroundColor: const Color(0xFF0F172A),
      body: ads.isEmpty
          ? const Center(
              child: Text(
                'No targeted advertisements currently active.\nPlease check back shortly!',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: ads.length,
              itemBuilder: (context, idx) {
                final ad = ads[idx];
                return Card(
                  color: const Color(0xFF1E293B),
                  margin: const EdgeInsets.only(bottom: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF38BDF8).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                (ad['ad_type'] ?? 'video').toString().toUpperCase().replaceAll('_', ' '),
                                style: const TextStyle(
                                  color: Color(0xFF38BDF8),
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            Text(
                              'Reward: \$${ad['reward_amount']}',
                              style: const TextStyle(
                                color: Colors.greenAccent,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          ad['title'] ?? '',
                          style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          ad['description'] ?? '',
                          style: const TextStyle(color: Colors.grey, fontSize: 13, height: 1.4),
                        ),
                        const SizedBox(height: 18),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.timer_outlined, size: 16, color: Colors.grey),
                                const SizedBox(width: 4),
                                Text('${ad['duration_seconds'] ?? 15} seconds', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                              ],
                            ),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF38BDF8),
                                foregroundColor: Colors.black,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              onPressed: () => context.push('/watch-ads', extra: ad),
                              child: const Text('Watch ad', style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}

// ----------------------------------------------------------------------
// REWARDS TAB (SPIN WHEEL & ACHIEVEMENTS)
// ----------------------------------------------------------------------
class RewardsTab extends ConsumerWidget {
  final CampaignState campaignState;

  const RewardsTab({
    super.key,
    required this.campaignState,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Lucky Rewards Center', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
      ),
      backgroundColor: const Color(0xFF0F172A),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withOpacity(0.05)),
              ),
              child: Column(
                children: [
                  const Icon(LucideIcons.toyBrick, size: 80, color: Color(0xFF38BDF8)),
                  const SizedBox(height: 16),
                  Text(
                    'Spin The Lucky Wheel',
                    style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Spin the lucky wheel once every 12 hours for a chance to win up to \$5.00 cash rewards!',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey, fontSize: 13, height: 1.5),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF38BDF8),
                      foregroundColor: Colors.black,
                      minimumSize: const Size.fromHeight(50),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () async {
                      final prize = await ref.read(campaignStateProvider.notifier).claimLuckySpin();
                      if (prize != null && context.mounted) {
                        showDialog(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text('Congratulations!'),
                            content: Text('You won a Lucky Spin Prize of \$${prize['prizeValue']}!'),
                            actions: [
                              TextButton(
                                onPressed: () {
                                  Navigator.pop(ctx);
                                  ref.read(walletStateProvider.notifier).loadWalletData();
                                },
                                child: const Text('Claim'),
                              )
                            ],
                          ),
                        );
                      } else if (context.mounted) {
                        final state = ref.read(campaignStateProvider);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(state.errorMessage ?? 'Spin failed. Check spinner timeout.')),
                        );
                      }
                    },
                    child: const Text('Spin Now', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ----------------------------------------------------------------------
// SUPPORT TICKETS TAB
// ----------------------------------------------------------------------
class SupportTab extends ConsumerStatefulWidget {
  const SupportTab({super.key});

  @override
  ConsumerState<SupportTab> createState() => _SupportTabState();
}

class _SupportTabState extends ConsumerState<SupportTab> {
  final _subjectController = TextEditingController();
  final _msgController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(supportStateProvider.notifier).loadTickets());
  }

  void _createTicket() async {
    if (_subjectController.text.isNotEmpty && _msgController.text.isNotEmpty) {
      final ok = await ref.read(supportStateProvider.notifier).createTicket(
        _subjectController.text.trim(),
        _msgController.text.trim(),
      );

      if (ok && mounted) {
        _subjectController.clear();
        _msgController.clear();
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Support ticket opened successfully.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final supportState = ref.watch(supportStateProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Customer Support Chat', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_comment_outlined, color: Color(0xFF38BDF8)),
            onPressed: () => _showCreateDialog(context),
          ),
        ],
      ),
      backgroundColor: const Color(0xFF0F172A),
      body: supportState.tickets.isEmpty
          ? const Center(
              child: Text(
                'No support tickets opened yet.\nTap the top right icon to start a conversation.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: supportState.tickets.length,
              itemBuilder: (context, idx) {
                final t = supportState.tickets[idx];
                return Card(
                  color: const Color(0xFF1E293B),
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    title: Text(
                      t['subject'] ?? '',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    subtitle: Text(
                      'Opened on: ${t['created_at'].toString().split('T')[0]}',
                      style: const TextStyle(color: Colors.grey, fontSize: 11),
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: t['status'] == 'open' 
                            ? Colors.amber.withOpacity(0.1) 
                            : Colors.grey.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        (t['status'] ?? 'closed').toString().toUpperCase(),
                        style: TextStyle(
                          color: t['status'] == 'open' ? Colors.amber : Colors.grey,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    onTap: () {
                      context.push('/support', extra: t);
                    },
                  ),
                );
              },
            ),
    );
  }

  void _showCreateDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Open New Help Ticket'),
        backgroundColor: const Color(0xFF1E293B),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _subjectController,
              decoration: const InputDecoration(labelText: 'Ticket Subject'),
              style: const TextStyle(color: Colors.white),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _msgController,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Explain your issue...'),
              style: const TextStyle(color: Colors.white),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF38BDF8), foregroundColor: Colors.black),
            onPressed: _createTicket,
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }
}

// ----------------------------------------------------------------------
// PROFILE TAB & KYC SUBMIT
// ----------------------------------------------------------------------
class ProfileTab extends ConsumerWidget {
  final WalletState walletState;

  const ProfileTab({
    super.key,
    required this.walletState,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).user;

    return Scaffold(
      appBar: AppBar(
        title: Text('Account Profile', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
      ),
      backgroundColor: const Color(0xFF0F172A),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 40,
                    backgroundColor: const Color(0xFF38BDF8).withOpacity(0.1),
                    child: const Icon(LucideIcons.user, size: 40, color: Color(0xFF38BDF8)),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    user?['name'] ?? 'Viewer Client',
                    style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    user?['email'] ?? '',
                    style: const TextStyle(color: Colors.grey, fontSize: 13),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // KYC Status Card
            Card(
              color: const Color(0xFF1E293B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'KYC Verification',
                          style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: walletState.kycStatus == 'approved' 
                                ? Colors.green.withOpacity(0.1) 
                                : Colors.amber.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            walletState.kycStatus.toUpperCase(),
                            style: TextStyle(
                              color: walletState.kycStatus == 'approved' ? Colors.green : Colors.amber,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'To protect the system from duplicate accounts, we require uploading a National ID or Passport before releasing wallet payout cashouts.',
                      style: TextStyle(color: Colors.grey, fontSize: 12, height: 1.4),
                    ),
                    if (walletState.kycStatus != 'approved') ...[
                      const SizedBox(height: 16),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size.fromHeight(44),
                          backgroundColor: const Color(0xFF38BDF8),
                          foregroundColor: Colors.black,
                        ),
                        onPressed: () {
                          // Push to kyc verification page
                          context.push('/support'); // Re-routed to support upload mock
                        },
                        child: const Text('Verify Identity Now', style: TextStyle(fontWeight: FontWeight.bold)),
                      )
                    ],
                  ],
                ),
              ),
            ),

            const SizedBox(height: 32),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.withOpacity(0.1),
                foregroundColor: Colors.redAccent,
                minimumSize: const Size.fromHeight(50),
                side: BorderSide(color: Colors.red.withOpacity(0.2)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () async {
                await ref.read(authStateProvider.notifier).logout();
                if (context.mounted) {
                  context.go('/login');
                }
              },
              icon: const Icon(LucideIcons.logOut, size: 18),
              label: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
