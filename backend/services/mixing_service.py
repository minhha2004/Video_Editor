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
    DEFAULT_DURATION = 1.0 # Ép cứng thời lượng hiển thị nhấp nháy đúng 1.0 giây
    
    for item in transcript_words:
        # Hỗ trợ linh hoạt cả key 'word' hoặc 'text' truyền từ Frontend
        sentence = str(item.get('word', '') or item.get('text', '')).lower()
        segment_start = float(item.get('start', 0))
        segment_end = float(item.get('end', 0))
        segment_duration = segment_end - segment_start
        
        # Tách câu thành mảng các từ rời rạc bằng Regex
        words = re.findall(r'[a-z]+', sentence)
        total_words = len(words)
        
        if total_words == 0:
            continue
            
        # Duyệt qua từng từ kèm theo vị trí của nó trong câu (Index) để phân rã thời gian
        for idx, w in enumerate(words):
            # NLP: Đưa từ về dạng nguyên thể (houses -> house, spent -> spend)
            lemma_n = lemmatizer.lemmatize(w, pos='n') 
            lemma_v = lemmatizer.lemmatize(w, pos='v') 
            
            matched_sticker = None
            
            for sticker_file, keywords in STICKER_KEYWORD_MAP.items():
                if w in keywords or lemma_n in keywords or lemma_v in keywords:
                    matched_sticker = sticker_file
                    break # Dừng tìm kiếm khi đã khớp từ khóa
                    
            if matched_sticker:
                # THUẬT TOÁN ĐỊNH VỊ THỜI GIAN THỰC CỦA TỪ TRONG CÂU ĐOẠN PHỤ ĐỀ:
                word_progress = idx / total_words
                sticker_start = segment_start + (segment_duration * word_progress)
                
                # Đảm bảo điểm kết thúc của Sticker không vượt quá giới hạn của block phụ đề đó
                if sticker_start + DEFAULT_DURATION > segment_end:
                    sticker_start = max(segment_start, segment_end - DEFAULT_DURATION)
                
                suggested_stickers.append({
                    "id": str(uuid.uuid4()), 
                    "type": "sticker",
                    # SỬA ĐỒNG BỘ: Gọi trực tiếp tới thư mục public/stickers/ của Frontend Next.js
                    "src": f"/stickers/{matched_sticker}", 
                    "startTime": round(sticker_start, 2),
                    "endTime": round(sticker_start + DEFAULT_DURATION, 2),
                    "layer": 50, # Đẩy lên layer 50 nằm trên cùng khớp với thiết kế chung
                    "position": {"x": 50, "y": 50}, 
                    "scale": 0.8 # Tỉ lệ zoom 0.8 vừa vặn khung hình
                })
            
    return suggested_stickers