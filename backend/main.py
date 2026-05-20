from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
import shutil
import os
import uuid
import json

# Import các service xử lý AI và Video
from services.stt_service import transcribe_audio
from services.tts_service import generate_voiceover
from services.video_service import process_video_export
from services.highlight_service import get_highlight_segment
from services.silence_service import detect_non_silent_segments
# Import thêm service auto mixing
from services.mixing_service import generate_auto_stickers

app = FastAPI(title="Short Editor Pro Backend")

# Cấu hình CORS để Next.js (port 3000) có thể gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo các thư mục lưu trữ tạm thời
UPLOAD_DIR = "uploads"
EXPORT_DIR = "exports"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)

# Định nghĩa cấu trúc dữ liệu đầu vào cho Auto Mixing
class WordItem(BaseModel):
    word: str
    start: float
    end: float

@app.get("/")
async def root():
    return {"status": "online", "message": "Short Editor Backend is ready!"}

@app.post("/api/stt")
async def api_stt(file: UploadFile = File(...)):
    """
    Chấp nhận cả file Audio (.mp3) hoặc Video (.mp4). 
    Faster-Whisper sẽ tự động trích xuất luồng âm thanh để tạo phụ đề.
    """
    file_id = str(uuid.uuid4())
    file_extension = os.path.splitext(file.filename)[1]
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_extension}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Xử lý tạo phụ đề tiếng Anh tự động
        subtitles = transcribe_audio(file_path)
        return {"subtitles": subtitles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Xóa file tạm sau khi xử lý để nhẹ máy i9
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/api/tts")
async def api_tts(data: dict):
    """
    Tạo giọng nói AI (Ava - English US) từ văn bản.
    """
    text = data.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="Văn bản không được để trống")
        
    file_id = str(uuid.uuid4())
    output_path = os.path.join(EXPORT_DIR, f"{file_id}.mp3")
    
    success = await generate_voiceover(text, output_path)
    
    if success:
        return FileResponse(output_path, media_type="audio/mpeg", filename="ai-voice.mp3")
    else:
        raise HTTPException(status_code=500, detail="Lỗi khi tạo giọng nói AI")

@app.post("/api/render")
async def api_render(
    video: UploadFile = File(...), 
    audio: UploadFile = None, 
    config: str = Form(...)
):
    """
    Render video cuối cùng bằng MoviePy.
    """
    job_id = str(uuid.uuid4())
    v_path = os.path.join(UPLOAD_DIR, f"{job_id}_v.mp4")
    a_path = os.path.join(UPLOAD_DIR, f"{job_id}_a.mp3") if audio else None
    out_path = os.path.join(EXPORT_DIR, f"{job_id}_final.mp4")

    # Lưu file video gốc
    with open(v_path, "wb") as f:
        shutil.copyfileobj(video.file, f)
        
    # Lưu file âm thanh rời (nếu có)
    if audio:
        with open(a_path, "wb") as f:
            shutil.copyfileobj(audio.file, f)

    try:
        # Gọi service xử lý render thực tế
        process_video_export(v_path, a_path, config, out_path)
        
        if os.path.exists(out_path):
            return FileResponse(out_path, media_type="video/mp4", filename="short_video_export.mp4")
        else:
            raise HTTPException(status_code=500, detail="Render thất bại, không tìm thấy file đầu ra")
            
    except Exception as e:
        print(f"Render Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Dọn dẹp file trung gian để tiết kiệm bộ nhớ cho MacBook
        for p in [v_path, a_path]:
            if p and os.path.exists(p):
                os.remove(p)

@app.post("/api/ai/detect-highlight")
async def api_detect_highlight(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    temp_path = f"uploads/ai_{job_id}.mp4"
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # BỎ duration_limit=10 ở đây vì hàm mới tự tính rồi
        result = get_highlight_segment(temp_path) 
        return result
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/api/ai/cut-silence")
async def api_cut_silence(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    temp_path = os.path.join(UPLOAD_DIR, f"silence_{job_id}.mp4")
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Gọi service phân tích các đoạn không im lặng
        segments = detect_non_silent_segments(temp_path)
        return {"segments": segments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/api/ai/auto-mix")
async def api_auto_mix(transcript: List[WordItem]):
    """
    Nhận mảng từ (transcript) từ Frontend, 
    phân tích keyword tiếng Anh và trả về mảng sticker gợi ý.
    """
    try:
        # Tương thích với cả Pydantic V1 và V2 (chuyển obj thành dict)
        transcript_data = [item.dict() for item in transcript]
        
        # Gọi logic trong mixing_service
        suggested_stickers = generate_auto_stickers(transcript_data)
        
        return {
            "success": True,
            "stickers": suggested_stickers
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xử lý Auto Mixing: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Khởi chạy server tại port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)