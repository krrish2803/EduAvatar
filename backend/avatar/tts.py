#!/usr/bin/env python3
"""Text-to-Speech using edge-tts (Microsoft Edge voices, free, no API key)."""
import asyncio
import sys
import os
import json
import edge_tts

VOICES = {
    "en-female": "en-US-JennyNeural",
    "en-male": "en-US-GuyNeural",
    "hi-female": "hi-IN-SwaraNeural",
    "hi-male": "hi-IN-MadhurNeural",
    "en-uk-female": "en-GB-SoniaNeural",
    "en-uk-male": "en-GB-RyanNeural",
    "en-AU-Neural": "en-AU-NatashaNeural",
    "en-AU-female": "en-AU-NatashaNeural",
    "en-AU-male": "en-AU-WilliamMultilingualNeural",
}

async def generate_tts(text, output_path, voice="en-female", rate="+0%", pitch="+0Hz"):
    voice_id = VOICES.get(voice, voice)
    communicate = edge_tts.Communicate(text, voice_id, rate=rate, pitch=pitch)
    await communicate.save(output_path)

    # Get audio duration using ffprobe
    import subprocess
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", output_path],
        capture_output=True, text=True
    )
    duration = float(result.stdout.strip()) if result.stdout.strip() else 0

    return {"path": output_path, "duration": duration, "voice": voice_id}

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: tts.py <text> <output_path> [voice] [rate] [pitch]"}))
        sys.exit(1)

    text = sys.argv[1]
    output_path = sys.argv[2]
    voice = sys.argv[3] if len(sys.argv) > 3 else "en-female"
    rate = sys.argv[4] if len(sys.argv) > 4 else "+0%"
    pitch = sys.argv[5] if len(sys.argv) > 5 else "+0Hz"

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    result = asyncio.run(generate_tts(text, output_path, voice, rate, pitch))
    print(json.dumps(result))

if __name__ == "__main__":
    main()
