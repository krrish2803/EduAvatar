#!/usr/bin/env node
/**
 * Text-to-Speech using gtts (Google Translate TTS, free, no API key).
 */
const gTTS = require('gtts');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VOICES = {
    "en-female": "en",
    "en-male": "en",
    "hi-female": "hi",
    "hi-male": "hi",
    "en-uk-female": "en",
    "en-uk-male": "en",
    "en-AU-Neural": "en",
    "en-AU-female": "en",
    "en-AU-male": "en",
};

async function generateTTS(text, outputPath, voice = "en-female") {
    const lang = VOICES[voice] || 'en';

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    return new Promise((resolve, reject) => {
        const tts = new gTTS(text, lang);
        tts.save(outputPath, function(err) {
            if (err) return reject(err);

            let duration = 0;
            try {
                const result = execSync(
                    `ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`,
                    { encoding: 'utf-8' }
                );
                duration = parseFloat(result.trim()) || 0;
            } catch (e) {
                duration = text.split(' ').length * 0.4;
            }

            resolve({ path: outputPath, duration, voice: lang });
        });
    });
}

// CLI mode
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log(JSON.stringify({ error: "Usage: tts.js <text> <output_path> [voice]" }));
        process.exit(1);
    }

    const [text, outputPath, voice] = args;

    generateTTS(text, outputPath, voice)
        .then(result => console.log(JSON.stringify(result)))
        .catch(err => {
            console.error(JSON.stringify({ error: err.message }));
            process.exit(1);
        });
}

module.exports = { generateTTS };
