from moviepy import VideoFileClip, TextClip, CompositeVideoClip, AudioFileClip
import json
import os
import subprocess

def check_videotoolbox():
    """Kiểm tra xem hệ thống có hỗ trợ tăng tốc phần cứng Mac (VideoToolbox) không"""
    try:
        # Chạy lệnh kiểm tra encoder trong ffmpeg
        cmd = "ffmpeg -encoders"
        output = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT).decode()
        return "h264_videotoolbox" in output
    except:
        return False

def process_video_export(video_path: str, audio_path: str, config_json: str, output_path: str):
    config = json.loads(config_json)
    
    # --- 1. TẢI VÀ TỐI ƯU VIDEO GỐC ---
    clip = VideoFileClip(video_path).subclipped(config['trimStart'], config['trimEnd'])
    
    # Nếu video gốc quá nặng (4K), resize về 1080p để i9 không bị nghẽn bước "vẽ" hình
    if clip.h > 1080:
        print("Đang hạ độ phân giải xuống 1080p để tăng tốc render...")
        clip = clip.resized(height=1080)

    # --- 2. XỬ LÝ ÂM THANH ---
    if audio_path and os.path.exists(audio_path):
        new_audio = AudioFileClip(audio_path)
        audio_duration = config['audio']['end'] - config['audio']['start']
        new_audio = new_audio.with_duration(audio_duration)
        clip = clip.with_audio(new_audio.with_start(config['audio']['start']))
    elif config.get('isVideoMuted'):
        clip = clip.without_audio()

    # --- 3. CHÈN LỚP CHỮ (TEXT LAYER) ---
    clips_to_composite = [clip]
    if config.get('text'):
        txt_cfg = config['text']
        try:
            # Dùng method='label' sẽ nhanh hơn 'caption' đối với các dòng chữ ngắn
            txt_clip = TextClip(
                text=txt_cfg['content'],
                font_size=txt_cfg.get('fontSize', 30),
                color=txt_cfg.get('color', 'white'),
                font='Arial-Bold',
                method='label' 
            ).with_duration(txt_cfg['end'] - txt_cfg['start'])\
             .with_start(txt_cfg['start'])\
             .with_position((f"{txt_cfg['x']}%", f"{txt_cfg['y']}%"))
            
            clips_to_composite.append(txt_clip)
        except Exception as e:
            print(f"Lưu ý: Không thể chèn chữ (Có thể thiếu ImageMagick): {e}")

    # --- 4. CẤU HÌNH BỘ MÃ HÓA (AUTO-DETECT HARDWARE) ---
    # Kiểm tra máy có phải Mac i9/M1/M2 (hỗ trợ videotoolbox) không
    has_videotoolbox = check_videotoolbox()
    
    # Chọn codec phù hợp
    # h264_videotoolbox: Dành cho Mac (nhanh nhất cho i9 + AMD 5500M)
    # libx264: Dành cho Windows/Linux hoặc máy không có card đồ họa rời (chậm hơn)
    chosen_codec = "h264_videotoolbox" if has_videotoolbox else "libx264"
    
    print(f"--- Đang bắt đầu Export với Codec: {chosen_codec} ---")

    # --- 5. TIẾN HÀNH XUẤT FILE ---
    final_video = CompositeVideoClip(clips_to_composite, size=clip.size)
    
    write_params = {
        "filename": output_path,
        "codec": chosen_codec,
        "audio_codec": "aac",
        "threads": 16,             # Tận dụng 16 luồng của i9
        "bitrate": "5000k",        # Chất lượng HD tiêu chuẩn
        "preset": "ultrafast",     # Ưu tiên tốc độ xử lý hàng đầu
        "ffmpeg_params": ["-pix_fmt", "yuv420p"] # Tăng tính tương thích màu sắc cho GPU
    }

    # Nếu máy không có card Mac, bỏ preset vì libx264 dùng preset khác
    if not has_videotoolbox:
        write_params["preset"] = "medium" 

    try:
        final_video.write_videofile(**write_params)
    finally:
        # Giải phóng tài nguyên để máy i9 không bị nóng sau khi xong
        clip.close()
        final_video.close()
        print(f"--- Render hoàn tất! ---")