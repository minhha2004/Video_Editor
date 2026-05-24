// src/store/useVideoStore.ts
import { create } from 'zustand';
import { TextConfig, AudioConfig, ActiveTab, DragType, StickerElement } from '../types/editor';

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
  activeSegments: VideoSegment[];
  trimStart: number;
  trimEnd: number;
  textConfig: TextConfig;
  audioConfig: AudioConfig;
  isDragging: DragType;

  // --- HISTORY (UNDO/REDO) ---
  history: any[];
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
  activeSegments: [],
  trimStart: 0,
  trimEnd: 0,
  isDragging: null,
  textConfig: {
    content: "SHORT EDITOR", fontSize: 40, x: 50, y: 50, color: "#ffffff", start: 0, end: 5
  },
  audioConfig: { start: 0, end: 5, volume: 1.0 },
  
  history: [],
  historyIndex: -1,

  setVideo: (file, url) => set({ 
    videoFile: file, 
    videoSrc: url, 
    trimStart: 0, 
    trimEnd: 0, 
    activeSegments: [], 
    totalTrimmedDuration: 0,
    stickers: [],
    history: [],
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
  setIsDragging: (dragType) => set({ isDragging: dragType }),

  saveHistory: () => set((state) => {
    const snapshot = {
      activeSegments: JSON.parse(JSON.stringify(state.activeSegments)),
      totalTrimmedDuration: state.totalTrimmedDuration,
      trimStart: state.trimStart,
      trimEnd: state.trimEnd,
      textConfig: { ...state.textConfig },
      subtitles: [...state.subtitles],
      stickers: JSON.parse(JSON.stringify(state.stickers)), 
      showText: state.showText
    };
    
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    return {
      history: [...newHistory, snapshot],
      historyIndex: newHistory.length
    };
  }),

  undo: () => set((state) => {
    if (state.historyIndex < 0) return {};
    
    const prevIndex = state.historyIndex - 1;
    if (prevIndex < -1) return {};

    if (prevIndex === -1) {
      return {
        activeSegments: [],
        totalTrimmedDuration: 0,
        trimStart: 0,
        trimEnd: 0,
        stickers: [], 
        historyIndex: -1
      };
    }

    return { ...state.history[prevIndex], historyIndex: prevIndex };
  }),

  redo: () => set((state) => {
    if (state.historyIndex >= state.history.length - 1) return {};
    const nextIndex = state.historyIndex + 1;
    return { ...state.history[nextIndex], historyIndex: nextIndex };
  }),
}));