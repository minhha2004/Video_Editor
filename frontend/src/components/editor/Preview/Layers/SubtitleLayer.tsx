import { useVideoStore } from '../../../../store/useVideoStore';

export const SubtitleLayer = () => {
  // Chỉ lấy đúng 2 state cần thiết cho việc hiển thị phụ đề
  const { subtitles, currentTime } = useVideoStore();

  if (subtitles.length === 0) return null;

  return (
    <div className="absolute inset-x-0 bottom-6 flex flex-col items-center justify-end pointer-events-none z-30 px-5">
      {subtitles.map((sub, index) => {
        if (!sub.text) return null;
        const start = Number(sub.start);
        const end = Number(sub.end);
        
        // Kiểm tra xem kim thời gian có đang nằm trong đoạn phụ đề này không
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
  );
};