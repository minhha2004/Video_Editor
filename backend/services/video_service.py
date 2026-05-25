from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip, AudioFileClip, ImageClip
import json
import os
import subprocess
import gc

def check_videotoolbox():
    """Kiểm tra xem hệ thống có hỗ trợ tăng tốc phần cứng Mac (VideoToolbox) không"""
    try:
        cmd = "ffmpeg -encoders"
        output = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT).decode()
        return "h264_videotoolbox" in output
    except:
        return False

def process_video_export(video_path: str, audio_path: str, config_json: str, output_path: str):
    config = json.loads(config_json)
    
    # 1. TẢI VIDEO GỐC
    # Sử dụng .subclip (cú pháp v1.0.3)
    clip = VideoFileClip(video_path).subclip(config['trimStart'], config['trimEnd'])
    
    # Tự động hạ phân giải nếu video quá lớn để tránh nghẽn RAM
    if clip.h > 1080:
        print("Đang hạ độ phân giải xuống 1080p để tăng tốc render...")
        clip = clip.resize(height=1080)

    # Ép kích thước khung hình luôn luôn là số chẵn chống lỗi Codec H.264
    new_w = (clip.w // 2) * 2
    new_h = (clip.h // 2) * 2
    if new_w != clip.w or new_h != clip.h:
        print(f"[Tối ưu] Ép kích thước chẵn FFmpeg: {clip.w}x{clip.h} -> {new_w}x{new_h}")
        clip = clip.resize(newsize=(new_w, new_h))

    # 2. XỬ LÝ ÂM THANH - BỔ SUNG BỘ ĐÁNH CHẶN TRÀN THỜI LƯỢNG (AUDIO CLAMP GUARD)
    if audio_path and os.path.exists(audio_path):
        try:
            new_audio = AudioFileClip(audio_path)
            audio_cfg = config.get('audio', {})
            
            start_t = float(audio_cfg.get('start', 0))
            end_t = float(audio_cfg.get('end', clip.duration))
            audio_duration = end_t - start_t
            
            # 🛠️ ĐÒN QUYẾT ĐỊNH: Nếu Frontend tính toán sai mốc end vượt quá độ dài thực tế của file mp3
            if audio_duration > new_audio.duration:
                print(f"[Tối ưu] Sửa tràn thời lượng âm thanh: {audio_duration}s -> Thu về tối đa {new_audio.duration}s")
                audio_duration = new_audio.duration
            
            if audio_duration <= 0:
                audio_duration = min(clip.duration, new_audio.duration)
                
            # Đóng gói cắt gọt audio chuẩn chỉ theo dữ liệu an toàn
            new_audio = new_audio.subclip(0, audio_duration).set_duration(audio_duration)
            clip = clip.set_audio(new_audio.set_start(start_t))
        except Exception as audio_err:
            print(f"Lưu ý: Không thể chèn âm thanh bổ sung, bỏ qua: {audio_err}")
    elif config.get('isVideoMuted'):
        clip = clip.set_audio(None)

    # 3. CHÈN TEXT CLIP - KHẶC PHỤC TRIỆT ĐỂ LỖI MA TRẬN ĐỒ HỌA
    clips_to_composite = [clip]
    if config.get('text'):
        txt_cfg = config['text']
        try:
            raw_x = txt_cfg.get('x', 50)
            raw_y = txt_cfg.get('y', 50)
            
            try: raw_x = float(raw_x)
            except: raw_x = 50.0
            try: raw_y = float(raw_y)
            except: raw_y = 50.0

            if raw_x <= 1.0: raw_x = raw_x * 100
            if raw_y <= 1.0: raw_y = raw_y * 100

            final_pos_x = "center" if int(raw_x) == 50 else float(raw_x / 100)
            final_pos_y = "center" if int(raw_y) == 50 else float(raw_y / 100)

            txt_clip = TextClip(
                txt_cfg['content'],
                fontsize=int(txt_cfg.get('fontSize', 30)),
                color=txt_cfg.get('color', 'white'),
                font='Arial-Bold',
                method='label' 
            ).set_duration(txt_cfg['end'] - txt_cfg['start'])\
             .set_start(txt_cfg['start'])\
             .set_position((final_pos_x, final_pos_y))
            
            clips_to_composite.append(txt_clip)
        except Exception as e:
            print(f"Lưu ý: Không thể chèn chữ: {e}")

    # 4. CHÈN STICKER (BẢN TỰ ĐỘNG LÀM SẠCH ĐƯỜNG DẪN)
    raw_stickers = config.get('stickers', [])
    for st_cfg in raw_stickers:
        try:
            raw_path = st_cfg.get('path') or st_cfg.get('url') or st_cfg.get('src')
            if not raw_path: continue
            
            file_name = os.path.basename(raw_path.split('?')[0])
            
            # --- ĐOẠN VÁ LỖI TRÙNG THƯ MỤC 'backend/backend' ---
            # Lấy thư mục gốc hiện tại của script
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # Trỏ về thư mục 'backend'
            st_path = os.path.join(base_dir, "static", "stickers", file_name)
            
            # Kiểm tra tệp
            if not os.path.exists(st_path) or os.path.isdir(st_path):
                # Nếu vẫn không thấy, thử tìm ở thư mục uploads/ (nơi lưu sticker custom)
                alt_path = os.path.join(os.getcwd(), "backend", "uploads", file_name)
                if os.path.exists(alt_path):
                    st_path = alt_path
                else:
                    print(f"[!] Lỗi: Không thể tìm thấy file ảnh tại: {st_path}")
                    continue 
                
            print(f"[+] Đang load sticker từ file: {st_path}")
            st_clip = ImageClip(st_path)
            
            # ... (Phần logic set_start, resize, set_position giữ nguyên như cũ)
            st_start = st_cfg.get('start', 0)
            st_end = st_cfg.get('end', clip.duration)
            st_clip = st_clip.set_start(st_start).set_duration(st_end - st_start)
            
            if st_cfg.get('scale'):
                st_clip = st_clip.resize(float(st_cfg['scale']))
                
            st_x = float(st_cfg.get('position', {}).get('x', 50))
            st_y = float(st_cfg.get('position', {}).get('y', 50))
            
            final_st_x = "center" if int(st_x) == 50 else float(st_x / 100)
            final_st_y = "center" if int(st_y) == 50 else float(st_y / 100)
            st_clip = st_clip.set_position((final_st_x, final_st_y))
            
            clips_to_composite.append(st_clip)
            
        except Exception as sticker_err:
            print(f"[!] Lỗi khi chèn sticker: {sticker_err}")

    # 5. CẤU HÌNH KẾT XUẤT ĐỒ HỌA SIÊU MƯỢT
    has_videotoolbox = check_videotoolbox()
    chosen_codec = "h264_videotoolbox" if has_videotoolbox else "libx264"
    
    final_video = CompositeVideoClip(clips_to_composite, size=clip.size)
    
    write_params = {
        "filename": output_path,
        "codec": chosen_codec,
        "audio_codec": "aac",
        "threads": 8, 
        "preset": "ultrafast" if has_videotoolbox else "medium",
        "logger": None,       # Khóa chặt log rác chặn lỗi phần trăm
        "verbose": False,
        "ffmpeg_params": ["-pix_fmt", "yuv420p"]
    }

    try:
        print(f"--- Đang bắt đầu Export với Cấu hình tối ưu & Codec: {chosen_codec} ---")
        final_video.write_videofile(**write_params)
    except Exception as e:
        print(f"Lỗi trong quá trình ghi file: {e}")
        raise e
    finally:
        clip.close()
        final_video.close()
        for c in clips_to_composite:
            try: c.close()
            except: pass
        gc.collect()
        print("--- Render hoàn tất và giải phóng bộ nhớ! ---")