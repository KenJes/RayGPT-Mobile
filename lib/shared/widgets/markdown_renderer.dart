import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

class MarkdownRenderer extends StatelessWidget {
  final String data;
  final bool isUserMessage;

  const MarkdownRenderer({
    super.key,
    required this.data,
    this.isUserMessage = false,
  });

  @override
  Widget build(BuildContext context) {
    final textColor = isUserMessage ? Colors.white : Theme.of(context).textTheme.bodyLarge?.color ?? Colors.white;

    return MarkdownBody(
      data: data,
      selectable: true,
      styleSheet: MarkdownStyleSheet(
        p: TextStyle(color: textColor, fontSize: 16),
        h1: TextStyle(color: textColor, fontSize: 24, fontWeight: FontWeight.bold),
        h2: TextStyle(color: textColor, fontSize: 22, fontWeight: FontWeight.bold),
        h3: TextStyle(color: textColor, fontSize: 20, fontWeight: FontWeight.bold),
        code: TextStyle(
          color: isUserMessage ? Colors.white : Colors.cyanAccent,
          backgroundColor: isUserMessage ? Colors.transparent : Colors.black45,
          fontFamily: 'Fira Code',
        ),
        codeblockPadding: const EdgeInsets.all(8),
        codeblockDecoration: BoxDecoration(
          color: Colors.black87,
          borderRadius: BorderRadius.circular(8),
        ),
        blockquote: TextStyle(color: textColor.withOpacity(0.8), fontStyle: FontStyle.italic),
        blockquoteDecoration: BoxDecoration(
          border: Border(left: BorderSide(color: Colors.cyan, width: 4)),
        ),
      ),
    );
  }
}
