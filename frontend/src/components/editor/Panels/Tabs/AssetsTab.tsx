"use client";
import { useRef, useState } from 'react';
import { useVideoStore } from '../../../../store/useVideoStore';
import { StickerElement } from '../../../../types/editor';

export const AssetsTab = () => {
  const { stickers, setStickers, subtitles } = useVideoStore();
  const [isRemovingBg, setIsRemovingBg] = useState(false); // Trạng thái loading khi AI xóa nền
  const [isMixing, setIsMixing] = useState(false);         // Trạng thái loading khi Auto Mix
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LOGIC: TỰ CHẾ STICKER AI (IMAGE-TO-STICKER BACKGROUND REMOVER) ---
  const handleCustomStickerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      alert("Please select valid image files only (png, jpg, jpeg)!");
      return;
    }

    setIsRemovingBg(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/remove-bg", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("AI Background removal API returned invalid data structure.");
      }

      const data = await response.json();
      
      if (data.success && data.sticker) {
        setStickers([...stickers, data.sticker]);
      }
    } catch (error) {
      console.error("Lỗi bóc tách nền:", error);
      alert("AI Background removal failed. Please check backend API logs.");
    } finally {
      setIsRemovingBg(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };

  // --- LOGIC: TỰ ĐỘNG MIX STICKER THEO PHỤ ĐỀ (BỎ HOÀN TOÀN ĐỘ TRỄ) ---
  const handleAutoMix = async () => {
    if (subtitles.length === 0) {
      alert("Please generate subtitles (STT) before using Auto Mix feature!");
      return;
    }
    
    setIsMixing(true);
    try {
      const response = await fetch("http://localhost:8000/api/ai/auto-mix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subtitles) 
      });

      if (!response.ok) {
        throw new Error("Auto Mix API returned an error status.");
      }

      const data = await response.json();
      if (data.success && data.stickers) {
        const existingIds = new Set(stickers.map((sticker) => sticker.id));
        const mergedStickers = [
          ...stickers,
          ...data.stickers.filter((sticker: StickerElement) => !existingIds.has(sticker.id))
        ];
        setStickers(mergedStickers);
      }
    } catch (error) {
      console.error("Lỗi hệ thống khi chạy Auto Mix:", error);
      alert("Auto Mix failed to respond. Please check your backend FastAPI logs!");
    } finally {
      setIsMixing(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
          Assets & Elements
        </h3>
      </div>

      {/* Button Group */}
      <div className="flex flex-col gap-2.5">
        {/* Nút 1: Custom Sticker (Màu Cam Gradient) */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isRemovingBg || isMixing}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 border border-white/5 text-white font-black text-[11px] tracking-widest uppercase rounded-lg transition-all duration-200 shadow-lg shadow-orange-950/10 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {isRemovingBg ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processing AI...</span>
            </>
          ) : (
            <span>Create Custom Sticker</span>
          )}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleCustomStickerUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Nút 2: Auto Mix Sticker (Màu Tím Gradient) */}
        <button
          onClick={handleAutoMix}
          disabled={isMixing || isRemovingBg}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 border border-white/5 text-white font-black text-[11px] tracking-widest uppercase rounded-lg transition-all duration-200 shadow-lg shadow-indigo-950/10 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {isMixing ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Analyzing Context...</span>
            </>
          ) : (
            <span>Auto Mix Sticker</span>
          )}
        </button>
      </div>

      {/* --- ELEMENTS LIST --- */}
      <div className="pt-3.5 border-t border-white/5">
        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-2.5">
          Elements list ({stickers.length})
        </div>
        
        {stickers.length === 0 ? (
          <div className="h-32 rounded-lg border border-dashed border-white/5 bg-zinc-900/10 flex items-center justify-center text-center p-4">
            <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest select-none">
              No stickers yet
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {stickers.map((sticker) => (
              <div 
                key={sticker.id} 
                className="aspect-square bg-zinc-900/40 rounded-lg border border-white/5 p-1.5 flex items-center justify-center relative group hover:border-zinc-700 transition-colors"
              >
                <img 
                  src={sticker.src} 
                  alt="Sticker item" 
                  className="max-w-full max-h-full object-contain drop-shadow-md"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                  <span className="text-[8px] font-black uppercase text-zinc-400 tracking-wider">Active</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
