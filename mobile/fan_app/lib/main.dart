import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:fan_app/pages/splash_page.dart';
import 'package:fan_app/pages/login_page.dart';
import 'package:fan_app/pages/register_page.dart';
import 'package:fan_app/pages/home_page.dart';
import 'package:fan_app/pages/navigation_page.dart';
import 'package:fan_app/pages/chat_page.dart';

void main() {
  runApp(
    const ProviderScope(
      child: StadiumOSFanApp(),
    ),
  );
}

class StadiumOSFanApp extends StatelessWidget {
  const StadiumOSFanApp({super.key});

  static final GoRouter _router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(path: '/', builder: (context, state) => const SplashPage()),
      GoRoute(path: '/login', builder: (context, state) => const LoginPage()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterPage()),
      GoRoute(path: '/home', builder: (context, state) => const HomePage()),
      GoRoute(path: '/navigation', builder: (context, state) => const NavigationPage()),
      GoRoute(path: '/chat', builder: (context, state) => const ChatPage()),
    ],
  );

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'StadiumOS Fan App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFF00E676),
        scaffoldBackgroundColor: const Color(0xFF0C0E12),
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
          labelStyle: TextStyle(color: Colors.grey),
        ),
      ),
      routerConfig: _router,
    );
  }
}
