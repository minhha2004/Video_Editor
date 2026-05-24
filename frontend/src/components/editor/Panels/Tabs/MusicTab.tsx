import { useState } from 'react';
import { useVideoStore } from '../../../../store/useVideoStore';
import { aiService } from '../../../../services/aiService';

export const MusicTab = () => {
  const {
    audioSrc,
    audioConfig,
    setAudioConfig,
    setAudio,
    setAudioDuration,
    saveHistory
  } = useVideoStore();

  const [aiText, setAiText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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
  );
};