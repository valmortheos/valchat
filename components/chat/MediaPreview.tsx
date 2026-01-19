import React, { useState } from 'react';
import { fileService } from '../../services/fileService';

interface MediaPreviewProps {
  file: File;
  onSend: (fileUrl: string, caption: string, type: 'image' | 'file') => Promise<void>;
  onClose: () => void;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({ file, onSend, onClose }) => {
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);
  const previewUrl = URL.createObjectURL(file);
  const isImage = file.type.startsWith('image/');

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    try {
      // 1. Upload File
      const publicUrl = await fileService.uploadFile(file);
      
      // 2. Kirim Pesan dengan Caption
      // Jika user mengisi caption, pesan content = caption. Jika tidak, content kosong/deskriptif.
      // Logic di App.tsx/ChatInput akan menangani content sebagai text biasa, dan fileUrl sebagai attachment.
      await onSend(publicUrl, caption, isImage ? 'image' : 'file');
      
      onClose();
    } catch (error: any) {
      alert('Gagal mengirim: ' + error.message);
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center p-4 text-white">
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
        <h3 className="font-semibold">Kirim {isImage ? 'Gambar' : 'File'}</h3>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      {/* Preview Content */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        {isImage ? (
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-scale-in" />
        ) : (
            <div className="bg-white/10 p-8 rounded-xl flex flex-col items-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">{file.name}</p>
                <p className="text-sm opacity-70">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
        )}
      </div>

      {/* Caption Input */}
      <div className="p-4 bg-black/50 backdrop-blur-md pb-8 md:pb-4">
          <div className="max-w-3xl mx-auto flex items-end gap-3">
              <input 
                autoFocus
                type="text" 
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={isImage ? "Tambah caption..." : "Tambah keterangan..."}
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-full px-5 py-3 focus:outline-none focus:bg-white/20 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={handleSend}
                disabled={sending}
                className="bg-telegram-primary hover:bg-telegram-secondary text-white p-3 rounded-full shadow-lg transform active:scale-95 transition-all disabled:opacity-50"
              >
                  {sending ? (
                      <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  )}
              </button>
          </div>
      </div>
    </div>
  );
};