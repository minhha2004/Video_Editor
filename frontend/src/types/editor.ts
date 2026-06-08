/**
 * Cấu hình cho lớp chữ (Text Layer) hiển thị thủ công trên video
 */
export interface TextConfig {
  content: string;
  fontSize: number;
  x: number; // Vị trí % theo chiều ngang
  y: number; // Vị trí % theo chiều dọc
  color: string;
  start: number; // Thời điểm bắt đầu xuất hiện (giây)
  end: number;   // Thời điểm biến mất (giây)
}

export interface TextElement extends TextConfig {
  id: string;
  type: 'text';
  layer: number;
}

/**
 * Cấu hình cho tệp âm thanh bổ sung (Background Music/AI Voice)
 */
export interface AudioConfig {
  start: number;  // Thời điểm bắt đầu chơi trên timeline (giây)
  end: number;    // Thời điểm kết thúc trên timeline (giây)
  volume: number; // Âm lượng từ 0.0 đến 1.0
}

/**
 * Định nghĩa cấu trúc Phụ đề AI (được trả về từ Python Backend)
 */
export interface SubtitleItem {
  id?: string | number;
  text: string;
  start: number;
  end: number;
}

/**
 * Định nghĩa cấu trúc của Sticker (Auto Mixing)
 */
export interface StickerElement {
  id: string;
  type: 'sticker';
  src: string;
  startTime: number;
  endTime: number;
  layer: number;
  position: { x: number; y: number };
  scale: number;
}

/**
 * Các Tab chức năng chính trong Sidebar (Đã thêm assets)
 */
export type ActiveTab = 'media' | 'assets' | 'text' | 'music';

/**
 * Định nghĩa các loại hành động kéo thả (Drag & Drop) trên Timeline và Preview
 */
export type DragType = 
  | 'trim-start' | 'trim-end' | 'video-move' 
  | 'text-start' | 'text-end' | 'text-move' 
  | 'audio-start' | 'audio-end' | 'audio-move' 
  | 'text-pos' | 'text-scale'
  | 'sticker-start' | 'sticker-end' | 'sticker-move'
  | 'sticker-pos' | 'sticker-scale'
  | 'playhead' | null;

/**
 * Cấu hình tổng quát gửi sang Backend Python để Render
 */
export interface RenderConfig {
  trimStart: number;
  trimEnd: number;
  isLandscape: boolean;
  isVideoMuted: boolean;
  text: TextConfig | null;
  texts?: TextElement[];
  audio: AudioConfig | null;
  subtitles: SubtitleItem[];
  stickers: StickerElement[]; // Bổ sung để Backend biết cần chèn sticker nào
}
