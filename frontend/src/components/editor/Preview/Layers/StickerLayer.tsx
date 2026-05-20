import { useVideoStore } from '../../../../store/useVideoStore';

export const StickerLayer = () => {
  // Trích xuất đúng 2 state cần thiết từ Global Store
  const { stickers, currentTime } = useVideoStore();

  // Nếu không có sticker nào, không cần render DOM thừa
  if (stickers.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {stickers.map((sticker) => {
        // Kiểm tra kim thời gian (Playhead) có nằm trong khoảng xuất hiện của Sticker không
        const isActive = currentTime >= sticker.startTime && currentTime <= sticker.endTime;
        if (!isActive) return null;

        return (
          <img
            key={sticker.id}
            src={sticker.src}
            alt="AI Generated Sticker"
            className="absolute pointer-events-auto animate-in fade-in zoom-in duration-200 drop-shadow-xl"
            style={{
              left: `${sticker.position.x}%`,
              top: `${sticker.position.y}%`,
              transform: `translate(-50%, -50%) scale(${sticker.scale})`,
              zIndex: sticker.layer,
              maxWidth: '180px',
              maxHeight: '180px',
              objectFit: 'contain'
            }}
          />
        );
      })}
    </div>
  );
};