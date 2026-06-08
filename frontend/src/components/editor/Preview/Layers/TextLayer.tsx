"use client";

import { useState } from 'react';
import { useVideoStore } from '../../../../store/useVideoStore';

interface TextLayerProps {
  onTextMouseDown: () => void;
}

export const TextLayer = ({ onTextMouseDown }: TextLayerProps) => {
  const store = useVideoStore() as any;
  const { currentTime, texts, setTextConfig, updateText, removeText, setIsDragging, saveHistory } = store;
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  if (!texts || texts.length === 0) return null;

  return (
    <>
      {texts.map((text: any) => {
        const isTextVisible = currentTime >= text.start && currentTime <= text.end;
        const isFocused = (window as any).activeTextId === text.id;
        const isDraggingThisText = isFocused && (store.isDragging === 'text-pos' || store.isDragging === 'text-scale');
        const isEditingText = editingTextId === text.id;

        if (!isTextVisible && !isDraggingThisText) return null;

        return (
          <div 
            key={text.id}
            onMouseDown={() => {
              if (!isEditingText) {
                (window as any).activeTextId = text.id;
                setTextConfig(text);
                onTextMouseDown();
              }
            }}
            onDoubleClick={() => setEditingTextId(text.id)}
            className={`absolute p-2 border transition-all group z-20 ${
              isEditingText 
                ? 'border-white/50 bg-black/40 rounded-lg cursor-text' 
                : 'border-dashed border-indigo-500/50 hover:border-indigo-500 cursor-move'
            }`}
            style={{ 
              left: `${text.x}%`, 
              top: `${text.y}%`, 
              transform: 'translate(-50%, -50%)',
              zIndex: text.layer || 60
            }}
          >
            {!isEditingText && (
              <button
                title="Xóa văn bản"
                className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 hover:bg-red-600 border-2 border-white text-white rounded-full flex items-center justify-center font-black text-[10px] cursor-pointer z-50 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  saveHistory();
                  removeText(text.id);
                  (window as any).activeTextId = null;
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                ✕
              </button>
            )}

            {isEditingText ? (
              <input 
                type="text"
                autoFocus 
                value={text.content}
                onChange={(e) => updateText(text.id, { content: e.target.value })}
                onBlur={() => setEditingTextId(null)} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingTextId(null); 
                }}
                onMouseDown={(e) => e.stopPropagation()} 
                style={{ 
                  fontSize: `${text.fontSize}px`, 
                  color: text.color,
                  width: `${Math.max(text.content.length, 1)}ch` 
                }} 
                className="font-black drop-shadow-2xl uppercase block leading-none text-center bg-transparent outline-none text-white"
              />
            ) : (
              <span 
                style={{ 
                  fontSize: `${text.fontSize}px`, 
                  color: text.color 
                }} 
                className="font-black drop-shadow-2xl uppercase block leading-none whitespace-nowrap text-white pointer-events-none select-none"
              >
                {text.content}
              </span>
            )}
            
            {!isEditingText && (
              <div
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-500 border-2 border-white rounded-full cursor-se-resize z-50 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-auto active:scale-90"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  (window as any).activeTextId = text.id;
                  setTextConfig(text);
                  setIsDragging("text-scale");
                }}
              />
            )}
            
            {!isEditingText && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                Double-click để sửa chữ
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
