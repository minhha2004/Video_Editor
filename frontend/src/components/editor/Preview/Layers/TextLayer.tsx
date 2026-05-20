import { useState } from 'react';
import { useVideoStore } from '../../../../store/useVideoStore';

interface TextLayerProps {
  onTextMouseDown: () => void;
}

export const TextLayer = ({ onTextMouseDown }: TextLayerProps) => {
  // Trích xuất toàn bộ state cần thiết để theo dõi và cập nhật Text Configuration
  const { showText, currentTime, textConfig, setTextConfig } = useVideoStore();
  
  // State cục bộ để chuyển đổi linh hoạt giữa chế độ Drag và Edit Text
  const [isEditingText, setIsEditingText] = useState(false);

  // Kiểm tra điều kiện hiển thị của Text Layer theo Timeline
  const isTextVisible = showText && currentTime >= textConfig.start && currentTime <= textConfig.end;

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
          : 'border-transparent hover:border-indigo-500/50 cursor-move'
      }`}
      style={{ 
        left: `${textConfig.x}%`, 
        top: `${textConfig.y}%`, 
        transform: 'translate(-50%, -50%)' 
      }}
    >
      {isEditingText ? (
        <input 
          type="text"
          autoFocus // Tự động đưa con trỏ chuột vào ô nhập liệu khi double click
          value={textConfig.content}
          onChange={(e) => setTextConfig({...textConfig, content: e.target.value})}
          onBlur={() => setIsEditingText(false)} // Tự động thoát chế độ sửa khi click ra vùng ngoài
          onKeyDown={(e) => {
            if (e.key === 'Enter') setIsEditingText(false); // Thoát chế độ sửa nhanh khi ấn Enter
          }}
          onMouseDown={(e) => e.stopPropagation()} // Chặn sự kiện drag của Box để con trỏ chuột có thể bôi đen/chọn từng chữ
          style={{ 
            fontSize: `${textConfig.fontSize}px`, 
            color: textConfig.color,
            width: `${Math.max(textConfig.content.length, 1)}ch` // Tự động co giãn bề ngang input theo số lượng ký tự
          }} 
          className="font-black drop-shadow-2xl uppercase block leading-none text-center bg-transparent outline-none text-white"
        />
      ) : (
        <span 
          style={{ 
            fontSize: `${textConfig.fontSize}px`, 
            color: textConfig.color 
          }} 
          className="font-black drop-shadow-2xl uppercase block leading-none whitespace-nowrap text-white pointer-events-none"
        >
          {textConfig.content}
        </span>
      )}
      
      {/* Tooltip hướng dẫn tinh tế (chỉ hiện khi hover chuột vào và đang không ở chế độ sửa) */}
      {!isEditingText && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap pointer-events-none">
          Double-click để sửa
        </div>
      )}
    </div>
  );
};