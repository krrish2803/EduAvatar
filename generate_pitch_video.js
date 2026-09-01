require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function generatePitch() {
    const avatarDir = path.join(__dirname, 'backend', 'avatar');
    const uploadsDir = path.join(__dirname, 'uploads', 'videos');
    const defaultAvatar = path.join(avatarDir, 'default_teacher.png');
    const outputPath = path.join(uploadsDir, 'overview.mp4');

    fs.mkdirSync(uploadsDir, { recursive: true });

    const pitchText = "Hello! I am EduAvatar. Welcome to the future of education. I am not a pre-recorded video. I am a fully autonomous, real-time AI teacher. You can upload any textbook or document, and I will instantly design a personalized curriculum for you. But I don't just lecture. I teach interactively. If you give a wrong answer, I will dynamically pause, figure out exactly where you are confused, and invent a brand new analogy on the fly to help you understand. I remember your progress, adapt to your language, and adjust to your skill level. Click the Try Free Demo button to start your first intelligent lesson with me today.";

    console.log("🎬 Generating pitch video using edge-tts + FFmpeg (free, no API key)...");

    try {
        // Step 1: Generate TTS audio
        console.log("🔊 Step 1: Generating speech audio...");
        const audioPath = path.join(uploadsDir, 'pitch_audio.mp3');
        const ttsResult = execSync(
            `python3 "${path.join(avatarDir, 'tts.py')}" "${pitchText.replace(/"/g, '\\"')}" "${audioPath}" "en-female"`,
            { timeout: 30000, encoding: 'utf8' }
        );
        const ttsData = JSON.parse(ttsResult.trim());
        console.log(`   ✅ Audio generated: ${ttsData.duration.toFixed(1)}s, voice: ${ttsData.voice}`);

        // Step 2: Generate video
        console.log("🎥 Step 2: Generating video with subtitles...");
        const videoResult = execSync(
            `python3 "${path.join(avatarDir, 'video_gen.py')}" "${defaultAvatar}" "${audioPath}" "${outputPath}" "${pitchText.replace(/"/g, '\\"').replace(/'/g, "\\'")}"`,
            { timeout: 60000, encoding: 'utf8' }
        );
        const videoData = JSON.parse(videoResult.trim());

        if (videoData.error) {
            throw new Error(videoData.error);
        }

        // Cleanup
        try { fs.unlinkSync(audioPath); } catch(e) {}

        console.log(`\n✅ Pitch video generated successfully!`);
        console.log("========================================");
        console.log(`📁 File: ${outputPath}`);
        console.log(`⏱️  Duration: ${videoData.duration.toFixed(1)}s`);
        console.log(`📐 Resolution: ${videoData.resolution}`);
        console.log(`💾 Size: ${(videoData.file_size / 1024).toFixed(0)}KB`);
        console.log("========================================");
        console.log(`\n🌐 View at: http://localhost:3001/uploads/videos/overview.mp4`);

    } catch (e) {
        console.error("❌ Error:", e.message);
    }
}

generatePitch();
