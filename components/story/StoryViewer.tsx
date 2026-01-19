import React, { useState, useEffect, useRef } from 'react';
import { GroupedStories, Story } from '../../types';
import { DEFAULT_AVATAR } from '../../constants';
import { storyService } from '../../services/features/storyService';

interface StoryViewerProps {
  group: GroupedStories;
  onClose: () => void;
  onNextGroup: () => void;
  onPrevGroup: () => void;
  currentUserId: string;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ group, onClose, onNextGroup, onPrevGroup, currentUserId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const currentStory = group.stories[currentIndex];
  const DURATION = 5000; // 5 Detik default untuk image/text
  const isOwner = group.user.id === currentUserId;

  useEffect(() => {
    setProgress(0);
  }, [currentIndex, group]);

  useEffect(() => {
    if (isPaused) return;

    let interval: any;
    // Jika video, progress mengikuti currentTime video
    if (currentStory.media_type === 'video') {
       // Handled by onTimeUpdate di element video
    } else {
       // Timer manual untuk image/text
       const step = 100 / (DURATION / 50); // update tiap 50ms
       interval = setInterval(() => {
           setProgress(prev => {
               if (prev >= 100) {
                   handleNext();
                   return 0;
               }
               return prev + step;
           });
       }, 50);
    }
    return () => clearInterval(interval);
  }, [currentIndex, currentStory, isPaused]);

  const handleNext = () => {
      if (currentIndex < group.stories.length - 1) {
          setCurrentIndex(currentIndex + 1);
      } else {
          onNextGroup();
      }
  };

  const handlePrev = () => {
      if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
      } else {
          onPrevGroup();
      }
  };

  const handleDelete = async () => {
      if (!confirm("Hapus story ini?")) return;
      try {
          setIsPaused(true);
          await storyService.deleteStory(currentStory.id);
          // Simple UX: close viewer, parent should refresh
          onClose(); 
      } catch (e) {
          alert("Gagal hapus");
      }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center animate-scale-in">
        {/* Progress Bars */}
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
            {group.stories.map((s, idx) => (
                <div key={s.id} className="h-1 bg-white/30 flex-1 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-white transition-all duration-100 ease-linear"
                        style={{ 
                            width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
                        }}
                    />
                </div>
            ))}
        </div>

        {/* Header User Info */}
        <div className="absolute top-6 left-4 z-20 flex items-center gap-2">
             <img src={group.user.avatar_url || DEFAULT_AVATAR} className="w-10 h-10 rounded-full border border-white" alt="user" />
             <div>
                 <p className="text-white font-bold text-sm shadow-black drop-shadow-md">{group.user.full_name}</p>
                 <p className="text-white/70 text-xs">{new Date(currentStory.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
             </div>
        </div>

        {/* Controls */}
        <button onClick={onClose} className="absolute top-6 right-4 z-30 text-white p-2"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        
        {isOwner && (
            <button onClick={handleDelete} className="absolute bottom-6 right-4 z-30 text-white p-2 hover:bg-white/10 rounded-full"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        )}

        {/* Touch Zones for Navigation */}
        <div className="absolute inset-0 flex z-10">
            <div className="w-1/3 h-full" onClick={handlePrev} />
            <div className="w-1/3 h-full" onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)} />
            <div className="w-1/3 h-full" onClick={handleNext} />
        </div>

        {/* Content Display */}
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
            {currentStory.media_type === 'text' ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center" style={{ backgroundColor: currentStory.background_color || '#333' }}>
                    <p className="text-white text-2xl md:text-4xl font-bold whitespace-pre-wrap">{currentStory.caption}</p>
                </div>
            ) : currentStory.media_type === 'video' ? (
                <div className="relative w-full h-full flex items-center justify-center">
                    <video 
                        ref={videoRef}
                        src={currentStory.media_url} 
                        className="max-w-full max-h-full" 
                        autoPlay 
                        playsInline
                        onTimeUpdate={(e) => {
                            const v = e.currentTarget;
                            if(v.duration) setProgress((v.currentTime / v.duration) * 100);
                        }}
                        onEnded={handleNext}
                        onPause={() => setIsPaused(true)}
                        onPlay={() => setIsPaused(false)}
                    />
                    {currentStory.caption && (
                         <div className="absolute bottom-10 left-0 right-0 p-4 bg-black/50 text-white text-center">
                             {currentStory.caption}
                         </div>
                    )}
                </div>
            ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                    <img src={currentStory.media_url} className="max-w-full max-h-full object-contain" alt="story" />
                    {currentStory.caption && (
                         <div className="absolute bottom-10 left-0 right-0 p-4 bg-black/50 text-white text-center">
                             {currentStory.caption}
                         </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};