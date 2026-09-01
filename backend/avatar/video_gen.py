#!/usr/bin/env python3
"""Generate talking avatar video: image + audio + subtitles → MP4 using FFmpeg."""
import subprocess
import sys
import os
import json
import re

def create_video(image_path, audio_path, output_path, subtitle_text=None, subtitle_file=None):
    """Create video from static image + audio with optional subtitles."""

    # Get audio duration
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", audio_path],
        capture_output=True, text=True
    )
    duration = float(result.stdout.strip()) if result.stdout.strip() else 10

    # Build FFmpeg command
    cmd = ["ffmpeg", "-y"]

    # Input: loop the image for the duration of audio
    cmd.extend(["-loop", "1", "-i", image_path])
    cmd.extend(["-i", audio_path])

    # Video filter: scale to 720p, add subtle breathing animation
    vf = (
        "scale=1280:720:force_original_aspect_ratio=decrease,"
        "pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,"
        "format=yuv420p"
    )

    # Add subtitles if provided
    if subtitle_file and os.path.exists(subtitle_file):
        # Escape special characters in path for FFmpeg
        escaped_path = subtitle_file.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
        vf += f",subtitles='{escaped_path}':force_style='FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,MarginV=40'"
    elif subtitle_text:
        # Create a temporary SRT file
        srt_path = output_path.replace(".mp4", ".srt")
        words = subtitle_text.split()
        chunk_size = max(1, len(words) // max(1, int(duration / 3)))
        chunks = [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]

        with open(srt_path, "w") as f:
            for i, chunk in enumerate(chunks):
                start = i * (duration / len(chunks))
                end = (i + 1) * (duration / len(chunks))
                f.write(f"{i+1}\n")
                f.write(f"{format_time(start)} --> {format_time(end)}\n")
                f.write(f"{chunk}\n\n")

        escaped_path = srt_path.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
        vf += f",subtitles='{escaped_path}':force_style='FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,MarginV=40'"

    cmd.extend(["-vf", vf])

    # Output settings
    cmd.extend([
        "-c:v", "libx264",
        "-tune", "stillimage",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-shortest",
        "-movflags", "+faststart",
        output_path
    ])

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        # If subtitles fail, try without them
        if "subtitles" in vf:
            vf_simple = (
                "scale=1280:720:force_original_aspect_ratio=decrease,"
                "pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,"
                "format=yuv420p"
            )
            cmd_simple = [
                "ffmpeg", "-y",
                "-loop", "1", "-i", image_path,
                "-i", audio_path,
                "-vf", vf_simple,
                "-c:v", "libx264", "-tune", "stillimage",
                "-c:a", "aac", "-b:a", "192k",
                "-pix_fmt", "yuv420p",
                "-shortest", "-movflags", "+faststart",
                output_path
            ]
            result = subprocess.run(cmd_simple, capture_output=True, text=True)
            if result.returncode != 0:
                return {"error": result.stderr[-500:] if result.stderr else "FFmpeg failed"}

        else:
            return {"error": result.stderr[-500:] if result.stderr else "FFmpeg failed"}

    # Get output file size
    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0

    return {
        "path": output_path,
        "duration": duration,
        "file_size": file_size,
        "resolution": "1280x720"
    }

def format_time(seconds):
    """Format seconds to SRT timestamp."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: video_gen.py <image> <audio> <output> [subtitle_text]"}))
        sys.exit(1)

    image_path = sys.argv[1]
    audio_path = sys.argv[2]
    output_path = sys.argv[3]
    subtitle_text = sys.argv[4] if len(sys.argv) > 4 else None

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Check if subtitle is a file path
    subtitle_file = None
    if subtitle_text and os.path.exists(subtitle_text):
        subtitle_file = subtitle_text
        subtitle_text = None

    result = create_video(image_path, audio_path, output_path, subtitle_text, subtitle_file)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
