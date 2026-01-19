import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';

interface ChatInputProps {
  onSendMessage: (content: string, replyToMsg?: Message | null) => Promise<void>; 
  onOpenFile: (file: File) => void; 
  onOpenCamera: () => void; 
  onTyping: (isTyping: boolean) => void;
  disabled: boolean;
  replyTo: Message | null;
  onCancelReply: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onOpenFile, onOpenCamera, onTyping, disabled, replyTo, onCancelReply }) => {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
      if (replyTo && inputRef.current) {
          inputRef.current.focus();
      }
  }, [replyTo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if(message.trim()) {
        onSendMessage(message, replyTo);
        setMessage('');
        onTyping(false);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onOpenFile(e.target.files[0]);
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Safe Name Formatter
  const formatName = (nameOrEmail?: string) => {
      if (!nameOrEmail) return 'Pengguna';
      if (nameOrEmail.includes('@')) return nameOrEmail.split('@')[0];
      return nameOrEmail;
  };

  return (
    <div className="p-2 md:p-4 bg-transparent md:bg-white md:dark:bg-telegram-darkSecondary md:border-t border-gray-200 dark:border-gray-700 w-full z-20">
      
      {/* Reply Preview with Telegram Style */}
      {replyTo && (
        <div className="max-w-4xl mx-auto flex items-center justify-between bg-white dark:bg-telegram-darkSecondary rounded-t-lg shadow-sm animate-slide-up relative overflow-hidden mb-1">
            {/* Accent Bar */}
            <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-telegram-primary rounded-r"></div>
            
            <div className="flex-1 min-w-0 pl-4 py-2 pr-2">
                <p className="text-xs font-bold text-telegram-primary truncate mb-0.5">
                    Balas ke {formatName(replyTo.user_email)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate opacity-90 flex items-center gap-1">
                    {replyTo.file_type === 'image' && <span className="text-xs">📷 Foto</span>}
                    {replyTo.file_type === 'file' && <span className="text-xs">📎 Berkas</span>}
                    {!replyTo.file_type && replyTo.content}
                </p>
            </div>
            
            <button onClick={onCancelReply} className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
      )}

      <div className={`flex items-end gap-2 max-w-4xl mx-auto bg-white dark:bg-telegram-darkSecondary md:bg-transparent rounded-2xl md:rounded-none p-2 md:p-0 shadow-lg md:shadow-none border md:border-none border-gray-100 dark:border-gray-800 ${replyTo ? 'rounded-t-none' : ''}`}>
        
        {/* Buttons Group */}
        <div className="flex gap-0 md:gap-1 pb-1">
             <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
             <button onClick={() => fileInputRef.current?.click()} disabled={disabled} className="p-2 text-gray-500 hover:text-telegram-primary transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/5">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </button>
            <button onClick={onOpenCamera} disabled={disabled} className="p-2 text-gray-500 hover:text-telegram-primary transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/5">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
        </div>

        <div className="flex-1 relative">
            <textarea
                ref={inputRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan..."
                disabled={disabled}
                className="w-full bg-transparent text-gray-800 dark:text-white py-3 px-2 resize-none focus:outline-none max-h-32 min-h-[46px] placeholder-gray-400"
                rows={1}
                style={{ height: 'auto', minHeight: '46px' }}
            />
        </div>

        <button
          onClick={() => { if(message.trim()) { onSendMessage(message, replyTo); setMessage(''); onTyping(false); } }}
          disabled={!message.trim() || disabled}
          className="p-3 mb-1 bg-telegram-primary text-white rounded-full hover:bg-telegram-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 shadow-md flex items-center justify-center"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
  );
};