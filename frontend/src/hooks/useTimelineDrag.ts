// src/hooks/useTimelineDrag.ts
import { useVideoStore } from '../store/useVideoStore';

export const useTimelineDrag = (
  timelineRef: React.RefObject<HTMLDivElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>
) => {
  const store = useVideoStore() as any;

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
    
    // Lấy ID của sticker đang được chọn tương tác từ window toàn cục
    const activeStickerId = (window as any).activeStickerId;
    const activeTextId = (window as any).activeTextId;

    // ==========================================
    // 1. TƯƠNG TÁC CHUỘT TRÊN MÀN HÌNH PREVIEW
    // ==========================================

    // CASE A: DI CHUYỂN VỊ TRÍ STICKER TRÊN MÀN HÌNH PREVIEW
    if (store.isDragging === 'sticker-pos' && activeStickerId && containerRef.current) {
      const cRect = containerRef.current.getBoundingClientRect();
      const pctX = ((e.clientX - cRect.left) / cRect.width) * 100;
      const pctY = ((e.clientY - cRect.top) / cRect.height) * 100;

      store.updateSticker(activeStickerId, {
        position: {
          x: Math.max(0, Math.min(pctX, 100)),
          y: Math.max(0, Math.min(pctY, 100))
        }
      });
      return;
    }

    // CASE B: CO GIÃN PHÓNG TO / THU NHỎ STICKER (RESIZE/SCALE)
    if (store.isDragging === 'sticker-scale' && activeStickerId) {
      const targetSticker = store.stickers.find((s: any) => s.id === activeStickerId);
      if (!targetSticker) return;

      const currentScale = targetSticker.scale || 1;
      const scaleDelta = e.movementX * 0.01;
      const newScale = Math.max(0.3, Math.min(currentScale + scaleDelta, 3.0));

      store.updateSticker(activeStickerId, { scale: newScale });
      return;
    }

    // CASE C: KÉO VỊ TRÍ TEXT TRÊN MÀN HÌNH PREVIEW
    if (store.isDragging === 'text-pos' && activeTextId && containerRef.current) {
      const cRect = containerRef.current.getBoundingClientRect();
      const targetText = store.texts.find((text: any) => text.id === activeTextId);
      if (!targetText) return;
      store.updateText(activeTextId, {
        x: Math.max(0, Math.min(((e.clientX - cRect.left) / cRect.width) * 100, 100)),
        y: Math.max(0, Math.min(((e.clientY - cRect.top) / cRect.height) * 100, 100))
      });
      return;
    }

    // CASE D (MỚI BỔ SUNG): CO GIÃN PHÓNG TO / THU NHỎ KÍCH THƯỚC CHỮ (TEXT SCALE)
    if (store.isDragging === 'text-scale' && activeTextId) {
      const targetText = store.texts.find((text: any) => text.id === activeTextId);
      if (!targetText) return;
      const currentFontSize = targetText.fontSize || 40;
      // Di chuột sang phải (e.movementX > 0) chữ to lên, sang trái chữ nhỏ đi
      const fontSizeDelta = e.movementX * 0.5;
      const newFontSize = Math.max(12, Math.min(currentFontSize + fontSizeDelta, 120)); // Giới hạn kích thước chữ từ 12px đến 120px

      store.updateText(activeTextId, { fontSize: Math.round(newFontSize) });
      return;
    }

    // ==========================================
    // 2. THAO TÁC TRÊN THANH TIMELINE XỬ LÝ CHUỘT
    // ==========================================
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
          // ------------------------------------------
          // KHỐI LOGIC TRƯỢT KÉO / TRIM STICKER TRÊN TIMELINE
          // ------------------------------------------
          case 'sticker-start': {
            if (!activeStickerId) break;
            const target = store.stickers.find((s: any) => s.id === activeStickerId);
            if (target) {
              store.updateSticker(activeStickerId, {
                startTime: Math.max(0, Math.min(timeOnTimeline, target.endTime - 0.2))
              });
            }
            break;
          }
          case 'sticker-end': {
            if (!activeStickerId) break;
            const target = store.stickers.find((s: any) => s.id === activeStickerId);
            if (target) {
              store.updateSticker(activeStickerId, {
                endTime: Math.max(target.startTime + 0.2, Math.min(timeOnTimeline, displayDuration))
              });
            }
            break;
          }
          case 'sticker-move': {
            if (!activeStickerId) break;
            const target = store.stickers.find((s: any) => s.id === activeStickerId);
            if (target) {
              const duration = target.endTime - target.startTime;
              let newStart = timeOnTimeline - (duration / 2);
              let newEnd = newStart + duration;
              
              if (newStart < 0) { newStart = 0; newEnd = duration; }
              if (newEnd > displayDuration) { newEnd = displayDuration; newStart = displayDuration - duration; }
              
              store.updateSticker(activeStickerId, { startTime: newStart, endTime: newEnd });
            }
            break;
          }

          // ------------------------------------------
          // CÁC LOGIC HỆ THỐNG GỐC
          // ------------------------------------------
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
          case 'text-start': {
            if (!activeTextId) break;
            const target = store.texts.find((text: any) => text.id === activeTextId);
            if (target) {
              store.updateText(activeTextId, { start: Math.min(timeOnTimeline, target.end - 0.2) }); 
            }
            break;
          }
          case 'text-end': {
            if (!activeTextId) break;
            const target = store.texts.find((text: any) => text.id === activeTextId);
            if (target) {
              store.updateText(activeTextId, { end: Math.max(timeOnTimeline, target.start + 0.2) }); 
            }
            break;
          }
          case 'text-move': {
            if (!activeTextId) break;
            const target = store.texts.find((text: any) => text.id === activeTextId);
            if (!target) break;
            const duration = target.end - target.start;
            let newStart = timeOnTimeline - (duration / 2);
            let newEnd = newStart + duration;
            if (newStart < 0) { newStart = 0; newEnd = duration; }
            if (newEnd > displayDuration) { newEnd = displayDuration; newStart = displayDuration - duration; }
            store.updateText(activeTextId, { start: newStart, end: newEnd });
            break;
          }
          case 'audio-start': {
            const maxStart = store.audioConfig.end - 0.2;
            const minStart = store.audioConfig.end - store.audioDuration;
            const safeStart = Math.max(minStart, Math.min(timeOnTimeline, maxStart));
            store.setAudioConfig({ ...store.audioConfig, start: safeStart }); 
            break;
          }
          case 'audio-end': {
            const minEnd = store.audioConfig.start + 0.2;
            const maxEnd = store.audioConfig.start + store.audioDuration;
            const safeEnd = Math.max(minEnd, Math.min(timeOnTimeline, maxEnd));
            store.setAudioConfig({ ...store.audioConfig, end: safeEnd }); 
            break;
          }
          case 'audio-move': {
            const currentClipDuration = Math.min(store.audioConfig.end - store.audioConfig.start, store.audioDuration);
            let newStart = timeOnTimeline - (currentClipDuration / 2);
            let newEnd = newStart + currentClipDuration;
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
