class ToolCall {
  final String id;
  final String name;
  final String status;
  final String? result;

  const ToolCall({
    required this.id,
    required this.name,
    required this.status,
    this.result,
  });

  ToolCall copyWith({
    String? id,
    String? name,
    String? status,
    String? result,
  }) {
    return ToolCall(
      id: id ?? this.id,
      name: name ?? this.name,
      status: status ?? this.status,
      result: result ?? this.result,
    );
  }
}

class Message {
  final String id;
  final String content;
  final String role; // 'user', 'assistant', 'system'
  final DateTime timestamp;
  final List<String> attachments;
  final bool isStreaming;
  final List<ToolCall> toolCalls;

  const Message({
    required this.id,
    required this.content,
    required this.role,
    required this.timestamp,
    this.attachments = const [],
    this.isStreaming = false,
    this.toolCalls = const [],
  });

  Message copyWith({
    String? id,
    String? content,
    String? role,
    DateTime? timestamp,
    List<String>? attachments,
    bool? isStreaming,
    List<ToolCall>? toolCalls,
  }) {
    return Message(
      id: id ?? this.id,
      content: content ?? this.content,
      role: role ?? this.role,
      timestamp: timestamp ?? this.timestamp,
      attachments: attachments ?? this.attachments,
      isStreaming: isStreaming ?? this.isStreaming,
      toolCalls: toolCalls ?? this.toolCalls,
    );
  }
}
