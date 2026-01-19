import React, { memo, useState } from 'react';
import { Message } from '../types';
import { DEFAULT_AVATAR } from '../constants';
import { MessageStatus } from './chat/MessageStatus';
import { chatService } from '../services/chatService';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onDelete?: (id: number) => void; // Callback refresh UI after delete
}

export const MessageBubble: React.FC<MessageBubbleProps> = memo(({ message, isOwn, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  // Jika pesan dihapus secara global (Hapus untuk semua)
  if (message.is_deleted) {
      return (
          <div className={`flex w-full mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-3 py-2 rounded-lg text-sm italic text-gray-500 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700`}>
                  🚫 Pesan ini telah dihapus
              </div>
          </div>
      );
  }

  const handleDeleteForMe = async () => {
      if(!confirm("Hapus pesan ini dari tampilan Anda?")) return;
      try {
          await chatService.deleteMessageForMe(message.id, message.user_id); // Note: user_id param here logic depends on implementation, passing current message id is mostly what's needed, user_id is handled in service via auth.
          // Tapi karena MessageBubble tidak tau user_id yang login (context), kita fix service-nya untuk pakai auth.uid().
          // Koreksi: chatService deleteMessageForMe butuh current user id untuk insert ke tabel.
          // Di sini kita tidak punya context session. Better reload list via callback.
          if(onDelete) onDelete(message.id);
          setShowMenu(false);
      } catch (e) { alert("Gagal hapus"); }
  };

  const handleDeleteForAll = async () => {
      if(!confirm("Hapus pesan ini untuk semua orang?")) return;
      try {
          await chatService.deleteMessageForAll(message.id);
          setShowMenu(false);
      } catch (e) { alert("Gagal hapus"); }
  };

  // Kita passing current User ID lewat props di App.tsx nantinya, tapi untuk quick fix deleteForMe:
  // Kita akan handle di parent atau asumsikan service mengambil session (not ideal in pure UI component)
  // Untuk solusi UI: Menu delete akan memanggil props `onDeleteAction` yang logicnya di App.tsx
  // REVISI: Agar simple, kita pakai inline logic session di sini atau biarkan App handle.
  // Untuk menjaga modularitas, MessageBubble harusnya hanya presentational, tapi untuk menu interaktif, kita perlu state local menu.

  return (
    <div 
        className={`relative flex w-full mb-2 group ${isOwn ? 'justify-end' : 'justify-start'} ${message.isPending ? 'opacity-70' : 'opacity-100'} transition-opacity duration-300`}
        onMouseLeave={() => setShowMenu(false)}
    >
      {/* Context Menu Trigger (Only visible on hover/long press logic) */}
      <button 
         onClick={() => setShowMenu(!showMenu)}
         className={`absolute top-0 ${isOwn ? 'left-0 -ml-8' : 'right-0 -mr-8'} opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity`}
      >
         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
         </svg>
      </button>

      {/* Menu Dropdown */}
      {showMenu && (
          <div className={`absolute top-6 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} w-40 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden flex flex-col`}>
              <button 
                onClick={() => { if(onDelete) onDelete(message.id); setShowMenu(false); }} 
                className="px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                  Hapus untuk Saya
              </button>
              {isOwn && (
                  <button 
                    onClick={handleDeleteForAll} 
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
          className="w-8 h-8 rounded-full mr-2 self-end mb-1 bg-gray-200"
          loading="lazy"
        />
      )}
      <div
        className={`relative max-w-[75%] px-3 py-2 rounded-lg shadow-sm text-sm md:text-base ${
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
          <div className="mb-2 min-h-[100px] bg-gray-100 dark:bg-white/5 rounded-md">
            <img
              src={message.file_url}
              alt="Attachment"
              loading="lazy"
              className="rounded-md max-w-full max-h-64 object-cover cursor-pointer"
              onClick={() => window.open(message.file_url!, '_blank')}
            />
          </div>
        )}

        {message.file_type === 'file' && message.file_url && (
          <a
            href={message.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-black/5 dark:bg-white/10 p-2 rounded mb-2 hover:bg-black/10 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-telegram-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="overflow-hidden">
               <p className="text-xs truncate font-medium">Lampiran File</p>
               <p className="text-[10px] opacity-70">Klik untuk unduh</p>
            </div>
          </a>
        )}

        {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}

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