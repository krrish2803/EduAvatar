# AI/ML Models Used

## Primary Models

### 1. NVIDIA LLM: meta/llama-3.2-11b-vision-instruct

| Attribute | Value |
|-----------|-------|
| **Provider** | NVIDIA NIM API |
| **Model ID** | `meta/llama-3.2-11b-vision-instruct` |
| **Parameters** | 11 billion |
| **Context Window** | 128,000 tokens |
| **Use Case** | All content generation, teaching, assessment |
| **Cost** | Free tier available |

**Why this model:**
- Fast inference for real-time teaching
- Good at structured JSON output
- Supports vision input (for future image-based Q&A)
- Cost-effective for demo/prototype

**Note:** `meta/llama-3.1-70b-instruct` returns 410 Gone on this API key.

### 2. NVIDIA Embedding: nvidia/nemotron-3-embed-1b

| Attribute | Value |
|-----------|-------|
| **Provider** | NVIDIA NIM API |
| **Model ID** | `nvidia/nemotron-3-embed-1b` |
| **Parameters** | 1 billion |
| **Dimensions** | 2048 |
| **Use Case** | Document vectorization, semantic search |
| **Cost** | Free tier available |

**Replaces deprecated:** `nvidia/nv-embedqa-e5-v5`

---

## Prompt Engineering Architecture

### Prompt File Structure

Each major feature has its own system prompt:

| Prompt File | Purpose | Token Budget |
|-------------|---------|--------------|
| `rag_analyzer_system.txt` | Document analysis | ~2000 |
| `curriculum_architect_system.txt` | Curriculum generation | ~1500 |
| `video_director_system.txt` | Lesson structure | ~1000 |
| `assessment_system.txt` | Quiz generation | ~1500 |
| `interactive_teaching_system.txt` | Teaching interaction | ~1000 |
| `adaptive_teaching_system.txt` | Misconception handling | ~1000 |
| `personalization_system.txt` | Student adaptation | ~1000 |
| `multilingual_system.txt` | Language switching | ~500 |
| `coding_demo_system.txt` | Code generation | ~1500 |
| `concept_map_system.txt` | Knowledge graphs | ~1000 |
| `interactive_diagram_system.txt` | Diagram generation | ~1000 |

### LLM Output Format

All LLM responses are JSON with markdown wrapper extraction:

```javascript
// Server extracts JSON from markdown code blocks
function extractJSON(text) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    // Parse and validate
    return JSON.parse(cleanedJson);
}
```

### Prompt Caching

System prompts are cached to reduce token usage:

```javascript
const promptCache = new Map();
// Cache key: prompt file name
// Cache value: prompt text
```

---

## Model Performance

| Metric | Value |
|--------|-------|
| Avg LLM Response Time | 2-5 seconds |
| Embedding Time | ~200ms per document |
| TTS Generation | ~1-3 seconds per sentence |
| Video Generation | ~10-30 seconds per segment |

---

## Future Model Upgrades

| Current | Planned Upgrade | Benefit |
|---------|-----------------|---------|
| llama-3.2-11b | llama-3.3-70b | Better reasoning |
| nemotron-3-embed | nv-embedqa-e5-v5 (when available) | Better retrieval |
| Edge-TTS | ElevenLabs | Premium voice quality |
| PIL Avatar | D-ID/HeyGen | Photorealistic avatar |
