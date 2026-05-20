"use client";
import { useEffect, useRef, useState } from 'react';
import { useVideoStore } from '../../../store/useVideoStore';

// Import các lớp hiển thị con từ thư mục Layers
import { DropzoneOverlay } from './Layers/DropzoneOverlay';
import { TextLayer } from './Layers/TextLayer';
import { SubtitleLayer } from './Layers/SubtitleLayer';
import { StickerLayer } from './Layers/StickerLayer';

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
    audioConfig,
    currentTime, 
    isVideoMuted,
    activeSegments, 
    isPlaying,
    setIsPlaying,
    setVideo,
    trimStart, 
    trimEnd    
  } = useVideoStore();

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- HÀNH VI KÉO THẢ VIDEO TRÊN KHUNG CHÍNH ---
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) {
      const types = e.dataTransfer.types;
      const hasFiles = types && types.includes('Files');
      if (hasFiles) setIsDraggingOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (!isDraggingOver) {
      const types = e.dataTransfer.types;
      const hasFiles = types && types.includes('Files');
      if (hasFiles) setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false); 

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        setVideo(file, url);
      } else {
        alert(`File "${file.name}" không hợp lệ. Vui lòng chỉ thả file định dạng Video.`);
      }
    }
  };

  // --- KIỂM TRA ĐIỀU KIỆN XEM KIM THỜI GIAN CÓ NẰM TRONG VÙNG ĐC CHỌN (TRIM) KHÔNG ---
  const isVideoVisible = activeSegments.length > 0 || trimEnd === 0 || (currentTime >= trimStart && currentTime <= trimEnd);

  // --- ĐỒNG BỘ TIẾNG GỐC CỦA VIDEO (TẮT TIẾNG HOÀN TOÀN KHI RƠI VÀO VÙNG TRIM) ---
  useEffect(() => {
    if (videoRef.current) {
      if (!isVideoVisible) {
        // Nếu rơi vào vùng bị trim, khóa âm thanh gốc của video ngay lập tức
        videoRef.current.muted = true;
      } else {
        // Nếu ở vùng hợp lệ, trả lại quyền tắt/bật âm thanh theo nút bấm giao diện (state)
        videoRef.current.muted = isVideoMuted;
      }
    }
  }, [isVideoVisible, isVideoMuted, currentTime, videoRef]);

  // --- ĐỒNG BỘ PLAY/PAUSE CHO AUDIO TTS / NHẠC NỀN RỜI ---
  useEffect(() => {
    if (audioRef.current && audioConfig) {
      const isWithinAudioClip = currentTime >= audioConfig.start && currentTime <= audioConfig.end;
      
      // Chỉ phát tiếng nhạc nền khi hệ thống đang chạy, kim nằm trong block Audio và Video chưa bị Trim
      if (isPlaying && isWithinAudioClip && isVideoVisible) {
        audioRef.current.play().catch(e => console.log("Lỗi phát âm thanh:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTime, audioConfig, isVideoVisible]);

  // --- ĐỒNG BỘ THỜI GIAN KHI TUA (SEEK) TRÊN TIMELINE CHO AUDIO RỜI ---
  useEffect(() => {
    if (audioRef.current && !isPlaying && audioConfig) {
      const isWithinAudioClip = currentTime >= audioConfig.start && currentTime <= audioConfig.end;
      if (isWithinAudioClip && isVideoVisible) {
        const targetAudioTime = currentTime - audioConfig.start;
        if (Math.abs(audioRef.current.currentTime - targetAudioTime) > 0.2) {
          audioRef.current.currentTime = targetAudioTime;
        }
      } else {
        audioRef.current.currentTime = 0; 
      }
    }
  }, [currentTime, isPlaying, audioConfig, isVideoVisible]);

  // --- ĐỒNG BỘ LUỒNG PHÁT VIDEO VÀ XỬ LÝ QUAY ĐẦU KHI TRIM / SMART CUT ---
  useEffect(() => {
    if (isPlaying && videoRef.current) {
      const vid = videoRef.current;
      const actualTime = vid.currentTime;

      // TRƯỜNG HỢP 1: NẾU ĐANG DÙNG TÍNH NĂNG SMART CUT (AUTO CUT SILENCE)
      if (activeSegments.length > 0) {
        const currentSeg = activeSegments.find(seg => actualTime >= seg.start && actualTime <= seg.end);

        if (!currentSeg) {
          const nextSeg = activeSegments.find(seg => seg.start > actualTime);
          if (nextSeg) {
            vid.currentTime = nextSeg.start;
            if (audioRef.current) audioRef.current.currentTime = nextSeg.start;
          } else {
            vid.pause();
            setIsPlaying(false);
          }
        }
      } 
      // TRƯỜNG HỢP 2: NẾU ĐANG TRIM VIDEO THỦ CÔNG (CHẶN ĐẦU CHẶN ĐUÔI)
      else if (trimEnd > 0) {
        if (actualTime >= trimEnd) {
          vid.pause();
          vid.currentTime = trimStart; // Đưa kim video quay về mốc đầu đã trim
          setIsPlaying(false);
        }
      }
    }
  }, [currentTime, isPlaying, activeSegments, trimStart, trimEnd, setIsPlaying, videoRef]);

  return (
    <div 
      className="relative w-full h-full bg-black overflow-hidden transform-gpu flex items-center justify-center border border-transparent"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Lớp phủ kéo thả tệp tin */}
      <DropzoneOverlay isDraggingOver={isDraggingOver} />

      {videoSrc && (
        <>
          {/* Màn hình phát video chính - Ẩn hoàn toàn (opacity-0) nếu rơi vào vùng đã trim */}
          <video 
            ref={videoRef} 
            src={videoSrc} 
            onTimeUpdate={onTimeUpdate} 
            onLoadedMetadata={onLoadedMetadata}
            className={`w-full h-full object-cover z-10 transition-opacity duration-75 ${
              isDraggingOver ? 'opacity-20' : isVideoVisible ? 'opacity-100' : 'opacity-0'
            }`} 
          />
          
          {/* Thẻ audio xử lý nhạc nền/TTS */}
          {audioSrc && <audio ref={audioRef} src={audioSrc} className="absolute pointer-events-none" />}

          {/* Chỉ render các layer hiệu ứng chữ, sticker khi video nằm trong khoảng thời gian hợp lệ */}
          {isVideoVisible && (
            <>
              {/* Lớp Text Overlay (Kéo di chuyển, Double click để sửa) */}
              <TextLayer onTextMouseDown={onTextMouseDown} />

              {/* Lớp hiển thị phụ đề chạy tự động */}
              <SubtitleLayer />

              {/* Lớp hiển thị nhãn dán Sticker */}
              <StickerLayer />
            </>
          )}
        </>
      )}
    </div>
  );
};