// src/services/aiService.ts
const API_BASE = "http://localhost:8000/api";

export interface WordItem {
  word: string;
  start: number;
  end: number;
}

export const aiService = {
  /**
   * Tạo giọng nói AI (Text-to-Speech)
   */
  generateVoice: async (text: string) => {
    const response = await fetch(`${API_BASE}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error('TTS API Error');
    return await response.blob();
  },

  /**
   * Tạo phụ đề tự động (Speech-to-Text)
   */
  transcribe: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/stt`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('STT API Error');
    
    const data = await response.json();

    // --- BẢN VÁ LỖI ĐỒNG BỘ ÂM THANH (SYNC FIX) ---
    // Vì AI thường nhận diện hơi sớm, ta cộng thêm một khoảng trễ (giây).
    // Bạn có thể tăng giảm số 0.3 này (ví dụ 0.2, 0.4) cho đến khi khớp mồm nhất.
    const SYNC_OFFSET = 0.3; 
    
    if (data.subtitles && Array.isArray(data.subtitles)) {
      data.subtitles = data.subtitles.map((sub: any) => ({
        ...sub,
        start: Number(sub.start) + SYNC_OFFSET,
        end: Number(sub.end) + SYNC_OFFSET
      }));
    }
    // ----------------------------------------------

    return data;
  },

  /**
   * AI tự động phát hiện đoạn Highlight hay nhất
   */
  detectHighlight: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/ai/detect-highlight`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Highlight API Error');
    return await response.json();
  },

  /**
   * AI tự động cắt bỏ khoảng lặng (Silence Removal)
   */
  autoCutSilence: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/ai/cut-silence`, {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) throw new Error('Cut Silence API Error');
    return await response.json(); // Trả về { segments: [{start, end}, ...] }
  },

  /**
   * AI tự động phân tích ngữ cảnh và gợi ý chèn Sticker (Auto Mixing)
   */
  autoMixStickers: async (transcript: any[]) => {
    // Lấy dữ liệu thời gian chính xác của TỪNG CHỮ thay vì cả câu
    const payload: any[] = [];
    
    transcript.forEach(segment => {
      if (segment.words && segment.words.length > 0) {
        // Lấy đúng mốc thời gian từ đó được phát âm
        segment.words.forEach((w: any) => {
          payload.push({ word: w.word, start: w.start, end: w.end });
        });
      } else {
        payload.push({ word: segment.text, start: segment.start, end: segment.end });
      }
    });

    const response = await fetch(`${API_BASE}/ai/auto-mix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorDetail = await response.text();
      console.error("Backend Error Detail:", errorDetail);
      throw new Error('Auto Mix API Error');
    }
    
    const data = await response.json();
    if (data.success) {
      return data.stickers;
    }
    return [];
  },


  /**
   * Gửi toàn bộ cấu hình để Render video cuối cùng
   */
  renderVideo: async (formData: FormData) => {
    const response = await fetch(`${API_BASE}/render`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Render API Error');
    return await response.blob();
  }
};