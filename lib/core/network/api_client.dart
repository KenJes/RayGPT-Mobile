import 'dart:io';
import 'package:dio/dio.dart';
import '../../config/constants.dart';

class ApiClient {
  final Dio _dio;

  ApiClient() : _dio = Dio(BaseOptions(baseUrl: AppConstants.defaultApiBaseUrl));

  Future<Map<String, dynamic>> uploadDocument(File file) async {
    String fileName = file.path.split('/').last;
    FormData formData = FormData.fromMap({
      "file": await MultipartFile.fromFile(file.path, filename: fileName),
    });

    try {
      final response = await _dio.post('/api/v1/kb/upload', data: formData);
      return response.data;
    } catch (e) {
      throw Exception('Failed to upload document');
    }
  }

  Future<List<dynamic>> getConversations() async {
    try {
      final response = await _dio.get('/api/v1/conversations');
      return response.data;
    } catch (e) {
      return [];
    }
  }

  Future<List<dynamic>> getKnowledgeBase() async {
    try {
      final response = await _dio.get('/api/v1/kb/documents');
      return response.data;
    } catch (e) {
      return [];
    }
  }

  Future<void> deleteDocument(String id) async {
    try {
      await _dio.delete('/api/v1/kb/documents/$id');
    } catch (e) {
      throw Exception('Failed to delete document');
    }
  }

  Future<bool> checkHealth() async {
    try {
      final response = await _dio.get('/health');
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}
