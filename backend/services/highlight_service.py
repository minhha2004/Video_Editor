import os
import numpy as np
from pydub import AudioSegment
import cv2
import json

def get_highlight_segment(video_path, target_duration=None):
    """
    Hệ thống AI Highlight Chuyên nghiệp:
    - Không in lỗi rác ra Terminal.
    - Tự động tính độ dài Highlight theo tỷ lệ video.
    """
    if not os.path.exists(video_path):
        return {"start": 0, "end": 10}

    try:
        # 1. PHÂN TÍCH ÂM THANH & THỜI LƯỢNG (Dùng Pydub)
        audio = AudioSegment.from_file(video_path)
        video_duration = float(len(audio) / 1000.0)
        
        # Nếu người dùng chọn độ dài, dùng độ dài đó. Nếu không, giữ logic tự động cũ.
        if target_duration is not None:
            duration_limit = max(1.0, min(float(target_duration), video_duration))
        else:
            duration_limit = max(5, min(25, video_duration * 0.15))
        
        loudness_data = []
        for i in range(0, len(audio), 500):
            chunk = audio[i:i + 500]
            loudness_data.append(float(chunk.rms) if chunk.rms else 0.0)

        # 2. PHÂN TÍCH HÌNH ẢNH (Dùng OpenCV để tránh lỗi Fatal của SceneDetect)
        # Cách này chạy cực kỳ ổn định trên Mac i9
        scene_points = []
        cap = cv2.VideoCapture(video_path)
        last_frame = None
        frame_idx = 0
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        
        # Chỉ quét cách quãng để tăng tốc độ cho i9
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            if frame_idx % int(fps) == 0: # Quét mỗi giây 1 lần
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                if last_frame is not None:
                    # Tính độ khác biệt giữa 2 khung hình
                    diff = cv2.absdiff(gray, last_frame)
                    score = np.mean(diff)
                    if score > 25: # Ngưỡng thay đổi cảnh
                        scene_points.append(frame_idx / fps)
                last_frame = gray
            frame_idx += 1
        cap.release()

        # 3. TÍNH TOÁN ĐIỂM CAO TRÀO
        best_score = -1.0
        best_start = 0.0
        
        # Quét Sliding Window
        search_range = np.arange(0.0, max(0, video_duration - duration_limit), 1.0)
        for start_t in search_range:
            end_t = start_t + duration_limit
            score = 0.0
            
            # Điểm Visual (Mật độ chuyển cảnh)
            scenes_in_window = [t for t in scene_points if start_t <= t <= end_t]
            score += float(len(scenes_in_window) * 40.0)

            # Điểm Audio (Độ lớn âm thanh)
            start_idx = int(start_t * 2)
            end_idx = int(end_t * 2)
            window_loudness = loudness_data[start_idx:end_idx]
            if window_loudness:
                score += float(np.mean(window_loudness) / 5.0)

            if score > best_score:
                best_score = score
                best_start = start_t

        # Chỉ in duy nhất kết quả cuối cùng cho sạch Terminal
        print(f"✨ AI Smart Cut: Found {round(duration_limit, 1)}s highlight at {round(best_start, 1)}s")

        return {
            "start": round(float(best_start), 2),
            "end": round(float(best_start + duration_limit), 2),
            "duration": round(duration_limit, 2)
        }

    except Exception:
        # Nếu có lỗi, trả về 10s đầu một cách im lặng
        return {"start": 0.0, "end": 10.0, "duration": 10.0}
