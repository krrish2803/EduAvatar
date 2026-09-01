const API_BASE = 'http://localhost:3001';
const STUDENT_ID = localStorage.getItem('eduavatar_student_id') || 'student_default';

function setStudentId(id) {
    localStorage.setItem('eduavatar_student_id', id);
}

function getStudentId() {
    return localStorage.getItem('eduavatar_student_id') || 'student_default';
}

async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    };
    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
        config.body = JSON.stringify(config.body);
    }
    if (config.body instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    const res = await fetch(url, config);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

const EduAPI = {
    getStudentId,
    setStudentId,

    async health() {
        return apiFetch('/health');
    },

    async getProfile(studentId) {
        return apiFetch(`/api/profile/${studentId || getStudentId()}`);
    },

    async updateProfile(updates, studentId) {
        return apiFetch(`/api/profile/${studentId || getStudentId()}`, {
            method: 'PUT',
            body: updates,
        });
    },

    async deleteProfile(studentId) {
        return apiFetch(`/api/profile/${studentId || getStudentId()}`, {
            method: 'DELETE',
        });
    },

    async getAnalytics(studentId) {
        return apiFetch(`/api/analytics/${studentId || getStudentId()}`);
    },

    async generateLesson(topic, studentLevel, language) {
        return apiFetch('/api/generate-lesson', {
            method: 'POST',
            body: { topic, studentLevel, language },
        });
    },

    async generateCurriculum(topic, timeLimit) {
        return apiFetch('/api/generate-curriculum', {
            method: 'POST',
            body: { topic, timeLimit },
        });
    },

    async chat(message, studentLevel, language) {
        const collectionId = localStorage.getItem('eduavatar_collection_id') || '';
        return apiFetch('/api/chat', {
            method: 'POST',
            body: {
                message,
                studentId: getStudentId(),
                studentLevel: studentLevel || 'Intermediate',
                language: language || 'English',
                collectionId: collectionId || undefined,
            },
        });
    },

    async generateScript(topic) {
        return apiFetch('/api/generate-script', {
            method: 'POST',
            body: { topic },
        });
    },

    async generateVisuals(concept) {
        return apiFetch('/api/generate-visuals', {
            method: 'POST',
            body: { concept },
        });
    },

    async generateAvatar(text) {
        return apiFetch('/api/generate-avatar', {
            method: 'POST',
            body: { text },
        });
    },

    async processDocument(file) {
        const formData = new FormData();
        formData.append('file', file);
        const result = await apiFetch('/api/process-document', {
            method: 'POST',
            body: formData,
        });
        // Save collectionId for RAG chat
        if (result.success && result.collectionId) {
            localStorage.setItem('eduavatar_collection_id', result.collectionId);
        }
        return result;
    },

    async createStudyPlan(topic, durationDays, dailyTimeMinutes, studentLevel, language) {
        return apiFetch('/api/study-plan', {
            method: 'POST',
            body: {
                studentId: getStudentId(),
                topic,
                durationDays,
                dailyTimeMinutes,
                studentLevel,
                language,
            },
        });
    },

    async startRevision(topic, specificConcepts, language) {
        return apiFetch('/api/revision', {
            method: 'POST',
            body: {
                studentId: getStudentId(),
                topic,
                specificConcepts,
                language,
            },
        });
    },

    async generateConceptMap(topic, depth, language) {
        return apiFetch('/api/concept-map', {
            method: 'POST',
            body: { topic, depth, language },
        });
    },

    async generateCodingDemo(topic, language, problem, studentLevel) {
        return apiFetch('/api/coding-demo', {
            method: 'POST',
            body: { topic, language, problem, studentLevel },
        });
    },

    async generateInteractiveDiagram(topic, diagramType, subject, language) {
        return apiFetch('/api/interactive-diagram', {
            method: 'POST',
            body: { topic, diagramType, subject, language },
        });
    },

    async getLearningProgress() {
        return apiFetch(`/api/learning-progress/${getStudentId()}`);
    },

    async getDocuments() {
        return apiFetch('/api/documents');
    },

    async saveProgress(topic, score, timeSpentMinutes, strongConcepts, weakConcepts) {
        return apiFetch('/api/save-progress', {
            method: 'POST',
            body: {
                studentId: getStudentId(),
                topic,
                score,
                timeSpentMinutes,
                strongConcepts: strongConcepts || [],
                weakConcepts: weakConcepts || [],
            },
        });
    },
};
