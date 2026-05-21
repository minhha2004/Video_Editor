"use client";

import { useVideoStore } from '../../../../store/useVideoStore';

interface StickerElement {
  id: string;
  src: string;
  startTime: number;
  endTime: number;
  position: {
    x: number;
    y: number;
  };
  scale?: number;
  layer?: number;
}

export const StickerLayer = () => {
  const store = useVideoStore() as any;
  const { stickers, currentTime } = store;

  // HÀM XỬ LÝ XÓA ĐỒNG BỘ: Xóa sạch trên màn hình và dọn luôn Timeslot dưới Timeline
  const handleDeleteSticker = (id: string) => {
    // Tìm kiếm hàm xóa mặc định của Store để kích hoạt, nếu không có sẽ tự động override mảng
    if (store.removeSticker) {
      store.removeSticker(id);
    } else if (store.deleteSticker) {
      store.deleteSticker(id);
    } else {
      // Logic bóc tách loại bỏ sticker có ID tương ứng ra khỏi mảng lưu trữ
      const remainingStickers = stickers.filter((s: any) => s.id !== id);
      
      if (store.setStickers) {
        store.setStickers(remainingStickers);
      } else {
        // Cập nhật trạng thái dứt điểm trực tiếp vào Zustand Store
        useVideoStore.setState({ stickers: remainingStickers });
      }
    }
    
    // Reset tiêu điểm focus toàn cục về null để tránh kẹt khung viền cam
    (window as any).activeStickerId = null;
  };

  if (stickers.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {stickers.map((sticker: StickerElement) => {
        const isFocused = (window as any).activeStickerId === sticker.id;
        const isActive = currentTime >= sticker.startTime && currentTime <= sticker.endTime;
        
        const isCurrentlyDraggingIt = isFocused && (store.isDragging === 'sticker-pos' || store.isDragging === 'sticker-scale');
        
        if (!isActive && !isCurrentlyDraggingIt) return null;

        return (
          <div
            key={sticker.id}
            style={{
              left: `${sticker.position?.x ?? 50}%`,
              top: `${sticker.position?.y ?? 50}%`,
              transform: `translate(-50%, -50%) scale(${sticker.scale || 1})`,
              zIndex: sticker.layer || 30,
            }}
            className={`absolute pointer-events-auto cursor-move select-none ${
              isFocused ? "border-2 border-dashed border-amber-500 p-1" : ""
            }`}
            onMouseDown={(e) => {
              e.stopPropagation();
              (window as any).activeStickerId = sticker.id;
              
              const setDragging = store.setIsDragging || (() => {});
              setDragging("sticker-pos");
            }}
          >
            {/* NÚT XÓA NHANH "X" ĐỎ - NẰM Ở GÓC TRÊN BÊN PHẢI KHUNG FOCUS */}
            {isFocused && (
              <button
                title="Xóa Sticker khỏi dự án"
                className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 hover:bg-red-600 border-2 border-white text-white rounded-full flex items-center justify-center font-black text-[10px] cursor-pointer z-50 shadow-lg transition-all duration-150 active:scale-90 pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation(); // Chặn không cho kích hoạt sự kiện click xuống video
                  e.preventDefault();
                  handleDeleteSticker(sticker.id);
                }}
                onMouseDown={(e) => e.stopPropagation()} // Chặn giật lag khi đang click xóa mà chuột bị dịch chuyển
              >
                ✕
              </button>
            )}

            {/* Ảnh hiển thị Sticker (Auto Mix hoặc Custom AI) */}
            <img
              src={sticker.src}
              alt="AI Video Sticker"
              className="animate-in fade-in zoom-in duration-200 drop-shadow-xl"
              style={{
                maxWidth: '180px',
                maxHeight: '180px',
                objectFit: 'contain',
                pointerEvents: 'none' // Chặn ảnh bắt chuột để nhường cho lớp bọc ngoài điều hướng drag
              }}
            />

            {/* NÚT CO GIÃN KÍCH THƯỚC (RESIZE) - NẰM Ở GÓC DƯỚI BÊN PHẢI KHUNG FOCUS */}
            {isFocused && (
              <div
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-amber-500 border-2 border-white rounded-full cursor-se-resize z-50 shadow-md flex items-center justify-center pointer-events-auto active:scale-90"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  (window as any).activeStickerId = sticker.id;
                  
                  const setDragging = store.setIsDragging || (() => {});
                  setDragging("sticker-scale");
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};