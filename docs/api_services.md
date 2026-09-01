# APIs and Third-Party Services

## Overview

EduAvatar integrates with several external services for AI capabilities, storage, and voice generation.

---

## API Stack

| Service | Provider | Purpose | Cost |
|---------|----------|---------|------|
| NVIDIA NIM API | NVIDIA | LLM + Embeddings | Free tier |
| MongoDB Atlas | MongoDB | Database | Free tier (M0) |
| Qdrant Cloud | Qdrant | Vector database | Free tier |
| Edge-TTS | Microsoft | Text-to-speech | Free (open source) |
| FFmpeg | Open Source | Video generation | Free |

---

## 1. NVIDIA NIM API

### Base URL
```
https://integrate.api.nvidia.com/v1
```

### Authentication
```javascript
headers: {
    'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
    'Content-Type': 'application/json'
}
```

### Endpoints Used

#### Chat Completions
```javascript
POST /chat/completions

// Model: meta/llama-3.2-11b-vision-instruct
{
    model: 'meta/llama-3.2-11b-vision-instruct',
    messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 2048
}
```

#### Embeddings
```javascript
POST /embeddings

// Model: nvidia/nemotron-3-embed-1b
{
    input: "text to embed",
    model: "nvidia/nemotron-3-embed-1b",
    encoding_format: "float",
    input_type: "passage"
}

// Response: { data: [{ embedding: [0.1, 0.2, ...] }] }
// Dimensions: 2048
```

### Rate Limits
- 100 requests per 15 minutes (per IP)
- Model-specific limits vary

---

## 2. MongoDB Atlas

### Connection String
```javascript
// .env
MONGODB_URI=mongodb+srv://cluster0.xxxxx.mongodb.net/eduavatar

// server.js
mongoose.connect(process.env.MONGODB_URI, {
    tls: true,
    tlsAllowInvalidCertificates: false
});
```

### Collections

| Collection | Purpose | Documents |
|------------|---------|-----------|
| `studentprofiles` | Student data | Per student |
| `lessons` | Generated lessons | Per lesson |
| `analytics` | Performance data | Per session |
| `uploads` | Document metadata | Per upload |

### Schema Examples

```javascript
// StudentProfile Schema
{
    student_id: String,
    name: String,
    level: String,
    learning_style: String,
    language: String,
    subjects: [String],
    performance_history: [{
        topic: String,
        score: Number,
        date: Date,
        weak_areas: [String]
    }]
}
```

---

## 3. Qdrant Cloud

### Connection
```javascript
const { QdrantClient } = require('@qdrant/js-client-rest');

const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,  // https://xxxxx.aws.cloud.qdrant.io
    apiKey: process.env.QDRANT_API_KEY
});
```

### Collection Configuration

```javascript
// Create collection (run once)
await qdrant.createCollection('eduavatar_docs', {
    vectors: {
        size: 2048,  // nemotron-3-embed-1b dimensions
        distance: 'Cosine'
    }
});
```

### Operations Used

| Operation | Purpose | Frequency |
|-----------|---------|-----------|
| `upsert` | Store document vectors | On upload |
| `search` | Semantic search | On query |
| `delete` | Remove vectors | On document delete |
| `scroll` | List vectors | On admin |

---

## 4. Edge-TTS (Microsoft)

### Installation
```bash
pip install edge-tts
```

### Usage
```python
import edge_tts
import asyncio

async def text_to_speech(text, voice, output_file):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)

# Run
asyncio.run(text_to_speech("Hello world", "en-US-JennyNeural", "output.mp3"))
```

### Available Voices
```python
VOICES = {
    'en': {'male': 'en-US-GuyNeural', 'female': 'en-US-JennyNeural'},
    'hi': {'male': 'hi-IN-MadhurNeural', 'female': 'hi-IN-SwaraNeural'},
    'uk': {'male': 'uk-UA-PavloNeural', 'female': 'uk-UA-PolinaNeural'},
    'es': {'male': 'es-AR-TomasNeural', 'female': 'es-AR-ElenaNeural'},
    'fr': {'male': 'fr-FR-HenriNeural', 'female': 'fr-FR-DeniseNeural'},
    'de': {'male': 'de-DE-ConradNeural', 'female': 'de-DE-KatjaNeural'}
}
```

---

## 5. FFmpeg

### Installation
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg
```

### Commands Used

```bash
# Image + Audio → Video
ffmpeg -loop 1 -i avatar.png -i audio.mp3 \
    -c:v libx264 -tune stillimage \
    -c:a aac -b:a 192k \
    -pix_fmt yuv420p -shortest \
    output.mp4

# Concatenate videos
ffmpeg -f concat -safe 0 -i filelist.txt \
    -c copy merged.mp4

# Re-encode (fix quality issues)
ffmpeg -i input.mp4 \
    -c:v libx264 -c:a aac -b:a 192k \
    output.mp4
```

---

## Environment Variables

```bash
# .env file
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxx
MONGODB_URI=mongodb+srv://cluster0.xxxxx.mongodb.net/eduavatar
QDRANT_URL=https://xxxxx.aws.cloud.qdrant.io
QDRANT_API_KEY=xxxxxxxxxxxxx
SESSION_SECRET=your-secret-here
```

---

## API Error Handling

```javascript
// Rate limit handling
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: "Too many requests" }
});

// NVIDIA API errors
try {
    const response = await fetch(NVIDIA_ENDPOINT, options);
    if (response.status === 429) {
        // Rate limited - retry after delay
        await sleep(60000);
        return await retryRequest();
    }
    if (response.status === 410) {
        // Model deprecated - use fallback
        return await useFallbackModel();
    }
} catch (error) {
    console.error('API Error:', error.message);
}
```

---

## Cost Analysis

| Service | Free Tier | Overage | Monthly Est. |
|---------|-----------|---------|--------------|
| NVIDIA NIM | 1000 credits | $0.002/credit | $0 (demo) |
| MongoDB Atlas | 512 MB | $0.08/GB | $0 (M0) |
| Qdrant Cloud | 1 GB | $0.30/GB | $0 (demo) |
| Edge-TTS | Unlimited | N/A | $0 |
| FFmpeg | Unlimited | N/A | $0 |

**Total Cost for Demo: $0**
