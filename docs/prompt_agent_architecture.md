# Prompt/Agent Architecture

## Overview

EduAvatar uses a **multi-prompt architecture** where specialized system prompts handle different teaching tasks. Each prompt is carefully engineered to produce consistent, structured output.

---

## Prompt Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    MASTER ORCHESTRATOR                           │
│                    (server.js)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   CONTENT GENERATION                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │   RAG       │  │ Curriculum  │  │   Video     │     │   │
│  │  │  Analyzer   │  │  Architect  │  │  Director   │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 TEACHING INTERACTION                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │ Interactive │  │  Adaptive   │  │   Multi-    │     │   │
│  │  │  Teaching   │  │  Teaching   │  │   lingual   │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  ASSESSMENT & ANALYSIS                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │  Assessment │  │  Concept    │  │  Coding     │     │   │
│  │  │   System    │  │    Map      │  │    Demo     │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prompt Engineering Patterns

### Pattern 1: Structured JSON Output

Every prompt enforces strict JSON output:

```javascript
const curriculumPrompt = `
You are a world-class Curriculum Architect.
Output ONLY valid JSON. No markdown, no explanation.

Required JSON format:
{
    "modules": [{
        "title": "Module Title",
        "description": "What students will learn",
        "difficulty": "Beginner|Intermediate|Advanced",
        "lessons": [{
            "title": "Lesson Title",
            "duration_minutes": 15,
            "concepts": ["concept1", "concept2"]
        }]
    }]
}`;
```

### Pattern 2: Role-Based Prompting

Each prompt assigns a specific expert role:

```javascript
// RAG Analyzer - Acts as document analyst
"You are a world-class Educational Content Analyst..."

// Video Director - Acts as video producer
"You are a world-class Educational Video Director..."

// Assessment - Acts as test designer
"You are a world-class Educational Assessment Specialist..."
```

### Pattern 3: Output Constraints

Prompts specify exact output requirements:

```javascript
// Length constraints
"Keep explanations to 2-3 sentences."

// Format constraints
"Each response must end with a question."

// Content constraints
"Use only concepts from the uploaded material."
```

---

## Prompt Loading & Caching

```javascript
// Load prompt from file
async function loadPrompt(filename) {
    if (promptCache.has(filename)) {
        return promptCache.get(filename);
    }
    
    const prompt = await fs.readFile(
        path.join(__dirname, 'backend/prompts', filename),
        'utf-8'
    );
    
    promptCache.set(filename, prompt);
    return prompt;
}

// Cache invalidated on server restart
const promptCache = new Map();
```

---

## Conversation Flow State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                    LESSON STATE MACHINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐                                                   │
│  │  INIT    │──── startLesson() ──────▶┌──────────┐            │
│  └──────────┘                           │  INTRO   │            │
│                                         └────┬─────┘            │
│                                              │                  │
│                                              ▼                  │
│                                         ┌──────────┐            │
│                                         │ EXPLAIN  │            │
│                                         └────┬─────┘            │
│                                              │                  │
│                                              ▼                  │
│                                         ┌──────────┐            │
│                                         │ EXAMPLE  │            │
│                                         └────┬─────┘            │
│                                              │                  │
│                                              ▼                  │
│  ┌──────────┐◀───── askQuestion() ◀────┌──────────┐            │
│  │ QUESTION │                          │ FEEDBACK │            │
│  └────┬─────┘                          └──────────┘            │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐               │
│  │ FEEDBACK │────▶│RE-EXPLAIN│────▶│ CONFIRM  │               │
│  └──────────┘     └──────────┘     └────┬─────┘               │
│                                          │                      │
│                                          ▼                      │
│                                     ┌──────────┐               │
│                                     │   NEXT   │               │
│                                     └────┬─────┘               │
│                                          │                      │
│                                          ▼                      │
│                                     ┌──────────┐               │
│                                     │   DONE   │               │
│                                     └──────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prompt File Inventory

| File | Lines | Tokens | Purpose |
|------|-------|--------|---------|
| `rag_analyzer_system.txt` | 85 | ~2000 | Document analysis |
| `curriculum_architect_system.txt` | 62 | ~1500 | Learning path creation |
| `video_director_system.txt` | 48 | ~1000 | Lesson structure |
| `assessment_system.txt` | 55 | ~1500 | Quiz generation |
| `interactive_teaching_system.txt` | 42 | ~1000 | Student interaction |
| `adaptive_teaching_system.txt` | 38 | ~1000 | Misconception handling |
| `personalization_system.txt` | 35 | ~1000 | Student adaptation |
| `multilingual_system.txt` | 28 | ~500 | Language switching |
| `coding_demo_system.txt` | 52 | ~1500 | Code generation |
| `concept_map_system.txt` | 40 | ~1000 | Knowledge graphs |
| `interactive_diagram_system.txt` | 45 | ~1000 | Diagram generation |

**Total:** ~13,000 tokens in system prompts (cached after first load)
