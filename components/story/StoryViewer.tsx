import React, { useState, useEffect, useRef } from 'react';
import { GroupedStories, StoryView } from '../../types';
import { DEFAULT_AVATAR } from '../../constants';
import { storyService } from '../../services/features/storyService';
import { supabase } from '../../services/supabaseClient';

interface StoryViewerProps {
  group: GroupedStories;
  onClose: () => void;
  onNextGroup: () => void;
  onPrevGroup: () => void;
  currentUserId: string;
  onAddStory?: () => void; // New Prop
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ group, onClose, onNextGroup, onPrevGroup, currentUserId, onAddStory }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [isPaused, setIsPaused] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false); 
  const [showViewers, setShowViewers] = useState(false); 
  const [viewersList, setViewersList] = useState<StoryView[]>([]);
  
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentStory = group.stories[currentIndex];
  const DURATION = 5000; // 5 seconds default
  const isOwner = group.user.id === currentUserId;

  // Reset state on story change
  useEffect(() => {
    setProgress(0);
    requestAnimationFrame(() => {
         if (currentStory && currentStory.media_type !== 'video') {
             // Start animation
             setProgress(100);
         }
    });
    
    if (currentStory) {
        setIsLoaded(currentStory.media_type === 'text'); 
        setShowViewers(false);
        setReplyText('');
        
        if (!isOwner) {
            storyService.recordView(currentStory.id, currentUserId);
        }
    }
  }, [currentIndex, group, isOwner, currentUserId, currentStory]);

  // Timer Logic for Next Story
  useEffect(() => {
    if (!currentStory || isPaused || !isLoaded || showViewers || replyText.trim().length > 0) return;

    let timeout: any;

    if (currentStory.media_type !== 'video') {
        timeout = setTimeout(() => {
            handleNext();
        }, DURATION);
    }

    return () => clearTimeout(timeout);
  }, [currentIndex, isPaused, isLoaded, showViewers, replyText, currentStory]);

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
          onClose(); 
      } catch (e) {
          alert("Gagal hapus");
      }
  };

  const handleFetchViewers = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsPaused(true);
      setShowViewers(true);
      try {
          const list = await storyService.fetchViewers(currentStory.id);
          setViewersList(list);
      } catch (err) {
          console.error(err);
      }
  };

  const handleSendReply = async () => {
      if (!replyText.trim()) return;
      setSendingReply(true);
      try {
          const room_id = [currentUserId, group.user.id].sort().join('_');
          const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', currentUserId).single();
          if (!myProfile) throw new Error("Profil tidak ditemukan");

          await supabase.from('messages').insert({
              content: replyText,
              user_id: currentUserId,
              user_email: myProfile.username || myProfile.email,
              user_avatar: myProfile.avatar_url,
              receiver_id: group.user.id,
              room_id: room_id,
              story_id: currentStory.id
          });
          
          setReplyText('');
          onClose(); 
          alert('Balasan terkirim!');
      } catch (e: any) {
          alert('Gagal mengirim balasan: ' + e.message);
      } finally {
          setSendingReply(false);
      }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center animate-scale-in">
        {/* Progress Bars */}
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
            {group.stories.map((s, idx) => (
                <div key={s.id} className="h-1 bg-white/30 flex-1 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-white ease-linear"
                        style={{ 
                            width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                            transitionProperty: 'width',
                            transitionDuration: idx === currentIndex && currentStory.media_type !== 'video' && !isPaused ? `${DURATION}ms` : '0ms'
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

        {/* ADD STORY BUTTON (Owner only) */}
        {isOwner && onAddStory && (
             <button 
                onClick={(e) => { e.stopPropagation(); onAddStory(); }}
                className="absolute top-20 left-4 z-30 flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full hover:bg-white/30 transition text-white text-xs font-bold"
             >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                 Add Story
             </button>
        )}

        {/* Close Button */}
        <button onClick={onClose} className="absolute top-6 right-4 z-30 text-white p-2 hover:bg-white/10 rounded-full"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        
        {/* Bottom Controls */}
        <div className="absolute bottom-6 left-0 right-0 px-4 z-30 flex gap-3 items-end">
             {isOwner ? (
                <div className="flex justify-between items-center w-full">
                    <button 
                        onClick={handleFetchViewers}
                        className="flex items-center gap-1 text-white bg-black/40 px-3 py-1.5 rounded-full hover:bg-black/60 transition"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        <span className="text-sm font-bold">{viewersList.length > 0 ? viewersList.length : 'Views'}</span>
                    </button>
                    <button onClick={handleDelete} className="text-white p-2 hover:bg-white/10 rounded-full bg-black/40"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
             ) : (
                // REPLY INPUT
                <div className="w-full flex gap-2 items-center animate-slide-up">
                    <input 
                        type="text" 
                        value={replyText}
                        onChange={(e) => { setReplyText(e.target.value); setIsPaused(true); }}
                        onFocus={() => setIsPaused(true)}
                        onBlur={() => !replyText && setIsPaused(false)}
                        placeholder="Kirim pesan..." 
                        className="flex-1 bg-black/40 border border-white/30 rounded-full px-4 py-3 text-white placeholder-white/70 focus:outline-none focus:bg-black/60 transition backdrop-blur-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                    />
                    <button 
                        onClick={handleSendReply} 
                        disabled={!replyText.trim() || sendingReply}
                        className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-sm disabled:opacity-50"
                    >
                        {sendingReply ? (
                             <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        )}
                    </button>
                    <button className="p-3 text-2xl hover:scale-125 transition">❤️</button>
                </div>
             )}
        </div>

        {/* Buffering */}
        {!isLoaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
        )}

        {/* Touch Zones */}
        <div className="absolute inset-0 flex z-0">
            <div className="w-1/3 h-full" onClick={handlePrev} />
            <div className="w-1/3 h-full" onMouseDown={() => setIsPaused(true)} onMouseUp={() => !replyText && setIsPaused(false)} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => !replyText && setIsPaused(false)} />
            <div className="w-1/3 h-full" onClick={handleNext} />
        </div>

        {/* Content */}
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
            {currentStory.media_type === 'text' ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center" style={{ backgroundColor: currentStory.background_color || '#333' }}>
                    <p className="text-white text-2xl md:text-4xl font-bold whitespace-pre-wrap">{currentStory.caption}</p>
                </div>
            ) : currentStory.media_type === 'video' ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <video 
                        ref={videoRef}
                        src={currentStory.media_url} 
                        className="max-w-full max-h-full" 
                        autoPlay 
                        playsInline
                        muted={false}
                        onLoadedData={() => setIsLoaded(true)}
                        onWaiting={() => setIsLoaded(false)}
                        onPlaying={() => setIsLoaded(true)}
                        onTimeUpdate={(e) => {
                            const v = e.currentTarget;
                            if(v.duration && !isPaused && !showViewers && !replyText) setProgress((v.currentTime / v.duration) * 100);
                        }}
                        onEnded={handleNext}
                    />
                    {currentStory.caption && <div className="absolute bottom-20 left-0 right-0 p-4 bg-black/50 text-white text-center pb-16">{currentStory.caption}</div>}
                </div>
            ) : (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <img 
                        src={currentStory.media_url} 
                        className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
                        alt="story" 
                        onLoad={() => setIsLoaded(true)}
                    />
                    {currentStory.caption && <div className="absolute bottom-20 left-0 right-0 p-4 bg-black/50 text-white text-center pb-16">{currentStory.caption}</div>}
                </div>
            )}
        </div>

        {/* Viewers */}
        {showViewers && (
            <div className="absolute inset-x-0 bottom-0 top-1/2 bg-white dark:bg-gray-800 rounded-t-2xl z-50 animate-slide-up flex flex-col shadow-2xl">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white">Dilihat oleh {viewersList.length} orang</h3>
                    <button onClick={(e) => { e.stopPropagation(); setShowViewers(false); setIsPaused(false); }} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full">
                        <svg className="w-5 h-5 text-gray-600 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {viewersList.length === 0 ? <p className="text-center text-gray-500 mt-10">Belum ada yang melihat story ini.</p> : viewersList.map((v, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <img src={v.viewer?.avatar_url || DEFAULT_AVATAR} className="w-10 h-10 rounded-full bg-gray-200" alt="av" />
                            <div>
                                <p className="font-bold text-sm text-gray-800 dark:text-white">{v.viewer?.full_name || 'User'}</p>
                                <p className="text-xs text-gray-500">{new Date(v.viewed_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};