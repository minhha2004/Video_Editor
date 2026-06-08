// src/store/useVideoStore.ts
import { create } from 'zustand';
import { TextConfig, TextElement, AudioConfig, ActiveTab, DragType, StickerElement } from '../types/editor';

interface VideoSegment {
  start: number;
  end: number;
  duration: number;
}

interface VideoState {
  // --- MEDIA STATE ---
  videoSrc: string | null;
  videoFile: File | null;
  audioSrc: string | null;
  audioFile: File | null;
  audioDuration: number;
  currentTime: number;
  duration: number;
  totalTrimmedDuration: number;
  isPlaying: boolean;
  isVideoMuted: boolean;
  isLandscape: boolean;
  isProcessing: boolean;
  activeTab: ActiveTab;
  showText: boolean;

  // --- CONFIG & AI STATE ---
  subtitles: any[];
  stickers: StickerElement[];
  texts: TextElement[];
  activeSegments: VideoSegment[];
  trimStart: number;
  trimEnd: number;
  textConfig: TextConfig;
  audioConfig: AudioConfig;
  isDragging: DragType;

  // --- HISTORY (UNDO/REDO) ---
  history: any[];
  redoHistory: any[];
  historyIndex: number;

  // --- ACTIONS ---
  setVideo: (file: File | null, url: string | null) => void;
  setAudio: (file: File | null, url: string | null) => void;
  setAudioDuration: (duration: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setIsVideoMuted: (muted: boolean) => void;
  setShowText: (show: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  setIsLandscape: (landscape: boolean) => void;
  setSubtitles: (subs: any[]) => void;
  clearSubtitles: () => void; // Action mới để xoá sub
  
  // --- STICKER ACTIONS ---
  setStickers: (stickers: StickerElement[]) => void;
  addAutoStickers: (autoStickers: StickerElement[]) => void;
  updateSticker: (id: string, updates: Partial<StickerElement>) => void;
  removeSticker: (id: string) => void;
  addText: () => void;
  updateText: (id: string, updates: Partial<TextElement>) => void;
  removeText: (id: string) => void;
  setTexts: (texts: TextElement[]) => void;

  // --- TRIM & TEXT ACTIONS ---
  setActiveSegments: (segments: {start: number, end: number}[]) => void;
  setTrimStart: (time: number) => void;
  setTrimEnd: (time: number) => void;
  setTextConfig: (config: TextConfig) => void;
  setAudioConfig: (config: AudioConfig) => void;
  setIsDragging: (dragType: DragType) => void;

  // --- HISTORY ACTIONS ---
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
}

const createHistorySnapshot = (state: VideoState) => ({
  activeSegments: JSON.parse(JSON.stringify(state.activeSegments)),
  totalTrimmedDuration: state.totalTrimmedDuration,
  trimStart: state.trimStart,
  trimEnd: state.trimEnd,
  textConfig: { ...state.textConfig },
  texts: JSON.parse(JSON.stringify(state.texts)),
  audioConfig: { ...state.audioConfig },
  audioSrc: state.audioSrc,
  audioFile: state.audioFile,
  audioDuration: state.audioDuration,
  isVideoMuted: state.isVideoMuted,
  isLandscape: state.isLandscape,
  subtitles: JSON.parse(JSON.stringify(state.subtitles)),
  stickers: JSON.parse(JSON.stringify(state.stickers)), 
  showText: state.showText
});

const undoableDragTypes = new Set([
  'trim-start',
  'trim-end',
  'video-move',
  'text-start',
  'text-end',
  'text-move',
  'audio-start',
  'audio-end',
  'audio-move',
  'text-pos',
  'text-scale',
  'sticker-start',
  'sticker-end',
  'sticker-move',
  'sticker-pos',
  'sticker-scale'
]);

export const useVideoStore = create<VideoState>((set) => ({
  videoSrc: null,
  videoFile: null,
  audioSrc: null,
  audioFile: null,
  audioDuration: 0,
  currentTime: 0,
  duration: 0,
  totalTrimmedDuration: 0,
  isPlaying: false,
  isVideoMuted: false,
  isLandscape: false,
  isProcessing: false,
  showText: false,
  activeTab: 'media',
  subtitles: [],
  stickers: [],
  texts: [],
  activeSegments: [],
  trimStart: 0,
  trimEnd: 0,
  isDragging: null,
  textConfig: {
    content: "SHORT EDITOR", fontSize: 40, x: 50, y: 50, color: "#ffffff", start: 0, end: 5
  },
  audioConfig: { start: 0, end: 5, volume: 1.0 },
  
  history: [],
  redoHistory: [],
  historyIndex: -1,

  setVideo: (file, url) => set({ 
    videoFile: file, 
    videoSrc: url, 
    trimStart: 0, 
    trimEnd: 0, 
    activeSegments: [], 
    totalTrimmedDuration: 0,
    stickers: [],
    texts: [],
    history: [],
    redoHistory: [],
    historyIndex: -1 
  }),
  
  setAudio: (file, url) => set({ audioFile: file, audioSrc: url }),
  setAudioDuration: (duration) => set({ audioDuration: duration }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration: duration }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setIsVideoMuted: (muted) => set({ isVideoMuted: muted }),
  setShowText: (show) => set({ showText: show }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setIsLandscape: (landscape) => set({ isLandscape: landscape }),
  setSubtitles: (subs) => set({ subtitles: subs }),
  clearSubtitles: () => set({ subtitles: [] }), // Logic xoá sub

  setStickers: (stickers) => set({ stickers }),
  
  addAutoStickers: (autoStickers) => set((state) => {
    const currentStickers = state.stickers || [];
    const merged = [...currentStickers, ...autoStickers];
    const uniqueStickers = merged.filter((sticker, index, self) =>
      self.findIndex((s) => s.id === sticker.id) === index
    );
    return { stickers: uniqueStickers };
  }),
  
  updateSticker: (id, updates) => set((state) => ({
    stickers: state.stickers.map((s) => 
      s.id === id ? { ...s, ...updates } : s
    )
  })),
  
  removeSticker: (id) => set((state) => ({
    stickers: state.stickers.filter((s) => s.id !== id)
  })),

  addText: () => set((state) => {
    const duration = state.totalTrimmedDuration > 0 ? state.totalTrimmedDuration : state.duration;
    const start = Math.max(0, state.currentTime || 0);
    const end = Math.min(duration || 5, start + 5);
    const text: TextElement = {
      id: `text_${Date.now().toString(36)}`,
      type: 'text',
      content: 'SHORT EDITOR',
      fontSize: 40,
      x: 50,
      y: 50,
      color: '#ffffff',
      start,
      end: end > start ? end : start + 5,
      layer: 60
    };

    return {
      texts: [...state.texts, text],
      showText: true,
      textConfig: text
    };
  }),

  updateText: (id, updates) => set((state) => {
    const texts = state.texts.map((text) => 
      text.id === id ? { ...text, ...updates } : text
    );
    const activeText = texts.find((text) => text.id === id);
    return {
      texts,
      textConfig: activeText ? activeText : state.textConfig
    };
  }),

  removeText: (id) => set((state) => {
    const texts = state.texts.filter((text) => text.id !== id);
    return {
      texts,
      showText: texts.length > 0,
      textConfig: texts[0] || state.textConfig
    };
  }),

  setTexts: (texts) => set((state) => ({
    texts,
    showText: texts.length > 0,
    textConfig: texts[0] || state.textConfig
  })),

  setActiveSegments: (segments) => {
    const processed = segments.map(s => ({
      start: s.start,
      end: s.end,
      duration: s.end - s.start
    }));
    const total = processed.reduce((sum, s) => sum + s.duration, 0);
    set({ 
      activeSegments: processed, 
      totalTrimmedDuration: total,
      currentTime: 0,
      trimStart: 0, 
      trimEnd: 0
    });
  },

  setTrimStart: (time) => set({ trimStart: time }),
  setTrimEnd: (time) => set({ trimEnd: time }),
  setTextConfig: (config) => set({ textConfig: config }),
  setAudioConfig: (config) => set({ audioConfig: config }),
  setIsDragging: (dragType) => set((state) => {
    const shouldSaveDragStart = Boolean(
      dragType &&
      state.isDragging === null &&
      undoableDragTypes.has(String(dragType))
    );

    if (!shouldSaveDragStart) return { isDragging: dragType };

    const newHistory = [...state.history, createHistorySnapshot(state)];
    return {
      isDragging: dragType,
      history: newHistory,
      redoHistory: [],
      historyIndex: newHistory.length - 1
    };
  }),

  saveHistory: () => set((state) => {
    const snapshot = createHistorySnapshot(state);
    const newHistory = [...state.history, snapshot];
    return {
      history: newHistory,
      redoHistory: [],
      historyIndex: newHistory.length - 1
    };
  }),

  undo: () => set((state) => {
    if (state.history.length === 0) return {};

    const previousSnapshot = state.history[state.history.length - 1];
    const currentSnapshot = createHistorySnapshot(state);
    const newHistory = state.history.slice(0, -1);

    return {
      ...previousSnapshot,
      history: newHistory,
      redoHistory: [currentSnapshot, ...state.redoHistory],
      historyIndex: newHistory.length - 1,
      isDragging: null,
      isPlaying: false
    };
  }),

  redo: () => set((state) => {
    if (state.redoHistory.length === 0) return {};

    const nextSnapshot = state.redoHistory[0];
    const currentSnapshot = createHistorySnapshot(state);
    const newHistory = [...state.history, currentSnapshot];

    return {
      ...nextSnapshot,
      history: newHistory,
      redoHistory: state.redoHistory.slice(1),
      historyIndex: newHistory.length - 1,
      isDragging: null,
      isPlaying: false
    };
  }),
}));
