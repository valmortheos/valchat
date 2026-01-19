import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { UserProfile } from '../types';
import { DEFAULT_AVATAR } from '../constants';
import { AvatarUpload } from './profile/AvatarUpload';

interface SettingsProps {
  user: UserProfile;
  onClose: () => void;
  onUpdate: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onClose, onUpdate }) => {
  const [fullName, setFullName] = useState(user.full_name || '');
  const [username, setUsername] = useState(user.username || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || DEFAULT_AVATAR);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username: username,
          bio: bio,
          avatar_url: avatarUrl
        })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') throw new Error("Username sudah dipakai orang lain.");
        throw error;
      }
      
      await supabase.auth.updateUser({
        data: { full_name: fullName, avatar_url: avatarUrl }
      });

      alert('Profil berhasil diperbarui!');
      onUpdate();
      onClose();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-white dark:bg-telegram-darkSecondary flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-black/20 bg-white dark:bg-telegram-darkSecondary">
        <button onClick={onClose} className="mr-4 text-gray-600 dark:text-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Pengaturan</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col items-center mb-8">
            <AvatarUpload 
                currentUrl={avatarUrl} 
                onUploadComplete={(url) => setAvatarUrl(url)} 
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Ketuk foto untuk mengganti</p>
        </div>

        <div className="space-y-6 max-w-lg mx-auto">
            <div>
                <label className="block text-xs text-telegram-primary font-bold mb-1 uppercase tracking-wide">Nama Lengkap</label>
                <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 py-2 text-lg text-gray-800 dark:text-white focus:border-telegram-primary focus:outline-none transition-colors"
                />
            </div>
            
            <div>
                <label className="block text-xs text-telegram-primary font-bold mb-1 uppercase tracking-wide">Username</label>
                <div className="flex items-center">
                    <span className="text-gray-500 mr-1">@</span>
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                        className="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 py-2 text-lg text-gray-800 dark:text-white focus:border-telegram-primary focus:outline-none transition-colors"
                        placeholder="username_unik"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs text-telegram-primary font-bold mb-1 uppercase tracking-wide">Bio</label>
                <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-black/20 rounded-lg p-3 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-telegram-primary min-h-[100px]"
                    placeholder="Tulis sesuatu tentang dirimu..."
                />
            </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-black/20 border-t border-gray-200 dark:border-gray-800">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-telegram-primary text-white font-bold py-3 rounded-lg shadow-md hover:bg-telegram-secondary transition-all active:scale-95 disabled:opacity-50"
          >
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
      </div>
    </div>
  );
};