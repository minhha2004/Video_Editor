import os
from faster_whisper import WhisperModel

model_size = "base"
try:
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    print(f"--- Whisper Model '{model_size}' loaded successfully ---")
except Exception as e:
    print(f"--- Error loading Whisper model: {str(e)} ---")

def transcribe_audio(file_path: str):
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return {"language": None, "language_probability": 0.0, "subtitles": []}

    print(f"Processing file for STT: {os.path.basename(file_path)}")

    try:
        segments, info = model.transcribe(
            file_path, 
            beam_size=5, 
            language=None, 
            task="transcribe",
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
            condition_on_previous_text=False,
            temperature=0.0,
            # --- TÍNH NĂNG MỚI: Yêu cầu AI đo thời gian của TỪNG CHỮ MỘT ---
            word_timestamps=True 
        )

        detected_language = getattr(info, "language", None)
        language_probability = float(getattr(info, "language_probability", 0.0) or 0.0)
        print(
            f"Detected language: {detected_language or 'unknown'} "
            f"({round(language_probability * 100, 1)}%)"
        )

        subtitles = []
        for segment in segments:
            text = segment.text.strip()
            if text:
                # Lấy dữ liệu thời gian chi tiết của từng chữ
                word_list = []
                if hasattr(segment, 'words') and segment.words:
                    for w in segment.words:
                        word_list.append({
                            "word": w.word.strip(),
                            "start": round(w.start, 2),
                            "end": round(w.end, 2)
                        })
                
                # Gắn mảng từ chi tiết này vào kết quả trả về
                subtitles.append({
                    "text": text,
                    "start": round(segment.start, 2),
                    "end": round(segment.end, 2),
                    "words": word_list 
                })
                print(f"[{round(segment.start, 2)}s -> {round(segment.end, 2)}s]: {text}")

        return {
            "language": detected_language,
            "language_probability": round(language_probability, 4),
            "subtitles": subtitles,
        }

    except Exception as e:
        print(f"Critical error during transcription: {str(e)}")
        return {"language": None, "language_probability": 0.0, "subtitles": []}
