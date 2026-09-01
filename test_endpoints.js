const fs = require('fs');

async function testEndpoints() {
    const baseUrl = 'http://127.0.0.1:3001';
    let passed = 0;
    let failed = 0;

    const logResult = (name, success, details) => {
        if (success) {
            console.log(`✅ [PASS] ${name} -> ${details}`);
            passed++;
        } else {
            console.log(`❌ [FAIL] ${name} -> ${details}`);
            failed++;
        }
    };

    console.log("\n============================================");
    console.log("🧪 STARTING FULL BACKEND LOGIC TEST (MOCKED)");
    console.log("============================================\n");

    // 1. Health Check
    try {
        const res = await fetch(`${baseUrl}/health`);
        logResult('GET /health', res.ok, res.statusText);
    } catch (e) { logResult('GET /health', false, e.message); }

    // 2. Chat Endpoint
    try {
        const res = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Hello teacher!", studentLevel: "Beginner", language: "English" })
        });
        const data = await res.json();
        logResult('POST /api/chat', res.ok && data.success, `Reply received: "${data.reply}"`);
    } catch (e) { logResult('POST /api/chat', false, e.message); }

    // 3. Curriculum Endpoint
    try {
        const res = await fetch(`${baseUrl}/api/generate-curriculum`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: "Basic Physics", timeLimit: "20 minutes" })
        });
        const data = await res.json();
        logResult('POST /api/generate-curriculum', res.ok && data.success, `JSON parsed successfully for topic: ${data.data?.topic}`);
    } catch (e) { logResult('POST /api/generate-curriculum', false, e.message); }

    // 4. Visuals Endpoint
    try {
        const res = await fetch(`${baseUrl}/api/generate-visuals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ concept: "Newton's First Law" })
        });
        const data = await res.json();
        logResult('POST /api/generate-visuals', res.ok && data.success, `Visual blueprint parsed successfully`);
    } catch (e) { logResult('POST /api/generate-visuals', false, e.message); }

    // 5. Script Generator
    try {
        const res = await fetch(`${baseUrl}/api/generate-script`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: "Introduction to HTML" })
        });
        const data = await res.json();
        logResult('POST /api/generate-script', res.ok && data.success, `Script JSON parsed successfully`);
    } catch (e) { logResult('POST /api/generate-script', false, e.message); }

    // 6. RAG Document Pipeline
    try {
        const formData = new FormData();
        const blob = new Blob(["This is a test document about biology. The mitochondria is the powerhouse of the cell."], { type: 'text/plain' });
        formData.append('file', blob, 'test.txt');
        formData.append('studentId', 'TestStudent');

        const res = await fetch(`${baseUrl}/api/process-document`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        logResult('POST /api/process-document', res.ok && data.success, `File processed, Collection created: ${data.collectionId}`);
    } catch (e) { logResult('POST /api/process-document', false, e.message); }

    // 7. D-ID Endpoint
    try {
        const res = await fetch(`${baseUrl}/api/generate-avatar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: "Hello, testing D-ID." })
        });
        const data = await res.json();
        logResult('POST /api/generate-avatar', res.ok && data.success, `Video Generated at: ${data.video_url}`);
    } catch (e) { logResult('POST /api/generate-avatar', false, e.message); }

    console.log(`\n📊 Test Summary: ${passed} Passed, ${failed} Failed`);
}

testEndpoints();
