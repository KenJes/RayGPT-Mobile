import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../domain/message_model.dart';
import '../../../shared/widgets/markdown_renderer.dart';
import '../../../shared/widgets/loading_indicator.dart';
import 'tool_status_card.dart';

class ChatBubble extends StatelessWidget {
  final Message message;

  const ChatBubble({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == 'user';
    final theme = Theme.of(context);

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.85,
        ),
        margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isUser ? theme.colorScheme.primary : theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 0),
            bottomRight: Radius.circular(isUser ? 0 : 16),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!isUser) ...[
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircleAvatar(
                    radius: 12,
                    backgroundColor: theme.colorScheme.secondary,
                    child: const Icon(Icons.smart_toy, size: 16, color: Colors.white),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Raymundo',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],
            if (message.toolCalls.isNotEmpty) ...[
              ...message.toolCalls.map((t) => ToolStatusCard(toolCall: t)),
              const SizedBox(height: 8),
            ],
            if (message.isStreaming && message.content.isEmpty)
              const TypingIndicator()
            else
              MarkdownRenderer(data: message.content, isUserMessage: isUser),
            const SizedBox(height: 4),
            Text(
              DateFormat('HH:mm').format(message.timestamp),
              style: TextStyle(
                fontSize: 10,
                color: isUser ? Colors.white70 : Colors.white54,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
