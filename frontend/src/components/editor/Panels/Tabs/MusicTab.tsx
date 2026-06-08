import { useState } from 'react';
import { useVideoStore } from '../../../../store/useVideoStore';
import { aiService } from '../../../../services/aiService';

export const MusicTab = () => {
  const {
    audioSrc,
    audioFile,
    audioConfig,
    setAudioConfig,
    setAudio,
    setAudioDuration,
    saveHistory
  } = useVideoStore();

  const [aiText, setAiText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const hasTtsAudio = audioSrc && audioFile?.name === "ai-voice.mp3";
  const hasUploadedAudio = audioSrc && !hasTtsAudio;

  const clearAudio = () => {
    if (!audioSrc) return;
    saveHistory();
    setAudio(null, null);
    setAudioDuration(0);
    setAudioConfig({ ...audioConfig, start: 0, end: 0 });
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
    } catch {
      alert("Lỗi TTS!");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
          Music and AI Voiceover
        </h3>
      </div>
      
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
      
      <textarea 
        value={aiText} 
        onChange={(e) => setAiText(e.target.value)} 
        placeholder="Enter text..." 
        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white outline-none h-24 mb-4" 
      />
      
      {/* Dữ liệu TTS và nút xoá: đồng bộ style với Subtitle trong Text tab */}
      {hasTtsAudio && (
        <div className="mb-6 p-3 bg-white/5 rounded-xl border border-white/5">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest italic">Data Found</p>
            <button 
              onClick={() => {
                if(confirm("Bạn có chắc muốn xoá toàn bộ TTS?")) {
                  clearAudio();
                }
              }}
              className="text-[8px] text-rose-500 font-bold uppercase hover:underline"
            >
              🗑️ Clear All
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            <div className="mb-3 last:mb-0 border-b border-white/5 pb-2">
              <p className="text-[10px] text-zinc-200 leading-snug font-medium">AI Voice Segment</p>
              <p className="text-[8px] text-zinc-500 font-mono mt-1 uppercase">{audioConfig.start.toFixed(1)}s → {audioConfig.end.toFixed(1)}s</p>
            </div>
          </div>
        </div>
      )}

      {/* Nút Upload Audio: độc lập với TTS, toggle giống Add Heading */}
      <button 
        onClick={() => {
          if (hasUploadedAudio) {
            if(confirm("Bạn có chắc muốn xoá audio đã upload?")) {
              clearAudio();
            }
            return;
          }
          document.getElementById('aud-in')?.click();
        }} 
        className={`w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all mb-3 active:scale-[0.98] ${
          hasUploadedAudio 
            ? 'bg-rose-500/10 border border-rose-500/30 text-rose-500 hover:bg-rose-500/20' 
            : 'bg-indigo-600 text-white hover:bg-indigo-500'
        }`}
      >
        {hasUploadedAudio ? "- Remove Audio" : "+ Upload Audio"}
      </button>
      
      <input id="aud-in" type="file" className="hidden" accept="audio/*" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          const t = new Audio(url);
          t.onloadedmetadata = () => { 
            saveHistory();
            setAudioDuration(t.duration); 
            setAudioConfig({ ...audioConfig, end: t.duration });
            setAudio(file, url); 
          };
        }
      }} />
    </div>
  );
};
