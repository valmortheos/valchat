import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { ChatSession, UserProfile } from '../../types';
import { DEFAULT_AVATAR } from '../../constants';
import { UserSearch } from '../UserSearch';

interface ForwardModalProps {
    onClose: () => void;
    onForward: (target: ChatSession | UserProfile) => void; // Target bisa berupa existing session atau user baru
    currentUserId: string;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({ onClose, onForward, currentUserId }) => {
    const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSearch, setShowSearch] = useState(false);

    useEffect(() => {
        loadRecentChats();
    }, []);

    const loadRecentChats = async () => {
        setLoading(true);
        try {
            // Re-using logic from App.tsx fetchRecentChats roughly
            const { data } = await supabase.from('last_messages').select('*').or(`user_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`).limit(10);
            
            const chats: ChatSession[] = [];
            if (data) {
                // Deduplicate and process
                 const processedIds = new Set();
                 for (const msg of data) {
                     if (msg.room_id === 'public') continue;
                     if (processedIds.has(msg.room_id)) continue;
                     
                     const partnerId = msg.user_id === currentUserId ? msg.receiver_id : msg.user_id;
                     if (!partnerId) continue;
                     
                     const { data: partnerProfile } = await supabase.from('profiles').select('*').eq('id', partnerId).single();
                     if (partnerProfile) {
                         chats.push({ room_id: msg.room_id, partner: partnerProfile, last_message: msg });
                         processedIds.add(msg.room_id);
                     }
                 }
            }
            setRecentChats(chats);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-telegram-darkSecondary w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-black/20">
                    <h3 className="font-bold text-gray-800 dark:text-white">Teruskan ke...</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {/* Search Trigger */}
                    <div onClick={() => setShowSearch(true)} className="p-3 mb-2 bg-gray-100 dark:bg-white/5 rounded-xl flex items-center gap-3 cursor-pointer text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 transition">
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                         <span>Cari pengguna lain...</span>
                    </div>

                    <p className="px-2 text-xs font-bold text-gray-400 uppercase mb-2">Chat Terbaru</p>
                    
                    {loading ? (
                        <div className="text-center p-4 text-gray-400">Memuat...</div>
                    ) : recentChats.length === 0 ? (
                        <div className="text-center p-4 text-gray-400 italic">Belum ada chat terbaru.</div>
                    ) : (
                        recentChats.map(chat => (
                            <div key={chat.room_id} onClick={() => onForward(chat)} className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl cursor-pointer transition">
                                <img src={chat.partner.avatar_url || DEFAULT_AVATAR} className="w-10 h-10 rounded-full bg-gray-200 object-cover" alt="av" />
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-white">{chat.partner.full_name}</p>
                                    <p className="text-xs text-gray-500">@{chat.partner.username}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {showSearch && (
                <UserSearch 
                    currentUserId={currentUserId}
                    onClose={() => setShowSearch(false)}
                    onSelectUser={(u) => { onForward(u); setShowSearch(false); }}
                />
            )}
        </div>
    );
};