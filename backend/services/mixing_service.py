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

TOPIC_STICKER_MAP = {
    "finance": {
        "stickers": ["money.png"],
        "keywords": [
            "money", "finance", "salary", "income", "spend", "expensive", "cheap",
            "cash", "dollar", "pay", "price", "cost", "budget", "buy", "sell",
            "profit", "bill", "debt", "saving", "investment", "rich", "poor"
        ],
    },
    "housing": {
        "stickers": ["house.png"],
        "keywords": [
            "house", "home", "apartment", "room", "rent", "property", "mortgage",
            "real", "estate", "landlord", "kitchen", "bedroom", "living", "move",
            "address", "neighborhood"
        ],
    },
    "work": {
        "stickers": ["job.png"],
        "keywords": [
            "job", "work", "career", "company", "boss", "employee", "project",
            "office", "business", "meeting", "client", "deadline", "task",
            "interview", "resume", "hire", "team", "startup"
        ],
    },
    "fashion": {
        "stickers": ["clothes.png", "shoes.png", "hair.png"],
        "keywords": [
            "clothes", "shirt", "pants", "wear", "fashion", "outfit", "dress",
            "jacket", "style", "look", "shopping", "brand", "shoes", "sneakers",
            "boots", "heels", "hair", "hairstyle", "haircut", "barber", "salon"
        ],
    },
    "food": {
        "stickers": ["taste.png"],
        "keywords": [
            "taste", "delicious", "food", "eat", "drink", "sweet", "salty", "sour",
            "spicy", "yummy", "flavor", "cook", "restaurant", "meal", "breakfast",
            "lunch", "dinner", "coffee", "tea", "snack"
        ],
    },
}

DEFAULT_DURATION = 1.0
MIN_GAP_SECONDS = 1.5
MAX_STICKERS = 10


def _normalize_words(text):
    raw_words = re.findall(r"[a-z]+", str(text).lower())
    normalized = []
    for word in raw_words:
        normalized.append(word)
        if HAS_WORDNET:
            normalized.append(lemmatizer.lemmatize(word, pos="n"))
            normalized.append(lemmatizer.lemmatize(word, pos="v"))
    return normalized


def _score_topics(text):
    words = _normalize_words(text)
    if not words:
        return []

    scored_topics = []
    word_set = set(words)
    for topic, config in TOPIC_STICKER_MAP.items():
        score = 0
        for keyword in config["keywords"]:
            keyword_words = keyword.split()
            if len(keyword_words) > 1:
                if keyword in str(text).lower():
                    score += 3
            elif keyword in word_set:
                score += 2

        if score > 0:
            scored_topics.append((topic, score))

    scored_topics.sort(key=lambda item: item[1], reverse=True)
    return scored_topics


def _pick_sticker_for_topic(topic, usage_count):
    stickers = TOPIC_STICKER_MAP[topic]["stickers"]
    return min(stickers, key=lambda sticker: usage_count.get(sticker, 0))


def generate_auto_stickers(transcript_segments):
    suggested_stickers = []
    usage_count = {}
    last_insert_time = -999.0

    for item in transcript_segments:
        sentence = str(item.get("text", "") or item.get("word", "")).strip()
        if not sentence:
            continue

        segment_start = float(item.get("start", 0))
        segment_end = float(item.get("end", segment_start))
        if segment_end <= segment_start:
            continue

        scored_topics = _score_topics(sentence)
        if not scored_topics:
            continue

        if segment_start - last_insert_time < MIN_GAP_SECONDS:
            continue

        topic = scored_topics[0][0]
        sticker_file = _pick_sticker_for_topic(topic, usage_count)
        usage_count[sticker_file] = usage_count.get(sticker_file, 0) + 1

        segment_duration = segment_end - segment_start
        sticker_start = segment_start + min(segment_duration * 0.35, max(0.0, segment_duration - DEFAULT_DURATION))
        sticker_end = min(segment_end, sticker_start + DEFAULT_DURATION)
        if sticker_end <= sticker_start:
            sticker_end = sticker_start + DEFAULT_DURATION

        suggested_stickers.append({
            "id": str(uuid.uuid4()),
            "type": "sticker",
            "src": f"/stickers/{sticker_file}",
            "topic": topic,
            "startTime": round(sticker_start, 2),
            "endTime": round(sticker_end, 2),
            "layer": 50,
            "position": {"x": 50, "y": 50},
            "scale": 0.8
        })
        last_insert_time = sticker_start

        if len(suggested_stickers) >= MAX_STICKERS:
            break

    return suggested_stickers
