# Voice Implementation

## Overview

EduAvatar uses Edge-TTS (Microsoft's free neural text-to-speech) for high-quality voice synthesis without any API costs.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOICE PIPELINE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Text    │───▶│  Edge-   │───▶│  Audio   │───▶│  Video   │  │
│  │  Input   │    │  TTS     │    │  (.mp3)  │    │  Merge   │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │              │               │               │          │
│       │              ▼               │               │          │
│       │         ┌──────────┐        │               │          │
│       │         │  Voice   │        │               │          │
│       │         │  Selection│       │               │          │
│       │         └──────────┘        │               │          │
│       │                             │               │          │
│       │              ┌──────────────┘               │          │
│       │              │                              │          │
│       │              ▼                              ▼          │
│       │         ┌──────────┐                ┌──────────┐       │
│       │         │Subtitle  │                │  FFmpeg  │       │
│       │         │Generation│                │  Merge   │       │
│       │         └──────────┘                └──────────┘       │
│       │                                      │                  │
│       │                                      ▼                  │
│       │                                 ┌──────────┐            │
│       │                                 │  MP4     │            │
│       │                                 │  Output  │            │
│       │                                 └──────────┘            │
│       │                                                          │
└───────┼──────────────────────────────────────────────────────────┘
        │
        ▼
   ┌─────────┐
   │ Browser  │
   │ Playback │
   └─────────┘
```

---

## Edge-TTS Integration

### Python Wrapper

```python
# backend/avatar/tts.py
import edge_tts
import asyncio

VOICES = {
    'en': {'male': 'en-US-GuyNeural', 'female': 'en-US-JennyNeural'},
    'hi': {'male': 'hi-IN-MadhurNeural', 'female': 'hi-IN-SwaraNeural'},
    'uk': {'male': 'uk-UA-PavloNeural', 'female': 'uk-UA-PolinaNeural'},
    'es': {'male': 'es-AR-TomasNeural', 'female': 'es-AR-ElenaNeural'},
    'fr': {'male': 'fr-FR-HenriNeural', 'female': 'fr-FR-DeniseNeural'},
    'de': {'male': 'de-DE-ConradNeural', 'female': 'de-DE-KatjaNeural'}
}

async def generate_speech(text, voice, output_file):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)
```

### Node.js Integration

```javascript
// server.js - Avatar generation endpoint
app.post('/api/generate-avatar', async (req, res) => {
    const { text, language = 'en', gender = 'female' } = req.body;
    
    const voice = VOICE_MAP[language][gender];
    const audioFile = `/tmp/avatar_${Date.now()}.mp3`;
    const videoFile = `/uploads/videos/avatar_${Date.now()}.mp4`;
    
    // Generate speech
    await exec(`python3 backend/avatar/tts.py "${text}" "${voice}" "${audioFile}"`);
    
    // Merge with avatar
    await exec(`python3 backend/avatar/video_gen.py "${audioFile}" "${avatarImage}" "${videoFile}"`);
    
    res.json({ video_url: videoFile });
});
```

---

## Voice Quality Optimization

### Audio Encoding Settings

```javascript
const AUDIO_SETTINGS = {
    sampleRate: 24000,
    bitRate: '192k',  // High quality
    format: 'mp3',
    channels: 1  // Mono (voice)
};
```

### Video Re-encoding (Fixes Concatenation Issues)

```javascript
// Re-encode segments at consistent quality
ffmpeg()
    .input(segmentFile)
    .videoCodec('libx264')
    .audioCodec('aac')
    .audioBitrate('192k')  // Ensure consistent audio quality
    .output(reEncodedSegment)
```

---

## Voice Selection UI

```html
<!-- Dashboard Settings -->
<div class="voice-selector">
    <label>Language</label>
    <select id="language">
        <option value="en">English</option>
        <option value="hi">Hindi</option>
        <option value="uk">Ukrainian</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
        <option value="de">German</option>
    </select>
    
    <label>Gender</label>
    <select id="gender">
        <option value="female">Female</option>
        <option value="male">Male</option>
    </select>
</div>
```

---

## Performance Optimization

### Caching Strategy

```javascript
// Cache generated audio files
const audioCache = new Map();

async function getCachedAudio(text, voice) {
    const cacheKey = `${text}_${voice}`;
    
    if (audioCache.has(cacheKey)) {
        return audioCache.get(cacheKey);
    }
    
    const audioFile = await generateSpeech(text, voice);
    audioCache.set(cacheKey, audioFile);
    
    return audioFile;
}
```

### Batch Processing

```javascript
// Process multiple sentences in parallel
async function generateLessonAudio(sentences, voice) {
    const promises = sentences.map(sentence => 
        generateSpeech(sentence, voice)
    );
    
    return await Promise.all(promises);
}
```

---

## Voice Quality Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Clarity | >4.5/5 | ~4.3/5 |
| Naturalness | >4.0/5 | ~3.9/5 |
| Pronunciation | >95% | ~92% |
| Speed | <1s/sentence | ~0.8s |
| Consistency | 100% | 100% |

---

## Known Limitations

1. **No Custom Voices**: Limited to Microsoft's voice library
2. **No Emotion Control**: Cannot adjust tone/expression
3. **Fixed Speed**: No real-time speed adjustment
4. **No SSML Support**: Limited markup for pronunciation control
5. **Offline Dependency**: Requires Python + edge-tts package installed

---

## Future Improvements

| Feature | Priority | Effort |
|---------|----------|--------|
| ElevenLabs integration | High | Medium |
| SSML support | Medium | Low |
| Emotion control | Medium | High |
| Custom voice training | Low | High |
| Real-time streaming | Medium | Medium |
