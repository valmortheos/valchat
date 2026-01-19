import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { UserProfile } from '../types';
import { DEFAULT_AVATAR } from '../constants';

interface UserSearchProps {
  onSelectUser: (user: UserProfile) => void;
  onClose: () => void;
  currentUserId: string;
}

export const UserSearch: React.FC<UserSearchProps> = ({ onSelectUser, onClose, currentUserId }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${query}%`)
        .neq('id', currentUserId)
        .limit(10);

      if (error) throw error;
      setResults(data as UserProfile[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-white dark:bg-telegram-darkSecondary flex flex-col animate-fade-in-up">
      <div className="flex items-center p-3 border-b border-gray-200 dark:border-black/20 gap-3">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
        </button>
        <form onSubmit={handleSearch} className="flex-1">
            <input 
                autoFocus
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari username..."
                className="w-full bg-gray-100 dark:bg-black/20 rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-telegram-primary dark:text-white"
            />
        </form>
      </div>

      <div className="flex-1 overflow-y-auto">
          {loading ? (
              <div className="p-10 text-center text-gray-500">Mencari...</div>
          ) : results.length > 0 ? (
              <div className="py-2">
                  <p className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Hasil Pencarian</p>
                  {results.map(user => (
                      <div 
                        key={user.id} 
                        onClick={() => onSelectUser(user)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                      >
                          <img src={user.avatar_url || DEFAULT_AVATAR} className="w-12 h-12 rounded-full bg-gray-200" alt="avatar" />
                          <div>
                              <p className="font-semibold text-gray-800 dark:text-gray-100">{user.full_name || 'Tanpa Nama'}</p>
                              <p className="text-sm text-telegram-primary">@{user.username || 'user'}</p>
                              {user.bio && <p className="text-xs text-gray-500 line-clamp-1">{user.bio}</p>}
                          </div>
                      </div>
                  ))}
              </div>
          ) : query && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p>Tidak ditemukan user dengan username "{query}"</p>
              </div>
          )}
      </div>
    </div>
  );
};