# EduAvatar - The Intelligent AI Teacher

EduAvatar is a next-generation, deeply personalized AI Teaching platform built to replicate the experience of a highly skilled, human tutor. 

## 🏆 Hackathon Mandatory Requirements Checklist

Here is exactly how EduAvatar fulfills every mandatory hackathon requirement:

| Requirement | How We Built It | Location in App |
|-------------|-----------------|-----------------|
| ✅ **Learning from uploaded material** | Integrated a robust RAG Pipeline prompt. The backend is designed to chunk, extract concepts, and vectorize documents (PDF, PPTX, etc.) into Qdrant. | `dashboard.html` (Upload Modal) & `rag_analyzer_system.txt` |
| ✅ **Topic-based teaching** | Built a Curriculum Architect Engine that takes any broad topic and mathematically generates a structured, modular learning path (with Capstones). | `dashboard.html` (Topic Learning Tab) & `/api/generate-curriculum` |
| ✅ **AI-generated lesson structure** | The NVIDIA LLM outputs strict, pedagogical JSON defining exact timestamps, spoken text, and dynamic visual blueprints. | `dashboard.html` (Video Studio) & `video_director_system.txt` |
| ✅ **Personalized teaching** | A Deep Personalization Engine reads the student's Profile (Level, Language, Style) and dynamically adjusts the LLM's complexity, jargon, and analogies. | `dashboard.html` (Settings & Overview Tab) & `personalization_system.txt` |
| ✅ **Human-like teaching interaction** | The LLM is restricted from delivering long monologues. It pauses the lesson, asks diagnostic questions, and waits for the student's input. | `lesson.html` (Interactive Chat) & `interactive_teaching_system.txt` |
| ✅ **Video-based AI presentation** | Built a stunning split-screen UI featuring the Teacher Video on the left and a Dynamic Whiteboard (for code/math/diagrams) on the right. | `lesson.html` |
| ✅ **AI voice & Human-like AI avatar**| Built a custom avatar pipeline using **Edge-TTS** (free neural voices) + **FFmpeg** for video generation. No API keys required - runs 100% locally. | `server.js` (`/api/generate-avatar`) & `backend/avatar/` |
| ✅ **Multilingual capability** | The backend forces the LLM to seamlessly switch languages (e.g., English to Hindi/Hinglish) mid-lesson while maintaining context and technical accuracy. | `dashboard.html` (Language Settings) & `multilingual_system.txt` |
| ✅ **Student questioning & assessment** | Built a Final Assessment Engine that generates end-of-lesson quizzes and outputs highly structured Learning Reports (Strong/Weak areas). | `dashboard.html` (Analytics Tab) & `assessment_system.txt` |
| ✅ **Adaptive response to performance** | Built an Adaptive Misconception Engine. If a student answers wrong, the AI does not just say "Wrong"—it identifies the gap, invents a *new* analogy, and re-teaches. | `lesson.html` (JS Misconception Flow) & `adaptive_teaching_system.txt` |
| ✅ **Working application/prototype** | A fully functional, stunning dark-mode frontend SPA connected to a Node.js/Express backend powered by the NVIDIA API. | The entire codebase! |

## 🚀 How to Run the Project
1. Start the Frontend Server: `python3 -m http.server 8080`
2. Start the Backend Server: `node server.js` (Ensure your `.env` is configured with NVIDIA and D-ID API keys).
3. Open `http://localhost:8080` in your browser.
