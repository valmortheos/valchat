import React from 'react';
import { Message } from '../types';
import { DEFAULT_AVATAR } from '../constants';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  const timeString = new Date(message.created_at).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex w-full mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <img
          src={message.user_avatar || DEFAULT_AVATAR}
          alt="Avatar"
          className="w-8 h-8 rounded-full mr-2 self-end mb-1"
        />
      )}
      <div
        className={`relative max-w-[75%] px-3 py-2 rounded-lg shadow-sm text-sm md:text-base ${
          isOwn
            ? 'bg-telegram-messageOut dark:bg-telegram-messageOutDark text-gray-800 dark:text-white rounded-tr-none'
            : 'bg-telegram-messageIn dark:bg-telegram-messageInDark text-gray-800 dark:text-white rounded-tl-none'
        }`}
      >
        {/* User Name in Group Context (Optional logic, showing for others) */}
        {!isOwn && (
          <p className="text-xs font-bold text-telegram-primary mb-1 truncate">
            {message.user_email?.split('@')[0] || 'User'}
          </p>
        )}

        {/* Image Attachment */}
        {message.file_type === 'image' && message.file_url && (
          <div className="mb-2">
            <img
              src={message.file_url}
              alt="Attachment"
              className="rounded-md max-w-full max-h-64 object-cover cursor-pointer"
              onClick={() => window.open(message.file_url!, '_blank')}
            />
          </div>
        )}

        {/* File Attachment (Non-image) */}
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

        {/* Text Content */}
        {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}

        {/* Timestamp */}
        <div className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${isOwn ? 'text-green-800 dark:text-green-200' : 'text-gray-400'}`}>
           <span>{timeString}</span>
           {isOwn && (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
             </svg>
           )}
        </div>
      </div>
    </div>
  );
};
