#!/usr/bin/env node
/**
 * Text-to-Speech using edge-tts-node (Microsoft Edge voices, free, no API key).
 * Replacement for Python edge-tts script.
 */
const { EdgeTTS } = require('edge-tts-node');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VOICES = {
    "en-female": "en-US-JennyNeural",
    "en-male": "en-US-GuyNeural",
    "hi-female": "hi-IN-SwaraNeural",
    "hi-male": "hi-IN-MadhurNeural",
    "en-uk-female": "en-GB-SoniaNeural",
    "en-uk-male": "en-GB-RyanNeural",
    "en-AU-Neural": "en-AU-NatashaNeural",
    "en-AU-female": "en-AU-NatashaNeural",
    "en-AU-male": "en-AU-WilliamMultilingualNeural",
};

async function generateTTS(text, outputPath, voice = "en-female", rate = "+0%", pitch = "+0Hz") {
    const voiceId = VOICES[voice] || voice;

    const tts = new EdgeTTS();
    await tts.synthesize({
        text,
        voice: voiceId,
        rate,
        pitch,
    });

    const audioBuffer = tts.toBuffer();
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, audioBuffer);

    // Get duration using ffprobe
    let duration = 0;
    try {
        const result = execSync(
            `ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`,
            { encoding: 'utf-8' }
        );
        duration = parseFloat(result.trim()) || 0;
    } catch (e) {
        // ffprobe not available, estimate from text length
        duration = text.split(' ').length * 0.4;
    }

    return { path: outputPath, duration, voice: voiceId };
}

// CLI mode
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log(JSON.stringify({ error: "Usage: tts.js <text> <output_path> [voice] [rate] [pitch]" }));
        process.exit(1);
    }

    const [text, outputPath, voice, rate, pitch] = args;

    generateTTS(text, outputPath, voice, rate, pitch)
        .then(result => console.log(JSON.stringify(result)))
        .catch(err => {
            console.error(JSON.stringify({ error: err.message }));
            process.exit(1);
        });
}

module.exports = { generateTTS };
