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

try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    HAS_WORDNET = False
else:
    HAS_WORDNET = True

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

def _lemmatize_word(word):
    if not HAS_WORDNET:
        return word, word
    return lemmatizer.lemmatize(word, pos='n'), lemmatizer.lemmatize(word, pos='v')

def generate_auto_stickers(transcript_words):
    suggested_stickers = []
    DEFAULT_DURATION = 1.0
    
    for item in transcript_words:
        sentence = str(item.get('word', '') or item.get('text', '')).lower()
        segment_start = float(item.get('start', 0))
        segment_end = float(item.get('end', 0))
        segment_duration = segment_end - segment_start
        
        words = re.findall(r'[a-z]+', sentence)
        total_words = len(words)
        
        if total_words == 0:
            continue
            
        for idx, w in enumerate(words):
            lemma_n, lemma_v = _lemmatize_word(w)
            matched_sticker = None
            
            for sticker_file, keywords in STICKER_KEYWORD_MAP.items():
                if w in keywords or lemma_n in keywords or lemma_v in keywords:
                    matched_sticker = sticker_file
                    break
                    
            if matched_sticker:
                word_progress = idx / total_words
                sticker_start = segment_start + (segment_duration * word_progress)
                
                if sticker_start + DEFAULT_DURATION > segment_end:
                    sticker_start = max(segment_start, segment_end - DEFAULT_DURATION)
                
                suggested_stickers.append({
                    "id": str(uuid.uuid4()), 
                    "type": "sticker",
                    "src": f"/stickers/{matched_sticker}", 
                    "word": w,
                    "startTime": round(sticker_start, 2),
                    "endTime": round(sticker_start + DEFAULT_DURATION, 2),
                    "layer": 50,
                    "position": {"x": 50, "y": 50}, 
                    "scale": 0.8
                })
            
    return suggested_stickers
