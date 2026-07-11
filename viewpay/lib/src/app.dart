import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import 'providers/auth_provider.dart';
import 'views/onboarding/onboarding_view.dart';
import 'views/auth/login_view.dart';
import 'views/auth/register_view.dart';
import 'views/auth/verify_otp_view.dart';
import 'views/dashboard/dashboard_view.dart';
import 'views/ads/ad_viewer_view.dart';
import 'views/wallet/wallet_view.dart';
import 'views/support/support_view.dart';

// GoRouter Routing Table Setup
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/onboarding',
    routes: [
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingView(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginView(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterView(),
      ),
      GoRoute(
        path: '/verify-otp',
        builder: (context, state) {
          final email = state.extra as String? ?? '';
          return VerifyOtpView(email: email);
        },
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DashboardView(),
      ),
      GoRoute(
        path: '/watch-ads',
        builder: (context, state) {
          final ad = state.extra as Map<String, dynamic>;
          return AdViewerView(ad: ad);
        },
      ),
      GoRoute(
        path: '/wallet',
        builder: (context, state) => const WalletView(),
      ),
      GoRoute(
        path: '/support',
        builder: (context, state) {
          final ticket = state.extra as Map<String, dynamic>;
          return SupportView(ticket: ticket);
        },
      ),
    ],
  );
});

class ViewPayApp extends ConsumerWidget {
  const ViewPayApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'ViewPay Rewards',
      debugShowCheckedModeBanner: false,
      routerConfig: router,
      themeMode: ThemeMode.dark, // Default to Dark Theme
      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF38BDF8),
          brightness: Brightness.dark,
          background: const Color(0xFF0F172A),
          surface: const Color(0xFF1E293B),
        ),
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
      ),
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF38BDF8),
          brightness: Brightness.light,
        ),
        textTheme: GoogleFonts.interTextTheme(ThemeData.light().textTheme),
      ),
    );
  }
}
