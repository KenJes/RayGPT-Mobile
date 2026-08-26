import 'package:flutter_riverpod/flutter_riverpod.dart';

enum InferenceTarget { local, cloud }

class InferenceRouter {
  final List<String> _cloudKeywords = [
    'crea', 'busca', 'calendario', 'spotify', 'youtube', 'google',
    'documento', 'imagen', 'analiza', 'investiga', 'slides', 'sheets'
  ];

  InferenceTarget decide(String query, bool hasAttachments, bool isOnline, bool isLocalModelLoaded) {
    if (!isOnline) {
      // If no internet, we MUST use local if available. 
      // If not available, it will fail gracefully at the call site.
      return InferenceTarget.local;
    }

    if (hasAttachments) {
      // If we have attachments, assume RAG/vision which requires cloud backend
      return InferenceTarget.cloud;
    }

    final lowerQuery = query.toLowerCase();
    
    // Check for tool/cloud keywords
    for (final keyword in _cloudKeywords) {
      if (lowerQuery.contains(keyword)) {
        return InferenceTarget.cloud;
      }
    }

    // Short queries without keywords can be handled locally if model is ready
    if (query.length < 200 && isLocalModelLoaded) {
      return InferenceTarget.local;
    }

    // Default to cloud
    return InferenceTarget.cloud;
  }
}

final inferenceRouterProvider = Provider<InferenceRouter>((ref) {
  return InferenceRouter();
});
