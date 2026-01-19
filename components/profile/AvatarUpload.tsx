import React, { useRef, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface AvatarUploadProps {
  currentUrl: string;
  onUploadComplete: (url: string) => void;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({ currentUrl, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      if (!file.type.startsWith('image/')) {
         alert('Mohon upload file gambar.');
         return;
      }

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload ke bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      onUploadComplete(data.publicUrl);

    } catch (error: any) {
      alert('Gagal upload avatar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group cursor-pointer inline-block">
        <img 
            src={currentUrl} 
            alt="Profile" 
            className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 dark:border-gray-700 shadow-lg"
        />
        <div 
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
            {uploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )}
        </div>
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*"
            className="hidden" 
        />
    </div>
  );
};