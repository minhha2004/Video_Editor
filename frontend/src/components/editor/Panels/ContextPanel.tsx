"use client";
import { useState } from 'react';
import { useVideoStore } from '../../../store/useVideoStore';
import { aiService } from '../../../services/aiService';

export const ContextPanel = () => {
  const {
    activeTab, videoSrc, audioSrc, showText, textConfig, 
    audioConfig, setAudioConfig, 
    isVideoMuted, subtitles, setVideo, setAudio, setAudioDuration, 
    setIsVideoMuted, setShowText, setTextConfig, 
    setSubtitles, setTrimStart, setTrimEnd,
    stickers, setStickers,
    saveHistory, setActiveSegments
  } = useVideoStore();

  const [aiText, setAiText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMixing, setIsMixing] = useState(false);
  const [showSmartMenu, setShowSmartMenu] = useState(false);

  const handleSmartHighlight = async () => {
    const { videoFile } = useVideoStore.getState();
    if (!videoFile) return alert("Vui lòng upload video trước!");
    
    setIsAnalyzing(true);
    setShowSmartMenu(false);
    try {
      const data = await aiService.detectHighlight(videoFile);
      saveHistory(); 
      setActiveSegments([]); 
      setTrimStart(data.start);
      setTrimEnd(data.end);
      alert("✨ Đã tìm thấy đoạn Highlight tốt nhất!");
    } catch (error) {
      alert("Lỗi AI Highlight!");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAutoCutSilence = async () => {
    const { videoFile } = useVideoStore.getState();
    if (!videoFile) return alert("Vui lòng upload video trước!");
    
    setIsAnalyzing(true);
    setShowSmartMenu(false);
    try {
      const data = await aiService.autoCutSilence(videoFile);
      if (data.segments && data.segments.length > 0) {
        saveHistory(); 
        setActiveSegments(data.segments);
        alert(`🔇 Đã cắt thành công! Tìm thấy ${data.segments.length} đoạn có tiếng.`);
      }
    } catch (error) {
      alert("Lỗi khi phân tích khoảng lặng!");
    } finally {
      setIsAnalyzing(false);
    }
  };

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

  const handleAutoMix = async () => {
    if (subtitles.length === 0) return alert("Vui lòng tạo phụ đề tự động (STT) trước khi chèn sticker!");
    
    setIsMixing(true);
    try {
      saveHistory();
      const data = await aiService.autoMixStickers(subtitles);
      if (data && data.length > 0) {
        setStickers(data);
        alert(`🎨 Đã phân tích ngữ cảnh và chèn ${data.length} sticker thành công!`);
      } else {
        alert("Không tìm thấy từ khóa nào phù hợp với bộ Sticker hiện tại.");
      }
    } catch (error) {
      alert("Lỗi khi gọi API Auto Mix Sticker!");
      console.error(error);
    } finally {
      setIsMixing(false);
    }
  };

  const handleGenAIVoice = async () => {
    if (!aiText) return;
    setIsGenerating(true);
    try {
      const blob = await aiService.generateVoice(aiText);
      const file = new File([blob], "ai-voice.mp3", { type: "audio/mpeg" });
      const url = URL.createObjectURL(file);
      const tempAudio = new Audio(url);
      tempAudio.onloadedmetadata = () => {
        saveHistory();
        setAudioDuration(tempAudio.duration);
        setAudioConfig({ ...audioConfig, end: tempAudio.duration });
        setAudio(file, url);
        setAiText(""); 
      };
    } catch (err) {
      alert("Lỗi TTS!");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <nav className="w-80 bg-[#121214] border-r border-white/5 flex flex-col shrink-0 p-6 shadow-2xl overflow-y-auto custom-scrollbar">
      
      {/* MEDIA TAB */}
      {activeTab === 'media' && (
        <div className="animate-in fade-in slide-in-from-left-2 duration-300">
          <h2 className="text-[11px] font-black text-zinc-500 uppercase mb-6 tracking-[0.2em] italic">Media Library</h2>
          
          {/* Nút Standard */}
          <button 
            onClick={() => document.getElementById('vid-in')?.click()} 
            className="w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all mb-3 active:scale-[0.98] bg-indigo-600 text-white hover:bg-indigo-500"
          >
            + Upload Video
          </button>
          
          <div className="relative mb-6">
            {/* Nút AI */}
            <button 
              onClick={() => setShowSmartMenu(!showSmartMenu)}
              disabled={!videoSrc || isAnalyzing}
              className="w-full py-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 text-white shadow-lg rounded-xl text-[11px] font-black uppercase tracking-[0.15em] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/10 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>✨ Smart Cut Tool</span>
                  <span className={`text-[8px] transition-transform ${showSmartMenu ? 'rotate-180' : ''}`}>▼</span>
                </>
              )}
            </button>

            {showSmartMenu && (
              <div className="absolute top-full left-0 w-full mt-2 bg-[#1c1c1f] border border-white/10 rounded-xl overflow-hidden z-[100] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <button onClick={handleSmartHighlight} className="w-full px-4 py-3 text-[10px] font-bold text-zinc-300 hover:bg-white/5 text-left flex items-center gap-3 border-b border-white/5">
                  <span className="text-sm">🌟</span> AI Smart Highlight
                </button>
                <button onClick={handleAutoCutSilence} className="w-full px-4 py-3 text-[10px] font-bold text-zinc-300 hover:bg-white/5 text-left flex items-center gap-3">
                  <span className="text-sm">🔇</span> Auto Cut Silence
                </button>
              </div>
            )}
          </div>

          <input id="vid-in" type="file" className="hidden" accept="video/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) setVideo(file, URL.createObjectURL(file)); }} />
          
          {videoSrc && (
            <div className="space-y-6 bg-white/5 p-5 rounded-2xl border border-white/5 shadow-xl">
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Preview</label>
                <div className="aspect-video rounded-xl overflow-hidden bg-black border border-white/10 relative">
                  <video src={videoSrc} className="w-full h-full object-cover" />
                </div>
              </div>
              {/* Nút Standard (đổi màu theo state) */}
              <button 
                onClick={() => setIsVideoMuted(!isVideoMuted)} 
                className={`w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98] border ${
                  isVideoMuted 
                    ? 'text-rose-500 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20' 
                    : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                }`}
              >
                {isVideoMuted ? '🔇 Video Muted' : '🔊 Audio Active'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- ASSETS TAB --- */}
      {activeTab === 'assets' as any && (
        <div className="animate-in fade-in slide-in-from-left-2 duration-300">
          <h2 className="text-[11px] font-black text-zinc-500 uppercase mb-6 tracking-[0.2em] italic">Assets & Elements</h2>
          
          {/* Nút AI */}
          <button 
            onClick={handleAutoMix} 
            disabled={subtitles.length === 0 || isMixing} 
            className="w-full py-4 mb-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 text-white shadow-lg rounded-xl text-[11px] font-black uppercase tracking-[0.15em] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/10 disabled:opacity-50 disabled:bg-zinc-800 disabled:from-zinc-800 disabled:to-zinc-800"
          >
            {isMixing ? (
              <>
                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                <span>Analyzing context...</span>
              </>
            ) : (
              "🎨 Auto Insert Stickers"
            )}
          </button>

          {subtitles.length === 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-6">
              <p className="text-[10px] text-amber-500/80 text-center leading-relaxed font-medium">
                * Please generate AI Subtitles in the Text tab first so the AI can analyze your voice context.
              </p>
            </div>
          )}

          {stickers.length > 0 && (
            <div className="mt-8 animate-in fade-in duration-500">
              <p className="text-[9px] font-black text-amber-400 uppercase mb-3 tracking-widest italic border-b border-white/5 pb-2">
                Generated Elements ({stickers.length})
              </p>
              <div className="grid grid-cols-3 gap-3">
                {stickers.map((s) => (
                  <div key={s.id} className="bg-black/30 border border-white/5 rounded-xl aspect-square flex items-center justify-center p-3 hover:border-amber-500/30 transition-colors">
                    <img src={s.src} alt="sticker" className="max-w-full max-h-full object-contain drop-shadow-md" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TEXT TAB */}
      {activeTab === 'text' && (
        <div className="animate-in fade-in slide-in-from-left-2 duration-300">
          <h2 className="text-[11px] font-black text-zinc-500 uppercase mb-6 tracking-[0.2em] italic">Text & Subtitles</h2>
          
          {/* Nút AI */}
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
          
          {subtitles.length > 0 && (
            <div className="mb-6 p-3 bg-white/5 rounded-xl border border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
              <p className="text-[9px] font-black text-indigo-400 uppercase mb-3 tracking-widest italic">Data Found</p>
              {subtitles.map((s, i) => (
                <div key={i} className="mb-3 last:mb-0 border-b border-white/5 pb-2">
                  <p className="text-[10px] text-zinc-200 leading-snug font-medium">{s.text || "Voice Segment"}</p>
                  <p className="text-[8px] text-zinc-500 font-mono mt-1 uppercase">{s.start.toFixed(1)}s → {s.end.toFixed(1)}s</p>
                </div>
              ))}
            </div>
          )}
          
          {/* Nút Standard (đổi màu theo state) */}
          <button 
            onClick={() => setShowText(!showText)} 
            className={`w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all mb-6 active:scale-[0.98] ${
              showText 
                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-500 hover:bg-rose-500/20' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {showText ? "- Remove Layer" : "+ Add Heading"}
          </button>
          
          {showText && (
            <div className="space-y-6 bg-white/5 p-5 rounded-2xl border border-white/5">
              <input type="text" value={textConfig.content} onChange={(e) => setTextConfig({...textConfig, content: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input type="color" value={textConfig.color} onChange={(e) => setTextConfig({...textConfig, color: e.target.value})} className="w-full h-11 bg-zinc-900 rounded-xl cursor-pointer" />
                <input type="number" value={textConfig.fontSize} onChange={(e) => setTextConfig({...textConfig, fontSize: parseInt(e.target.value) || 10})} className="w-full h-11 bg-zinc-900 rounded-xl px-4 text-xs text-white outline-none" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* MUSIC TAB */}
      {activeTab === 'music' && (
        <div className="animate-in fade-in slide-in-from-left-2 duration-300">
          <h2 className="text-[11px] font-black text-zinc-500 uppercase mb-6 tracking-[0.2em] italic">AI Voiceover</h2>
          
          {/* Nút AI */}
          <button 
            onClick={handleGenAIVoice} 
            disabled={!aiText || isGenerating} 
            className="w-full py-4 mb-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 text-white shadow-lg rounded-xl text-[11px] font-black uppercase tracking-[0.15em] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/10 disabled:opacity-50 disabled:bg-zinc-800 disabled:from-zinc-800 disabled:to-zinc-800"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                <span>Generating...</span>
              </>
            ) : (
              "✨ Generate AI Voice"
            )}
          </button>
          
          <textarea value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder="Enter text..." className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white outline-none h-24 mb-4" />
          
          {/* Nút Standard (đổi màu theo state) */}
          <button 
            onClick={() => audioSrc ? setAudio(null, null) : document.getElementById('aud-in')?.click()} 
            className={`w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all mb-3 active:scale-[0.98] ${
              audioSrc 
                ? 'border border-rose-500/30 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {audioSrc ? "- Remove Audio" : "+ Upload Audio"}
          </button>
          
          <input id="aud-in" type="file" className="hidden" accept="audio/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const url = URL.createObjectURL(file);
              const t = new Audio(url);
              t.onloadedmetadata = () => { 
                setAudioDuration(t.duration); 
                setAudioConfig({ ...audioConfig, end: t.duration });
                setAudio(file, url); 
              };
            }
          }} />
        </div>
      )}
    </nav>
  );
};