# Known Limitations

## Current Limitations

### 1. Avatar & Video

| Limitation | Impact | Workaround | Future Fix |
|------------|--------|------------|------------|
| Static avatar image | Less engaging | Use good quality image | D-ID/HeyGen integration |
| No lip-sync | Avatar doesn't move with speech | None | Animated avatars |
| Fixed expressions | No emotional variation | None | Expression controls |
| Subtitles burned in | Can't adjust styling | None | WebVTT subtitles |
| No background options | Dark background only | None | Custom backgrounds |

### 2. AI Models

| Limitation | Impact | Workaround | Future Fix |
|------------|--------|------------|------------|
| 11B parameter model | Less nuanced than 70B | Simplify prompts | Upgrade to larger model |
| No model fine-tuning | Generic responses | Better prompting | Fine-tuned models |
| Limited context window | Long documents truncated | Chunk documents | Larger context models |
| JSON output instability | Occasional parse errors | Multi-step extraction | Structured output API |

### 3. RAG Pipeline

| Limitation | Impact | Workaround | Future Fix |
|------------|--------|------------|------------|
| Fixed chunk size | May split concepts | Manual adjustment | Adaptive chunking |
| No reranking | Basic similarity only | None | Cross-encoder reranking |
| Single collection | All users share vectors | Filter by student_id | Separate collections |
| No hybrid search | Vector only | None | BM25 + vector |

### 4. Multilingual

| Limitation | Impact | Workaround | Future Fix |
|------------|--------|------------|------------|
| Limited languages (6) | Some languages unsupported | None | Expand language support |
| No dialect support | Standard dialect only | None | Regional variants |
| Inconsistent code-switching | Awkward Hinglish | Better prompts | Fine-tuned model |
| No real-time translation | Set at profile level | None | Per-message switching |

### 5. Voice

| Limitation | Impact | Workaround | Future Fix |
|------------|--------|------------|------------|
| Limited voice options (2 per language) | No variety | None | More voice options |
| No emotion control | Flat delivery | None | Emotion tags |
| Fixed speed | Can't adjust pace | None | Speed controls |
| No SSML support | Limited pronunciation control | None | SSML parsing |

### 6. Assessment

| Limitation | Impact | Workaround | Future Fix |
|------------|--------|------------|------------|
| Basic quiz generation | Limited question types | None | Adaptive testing |
| No proctoring | Can't verify identity | None | Identity verification |
| No time limits | Unlimited quiz time | None | Timer support |
| Limited analytics | Basic metrics only | None | Advanced analytics |

---

## Technical Debt

### Code Quality

| Issue | Severity | Fix Effort |
|-------|----------|------------|
| Inline prompts in server.js | Medium | Medium |
| No TypeScript | Low | High |
| Limited error handling | Medium | Low |
| No input validation library | Low | Low |

### Testing

| Issue | Severity | Fix Effort |
|-------|----------|------------|
| No unit tests | High | Medium |
| No integration tests | High | High |
| No E2E tests | Medium | High |
| No CI/CD pipeline | Medium | Low |

### Documentation

| Issue | Severity | Fix Effort |
|-------|----------|------------|
| API docs incomplete | Medium | Low |
| No architecture diagram | Low | Low |
| No contributing guide | Low | Low |
| No changelog | Low | Low |

---

## Scalability Concerns

| Concern | Current | Production Need |
|---------|---------|-----------------|
| Concurrent users | 1-5 | 100+ |
| Document size | <10MB | 100MB+ |
| Vector count | <1000 | 1M+ |
| API rate limits | 100/15min | 1000+/min |

---

## Security Concerns

| Concern | Status | Priority |
|---------|--------|----------|
| API keys in .env | ✅ Protected | - |
| No authentication | ⚠️ Demo mode | High for production |
| No rate limiting per user | ⚠️ IP only | Medium |
| CORS open | ⚠️ Localhost only | Medium |
| No input sanitization | ⚠️ Basic | Medium |

---

## Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✅ Full | Primary target |
| Firefox | ✅ Full | Tested |
| Safari | ⚠️ Video | Some video issues |
| Edge | ✅ Full | Tested |
| Mobile | ⚠️ Limited | Responsive but not optimized |

---

## Future Roadmap

### Phase 1: Core Improvements (1-2 weeks)
- [ ] Real human avatar photo
- [ ] Better error handling
- [ ] Input validation
- [ ] API rate limiting per user

### Phase 2: Enhanced Features (2-4 weeks)
- [ ] Lip-sync animation
- [ ] Adaptive testing
- [ ] Advanced analytics
- [ ] Multi-user support

### Phase 3: Production Ready (1-2 months)
- [ ] Authentication system
- [ ] Payment integration
- [ ] Admin dashboard
- [ ] Mobile apps

### Phase 4: Scale (3-6 months)
- [ ] Custom voice training
- [ ] Real-time collaboration
- [ ] Enterprise features
- [ ] API marketplace
