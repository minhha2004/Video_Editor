from pydub import AudioSegment, silence
import os

def detect_non_silent_segments(video_path, min_silence_len=500, silence_thresh=-40, keep_silence=200):
    """
    video_path: Đường dẫn file video
    min_silence_len: Độ dài tối thiểu của khoảng lặng để được coi là im lặng (ms)
    silence_thresh: Ngưỡng âm thanh (dBFS), dưới mức này là im lặng
    keep_silence: Giữ lại một chút khoảng lặng ở đầu/cuối clip để nghe tự nhiên hơn (ms)
    """
    # 1. Trích xuất âm thanh từ video
    # Pydub sẽ tự dùng ffmpeg để đọc audio từ mp4
    audio = AudioSegment.from_file(video_path)
    
    # 2. Tìm các đoạn có tiếng nói (trả về list các tuple [start, end] tính bằng ms)
    nonsilent_ranges = silence.detect_nonsilent(
        audio, 
        min_silence_len=min_silence_len, 
        silence_thresh=silence_thresh
    )
    
    # 3. Chuyển đổi sang giây và định dạng cho Frontend
    processed_segments = []
    for start, end in nonsilent_ranges:
        # Thêm một chút buffer để không bị cắt cụt chữ
        s = max(0, start - keep_silence) / 1000.0
        e = min(len(audio), end + keep_silence) / 1000.0
        processed_segments.append({
            "start": round(s, 2),
            "end": round(e, 2)
        })
        
    return processed_segments