import React, { memo, useState } from 'react';
import { Message } from '../types';
import { DEFAULT_AVATAR } from '../constants';
import { MessageStatus } from './chat/MessageStatus';
import { chatService } from '../services/chatService';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  onSelect: () => void;
  onDelete?: (id: number) => void; 
}

export const MessageBubble: React.FC<MessageBubbleProps> = memo(({ message, isOwn, isSelected, isSelectionMode, onSelect, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  // Helper Click Handler
  const handleClick = () => {
      if (isSelectionMode) {
          onSelect();
      }
  };

  // Jika pesan dihapus secara global
  if (message.is_deleted) {
      if (isSelectionMode && !isSelected) return null; // Opsional: Sembunyikan pesan terhapus di mode seleksi jika tidak dipilih (biasanya tidak bisa dipilih)
      return (
          <div className={`flex w-full mb-2 ${isOwn ? 'justify-end' : 'justify-start'} px-2`}>
              <div className={`px-3 py-2 rounded-lg text-sm italic text-gray-500 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700`}>
                  🚫 Pesan ini telah dihapus
              </div>
          </div>
      );
  }

  const handleDeleteForAll = async () => {
      if(!confirm("Hapus pesan ini untuk semua orang?")) return;
      try {
          await chatService.deleteMessageForAll(message.id);
          setShowMenu(false);
      } catch (e) { alert("Gagal hapus"); }
  };

  return (
    <div 
        className={`relative flex w-full mb-1 group px-2 select-none ${isOwn ? 'justify-end' : 'justify-start'} ${message.isPending ? 'opacity-70' : 'opacity-100'} transition-all duration-200 cursor-pointer`}
        onDoubleClick={onSelect}
        onClick={handleClick}
        onMouseLeave={() => setShowMenu(false)}
    >
      {/* Checkbox Overlay for Selection Mode */}
      {isSelectionMode && (
          <div className={`mr-2 flex items-center justify-center ${isOwn ? 'order-first' : 'order-first'}`}>
             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-telegram-primary border-telegram-primary' : 'border-gray-400 bg-transparent'}`}>
                 {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
             </div>
          </div>
      )}

      {/* Context Menu Trigger (Only visible on hover if not selection mode) */}
      {!isSelectionMode && (
          <button 
             onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
             className={`absolute top-0 ${isOwn ? 'left-0 ml-[-20px] md:ml-[-30px]' : 'right-0 mr-[-20px] md:mr-[-30px]'} opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity z-10`}
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
             </svg>
          </button>
      )}

      {/* Menu Dropdown */}
      {showMenu && !isSelectionMode && (
          <div className={`absolute top-6 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} w-40 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden flex flex-col`}>
              <button 
                onClick={(e) => { e.stopPropagation(); onSelect(); }} 
                className="px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                  Pilih (Select)
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); if(onDelete) onDelete(message.id); setShowMenu(false); }} 
                className="px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                  Hapus untuk Saya
              </button>
              {isOwn && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteForAll(); }} 
                    className="px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500"
                  >
                      Hapus untuk Semua
                  </button>
              )}
          </div>
      )}

      {!isOwn && (
        <img
          src={message.user_avatar || DEFAULT_AVATAR}
          alt="Avatar"
          className="w-8 h-8 rounded-full mr-2 self-end mb-1 bg-gray-200 shrink-0"
          loading="lazy"
        />
      )}
      
      <div
        className={`relative max-w-[85%] md:max-w-[70%] px-3 py-2 rounded-lg shadow-sm text-sm md:text-base break-words ${
          isSelected ? 'ring-2 ring-telegram-primary ring-offset-1 dark:ring-offset-gray-900' : ''
        } ${
          isOwn
            ? 'bg-telegram-messageOut dark:bg-telegram-messageOutDark text-gray-800 dark:text-white rounded-tr-none'
            : 'bg-telegram-messageIn dark:bg-telegram-messageInDark text-gray-800 dark:text-white rounded-tl-none'
        }`}
      >
        {!isOwn && (
          <p className="text-xs font-bold text-telegram-primary mb-1 truncate">
            {message.user_email?.split('@')[0] || 'User'}
          </p>
        )}

        {message.file_type === 'image' && message.file_url && (
          <div className="mb-2 min-h-[100px] bg-gray-100 dark:bg-white/5 rounded-md overflow-hidden">
            <img
              src={message.file_url}
              alt="Attachment"
              loading="lazy"
              className="rounded-md max-w-full max-h-64 object-cover cursor-pointer"
              onClick={(e) => { if(!isSelectionMode) window.open(message.file_url!, '_blank'); }}
            />
          </div>
        )}

        {message.file_type === 'file' && message.file_url && (
          <a
            href={isSelectionMode ? '#' : message.file_url}
            target={isSelectionMode ? undefined : "_blank"}
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-black/5 dark:bg-white/10 p-2 rounded mb-2 hover:bg-black/10 transition overflow-hidden"
            onClick={(e) => isSelectionMode && e.preventDefault()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-telegram-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="overflow-hidden min-w-0">
               <p className="text-xs truncate font-medium">Lampiran File</p>
               <p className="text-[10px] opacity-70 truncate">Klik untuk unduh</p>
            </div>
          </a>
        )}

        {message.content && <p className="whitespace-pre-wrap break-words overflow-hidden">{message.content}</p>}

        <div className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${isOwn ? 'text-green-800 dark:text-green-200' : 'text-gray-400'}`}>
           {isOwn ? (
               <MessageStatus 
                   messageId={message.id} 
                   roomId={message.room_id} 
                   isGroup={message.room_id === 'public'} 
                   timestamp={message.created_at} 
               />
           ) : (
               <span>{new Date(message.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>
           )}
        </div>
      </div>
    </div>
  );
});