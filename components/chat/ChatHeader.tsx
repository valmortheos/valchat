import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { DEFAULT_AVATAR } from '../../constants';
import { chatService } from '../../services/chatService';

interface ChatHeaderProps {
  activePartner: UserProfile | null;
  onBack: () => void;
  messages: any[]; // Untuk export
  isSelectionMode: boolean;
  selectedCount: number;
  onCancelSelection: () => void;
  onDeleteSelected: () => void;
  onForwardSelected: () => void; 
  isTyping?: boolean; // NEW PROP
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  activePartner, 
  onBack, 
  messages,
  isSelectionMode,
  selectedCount,
  onCancelSelection,
  onDeleteSelected,
  onForwardSelected,
  isTyping = false
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = () => {
    const url = chatService.exportChatToText(messages);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat_export_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowMenu(false);
  };

  const handleDeleteAll = () => {
     if(confirm("Apakah Anda yakin ingin menghapus riwayat chat ini? (Hanya berlaku untuk Anda)")) {
        alert("Fitur 'Clear History' akan segera hadir. Gunakan fitur select bubble untuk menghapus pesan spesifik.");
     }
     setShowMenu(false);
  };

  if (isSelectionMode) {
      return (
        <header className="absolute top-0 left-0 right-0 z-30 bg-white dark:bg-telegram-darkSecondary border-b border-gray-200 dark:border-white/5 p-3 flex items-center justify-between shadow-md animate-slide-up">
            <div className="flex items-center gap-4">
                <button onClick={onCancelSelection} className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <span className="font-bold text-lg text-gray-800 dark:text-white">{selectedCount} Terpilih</span>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={onForwardSelected} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full" title="Forward">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                </button>
                <button onClick={onDeleteSelected} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-white/10 rounded-full" title="Hapus">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </header>
      );
  }

  // Tampilan Header Normal
  return (
    <header className="absolute top-0 left-0 right-0 z-10 glass border-b border-gray-200 dark:border-white/5 p-3 flex items-center justify-between shadow-sm transition-all">
       <div className="flex items-center gap-3 overflow-hidden">
          <button onClick={onBack} className="md:hidden p-2 -ml-1 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
          </button>
          
          {activePartner ? (
              <div className="flex items-center gap-3 cursor-pointer min-w-0">
                  <img src={activePartner.avatar_url || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover shadow-sm shrink-0" alt="partner" />
                  <div className="min-w-0">
                      <h2 className="font-bold text-gray-800 dark:text-white leading-tight truncate">{activePartner.full_name}</h2>
                      {/* TYPING INDICATOR LOGIC */}
                      {isTyping ? (
                          <p className="text-xs text-telegram-primary font-bold italic animate-pulse">sedang mengetik...</p>
                      ) : (
                          <p className="text-xs text-telegram-primary font-bold tracking-wide truncate">@{activePartner.username}</p>
                      )}
                  </div>
              </div>
          ) : (
              <div className="flex items-center gap-3 cursor-pointer min-w-0">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-telegram-primary to-blue-400 flex items-center justify-center text-white font-bold shadow-md shrink-0">#</div>
                   <div className="min-w-0">
                      <h2 className="font-bold text-gray-800 dark:text-white leading-tight truncate">Public Room</h2>
                      {isTyping ? (
                          <p className="text-xs text-telegram-primary font-bold italic animate-pulse">seseorang mengetik...</p>
                      ) : (
                          <p className="text-xs text-gray-500 truncate">Online</p>
                      )}
                  </div>
              </div>
          )}
       </div>

       {/* Menu Button */}
       <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
          </button>
          
          {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-telegram-darkSecondary rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 animate-fade-in overflow-hidden">
                    <button onClick={handleExport} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export Chat
                    </button>
                    <button onClick={handleDeleteAll} className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 text-sm text-red-500 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete All Messages
                    </button>
                </div>
              </>
          )}
       </div>
    </header>
  );
};