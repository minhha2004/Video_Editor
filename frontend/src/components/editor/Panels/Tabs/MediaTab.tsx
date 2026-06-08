import { useState } from 'react';
import { useVideoStore } from '../../../../store/useVideoStore';
import { aiService } from '../../../../services/aiService';

export const MediaTab = () => {
  // Chỉ lấy những state và action thực sự cần thiết cho Media Tab
  const {
    videoSrc,
    isVideoMuted,
    setVideo,
    setIsVideoMuted,
    setTrimStart,
    setTrimEnd,
    saveHistory,
    setActiveSegments
  } = useVideoStore();

  // Đưa state cục bộ của Media Tab về đúng file của nó
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSmartMenu, setShowSmartMenu] = useState(false);
  const [showHighlightDurationInput, setShowHighlightDurationInput] = useState(false);
  const [highlightDuration, setHighlightDuration] = useState("15");

  const handleSmartHighlight = async (durationSeconds?: number) => {
    const { videoFile } = useVideoStore.getState();
    if (!videoFile) return alert("Vui lòng upload video trước!");
    
    setIsAnalyzing(true);
    setShowSmartMenu(false);
    setShowHighlightDurationInput(false);
    try {
      const data = await aiService.detectHighlight(videoFile, durationSeconds);
      saveHistory(); 
      setActiveSegments([]); 
      setTrimStart(data.start);
      setTrimEnd(data.end);
      alert("✨ Đã tìm thấy đoạn Highlight tốt nhất!");
    } catch {
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
    } catch {
      alert("Lỗi khi phân tích khoảng lặng!");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
          Media Library and AI Cut
        </h3>
      </div>
  
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
            <div className="relative border-b border-white/5">
              <button 
                onClick={() => setShowHighlightDurationInput(true)} 
                className="w-full px-4 py-3 text-[10px] font-bold text-zinc-300 hover:bg-white/5 text-left flex items-center gap-3"
              >
                <span className="text-sm">🌟</span> AI Smart Highlight
              </button>

              {showHighlightDurationInput && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-[#111114] border border-indigo-500/30 rounded-lg px-2 py-1 shadow-xl">
                  <input
                    autoFocus
                    type="number"
                    min="1"
                    step="1"
                    value={highlightDuration}
                    onChange={(e) => setHighlightDuration(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const seconds = Number(highlightDuration);
                        if (!Number.isFinite(seconds) || seconds <= 0) {
                          alert("Vui lòng nhập thời lượng hợp lệ!");
                          return;
                        }
                        handleSmartHighlight(seconds);
                      }
                      if (e.key === 'Escape') {
                        setShowHighlightDurationInput(false);
                      }
                    }}
                    className="w-12 bg-transparent text-[10px] font-mono font-bold text-indigo-300 outline-none text-right"
                  />
                  <span className="text-[9px] font-black text-zinc-500 uppercase">sec</span>
                </div>
              )}
            </div>
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
  );
};
