#!/usr/bin/env python3
"""Generate multi-segment pitch video with avatar + section titles + subtitles."""
import asyncio
import subprocess
import sys
import os
import json
import textwrap

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'uploads', 'videos')
AVATAR_DIR = os.path.join(os.path.dirname(__file__))
DEFAULT_AVATAR = os.path.join(AVATAR_DIR, 'default_teacher.png')

SEGMENTS = [
    {
        "id": "01_opening",
        "title": "INTRODUCING EDUAVATAR",
        "subtitle": "Your AI Teacher",
        "text": "Hello! Welcome to EduAvatar. We are completely killing the traditional, boring video lecture. What you are looking at is not a static video—it is a fully autonomous, real-time AI teacher.",
        "bg_color": "0x0f172a",
        "accent_color": "0x06b6d4",
        "voice": "en-female",
        "rate": "+5%"
    },
    {
        "id": "02_rag_pipeline",
        "title": "DUAL-DATABASE RAG PIPELINE",
        "subtitle": "Upload Any Document",
        "text": "It starts with our Dual-Database RAG Pipeline. A student can upload any textbook or research paper. In the background, our Node.js server extracts the text, vectorizes it using NVIDIA's Embedding API, and stores it instantly in a Qdrant vector database.",
        "bg_color": "0x1e1b4b",
        "accent_color": "0x818cf8",
        "voice": "en-female",
        "rate": "+0%"
    },
    {
        "id": "03_curriculum",
        "title": "CURRICULUM ARCHITECT",
        "subtitle": "AI-Powered Learning Paths",
        "text": "Don't have a document? No problem. Using our Curriculum Architect, a student just types what they want to learn—like Machine Learning—sets their available time, and the LLM mathematically generates a complete, step-by-step learning path, complete with milestones and a final capstone project.",
        "bg_color": "0x14532d",
        "accent_color": "0x4ade80",
        "voice": "en-female",
        "rate": "+0%"
    },
    {
        "id": "04_lesson_room",
        "title": "INTERACTIVE LESSON ROOM",
        "subtitle": "Live AI Teaching",
        "text": "But here is where the magic happens: The Interactive Lesson Room. Powered by our avatar engine, our photorealistic avatar teaches the lesson live. But unlike normal AI... it doesn't monologue.",
        "bg_color": "0x7c2d12",
        "accent_color": "0xfb923c",
        "voice": "en-female",
        "rate": "-5%"
    },
    {
        "id": "05_conversation",
        "title": "CONVERSATIONAL ENGINE",
        "subtitle": "Forced Student Engagement",
        "text": "Using our custom Conversational Teaching Engine, the AI is forced to stop every few sentences and ask the student a question. The video actually pauses. The student has to engage.",
        "bg_color": "0x581c87",
        "accent_color": "0xc084fc",
        "voice": "en-female",
        "rate": "+0%"
    },
    {
        "id": "06_misconception",
        "title": "ADAPTIVE MISCONCEPTION ENGINE",
        "subtitle": "Real-Time Error Correction",
        "text": "And if the student gets it wrong? Our Adaptive Misconception Engine kicks in. It doesn't just say Wrong. It intercepts the mistake, diagnoses exactly why the student is confused, and invents a brand new analogy on the fly to re-teach the concept.",
        "bg_color": "0x7f1d1d",
        "accent_color": "0xf87171",
        "voice": "en-female",
        "rate": "-5%"
    },
    {
        "id": "07_visuals",
        "title": "VISUAL DESIGNER & ANALYTICS",
        "subtitle": "Smart Whiteboard + Learning Reports",
        "text": "While the AI teaches, our Subject-Aware Visual Designer figures out what should be on the whiteboard—like whether it needs a biology diagram or a math formula. And when the lesson is over, the student gets a structured Learning Report tracking their exact strong points and weak gaps.",
        "bg_color": "0x164e63",
        "accent_color": "0x22d3ee",
        "voice": "en-female",
        "rate": "+0%"
    },
    {
        "id": "08_closing",
        "title": "EDUAVATAR",
        "subtitle": "The Future of Education",
        "text": "EduAvatar remembers your progress, adapts to your language, and adjusts to your skill level. Powered by NVIDIA and Qdrant, this isn't just a chatbot. It's the ultimate, hyper-personalized AI Teacher. Thank you!",
        "bg_color": "0x0f172a",
        "accent_color": "0x06b6d4",
        "voice": "en-female",
        "rate": "+5%"
    }
]

def run_cmd(cmd, timeout=60):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    return result.stdout, result.stderr, result.returncode

def get_duration(filepath):
    out, _, _ = run_cmd(f'ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "{filepath}"')
    return float(out.strip()) if out.strip() else 0

def create_segment_video(segment, audio_path, output_path):
    """Create a video segment with colored background, title, and avatar."""
    bg = segment['bg_color']
    accent = segment['accent_color']
    title = segment['title']
    subtitle = segment['subtitle']

    # Create title card video (first 2 seconds) + avatar video
    # Simple approach: solid color bg with avatar centered, audio plays over it
    cmd = (
        f'ffmpeg -y '
        f'-f lavfi -i "color=c=0x{bg[2:]}:s=1280x720:d=999" '
        f'-loop 1 -i "{DEFAULT_AVATAR}" '
        f'-i "{audio_path}" '
        f'-filter_complex "'
        f'[1:v]scale=300:300,format=rgba[avatar];'
        f'[0:v][avatar]overlay=90:200:shortest=1[bg];'
        f'[bg]drawbox=x=0:y=0:w=1280:h=120:color=0x{bg[2:]}@0.8:t=fill[top];'
        f'[top]drawbox=x=0:y=100:w=1280:h=3:color=0x{accent[2:]}:t=fill[line];'
        f'[bg]drawbox=x=0:y=600:w=1280:h=120:color=0x{bg[2:]}@0.8:t=fill[bot];'
        f'[bot]drawbox=x=0:y=600:w=1280:h=3:color=0x{accent[2:]}:t=fill[line2]" '
        f'-map "[line2]" -map 2:a '
        f'-c:v libx264 -tune stillimage -c:a aac -b:a 192k '
        f'-shortest -pix_fmt yuv420p '
        f'"{output_path}"'
    )

    # Simpler approach that actually works
    cmd = (
        f'ffmpeg -y '
        f'-loop 1 -i "{DEFAULT_AVATAR}" '
        f'-i "{audio_path}" '
        f'-vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x{bg[2:]}" '
        f'-c:v libx264 -tune stillimage -c:a aac -b:a 192k '
        f'-shortest -pix_fmt yuv420p '
        f'"{output_path}"'
    )

    _, stderr, rc = run_cmd(cmd, timeout=120)
    if rc != 0:
        print(f"  ⚠️  FFmpeg warning for {segment['id']}: {stderr[-200:] if stderr else 'unknown'}")
    return os.path.exists(output_path)

def create_title_card(segment, output_path, duration=2.5):
    """Create a title card segment."""
    bg = segment['bg_color']
    accent = segment['accent_color']
    title = segment['title']
    subtitle = segment['subtitle']

    # Use Python PIL to create title card image
    img_script = f'''
from PIL import Image, ImageDraw, ImageFont
img = Image.new("RGB", (1280, 720), "0x{bg[2:]}")
draw = ImageDraw.Draw(img)
try:
    font_title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 56)
    font_sub = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 30)
except:
    font_title = ImageFont.load_default()
    font_sub = ImageFont.load_default()
draw.text((640, 300), "{title}", fill="0x{accent[2:]}", font=font_title, anchor="mm")
draw.text((640, 380), "{subtitle}", fill="white", font=font_sub, anchor="mm")
# Accent line
draw.rectangle([540, 420, 740, 424], fill="0x{accent[2:]}")
img.save("{output_path}")
'''
    _, _, rc = run_cmd(f'python3 -c """{img_script}"""')
    if rc != 0:
        # Fallback: create with ffmpeg
        run_cmd(f'ffmpeg -y -f lavfi -i "color=c=0x{bg[2:]}:s=1280x720:d={duration}" -frames:v 1 "{output_path}"')

    # Convert image to video with duration
    cmd = (
        f'ffmpeg -y -loop 1 -i "{output_path}" '
        f'-f lavfi -i "anullsrc=r=44100:cl=stereo" '
        f'-t {duration} -c:v libx264 -pix_fmt yuv420p -c:a aac '
        f'"{output_path.replace(".png", ".mp4")}"'
    )
    run_cmd(cmd, timeout=30)
    return output_path.replace(".png", ".mp4")

def main():
    os.makedirs(UPLOADS_DIR, exist_ok=True)

    print("🎬 EduAvatar Pitch Video Generator")
    print("=" * 50)

    segment_videos = []

    for i, seg in enumerate(SEGMENTS):
        print(f"\n📋 Segment {i+1}/{len(SEGMENTS)}: {seg['title']}")

        # Step 1: Generate TTS audio
        audio_path = os.path.join(UPLOADS_DIR, f"pitch_{seg['id']}.mp3")
        print(f"  🔊 Generating audio...")
        cmd = f'python3 "{os.path.join(AVATAR_DIR, "tts.py")}" "{seg["text"].replace(chr(34), chr(92)+chr(34))}" "{audio_path}" "{seg["voice"]}" "{seg["rate"]}"'
        stdout, stderr, rc = run_cmd(cmd, timeout=30)
        if rc != 0:
            print(f"  ❌ TTS failed: {stderr[:200]}")
            continue
        tts_data = json.loads(stdout.strip())
        print(f"  ✅ Audio: {tts_data['duration']:.1f}s")

        # Step 2: Create title card
        print(f"  🎨 Creating title card...")
        title_img = os.path.join(UPLOADS_DIR, f"title_{seg['id']}.png")
        title_video = create_title_card(seg, title_img)
        print(f"  ✅ Title card: {get_duration(title_video):.1f}s")

        # Step 3: Create avatar video segment
        segment_video = os.path.join(UPLOADS_DIR, f"segment_{seg['id']}.mp4")
        print(f"  🎥 Creating video segment...")
        create_segment_video(seg, audio_path, segment_video)
        seg_duration = get_duration(segment_video)
        print(f"  ✅ Segment: {seg_duration:.1f}s")

        segment_videos.append((title_video, segment_video))

        # Cleanup audio
        try: os.unlink(audio_path)
        except: pass

    # Step 4: Create concat list
    print(f"\n🔗 Stitching {len(segment_videos)} segments...")
    concat_list = os.path.join(UPLOADS_DIR, "concat_list.txt")
    with open(concat_list, 'w') as f:
        for title_vid, seg_vid in segment_videos:
            f.write(f"file '{os.path.abspath(title_vid)}'\n")
            f.write(f"file '{os.path.abspath(seg_vid)}'\n")

    # Step 5: Concatenate all segments
    final_output = os.path.join(UPLOADS_DIR, "eduavatar_pitch.mp4")

    # First re-encode all segments to same format with high quality audio
    print("  🔄 Normalizing segments...")
    normalized_segments = []
    for idx, (title_vid, seg_vid) in enumerate(segment_videos):
        for vid in [title_vid, seg_vid]:
            norm_path = vid.replace('.mp4', '_norm.mp4')
            cmd = (
                f'ffmpeg -y -i "{vid}" '
                f'-c:v libx264 -preset fast -crf 23 '
                f'-c:a aac -b:a 192k -ar 44100 -ac 2 '
                f'"{norm_path}"'
            )
            run_cmd(cmd, timeout=60)
            normalized_segments.append(norm_path)

    # Rebuild concat list with normalized files
    with open(concat_list, 'w') as f:
        for norm_path in normalized_segments:
            f.write(f"file '{os.path.abspath(norm_path)}'\n")

    cmd = (
        f'ffmpeg -y -f concat -safe 0 -i "{concat_list}" '
        f'-c:v libx264 -preset medium -crf 20 '
        f'-c:a aac -b:a 192k -ar 44100 '
        f'-movflags +faststart '
        f'"{final_output}"'
    )
    _, stderr, rc = run_cmd(cmd, timeout=180)

    if rc == 0 and os.path.exists(final_output):
        duration = get_duration(final_output)
        size = os.path.getsize(final_output)
        print(f"\n{'=' * 50}")
        print(f"✅ PITCH VIDEO GENERATED!")
        print(f"{'=' * 50}")
        print(f"📁 File: {final_output}")
        print(f"⏱️  Duration: {duration:.1f}s ({duration/60:.1f} min)")
        print(f"💾 Size: {size/1024:.0f}KB ({size/1024/1024:.1f}MB)")
        print(f"🌐 View: http://localhost:3001/uploads/videos/eduavatar_pitch.mp4")
        print(f"{'=' * 50}")
    else:
        print(f"\n❌ Failed to create final video: {stderr[-300:] if stderr else 'unknown'}")

    # Cleanup temp files (only after success)
    if os.path.exists(final_output):
        for title_vid, seg_vid in segment_videos:
            for f in [title_vid, title_vid.replace('.mp4', '.png'),
                      seg_vid, title_vid.replace('.mp4', '_norm.mp4'),
                      seg_vid.replace('.mp4', '_norm.mp4')]:
                try: os.unlink(f)
                except: pass
        try: os.unlink(concat_list)
        except: pass

if __name__ == "__main__":
    main()
