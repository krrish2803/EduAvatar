# EduAvatar

**AI-Powered Personalized Teaching Platform with Interactive Avatar**

EduAvatar is an open-source educational platform that uses AI to create personalized video lessons with an interactive avatar teacher. It adapts to each student's learning pace, supports multiple languages, and generates curriculum, scripts, visuals, and assessments automatically from uploaded documents or topic descriptions.

---

## Problem Statement

Traditional online learning is passive and one-size-fits-all:
- Students watch pre-recorded videos at fixed pace
- No personalization based on individual learning styles
- Content is static — no adaptation to student performance
- Language barriers limit access for non-English speakers
- No interactive elements to maintain engagement
- Teachers spend hours creating curriculum, scripts, and visuals manually

## Solution

EduAvatar solves these problems with:

1. **AI Curriculum Generation** — Upload a document or enter a topic, get a complete structured curriculum in seconds
2. **Adaptive Learning** — The system tracks student progress and adjusts difficulty in real-time
3. **Interactive Avatar Teacher** — AI-generated voice with synchronized visuals creates engaging video lessons
4. **RAG-Powered Q&A** — Students can ask questions about uploaded documents and get accurate answers
5. **Multi-Language Support** — Generate lessons in English, Hindi, and other languages
6. **Real-Time Analytics** — Track comprehension, engagement, and learning patterns

---

## Features

| Feature | Description |
|---------|-------------|
| Document Processing | Upload PDFs, DOCX, PPT, TXT — auto-chunked and vectorized |
| Curriculum Generation | AI creates structured modules from any topic |
| Lesson Generation | Detailed lesson plans with concepts and key points |
| Script Generation | Video scripts with timed segments and narration |
| Visual Designer | Auto-generates mermaid diagrams, LaTeX formulas, or image specs |
| Interactive Diagrams | Step-by-step reveal diagrams synchronized with narration |
| Concept Maps | Visual knowledge graphs showing concept relationships |
| Coding Demos | Step-by-step programming tutorials with explanations |
| Avatar Studio | TTS voice generation with multiple voice options |
| Student Analytics | Track progress, comprehension, engagement metrics |
| RAG Chat | Ask questions about uploaded documents |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, JavaScript (Vanilla) |
| Backend | Node.js + Express |
| LLM | NVIDIA API (Llama 3.2 11B Vision) |
| Vector DB | Qdrant Cloud (for RAG) |
| Database | MongoDB Atlas |
| TTS | Edge-TTS (Microsoft, free) |
| Video | FFmpeg (free) |
| PDF Parsing | pdf-parse |

---

## Setup Instructions

### Prerequisites

- **Node.js** >= 18.x
- **Python** >= 3.9
- **FFmpeg** installed and in PATH
- **MongoDB Atlas** account (free tier works)
- **Qdrant Cloud** account (free tier works)
- **NVIDIA API Key** (free tier available)

### 1. Clone the Repository

```bash
git clone https://github.com/krrish2803/EduAvatar.git
cd EduAvatar
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Python Dependencies

```bash
pip install edge-tts pdf-parse
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=3001

# NVIDIA API (get from https://build.nvidia.com/)
NVIDIA_API_KEY=your_nvidia_api_key_here

# MongoDB Atlas (get from https://www.mongodb.com/atlas)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/eduavatar?authSource=admin

# Qdrant Cloud (get from https://cloud.qdrant.io/)
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key_here
```

### 5. Start the Server

```bash
node server.js
```

### 6. Open the Application

Navigate to `http://localhost:3001` in your browser.

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents` | GET | List uploaded documents |
| `/api/process-document` | POST | Upload and vectorize a document |
| `/api/chat` | POST | RAG-powered chat with document context |
| `/api/generate-curriculum` | POST | Generate curriculum from topic |
| `/api/generate-lesson` | POST | Generate lesson plan |
| `/api/generate-script` | POST | Generate video script |
| `/api/generate-visuals` | POST | Generate visual design |
| `/api/interactive-diagram` | POST | Generate interactive diagram |
| `/api/concept-map` | POST | Generate concept map |
| `/api/coding-demo` | POST | Generate coding tutorial |
| `/api/generate-avatar` | POST | Generate TTS audio |
| `/api/profile/:studentId` | GET | Get student profile |
| `/api/analytics/:studentId` | GET | Get learning analytics |
| `/api/save-progress` | POST | Save student progress |

---

## Workflow

```
1. UPLOAD DOCUMENT (PDF/DOCX/TXT)
         ↓
2. PARSE & CHUNK (pdf-parse)
         ↓
3. EMBED & STORE (NVIDIA Embeddings → Qdrant)
         ↓
4. GENERATE CURRICULUM (NVIDIA LLM)
         ↓
5. GENERATE LESSON PLAN (NVIDIA LLM)
         ↓
6. GENERATE VIDEO SCRIPT (NVIDIA LLM)
         ↓
7. GENERATE VISUALS (Mermaid/LaTeX/Image)
         ↓
8. GENERATE AVATAR VOICE (Edge-TTS)
         ↓
9. STUDENT LEARNS (Interactive + RAG Chat)
         ↓
10. TRACK ANALYTICS (MongoDB)
```

---

## Project Structure

```
EduAvatar/
├── server.js              # Main Express server
├── index.html             # Landing page
├── auth.html              # Login/Signup
├── dashboard.html         # Student dashboard
├── lesson.html            # Live lesson player
├── css/
│   ├── style.css          # Main styles
│   ├── responsive.css     # Mobile responsiveness
│   ├── animations.css     # Animations
│   └── accessibility.css  # Accessibility
├── js/
│   ├── api.js             # API client
│   └── main.js            # UI logic
├── backend/
│   ├── avatar/
│   │   ├── tts.py         # Text-to-Speech
│   │   ├── video_gen.py   # Video generation
│   │   └── pitch_generator.py
│   └── prompts/           # AI system prompts
├── docs/                  # Documentation
├── uploads/               # User uploads (gitignored)
├── .env                   # Environment variables (gitignored)
└── package.json
```

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [NVIDIA API](https://build.nvidia.com/) — Free LLM inference
- [Qdrant](https://qdrant.tech/) — Vector database
- [Edge-TTS](https://github.com/rany2/edge-tts) — Free text-to-speech
- [FFmpeg](https://ffmpeg.org/) — Audio/video processing
