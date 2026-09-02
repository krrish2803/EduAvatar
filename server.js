const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');
const mongoose = require('mongoose');
const { QdrantClient } = require('@qdrant/js-client-rest');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');

// Prevent server crashes from unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('[UNHANDLED REJECTION]', err.message || err);
});
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

dotenv.config();

// Helper: Extract JSON from markdown code blocks (model sometimes wraps JSON in ```json ... ```)
function extractJSON(text) {
    const trimmed = text.trim();
    // If already pure JSON, return as-is
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try { return JSON.parse(trimmed); } catch(e) { /* continue */ }
    }
    // Try extracting from ```json ... ``` blocks
    const jsonMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (jsonMatch) {
        try { return JSON.parse(jsonMatch[1].trim()); } catch(e) { /* continue */ }
    }
    // Try finding first { to last } substring
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        const candidate = trimmed.substring(firstBrace, lastBrace + 1);
        try { return JSON.parse(candidate); } catch(e) { /* continue */ }
        // Try fixing common issues: trailing commas, missing closing brackets
        try {
            const fixed = candidate.replace(/,\s*([\]}])/g, '$1');
            return JSON.parse(fixed);
        } catch(e2) { /* continue */ }
    }
    // Try fixing escaped inner JSON (LLM wraps inner objects in extra quotes)
    try {
        const unescaped = trimmed.replace(/"\s*\{\s*"/g, '{"').replace(/"\s*\}\s*"/g, '"}');
        return JSON.parse(unescaped);
    } catch(e) { /* continue */ }
    throw new Error("No valid JSON found in response");
}

// ==========================================
// 1. SYSTEM PROMPT PRE-LOADING (Optimization)
// Addresses Issue: "require('fs') called inside request handlers"
// ==========================================
const promptsDir = path.join(__dirname, 'backend', 'prompts');
const loadPrompt = (filename) => {
    try {
        return fs.readFileSync(path.join(promptsDir, filename), 'utf8');
    } catch (e) {
        console.warn(`[Warning] Could not load prompt: ${filename}`);
        return '';
    }
};

const PROMPTS = {
    persona: loadPrompt('eduavatar_persona_system.txt'),
    personalization: loadPrompt('personalization_system.txt'),
    multilingual: loadPrompt('multilingual_system.txt'),
    interactive: loadPrompt('interactive_teaching_system.txt'),
    conversational: loadPrompt('conversational_teaching_system.txt'),
    adaptive: loadPrompt('adaptive_teaching_system.txt'),
    assessment: loadPrompt('assessment_system.txt'),
    memory: loadPrompt('long_term_memory_system.txt'),
    curriculum: loadPrompt('curriculum_architect_system.txt'),
    time: loadPrompt('time_adaptation_system.txt'),
    director: loadPrompt('video_director_system.txt'),
    analytics: loadPrompt('analytics_system.txt'),
    studyPlanner: loadPrompt('study_planner_system.txt'),
    revision: loadPrompt('revision_system.txt'),
    conceptMap: loadPrompt('concept_map_system.txt'),
    codingDemo: loadPrompt('coding_demo_system.txt'),
    interactiveDiagram: loadPrompt('interactive_diagram_system.txt')
};

const app = express();

// CORS Security
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        // Allow localhost
        if (origin.includes('localhost')) return callback(null, true);
        // Allow any Netlify subdomain
        if (origin.includes('.netlify.app')) return callback(null, true);
        // Allow Render external URL
        if (origin === process.env.RENDER_EXTERNAL_URL) return callback(null, true);
        callback(null, true);
    }
}));
app.use(express.json());

// Static file serving (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname), {
    extensions: ['html'],
    index: 'index.html'
}));

// Rate Limiting (100 requests per 15 minutes)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: "Too many requests from this IP, please try again later." }
});
app.use('/api/', limiter);

// Health Check Endpoint
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date() }));

// List all uploaded documents
app.get('/api/documents', async (req, res) => {
    try {
        const docs = await LearningMaterial.find({ status: 'Vectorized' })
            .select('fileName fileType qdrantCollectionId createdAt')
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        res.json({ success: true, documents: docs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Debug: show what RAG chunks a query returns
app.get('/api/debug/rag', async (req, res) => {
    const { collectionId, query } = req.query;
    if (!collectionId || !query) return res.json({ error: 'Need collectionId and query params' });
    try {
        const embedResp = await nvidiaAi.embeddings.create({
            model: 'nvidia/nemotron-3-embed-1b',
            input: query
        });
        const vector = embedResp.data[0].embedding;
        const results = await qdrantClient.search(collectionId, { vector, limit: 5, with_payload: true });
        const chunks = (results || []).map(r => ({
            score: r.score,
            text: (r.payload?.text || '').substring(0, 300),
            source: r.payload?.source
        }));
        res.json({ query, collectionId, chunkCount: chunks.length, chunks });
    } catch (err) {
        res.json({ error: err.message });
    }
});


// Session tracking for conversation history
app.use(session({
    secret: process.env.SESSION_SECRET || 'eduavatar-dev-secret-change-in-prod',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// File upload config: 10MB limit, memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads', 'videos');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads/videos directory');
}

// ==========================================
// 2. DATABASE CONNECTIONS
// ==========================================
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/eduavatar', {
    tls: true
})
    .then(() => console.log('📦 MongoDB Connected'))
    .catch(err => {
        console.error('🚨 CRITICAL: MongoDB Connection Error:', err.message);
        console.warn('Server starting in degraded mode (DB operations will fail)');
    });

const materialSchema = new mongoose.Schema({
    studentId: { type: String, default: 'anonymous_student' },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['Pending', 'Processing', 'Vectorized', 'Failed'], default: 'Pending' },
    qdrantCollectionId: { type: String }
});
const LearningMaterial = mongoose.model('LearningMaterial', materialSchema);

// ==========================================
// 2b. STUDENT MEMORY PROFILE MODEL
// ==========================================
const topicHistorySchema = new mongoose.Schema({
    topic: { type: String, required: true },
    subTopic: { type: String },
    dateStudied: { type: Date, default: Date.now },
    assessmentScore: { type: Number },
    timeSpentMinutes: { type: Number },
    strongConcepts: [String],
    weakConcepts: [String],
    misconceptions: [String],
    sessionSummary: { type: String }
}, { _id: false });

const studentProfileSchema = new mongoose.Schema({
    studentId: { type: String, required: true, unique: true },
    name: { type: String, default: '' },
    preferredLanguage: { type: String, default: 'English' },
    overallLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
    learningPreferences: {
        teachingStyle: { type: String, default: 'friendly' },
        pace: { type: String, default: 'moderate' },
        exampleType: { type: String, default: 'real-life' }
    },
    topicsStudied: [topicHistorySchema],
    overallStrongConcepts: [String],
    overallWeakConcepts: [String],
    recurringMisconceptions: [String],
    learningHistorySummary: [{ type: String }],
    currentLearningPath: { type: String, default: '' },
    currentPositionInPath: { type: String, default: '' },
    totalLearningTimeMinutes: { type: Number, default: 0 },
    lastSessionDate: { type: Date },
    lastSessionSummary: { type: String, default: '' },
    sessionCount: { type: Number, default: 0 }
}, { timestamps: true });

const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);

// Native-fetch Qdrant client (avoids undici@6 bug in @qdrant/js-client-rest on Node 20)
class QdrantNativeFetch {
    constructor({ url, apiKey }) {
        this.baseUrl = url.replace(/\/$/, '');
        this.apiKey = apiKey;
    }
    async _req(method, path, body) {
        const opts = {
            method,
            headers: { 'api-key': this.apiKey, 'Content-Type': 'application/json' },
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(this.baseUrl + path, opts);
        const text = await res.text();
        if (!res.ok) throw new Error(`Qdrant ${res.status}: ${text}`);
        return JSON.parse(text);
    }
    async getCollections() { return this._req('GET', '/collections'); }
    async getCollection(name) { return this._req('GET', `/collections/${name}`); }
    async createCollection(name, opts) { return this._req('PUT', `/collections/${name}`, opts); }
    async upsert(collection, { points }) {
        return this._req('PUT', `/collections/${collection}/points`, { points, wait: true });
    }
    async search(collection, { vector, limit, with_payload }) {
        const result = await this._req('POST', `/collections/${collection}/points/search`, {
            vector,
            limit: limit || 5,
            with_payload: with_payload !== false
        });
        return result.result || [];
    }
}

let qdrantClient;
if (process.env.QDRANT_URL && process.env.QDRANT_API_KEY) {
    try {
        qdrantClient = new QdrantNativeFetch({
            url: process.env.QDRANT_URL,
            apiKey: process.env.QDRANT_API_KEY
        });
        console.log('🌌 Qdrant Vector DB Initialized (native-fetch)');
    } catch (e) {
        console.error('Qdrant Init Error:', e.message);
    }
}

const nvidiaAi = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY || 'dummy_key',
    baseURL: 'https://integrate.api.nvidia.com/v1',
});

// ==========================================
// 3. ENDPOINTS
// ==========================================

// Endpoint: Get Student Profile
app.get('/api/profile/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        let profile = await StudentProfile.findOne({ studentId });
        if (!profile) {
            profile = await StudentProfile.create({ studentId });
        }
        res.json({ success: true, data: profile });
    } catch (error) {
        console.error("[Profile Error]:", error.message);
        res.status(500).json({ success: false, error: "Failed to load profile." });
    }
});

// Endpoint: Update Student Profile
app.put('/api/profile/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const updates = req.body;
        const profile = await StudentProfile.findOneAndUpdate(
            { studentId },
            { $set: updates },
            { new: true, upsert: true }
        );
        res.json({ success: true, data: profile });
    } catch (error) {
        console.error("[Profile Update Error]:", error.message);
        res.status(500).json({ success: false, error: "Failed to update profile." });
    }
});

// Endpoint: Reset Student Profile
app.delete('/api/profile/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        await StudentProfile.findOneAndDelete({ studentId });
        res.json({ success: true, message: "Profile reset." });
    } catch (error) {
        console.error("[Profile Reset Error]:", error.message);
        res.status(500).json({ success: false, error: "Failed to reset profile." });
    }
});

// Endpoint: Learning Analytics Engine
app.get('/api/analytics/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const profile = await StudentProfile.findOne({ studentId });

        if (!profile) {
            return res.status(404).json({ success: false, error: "Student profile not found." });
        }

        // Build raw data context from the profile
        const topicsSummary = profile.topicsStudied.map(t => ({
            topic: t.topic,
            subTopic: t.subTopic || 'General',
            score: t.assessmentScore || 0,
            timeSpent: t.timeSpentMinutes || 0,
            strong: t.strongConcepts || [],
            weak: t.weakConcepts || [],
            misconceptions: t.misconceptions || [],
            date: t.dateStudied ? new Date(t.dateStudied).toLocaleDateString() : 'Unknown'
        }));

        const rawData = {
            studentId: profile.studentId,
            overallLevel: profile.overallLevel,
            preferredLanguage: profile.preferredLanguage,
            sessionCount: profile.sessionCount,
            totalLearningTimeMinutes: profile.totalLearningTimeMinutes,
            overallStrongConcepts: profile.overallStrongConcepts,
            overallWeakConcepts: profile.overallWeakConcepts,
            recurringMisconceptions: profile.recurringMisconceptions,
            currentLearningPath: profile.currentLearningPath,
            topicsStudied: topicsSummary,
            recentHistorySummaries: (profile.learningHistorySummary || []).slice(-10)
        };

        const systemMessage = `You are EduAvatar's Learning Analytics Engine.

Given the following raw student data, generate a complete learning analytics report as valid JSON.

STUDENT DATA:
${JSON.stringify(rawData, null, 2)}

OUTPUT FORMAT (strict JSON):
{
  "overall_progress": {
    "completion_percentage": 0-100,
    "total_topics_covered": 0,
    "total_learning_time": "X hours Y minutes",
    "average_score": 0-100
  },
  "concept_mastery": {
    "strong_concepts": ["concept1", "concept2"],
    "developing_concepts": ["concept3"],
    "weak_concepts": ["concept4"]
  },
  "performance_trend": "Improving / Stable / Needs Attention",
  "recent_scores": [{"topic": "...", "score": 0, "date": "..."}],
  "time_spent_analysis": {"topic1": "X min", "topic2": "Y min"},
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2", "actionable recommendation 3"],
  "visual_summary_suggestions": ["Progress pie chart", "Strong vs Weak concepts bar graph", "Score trend line", "Mastery heatmap"]
}

RULES:
- Calculate completion_percentage based on topics studied vs typical learning path length
- Derive performance_trend from recent score trajectory
- Give 3-5 specific, actionable recommendations
- Be encouraging but honest about weak areas
- Keep recommendations concrete and student-friendly`;

        const completion = await nvidiaAi.chat.completions.create({
            model: "meta/llama-3.2-11b-vision-instruct",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: `Generate learning analytics for student: ${studentId}` }
            ],
            temperature: 0.4,
            max_tokens: 2048,
            response_format: { type: "json_object" }
        });

        let analytics;
        try {
            analytics = extractJSON(completion.choices[0].message.content);
        } catch (parseError) {
            console.error("[Analytics JSON Parse Error]:", parseError.message);
            return res.status(500).json({ success: false, error: "Failed to generate analytics." });
        }

        res.json({ success: true, studentId, analytics });

    } catch (error) {
        console.error("[Analytics Error]:", error.message);
        res.status(500).json({ success: false, error: "Failed to generate analytics." });
    }
});

// Endpoint: Get Learning Progress (Completed vs In-Progress)
app.get('/api/learning-progress/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const profile = await StudentProfile.findOne({ studentId });

        if (!profile) {
            return res.json({
                success: true,
                data: {
                    completed: [],
                    inProgress: [],
                    stats: { totalTopics: 0, completedCount: 0, inProgressCount: 0, totalMinutes: 0 }
                }
            });
        }

        const completed = [];
        const inProgress = [];

        profile.topicsStudied.forEach(topic => {
            const score = topic.assessmentScore || 0;
            const lastStudied = topic.dateStudied;
            const daysSince = Math.floor((Date.now() - new Date(lastStudied).getTime()) / (1000 * 60 * 60 * 24));

            const topicData = {
                topic: topic.topic,
                subTopic: topic.subTopic || '',
                score: score,
                dateStudied: lastStudied,
                daysSince: daysSince,
                timeSpent: topic.timeSpentMinutes || 0,
                strongConcepts: topic.strongConcepts || [],
                weakConcepts: topic.weakConcepts || []
            };

            // Topic is "completed" if score >= 70% or was studied more than 3 days ago
            if (score >= 70 || (daysSince > 3 && score > 0)) {
                completed.push(topicData);
            } else {
                inProgress.push(topicData);
            }
        });

        // Sort: completed by most recent, in-progress by most recent
        completed.sort((a, b) => new Date(b.dateStudied) - new Date(a.dateStudied));
        inProgress.sort((a, b) => new Date(b.dateStudied) - new Date(a.dateStudied));

        res.json({
            success: true,
            data: {
                completed,
                inProgress,
                stats: {
                    totalTopics: profile.topicsStudied.length,
                    completedCount: completed.length,
                    inProgressCount: inProgress.length,
                    totalMinutes: profile.totalLearningTimeMinutes || 0,
                    sessionCount: profile.sessionCount || 0,
                    lastSessionDate: profile.lastSessionDate
                }
            }
        });
    } catch (error) {
        console.error("[Learning Progress Error]:", error.message);
        res.status(500).json({ success: false, error: "Failed to get learning progress." });
    }
});

// Endpoint: Save Learning Progress (called when lesson ends)
app.post('/api/save-progress', async (req, res) => {
    try {
        const { studentId, topic, subTopic, score, timeSpentMinutes, strongConcepts, weakConcepts, misconceptions } = req.body;

        if (!studentId || !topic) {
            return res.status(400).json({ success: false, error: "Missing studentId or topic." });
        }

        let profile = await StudentProfile.findOne({ studentId });
        if (!profile) {
            // Create profile if it doesn't exist
            profile = await StudentProfile.create({ studentId });
        }

        // Add topic to history
        profile.topicsStudied.push({
            topic,
            subTopic: subTopic || '',
            assessmentScore: score || 0,
            timeSpentMinutes: timeSpentMinutes || 0,
            strongConcepts: strongConcepts || [],
            weakConcepts: weakConcepts || [],
            misconceptions: misconceptions || [],
            dateStudied: new Date()
        });

        // Update stats
        profile.totalLearningTimeMinutes = (profile.totalLearningTimeMinutes || 0) + (timeSpentMinutes || 0);
        profile.sessionCount = (profile.sessionCount || 0) + 1;
        profile.lastSessionDate = new Date();
        profile.lastSessionSummary = `Studied ${topic} - Score: ${score || 0}%`;

        // Update weak/strong concepts
        if (strongConcepts && strongConcepts.length > 0) {
            strongConcepts.forEach(c => {
                if (!profile.overallStrongConcepts.includes(c)) {
                    profile.overallStrongConcepts.push(c);
                }
            });
        }
        if (weakConcepts && weakConcepts.length > 0) {
            weakConcepts.forEach(c => {
                if (!profile.overallWeakConcepts.includes(c)) {
                    profile.overallWeakConcepts.push(c);
                }
            });
        }

        await profile.save();

        res.json({ success: true, message: "Progress saved." });
    } catch (error) {
        console.error("[Save Progress Error]:", error.message);
        res.status(500).json({ success: false, error: "Failed to save progress." });
    }
});

// Endpoint: Study Planner
app.post('/api/study-plan', async (req, res) => {
    try {
        const { studentId, topic, durationDays, dailyTimeMinutes, studentLevel, language } = req.body;
        if (!topic) return res.status(400).json({ success: false, error: "Missing topic." });
        if (!durationDays) return res.status(400).json({ success: false, error: "Missing durationDays." });
        if (!dailyTimeMinutes) return res.status(400).json({ success: false, error: "Missing dailyTimeMinutes." });

        // Load student profile for personalization
        let profileData = '';
        if (studentId) {
            try {
                const profile = await StudentProfile.findOne({ studentId });
                if (profile) {
                    profileData = `
STUDENT PROFILE:
- Level: ${profile.overallLevel}
- Weak areas: ${profile.overallWeakConcepts.join(', ') || 'None'}
- Strong areas: ${profile.overallStrongConcepts.join(', ') || 'None'}
- Misconceptions: ${profile.recurringMisconceptions.join(', ') || 'None'}
- Previously studied: ${profile.topicsStudied.map(t => t.topic).join(', ') || 'None'}
                    `;
                }
            } catch (dbErr) {
                console.warn("[StudyPlan] Could not load profile:", dbErr.message);
            }
        }

        const today = new Date().toISOString().split('T')[0];

        const systemMessage = `You are EduAvatar's Intelligent Study Planner.

Generate a realistic, personalized study plan as valid JSON.

INPUT:
- Topic: ${topic}
- Duration: ${durationDays} days
- Daily time: ${dailyTimeMinutes} minutes
- Student level: ${studentLevel || 'Intermediate'}
- Language: ${language || 'English'}
- Start date: ${today}
${profileData}

OUTPUT FORMAT (strict JSON):
{
  "plan_title": "string",
  "total_duration": "string",
  "daily_time_available": "string",
  "daily_schedule": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "focus_topic": "string",
      "learning_goals": ["string"],
      "activities": ["Learn concept", "Practice", "Quick quiz", "Revision"],
      "estimated_time": "string",
      "resources_or_notes": "string"
    }
  ],
  "revision_days": [1, 5, 10],
  "assessment_days": [3, 7, 14],
  "buffer_days": [8, 15],
  "success_tips": ["tip1", "tip2", "tip3"]
}

RULES:
- Generate exactly ${durationDays} days
- Each day should fit within ${dailyTimeMinutes} minutes
- Use spaced repetition: revisit weak concepts at increasing intervals
- Mix learning (40%), practice (30%), quick quizzes (15%), revision (15%)
- Include revision days after every 3-4 learning days
- Include buffer days for catch-up
- Start dates from ${today}
- Give 3-5 practical success tips`;

        const completion = await nvidiaAi.chat.completions.create({
            model: "meta/llama-3.2-11b-vision-instruct",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: `Create a ${durationDays}-day study plan for: ${topic}` }
            ],
            temperature: 0.5,
            max_tokens: 4096,
            response_format: { type: "json_object" }
        });

        let studyPlan;
        try {
            studyPlan = extractJSON(completion.choices[0].message.content);
        } catch (parseError) {
            console.error("[StudyPlan JSON Parse Error]:", parseError.message);
            return res.status(500).json({ success: false, error: "Failed to generate study plan." });
        }

        res.json({ success: true, data: studyPlan });

    } catch (error) {
        console.error("[StudyPlan Error]:", error.message);
        res.status(500).json({ success: false, error: "Failed to generate study plan." });
    }
});

// Endpoint: Revision Mode
app.post('/api/revision', async (req, res) => {
    try {
        const { studentId, topic, specificConcepts, language } = req.body;

        // Load student profile for weak concept detection
        let profile = null;
        let weakConcepts = [];
        let lowScoreTopics = [];

        if (studentId) {
            try {
                profile = await StudentProfile.findOne({ studentId });
                if (profile) {
                    weakConcepts = profile.overallWeakConcepts || [];
                    lowScoreTopics = profile.topicsStudied
                        .filter(t => (t.assessmentScore || 0) < 70)
                        .map(t => ({ topic: t.topic, score: t.assessmentScore, weak: t.weakConcepts }));
                }
            } catch (dbErr) {
                console.warn("[Revision] Could not load profile:", dbErr.message);
            }
        }

        const conceptsToRevise = specificConcepts || weakConcepts;
        const revisionContext = profile ? `
STUDENT REVISION CONTEXT:
- Weak concepts to revise: ${conceptsToRevise.join(', ') || 'None identified'}
- Low score topics: ${lowScoreTopics.map(t => `${t.topic} (${t.score}%)`).join(', ') || 'None'}
- Overall level: ${profile.overallLevel}
- Recurring misconceptions: ${profile.recurringMisconceptions.join(', ') || 'None'}
- Preferred language: ${profile.preferredLanguage}
        ` : '';

        const systemMessage = `${PROMPTS.revision}

--- REVISION SESSION DATA ---
${revisionContext}

OUTPUT FORMAT (strict JSON):
{
  "revision_topic": "string",
  "concepts_to_revise": ["concept1", "concept2"],
  "diagnostic_questions": [
    {"question": "string", "purpose": "string"}
  ],
  "revision_lessons": [
    {
      "concept": "string",
      "previous_weakness": "string",
      "concise_explanation": "string",
      "strong_example": "string",
      "analogy": "string",
      "practice_questions": [
        {"question": "string", "expected_answer": "string"}
      ],
      "mastery_check": "string"
    }
  ],
  "mini_assessment": [
    {"question": "string", "type": "conceptual/practical"}
  ],
  "mastery_updates": {
    "improved": [],
    "still_weak": [],
    "newly_strong": []
  },
  "next_revision_schedule": "string",
  "flashcards": [
    {"front": "string", "back": "string"}
  ]
}

RULES:
- Keep explanations SHORT and SHARP (not first-time teaching)
- Start with diagnostic to check current understanding
- Use different approach if concept was previously misunderstood
- Include 3-5 flashcards for quick review
- Suggest when to revise next based on spaced repetition
- If ${language || 'English'} is not English, respond in ${language || 'English'}`;

        const completion = await nvidiaAi.chat.completions.create({
            model: "meta/llama-3.2-11b-vision-instruct",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: topic
                    ? `Start a revision session for: ${topic}`
                    : `Start a revision session for my weak areas`
                }
            ],
            temperature: 0.5,
            max_tokens: 3000,
            response_format: { type: "json_object" }
        });

        let revisionData;
        try {
            revisionData = extractJSON(completion.choices[0].message.content);
        } catch (parseError) {
            console.error("[Revision JSON Parse Error]:", parseError.message);
            return res.status(500).json({ success: false, error: "Failed to generate revision session." });
        }

        // Update profile with revision results (async)
        if (profile && revisionData.mastery_updates) {
            const updates = revisionData.mastery_updates;
            const pushOps = {};
            const setOps = {};

            // Merge improved + newly_strong into one array to avoid $push conflict
            const strongToAdd = [...(updates.improved || []), ...(updates.newly_strong || [])];
            if (strongToAdd.length > 0) {
                pushOps.overallStrongConcepts = { $each: strongToAdd };
            }
            if (updates.still_weak?.length) {
                pushOps.overallWeakConcepts = { $each: updates.still_weak };
            }
            // Remove newly strong from weak list
            if (updates.newly_strong?.length) {
                setOps.overallWeakConcepts = profile.overallWeakConcepts.filter(
                    c => !updates.newly_strong.includes(c)
                );
            }

            StudentProfile.findOneAndUpdate(
                { studentId },
                { $push: pushOps, $set: setOps },
                { new: true }
            ).catch(err => console.warn("[Revision] Profile update failed:", err.message));
        }

        res.json({ success: true, data: revisionData });

    } catch (error) {
        console.error("[Revision Error]:", error.message);
        res.status(500).json({ success: false, error: "Failed to generate revision session." });
    }
});

// Endpoint: Concept Map Generator
app.post('/api/concept-map', async (req, res) => {
    try {
        const { topic, depth, language } = req.body;
        if (!topic) return res.status(400).json({ success: false, error: "Missing topic." });

        const systemMessage = `${PROMPTS.conceptMap}

Generate a concept map for the topic: "${topic}"
${depth ? `Maximum depth: ${depth} levels` : 'Default depth: 3 levels'}
Language: ${language || 'English'}

OUTPUT FORMAT (strict JSON):
{
  "topic": "string",
  "central_concept": "string",
  "map_structure": [
    {
      "level": 1,
      "concept": "string",
      "children": [
        {
          "level": 2,
          "concept": "string",
          "relationship": "string",
          "children": []
        }
      ]
    }
  ],
  "key_relationships": ["string"],
  "visual_description": "string",
  "teaching_notes": "string"
}`;

        const completion = await nvidiaAi.chat.completions.create({
            model: "meta/llama-3.2-11b-vision-instruct",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: `Create a concept map for: ${topic}` }
            ],
            temperature: 0.5,
            max_tokens: 3000,
            response_format: { type: "json_object" }
        });

        let conceptMap;
        try {
            conceptMap = extractJSON(completion.choices[0].message.content);
        } catch (parseError) {
            console.error("[ConceptMap JSON Parse Error]:", parseError.message);
            return res.status(500).json({ success: false, error: "Failed to generate concept map." });
        }

        res.json({ success: true, data: conceptMap });

    } catch (error) {
        console.error("[ConceptMap Error]:", error.message);
        res.status(500).json({ success: false, error: "Failed to generate concept map." });
    }
});

// Endpoint: Coding Demonstration
app.post('/api/coding-demo', async (req, res) => {
    try {
        const { topic, language, problem, studentLevel } = req.body;
        if (!topic && !problem) return res.status(400).json({ success: false, error: "Missing topic or problem." });

        const systemMessage = `You are an expert Programming Teacher. You MUST output ONLY valid JSON, no markdown, no code blocks, no text outside JSON.

Generate a coding demonstration for:
- Topic/Problem: ${topic || problem}
- Programming Language: ${language || 'Python'}
- Student Level: ${studentLevel || 'Beginner'}

OUTPUT FORMAT (strict JSON, no markdown):
{
  "language": "string",
  "problem_statement": "string",
  "code_blocks": [
    {
      "step": 1,
      "title": "string",
      "code": "string (escaped newlines with \\n)",
      "explanation": "string",
      "highlighted_lines": [1, 3]
    }
  ],
  "final_complete_code": "string (escaped newlines with \\n)",
  "sample_input": "string",
  "sample_output": "string",
  "execution_flow": [
    {"line": 1, "state": "variable values at this point"}
  ],
  "common_errors": [
    {"error": "string", "fix": "string"}
  ],
  "visual_suggestions": ["syntax highlighted code", "output terminal", "flow arrows", "variable state table"]
}

IMPORTANT: Return ONLY the JSON object. No explanation text before or after. No markdown code blocks.`;

        const completion = await nvidiaAi.chat.completions.create({
            model: "meta/llama-3.2-11b-vision-instruct",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: topic
                    ? `Create a coding demonstration for: ${topic}`
                    : `Solve this problem: ${problem}`
                }
            ],
            temperature: 0.4,
            max_tokens: 4000,
            response_format: { type: "json_object" }
        });

        let demoData;
        try {
            demoData = extractJSON(completion.choices[0].message.content);
        } catch (parseError) {
            console.error("[CodingDemo JSON Parse Error]:", parseError.message);
            return res.status(500).json({ success: false, error: "Failed to generate coding demonstration." });
        }

        res.json({ success: true, data: demoData });

    } catch (error) {
        console.error("[CodingDemo Error]:", error.message);
        res.status(500).json({ success: false, error: "Failed to generate coding demonstration." });
    }
});

// Endpoint: Interactive Diagram Designer
app.post('/api/interactive-diagram', async (req, res) => {
    try {
        const { topic, diagramType, subject, language } = req.body;
        if (!topic) return res.status(400).json({ success: false, error: "Missing topic." });

        const systemMessage = `You are an expert Interactive Diagram Designer. You MUST output ONLY valid JSON, no markdown, no code blocks, no text outside JSON.

Generate an interactive diagram specification for:
- Topic: ${topic}
- Diagram Type: ${diagramType || 'auto-detect best type'}
- Subject: ${subject || 'General'}
- Language: ${language || 'English'}

OUTPUT FORMAT (strict JSON):
{
  "diagram_type": "flowchart / architecture / process / labeled illustration / state diagram / etc.",
  "title": "string",
  "subject": "string",
  "components": [
    {
      "id": "comp_1",
      "label": "string",
      "description": "string",
      "position": "center / top / bottom / left / right",
      "visual_style": "rectangle / circle / diamond / icon"
    }
  ],
  "connections": [
    {
      "from": "comp_1",
      "to": "comp_2",
      "label": "string",
      "style": "arrow / dotted / bidirectional"
    }
  ],
  "interaction_sequence": [
    {
      "step": 1,
      "action": "Reveal component / Highlight / Animate flow / Zoom / Add label",
      "target": "comp_1",
      "narration": "What the teacher should say while this interaction happens"
    }
  ],
  "full_visual_description": "Detailed description for rendering tools",
  "fallback_static_version": "Simple description if interactivity is limited"
}

IMPORTANT: Return ONLY the JSON object. No explanation text before or after. No markdown code blocks.

RULES:
- Design for step-by-step reveal, never dump complete diagram at once
- Synchronize visual changes with narration
- Use highlighting, color changes, arrows, zooming to guide attention
- Keep design clean, high-contrast, readable on video
- For complex systems, show high-level first then details`;

        const completion = await nvidiaAi.chat.completions.create({
            model: "meta/llama-3.2-11b-vision-instruct",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: `Create an interactive diagram for: ${topic}` }
            ],
            temperature: 0.5,
            max_tokens: 4000,
            response_format: { type: "json_object" }
        });

        let diagramData;
        try {
            diagramData = extractJSON(completion.choices[0].message.content);
        } catch (parseError) {
            console.error("[InteractiveDiagram JSON Parse Error]:", parseError.message);
            return res.status(500).json({ success: false, error: "Failed to generate interactive diagram." });
        }

        res.json({ success: true, data: diagramData });

    } catch (error) {
        console.error("[InteractiveDiagram Error]:", error.message);
        res.status(500).json({ success: false, error: "Failed to generate interactive diagram." });
    }
});

// Endpoint 1: Real RAG Pipeline (Document Parsing + NVIDIA Embeddings + Qdrant)
// Addresses Issue: "Qdrant vectorization is entirely mocked"
app.post('/api/process-document', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded." });
        
        console.log(`[RAG Pipeline] Processing document: ${req.file.originalname}`);

        // Extract Text
        let extractedText = "";
        if (req.file.mimetype === 'application/pdf') {
            const parser = new PDFParse({ data: req.file.buffer });
            const result = await parser.getText();
            extractedText = result.text;
        } else {
            extractedText = req.file.buffer.toString('utf8');
        }

        if (!extractedText.trim()) return res.status(400).json({ success: false, error: "Empty or unreadable document." });

        // Basic Chunking
        const chunks = extractedText.match(/[^.!?]+[.!?]+/g) || [extractedText];
        // Filter chunks to a reasonable limit for the hackathon demo
        const validChunks = chunks.filter(c => c.trim().length > 20).slice(0, 100);

        const collectionId = `doc_${Date.now()}`;

        // Save to MongoDB
        const material = new LearningMaterial({
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            qdrantCollectionId: collectionId,
            status: 'Processing'
        });
        await material.save();

        // Vectorize & Upsert to Qdrant
        if (qdrantClient) {
            try {
                // Check if collection already exists, create if not
                try {
                    await qdrantClient.getCollection(collectionId);
                    console.log(`[Qdrant] Collection ${collectionId} already exists, reusing`);
                } catch (e) {
                    // Collection doesn't exist, create it
                    await qdrantClient.createCollection(collectionId, {
                        vectors: { size: 2048, distance: 'Cosine' }
                    });
                    console.log(`[Qdrant] Created collection ${collectionId}`);
                }

                console.log(`[NVIDIA API] Requesting embeddings for ${validChunks.length} chunks...`);
                const embedResponse = await nvidiaAi.embeddings.create({
                    model: "nvidia/nemotron-3-embed-1b",
                    input: validChunks,
                    encoding_format: "float",
                    input_type: "passage"
                });

                const points = embedResponse.data.map((emb, idx) => ({
                    id: idx + 1,
                    vector: emb.embedding,
                    payload: { text: validChunks[idx] }
                }));

                await qdrantClient.upsert(collectionId, { wait: true, points });
                console.log(`[Qdrant] Vectors successfully upserted to ${collectionId}`);
                
                material.status = 'Vectorized';
                await material.save();
            } catch (qdrantError) {
                console.error(`[Qdrant Error] Vectorization failed for ${collectionId}:`, qdrantError.message);
                material.status = 'Failed';
                await material.save();
                return res.status(500).json({ success: false, error: "Document saved but vectorization failed." });
            }
        } else {
            material.status = 'Vectorized';
            await material.save();
        }

        res.json({ success: true, message: "Document processed & vectorized.", collectionId });

    } catch (error) {
        console.error("[RAG Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint 2: Generate Curriculum
app.post('/api/generate-curriculum', async (req, res) => {
    try {
        // Validation
        const { topic, timeLimit } = req.body;
        if (!topic) return res.status(400).json({ success: false, error: "Missing topic." });

        console.log(`[NVIDIA API] Generating curriculum for: ${topic}`);

        const systemMessage = `You are an expert Curriculum Designer. Create a clear, progressive learning path as valid JSON.

Output format:
{
  "topic": "string",
  "student_level": "string",
  "learning_goal": "string",
  "recommended_total_duration": "string",
  "modules": [
    {
      "module_number": 1,
      "module_title": "string",
      "description": "string",
      "key_concepts": ["string"],
      "estimated_time": "string",
      "difficulty": "basic/intermediate/advanced",
      "learning_outcomes": ["string"]
    }
  ],
  "milestones": ["string"],
  "revision_strategy": "string",
  "final_capstone": "string"
}

Time constraint: ${timeLimit || 'Standard'}. Adjust module count and depth accordingly.`;

        const completion = await nvidiaAi.chat.completions.create({
            model: "meta/llama-3.2-11b-vision-instruct",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: `Student Request: "${topic}".` }
            ],
            temperature: 0.7,
            max_tokens: 2048,
            top_p: 1,
            response_format: { type: "json_object" }
        });

        let parsedData;
        try {
            parsedData = extractJSON(completion.choices[0].message.content);
        } catch (parseError) {
            console.error("[JSON Parse Error]:", parseError.message);
            return res.status(500).json({ success: false, error: "AI returned malformed JSON." });
        }
        res.json({ success: true, data: parsedData });
    } catch (error) {
        console.error("[Curriculum Error]:", error.message);
        res.status(500).json({ success: false, error: "Generation failed." });
    }
});

// Endpoint 3: Live Interactive Lesson Chat with Long-term Memory + RAG
app.post('/api/chat', async (req, res) => {
    try {
        const { message, studentId = 'default_student', studentLevel = 'Intermediate', language = 'English', collectionId } = req.body;
        if (!message) return res.status(400).json({ success: false, error: "Missing message." });

        // Initialize session history if empty
        if (!req.session.chatHistory) {
            req.session.chatHistory = [];
        }

        // Load or create student profile from MongoDB
        let profile = null;
        try {
            profile = await StudentProfile.findOne({ studentId });
            if (!profile) {
                profile = await StudentProfile.create({ studentId, preferredLanguage: language, overallLevel: studentLevel });
            }
        } catch (dbErr) {
            console.warn("[Memory] Could not load profile:", dbErr.message);
        }

        // Build profile context for the system prompt
        let profileContext = '';
        if (profile) {
            const recentTopics = profile.topicsStudied.slice(-5).map(t =>
                `- ${t.topic} (Score: ${t.assessmentScore || 'N/A'}%, Strong: ${t.strongConcepts.join(', ') || 'none'}, Weak: ${t.weakConcepts.join(', ') || 'none'})`
            ).join('\n');

            profileContext = `
--- STUDENT MEMORY PROFILE ---
Student ID: ${profile.studentId}
Overall Level: ${profile.overallLevel}
Preferred Language: ${profile.preferredLanguage}
Teaching Style: ${profile.learningPreferences.teachingStyle}
Session Count: ${profile.sessionCount}
Total Learning Time: ${profile.totalLearningTimeMinutes} minutes
Overall Strong Concepts: ${profile.overallStrongConcepts.join(', ') || 'None yet'}
Overall Weak Concepts: ${profile.overallWeakConcepts.join(', ') || 'None yet'}
Recurring Misconceptions: ${profile.recurringMisconceptions.join(', ') || 'None'}
Current Learning Path: ${profile.currentLearningPath || 'Not started'}
Last Session Summary: ${profile.lastSessionSummary || 'No previous sessions'}
Recent Topics Studied:
${recentTopics || '  None yet'}
            `;
        }

        // RAG: Retrieve relevant context from uploaded documents
        let ragContext = '';
        if (collectionId && qdrantClient) {
            try {
                // Generate embedding for the user's query
                const queryEmbed = await nvidiaAi.embeddings.create({
                    model: "nvidia/nemotron-3-embed-1b",
                    input: [message],
                    encoding_format: "float",
                    input_type: "query"
                });
                const queryVector = queryEmbed.data[0].embedding;

                // Search Qdrant for relevant chunks
                const searchResults = await qdrantClient.search(collectionId, {
                    vector: queryVector,
                    limit: 5,
                    with_payload: true
                });

                if (searchResults && searchResults.length > 0) {
                    const contextChunks = searchResults.map(r => r.payload?.text || r.payload?.content || '').filter(Boolean);
                    if (contextChunks.length > 0) {
                        ragContext = `\n--- UPLOADED DOCUMENT CONTEXT ---\n${contextChunks.join('\n\n')}\n`;
                        console.log(`[RAG] Retrieved ${contextChunks.length} relevant chunks from ${collectionId}`);
                    }
                }
            } catch (ragErr) {
                console.warn("[RAG] Retrieval failed:", ragErr.message);
            }
        }

        const systemMessage = `
${ragContext ? `CRITICAL INSTRUCTION: The user's question is about the document below. You MUST answer using ONLY the content from this document. Do NOT say you don't see a document. Do NOT ask for clarification. Answer directly from the content provided.

DOCUMENT CONTENT:
${ragContext}` : 'No document uploaded yet. Answer from your general knowledge.'}

--- EDUAVATAR PERSONA ---
${PROMPTS.persona}

--- LONG-TERM MEMORY ENGINE ---
${PROMPTS.memory}

--- ADAPTIVE MISCONCEPTION ENGINE ---
${PROMPTS.adaptive}

--- REAL-TIME CONVERSATIONAL ENGINE ---
${PROMPTS.conversational}

--- INTERACTIVE TEACHING ENGINE ---
${PROMPTS.interactive}

--- FINAL ASSESSMENT & REPORTING ENGINE ---
${PROMPTS.assessment}

--- PERSONALIZATION ENGINE ---
${PROMPTS.personalization}

--- MULTILINGUAL ENGINE ---
${PROMPTS.multilingual}
${profileContext}

--- CURRENT SESSION ---
Level: ${studentLevel}
Language: ${language}
        `;

        // Build messages array using session history
        const messages = [
            { role: "system", content: systemMessage },
            ...req.session.chatHistory,
            { role: "user", content: message }
        ];

        const completion = await nvidiaAi.chat.completions.create({
            model: "meta/llama-3.2-11b-vision-instruct",
            messages: messages,
            temperature: 0.6,
            max_tokens: 1024,
            top_p: 1,
        });

        const reply = completion.choices[0].message.content;

        // Save to session history with sliding window (keep last 30 messages = ~15 exchanges)
        const MAX_HISTORY = 30;
        req.session.chatHistory.push({ role: "user", content: message });
        req.session.chatHistory.push({ role: "assistant", content: reply });
        if (req.session.chatHistory.length > MAX_HISTORY) {
            req.session.chatHistory = req.session.chatHistory.slice(-MAX_HISTORY);
        }

        // Update student profile in MongoDB (async, don't block response)
        if (profile) {
            const conversationSummary = `User: ${message.substring(0, 100)}... | AI: ${reply.substring(0, 100)}...`;
            const isFirstMessage = !req.session.chatHistory || req.session.chatHistory.length <= 2;
            StudentProfile.findOneAndUpdate(
                { studentId },
                {
                    $set: {
                        lastSessionDate: new Date(),
                        lastSessionSummary: conversationSummary,
                        preferredLanguage: language,
                        overallLevel: studentLevel
                    },
                    // Only increment session count once per session (first message)
                    ...(isFirstMessage ? { $inc: { sessionCount: 1 } } : {}),
                    $push: {
                        learningHistorySummary: {
                            $each: [`[${new Date().toISOString()}] ${conversationSummary}`],
                            $slice: -50 // keep last 50 summaries
                        }
                    }
                },
                { upsert: true }
            ).catch(err => console.warn("[Memory] Profile update failed:", err.message));
        }

        res.json({ success: true, reply, studentId });

    } catch (error) {
        console.error("[Chat Error]:", error.message);
        res.status(500).json({ success: false, error: "Chat failed." });
    }
});

// Endpoint 4: Video Director Script
app.post('/api/generate-script', async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic) return res.status(400).json({ success: false, error: "Missing topic." });

        const completion = await nvidiaAi.chat.completions.create({
            model: "meta/llama-3.2-11b-vision-instruct",
            messages: [
                { role: "system", content: `You are an expert AI Teaching Video Director. Generate a video script as valid JSON.

Output format:
{
  "video_title": "string",
  "total_estimated_duration": "string",
  "segments": [
    {
      "segment_id": 1,
      "duration_seconds": 30,
      "avatar_spoken_text": "string",
      "avatar_emotion_tone": "friendly/enthusiastic/calm/encouraging",
      "on_screen_text": ["string"],
      "visuals": [{"type": "diagram/equation/illustration", "description": "string", "purpose": "string"}],
      "camera_style": "medium shot/close-up/split screen"
    }
  ]
}` },
                { role: "user", content: `Generate a teaching video script for: ${topic}` }
            ],
            temperature: 0.7,
            max_tokens: 2048,
            response_format: { type: "json_object" }
        });

        let parsedData;
        try {
            parsedData = extractJSON(completion.choices[0].message.content);
        } catch (parseError) {
            console.error("[JSON Parse Error]:", parseError.message);
            return res.status(500).json({ success: false, error: "AI returned malformed JSON." });
        }
        res.json({ success: true, data: parsedData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint 5: Subject-Aware Visual Designer
app.post('/api/generate-visuals', async (req, res) => {
    try {
        const { concept } = req.body;
        if (!concept) return res.status(400).json({ success: false, error: "Missing concept." });

        console.log(`[NVIDIA API] Generating visual design for: ${concept}`);

        const systemMessage = `You are an expert Visual Designer for education. Generate a visual design specification as strictly valid JSON.
Do not include any markdown formatting, backticks, or comments in your response. Output raw JSON only.

For the concept: "${concept}"

CRITICAL RULE: The "visual_type" MUST be exactly one of these 3 strings:
1. "mermaid" - Use this for flowcharts, neural networks, systems, process architectures.
2. "latex" - Use this for math and physics formulas.
3. "image" - Use this for physical illustrations, biology, history.

If you choose "mermaid", your "data" field MUST be valid mermaid syntax (e.g. graph LR; A-->B). You MUST escape newlines as \\n and quotes as \\".
If you choose "latex", your "data" field MUST be valid raw LaTeX. Escape backslashes as \\\\.

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "concept": "Name of concept",
  "visual_type": "mermaid",
  "description": "Short description of what the visual shows",
  "data": "graph LR\\n A-->B"
}`;

        const completion = await nvidiaAi.chat.completions.create({
            model: "meta/llama-3.2-11b-vision-instruct",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: `Design the most effective visual for teaching: ${concept}` }
            ],
            temperature: 0.7,
            max_tokens: 2048,
            top_p: 1,
            response_format: { type: "json_object" }
        });

        let parsedData;
        try {
            parsedData = extractJSON(completion.choices[0].message.content);
        } catch (parseError) {
            console.error("[Visuals JSON Parse Error]:", parseError.message);
            console.error("[Visuals Raw Response]:", completion.choices[0].message.content.substring(0, 500));
            return res.status(500).json({ success: false, error: "AI returned malformed JSON." });
        }
        // Unescape \\n to real newlines for mermaid diagrams
        if (parsedData.visual_type === 'mermaid' && parsedData.data) {
            parsedData.data = parsedData.data.replace(/\\n/g, '\n');
        }
        res.json({ success: true, data: parsedData });

    } catch (error) {
        console.error("[NVIDIA API Visuals Error]:", error.message);
        res.status(500).json({ success: false, error: "Failed to generate visual design." });
    }
});

// Endpoint 6: Generate Lesson using NVIDIA Llama 3.1 70B
app.post('/api/generate-lesson', async (req, res) => {
    try {
        const { topic, studentLevel = 'Intermediate', language = 'English' } = req.body;
        if (!topic) return res.status(400).json({ success: false, error: "Missing topic." });

        console.log(`[NVIDIA API] Generating lesson for topic: ${topic}...`);

        const completion = await nvidiaAi.chat.completions.create({
            model: "meta/llama-3.2-11b-vision-instruct",
            messages: [
                {
                    role: "system",
                    content: `You are EduAvatar, an expert AI Teacher. 
                    Generate a structured JSON lesson plan based on the provided topic.
                    Output MUST be valid JSON with this schema:
                    {
                      "lesson_title": "string",
                      "student_level": "string",
                      "language": "string",
                      "concepts": [
                        {
                          "concept_name": "string",
                          "key_points": ["string"],
                          "visuals_needed": ["string"],
                          "question_to_ask": { "question": "string" }
                        }
                      ]
                    }`
                },
                {
                    role: "user",
                    content: `Create a brief lesson on ${topic} for a ${studentLevel} student in ${language}.`
                }
            ],
            temperature: 0.7,
            max_tokens: 1024,
            top_p: 1,
            response_format: { type: "json_object" }
        });

        let lessonPlan;
        try {
            lessonPlan = extractJSON(completion.choices[0].message.content);
        } catch (parseError) {
            console.error("[JSON Parse Error]:", parseError.message);
            return res.status(500).json({ success: false, error: "AI returned malformed JSON." });
        }

        res.json({ success: true, provider: "NVIDIA API (meta/llama-3.2-11b-vision-instruct)", data: lessonPlan });

    } catch (error) {
        console.error("[NVIDIA API Error]:", error.message);
        res.status(500).json({ success: false, error: "Failed to generate lesson." });
    }
});

// Endpoint 7: Avatar Video Generation (edge-tts + FFmpeg, 100% free, no API key)
const avatarDir = path.join(__dirname, 'backend', 'avatar');
const defaultAvatar = path.join(avatarDir, 'default_teacher.png');

// Helper: sanitize text for shell commands (prevent injection)
function sanitizeForShell(text) {
    return text.replace(/[^a-zA-Z0-9 .,!?;:'\-()\n]/g, '').substring(0, 500);
}

app.post('/api/generate-avatar', async (req, res) => {
    try {
        const { text, voice = 'en-female', image } = req.body;
        if (!text) return res.status(400).json({ success: false, error: "Missing text." });

        const videoId = `avatar_${Date.now()}`;
        const audioPath = path.join(uploadsDir, `${videoId}.mp3`);
        const videoPath = path.join(uploadsDir, `${videoId}.mp4`);
        const avatarImage = image || defaultAvatar;

        console.log(`[Avatar] Generating video for: "${text.substring(0, 50)}..."`);

        // Step 1: Generate TTS audio using edge-tts-node (async, non-blocking)
        console.log(`[Avatar] Step 1: Generating TTS audio...`);
        const safeText = sanitizeForShell(text);
        const { stdout: ttsResult } = await execAsync(
            `node "${path.join(avatarDir, 'tts.js')}" "${safeText}" "${audioPath}" "${voice}"`,
            { timeout: 30000 }
        );
        const ttsData = JSON.parse(ttsResult.trim());
        console.log(`[Avatar] TTS complete: ${ttsData.duration.toFixed(1)}s, voice: ${ttsData.voice}`);

        // Step 2: Generate video (image + audio + subtitles) (async, non-blocking)
        console.log(`[Avatar] Step 2: Generating video...`);
        const { stdout: videoResult } = await execAsync(
            `python3 "${path.join(avatarDir, 'video_gen.py')}" "${avatarImage}" "${audioPath}" "${videoPath}" "${safeText}"`,
            { timeout: 60000 }
        );
        const videoData = JSON.parse(videoResult.trim());

        if (videoData.error) {
            throw new Error(videoData.error);
        }

        console.log(`[Avatar] Video complete: ${videoData.duration.toFixed(1)}s, ${(videoData.file_size / 1024).toFixed(0)}KB`);

        // Clean up audio file
        try { fs.unlinkSync(audioPath); } catch(e) {}

        res.json({
            success: true,
            video_url: `/uploads/videos/${videoId}.mp4`,
            duration: videoData.duration,
            voice: ttsData.voice,
            file_size: videoData.file_size
        });

    } catch (error) {
        console.error("[Avatar Error]:", error.message);
        res.status(500).json({ success: false, error: "Avatar generation failed: " + error.message });
    }
});

// Serve uploaded videos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`🚀 EduAvatar Backend running on port ${PORT}`);
    console.log(`===========================================`);
});

// Graceful Shutdown
const gracefulShutdown = () => {
    console.log('\n[System] Received kill signal, shutting down gracefully...');
    server.close(() => {
        console.log('[System] HTTP server closed.');
        mongoose.connection.close(false).then(() => {
            console.log('[System] MongoDB connection closed.');
            process.exit(0);
        });
    });
    
    // Force close after 10s
    setTimeout(() => {
        console.error('[System] Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

