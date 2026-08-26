import 'package:record/record.dart';
import 'package:flutter_tts/flutter_tts.dart';

class VoiceService {
  final _audioRecorder = AudioRecorder();
  final _flutterTts = FlutterTts();

  Future<void> init() async {
    await _flutterTts.setLanguage("es-MX");
    await _flutterTts.setSpeechRate(0.5);
    await _flutterTts.setVolume(1.0);
    await _flutterTts.setPitch(1.0);
  }

  Future<void> startRecording() async {
    if (await _audioRecorder.hasPermission()) {
      await _audioRecorder.start(
        const RecordConfig(),
        path: 'temp_audio.m4a', // In a real app, use path_provider for temp dir
      );
    }
  }

  Future<String?> stopRecording() async {
    final path = await _audioRecorder.stop();
    return path;
  }

  Future<void> speak(String text) async {
    await _flutterTts.speak(text);
  }

  Future<void> stopSpeaking() async {
    await _flutterTts.stop();
  }

  void dispose() {
    _audioRecorder.dispose();
  }
}
