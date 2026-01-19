import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { UserProfile } from '../types';
import { DEFAULT_AVATAR } from '../constants';
import { AvatarUpload } from './profile/AvatarUpload';
import { friendService } from '../services/features/friendService';
import { UserSearch } from './UserSearch';

interface SettingsProps {
  user: UserProfile;
  onClose: () => void;
  onUpdate: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onClose, onUpdate }) => {
  const [tab, setTab] = useState<'profile' | 'closefriends'>('profile');
  
  // Profile State
  const [fullName, setFullName] = useState(user.full_name || '');
  const [username, setUsername] = useState(user.username || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || DEFAULT_AVATAR);
  const [loading, setLoading] = useState(false);

  // Close Friends State
  const [cfList, setCfList] = useState<UserProfile[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
      if (tab === 'closefriends') {
          loadCloseFriends();
      }
  }, [tab]);

  const loadCloseFriends = async () => {
      const friends = await friendService.getCloseFriends();
      setCfList(friends);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({
          full_name: fullName, username: username, bio: bio, avatar_url: avatarUrl
        }).eq('id', user.id);

      if (error) {
        if (error.code === '23505') throw new Error("Username sudah dipakai.");
        throw error;
      }
      await supabase.auth.updateUser({ data: { full_name: fullName, avatar_url: avatarUrl } });
      alert('Profil berhasil diperbarui!');
      onUpdate();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCF = async (friend: UserProfile) => {
      try {
          await friendService.addCloseFriend(friend.id);
          await loadCloseFriends();
          setShowSearch(false);
      } catch (e) { alert("Gagal menambah teman"); }
  };

  const handleRemoveCF = async (friendId: string) => {
      if(!confirm("Hapus dari Close Friends?")) return;
      try {
          await friendService.removeCloseFriend(friendId);
          await loadCloseFriends();
      } catch (e) { alert("Gagal menghapus"); }
  };

  return (
    <div className="absolute inset-0 z-50 bg-white dark:bg-telegram-darkSecondary flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-black/20 bg-white dark:bg-telegram-darkSecondary">
        <button onClick={onClose} className="mr-4 text-gray-600 dark:text-gray-300">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Pengaturan</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-black/20">
          <button 
             onClick={() => setTab('profile')}
             className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${tab === 'profile' ? 'border-b-2 border-telegram-primary text-telegram-primary' : 'text-gray-500'}`}
          >
              Profil
          </button>
          <button 
             onClick={() => setTab('closefriends')}
             className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${tab === 'closefriends' ? 'border-b-2 border-green-500 text-green-500' : 'text-gray-500'}`}
          >
              Close Friends
          </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-[#0f1115]">
        {tab === 'profile' ? (
             <div className="space-y-6 max-w-lg mx-auto bg-white dark:bg-telegram-darkSecondary p-6 rounded-2xl shadow-sm">
                <div className="flex flex-col items-center mb-4">
                    <AvatarUpload currentUrl={avatarUrl} onUploadComplete={setAvatarUrl} />
                    <p className="mt-2 text-xs text-gray-400">Ketuk untuk mengganti</p>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Nama Lengkap</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 py-2 focus:border-telegram-primary outline-none dark:text-white" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Username</label>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} className="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 py-2 focus:border-telegram-primary outline-none dark:text-white" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Bio</label>
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-gray-100 dark:bg-black/20 rounded-lg p-3 mt-1 outline-none dark:text-white h-24" />
                </div>
                <button onClick={handleSave} disabled={loading} className="w-full bg-telegram-primary text-white py-3 rounded-xl font-bold hover:bg-telegram-secondary disabled:opacity-50">
                    {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
             </div>
        ) : (
            <div className="max-w-lg mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-700 dark:text-gray-300">Daftar Teman Dekat ({cfList.length})</h3>
                    <button onClick={() => setShowSearch(true)} className="text-sm bg-green-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-green-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Tambah
                    </button>
                </div>
                
                {cfList.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 bg-white dark:bg-telegram-darkSecondary rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                        <p>Belum ada Close Friends.</p>
                        <p className="text-xs mt-1">Story 'Close Friends' hanya bisa dilihat oleh mereka.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {cfList.map(friend => (
                            <div key={friend.id} className="flex items-center justify-between p-3 bg-white dark:bg-telegram-darkSecondary rounded-xl shadow-sm">
                                <div className="flex items-center gap-3">
                                    <img src={friend.avatar_url || DEFAULT_AVATAR} className="w-10 h-10 rounded-full bg-gray-200" alt="av" />
                                    <div>
                                        <p className="font-bold text-sm text-gray-800 dark:text-white">{friend.full_name}</p>
                                        <p className="text-xs text-green-500">@{friend.username}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleRemoveCF(friend.id)} className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>

      {showSearch && (
          <UserSearch 
            currentUserId={user.id} 
            onSelectUser={handleAddCF} 
            onClose={() => setShowSearch(false)} 
          />
      )}
    </div>
  );
};