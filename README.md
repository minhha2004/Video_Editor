# Short Video Editor Pro

A professional-grade, AI-driven web application designed to automate the post-production workflow for short-form content (Shorts, Reels, TikTok). The project uses Faster-Whisper for accurate transcription, Edge-TTS for neural voiceovers, OpenCV & Pydub for intelligent scene detection, and MoviePy for multi-threaded media rendering.

All core processing components are decoupled via a FastAPI backend to ensure scalability, cross-platform compatibility, and optimal hardware utilization (e.g., VideoToolbox on macOS).

---

## Features

* **Auto AI Subtitle (STT):** Precise word-level timestamps using Faster-Whisper.
* **AI Voiceover (TTS):** Generating natural-sounding speech via Edge-TTS (US-Ava Neural).
* **Smart Cut Tool:** Amplitude-based silence removal and multi-modal highlight detection.
* **Auto-Mix Stickers:** NLP-driven contextual insertion via NLTK Lemmatization with smart history blending to protect custom user graphics.
* **Offline AI Background Remover:** Local mask stripping leveraging `rembg` to convert custom images into transparent stickers instantly without external API dependencies.
* **Interactive Preview Layer Canvas:** Drag-and-drop coordinate adjustment, quick deletion overlays, and real-time pointer bounding-box resizing for text and sticker elements.
* **High-Performance Renderer:** Multi-threaded MoviePy-based video rendering engine.

---

## Dependencies

### Backend Dependencies (Python Stack)
| Library / Tool | Version | Purpose |
| :--- | :--- | :--- |
| **FastAPI** | latest | High-performance asynchronous web framework for API endpoints |
| **Uvicorn** | latest | Lightning-fast ASGI server implementation to run FastAPI |
| **MoviePy** | latest | Script-based video editing engine for multi-track composition & rendering |
| **Faster-Whisper** | latest | Advanced AI Speech-to-Text pipeline for word-level transcriptions |
| **Edge-TTS** | latest | Microsoft Neural text-to-speech engine for lifelike voiceovers |
| **Rembg** | latest | Offline deep learning model for local image background removal |
| **OpenCV (cv2)** | latest | Computer vision library for frame manipulation and visual analysis |
| **Pydub** | latest | Audio processing utility used for amplitude-based silence detection |
| **NLTK** | latest | Natural Language Toolkit used for contextual auto-sticker keyword extraction |

### Frontend Dependencies (JavaScript/TypeScript Stack)
| Library / Tool | Version | Purpose |
| :--- | :--- | :--- |
| **Next.js** | 14 | React framework for server-side rendering and client-side routing |
| **Zustand** | 4 | Lightweight, centralized state management container for temporal assets tracking |
| **Tailwind CSS** | latest | Utility-first CSS framework for dark-themed, responsive timeline UI grids |

### System-Level Dependencies (Required)
| Tool | Installation | Purpose |
| :--- | :--- | :--- |
| **FFmpeg** | System Env | Core multimedia framework used globally for demuxing, decoding, and encoding |
| **ImageMagick** | System Env | Binary backend required by MoviePy for rasterizing rich text overlays on frames |

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