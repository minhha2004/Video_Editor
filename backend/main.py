from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles # Quản lý dữ liệu file tĩnh cho Frontend
from pydantic import BaseModel, Field # Sử dụng Field để map từ khóa linh hoạt
from typing import List, Optional
import shutil
import os
import uuid
import json
import requests # Sử dụng requests để gọi API ngoài nhẹ máy

# Import các service xử lý AI và Video sẵn có trong dự án của bạn
from services.stt_service import transcribe_audio
from services.tts_service import generate_voiceover
from services.video_service import process_video_export
from services.highlight_service import get_highlight_segment
from services.silence_service import detect_non_silent_segments
from services.mixing_service import generate_auto_stickers

app = FastAPI(title="Short Editor Pro Backend")

# Cấu hình CORS để Next.js (port 3000) có thể gọi API mượt mà
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo các thư mục lưu trữ tạm thời và file tĩnh
UPLOAD_DIR = "uploads"
EXPORT_DIR = "exports"
STATIC_STICKER_DIR = os.path.join("static", "stickers")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)
os.makedirs(STATIC_STICKER_DIR, exist_ok=True)

# Gắn thư mục static vào FastAPI để cho phép Frontend truy cập ảnh tĩnh qua URL
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- NÂNG CẤP CLASS ĐỂ TRÁNH LỖI VALIDATION 422 ---
class WordItem(BaseModel):
    word: Optional[str] = None # Cho phép rỗng nếu frontend gửi trường text
    text: Optional[str] = None # Tương thích hoàn toàn với mảng phụ đề STT gửi lên
    start: float
    end: float

@app.get("/")
async def root():
    return {"status": "online", "message": "Short Editor Backend is ready!"}

# --- ENDPOINT: AI IMAGE-TO-STICKER BACKGROUND REMOVER ---
@app.post("/api/remove-bg")
async def api_remove_background(file: UploadFile = File(...)):
    """
    Nhận file ảnh từ Frontend, gọi API remove.bg để xóa nền tự động,
    lưu vào thư mục static và trả về cấu hình Sticker hoàn chỉnh cho Frontend.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File tải lên bắt buộc phải là định dạng hình ảnh!")

    try:
        input_data = await file.read()

        # Đã chèn chính xác token urWYevyqtcHpHLhpdT8eKQPT của bạn vào header cấu hình
        response = requests.post(
            "https://api.remove.bg/v1.0/removebg",
            files={"image_file": (file.filename, input_data, file.content_type)},
            data={"size": "auto"},
            headers={"X-Api-Key": "urWYevyqtcHpHLhpdT8eKQPT"} 
        )

        if response.status_code != 200:
            print(f"Lỗi phản hồi chi tiết từ remove.bg API: {response.text}")
            raise HTTPException(
                status_code=response.status_code, 
                detail="Dịch vụ tách nền AI bên thứ 3 đang bận hoặc Token gặp sự cố."
            )

        unique_filename = f"custom_{uuid.uuid4().hex}.png"
        output_path = os.path.join(STATIC_STICKER_DIR, unique_filename)

        with open(output_path, "wb") as f:
            f.write(response.content)

        return {
            "success": True,
            "sticker": {
                "id": f"sticker_{uuid.uuid4().hex[:8]}",
                "src": f"http://localhost:8000/static/stickers/{unique_filename}", # URL ảnh tĩnh
                "startTime": 0,    
                "endTime": 4,      
                "scale": 0.8,      
                "layer": 50,       
                "position": {"x": 50, "y": 50} 
            }
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Lỗi hệ thống khi xử lý tách nền: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Xảy ra lỗi trong quá trình xử lý tách nền AI: {str(e)}")


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
        subtitles = transcribe_audio(file_path)
        return {"subtitles": subtitles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
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

    with open(v_path, "wb") as f:
        shutil.copyfileobj(video.file, f)
        
    if audio:
        with open(a_path, "wb") as f:
            shutil.copyfileobj(audio.file, f)

    try:
        process_video_export(v_path, a_path, config, out_path)
        
        if os.path.exists(out_path):
            return FileResponse(out_path, media_type="video/mp4", filename="short_video_export.mp4")
        else:
            raise HTTPException(status_code=500, detail="Render thất bại, không tìm thấy file đầu ra")
            
    except Exception as e:
        print(f"Render Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
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
        segments = detect_non_silent_segments(temp_path)
        return {"segments": segments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

# --- VÁ TRIỆT ĐỂ LỖI ĐÓN NHẬN DATA AUTO MIX ---
@app.post("/api/ai/auto-mix")
async def api_auto_mix(transcript: List[WordItem]):
    """
    Nhận trực tiếp mảng từ (transcript) gửi từ Frontend dưới cấu trúc JSON chuẩn body.
    """
    try:
        # Chuẩn hóa dữ liệu mảng: map linh hoạt cả trường 'text' hoặc 'word' truyền từ STT sang service
        transcript_data = []
        for item in transcript:
            item_dict = item.dict()
            # Đồng bộ hóa từ khóa cho mixing_service
            if item_dict.get("text") and not item_dict.get("word"):
                item_dict["word"] = item_dict["text"]
            transcript_data.append(item_dict)
        
        # Gọi logic trong mixing_service xử lý sinh sticker tự động
        suggested_stickers = generate_auto_stickers(transcript_data)
        
        return {
            "success": True,
            "stickers": suggested_stickers
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xử lý Auto Mixing tại Backend: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Khởi chạy server tại port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)