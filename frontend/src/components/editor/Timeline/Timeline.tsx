"use client";
import { useVideoStore } from '../../../store/useVideoStore';

interface TimelineProps {
  timelineRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "00:00.0";
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m.toString().padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
};

const TrackLabel = ({ type, label, color }: { type: 'video' | 'stickers' | 'text' | 'audio'; label: string; color: string }) => {
  const iconClass = "w-4 h-4";
  return (
    <div className={`w-20 text-[11px] font-black uppercase flex items-center gap-2 shrink-0 ${color}`}>
      {type === 'video' && (
        <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )}
      {type === 'stickers' && (
        <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
        </svg>
      )}
      {type === 'text' && (
        <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7V4h16v3M9 20h6M12 4v16" />
        </svg>
      )}
      {type === 'audio' && (
        <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      )}
      <span>{label}</span>
    </div>
  );
};

export const Timeline = ({ timelineRef, videoRef }: TimelineProps) => {
  const store = useVideoStore() as any;
  const {
    duration,
    currentTime,
    videoSrc,
    audioSrc,
    trimStart,
    trimEnd,
    audioConfig,
    activeSegments,       
    totalTrimmedDuration, 
    stickers,
    texts,
    setIsDragging
  } = store;

  const displayDuration = totalTrimmedDuration > 0 ? totalTrimmedDuration : duration;
  const getPos = (time: number) => (displayDuration > 0 ? (time / displayDuration) * 100 : 0);

  const calculateOriginalTime = (trimmedTime: number) => {
    if (activeSegments.length === 0) return trimmedTime;

    let accumulatedTrimmed = 0;
    for (const segment of activeSegments) {
      const segmentDuration = segment.end - segment.start;
      if (trimmedTime <= accumulatedTrimmed + segmentDuration) {
        return segment.start + (trimmedTime - accumulatedTrimmed);
      }
      accumulatedTrimmed += segmentDuration;
    }

    return activeSegments[activeSegments.length - 1].end;
  };

  const seekPlayhead = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || displayDuration <= 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    const timeOnTimeline = (x / rect.width) * displayDuration;
    const actualTime = calculateOriginalTime(timeOnTimeline);

    if (videoRef.current) {
      videoRef.current.currentTime = actualTime;
    }
    store.setCurrentTime(timeOnTimeline);
    setIsDragging('playhead');
  };

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
          <TrackLabel type="video" label="Video" color="text-zinc-500" />
          <div 
            ref={timelineRef} 
            onMouseDown={seekPlayhead} 
            className="flex-1 h-12 bg-zinc-900/50 rounded-lg border border-white/5 relative cursor-crosshair overflow-visible"
          >
            {videoSrc && (
              <>
                {activeSegments.length > 0 ? (
                  // VÁ LỖI TẠI ĐÂY: Thêm kiểu dữ liệu cụ thể (any hoặc number) cho các biến lặp
                  activeSegments.map((seg: any, i: number) => {
                    const previousDuration = activeSegments.slice(0, i).reduce((sum: number, s: any) => sum + s.duration, 0);
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
                    <div className="absolute -top-6 left-0 -translate-x-1/2 rounded bg-zinc-950/95 border border-indigo-500/30 px-1.5 py-0.5 text-[9px] font-mono font-bold text-indigo-300 shadow-lg pointer-events-none tabular-nums">
                      {formatTime(trimStart)}
                    </div>
                    <div className="absolute -top-6 right-0 translate-x-1/2 rounded bg-zinc-950/95 border border-indigo-500/30 px-1.5 py-0.5 text-[9px] font-mono font-bold text-indigo-300 shadow-lg pointer-events-none tabular-nums">
                      {formatTime(trimEnd)}
                    </div>
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
             <TrackLabel type="stickers" label="Stickers" color="text-amber-400" />
             <div className="flex-1 h-12 bg-zinc-900/50 rounded-lg border border-white/5 relative overflow-hidden">
                {stickers.map((sticker: any) => {
                  const isFocused = (window as any).activeStickerId === sticker.id;

                  return (
                    <div 
                      key={sticker.id}
                      className={`absolute inset-y-1 bg-amber-500/20 border-x-2 rounded shadow-md flex items-center justify-between pointer-events-auto cursor-grab active:cursor-grabbing transition-colors duration-150 ${
                        isFocused ? "border-amber-500 bg-amber-500/40 z-30" : "border-amber-500/40"
                      }`} 
                      style={{ 
                        left: `${getPos(sticker.startTime)}%`, 
                        right: `${100 - getPos(sticker.endTime)}%`
                      }}
                      onMouseDown={(e) => { 
                        e.stopPropagation(); 
                        (window as any).activeStickerId = sticker.id;
                        setIsDragging('sticker-move'); 
                      }}
                    >
                      {/* TAI NẮM TRÁI */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 z-40"
                        onMouseDown={(e) => { 
                          e.stopPropagation(); 
                          e.preventDefault();
                          (window as any).activeStickerId = sticker.id;
                          setIsDragging('sticker-start'); 
                        }} 
                      />

                      {/* Ảnh nhỏ Thumbnail */}
                      <div className="h-full flex items-center justify-center px-2 pointer-events-none select-none overflow-hidden mx-auto">
                        <img 
                          src={sticker.src} 
                          alt="sticker-thumb" 
                          className="h-4 w-4 object-contain opacity-80 drop-shadow" 
                        />
                      </div>

                      {/* TAI NẮM PHẢI */}
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 z-40"
                        onMouseDown={(e) => { 
                          e.stopPropagation(); 
                          e.preventDefault();
                          (window as any).activeStickerId = sticker.id;
                          setIsDragging('sticker-end'); 
                        }} 
                      />
                    </div>
                  );
                })}
             </div>
          </div>
        )}

        {/* --- TRACK TEXT --- */}
        {texts.length > 0 && (
          <div className="flex items-center gap-6 animate-in slide-in-from-left duration-300">
             <TrackLabel type="text" label="Text" color="text-indigo-400" />
             <div className="flex-1 h-10 bg-zinc-900/50 rounded-lg border border-white/5 relative overflow-hidden">
              {texts.map((text: any) => {
                const isFocused = (window as any).activeTextId === text.id;
                return (
                <div 
                  key={text.id}
                  className={`absolute inset-y-1 bg-indigo-500/30 border-x-2 rounded shadow-md cursor-grab active:cursor-grabbing transition-colors ${
                    isFocused ? 'border-indigo-400 bg-indigo-500/45 z-30' : 'border-indigo-500/50'
                  }`}
                  style={{ left: `${getPos(text.start)}%`, right: `${100 - getPos(text.end)}%` }}
                  onMouseDown={(e) => { 
                    e.stopPropagation(); 
                    (window as any).activeTextId = text.id;
                    store.setTextConfig(text);
                    setIsDragging('text-move'); 
                  }}
                >
                  <div onMouseDown={(e) => { 
                    e.stopPropagation(); 
                    (window as any).activeTextId = text.id;
                    store.setTextConfig(text);
                    setIsDragging('text-start'); 
                  }} className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30" />
                  <div className="h-full flex items-center justify-center px-2 pointer-events-none select-none overflow-hidden">
                    <span className="text-[9px] font-bold text-indigo-100 truncate uppercase">{text.content}</span>
                  </div>
                  <div onMouseDown={(e) => { 
                    e.stopPropagation(); 
                    (window as any).activeTextId = text.id;
                    store.setTextConfig(text);
                    setIsDragging('text-end'); 
                  }} className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30" />
                </div>
                );
              })}
             </div>
          </div>
        )}

        {/* --- TRACK AUDIO --- */}
        {audioSrc && (
          <div className="flex items-center gap-6 animate-in slide-in-from-left duration-300">
             <TrackLabel type="audio" label="Audio" color="text-emerald-400" />
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
