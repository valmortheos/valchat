import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (content: string) => Promise<void>; // Hanya untuk pesan text
  onOpenFile: (file: File) => void; // Trigger modal preview
  onOpenCamera: () => void; // Trigger modal camera
  onTyping: (isTyping: boolean) => void;
  disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onOpenFile, onOpenCamera, onTyping, disabled }) => {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

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
        onSendMessage(message);
        setMessage('');
        onTyping(false);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            onOpenFile(file);
            return;
          }
        }
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onOpenFile(e.target.files[0]);
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-2 md:p-4 bg-transparent md:bg-white md:dark:bg-telegram-darkSecondary md:border-t border-gray-200 dark:border-gray-700 w-full z-20">
      <div className="flex items-end gap-2 max-w-4xl mx-auto bg-white dark:bg-telegram-darkSecondary md:bg-transparent rounded-2xl md:rounded-none p-2 md:p-0 shadow-lg md:shadow-none border md:border-none border-gray-100 dark:border-gray-800">
        
        {/* Attachment Button */}
        <div className="flex gap-0 md:gap-1 pb-1">
             <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
             <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="p-2 text-gray-500 hover:text-telegram-primary transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
              title="Kirim File/Gambar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            {/* Camera Button */}
            <button
              onClick={onOpenCamera}
              disabled={disabled}
              className="p-2 text-gray-500 hover:text-telegram-primary transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
              title="Buka Kamera"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
        </div>

        <div className="flex-1 relative">
            <textarea
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Ketik pesan..."
                disabled={disabled}
                className="w-full bg-transparent text-gray-800 dark:text-white py-3 px-2 resize-none focus:outline-none max-h-32 min-h-[46px] placeholder-gray-400"
                rows={1}
                style={{ height: 'auto', minHeight: '46px' }}
            />
        </div>

        <button
          onClick={() => { if(message.trim()) { onSendMessage(message); setMessage(''); onTyping(false); } }}
          disabled={!message.trim() || disabled}
          className="p-3 mb-1 bg-telegram-primary text-white rounded-full hover:bg-telegram-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 shadow-md flex items-center justify-center"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
        </button>
      </div>
    </div>
  );
};