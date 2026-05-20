# Short Video Editor Pro

A professional-grade, **AI-driven web application** designed to automate the post-production workflow for **short-form content** (Shorts, Reels, TikTok). The project uses **Faster-Whisper** for accurate transcription, **Edge-TTS** for neural voiceovers, **OpenCV & Pydub** for intelligent scene detection, and **MoviePy** for multi-threaded media rendering.

All core processing components are decoupled via a **FastAPI backend** to ensure **scalability**, **cross-platform compatibility**, and optimal hardware utilization (e.g., VideoToolbox on macOS).

---

## Features

* Auto AI Subtitle (STT) with precise word-level timestamps using **Faster-Whisper**
* AI Voiceover (TTS) generating natural-sounding speech via **Edge-TTS** (US-Ava Neural)
* **Smart Cut Tool** featuring amplitude-based silence removal and multi-modal highlight detection
* Auto-Mix Stickers using NLP-driven contextual insertion via **NLTK Lemmatization**
* Interactive Editor GUI with fluid React/Zustand state management built on **Next.js**
* High-Performance Renderer utilizing a **MoviePy**-based engine with hardware-acceleration support

---

## Dependencies

| Library / Tool | Version | Purpose |
| :--- | :--- | :--- |
| **FFmpeg** | system | Core media demuxing and stream encoding |
| **ImageMagick** | system | Font rasterization for text overlays |
| **Faster-Whisper** | latest | Word-level audio transcription (STT) |
| **Edge-TTS** | latest | Neural text-to-speech generation |
| **MoviePy** | latest | Composite video and audio rendering |
| **OpenCV / Pydub** | latest | Visual frame differencing & audio amplitude analysis |
| **NLTK** | latest | Natural Language Processing (Lemmatization) |
| **FastAPI** | latest | Backend REST API framework |
| **Next.js** | 14+ | Frontend React framework and routing |

---

## Environment Setup (Prerequisites)

Because this platform performs low-level multimedia processing, the following tools **must** be installed globally on your host environment.

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

*(Restart your terminal or PC after installation to update the `PATH` environment variable).*

---

## Build & Run Backend (FastAPI)

**1. Set the project root directory:**

```bash
cd backend

```

**2. Initialize & Activate Virtual Environment:**

```bash
# Unix / macOS
python3 -m venv venv
source venv/bin/activate

# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

```

**3. Install Dependencies:**

```bash
pip install --upgrade pip
pip install -r requirements.txt

```

**4. Run the Server:**

```bash
python main.py

```

*Output address:* `http://localhost:8000` (API Docs available at `/docs`)

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

*Output address:* `http://localhost:3000`

---

## Troubleshooting & Operational Notes

* **ImageMagick Errors (Windows):** Ensure the absolute path to the ImageMagick executable is added to the system `PATH`.
* **Font Policy Blocks (Linux):** If `TextClip` fails, edit `/etc/ImageMagick-6/policy.xml` and change `<policy domain="path" rights="none" pattern="@*" />` to `rights="read|write"`.
* **AI Cold Start:** The first execution of the STT service will take 1-2 minutes to download the `base` Whisper model (`int8`). Subsequent runs are instant.
* **Storage Permissions:** Ensure the host user has read/write access to `backend/uploads` and `backend/exports`.

---

## Project Structure

```text
ShortVideoEditorPro/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── services/
│   │   ├── highlight_service.py
│   │   ├── mixing_service.py
│   │   ├── silence_service.py
│   │   ├── stt_service.py
│   │   ├── tts_service.py
│   │   └── video_service.py
│   ├── uploads/
│   └── exports/
│
├── frontend/
│   ├── app/
│   ├── src/
│   │   ├── components/editor/
│   │   ├── store/
│   │   └── services/
│   ├── public/
│   │   └── stickers/
│   ├── package.json
│   └── .env.local
└── README.md
