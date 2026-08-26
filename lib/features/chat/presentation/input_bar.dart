import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/chat_provider.dart';
import '../../../core/edge_ai/inference_router.dart';

class InputBar extends ConsumerStatefulWidget {
  const InputBar({Key? key}) : super(key: key);

  @override
  ConsumerState<InputBar> createState() => _InputBarState();
}

class _InputBarState extends ConsumerState<InputBar> {
  final TextEditingController _controller = TextEditingController();
  bool _isRecording = false;
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      setState(() {
        _hasText = _controller.text.trim().isNotEmpty;
      });
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt),
                title: const Text('Cámara'),
                onTap: () {
                  Navigator.pop(context);
                  // Mock
                  ref.read(chatProvider.notifier).addAttachment('path/to/img', 'foto.jpg', 'image', 1024);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Galería'),
                onTap: () {
                  Navigator.pop(context);
                  // Mock
                  ref.read(chatProvider.notifier).addAttachment('path/to/gallery', 'img.png', 'image', 2048);
                },
              ),
              ListTile(
                leading: const Icon(Icons.description),
                title: const Text('Documento'),
                onTap: () {
                  Navigator.pop(context);
                  // Mock
                  ref.read(chatProvider.notifier).addAttachment('path/to/doc', 'doc.pdf', 'document', 5000);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _toggleRecording() {
    setState(() {
      _isRecording = !_isRecording;
    });
    // Record logic would go here
    if (!_isRecording) {
      // Sent audio logic
      ref.read(chatProvider.notifier).sendMessage('Audio message mock');
    }
  }

  void _send() {
    if (_hasText || ref.read(chatProvider).attachments.isNotEmpty) {
      ref.read(chatProvider.notifier).sendMessage(_controller.text.trim());
      _controller.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final chatState = ref.watch(chatProvider);
    final attachments = chatState.attachments;
    
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (attachments.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0),
            child: SizedBox(
              height: 50,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: attachments.length,
                itemBuilder: (context, index) {
                  final attachment = attachments[index];
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: Chip(
                      label: Text(attachment.name, style: const TextStyle(fontSize: 12)),
                      onDeleted: () {
                        ref.read(chatProvider.notifier).removeAttachment(attachment);
                      },
                      avatar: Icon(
                        attachment.type == 'image' ? Icons.image : Icons.description,
                        size: 16,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.add),
                onPressed: _showAttachmentOptions,
              ),
              Expanded(
                child: TextField(
                  controller: _controller,
                  decoration: InputDecoration(
                    hintText: 'Escribe un mensaje...',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    suffixIcon: chatState.inferenceTarget == InferenceTarget.local 
                      ? const Tooltip(message: 'Modelo Local', child: Icon(Icons.memory, size: 16, color: Colors.green))
                      : const Tooltip(message: 'Nube', child: Icon(Icons.cloud, size: 16, color: Colors.blue)),
                  ),
                  onSubmitted: (_) => _send(),
                ),
              ),
              if (_hasText || attachments.isNotEmpty)
                IconButton(
                  icon: const Icon(Icons.send, color: Colors.blue),
                  onPressed: _send,
                )
              else
                IconButton(
                  icon: Icon(
                    _isRecording ? Icons.stop : Icons.mic,
                    color: _isRecording ? Colors.red : null,
                  ),
                  onPressed: _toggleRecording,
                ),
            ],
          ),
        ),
      ],
    );
  }
}
