# Short Video Editor Pro

A professional-grade, AI-driven web application designed to automate the post-production workflow for short-form content (Shorts, Reels, TikTok). The project uses Faster-Whisper for accurate transcription, Edge-TTS for neural voiceovers, OpenCV & Pydub for intelligent scene detection, and MoviePy for multi-threaded media rendering.

All core processing components are decoupled via a FastAPI backend to ensure scalability, cross-platform compatibility, and optimal hardware utilization (e.g., VideoToolbox on macOS).

---

## Features

* Auto AI Subtitle (STT) with precise word-level timestamps using Faster-Whisper
* AI Voiceover (TTS) generating natural-sounding speech via Edge-TTS (US-Ava Neural)
* Smart Cut Tool featuring amplitude-based silence removal and multi-modal highlight detection
* Auto-Mix Stickers using NLP-driven contextual insertion via NLTK Lemmatization
* AI Image-to-Sticker background remover leveraging integrated web services for seamless mask stripping
* Interactive Editor GUI supporting live translation, coordinate dragging, and scale modification built on Next.js
* High-Performance Renderer utilizing a MoviePy-based engine with hardware-acceleration support

---

## Dependencies

| Library / Tool | Version | Purpose |
| :--- | :--- | :--- |
| FFmpeg | system | Core media demuxing and stream encoding |
| ImageMagick | system | Font rasterization for text overlays |
| Faster-Whisper | latest | Word-level audio transcription (STT) |
| Edge-TTS | latest | Neural text-to-speech generation |
| MoviePy | latest | Composite video and audio rendering |
| OpenCV / Pydub | latest | Visual frame differencing & audio amplitude analysis |
| NLTK | latest | Natural Language Processing (Lemmatization) |
| FastAPI | latest | Backend REST API framework |
| Next.js | 14+ | Frontend React framework and routing |

---

## Environment Setup (Prerequisites)

Because this platform performs low-level multimedia processing, the following tools must be installed globally on your host environment.

### macOS (Homebrew)
```bash
brew update
brew install ffmpeg imagemagick

```

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install ffmpeg imagemagick -y

```

### Windows (PowerShell Admin)

```powershell
winget install Gyan.FFmpeg
winget install ImageMagick.ImageMagick

```

*(Restart your terminal or PC after installation to update the PATH environment variable).*

---

## Build & Run Backend (FastAPI)

**1. Set the project root directory:**

```bash
cd backend

```

**2. Initialize & Activate Virtual Environment:**

```bash
# Unix / macOS
python3 -m venv .venv
source .venv/bin/activate

# Windows (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

```

**3. Install Dependencies:**

```bash
pip install --upgrade pip
pip install -r requirements.txt
pip install requests fastapi uvicorn pydantic staticfiles nltk

```

**4. Set Up API Credentials:**
Open backend/main.py and ensure your active X-Api-Key credential tokens are properly declared within the headers configuration of the /api/remove-bg route handler to enable the custom AI image background remover.

**5. Run the Server:**

```bash
python main.py

```

*Output address:* http://localhost:8000 (API Docs available at /docs)

---

## Build & Run Frontend (Next.js)

Open a new terminal session (keep the Backend running).

**1. Navigate to the Frontend directory:**

```bash
cd frontend

```

**2. Install Node Dependencies:**

```bash
npm install

```

**3. Run the Development Server:**

```bash
npm run dev

```

*Output address:* http://localhost:3000

---

## Troubleshooting & Operational Notes

* **ImageMagick Errors (Windows):** Ensure the absolute path to the ImageMagick executable is added to the system PATH.
* **Font Policy Blocks (Linux):** If TextClip fails, edit /etc/ImageMagick-6/policy.xml and change `<policy domain="path" rights="none" pattern="@*" />` to `rights="read|write"`.
* **AI Cold Start:** The first execution of the STT service will take 1-2 minutes to download the base Whisper model (int8). Subsequent runs are instant.
* **Storage Permissions:** Ensure the host user has read/write access to backend/uploads and backend/exports.

---

## Project Structure

```text
ShortVideoEditorPro/
├── backend/
│   ├── main.py               # Core entrypoint, REST routing endpoints and CORS layout
│   ├── requirements.txt      # Python environments package manifest
│   ├── services/             # Decoupled processing script modules
│   │   ├── highlight_service.py
│   │   ├── mixing_service.py # NLP automated keyword mapping and duration calculation
│   │   ├── silence_service.py
│   │   ├── stt_service.py    # Faster-Whisper audio transcription model configurations
│   │   └── tts_service.py    # Edge-TTS text compilation service
│   ├── static/
│   │   └── stickers/         # Storage repository for processed alpha transparency assets
│   ├── uploads/              # Volatile cache bucket for working raw media uploads
│   └── exports/              # Production output track renders destination
│
├── frontend/
│   ├── package.json          # Node engine scripts and tracking framework trees
│   ├── src/
│   │   ├── store/
│   │   │   └── useVideoStore.ts    # Central Zustand continuous context container
│   │   ├── hooks/
│   │   │   └── useTimelineDrag.ts   # Absolute monitor tracking for active resize states
│   │   └── components/editor/
│   │       ├── Panels/       # Interface tab layout controllers container
│   │       │   ├── ContextPanel.tsx
│   │       │   └── Tabs/     # Segmented parameter configuration tab elements
│   │       │       ├── AssetsTab.tsx
│   │       │       ├── MediaTab.tsx
│   │       │       ├── MusicTab.tsx
│   │       │       └── TextTab.tsx
│   │       └── Preview/      # Real-time multi-layered presentation media canvas
│   │           ├── VideoPreview.tsx
│   │           └── Layers/   # Stacked canvas rendering viewport overlays
│   │               ├── DropzoneOverlay.tsx
│   │               ├── StickerLayer.tsx   # Asset viewport node with focus transforms
│   │               ├── SubtitleLayer.tsx
│   │               └── TextLayer.tsx
│   └── public/
│       └── stickers/         # Default static clipart files storage
└── README.md