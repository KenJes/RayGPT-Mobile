import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/edge_ai/inference_router.dart';
import '../../core/edge_ai/local_llm_service.dart';

class Attachment {
  final String path;
  final String name;
  final String type;
  final int sizeBytes;

  Attachment({
    required this.path,
    required this.name,
    required this.type,
    required this.sizeBytes,
  });
}

class ChatMessage {
  final String text;
  final bool isUser;
  ChatMessage({required this.text, required this.isUser});
}

class ChatState {
  final List<ChatMessage> messages;
  final bool isOnline;
  final List<Attachment> attachments;
  final InferenceTarget inferenceTarget;
  final bool isGenerating;

  ChatState({
    required this.messages,
    this.isOnline = true,
    this.attachments = const [],
    this.inferenceTarget = InferenceTarget.cloud,
    this.isGenerating = false,
  });

  ChatState copyWith({
    List<ChatMessage>? messages,
    bool? isOnline,
    List<Attachment>? attachments,
    InferenceTarget? inferenceTarget,
    bool? isGenerating,
  }) {
    return ChatState(
      messages: messages ?? this.messages,
      isOnline: isOnline ?? this.isOnline,
      attachments: attachments ?? this.attachments,
      inferenceTarget: inferenceTarget ?? this.inferenceTarget,
      isGenerating: isGenerating ?? this.isGenerating,
    );
  }
}

class ChatNotifier extends StateNotifier<ChatState> {
  final InferenceRouter _router;
  final LocalLLMService _localLLM;

  ChatNotifier(this._router, this._localLLM) : super(ChatState(messages: []));

  void addAttachment(String path, String name, String type, int size) {
    final attachment = Attachment(path: path, name: name, type: type, sizeBytes: size);
    state = state.copyWith(attachments: [...state.attachments, attachment]);
  }

  void removeAttachment(Attachment attachment) {
    state = state.copyWith(
      attachments: state.attachments.where((a) => a != attachment).toList(),
    );
  }

  void setOnlineStatus(bool isOnline) {
    state = state.copyWith(isOnline: isOnline);
  }

  Future<void> sendMessage(String text) async {
    final userMsg = ChatMessage(text: text, isUser: true);
    state = state.copyWith(
      messages: [...state.messages, userMsg],
      isGenerating: true,
    );
    
    final attachments = state.attachments;
    // Clear attachments for next message
    state = state.copyWith(attachments: []);

    final target = _router.decide(
      text, 
      attachments.isNotEmpty, 
      state.isOnline,
      _localLLM.isModelLoaded
    );
    
    state = state.copyWith(inferenceTarget: target);

    if (target == InferenceTarget.local) {
      await _handleLocalInference(text);
    } else {
      await _handleCloudInference(text, attachments);
    }
  }

  Future<void> _handleLocalInference(String text) async {
    try {
      final stream = _localLLM.generateStream(text);
      String fullResponse = '';
      
      // Add empty bot message
      state = state.copyWith(
        messages: [...state.messages, ChatMessage(text: fullResponse, isUser: false)]
      );

      await for (final chunk in stream) {
        fullResponse += chunk;
        _updateLastMessage(fullResponse);
      }
    } catch (e) {
      _updateLastMessage('Error local: $e');
    } finally {
      state = state.copyWith(isGenerating: false);
    }
  }

  Future<void> _handleCloudInference(String text, List<Attachment> attachments) async {
    // Mock cloud inference via websocket
    await Future.delayed(const Duration(milliseconds: 500));
    String fullResponse = '';
    
    state = state.copyWith(
      messages: [...state.messages, ChatMessage(text: fullResponse, isUser: false)]
    );

    final words = 'Esta es una respuesta simulada desde la nube.'.split(' ');
    for (final word in words) {
      await Future.delayed(const Duration(milliseconds: 200));
      fullResponse += '$word ';
      _updateLastMessage(fullResponse);
    }
    state = state.copyWith(isGenerating: false);
  }

  void _updateLastMessage(String text) {
    final msgs = List<ChatMessage>.from(state.messages);
    if (msgs.isNotEmpty && !msgs.last.isUser) {
      msgs[msgs.length - 1] = ChatMessage(text: text, isUser: false);
      state = state.copyWith(messages: msgs);
    }
  }
}

final chatProvider = StateNotifierProvider<ChatNotifier, ChatState>((ref) {
  return ChatNotifier(
    ref.watch(inferenceRouterProvider),
    ref.watch(localLLMServiceProvider),
  );
});
