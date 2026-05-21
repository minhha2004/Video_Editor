"use client";

import { useState } from 'react';
import { useVideoStore } from '../../../../store/useVideoStore';

interface TextLayerProps {
  onTextMouseDown: () => void;
}

export const TextLayer = ({ onTextMouseDown }: TextLayerProps) => {
  // Trích xuất toàn bộ state cần thiết từ Zustand Store gốc (Dòng chữ độc bản)
  const store = useVideoStore() as any;
  const { showText, currentTime, textConfig, setTextConfig, setShowText, setIsDragging } = store;
  
  // State cục bộ để chuyển đổi linh hoạt giữa chế độ Drag và Edit Text
  const [isEditingText, setIsEditingText] = useState(false);

  // Kiểm tra điều kiện hiển thị của Text Layer theo Timeline
  const isTextVisible = showText && textConfig && currentTime >= textConfig.start && currentTime <= textConfig.end;

  if (!isTextVisible) return null;

  return (
    <div 
      onMouseDown={(e) => {
        // Chỉ kích hoạt chức năng kéo di chuyển khi người dùng KHÔNG ở chế độ gõ sửa chữ
        if (!isEditingText) onTextMouseDown();
      }}
      onDoubleClick={() => setIsEditingText(true)}
      className={`absolute p-2 border transition-all group z-20 ${
        isEditingText 
          ? 'border-white/50 bg-black/40 rounded-lg cursor-text' 
          : 'border-dashed border-indigo-500/50 hover:border-indigo-500 cursor-move'
      }`}
      style={{ 
        left: `${textConfig.x}%`, 
        top: `${textConfig.y}%`, 
        transform: 'translate(-50%, -50%)' 
      }}
    >
      {/* NÚT XÓA NHANH TEXT (Hình tròn chữ ✕ màu đỏ) - Nằm ở góc trên bên phải */}
      {!isEditingText && (
        <button
          title="Xóa văn bản"
          className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 hover:bg-red-600 border-2 border-white text-white rounded-full flex items-center justify-center font-black text-[10px] cursor-pointer z-50 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation(); // Chặn lan truyền không kéo vị trí
            e.preventDefault();
            if (setShowText) {
              setShowText(false); // Ẩn hoàn toàn lớp text
            } else {
              useVideoStore.setState({ showText: false });
            }
          }}
          onMouseDown={(e) => e.stopPropagation()} // Chặn kích hoạt drag khi click nút xóa
        >
          ✕
        </button>
      )}

      {isEditingText ? (
        <input 
          type="text"
          autoFocus 
          value={textConfig.content}
          onChange={(e) => setTextConfig({...textConfig, content: e.target.value})}
          onBlur={() => setIsEditingText(false)} 
          onKeyDown={(e) => {
            if (e.key === 'Enter') setIsEditingText(false); 
          }}
          onMouseDown={(e) => e.stopPropagation()} 
          style={{ 
            fontSize: `${textConfig.fontSize}px`, 
            color: textConfig.color,
            width: `${Math.max(textConfig.content.length, 1)}ch` 
          }} 
          className="font-black drop-shadow-2xl uppercase block leading-none text-center bg-transparent outline-none text-white"
        />
      ) : (
        <span 
          style={{ 
            fontSize: `${textConfig.fontSize}px`, 
            color: textConfig.color 
          }} 
          className="font-black drop-shadow-2xl uppercase block leading-none whitespace-nowrap text-white pointer-events-none select-none"
        >
          {textConfig.content}
        </span>
      )}
      
      {/* NÚT CO GIÃN PHÓNG TO/THU NHỎ (RESIZE HANDLER) - Nằm ở góc dưới bên phải */}
      {!isEditingText && (
        <div
          className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-500 border-2 border-white rounded-full cursor-se-resize z-50 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-auto active:scale-90"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (setIsDragging) {
              setIsDragging("text-scale"); // Kích hoạt trạng thái kéo co giãn text
            } else {
              useVideoStore.setState({ isDragging: "text-scale" as any });
            }
          }}
        />
      )}
      
      {/* Tooltip hướng dẫn tinh tế */}
      {!isEditingText && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
          Double-click để sửa chữ
        </div>
      )}
    </div>
  );
};