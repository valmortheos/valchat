import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { STORAGE_BUCKET } from '../constants';

interface ChatInputProps {
  onSendMessage: (content: string, fileUrl?: string, fileType?: 'image' | 'file') => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onTyping, disabled }) => {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Logic Typing Indicator
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    // Stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim()) return;
    
    onTyping(false); // Stop typing immediately on send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const msgToSend = message;
    setMessage(''); // Clear immediately for UX
    
    await onSendMessage(msgToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload ke Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
      
      const isImage = file.type.startsWith('image/');
      
      // Kirim pesan otomatis dengan lampiran
      await onSendMessage(
        isImage ? 'Mengirim foto...' : 'Mengirim file...',
        data.publicUrl,
        isImage ? 'image' : 'file'
      );

    } catch (error: any) {
      alert('Gagal upload file: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-3 bg-white dark:bg-telegram-darkSecondary border-t border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit} className="flex items-end gap-2 max-w-4xl mx-auto">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading || disabled}
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled}
          className="p-3 text-gray-500 hover:text-telegram-primary dark:text-gray-400 dark:hover:text-telegram-primary transition-colors focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        <div className="flex-1 relative">
            <textarea
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan..."
                disabled={uploading || disabled}
                className="w-full bg-gray-100 dark:bg-black/20 text-gray-800 dark:text-white rounded-2xl py-3 px-4 resize-none focus:outline-none focus:ring-1 focus:ring-telegram-primary transition-all max-h-32 min-h-[46px]"
                rows={1}
                style={{ height: 'auto', minHeight: '46px' }}
            />
        </div>

        <button
          type="submit"
          disabled={!message.trim() || uploading || disabled}
          className="p-3 bg-telegram-primary text-white rounded-full hover:bg-telegram-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 shadow-md flex items-center justify-center"
        >
          {uploading ? (
             <span className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></span>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};