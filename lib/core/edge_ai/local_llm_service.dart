import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum LocalLLMStatus { unloaded, loading, ready, generating, error }

/// Service class for running LLM inference on-device
/// Currently implemented as a mock. In production, this should integrate
/// with MediaPipe LLM Inference API or TFLite.
/// Example integration:
/// 1. Add `mediapipe_genai` or similar flutter wrapper package
/// 2. Initialize the LlmInference engine with the local model path
class LocalLLMService {
  LocalLLMStatus _status = LocalLLMStatus.unloaded;
  LocalLLMStatus get status => _status;

  bool get isModelLoaded => _status == LocalLLMStatus.ready;

  /// Load model from local storage
  Future<void> loadModel(String modelPath) async {
    _status = LocalLLMStatus.loading;
    // Simulate loading delay
    await Future.delayed(const Duration(seconds: 2));
    // TODO: Initialize MediaPipe LLM inference here
    // _llmInference = await LlmInference.create(modelPath);
    _status = LocalLLMStatus.ready;
  }

  /// Generate text synchronously (waits for full response)
  Future<String> generate(String prompt, {int maxTokens = 256}) async {
    if (!isModelLoaded) throw Exception('Model not loaded');
    _status = LocalLLMStatus.generating;
    
    // Simulate generation
    await Future.delayed(const Duration(seconds: 1));
    final response = 'This is a mocked local response for: $prompt';
    
    _status = LocalLLMStatus.ready;
    return response;
  }

  /// Stream tokens as they are generated
  Stream<String> generateStream(String prompt, {int maxTokens = 256}) async* {
    if (!isModelLoaded) throw Exception('Model not loaded');
    _status = LocalLLMStatus.generating;
    
    // Simulate token-by-token generation with delays
    final words = 'Soy un modelo local procesando: $prompt'.split(' ');
    for (final word in words) {
      await Future.delayed(const Duration(milliseconds: 100));
      yield '$word ';
    }
    
    _status = LocalLLMStatus.ready;
  }

  /// Clean up resources
  void dispose() {
    // TODO: Dispose MediaPipe LLM inference here
    // _llmInference?.close();
    _status = LocalLLMStatus.unloaded;
  }
}

final localLLMServiceProvider = Provider<LocalLLMService>((ref) {
  final service = LocalLLMService();
  ref.onDispose(() => service.dispose());
  return service;
});
