import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/edge_ai/model_manager.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _useLocalModel = false;
  String _personality = 'Amigable';
  double _ttsSpeed = 1.0;

  @override
  Widget build(BuildContext context) {
    final modelManager = ref.watch(modelManagerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Configuración')),
      body: ListView(
        children: [
          // Conexión
          _buildSectionHeader('Conexión'),
          ListTile(
            title: const Text('Backend URL'),
            subtitle: const Text('https://api.raygpt.dev'),
            trailing: const Icon(Icons.circle, color: Colors.green, size: 12),
            onTap: () {
              // Edit URL
            },
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: ElevatedButton(
              onPressed: () {},
              child: const Text('Probar Conexión'),
            ),
          ),
          const Divider(),

          // Modelo de IA
          _buildSectionHeader('Modelo de IA'),
          SwitchListTile(
            title: const Text('Usar modelo local'),
            subtitle: const Text('Inferencia en el dispositivo para mayor privacidad y sin internet'),
            value: _useLocalModel,
            onChanged: (val) {
              setState(() => _useLocalModel = val);
            },
          ),
          if (_useLocalModel)
            FutureBuilder<List<LocalModel>>(
              future: modelManager.getAvailableModels(),
              builder: (context, snapshot) {
                if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
                final models = snapshot.data!;
                return Column(
                  children: models.map((m) => ListTile(
                    title: Text(m.name),
                    subtitle: Text('${m.sizeInMB} MB - ${m.description}'),
                    trailing: m.isDownloaded
                      ? IconButton(icon: const Icon(Icons.delete, color: Colors.red), onPressed: () {})
                      : IconButton(icon: const Icon(Icons.download), onPressed: () {}),
                  )).toList(),
                );
              },
            ),
          const Divider(),

          // Personalidad
          _buildSectionHeader('Personalidad'),
          RadioListTile(
            title: const Text('Amigable'),
            subtitle: const Text('Respuestas cálidas y detalladas'),
            value: 'Amigable',
            groupValue: _personality,
            onChanged: (val) => setState(() => _personality = val as String),
          ),
          RadioListTile(
            title: const Text('Directo'),
            subtitle: const Text('Respuestas concisas y al grano'),
            value: 'Directo',
            groupValue: _personality,
            onChanged: (val) => setState(() => _personality = val as String),
          ),
          const Divider(),

          // Voz
          _buildSectionHeader('Voz (TTS)'),
          ListTile(
            title: const Text('Velocidad de voz'),
            subtitle: Slider(
              value: _ttsSpeed,
              min: 0.5,
              max: 2.0,
              divisions: 15,
              label: _ttsSpeed.toStringAsFixed(1),
              onChanged: (val) => setState(() => _ttsSpeed = val),
            ),
          ),
          ListTile(
            title: const Text('Idioma'),
            trailing: const Text('Español (ES)'),
            onTap: () {},
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: OutlinedButton(
              onPressed: () {},
              child: const Text('Probar Voz'),
            ),
          ),
          const Divider(),

          // Base de Conocimiento
          _buildSectionHeader('Base de Conocimiento'),
          ListTile(
            leading: const Icon(Icons.folder_shared),
            title: const Text('Gestionar Documentos'),
            trailing: const Chip(label: Text('3')),
            onTap: () {
              Navigator.pushNamed(context, '/kb');
            },
          ),
          const Divider(),

          // Acerca de
          _buildSectionHeader('Acerca de'),
          const ListTile(
            title: Text('Raymundo by Axoloit'),
            subtitle: Text('Versión 2.0.0\nDesarrollado por Kenneth Alcalá'),
            isThreeLine: true,
          ),
          ListTile(
            leading: const Icon(Icons.code),
            title: const Text('GitHub'),
            onTap: () {},
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.blue),
      ),
    );
  }
}
