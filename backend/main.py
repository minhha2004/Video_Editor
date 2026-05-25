from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles  # Quản lý dữ liệu file tĩnh cho Frontend
from pydantic import BaseModel  # Sử dụng BaseModel để map từ khóa linh hoạt
from typing import List, Optional
import shutil
import os
import uuid
import json

# IMPORT THƯ VIỆN AI LOCAL MỚI: Tách nền ngoại tuyến không phụ thuộc Internet
from rembg import remove, new_session

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
    allow_credentials=True,
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

# Gắn thư mục exports vào FastAPI để phục vụ tính năng Publisher (Truy cập link video trực tuyến)
app.mount("/exports", StaticFiles(directory="exports"), name="exports")

# Khởi tạo Session model AI bóc nền bản nhẹ (u2net_thin) tối ưu hóa tài nguyên phần cứng
# Trong lần đầu khởi chạy, thư viện sẽ tự động tải file ONNX (~40MB) về lưu tại bộ nhớ máy.
try:
    rembg_session = new_session("u2net_thin")
    print("[+] AI Background Remover Model (u2net_thin) initialized successfully!")
except Exception as e:
    rembg_session = None
    print(f"[-] Failed to initialize rembg session, using default mode: {str(e)}")


# --- CLASS MAP DATA ĐỂ TRÁNH LỖI VALIDATION 422 ---
class WordItem(BaseModel):
    word: Optional[str] = None  # Cho phép rỗng nếu frontend gửi trường text
    text: Optional[str] = None  # Tương thích hoàn toàn với mảng phụ đề STT gửi lên
    start: float
    end: float


@app.get("/")
async def root():
    return {"status": "online", "message": "Short Editor Backend is ready!"}


# --- ENDPOINT: AI IMAGE-TO-STICKER BACKGROUND REMOVER (HOÀN TOÀN LOCAL OFF-LINE) ---
@app.post("/api/remove-bg")
async def api_remove_background(file: UploadFile = File(...)):
    """
    Nhận file ảnh từ Frontend, tự động bóc tách nền bằng mô hình AI Local (Rembg),
    không gửi dữ liệu ra mạng internet, bảo mật dữ liệu tuyệt đối, lưu file vào static.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File tải lên bắt buộc phải là định dạng hình ảnh!")

    try:
        # Đọc dữ liệu ảnh thô từ Client gửi lên RAM
        input_data = await file.read()

        # Thực thi mô hình AI bóc tách nền trực tiếp trên CPU Local thông qua session đã khởi tạo
        output_data = remove(input_data, session=rembg_session)

        # Định dạng tên file png trong suốt độc bản tránh trùng lặp
        unique_filename = f"custom_{uuid.uuid4().hex[:8]}.png"
        output_path = os.path.join(STATIC_STICKER_DIR, unique_filename)

        # Ghi file sticker sạch đã bóc nền vào thư mục tĩnh lưu trữ nội bộ
        with open(output_path, "wb") as f:
            f.write(output_data)

        # Trả về cấu hình Sticker với cấu trúc object lồng khớp 100% với Frontend Store
        return {
            "success": True,
            "sticker": {
                "id": f"sticker_{uuid.uuid4().hex[:8]}",
                "src": f"http://localhost:8000/static/stickers/{unique_filename}",
                "startTime": 0,    
                "endTime": 4,      
                "scale": 1.0,      
                "layer": 50,       
                "position": {"x": 50, "y": 50} 
            }
        }

    except Exception as e:
        print(f"[-] Lỗi hệ thống khi xử lý tách nền Local: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Xảy ra lỗi trong quá trình xử lý tách nền AI Local: {str(e)}"
        )


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
    
    try:
        success = await generate_voiceover(text, output_path)
        if success:
            return FileResponse(output_path, media_type="audio/mpeg", filename="ai-voice.mp3")
        else:
            raise HTTPException(status_code=500, detail="Lỗi khi tạo giọng nói AI")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/render")
async def api_render(
    video: UploadFile = File(...), 
    audio: UploadFile = None, 
    config: str = Form(...)
):
    """
    API Render video cuối cùng bằng MoviePy.
    Nhận video thô, file audio phụ trợ (nếu có) và chuỗi JSON cấu hình sạch từ Frontend.
    """
    job_id = str(uuid.uuid4())
    v_path = os.path.join(UPLOAD_DIR, f"{job_id}_v.mp4")
    a_path = os.path.join(UPLOAD_DIR, f"{job_id}_a.mp3") if audio else None
    out_path = os.path.join(EXPORT_DIR, f"{job_id}_final.mp4")

    # Lưu tạm tệp video upload từ client
    with open(v_path, "wb") as f:
        shutil.copyfileobj(video.file, f)
        
    # Lưu tạm tệp âm thanh lồng ghép từ client (nếu có)
    if audio:
        with open(a_path, "wb") as f:
            shutil.copyfileobj(audio.file, f)

    try:
        # Gọi trực tiếp lõi xử lý kết xuất video MoviePy (đã được fix triệt để lỗi '50%')
        process_video_export(v_path, a_path, config, out_path)
        
        # Kiểm tra file đầu ra và trả về luồng stream video tải về cho frontend
        if os.path.exists(out_path):
            return FileResponse(out_path, media_type="video/mp4", filename="short_video_export.mp4")
        else:
            raise HTTPException(status_code=500, detail="Render thất bại, không tìm thấy file đầu ra")
            
    except Exception as e:
        print(f"Render Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Đảm bảo dọn dẹp sạch tệp tạm trong uploads/ để tránh tràn đĩa cứng
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


# --- TÍCH HỢP MÔ-ĐUN PUBLISHER THÔNG MINH (TỰ ĐỘNG QUÉT FILE MỚI NHẤT) ---
@app.post("/api/publisher/publish")
async def publish_video(video_name: str):
    """
    Xử lý yêu cầu xuất bản video từ người dùng.
    Tự động nhận diện file kết xuất mới nhất trong thư mục exports để tránh lỗi lệch tên (404).
    """
    import glob

    # 1. Đường dẫn gốc tới thư mục exports
    target_dir = "exports"
    
    # 2. Tìm tất cả các file .mp4 đang có trong thư mục exports
    video_files = glob.glob(os.path.join(target_dir, "*.mp4"))
    
    if not video_files:
        raise HTTPException(
            status_code=404, 
            detail="Không tìm thấy bất kỳ tệp video thành phẩm nào trong thư mục kết xuất!"
        )
        
    # 3. MẸO THÔNG MINH: Sắp xếp các file theo thời gian chỉnh sửa (mới nhất lên đầu)
    video_files.sort(key=os.path.getmtime, reverse=True)
    latest_video_path = video_files[0] # Đây chính là file video bạn vừa Render xong!
    
    # 4. Trích xuất lại tên file thực tế từ đường dẫn (Ví dụ: "uuid_final.mp4")
    actual_video_name = os.path.basename(latest_video_path)
    
    # 5. Sinh liên kết public URL chính xác 100% dựa trên file thực tế
    public_url = f"http://localhost:8000/exports/{actual_video_name}"
    
    return {
        "success": True,
        "message": "Xuất bản và cấu hình liên kết chia sẻ video thành công!",
        "shareLink": public_url
    }

if __name__ == "__main__":
    import uvicorn
    # Khởi chạy server tại port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)