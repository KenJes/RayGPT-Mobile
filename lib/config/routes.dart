import 'package:go_router/go_router.dart';
import '../features/chat/presentation/chat_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/knowledge_base/kb_screen.dart';

final router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const ChatScreen(),
    ),
    GoRoute(
      path: '/settings',
      builder: (context, state) => const SettingsScreen(),
    ),
    GoRoute(
      path: '/knowledge-base',
      builder: (context, state) => const KnowledgeBaseScreen(),
    ),
  ],
);
