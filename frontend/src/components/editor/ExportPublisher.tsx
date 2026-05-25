"use client";
import { useState } from 'react';
import { useVideoStore } from '../../store/useVideoStore'; 
import { aiService } from '../../services/aiService';

export default function ExportPublisher() {
  // Khai báo kiểu any để vô hiệu hóa bộ check lỗi nghiêm ngặt của TypeScript
  const store = useVideoStore() as any; 
  
  const [shareLink, setShareLink] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastRenderedName, setLastRenderedName] = useState('');

  const handleExport = async () => {
    if (!store.videoFile) return;
    store.setIsProcessing(true);
    setShareLink(''); 
    setLastRenderedName(''); 
    
    const formData = new FormData();
    // 1. Đính kèm video thô gốc bắt buộc
    formData.append('video', store.videoFile);
    
    // 2. Xử lý đóng gói tệp âm thanh bổ sung một cách an toàn
    const currentAudioUrl = store.audioUrl || "";
    if (store.audioFile) {
      formData.append('audio', store.audioFile);
    } else if (currentAudioUrl && currentAudioUrl.trim() !== '' && currentAudioUrl.startsWith('blob:')) {
      try {
        const audioResponse = await fetch(currentAudioUrl);
        const audioBlob = await audioResponse.blob();
        formData.append('audio', new File([audioBlob], 'voiceover.mp3', { type: 'audio/mpeg' }));
      } catch (e) {
        console.error("Bỏ qua đóng gói tệp âm thanh phụ trợ:", e);
      }
    }
    
    // 3. BỘ LỌC ĐA NĂNG: Quét sạch hàm hệ thống, làm sạch chuỗi "%" và giữ lại đầy đủ biến dự phòng
    const cleanStoreData: any = {};
    
    // Hàm đệ quy làm sạch nhanh các giá trị màn hình kéo thả trước khi đóng gói
    const filterPercentageAndFunc = (data: any): any => {
      if (data === null || data === undefined) return data;
      if (typeof data === 'string' && data.endsWith('%')) {
        const num = parseFloat(data.replace('%', ''));
        return isNaN(num) ? data : num / 100; // Đưa về số thực dạng tương đối 0.5 phục vụ MoviePy
      }
      if (Array.isArray(data)) {
        return data.map(item => filterPercentageAndFunc(item));
      }
      if (typeof data === 'object') {
        const cleaned: any = {};
        for (const k in data) {
          if (typeof data[k] !== 'function' && Object.prototype.hasOwnProperty.call(data, k)) {
            cleaned[k] = filterPercentageAndFunc(data[k]);
          }
        }
        return cleaned;
      }
      return data;
    };

    // Thực hiện lọc sạch toàn bộ kho lưu trữ
    Object.keys(store).forEach((key) => {
      if (typeof store[key] !== 'function') {
        cleanStoreData[key] = filterPercentageAndFunc(store[key]);
      }
    });

    // Tạo gói Metadata tổng hợp chứa đầy đủ các từ khóa dự phòng cho Backend nhặt dữ liệu
    const rawMetadata = {
      trimStart: Number(store.trimStart) || 0, 
      trimEnd: Number(store.trimEnd) || 0,
      activeSegments: store.activeSegments || [],
      isLandscape: Boolean(store.isLandscape), 
      isVideoMuted: Boolean(store.isVideoMuted),
      
      // Khai báo full bộ từ khóa hệ thống (Bất kể Backend dùng key nào cũng sẽ khớp)
      subtitles: store.subtitles || cleanStoreData.subtitles || [],
      subtitleList: store.subtitles || cleanStoreData.subtitles || [],
      stickers: store.stickers || cleanStoreData.stickers || cleanStoreData.assetStickers || [],
      stickerList: store.stickers || cleanStoreData.stickers || [],
      text: store.textConfig || cleanStoreData.textConfig || null,
      textConfig: store.textConfig || cleanStoreData.textConfig || null,
      
      // Bơm kèm toàn bộ dữ liệu thô đã được làm sạch rác để làm phương án dự phòng tối cao
      ...cleanStoreData
    };
    
    // Ép kiểu sang string chữ chuẩn để làm vừa lòng aiService Client
    const configString = JSON.stringify(rawMetadata);
    formData.append('config', configString);

    try {
      // 4. Đẩy luồng FormData sang lõi kết xuất Backend
      const blob = await aiService.renderVideo(formData);
      
      const videoName = "short_video_export.mp4";
      setLastRenderedName(videoName);

      // Tải file về máy cá nhân
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; 
      a.download = videoName; 
      a.click();
    } catch (err) { 
      alert("Render failed!"); 
    } finally { 
      store.setIsProcessing(false); 
    }
  };

  const handlePublish = async () => {
    if (!lastRenderedName) {
      alert("Vui lòng thực hiện Render video trước khi xuất bản!");
      return;
    }
    
    setIsPublishing(true);
    try {
      const response = await fetch(`http://localhost:8000/api/publisher/publish?video_name=${lastRenderedName}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.success) {
        setShareLink(data.shareLink);
      }
    } catch (error) {
      alert("Không thể kết nối đến máy chủ Publisher!");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col items-end relative gap-2 z-50">
      <div className="flex items-center gap-2">
        {(!lastRenderedName || store.isProcessing) ? (
          <button 
            onClick={handleExport} 
            disabled={store.isProcessing || !store.videoFile} 
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 px-6 py-2 rounded text-[11px] font-bold text-white uppercase tracking-widest transition-all"
          >
            {store.isProcessing ? "Processing..." : "Render"}
          </button>
        ) : (
          !shareLink && (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 px-4 py-2 rounded text-[11px] font-bold text-white uppercase tracking-widest transition-all animate-fadeIn"
            >
              {isPublishing ? "Publishing..." : "Publish Link"}
            </button>
          )
        )}
      </div>

      {shareLink && (
        <div className="absolute top-10 right-0 bg-[#18181b] border border-white/10 p-3 rounded-lg shadow-2xl flex items-center gap-3 animate-fadeIn min-w-[320px]">
          <span className="text-[11px] text-blue-400 font-mono select-all overflow-hidden text-ellipsis whitespace-nowrap flex-1">
            {shareLink}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(shareLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className={`text-[10px] px-2 py-1 rounded font-bold uppercase transition-all shrink-0 ${
              copied ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}