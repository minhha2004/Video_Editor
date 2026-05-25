"use client";
import { useState } from 'react';
import { useVideoStore } from '../../store/useVideoStore'; 
import { aiService } from '../../services/aiService';

export default function ExportPublisher() {
  const store = useVideoStore();
  const [shareLink, setShareLink] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastRenderedName, setLastRenderedName] = useState('');

  const handleExport = async () => {
    if (!store.videoFile) return;
    store.setIsProcessing(true);
    setShareLink(''); // Reset link cũ khi render mới
    setLastRenderedName(''); // Reset trạng thái video cũ để ẩn nút Publish cũ
    
    const formData = new FormData();
    formData.append('video', store.videoFile);
    
    const metadata = {
      trimStart: store.trimStart, 
      trimEnd: store.trimEnd,
      activeSegments: store.activeSegments,
      isLandscape: store.isLandscape, 
      isVideoMuted: store.isVideoMuted,
      text: store.showText ? store.textConfig : null,
      subtitles: store.subtitles
    };
    formData.append('config', JSON.stringify(metadata));

    try {
      // 1. Thực hiện Render Video qua AI Service hệ thống
      const blob = await aiService.renderVideo(formData);
      
      // ĐỒNG BỘ TÊN FILE: Fix cứng tên file trùng khớp với giá trị 'out_path' ở Backend main.py
      const videoName = "short_video_export.mp4";
      setLastRenderedName(videoName);

      // Tải file về máy cá nhân theo logic nguyên bản
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
        {/* ĐIỀU KIỆN ẨN HIỆN ĐÃ TỐI ƯU: 
            Nếu chưa render xong HOẶC đang trong quá trình xử lý -> Hiện nút Render.
            Nếu đã render xong (có lastRenderedName) và KHÔNG trong quá trình xử lý -> Ẩn nút Render, chỉ hiện nút Publish Link */}
        {(!lastRenderedName || store.isProcessing) ? (
          <button 
            onClick={handleExport} 
            disabled={store.isProcessing || !store.videoSrc} 
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 px-6 py-2 rounded text-[11px] font-bold text-white uppercase tracking-widest transition-all"
          >
            {store.isProcessing ? "Processing..." : "Render"}
          </button>
        ) : (
          /* Nút Publisher xuất hiện thay thế hoàn toàn sau khi Render hoàn tất thành công */
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

      {/* Hiển thị khung chứa link chia sẻ khi bấm Publish thành công */}
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