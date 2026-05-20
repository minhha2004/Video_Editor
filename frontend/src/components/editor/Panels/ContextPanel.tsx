"use client";
import { useVideoStore } from '../../../store/useVideoStore';

// Import 4 file Tab chúng ta vừa tách ra
import { MediaTab } from './Tabs/MediaTab';
import { AssetsTab } from './Tabs/AssetsTab';
import { TextTab } from './Tabs/TextTab';
import { MusicTab } from './Tabs/MusicTab';

export const ContextPanel = () => {
  // Bây giờ ContextPanel chỉ cần quan tâm đúng 1 thứ: Người dùng đang ở Tab nào?
  const { activeTab } = useVideoStore();

  return (
    <nav className="w-80 bg-[#121214] border-r border-white/5 flex flex-col shrink-0 p-6 shadow-2xl overflow-y-auto custom-scrollbar">
      {/* Render Component tương ứng với Tab được chọn */}
      {activeTab === 'media' && <MediaTab />}
      {activeTab === 'assets' && <AssetsTab />}
      {activeTab === 'text' && <TextTab />}
      {activeTab === 'music' && <MusicTab />}
    </nav>
  );
};