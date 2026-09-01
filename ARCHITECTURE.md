# EduAvatar Architecture

## System Architecture Overview

```mermaid
graph TB
    subgraph Frontend["Frontend (Browser)"]
        A[index.html<br/>Landing Page] --> B[auth.html<br/>Login/Signup]
        B --> C[dashboard.html<br/>Student Dashboard]
        C --> D[lesson.html<br/>Live Lesson Player]
    end

    subgraph Backend["Backend (Node.js + Express)"]
        E[server.js<br/>API Server]
        F[Document Processor<br/>PDF/DOCX Parser]
        G[Curriculum Generator<br/>NVIDIA LLM]
        H[Lesson Generator<br/>NVIDIA LLM]
        I[Script Generator<br/>NVIDIA LLM]
        J[Visual Designer<br/>NVIDIA LLM]
        K[Concept Map Generator<br/>NVIDIA LLM]
        L[Coding Demo Generator<br/>NVIDIA LLM]
        M[Avatar Generator<br/>Edge-TTS]
    end

    subgraph External["External Services"]
        N[NVIDIA API<br/>Llama 3.2 11B]
        O[Qdrant Cloud<br/>Vector Database]
        P[MongoDB Atlas<br/>Student Data]
    end

    subgraph Storage["Local Storage"]
        Q[uploads/<br/>Documents]
        R[uploads/videos/<br/>Generated Audio]
    end

    A -->|HTTP| E
    B -->|HTTP| E
    C -->|HTTP| E
    D -->|HTTP| E

    E --> F
    E --> G
    E --> H
    E --> I
    E --> J
    E --> K
    E --> L
    E --> M

    F --> Q
    M --> R

    G --> N
    H --> N
    I --> N
    J --> N
    K --> N
    L --> N

    F --> O
    E -->|RAG Chat| O

    E --> P
```

---

## Document Processing Pipeline

```mermaid
flowchart LR
    A[Upload Document<br/>PDF/DOCX/TXT] --> B[Parse Content<br/>pdf-parse]
    B --> C[Chunk Text<br/>500 chars + 50 overlap]
    C --> D[Generate Embeddings<br/>NVIDIA NV-Embed-QA]
    D --> E[Store in Qdrant<br/>Vector Collection]
    E --> F[Ready for RAG<br/>Q&A Queries]

    style A fill:#e1f5fe
    style F fill:#c8e6c9
```

---

## RAG (Retrieval-Augmented Generation) Flow

```mermaid
sequenceDiagram
    participant S as Student
    participant F as Frontend
    participant B as Backend
    participant Q as Qdrant
    participant L as NVIDIA LLM

    S->>F: Ask question about document
    F->>B: POST /api/chat {message, collectionId}
    B->>B: Embed query with NVIDIA
    B->>Q: Search similar chunks (top 5)
    Q-->>B: Return relevant chunks
    B->>B: Build context from chunks
    B->>L: Send question + context
    L-->>B: Generate answer
    B-->>F: Return answer with sources
    F-->>S: Display answer
```

---

## Curriculum Generation Flow

```mermaid
flowchart TD
    A[User Input:<br/>Topic + Level + Duration] --> B[NVIDIA LLM<br/>Curriculum Architect]
    B --> C{Generate Modules}
    C --> D[Module 1:<br/>Title + Description + Duration]
    C --> E[Module 2:<br/>Title + Description + Duration]
    C --> F[Module N:<br/>Title + Description + Duration]
    D --> G[JSON Response]
    E --> G
    F --> G
    G --> H[Display in Dashboard]
    H --> I[User selects Module]
    I --> J[Generate Lesson Plan]
    J --> K[Generate Script]
    K --> L[Generate Visuals]
    L --> M[Generate Avatar Audio]

    style A fill:#fff3e0
    style M fill:#c8e6c9
```

---

## Avatar Video Generation Pipeline

```mermaid
flowchart TD
    A[Script Segments<br/>from LLM] --> B[For Each Segment]
    B --> C[Edge-TTS<br/>Generate Audio]
    C --> D[FFmpeg<br/>Combine Audio]
    D --> E[Subtitle Timing<br/>from Script]
    E --> F[Final Video<br/>with Subtitles]

    subgraph Audio["Audio Generation"]
        C1[Text Input] --> C2[edge-tts Python]
        C2 --> C3[MP3 Output]
        C3 --> C4[Get Duration<br/>ffprobe]
    end

    subgraph Video["Video Assembly"]
        D1[Avatar Image] --> D2[FFmpeg]
        C3 --> D2
        E1[Subtitle SRT] --> D2
        D2 --> D3[MP4 Output]
    end

    style A fill:#e8eaf6
    style F fill:#c8e6c9
```

---

## Visual Types

```mermaid
flowchart LR
    A[Concept] --> B{Visual Type}
    B -->|Flowcharts<br/>Systems<br/>Processes| C[Mermaid]
    B -->|Math<br/>Physics<br/>Formulas| D[LaTeX]
    B -->|Biology<br/>History<br/>Physical| E[Image Spec]

    C --> F[Rendered Diagram]
    D --> G[Rendered Formula]
    E --> H[Element Coordinates<br/>+ Styles]

    style C fill:#e3f2fd
    style D fill:#fce4ec
    style E fill:#e8f5e9
```

---

## Data Storage Architecture

```mermaid
erDiagram
    STUDENT ||--o{ PROGRESS : has
    STUDENT ||--o{ ANALYTICS : has
    STUDENT ||--o{ DOCUMENT : uploads
    DOCUMENT ||--o{ CHUNK : contains
    CHUNK ||--o{ EMBEDDING : has

    STUDENT {
        string id PK
        string name
        string email
        string language
        string level
        object learningStyle
        object preferences
    }

    DOCUMENT {
        string id PK
        string filename
        string type
        int chunks
        datetime uploadedAt
    }

    CHUNK {
        string id PK
        string documentId FK
        string content
        int position
    }

    PROGRESS {
        string id PK
        string studentId FK
        string moduleId
        int percentage
        datetime lastAccessed
    }

    ANALYTICS {
        string id PK
        string studentId FK
        float comprehension
        float engagement
        float pace
        datetime timestamp
    }
```

---

## API Request Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Express Server
    participant N as NVIDIA API
    participant Q as Qdrant
    participant M as MongoDB

    Note over C,M: Document Upload
    C->>S: POST /api/process-document
    S->>S: Parse PDF with pdf-parse
    S->>S: Chunk text (500 chars)
    S->>N: Generate embeddings
    N-->>S: Embedding vectors
    S->>Q: Store vectors
    Q-->>S: Confirmation
    S-->>C: Success response

    Note over C,M: Chat with Document
    C->>S: POST /api/chat
    S->>N: Embed query
    N-->>S: Query vector
    S->>Q: Search similar chunks
    Q-->>S: Relevant chunks
    S->>N: Generate answer with context
    N-->>S: Answer
    S-->>C: Response with sources
```

---

## Multi-Language Support

```mermaid
flowchart LR
    A[User Language<br/>Preference] --> B{Language}
    B -->|en| C[English Voices<br/>Jenny/Guy]
    B -->|hi| D[Hindi Voices<br/>Swara/Madhur]
    B -->|en-GB| E[UK Voices<br/>Sonia/Ryan]
    B -->|en-AU| F[AU Voices<br/>Natasha/William]

    C --> G[Edge-TTS]
    D --> G
    E --> G
    F --> G

    G --> H[Generated Audio]
    H --> I[FFmpeg Video]

    style G fill:#fff9c4
    style I fill:#c8e6c9
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph Local["Local Development"]
        A[Node.js Server<br/>:3001]
        B[MongoDB Atlas]
        C[Qdrant Cloud]
        D[NVIDIA API]
    end

    subgraph Production["Production (Optional)"]
        E[Render / Railway / Fly.io]
        F[MongoDB Atlas]
        G[Qdrant Cloud]
        H[NVIDIA API]
        I[Cloudflare CDN]
    end

    A --> B
    A --> C
    A --> D

    E --> F
    E --> G
    E --> H
    I --> E

    style A fill:#e3f2fd
    style E fill:#c8e6c9
```

---

## Technology Decisions

| Choice | Why |
|--------|-----|
| **NVIDIA API (free)** | No cost, supports Llama 3.2, fast inference |
| **Qdrant Cloud (free)** | Managed vector DB, easy setup, good free tier |
| **MongoDB Atlas (free)** | Flexible schema for student data, free M0 tier |
| **Edge-TTS (free)** | Microsoft voices, no API key, high quality |
| **FFmpeg (free)** | Industry standard, reliable, works everywhere |
| **Vanilla JS (no framework)** | Zero build step, fast loading, simple deployment |
| **Express.js** | Minimal, fast, perfect for API server |
| **pdf-parse** | Pure JS, no native deps, works everywhere |
