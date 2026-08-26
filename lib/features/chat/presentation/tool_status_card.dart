import 'package:flutter/material.dart';
import '../domain/message_model.dart';

class ToolStatusCard extends StatelessWidget {
  final ToolCall toolCall;

  const ToolStatusCard({super.key, required this.toolCall});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;

    switch (toolCall.status) {
      case 'running':
        icon = Icons.sync;
        color = Colors.blue;
        break;
      case 'completed':
        icon = Icons.check_circle;
        color = Colors.green;
        break;
      case 'error':
        icon = Icons.error;
        color = Colors.red;
        break;
      default:
        icon = Icons.build;
        color = Colors.grey;
    }

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (toolCall.status == 'running')
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2, color: color),
            )
          else
            Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Text(
            toolCall.name,
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).textTheme.bodySmall?.color,
              fontFamily: 'Fira Code',
            ),
          ),
        ],
      ),
    );
  }
}
