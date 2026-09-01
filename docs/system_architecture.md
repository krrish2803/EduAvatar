# System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  index.html │  │dashboard.html│  │ lesson.html │                 │
│  │  (Landing)  │  │  (Dashboard) │  │ (Classroom) │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                         │
│         └────────────────┼────────────────┘                         │
│                          │                                          │
│                    ┌─────┴─────┐                                    │
│                    │  api.js   │                                    │
│                    │ (API Layer)│                                   │
│                    └─────┬─────┘                                    │
└──────────────────────────┼──────────────────────────────────────────┘
                           │ HTTP/REST
┌──────────────────────────┼──────────────────────────────────────────┐
│                    SERVER LAYER                                     │
│                    ┌─────┴─────┐                                    │
│                    │server.js  │                                    │
│                    │ (Express) │                                    │
│                    └─────┬─────┘                                    │
│                          │                                          │
│  ┌───────────┬───────────┼───────────┬───────────┐                  │
│  │           │           │           │           │                  │
│  ▼           ▼           ▼           ▼           ▼                  │
│ ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                       │
│ │RAG  │  │LLM  │  │TTS  │  │Video│  │Profile│                      │
│ │Route│  │Route│  │Route│  │Route│  │Route │                       │
│ └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘                       │
│    │        │        │        │        │                            │
└────┼────────┼────────┼────────┼────────┼────────────────────────────┘
     │        │        │        │        │
     ▼        ▼        ▼        ▼        ▼
┌─────────┐┌─────┐┌────────┐┌──────┐┌─────────┐
│ Qdrant  ││NVIDIA││Edge-TTS││FFmpeg││ MongoDB │
│ VectorDB││ NIM  ││ (Py)   ││      ││ Atlas   │
└─────────┘└─────┘└────────┘└──────┘└─────────┘
```

## Detailed Component Flow

### 1. Document Ingestion Flow

```
User Upload → Multer (memoryStorage) → PDF Parser → Concept Extractor
                                                      ↓
                                              Qdrant Vector DB
                                              (nvidia/nemotron-3-embed-1b)
```

### 2. Lesson Generation Flow

```
Student Request → Profile Lookup → LLM Prompt Construction
                                          ↓
                                   NVIDIA LLM (llama-3.2-11b)
                                          ↓
                                   Lesson JSON Response
                                          ↓
                                   Frontend Rendering
```

### 3. Avatar Video Generation Flow

```
Speech Text → Edge-TTS (Python) → Audio File (.mp3)
                                        ↓
                              Avatar Image (PIL)
                                        ↓
                                   FFmpeg
                                        ↓
                              MP4 Video + Subtitles
```

### 4. RAG Retrieval Flow

```
Student Query → Embed (nemotron-3-embed-1b) → Qdrant Search
                                                      ↓
                                              Context Injection
                                                      ↓
                                        LLM Response Generation
```

## File Structure

```
EduAvatar/
├── index.html              # Landing page
├── dashboard.html          # Main dashboard
├── lesson.html             # Interactive classroom
├── js/
│   └── api.js              # API client layer
├── css/
│   ├── style.css           # Main styles
│   └── accessibility.css   # Accessibility
├── server.js               # Express backend (1300+ lines)
├── backend/
│   ├── avatar/
│   │   ├── tts.py          # Edge-TTS wrapper
│   │   ├── video_gen.py    # FFmpeg video generator
│   │   └── pitch_generator.py
│   └── prompts/            # 20 prompt templates
│       ├── rag_analyzer_system.txt
│       ├── curriculum_architect_system.txt
│       ├── video_director_system.txt
│       └── ... (17 more)
├── uploads/
│   ├── videos/             # Generated avatar videos
│   └── documents/          # Uploaded study materials
└── docs/                   # This documentation
```

## Security Considerations

| Concern | Implementation |
|---------|----------------|
| API Key Protection | Environment variables (.env) |
| Rate Limiting | express-rate-limit (100 req/15min) |
| Input Validation | Server-side sanitization |
| CORS | Configured for localhost:3001 |
| File Upload | Memory storage, no disk writes |
