import { useVideoStore } from '../../../../store/useVideoStore';

interface DropzoneOverlayProps {
  isDraggingOver: boolean;
}

export const DropzoneOverlay = ({ isDraggingOver }: DropzoneOverlayProps) => {
  // Trích xuất trạng thái videoSrc từ store để quyết định giao diện hiển thị
  const { videoSrc } = useVideoStore();

  return (
    <div
      className={`absolute inset-0 z-[10000] flex items-center justify-center transition-all duration-300 pointer-events-none ${
        isDraggingOver ? 'bg-zinc-800/90' : 'bg-transparent'
      }`}
    >
      {/* --- MÀN HÌNH CHỜ MINIMALIST (LÚC CHƯA CÓ VIDEO) --- */}
      {!videoSrc && (
        <div className={`flex flex-col items-center justify-center text-center transition-all duration-300 ${
          isDraggingOver ? 'scale-110' : 'scale-100'
        }`}>
          {/* Dấu cộng in mờ tối giản */}
          <div className={`transition-all duration-300 ${
            isDraggingOver ? 'opacity-100 text-indigo-400' : 'opacity-20 text-zinc-600'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          {/* Chữ in đậm tracking rộng sang trọng */}
          <p className={`text-[10px] md:text-xs font-black tracking-[0.4em] uppercase mt-5 transition-all duration-300 ${
            isDraggingOver ? 'opacity-100 text-indigo-400' : 'opacity-40 text-zinc-500'
          }`}>
            {isDraggingOver ? "DROP NOW" : "DRAG VIDEO HERE"}
          </p>
        </div>
      )}

      {/* --- UI CHỈ BÁO KHI ĐÃ CÓ VIDEO VÀ MUỐN KÉO THẢ THAY THẾ --- */}
      {videoSrc && isDraggingOver && (
        <div className="text-center animate-in fade-in duration-300 scale-110">
          <div className="bg-indigo-600 p-4 rounded-full text-white shadow-2xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </div>
          <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">
            Drop to Replace
          </p>
        </div>
      )}
    </div>
  );
};