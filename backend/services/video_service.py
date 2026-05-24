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
    
    # 1. TẢI VIDEO
    # Sử dụng .subclip (cú pháp v1.0.3)
    clip = VideoFileClip(video_path).subclip(config['trimStart'], config['trimEnd'])
    
    # Tự động hạ phân giải nếu video quá lớn để tránh nghẽn RAM
    if clip.h > 1080:
        print("Đang hạ độ phân giải xuống 1080p để tăng tốc render...")
        clip = clip.resize(height=1080)

    # 2. ÂM THANH
    if audio_path and os.path.exists(audio_path):
        new_audio = AudioFileClip(audio_path)
        audio_duration = config['audio']['end'] - config['audio']['start']
        new_audio = new_audio.set_duration(audio_duration)
        clip = clip.set_audio(new_audio.set_start(config['audio']['start']))
    elif config.get('isVideoMuted'):
        clip = clip.set_audio(None)

    # 3. CHÈN TEXT
    clips_to_composite = [clip]
    if config.get('text'):
        txt_cfg = config['text']
        try:
            txt_clip = TextClip(
                txt_cfg['content'],
                fontsize=txt_cfg.get('fontSize', 30),
                color=txt_cfg.get('color', 'white'),
                font='Arial-Bold',
                method='label' 
            ).set_duration(txt_cfg['end'] - txt_cfg['start'])\
             .set_start(txt_cfg['start'])\
             .set_position((f"{txt_cfg['x']}%", f"{txt_cfg['y']}%"))
            
            clips_to_composite.append(txt_clip)
        except Exception as e:
            print(f"Lưu ý: Không thể chèn chữ: {e}")

    # 4. EXPORT CONFIG
    has_videotoolbox = check_videotoolbox()
    chosen_codec = "h264_videotoolbox" if has_videotoolbox else "libx264"
    
    final_video = CompositeVideoClip(clips_to_composite, size=clip.size)
    
    write_params = {
        "filename": output_path,
        "codec": chosen_codec,
        "audio_codec": "aac",
        "threads": 8, # Giảm xuống 8 để tránh treo CPU i9
        "preset": "ultrafast" if has_videotoolbox else "medium",
        "ffmpeg_params": ["-pix_fmt", "yuv420p"]
    }

    try:
        print(f"--- Đang bắt đầu Export với Codec: {chosen_codec} ---")
        final_video.write_videofile(**write_params)
    except Exception as e:
        print(f"Lỗi trong quá trình ghi file: {e}")
        raise e
    finally:
        # CỰC KỲ QUAN TRỌNG: Giải phóng tài nguyên để render lần 2 không lỗi
        clip.close()
        final_video.close()
        # Ép buộc thu gom rác bộ nhớ
        gc.collect()
        print("--- Render hoàn tất và giải phóng bộ nhớ! ---")