import React, { useState, useRef } from 'react';
import { storyService } from '../../services/features/storyService';

interface StoryCreatorProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const COLORS = ['#2AABEE', '#8E44AD', '#E74C3C', '#27AE60', '#F39C12', '#34495E'];

export const StoryCreator: React.FC<StoryCreatorProps> = ({ userId, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'media' | 'text'>('media');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(COLORS[0]);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setFile(e.target.files[0]);
      }
  };

  const handleSubmit = async () => {
      setLoading(true);
      try {
          if (mode === 'text') {
              if(!text.trim()) return;
              await storyService.createStory(userId, 'text', null, text, bgColor);
          } else {
              if(!file) return;
              const type = file.type.startsWith('video') ? 'video' : 'image';
              await storyService.createStory(userId, type, file, caption);
          }
          onSuccess();
          onClose();
      } catch (e: any) {
          alert("Gagal upload story: " + e.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center p-4 text-white z-10">
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            <div className="flex gap-4">
                <button onClick={() => { setMode('media'); setFile(null); }} className={`text-sm font-bold ${mode === 'media' ? 'text-telegram-primary' : 'text-gray-400'}`}>MEDIA</button>
                <button onClick={() => { setMode('text'); }} className={`text-sm font-bold ${mode === 'text' ? 'text-telegram-primary' : 'text-gray-400'}`}>TEKS</button>
            </div>
            <button onClick={handleSubmit} disabled={loading || (mode === 'text' && !text) || (mode === 'media' && !file)} className="font-bold text-telegram-primary disabled:opacity-50">
                {loading ? 'POSTING...' : 'KIRIM'}
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-gray-900">
            {mode === 'text' ? (
                <div className="w-full h-full flex items-center justify-center p-8" style={{ backgroundColor: bgColor }}>
                    <textarea 
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Ketik sesuatu..."
                        className="w-full bg-transparent text-white text-center text-3xl font-bold placeholder-white/50 outline-none resize-none"
                        rows={5}
                    />
                    <div className="absolute bottom-20 flex gap-2 overflow-x-auto p-2 max-w-full">
                        {COLORS.map(c => (
                            <button key={c} onClick={() => setBgColor(c)} className={`w-8 h-8 rounded-full border-2 ${bgColor === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                    {file ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                            {file.type.startsWith('video') ? (
                                <video src={URL.createObjectURL(file)} className="max-w-full max-h-full" controls />
                            ) : (
                                <img src={URL.createObjectURL(file)} className="max-w-full max-h-full object-contain" alt="preview" />
                            )}
                            <button onClick={() => setFile(null)} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white">Ganti</button>
                        </div>
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer flex flex-col items-center text-gray-400 hover:text-white transition">
                            <svg className="w-16 h-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <p>Klik untuk pilih Foto/Video</p>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFile} accept="image/*,video/*" className="hidden" />
                </div>
            )}
        </div>

        {/* Caption for Media */}
        {mode === 'media' && file && (
            <div className="p-4 bg-black/80">
                <input 
                    type="text" 
                    value={caption} 
                    onChange={e => setCaption(e.target.value)} 
                    placeholder="Tambah caption..." 
                    className="w-full bg-transparent text-white placeholder-gray-500 outline-none"
                />
            </div>
        )}
    </div>
  );
};