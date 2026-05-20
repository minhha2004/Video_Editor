import uuid
import re
import nltk
from nltk.stem import WordNetLemmatizer
import ssl 

# --- BỎ QUA KIỂM TRA SSL TRÊN MACOS ---
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

# Tải data cho NLTK
try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet', quiet=True)
    nltk.download('omw-1.4', quiet=True)

lemmatizer = WordNetLemmatizer()

# Bộ từ khóa Tiếng Anh
STICKER_KEYWORD_MAP = {
    "money.png": ["money", "finance", "salary", "income", "spend", "expensive", "cheap", "cash", "dollar", "pay"],
    "house.png": ["house", "home", "apartment", "room", "rent", "real estate", "property", "mortgage"],
    "job.png": ["job", "work", "career", "company", "boss", "employee", "project", "office", "business"],
    "clothes.png": ["clothes", "shirt", "pants", "wear", "fashion", "outfit", "dress", "jacket"],
    "hair.png": ["hair", "hairstyle", "haircut", "shampoo", "barber", "salon"],
    "shoes.png": ["shoes", "sneakers", "boots", "walk", "footwear", "heels"],
    "taste.png": ["taste", "delicious", "food", "eat", "drink", "sweet", "salty", "sour", "spicy", "yummy", "flavor"]
}

def generate_auto_stickers(transcript_words):
    suggested_stickers = []
    
    # THAY ĐỔI 1: Đặt thời lượng mỗi sticker là 1.0 giây
    DEFAULT_DURATION = 1.0 
    
    # Biến này để xếp hàng các sticker, tránh việc 2 sticker hiện đè lên nhau 
    # cùng lúc nếu trong 1 câu người ta nói quá nhiều từ khóa.
    current_time_cursor = 0.0

    for item in transcript_words:
        # THAY ĐỔI 2: Xử lý dữ liệu STT đang là một CÂU chứ không phải 1 từ
        sentence = str(item.get('word', '')).lower()
        segment_start = float(item.get('start', 0))
        
        # Tách câu thành các từ rời rạc bằng Regex
        words = re.findall(r'[a-z]+', sentence)
        
        for w in words:
            # NLP: Đưa từ về dạng nguyên thể (houses -> house, spent -> spend)
            lemma_n = lemmatizer.lemmatize(w, pos='n') 
            lemma_v = lemmatizer.lemmatize(w, pos='v') 
            
            matched_sticker = None
            
            for sticker_file, keywords in STICKER_KEYWORD_MAP.items():
                if w in keywords or lemma_n in keywords or lemma_v in keywords:
                    matched_sticker = sticker_file
                    break # Dừng tìm keyword khi đã trúng
                    
            if matched_sticker:
                # Tính toán thời điểm hiện sticker. 
                # Nếu câu nói bắt đầu ở giây thứ 5, mà cursor đang ở giây thứ 6 (do sticker trước đó chưa chạy xong), 
                # thì dời sticker này xuống giây thứ 6 để nối tiếp.
                sticker_start = max(segment_start, current_time_cursor)
                
                suggested_stickers.append({
                    "id": str(uuid.uuid4()), 
                    "type": "sticker",
                    "src": f"/stickers/{matched_sticker}", 
                    "startTime": sticker_start,
                    "endTime": sticker_start + DEFAULT_DURATION,
                    "layer": 2, 
                    "position": {"x": 50, "y": 50}, 
                    "scale": 1.0
                })
                
                # Cập nhật cursor để sticker tiếp theo (nếu có) bị đẩy lùi lại 1.1s (cách nhau 0.1s cho mượt)
                current_time_cursor = sticker_start + DEFAULT_DURATION + 0.1
            
    return suggested_stickers