"use client";
import { useVideoStore } from '../../../store/useVideoStore';

interface TimelineProps {
  timelineRef: React.RefObject<HTMLDivElement | null>;
}

export const Timeline = ({ timelineRef }: TimelineProps) => {
  const {
    duration,
    currentTime,
    videoSrc,
    audioSrc,
    showText,
    trimStart,
    trimEnd,
    textConfig,
    audioConfig,
    activeSegments,       
    totalTrimmedDuration, 
    stickers, // <-- Lấy mảng Stickers từ store
    setIsDragging
  } = useVideoStore();

  const displayDuration = totalTrimmedDuration > 0 ? totalTrimmedDuration : duration;
  const getPos = (time: number) => (displayDuration > 0 ? (time / displayDuration) * 100 : 0);

  return (
    <footer className="h-60 border-t border-white/5 bg-[#121214] flex flex-col shrink-0">
      {/* --- THƯỚC ĐO THỜI GIAN (RULER) --- */}
      <div className="h-7 border-b border-white/5 relative flex items-end px-24 font-mono text-[9px] text-zinc-600 tracking-tighter">
         {Array.from({ length: Math.ceil(displayDuration / 5) + 1 }, (_, i) => i * 5).map(t => (
           <div 
             key={t} 
             className="absolute border-l border-white/5 h-2 pl-1" 
             style={{ left: `${getPos(t)}%`, marginLeft: '96px' }}
           >
             {t}s
           </div>
         ))}
      </div>

      <div className="flex-1 p-5 space-y-4 overflow-y-auto custom-scrollbar">
        
        {/* --- TRACK VIDEO --- */}
        <div className="flex items-center gap-6">
          <div className="w-20 text-[11px] font-black text-zinc-500 uppercase flex items-center gap-2 shrink-0">
            <span>🎬</span> Video
          </div>
          <div 
            ref={timelineRef} 
            onMouseDown={() => setIsDragging('playhead')} 
            className="flex-1 h-12 bg-zinc-900/50 rounded-lg border border-white/5 relative cursor-crosshair overflow-hidden"
          >
            {videoSrc && (
              <>
                {activeSegments.length > 0 ? (
                  activeSegments.map((seg, i) => {
                    const previousDuration = activeSegments.slice(0, i).reduce((sum, s) => sum + s.duration, 0);
                    return (
                      <div 
                        key={i}
                        className="absolute inset-y-1 bg-indigo-600 border-r border-white/20 shadow-sm"
                        style={{ 
                          left: `${(previousDuration / totalTrimmedDuration) * 100}%`, 
                          width: `${(seg.duration / totalTrimmedDuration) * 100}%` 
                        }}
                      />
                    );
                  })
                ) : (
                  <div 
                    className="absolute inset-y-1 bg-indigo-600/20 border-x-4 border-indigo-500 rounded z-20 cursor-grab active:cursor-grabbing" 
                    style={{ left: `${getPos(trimStart)}%`, right: `${100 - getPos(trimEnd)}%` }}
                    onMouseDown={(e) => { e.stopPropagation(); setIsDragging('video-move'); }}
                  >
                    <div onMouseDown={(e) => { e.stopPropagation(); setIsDragging('trim-start'); }} className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/30" />
                    <div onMouseDown={(e) => { e.stopPropagation(); setIsDragging('trim-end'); }} className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/30" />
                  </div>
                )}

                {/* Kim đỏ Playhead */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-50 pointer-events-none transition-transform" 
                  style={{ left: `${getPos(currentTime)}%` }}
                >
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_10px_rose]" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* --- TRACK STICKERS --- */}
        {stickers.length > 0 && (
          <div className="flex items-center gap-6 animate-in slide-in-from-left duration-300">
             <div className="w-20 text-[11px] font-black text-amber-400 uppercase flex items-center gap-2 shrink-0">
               <span>🎨</span> Stickers
             </div>
             <div className="flex-1 h-12 bg-zinc-900/50 rounded-lg border border-white/5 relative overflow-hidden">
                {stickers.map((sticker) => (
                  <div 
                    key={sticker.id}
                    className="absolute inset-y-1 bg-amber-500/20 border-x-2 border-amber-500/50 rounded shadow-md flex items-center justify-center pointer-events-none overflow-hidden" 
                    style={{ 
                      left: `${getPos(sticker.startTime)}%`, 
                      right: `${100 - getPos(sticker.endTime)}%`
                    }}
                  >
                    <img 
                      src={sticker.src} 
                      alt="sticker-thumbnail" 
                      className="h-full object-contain opacity-70 px-1 py-1 drop-shadow-md" 
                    />
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* --- TRACK TEXT --- */}
        {showText && (
          <div className="flex items-center gap-6 animate-in slide-in-from-left duration-300">
             <div className="w-20 text-[11px] font-black text-indigo-400 uppercase flex items-center gap-2 shrink-0">
               <span>TXT</span> Text
             </div>
             <div className="flex-1 h-10 bg-zinc-900/50 rounded-lg border border-white/5 relative overflow-hidden">
                <div 
                  className="absolute inset-y-1 bg-indigo-500/30 border-x-2 border-indigo-500/50 rounded shadow-md cursor-grab active:cursor-grabbing" 
                  style={{ left: `${getPos(textConfig.start)}%`, right: `${100 - getPos(textConfig.end)}%` }}
                  onMouseDown={(e) => { e.stopPropagation(); setIsDragging('text-move'); }}
                >
                  <div onMouseDown={(e) => { e.stopPropagation(); setIsDragging('text-start'); }} className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30" />
                  <div onMouseDown={(e) => { e.stopPropagation(); setIsDragging('text-end'); }} className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30" />
                </div>
             </div>
          </div>
        )}

        {/* --- TRACK AUDIO --- */}
        {audioSrc && (
          <div className="flex items-center gap-6 animate-in slide-in-from-left duration-300">
             <div className="w-20 text-[11px] font-black text-emerald-400 uppercase flex items-center gap-2 shrink-0">
               <span>🎵</span> Audio
             </div>
             <div className="flex-1 h-10 bg-zinc-900/50 rounded-lg border border-white/5 relative overflow-hidden">
                <div 
                  className="absolute inset-y-1 bg-emerald-500/20 border-x-2 border-emerald-500/50 rounded shadow-md cursor-grab active:cursor-grabbing" 
                  style={{ left: `${getPos(audioConfig.start)}%`, right: `${100 - getPos(audioConfig.end)}%` }}
                  onMouseDown={(e) => { e.stopPropagation(); setIsDragging('audio-move'); }}
                >
                  <div onMouseDown={(e) => { e.stopPropagation(); setIsDragging('audio-start'); }} className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30" />
                  <div onMouseDown={(e) => { e.stopPropagation(); setIsDragging('audio-end'); }} className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30" />
                </div>
             </div>
          </div>
        )}
      </div>
    </footer>
  );
};