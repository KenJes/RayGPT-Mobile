import 'package:flutter/material.dart';

class KbScreen extends StatefulWidget {
  const KbScreen({Key? key}) : super(key: key);

  @override
  State<KbScreen> createState() => _KbScreenState();
}

class _KbScreenState extends State<KbScreen> {
  final List<Map<String, dynamic>> _docs = [
    {'name': 'manual_usuario.pdf', 'date': '2023-10-25', 'chunks': 42, 'size': '2.4 MB', 'type': 'pdf'},
    {'name': 'politicas.docx', 'date': '2023-10-26', 'chunks': 15, 'size': '1.1 MB', 'type': 'docx'},
    {'name': 'notas.txt', 'date': '2023-10-27', 'chunks': 5, 'size': '12 KB', 'type': 'txt'},
  ];

  String _searchQuery = '';

  Future<void> _refresh() async {
    await Future.delayed(const Duration(seconds: 1));
    setState(() {});
  }

  void _uploadDoc() {
    // Mock upload
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Subiendo documento...')),
    );
    Future.delayed(const Duration(seconds: 2), () {
      setState(() {
        _docs.insert(0, {'name': 'nuevo_doc.pdf', 'date': '2026-08-26', 'chunks': 10, 'size': '500 KB', 'type': 'pdf'});
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Documento subido con éxito')),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final filteredDocs = _docs.where((d) => d['name'].toLowerCase().contains(_searchQuery.toLowerCase())).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Base de Conocimiento'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              showSearch(context: context, delegate: _KbSearchDelegate(this));
            },
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: filteredDocs.isEmpty
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.description_outlined, size: 80, color: Colors.grey[400]),
                    const SizedBox(height: 16),
                    const Text('Sube tu primer documento', style: TextStyle(fontSize: 18, color: Colors.grey)),
                  ],
                ),
              )
            : ListView.builder(
                itemCount: filteredDocs.length,
                itemBuilder: (context, index) {
                  final doc = filteredDocs[index];
                  IconData icon;
                  Color iconColor;
                  if (doc['type'] == 'pdf') {
                    icon = Icons.picture_as_pdf;
                    iconColor = Colors.red;
                  } else if (doc['type'] == 'docx') {
                    icon = Icons.description;
                    iconColor = Colors.blue;
                  } else {
                    icon = Icons.text_snippet;
                    iconColor = Colors.grey;
                  }

                  return Dismissible(
                    key: Key(doc['name']),
                    direction: DismissDirection.endToStart,
                    background: Container(
                      color: Colors.red,
                      alignment: Alignment.centerRight,
                      padding: const EdgeInsets.only(right: 20.0),
                      child: const Icon(Icons.delete, color: Colors.white),
                    ),
                    confirmDismiss: (direction) async {
                      return await showDialog(
                        context: context,
                        builder: (BuildContext context) {
                          return AlertDialog(
                            title: const Text("Confirmar"),
                            content: const Text("¿Estás seguro de que deseas eliminar este documento?"),
                            actions: <Widget>[
                              TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text("Cancelar")),
                              TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text("Eliminar")),
                            ],
                          );
                        },
                      );
                    },
                    onDismissed: (direction) {
                      setState(() {
                        _docs.remove(doc);
                      });
                    },
                    child: ListTile(
                      leading: Icon(icon, color: iconColor, size: 40),
                      title: Text(doc['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('${doc['date']} • ${doc['size']}'),
                      trailing: Chip(
                        label: Text('${doc['chunks']} chunks', style: const TextStyle(fontSize: 12)),
                        backgroundColor: Colors.blue.withOpacity(0.1),
                      ),
                      onTap: () {
                        // View details
                      },
                    ),
                  );
                },
              ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _uploadDoc,
        child: const Icon(Icons.add),
        tooltip: 'Subir Documento',
      ),
    );
  }
}

class _KbSearchDelegate extends SearchDelegate {
  final _KbScreenState state;
  _KbSearchDelegate(this.state);

  @override
  List<Widget>? buildActions(BuildContext context) {
    return [
      IconButton(icon: const Icon(Icons.clear), onPressed: () => query = ''),
    ];
  }

  @override
  Widget? buildLeading(BuildContext context) {
    return IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => close(context, null));
  }

  @override
  Widget buildResults(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      state.setState(() {
        state._searchQuery = query;
      });
      close(context, null);
    });
    return Container();
  }

  @override
  Widget buildSuggestions(BuildContext context) {
    return Container();
  }
}
