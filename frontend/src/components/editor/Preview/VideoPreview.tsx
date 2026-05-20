"use client";
import { useEffect, useRef } from 'react'; // <-- Đã thêm useRef
import { useVideoStore } from '../../../store/useVideoStore';

interface PreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onTextMouseDown: () => void;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
}

export const VideoPreview = ({ 
  videoRef, onTextMouseDown, onTimeUpdate, onLoadedMetadata 
}: PreviewProps) => {
  const {
    videoSrc,
    audioSrc,
    showText,
    currentTime, 
    textConfig,
    isVideoMuted,
    subtitles,
    stickers,
    activeSegments, 
    isPlaying,
    setIsPlaying,
    historyIndex
  } = useVideoStore();

  // --- 1. TẠO REF ĐỂ ĐIỀU KHIỂN THẺ AUDIO ---
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- 2. ĐỒNG BỘ PLAY/PAUSE ---
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log("Lỗi phát âm thanh:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // --- 3. ĐỒNG BỘ THỜI GIAN KHI TUA (SEEK) TRÊN TIMELINE ---
  useEffect(() => {
    if (audioRef.current && !isPlaying) {
      // Chỉ đồng bộ khi đang Pause (ví dụ: người dùng đang kéo thanh timeline)
      // Để tránh bị giật tiếng khi đang Play bình thường
      if (Math.abs(audioRef.current.currentTime - currentTime) > 0.2) {
        audioRef.current.currentTime = currentTime;
      }
    }
  }, [currentTime, isPlaying]);

  /**
   * LOGIC AUTO-JUMP (Dành cho Smart Cut)
   */
  useEffect(() => {
    if (isPlaying && activeSegments.length > 0 && videoRef.current) {
      const vid = videoRef.current;
      const actualTime = vid.currentTime;
      const currentSeg = activeSegments.find(seg => actualTime >= seg.start && actualTime <= seg.end);

      if (!currentSeg) {
        const nextSeg = activeSegments.find(seg => seg.start > actualTime);
        if (nextSeg) {
          vid.currentTime = nextSeg.start;
          // Ép audio nhảy theo video luôn nếu tính năng Smart Cut hoạt động
          if (audioRef.current) audioRef.current.currentTime = nextSeg.start;
        } else {
          vid.pause();
          setIsPlaying(false);
        }
      }
    }
  }, [currentTime, isPlaying, activeSegments, setIsPlaying, videoRef]);

  useEffect(() => {
    if (videoRef.current && !isPlaying) {
      // Logic Undo
    }
  }, [historyIndex]);

  const isTextVisible = showText && currentTime >= textConfig.start && currentTime <= textConfig.end;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden transform-gpu">
      {videoSrc && (
        <>
          <video 
            ref={videoRef} 
            src={videoSrc} 
            muted={isVideoMuted}
            onTimeUpdate={onTimeUpdate} 
            onLoadedMetadata={onLoadedMetadata}
            className="w-full h-full object-cover" 
          />
          
          {/* --- 4. GẮN REF VÀO THẺ AUDIO --- */}
          {audioSrc && (
            <audio 
              ref={audioRef}
              src={audioSrc} 
            />
          )}

          {/* LAYER 1: TEXT OVERLAY */}
          {isTextVisible && (
            <div 
              onMouseDown={onTextMouseDown}
              className="absolute cursor-move select-none p-2 border border-transparent hover:border-indigo-500/50 z-20"
              style={{ 
                left: `${textConfig.x}%`, 
                top: `${textConfig.y}%`, 
                transform: 'translate(-50%, -50%)' 
              }}
            >
              <span 
                style={{ fontSize: `${textConfig.fontSize}px`, color: textConfig.color }} 
                className="font-black drop-shadow-2xl uppercase block leading-none whitespace-nowrap text-white"
              >
                {textConfig.content}
              </span>
            </div>
          )}

          {/* LAYER 2: AI SUBTITLES */}
          <div className="absolute inset-x-0 bottom-6 flex flex-col items-center justify-end pointer-events-none z-50 px-5">
            {subtitles.map((sub, index) => {
              if (!sub.text) return null;
              const start = Number(sub.start);
              const end = Number(sub.end);
              const isActive = currentTime >= start && currentTime <= end;
              
              return isActive ? (
                <div 
                  key={index} 
                  className="bg-black/90 px-4 py-2 rounded-xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200"
                >
                  <p className="text-white text-sm md:text-base font-bold text-center leading-tight tracking-wide">
                    {sub.text}
                  </p>
                </div>
              ) : null;
            })}
          </div>

          {/* LAYER 3: AI STICKERS */}
          <div className="absolute inset-0 pointer-events-none z-40">
            {stickers.map((sticker) => {
              const isActive = currentTime >= sticker.startTime && currentTime <= sticker.endTime;
              if (!isActive) return null;

              return (
                <img
                  key={sticker.id}
                  src={sticker.src}
                  alt="AI Generated Sticker"
                  className="absolute pointer-events-auto animate-in fade-in zoom-in duration-200 drop-shadow-xl"
                  style={{
                    left: `${sticker.position.x}%`,
                    top: `${sticker.position.y}%`,
                    transform: `translate(-50%, -50%) scale(${sticker.scale})`,
                    zIndex: sticker.layer,
                    maxWidth: '180px',
                    maxHeight: '180px',
                    objectFit: 'contain'
                  }}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};