# RAG Implementation

## Overview

Retrieval-Augmented Generation (RAG) enables EduAvatar to answer questions about uploaded study materials with high accuracy.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     RAG PIPELINE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Upload  │───▶│  Parse   │───▶│  Chunk   │───▶│  Embed   │  │
│  │  PDF/PPTX│    │  Extract │    │  Split   │    │  Vector  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                              │                  │
│                                              ▼                  │
│                                     ┌──────────────┐            │
│                                     │   Qdrant     │            │
│                                     │  Collection  │            │
│                                     └──────┬───────┘            │
│                                            │                    │
│  ┌──────────┐    ┌──────────┐    ┌─────────┴───────┐            │
│  │  Query   │───▶│  Embed   │───▶│  Vector Search  │            │
│  │  Text    │    │  Query   │    │  (Top K = 5)    │            │
│  └──────────┘    └──────────┘    └─────────┬───────┘            │
│                                            │                    │
│                                            ▼                    │
│                                   ┌──────────────┐              │
│                                   │   Context    │              │
│                                   │   Injection  │              │
│                                   └──────┬───────┘              │
│                                          │                      │
│                                          ▼                      │
│                                   ┌──────────────┐              │
│                                   │  LLM Answer  │              │
│                                   └──────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Document Processing

```javascript
// PDF parsing with pdf-parse v2
const PDFParse = require('pdf-parse');
const pdfData = await PDFParse(fileBuffer);

// Concept extraction via LLM
const concepts = await chatWithModel(
    `${ragPrompt}\n\nAnalyze this text:\n${pdfData.text}`,
    { systemPrompt: ragSystemPrompt }
);
```

### 2. Vectorization

```javascript
// NVIDIA Embedding API
async function generateEmbedding(text) {
    const response = await fetch(
        'https://integrate.api.nvidia.com/v1/embeddings',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NVIDIA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: text,
                model: 'nvidia/nemotron-3-embed-1b',
                encoding_format: 'float',
                input_type: 'passage'
            })
        }
    );
    return response.data[0].embedding; // 2048 dimensions
}
```

### 3. Qdrant Storage

```javascript
// Store vectors with metadata
await qdrant.upsert('eduavatar_docs', {
    points: [{
        id: generateUUID(),
        vector: embedding,
        payload: {
            student_id: studentId,
            document_name: fileName,
            concept: conceptName,
            content: chunkText,
            page: pageNumber
        }
    }]
});
```

### 4. Retrieval

```javascript
// Semantic search
async function retrieveContext(query, studentId) {
    const queryEmbedding = await generateEmbedding(query);
    
    const results = await qdrant.search('eduavatar_docs', {
        vector: queryEmbedding,
        limit: 5,
        filter: {
            must: [{ key: 'student_id', match: { value: studentId } }]
        }
    });
    
    return results.map(r => r.payload.content).join('\n\n');
}
```

## Qdrant Configuration

| Setting | Value |
|---------|-------|
| Cluster | AWS eu-central-1 |
| Collection | `eduavatar_docs` |
| Vector Size | 2048 |
| Distance | Cosine |
| Index Type | HNSW |

## Performance Metrics

| Metric | Value |
|--------|-------|
| Indexing Speed | ~100 chunks/minute |
| Search Latency | <100ms |
| Accuracy (Top 5) | ~85% relevance |
| Storage per Doc | ~50KB per page |

## Known Limitations

1. **Chunk Size**: Fixed 500 tokens (not optimized per document type)
2. **No Reranking**: Uses basic similarity, no cross-encoder reranking
3. **Single Collection**: All students share same Qdrant collection
4. **No Hybrid Search**: Only vector search, no BM25/keyword fallback
