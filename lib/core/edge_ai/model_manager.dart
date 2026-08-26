import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

class LocalModel {
  final String id;
  final String name;
  final double sizeInMB;
  final String description;
  final bool isDownloaded;

  const LocalModel({
    required this.id,
    required this.name,
    required this.sizeInMB,
    required this.description,
    this.isDownloaded = false,
  });

  LocalModel copyWith({bool? isDownloaded}) {
    return LocalModel(
      id: id,
      name: name,
      sizeInMB: sizeInMB,
      description: description,
      isDownloaded: isDownloaded ?? this.isDownloaded,
    );
  }
}

class ModelManager {
  final List<LocalModel> _predefinedModels = [
    const LocalModel(
      id: 'gemma_3n_4b',
      name: 'Gemma 3n 4B',
      sizeInMB: 2400.0,
      description: 'Modelo potente para razonamiento general.',
    ),
    const LocalModel(
      id: 'gemma_2_2b',
      name: 'Gemma 2 2B',
      sizeInMB: 1800.0,
      description: 'Buen balance entre rendimiento y tamaño.',
    ),
    const LocalModel(
      id: 'smollm2_1_7b',
      name: 'SmolLM2 1.7B',
      sizeInMB: 1200.0,
      description: 'Modelo ligero, ideal para dispositivos con poca RAM.',
    ),
  ];

  Future<String> _getModelsDirectory() async {
    final dir = await getApplicationDocumentsDirectory();
    final modelsDir = Directory('${dir.path}/models');
    if (!await modelsDir.exists()) {
      await modelsDir.create(recursive: true);
    }
    return modelsDir.path;
  }

  Future<String> getModelPath(String modelId) async {
    final dir = await _getModelsDirectory();
    return '$dir/$modelId.bin';
  }

  Future<bool> isModelDownloaded(String modelId) async {
    final path = await getModelPath(modelId);
    return File(path).exists();
  }

  Future<List<LocalModel>> getAvailableModels() async {
    final List<LocalModel> models = [];
    for (final model in _predefinedModels) {
      final isDownloaded = await isModelDownloaded(model.id);
      models.add(model.copyWith(isDownloaded: isDownloaded));
    }
    return models;
  }

  Future<void> downloadModel(String modelId) async {
    // Simulate model download
    final path = await getModelPath(modelId);
    await Future.delayed(const Duration(seconds: 3)); // Mock delay
    await File(path).writeAsString('mock model data');
  }

  Future<void> deleteModel(String modelId) async {
    final path = await getModelPath(modelId);
    final file = File(path);
    if (await file.exists()) {
      await file.delete();
    }
  }
}

final modelManagerProvider = Provider<ModelManager>((ref) {
  return ModelManager();
});
