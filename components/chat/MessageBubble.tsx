import React, { memo, useState } from 'react';
import { Message } from '../../types';
import { DEFAULT_AVATAR } from '../../constants';
import { MessageStatus } from './MessageStatus';
import { chatService } from '../../services/chatService';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  onSelect: () => void;
  onDelete?: (id: number) => void; 
  onReply?: (message: Message) => void;
  prevMessageSameUser?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = memo(({ 
  message, 
  isOwn, 
  isSelected, 
  isSelectionMode, 
  onSelect, 
  onDelete, 
  onReply, 
  prevMessageSameUser 
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Helper Click Handler
  const handleClick = () => {
      if (isSelectionMode) {
          onSelect();
      }
  };

  const handleDeleteForAll = async () => {
      if(!confirm("⚠️ PERINGATAN: Hapus pesan ini untuk semua orang?\n\nPesan akan hilang permanen dan file terlampir akan dihapus.")) return;
      try {
          await chatService.deleteMessageForAll(message.id);
          setShowMenu(false);
      } catch (e: any) { 
          alert("Gagal hapus: " + e.message); 
      }
  };

  // Safe Name Formatter
  const formatName = (nameOrEmail?: string) => {
      if (!nameOrEmail) return 'Pengguna';
      if (nameOrEmail.includes('@')) return nameOrEmail.split('@')[0];
      return nameOrEmail;
  };

  // Scroll to Message logic
  const handleReplyClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (message.reply_to_message) {
          const targetId = `msg-${message.reply_to_message.id}`;
          const el = document.getElementById(targetId);
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Highlight effect
              el.classList.add('highlight-bubble');
              setTimeout(() => el.classList.remove('highlight-bubble'), 1500);
          } else {
              // Jika pesan tidak ada (misal pagination belum load), beri tahu user
              // Idealnya fetch message, tapi untuk MVP kita alert/toast
              console.log("Pesan asli tidak ditemukan di viewport");
          }
      }
  };

  // Styling Dinamis untuk Radius Bubble
  const bubbleRadiusClass = isOwn
      ? `rounded-2xl ${prevMessageSameUser ? 'rounded-tr-md' : 'rounded-tr-none'}`
      : `rounded-2xl ${prevMessageSameUser ? 'rounded-tl-md' : 'rounded-tl-none'}`;

  // Warna Aksen untuk Reply
  const replyAccentColor = isOwn ? 'bg-green-600' : 'bg-telegram-primary';
  const replyTextColor = isOwn ? 'text-green-700 dark:text-green-300' : 'text-telegram-primary';

  return (
    <div 
        id={`msg-${message.id}`}
        className={`relative flex w-full mb-1 group px-2 select-none ${isOwn ? 'justify-end' : 'justify-start'} ${message.isPending ? 'opacity-70' : 'opacity-100'} transition-all duration-300 cursor-pointer`}
        onDoubleClick={() => onReply && onReply(message)}
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

      {/* Context Menu Trigger */}
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
          <div className={`absolute top-6 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} w-44 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden flex flex-col`}>
              <button 
                onClick={(e) => { e.stopPropagation(); onReply && onReply(message); setShowMenu(false); }} 
                className="px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                  Balas
              </button>
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
                    className="px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-medium border-t border-gray-100 dark:border-gray-700"
                  >
                      Hapus untuk Semua
                  </button>
              )}
          </div>
      )}

      {!isOwn && (
         <div className="w-8 mr-2 flex flex-col justify-end">
            {!prevMessageSameUser ? (
                <img
                  src={message.user_avatar || DEFAULT_AVATAR}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full bg-gray-200 shrink-0"
                  loading="lazy"
                />
            ) : <div className="w-8 h-8"></div>}
         </div>
      )}
      
      <div
        className={`relative max-w-[85%] md:max-w-[70%] px-3 py-2 shadow-sm text-sm md:text-base break-words ${bubbleRadiusClass} ${
          isSelected ? 'ring-2 ring-telegram-primary ring-offset-1 dark:ring-offset-gray-900' : ''
        } ${
          isOwn
            ? 'bg-telegram-messageOut dark:bg-telegram-messageOutDark text-gray-800 dark:text-white'
            : 'bg-telegram-messageIn dark:bg-telegram-messageInDark text-gray-800 dark:text-white'
        }`}
      >
        {/* STORY REPLY CONTEXT */}
        {message.story_id && message.story && (
             <div className="mb-2 border-l-[3px] border-orange-500 bg-orange-500/10 rounded-r-md p-1.5 flex gap-2 items-center">
                 {message.story.media_type === 'image' || message.story.media_type === 'video' ? (
                     <div className="w-8 h-12 bg-gray-300 rounded overflow-hidden flex-shrink-0">
                        {message.story.media_type === 'image' ? (
                            <img src={message.story.media_url} className="w-full h-full object-cover" alt="story" />
                        ) : (
                            <video src={message.story.media_url} className="w-full h-full object-cover" />
                        )}
                     </div>
                 ) : (
                     <div className="w-8 h-12 flex items-center justify-center bg-gray-800 text-white text-[8px] text-center p-1 rounded">
                         Teks
                     </div>
                 )}
                 <div className="flex-1 min-w-0">
                     <p className="text-xs font-bold text-orange-600 dark:text-orange-400">Membalas Story</p>
                     <p className="text-xs truncate opacity-70 italic">{message.story.caption || 'Media Story'}</p>
                 </div>
             </div>
        )}

        {/* MESSAGE REPLY CONTEXT (TELEGRAM STYLE) */}
        {message.reply_to_message && !message.story_id && (
            <div 
                onClick={handleReplyClick}
                className="mb-1 mt-0.5 relative overflow-hidden rounded-[4px] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
                {/* Vertical Accent Bar */}
                <div className={`absolute top-0 bottom-0 left-0 w-[3px] rounded-l-sm ${replyAccentColor}`}></div>
                
                <div className="pl-3 pr-2 py-0.5">
                    <p className={`text-xs font-bold truncate ${replyTextColor}`}>
                        {formatName(message.reply_to_message.user_email)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate opacity-90 flex items-center gap-1">
                        {message.reply_to_message.file_type === 'image' && <span className="text-[10px]">📷</span>}
                        {message.reply_to_message.file_type === 'file' && <span className="text-[10px]">📎</span>}
                        {message.reply_to_message.file_type ? (message.reply_to_message.file_type === 'image' ? 'Foto' : 'Berkas') : (message.reply_to_message.content || 'Pesan dihapus')}
                    </p>
                </div>
            </div>
        )}

        {/* SENDER NAME (ONLY FOR OTHERS IN GROUP/PUBLIC) */}
        {!isOwn && !prevMessageSameUser && (
          <p className="text-xs font-bold text-telegram-primary mb-1 truncate">
            {formatName(message.user_email)}
          </p>
        )}

        {message.file_type === 'image' && message.file_url && (
          <div className="mb-2 min-h-[100px] bg-gray-100 dark:bg-white/5 rounded-md overflow-hidden">
            <img
              src={message.file_url}
              alt="Attachment"
              loading="lazy"
              className="rounded-md max-w-full max-h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
              onClick={(e) => { if(!isSelectionMode) window.open(message.file_url!, '_blank'); }}
            />
          </div>
        )}

        {message.file_type === 'file' && message.file_url && (
          <a
            href={isSelectionMode ? '#' : message.file_url}
            target={isSelectionMode ? undefined : "_blank"}
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-black/5 dark:bg-white/10 p-2 rounded-lg mb-1 hover:bg-black/10 transition overflow-hidden"
            onClick={(e) => isSelectionMode && e.preventDefault()}
          >
            <div className="w-10 h-10 bg-telegram-primary/20 rounded-full flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-telegram-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            </div>
            <div className="overflow-hidden min-w-0">
               <p className="text-sm truncate font-medium">Dokumen</p>
               <p className="text-[10px] opacity-70 truncate">Klik untuk mengunduh</p>
            </div>
          </a>
        )}

        {message.content && <p className="whitespace-pre-wrap break-words overflow-hidden leading-relaxed">{message.content}</p>}

        <div className={`text-[10px] mt-0.5 text-right flex items-center justify-end gap-1 ${isOwn ? 'text-green-800 dark:text-green-200' : 'text-gray-400'}`}>
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