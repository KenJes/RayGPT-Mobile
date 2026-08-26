import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../config/constants.dart';

class WebSocketService {
  WebSocketChannel? _channel;
  StreamController<Map<String, dynamic>> _messageController = StreamController.broadcast();
  
  Stream<Map<String, dynamic>> get messages => _messageController.stream;

  void connect(String conversationId, String userId) {
    try {
      _channel = WebSocketChannel.connect(Uri.parse(AppConstants.defaultWebSocketUrl));
      
      _channel!.stream.listen(
        (data) {
          final decoded = jsonDecode(data);
          _messageController.add(decoded);
        },
        onError: (error) {
          _reconnect(conversationId, userId);
        },
        onDone: () {
          _reconnect(conversationId, userId);
        },
      );
    } catch (e) {
      _reconnect(conversationId, userId);
    }
  }

  void _reconnect(String conversationId, String userId) {
    Future.delayed(const Duration(seconds: 3), () {
      connect(conversationId, userId);
    });
  }

  void sendMessage(String content, String conversationId, String userId) {
    if (_channel != null) {
      final message = {
        'type': 'message',
        'content': content,
        'conversation_id': conversationId,
        'user_id': userId,
      };
      _channel!.sink.add(jsonEncode(message));
    }
  }

  void dispose() {
    _channel?.sink.close();
    _messageController.close();
  }
}
