# Setup Instructions

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 18+ | Backend server |
| Python | 3.9+ | Edge-TTS, PIL |
| npm | 9+ | Package management |
| pip | 21+ | Python packages |

---

## 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/your-username/EduAvatar.git
cd EduAvatar

# Install Node.js dependencies
npm install

# Install Python dependencies
pip install edge-tts Pillow
```

---

## 2. Environment Setup

Create `.env` file in root directory:

```bash
# NVIDIA API Key (free tier available)
NVIDIA_API_KEY=nvapi-your-key-here

# MongoDB Atlas (free M0 tier)
MONGODB_URI=mongodb+srv://cluster0.xxxxx.mongodb.net/eduavatar

# Qdrant Cloud (free tier)
QDRANT_URL=https://xxxxx.aws.cloud.qdrant.io
QDRANT_API_KEY=your-qdrant-key

# Session secret (change in production)
SESSION_SECRET=your-random-secret-here
```

### Getting API Keys

#### NVIDIA NIM API (Free)
1. Go to https://build.nvidia.com/
2. Sign up for free account
3. Go to API Keys section
4. Generate new key

#### MongoDB Atlas (Free M0)
1. Go to https://cloud.mongodb.com/
2. Create free account
3. Create M0 cluster
4. Get connection string
5. **Important:** Use `mongodb://` not `mongodb+srv://` for this setup

#### Qdrant Cloud (Free)
1. Go to https://cloud.qdrant.io/
2. Create free account
3. Create cluster
4. Get URL and API key

---

## 3. Start Servers

### Option A: Run Both Together

```bash
# Terminal 1: Backend
node server.js

# Terminal 2: Frontend
python3 -m http.server 8080
```

### Option B: Background Process

```bash
# Start backend in background
node server.js > /tmp/eduavatar.log 2>&1 &

# Start frontend
python3 -m http.server 8080
```

---

## 4. Access Application

| URL | Purpose |
|-----|---------|
| http://localhost:8080 | Landing page |
| http://localhost:8080/dashboard.html | Dashboard |
| http://localhost:8080/lesson.html | Interactive classroom |
| http://localhost:3001/health | Backend health check |

---

## 5. Verify Installation

```bash
# Check backend health
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","timestamp":"2026-08-30T..."}
```

---

## Quick Start (TL;DR)

```bash
# 1. Install dependencies
npm install && pip install edge-tts Pillow

# 2. Create .env with your API keys
cp .env.example .env
# Edit .env with your keys

# 3. Start servers
node server.js &
python3 -m http.server 8080

# 4. Open http://localhost:8080
```

---

## Troubleshooting

### MongoDB Connection Error
```
MongooseServerSelectionError: Could not connect to any servers
```
**Solution:** Use `mongodb://` with direct hosts, not `mongodb+srv://`

### NVIDIA API Error 410
```
Model meta/llama-3.1-70b-instruct is deprecated
```
**Solution:** Use `meta/llama-3.2-11b-vision-instruct` instead

### Edge-TTS Not Found
```
ModuleNotFoundError: No module named 'edge_tts'
```
**Solution:** `pip install edge-tts`

### FFmpeg Not Found
```
ffmpeg: command not found
```
**Solution:** `brew install ffmpeg` (macOS) or `sudo apt install ffmpeg` (Linux)
