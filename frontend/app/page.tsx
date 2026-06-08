"use client";
import { useRef, useEffect } from 'react';
import { VideoPreview } from '../src/components/editor/Preview/VideoPreview';
import { ContextPanel } from '../src/components/editor/Panels/ContextPanel';
import { Timeline } from '../src/components/editor/Timeline/Timeline';
import { useVideoStore } from '../src/store/useVideoStore'; 
import { useTimelineDrag } from '../src/hooks/useTimelineDrag';
import { aiService } from '../src/services/aiService';
import ExportPublisher from '../src/components/editor/ExportPublisher'; // Import component đã tách

// Hàm định dạng thời gian MM:SS chuyên nghiệp
const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function Home() {
  const store = useVideoStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { handleDrag } = useTimelineDrag(timelineRef, containerRef, videoRef);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (store.isPlaying) {
      video.pause();
      store.setIsPlaying(false);
      return;
    }

    if (store.activeSegments.length > 0) {
      const isInsideSegment = store.activeSegments.some(
        (segment) => video.currentTime >= segment.start && video.currentTime <= segment.end
      );
      if (!isInsideSegment) {
        const firstSegmentStart = store.activeSegments[0].start;
        video.currentTime = firstSegmentStart;
        store.setCurrentTime(firstSegmentStart);
      }
    } else if (store.trimEnd > 0) {
      const isInsideTrim = video.currentTime >= store.trimStart && video.currentTime < store.trimEnd;
      if (!isInsideTrim) {
        video.currentTime = store.trimStart;
        store.setCurrentTime(store.trimStart);
      }
    }

    video.play();
    store.setIsPlaying(true);
  };

  // Phím tắt Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        store.undo();
      }
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || 
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        store.redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);

  useEffect(() => { 
    if (store.duration > 0 && store.trimEnd === 0) store.setTrimEnd(store.duration);
  }, [store.duration, store.trimEnd]);

  useEffect(() => {
    const handleUp = () => store.setIsDragging(null);
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, []);

  return (
    <div className="h-screen bg-[#0c0c0e] text-zinc-300 flex flex-col font-sans overflow-hidden select-none" onMouseMove={handleDrag}>
      
      {/* HEADER */}
      <header className="h-12 border-b border-white/5 flex justify-between items-center px-8 bg-[#18181b] shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center font-black text-white text-[11px]">S</div>
          <span className="text-[12px] font-bold uppercase text-zinc-300 tracking-wider">Short Editor Pro</span>
        </div>
        {/* Vị trí nút cũ được thay thế bằng Component riêng biệt đã bao bọc full tính năng */}
        <ExportPublisher />
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR: Thêm tab assets và Icon SVG đồng bộ outline đường nét mảnh */}
        <aside className="w-20 bg-[#18181b] border-r border-white/5 flex flex-col items-center py-8 gap-10 shrink-0">
          {(['media', 'assets', 'text', 'music'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => store.setActiveTab(tab as any)} 
              className={`flex flex-col items-center gap-2 transition-all ${store.activeTab === tab ? 'text-indigo-400' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {tab === 'media' && <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>}
                {tab === 'assets' && <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>}
                {tab === 'text' && <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7V4h16v3M9 20h6M12 4v16" /></svg>}
                {tab === 'music' && <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>}
              </div>
              <span className="text-[11px] font-bold uppercase tracking-tighter">{tab}</span>
            </button>
          ))}
        </aside>

        <ContextPanel />

        <main className="flex-1 bg-[#09090b] flex flex-col items-center justify-center p-8 relative">
          {store.videoSrc && (
            <div className="mb-6 bg-[#18181b] p-1 rounded-lg border border-white/5 flex gap-1">
              <button onClick={() => store.setIsLandscape(false)} className={`px-5 py-2 rounded text-[11px] font-bold uppercase transition-all ${!store.isLandscape ? 'bg-indigo-600 text-white' : 'text-zinc-500'}`}>9:16</button>
              <button onClick={() => store.setIsLandscape(true)} className={`px-5 py-2 rounded text-[11px] font-bold uppercase transition-all ${store.isLandscape ? 'bg-indigo-600 text-white' : 'text-zinc-500'}`}>16:9</button>
            </div>
          )}

          {/* PREVIEW VIDEO */}
          <div ref={containerRef} className={`relative bg-black rounded-2xl border-4 border-[#1e1e21] overflow-hidden shadow-2xl transition-all duration-500 ${store.isLandscape ? 'w-[800px] aspect-video' : 'h-[550px] aspect-[9/16]'}`}>
            <VideoPreview 
              videoRef={videoRef} 
              containerRef={containerRef} 
              onTextMouseDown={() => store.setIsDragging('text-pos')}
              onTimeUpdate={() => { if(store.isDragging !== 'playhead') store.setCurrentTime(videoRef.current?.currentTime || 0); }}
              onLoadedMetadata={() => store.setDuration(videoRef.current?.duration || 0)}
            />
          </div>

          {/* PLAYER CONTROLS */}
          {store.videoSrc && (
            <div className="mt-8 bg-[#18181b] px-8 py-3 rounded-full border border-white/5 flex items-center gap-8 shadow-2xl">
               <button onClick={() => {if(videoRef.current) videoRef.current.currentTime -= 5}} className="text-zinc-500 hover:text-white">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12.5 5.5V18.5L2 12L12.5 5.5ZM22 5.5V18.5L11.5 12L22 5.5Z" /></svg>
               </button>
               <button 
                 onClick={handlePlayPause} 
                 className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white transition-transform active:scale-90"
               >
                 {store.isPlaying ? 
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : 
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="ml-1"><path d="M8 5v14l11-7z"/></svg>
                 }
               </button>
               <button onClick={() => {if(videoRef.current) videoRef.current.currentTime += 5}} className="text-zinc-500 hover:text-white">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M11.5 5.5V18.5L22 12L11.5 5.5ZM1 5.5V18.5L11.5 12L1 5.5Z" /></svg>
               </button>
               <div className="w-[1px] h-5 bg-white/10"></div>
               
               <span className="text-[13px] font-mono font-bold text-indigo-400 w-32 text-center tabular-nums">
                 {formatTime(store.currentTime)} / {formatTime(store.totalTrimmedDuration > 0 ? store.totalTrimmedDuration : store.duration)}
               </span>
            </div>
          )}
        </main>
      </div>

      {/* TIMELINE AREA */}
      <div className="relative border-t border-white/5 bg-[#121214] shrink-0">
        <div className="absolute top-0 right-8 -translate-y-full pb-3 flex items-center gap-2">
            <div className="flex bg-[#18181b] border border-white/10 rounded-lg overflow-hidden shadow-2xl">
              <button onClick={() => store.undo()} disabled={store.historyIndex < 0} className="p-2.5 hover:bg-white/5 disabled:opacity-20 transition-all border-r border-white/5 text-zinc-400" title="Undo">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 10h10a5 5 0 010 10H3M3 10l4-4M3 10l4 4" /></svg>
              </button>
              <button onClick={() => store.redo()} disabled={store.redoHistory.length === 0} className="p-2.5 hover:bg-white/5 disabled:opacity-20 transition-all text-zinc-400" title="Redo">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 10H11a5 5 0 000 10h10M21 10l-4-4M21 10l-4 4" /></svg>
              </button>
            </div>
        </div>
        <Timeline timelineRef={timelineRef} />
      </div>
      
      <audio ref={audioRef} src={store.audioSrc || undefined} className="hidden" />
    </div>
  );
}
