import React, { memo, useState } from 'react';
import { Message } from '../../types';
import { DEFAULT_AVATAR } from '../../constants';
import { MessageStatus } from './MessageStatus';
import { chatService } from '../../services/chatService';
import { useUI } from '../../contexts/UIContext'; // Import Context

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
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showFileMenu, setShowFileMenu] = useState(false);
  const { confirm, showToast } = useUI(); // Use UI Context

  const handleClick = (e: React.MouseEvent) => {
      if (isSelectionMode) {
          onSelect();
          return;
      }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      if (!isSelectionMode) {
          setMenuPosition({ x: e.clientX, y: e.clientY });
          setShowMenu(true);
      }
  };

  const handleDeleteForAll = () => {
      confirm({
          title: "Hapus Pesan",
          message: "Pesan ini akan dihapus untuk semua orang dan tidak bisa dikembalikan. Lanjutkan?",
          isDangerous: true,
          confirmText: "Hapus",
          onConfirm: async () => {
              try {
                  await chatService.deleteMessageForAll(message.id);
                  setShowMenu(false);
                  showToast("Pesan dihapus.", "success");
              } catch (e: any) { 
                  showToast(e.message, "error");
              }
          }
      });
  };

  const handleDeleteForMe = () => {
      if (onDelete) {
          onDelete(message.id);
          setShowMenu(false);
      }
  };

  const handleFileClick = (e: React.MouseEvent) => {
      if (isSelectionMode) return;
      e.preventDefault();
      e.stopPropagation();
      setShowFileMenu(!showFileMenu);
  };

  const handleDownload = () => {
      if (message.file_url) {
          const link = document.createElement('a');
          link.href = message.file_url;
          link.download = `file_${message.id}`;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
      setShowFileMenu(false);
  };

  const handleShare = async () => {
      if (message.file_url) {
          if (navigator.share) {
              try {
                  await navigator.share({
                      title: 'Shared File from ValChat',
                      url: message.file_url
                  });
              } catch (err) {
                  console.log("Share canceled");
              }
          } else {
              navigator.clipboard.writeText(message.file_url);
              showToast("Link file disalin!", "success");
          }
      }
      setShowFileMenu(false);
  };

  // Safe Name Formatter
  const formatName = (nameOrEmail?: string) => {
      if (!nameOrEmail) return 'Pengguna';
      if (nameOrEmail.includes('@')) return nameOrEmail.split('@')[0];
      return nameOrEmail;
  };

  // Helper untuk mendapatkan nama display pada reply
  const getReplyDisplayName = (replyMsg: any) => {
      // Logic di chatService.ts sudah inject 'display_name'
      if (replyMsg.display_name) return replyMsg.display_name;
      // Fallback
      return replyMsg.user_email ? replyMsg.user_email.split('@')[0] : 'Unknown';
  };

  const bubbleRadiusClass = isOwn
      ? `rounded-2xl ${prevMessageSameUser ? 'rounded-tr-md' : 'rounded-tr-none'}`
      : `rounded-2xl ${prevMessageSameUser ? 'rounded-tl-md' : 'rounded-tl-none'}`;

  return (
    <div 
        id={`msg-${message.id}`}
        className={`relative flex w-full mb-1 group px-2 select-none ${isOwn ? 'justify-end' : 'justify-start'} ${message.isPending ? 'opacity-70' : 'opacity-100'} transition-all duration-300 cursor-pointer`}
        onDoubleClick={() => onReply && onReply(message)}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
    >
      {isSelectionMode && (
          <div className={`mr-2 flex items-center justify-center ${isOwn ? 'order-first' : 'order-first'}`}>
             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-telegram-primary border-telegram-primary' : 'border-gray-400 bg-transparent'}`}>
                 {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
             </div>
          </div>
      )}

      {/* CONTEXT MENU */}
      {showMenu && !isSelectionMode && (
          <>
            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}></div>
            <div 
                className="fixed bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden flex flex-col w-48 animate-scale-in"
                style={{ top: menuPosition.y, left: Math.min(menuPosition.x, window.innerWidth - 200) }}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); onReply && onReply(message); setShowMenu(false); }} 
                className="px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-2"
              >
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                  Balas
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onSelect(); setShowMenu(false); }} 
                className="px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-2"
              >
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Pilih
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteForMe(); }} 
                className="px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-2"
              >
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Hapus untuk Saya
              </button>
              {isOwn && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteForAll(); }} 
                    className="px-4 py-3 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-medium border-t border-gray-100 dark:border-gray-700 flex items-center gap-2"
                  >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Hapus untuk Semua
                  </button>
              )}
          </div>
          </>
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
        {/* REPLY CONTEXT */}
        {message.reply_to_message && !message.story_id && (
            <div className={`mb-2 pl-2 border-l-[3px] rounded-sm text-xs cursor-pointer opacity-80 hover:opacity-100 ${isOwn ? 'border-green-600/50 bg-black/5 dark:bg-black/10' : 'border-telegram-primary/50 bg-telegram-primary/5'}`}>
                <div className="py-1 pr-1">
                    <p className={`font-bold truncate ${isOwn ? 'text-green-800 dark:text-green-300' : 'text-telegram-primary'}`}>
                        {getReplyDisplayName(message.reply_to_message)}
                    </p>
                    <p className="truncate text-gray-600 dark:text-gray-300">
                        {message.reply_to_message.file_type ? (message.reply_to_message.file_type === 'image' ? '📷 Foto' : '📎 Berkas') : message.reply_to_message.content}
                    </p>
                </div>
            </div>
        )}

        {/* STORY REPLY */}
        {message.story_id && message.story && (
             <div className="mb-2 border-l-[3px] border-orange-500 bg-orange-500/10 rounded-r-md p-1.5 flex gap-2 items-center">
                 {/* ... Story content ... */}
                 <div className="flex-1 min-w-0">
                     <p className="text-xs font-bold text-orange-600 dark:text-orange-400">Membalas Story</p>
                     <p className="text-xs truncate opacity-70 italic">{message.story.caption || 'Media Story'}</p>
                 </div>
             </div>
        )}

        {!isOwn && !prevMessageSameUser && (
          <p className="text-xs font-bold text-telegram-primary mb-1 truncate">
            {formatName(message.user_email)}
          </p>
        )}

        {/* IMAGE */}
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

        {/* FILE ATTACHMENT */}
        {message.file_type === 'file' && message.file_url && (
          <div className="relative">
              <div 
                className="flex items-center gap-3 bg-black/5 dark:bg-white/10 p-2 rounded-lg mb-1 hover:bg-black/10 transition overflow-hidden cursor-pointer"
                onClick={handleFileClick}
              >
                <div className="w-10 h-10 bg-telegram-primary/20 rounded-full flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-telegram-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <div className="overflow-hidden min-w-0">
                    <p className="text-sm truncate font-medium">Dokumen</p>
                    <p className="text-[10px] opacity-70 truncate">Klik untuk menu</p>
                </div>
              </div>

              {/* FILE POPUP MENU */}
              {showFileMenu && (
                  <>
                  <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setShowFileMenu(false); }}></div>
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 z-30 w-40 overflow-hidden animate-scale-in origin-top-left">
                      <button onClick={handleDownload} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Download
                      </button>
                      <button onClick={handleShare} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                          Share
                      </button>
                  </div>
                  </>
              )}
          </div>
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