# RayGPT 2.0 — Raymundo Mobile 🤖📱

> Asistente de IA personalizable con RAG, MCP y Edge AI — La evolución móvil de [RayGPT](https://github.com/KenJes/RayGPT)

**Raymundo** es un asistente de inteligencia artificial conversacional desarrollado por **Axoloit**. Esta es la versión 2.0: una app móvil multiplataforma que combina un LLM en la nube (Gemini 2.5 Flash), un modelo local en el dispositivo (Gemma 3n), un pipeline de RAG con base de conocimiento vectorial, y herramientas MCP para Google Workspace, YouTube, Spotify y búsqueda web.

---

## ✨ Funcionalidades

| Categoría | Funcionalidad |
|---|---|
| 💬 **Chat** | Conversación con streaming en tiempo real, memoria persistente, dos modos de personalidad |
| 🧠 **Edge AI** | Modelo local (Gemma 3n) para chat offline sin conexión a internet |
| 📚 **RAG** | Sube PDFs, DOCX, TXT — haz preguntas sobre tus documentos con chunking jerárquico |
| 🔧 **MCP Tools** | Google Calendar, YouTube, Spotify, búsqueda web via Model Context Protocol |
| 🎙️ **Voz** | Texto a voz (TTS) + voz a texto (STT) bidireccional |
| 🖼️ **Visión** | Análisis de imágenes con Gemini Vision |
| 📄 **Google Workspace** | Crear Docs, Slides, Sheets, gestionar Calendar |
| 🎵 **Spotify** | Controlar reproducción: play, pause, next, buscar canciones |
| 🔍 **Web Search** | Búsqueda en internet y extracción de contenido web |

---

## 🏗️ Arquitectura

```mermaid
graph TB
    subgraph "📱 Flutter Mobile App"
        UI["Chat UI + Voice I/O"]
        LocalLLM["Edge AI<br/>Gemma 3n"]
        Router["Inference Router<br/>Local vs Cloud"]
    end

    subgraph "☁️ Backend FastAPI"
        Gateway["WebSocket + REST"]
        CloudLLM["Gemini 2.5 Flash/Pro<br/>via LiteLLM"]
        RAG["RAG Pipeline<br/>Qdrant + Embeddings"]
        MCP["MCP Client Manager"]
    end

    subgraph "🔧 MCP Servers"
        Calendar["Google Calendar"]
        YouTube["YouTube"]
        Spotify["Spotify"]
        WebSearch["Web Search"]
    end

    subgraph "💾 Data"
        PG["PostgreSQL"]
        QD["Qdrant"]
        Redis["Redis"]
    end

    UI --> Router
    Router -->|Offline/Simple| LocalLLM
    Router -->|Complex/Tools| Gateway
    Gateway --> CloudLLM
    Gateway --> RAG
    Gateway --> MCP
    MCP --> Calendar
    MCP --> YouTube
    MCP --> Spotify
    MCP --> WebSearch
    RAG --> QD
    Gateway --> PG
    Gateway --> Redis
```

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **App Móvil** | Flutter 3.x + Dart |
| **Estado** | Riverpod |
| **Navegación** | GoRouter |
| **DB Local** | Drift (SQLite) |
| **Red** | Dio + WebSocket |
| **Backend** | FastAPI + Python 3.12 |
| **LLM Cloud** | Gemini 2.5 Flash/Pro via LiteLLM |
| **LLM Local** | Gemma 3n (MediaPipe) |
| **RAG** | Qdrant + sentence-transformers |
| **MCP** | Python MCP SDK (FastMCP) |
| **Base de datos** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Vectores** | Qdrant |
| **Infraestructura** | Docker Compose |

---

## 📁 Estructura del Proyecto

```
raygpt_mobile/
├── lib/                              # Flutter App
│   ├── main.dart
│   ├── app.dart
│   ├── config/                       # Theme, routes, constants
│   ├── core/
│   │   ├── edge_ai/                  # Local LLM, model manager, inference router
│   │   └── network/                  # WebSocket, REST API client
│   ├── features/
│   │   ├── chat/                     # Chat screen, bubbles, input, provider
│   │   ├── voice/                    # TTS + STT service
│   │   ├── settings/                 # Settings screen
│   │   └── knowledge_base/           # Document management
│   └── shared/widgets/               # Markdown renderer, loading indicator
│
├── backend/                          # FastAPI Backend
│   ├── app/
│   │   ├── main.py                   # FastAPI entrypoint
│   │   ├── config.py                 # Pydantic settings
│   │   ├── api/v1/                   # REST + WebSocket endpoints
│   │   ├── core/
│   │   │   ├── llm/                  # LiteLLM router, prompts
│   │   │   ├── rag/                  # Pipeline, chunking, embeddings, retriever
│   │   │   └── mcp/                  # MCP client manager
│   │   ├── db/                       # PostgreSQL + Redis
│   │   ├── models/                   # Pydantic schemas
│   │   └── services/                 # Memory management
│   ├── mcp_servers/                  # MCP server implementations
│   │   ├── google_calendar_server.py
│   │   ├── youtube_server.py
│   │   ├── spotify_server.py
│   │   └── web_search_server.py
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── requirements.txt
│
├── pubspec.yaml
└── README.md
```

---

## 🚀 Cómo Ejecutar

### Requisitos Previos
- Flutter SDK 3.x
- Python 3.12+
- Docker y Docker Compose
- API Key de Google Gemini

### 1. Backend

```bash
cd backend

# Copiar variables de entorno
cp .env.example .env
# Editar .env con tus API keys

# Levantar servicios con Docker
docker-compose up -d

# Instalar dependencias Python
pip install -r requirements.txt

# Iniciar el servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. App Móvil

```bash
# Desde la raíz del proyecto
flutter pub get
flutter run
```

### Variables de Entorno (`.env`)

```env
GEMINI_API_KEY=tu-api-key-de-gemini
DATABASE_URL=postgresql+asyncpg://raymundo:password@localhost:5432/raygpt
REDIS_URL=redis://localhost:6379/0
QDRANT_URL=http://localhost:6333
JWT_SECRET=tu-clave-secreta-jwt
```

---

## 🤝 Créditos

Desarrollado por **Kenneth Alcalá** — [Axoloit](https://github.com/KenJes)

Evolución de [RayGPT v1](https://github.com/KenJes/RayGPT)

## 📄 Licencia

MIT
