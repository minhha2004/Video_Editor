// src/components/editor/Panels/Tabs/TextTab.tsx
"use client";

import { useState } from 'react';
import { useVideoStore } from '../../../../store/useVideoStore';
import { aiService } from '../../../../services/aiService';

export const TextTab = () => {
  // Trích xuất các state và hàm cần thiết cho Text Tab độc bản từ Store gốc
  const store = useVideoStore() as any;
  const {
    audioSrc, 
    videoSrc, 
    showText, 
    textConfig, 
    subtitles, 
    setShowText, 
    setTextConfig, 
    setSubtitles,
    saveHistory
  } = store;

  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleAutoSubtitle = async () => {
    const { videoFile, audioFile } = useVideoStore.getState();
    const fileToProcess = audioFile || videoFile;
    if (!fileToProcess) return alert("Vui lòng upload file!");
    
    setIsTranscribing(true);
    try {
      saveHistory();
      const data = await aiService.transcribe(fileToProcess);
      if (data.subtitles) setSubtitles(data.subtitles);
    } catch (err) {
      alert("Lỗi STT!");
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
      {/* HEADER ĐỒNG BỘ: Chữ đứng thẳng, đổi màu text-zinc-400 khớp tab Asset */}
      <h2 className="text-[11px] font-black text-zinc-400 uppercase mb-6 tracking-[0.2em]">
        Text & Subtitles
      </h2>
      
      {/* Nút AI Auto Subtitle */}
      <button 
        onClick={handleAutoSubtitle} 
        disabled={(!audioSrc && !videoSrc) || isTranscribing} 
        className="w-full py-4 mb-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 text-white shadow-lg rounded-xl text-[11px] font-black uppercase tracking-[0.15em] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/10 disabled:opacity-50 disabled:bg-zinc-800 disabled:from-zinc-800 disabled:to-zinc-800"
      >
        {isTranscribing ? (
          <>
            <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
            <span>AI is listening...</span>
          </>
        ) : (
          "🪄 Auto AI Subtitle"
        )}
      </button>
      
      {/* Danh sách Subtitles kết quả từ AI */}
      {subtitles.length > 0 && (
        <div className="mb-6 p-3 bg-white/5 rounded-xl border border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
          <p className="text-[9px] font-black text-indigo-400 uppercase mb-3 tracking-widest italic">Data Found</p>
          {subtitles.map((s: any, i: number) => (
            <div key={i} className="mb-3 last:mb-0 border-b border-white/5 pb-2">
              <p className="text-[10px] text-zinc-200 leading-snug font-medium">{s.text || "Voice Segment"}</p>
              <p className="text-[8px] text-zinc-500 font-mono mt-1 uppercase">{s.start.toFixed(1)}s → {s.end.toFixed(1)}s</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Nút Standard: Thêm/Xóa text thủ công */}
      <button 
        onClick={() => {
          if (saveHistory) saveHistory();
          setShowText(!showText);
        }} 
        className={`w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all mb-6 active:scale-[0.98] ${
          showText 
            ? 'bg-rose-500/10 border border-rose-500/30 text-rose-500 hover:bg-rose-500/20' 
            : 'bg-indigo-600 text-white hover:bg-indigo-500'
        }`}
      >
        {showText ? "- Remove Layer" : "+ Add Heading"}
      </button>
      
      {/* Form tùy chỉnh Text gốc */}
      {showText && textConfig && (
        <div className="space-y-6 bg-white/5 p-5 rounded-2xl border border-white/5">
          <input 
            type="text" 
            value={textConfig.content} 
            onChange={(e) => setTextConfig({...textConfig, content: e.target.value})} 
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-500 transition-colors" 
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Color</span>
              <input 
                type="color" 
                value={textConfig.color} 
                onChange={(e) => setTextConfig({...textConfig, color: e.target.value})} 
                className="w-full h-11 bg-zinc-900 border border-white/5 rounded-xl cursor-pointer p-1" 
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Size (px)</span>
              <input 
                type="number" 
                value={textConfig.fontSize} 
                onChange={(e) => setTextConfig({...textConfig, fontSize: parseInt(e.target.value) || 10})} 
                className="w-full h-11 bg-zinc-900 border border-white/10 rounded-xl px-4 text-xs text-white outline-none focus:border-indigo-500 transition-colors" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};