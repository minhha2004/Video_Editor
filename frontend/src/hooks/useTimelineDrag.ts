// src/hooks/useTimelineDrag.ts
import { useVideoStore } from '../store/useVideoStore';

export const useTimelineDrag = (
  timelineRef: React.RefObject<HTMLDivElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>
) => {
  const store = useVideoStore();

  /**
   * Logic Ánh xạ thời gian (Time Mapping):
   * Chuyển đổi thời gian từ Timeline đã rút ngắn sang thời gian thực của Video gốc
   */
  const calculateOriginalTime = (trimmedTime: number, activeSegments: any[]) => {
    if (activeSegments.length === 0) return trimmedTime;

    let accumulatedTrimmed = 0;
    for (const seg of activeSegments) {
      const segmentDuration = seg.end - seg.start;
      // Nếu thời gian kéo nằm trong khoảng của segment này
      if (trimmedTime <= accumulatedTrimmed + segmentDuration) {
        const offsetInSegment = trimmedTime - accumulatedTrimmed;
        return seg.start + offsetInSegment;
      }
      accumulatedTrimmed += segmentDuration;
    }
    // Nếu kéo quá cuối cùng, trả về điểm kết thúc của segment cuối
    return activeSegments[activeSegments.length - 1].end;
  };

  const handleDrag = (e: React.MouseEvent | MouseEvent) => {
    if (!store.isDragging || store.duration === 0) return;
    
    // 1. Kéo vị trí Text trên màn hình Preview
    if (store.isDragging === 'text-pos' && containerRef.current) {
      const cRect = containerRef.current.getBoundingClientRect();
      store.setTextConfig({
        ...store.textConfig,
        x: Math.max(0, Math.min(((e.clientX - cRect.left) / cRect.width) * 100, 100)),
        y: Math.max(0, Math.min(((e.clientY - cRect.top) / cRect.height) * 100, 100))
      });
      return;
    }

    // 2. Thao tác trên Timeline
    const rect = timelineRef.current?.getBoundingClientRect();
    if (rect) {
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      
      // Xác định tổng thời gian đang hiển thị trên Timeline (Gốc hoặc Đã cắt)
      const displayDuration = store.totalTrimmedDuration > 0 
        ? store.totalTrimmedDuration 
        : store.duration;

      const timeOnTimeline = (x / rect.width) * displayDuration;

      if (store.isDragging === 'playhead') {
        // Nếu đã Cut Silence, cần ánh xạ thời gian để Video nhảy đúng chỗ
        const actualTime = store.activeSegments.length > 0 
          ? calculateOriginalTime(timeOnTimeline, store.activeSegments)
          : timeOnTimeline;

        if (videoRef.current) videoRef.current.currentTime = actualTime;
        store.setCurrentTime(timeOnTimeline);
      } else {
        // Xử lý các loại kéo Move/Trim khác
        switch(store.isDragging) {
          case 'video-move': {
            const duration = store.trimEnd - store.trimStart;
            let newStart = timeOnTimeline - (duration / 2);
            let newEnd = newStart + duration;
            if (newStart < 0) { newStart = 0; newEnd = duration; }
            if (newEnd > store.duration) { newEnd = store.duration; newStart = store.duration - duration; }
            store.setTrimStart(newStart);
            store.setTrimEnd(newEnd);
            break;
          }
          case 'text-start': 
            store.setTextConfig({ ...store.textConfig, start: Math.min(timeOnTimeline, store.textConfig.end - 0.2) }); 
            break;
          case 'text-end': 
            store.setTextConfig({ ...store.textConfig, end: Math.max(timeOnTimeline, store.textConfig.start + 0.2) }); 
            break;
          case 'text-move': {
            const duration = store.textConfig.end - store.textConfig.start;
            let newStart = timeOnTimeline - (duration / 2);
            let newEnd = newStart + duration;
            if (newStart < 0) { newStart = 0; newEnd = duration; }
            if (newEnd > displayDuration) { newEnd = displayDuration; newStart = displayDuration - duration; }
            store.setTextConfig({ ...store.textConfig, start: newStart, end: newEnd });
            break;
          }
          case 'audio-start': {
            // Khi kéo đầu Audio sang phải (co ngắn lại), không được để vượt quá điểm kết thúc trừ đi khoảng hở tối thiểu
            const maxStart = store.audioConfig.end - 0.2;
            // Đồng thời chiều dài (end - newStart) không bao giờ được phép lớn hơn audioDuration thật
            const minStart = store.audioConfig.end - store.audioDuration;
            const safeStart = Math.max(minStart, Math.min(timeOnTimeline, maxStart));
            store.setAudioConfig({ ...store.audioConfig, start: safeStart }); 
            break;
          }
          case 'audio-end': {
            // Điểm kết thúc tối thiểu phải cách điểm start 0.2 giây
            const minEnd = store.audioConfig.start + 0.2;
            // Điểm kết thúc tối đa TUYỆT ĐỐI không được vượt quá điểm start + thời lượng file thật
            const maxEnd = store.audioConfig.start + store.audioDuration;
            const safeEnd = Math.max(minEnd, Math.min(timeOnTimeline, maxEnd));
            store.setAudioConfig({ ...store.audioConfig, end: safeEnd }); 
            break;
          }
          case 'audio-move': {
            // Khi di chuyển cả track, tính toán độ dài track hiện tại (chắc chắn luôn nhỏ hơn hoặc bằng audioDuration)
            const currentClipDuration = Math.min(store.audioConfig.end - store.audioConfig.start, store.audioDuration);
            let newStart = timeOnTimeline - (currentClipDuration / 2);
            let newEnd = newStart + currentClipDuration;
            
            // Chặn viền Timeline trái và phải
            if (newStart < 0) { newStart = 0; newEnd = currentClipDuration; }
            if (newEnd > displayDuration) { newEnd = displayDuration; newStart = displayDuration - currentClipDuration; }
            
            store.setAudioConfig({ ...store.audioConfig, start: newStart, end: newEnd });
            break;
          }
          case 'trim-start': 
            store.setTrimStart(Math.max(0, Math.min(timeOnTimeline, store.trimEnd - 0.2))); 
            break;
          case 'trim-end': 
            store.setTrimEnd(Math.max(store.trimStart + 0.2, Math.min(timeOnTimeline, store.duration))); 
            break;
        }
      }
    }
  };

  return { handleDrag };
};