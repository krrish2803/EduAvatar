# Avatar/Video Generation Approach

## Overview

EduAvatar generates teacher avatar videos using a free, local pipeline: **Edge-TTS** (voice) + **FFmpeg** (video rendering) + **PIL** (avatar image).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 AVATAR VIDEO PIPELINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Speech  │───▶│  Edge-   │───▶│  Audio   │───▶│  FFmpeg  │  │
│  │  Text    │    │  TTS     │    │  File    │    │  Merge   │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │                                      │                  │
│       │              ┌──────────────┐        │                  │
│       │              │  Avatar      │        │                  │
│       └──────────────│  Image (PIL) │────────┘                  │
│                      └──────────────┘                           │
│                             │                                   │
│                             ▼                                   │
│                      ┌──────────────┐                           │
│                      │  FFmpeg      │                           │
│                      │  + Subtitles │                           │
│                      └──────┬───────┘                           │
│                             │                                   │
│                             ▼                                   │
│                      ┌──────────────┐                           │
│                      │   MP4 Video  │                           │
│                      │  (720p, 30fps)│                          │
│                      └──────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Avatar Image Generation (PIL)

```python
# backend/avatar/default_teacher.png generation
from PIL import Image, ImageDraw, ImageFont

def create_teacher_avatar():
    img = Image.new('RGB', (1280, 720), '#0f172a')
    draw = ImageDraw.Draw(img)
    
    # Background gradient
    for y in range(720):
        r = int(15 + (y/720) * 10)
        g = int(23 + (y/720) * 15)
        b = int(42 + (y/720) * 20)
        draw.line([(0, y), (1279, y)], fill=(r, g, b))
    
    # Teacher figure
    # Body (suit)
    draw.polygon([(540, 380), (640, 320), (740, 380), (720, 550), (560, 550)], 
                 fill='#1e293b', outline='#334155')
    
    # Head
    draw.ellipse([590, 180, 690, 310], fill='#e8b89d', outline='#d4a574')
    
    # Hair
    draw.arc([585, 170, 695, 280], 180, 360, fill='#1a1a2e', width=25)
    
    # Eyes
    draw.ellipse([610, 235, 625, 250], fill='white')
    draw.ellipse([660, 235, 675, 250], fill='white')
    
    # Glasses
    draw.rectangle([605, 230, 630, 255], outline='#475569', width=2)
    draw.rectangle([655, 230, 680, 255], outline='#475569', width=2)
    
    # Laptop on desk
    draw.rectangle([560, 510, 720, 545], fill='#0f172a', outline='#475569')
    
    # Title text
    draw.text((640, 620), 'EduAvatar', fill='white', font=font_large, anchor='mm')
    
    img.save('backend/avatar/default_teacher.png')
```

### 2. Edge-TTS Voice Generation

```python
# backend/avatar/tts.py
import edge_tts
import asyncio

async def generate_speech(text, voice, output_file):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)
    print(f"Audio generated: {output_file}")
```

### 3. FFmpeg Video Generation

```python
# backend/avatar/video_gen.py
import subprocess

def create_video(audio_file, avatar_image, output_file, subtitle_text):
    # Create video from image + audio
    cmd = [
        'ffmpeg', '-y',
        '-loop', '1',
        '-i', avatar_image,
        '-i', audio_file,
        '-c:v', 'libx264',
        '-tune', 'stillimage',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-vf', f"drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='{subtitle_text}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=h-50",
        '-pix_fmt', 'yuv420p',
        '-shortest',
        output_file
    ]
    subprocess.run(cmd, check=True)
```

---

## Multi-Segment Video Generation

### Pitch Video Script

```javascript
// generate_pitch_video.js
const segments = [
    { title: "Welcome", text: "Welcome to EduAvatar, your personal AI teacher." },
    { title: "Problem", text: "Traditional education is one-size-fits-all." },
    { title: "Solution", text: "EduAvatar adapts to YOUR learning style." },
    { title: "Features", text: "Interactive lessons, real-time quizzes, and more." },
    { title: "Technology", text: "Powered by NVIDIA AI and free open-source tools." },
    { title: "Multilingual", text: "Learn in English, Hindi, or any language." },
    { title: "Avatar", text: "Meet your personal AI teacher avatar." },
    { title: "Call to Action", text: "Start learning with EduAvatar today!" }
];

async function generatePitchVideo() {
    const segmentFiles = [];
    
    for (const segment of segments) {
        const audioFile = await generateSpeech(segment.text, voice);
        const videoFile = await createVideo(audioFile, avatarImage, segment.title);
        segmentFiles.push(videoFile);
    }
    
    // Concatenate all segments
    await concatenateVideos(segmentFiles, 'eduavatar_pitch.mp4');
}
```

---

## Video Specifications

| Property | Value |
|----------|-------|
| Resolution | 1280x720 (720p) |
| Frame Rate | 30 fps |
| Video Codec | H.264 |
| Audio Codec | AAC |
| Audio Bitrate | 192 kbps |
| File Format | MP4 |
| Subtitle Style | White text, bottom center |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Segment Generation | ~10-30 seconds |
| Full Pitch Video (8 segments) | ~2.8 minutes |
| File Size (8 segments) | ~3.1 MB |
| Audio Quality | 136 kbps → 192 kbps (re-encoded) |

---

## Future Improvements

| Feature | Priority | Effort |
|---------|----------|--------|
| Real human avatar photo | High | Low |
| Lip-sync animation | High | High |
| Multiple avatar characters | Medium | Medium |
| Background music | Low | Low |
| Animated gestures | Medium | High |
| D-ID/HeyGen integration | High | Medium (paid) |

---

## Known Limitations

1. **Static Image**: Avatar is a still image, not animated
2. **No Lip-Sync**: Mouth doesn't move with speech
3. **Limited Expressions**: Fixed facial expression
4. **Subtitle Hardcoded**: Text burned into video (not adjustable)
5. **No Background**: Solid dark background only
