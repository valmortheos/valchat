import React, { useEffect, useState } from 'react';
import { UserProfile } from '../../types';
import { DEFAULT_AVATAR } from '../../constants';
import { chatService } from '../../services/chatService';
import { presenceService } from '../../services/features/presenceService';

interface UserProfileViewerProps {
  user: UserProfile;
  currentRoomId: string;
  onClose: () => void;
  isOnline: boolean;
}

export const UserProfileViewer: React.FC<UserProfileViewerProps> = ({ user, currentRoomId, onClose, isOnline }) => {
  const [media, setMedia] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);

  useEffect(() => {
      const loadMedia = async () => {
          const data = await chatService.fetchUserMedia(user.id, currentRoomId);
          setMedia(data);
          setLoadingMedia(false);
      };
      loadMedia();
  }, [user.id, currentRoomId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
        
        {/* Slide-in Panel */}
        <div className="relative w-full max-w-sm h-full bg-white dark:bg-telegram-darkSecondary shadow-2xl animate-slide-in-right flex flex-col border-l border-gray-200 dark:border-black/20">
            
            {/* Header with Background */}
            <div className="relative h-40 bg-gradient-to-br from-telegram-primary to-blue-600">
                <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full backdrop-blur-md transition-colors z-10">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="absolute -bottom-16 left-6">
                    <img 
                        src={user.avatar_url || DEFAULT_AVATAR} 
                        className="w-32 h-32 rounded-full border-4 border-white dark:border-telegram-darkSecondary shadow-lg object-cover bg-white"
                        alt="Profile"
                    />
                </div>
            </div>

            <div className="mt-20 px-6 flex-1 overflow-y-auto">
                {/* Info */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.full_name}</h2>
                <p className="text-telegram-primary font-medium">@{user.username || 'username'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {isOnline ? 'Online' : presenceService.formatLastSeen(user.last_seen)}
                </p>

                {/* Bio */}
                <div className="mt-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bio</h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                        {user.bio || 'Tidak ada bio.'}
                    </p>
                </div>

                {/* Media Gallery (Shared Media) */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-3">
                         <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Media Terkini</h3>
                         <span className="text-xs text-telegram-primary cursor-pointer hover:underline">Lihat Semua</span>
                    </div>
                    
                    {loadingMedia ? (
                        <div className="flex gap-2">
                            {[1,2,3].map(i => <div key={i} className="h-24 flex-1 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />)}
                        </div>
                    ) : media.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Belum ada media dibagikan.</p>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {media.map(m => (
                                <div key={m.id} className="aspect-square bg-gray-100 dark:bg-white/5 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition relative group">
                                    {m.file_type === 'image' ? (
                                        <img src={m.file_url} className="w-full h-full object-cover" alt="media" onClick={() => window.open(m.file_url, '_blank')} />
                                    ) : (
                                        <video src={m.file_url} className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition"></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-8 space-y-3 pb-8">
                     <button className="w-full py-3 rounded-xl bg-gray-50 dark:bg-white/5 text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        Blokir Pengguna
                     </button>
                </div>
            </div>
        </div>
    </div>
  );
};