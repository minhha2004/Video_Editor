import edge_tts
import os

# Danh sách giọng Anh-Mỹ chuyên nghiệp:
# Nữ: en-US-AvaNeural, en-US-EmmaNeural
# Nam: en-US-GuyNeural, en-US-ChristopherNeural
VOICE = "en-US-AvaNeural"

async def generate_voiceover(text: str, output_path: str):
    """
    Tạo file MP3 giọng nói AI từ văn bản tiếng Anh.
    """
    try:
        # Khởi tạo quá trình giao tiếp với server Microsoft Edge
        communicate = edge_tts.Communicate(text, VOICE)
        
        # Lưu file âm thanh trực tiếp vào đường dẫn output_path
        await communicate.save(output_path)
        
        return True
    except Exception as e:
        print(f"Lỗi TTS Service: {str(e)}")
        return False