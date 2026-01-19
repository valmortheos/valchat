import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './services/supabaseClient';
import { chatService } from './services/chatService';
import { userService } from './services/userService';
import { Session, RealtimeChannel } from '@supabase/supabase-js';
import { Auth } from './components/Auth';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { Settings } from './components/Settings';
import { UserSearch } from './components/UserSearch';
import { ChatHeader } from './components/chat/ChatHeader';
import { MediaPreview } from './components/chat/MediaPreview';
import { CameraCapture } from './components/chat/CameraCapture';
import { Message, UserProfile, ChatSession } from './types';
import { Loader } from './components/ui/Loader';
import { APP_NAME, DEFAULT_AVATAR } from './constants';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [view, setView] = useState<'home' | 'chat' | 'settings' | 'search'>('home');
  const [activePartner, setActivePartner] = useState<UserProfile | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string>('public');

  const [messages, setMessages] = useState<Message[]>([]);
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // New Media States
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<number>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const partnerStatusRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) initUser(session);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) initUser(session);
      else {
          setUserProfile(null);
          setLoading(false);
      }
    });

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
    }

    return () => subscription.unsubscribe();
  }, []);

  // Heartbeat: Update Last Seen setiap 60 detik agar status online akurat
  useEffect(() => {
    if (!session?.user) return;
    userService.updateLastSeen(session.user.id);
    const intervalId = setInterval(() => {
        userService.updateLastSeen(session.user.id);
    }, 60000);
    return () => clearInterval(intervalId);
  }, [session]);

  // Realtime subscription untuk status partner saat chat dibuka
  useEffect(() => {
    if (!activePartner || view !== 'chat') {
        if (partnerStatusRef.current) {
            supabase.removeChannel(partnerStatusRef.current);
            partnerStatusRef.current = null;
        }
        return;
    }

    const channel = supabase.channel(`status_partner_${activePartner.id}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${activePartner.id}` },
            (payload) => {
                const updatedProfile = payload.new as UserProfile;
                setActivePartner(updatedProfile); 
            }
        )
        .subscribe();
    
    partnerStatusRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [activePartner?.id, view]);


  const initUser = async (session: Session) => {
      try {
          let profile = await userService.getProfile(session.user.id);
          if (!profile || !profile.username) {
              const userMeta = session.user.user_metadata || {};
              const email = session.user.email!;
              const fullName = userMeta.full_name || email.split('@')[0];
              const username = userMeta.username || undefined; 
              const avatarUrl = userMeta.avatar_url || DEFAULT_AVATAR;
              
              await userService.createProfile(session.user.id, email, fullName, avatarUrl, username);
              profile = await userService.getProfile(session.user.id);
          }
          if (profile) {
            setUserProfile(profile);
            await fetchRecentChats(session.user.id);
          }
      } catch (error) {
          console.error("Error initializing user:", error);
      } finally {
          setLoading(false);
      }
  };

  const getRoomId = (userId1: string, userId2: string) => [userId1, userId2].sort().join('_');

  const fetchRecentChats = async (userId: string) => {
    try {
        const { data } = await supabase.from('last_messages').select('*').or(`user_id.eq.${userId},receiver_id.eq.${userId}`);
        if (data) {
             const chats: ChatSession[] = [];
             for (const msg of data as Message[]) {
                 if (msg.room_id === 'public') continue;
                 const partnerId = msg.user_id === userId ? msg.receiver_id : msg.user_id;
                 if (!partnerId) continue;
                 const { data: partnerProfile } = await supabase.from('profiles').select('*').eq('id', partnerId).single();
                 if (partnerProfile) {
                     chats.push({ room_id: msg.room_id, partner: partnerProfile, last_message: msg });
                 }
             }
             setRecentChats(chats);
        }
    } catch (e) { console.warn("Load history failed", e); }
  };

  const openChat = (partner: UserProfile | null) => {
      if (!session?.user) return;
      const roomId = partner ? getRoomId(session.user.id, partner.id) : 'public';
      setActivePartner(partner);
      setActiveRoomId(roomId);
      setView('chat');
      setIsSelectionMode(false);
      setSelectedMsgIds(new Set());
  };

  useEffect(() => {
      if (!session || !activeRoomId || !userProfile) return;
      
      const loadMessages = async () => {
          const msgs = await chatService.fetchMessages(activeRoomId, session.user.id);
          setMessages(msgs);
          setTimeout(scrollToBottom, 100);

          const unreadMsgIds = msgs.filter(m => m.user_id !== session.user.id).map(m => m.id);
          if(unreadMsgIds.length > 0) {
             chatService.markMessagesAsRead(unreadMsgIds, session.user.id);
          }
      };

      loadMessages();

      const channel = supabase.channel(`room:${activeRoomId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${activeRoomId}` },
            async (payload) => {
                if (payload.eventType === 'UPDATE') {
                    setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as Message : m));
                }
                else if (payload.eventType === 'INSERT') {
                    const newMsg = payload.new as Message;
                    if (newMsg.user_id !== session.user.id) {
                        chatService.markMessagesAsRead([newMsg.id], session.user.id);
                    }
                    setMessages(prev => {
                        const exists = prev.find(m => m.id === newMsg.id);
                        if (exists) return prev;
                        return [...prev.filter(m => !m.isPending), newMsg];
                    });
                    setTimeout(scrollToBottom, 100);
                }
                // Handle Hard Delete: Pesan dihapus dari DB, jadi kita hapus dari state UI
                else if (payload.eventType === 'DELETE') {
                    const deletedId = payload.old.id;
                    setMessages(prev => prev.filter(m => m.id !== deletedId));
                }
            }
        )
        .subscribe();
      
      channelRef.current = channel;
      return () => { supabase.removeChannel(channel); };
  }, [activeRoomId, session, userProfile]);

  const handleToggleSelection = (msgId: number) => {
    const newSelected = new Set(selectedMsgIds);
    if (newSelected.has(msgId)) {
        newSelected.delete(msgId);
        if (newSelected.size === 0) setIsSelectionMode(false);
    } else {
        newSelected.add(msgId);
        setIsSelectionMode(true);
    }
    setSelectedMsgIds(newSelected);
  };

  const handleBulkDelete = async () => {
     if(!confirm(`Hapus ${selectedMsgIds.size} pesan terpilih untuk Anda?`)) return;
     if(!session) return;

     const ids = Array.from(selectedMsgIds);
     try {
         await chatService.deleteMultipleMessagesForMe(ids, session.user.id);
         // Hapus lokal agar UI responsif
         setMessages(prev => prev.filter(m => !selectedMsgIds.has(m.id)));
         setIsSelectionMode(false);
         setSelectedMsgIds(new Set());
     } catch(e) { alert("Gagal menghapus pesan"); }
  };

  const handleForwardMessages = () => {
     if(selectedMsgIds.size === 0) return;
     alert("Fitur Forward Pesan akan segera hadir! (Pilih user tujuan -> Kirim)");
     setIsSelectionMode(false);
     setSelectedMsgIds(new Set());
  };

  const handleSendMessage = async (content: string, fileUrl?: string, fileType?: 'image' | 'file') => {
    if (!session?.user || !userProfile) return;

    const tempId = Date.now();
    const newMessage: Message = {
        id: tempId,
        created_at: new Date().toISOString(),
        content,
        user_id: userProfile.id,
        user_email: userProfile.username || userProfile.email,
        user_avatar: userProfile.avatar_url,
        receiver_id: activePartner?.id,
        room_id: activeRoomId,
        file_url: fileUrl,
        file_type: fileType,
        isPending: true
    };

    setMessages(prev => [...prev, newMessage]);
    setTimeout(scrollToBottom, 50);

    const { error } = await supabase.from('messages').insert({
        content,
        user_id: userProfile.id,
        user_email: userProfile.username || userProfile.email,
        user_avatar: userProfile.avatar_url,
        receiver_id: activePartner?.id,
        room_id: activeRoomId,
        file_url: fileUrl,
        file_type: fileType
    });

    if (error) {
        alert("Gagal kirim: " + error.message);
        setMessages(prev => prev.filter(m => m.id !== tempId));
    } else {
        if (activePartner && !recentChats.find(c => c.room_id === activeRoomId)) {
            fetchRecentChats(userProfile.id);
        }
    }
  };

  // Callback delete untuk satu pesan (dari Context Menu Bubble)
  const handleDeleteCallback = async (msgId: number) => {
      if (!session) return;
      try {
          await chatService.deleteMessageForMe(msgId, session.user.id);
          setMessages(prev => prev.filter(m => m.id !== msgId));
      } catch (e) { console.error(e); }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) return <div className="h-screen bg-gray-50 dark:bg-telegram-dark"><Loader /></div>;
  if (!session) return <Auth />;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-telegram-dark font-sans text-gray-900 dark:text-gray-100">
      
      {/* Sidebar */}
      <div className={`${view === 'chat' ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 bg-white dark:bg-telegram-darkSecondary border-r border-gray-200 dark:border-black/20 z-20`}>
        {/* Header Sidebar */}
        <div className="p-4 bg-telegram-primary text-white shadow-md z-10 sticky top-0">
           <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-xl tracking-tight">{APP_NAME}</span>
              <div className="flex gap-2">
                 <button onClick={() => {setDarkMode(!darkMode); document.documentElement.classList.toggle('dark');}} className="p-2 hover:bg-white/20 rounded-full transition">
                    {darkMode ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
                 </button>
                 <button onClick={() => setView('settings')} className="p-2 hover:bg-white/20 rounded-full transition">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 </button>
              </div>
           </div>
           <div onClick={() => setView('search')} className="bg-white/20 hover:bg-white/30 transition rounded-xl p-2.5 flex items-center gap-2 cursor-pointer text-sm text-white/90 backdrop-blur-sm border border-white/10">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <span>Cari teman / username...</span>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto">
            <div onClick={() => openChat(null)} className={`p-4 border-b border-gray-100 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition flex gap-4 items-center ${activeRoomId === 'public' ? 'bg-telegram-primary/5 dark:bg-white/5 border-l-4 border-l-telegram-primary' : ''}`}>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-telegram-primary flex items-center justify-center text-white font-bold text-2xl shadow-md transform hover:scale-105 transition-transform">#</div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">Public Room</h3>
                    <p className="text-sm text-gray-500 truncate">Ruang diskusi umum</p>
                </div>
            </div>
            {recentChats.map(chat => (
                <div key={chat.room_id} onClick={() => openChat(chat.partner)} className={`p-4 border-b border-gray-100 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition flex gap-4 items-center ${activeRoomId === chat.room_id ? 'bg-telegram-primary/5 dark:bg-white/5 border-l-4 border-l-telegram-primary' : ''}`}>
                    <img src={chat.partner.avatar_url || DEFAULT_AVATAR} className="w-14 h-14 rounded-2xl bg-gray-200 object-cover shadow-sm" alt="avatar" />
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                             <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">{chat.partner.full_name || chat.partner.username}</h3>
                             <span className="text-[11px] text-gray-400 font-medium">
                                 {chat.last_message ? new Date(chat.last_message.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : ''}
                             </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                            {/* Logika display pesan dihapus tidak lagi relevan karena Hard Delete */}
                            {chat.last_message?.content || (chat.last_message?.file_type === 'image' ? '📷 Foto' : '📎 Berkas')}
                        </p>
                    </div>
                </div>
            ))}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-black/20 border-t border-gray-200 dark:border-gray-800 flex items-center gap-4">
             <img src={userProfile?.avatar_url || DEFAULT_AVATAR} className="w-12 h-12 rounded-2xl border-2 border-white dark:border-gray-700 shadow-sm object-cover" alt="me" />
             <div className="flex-1 overflow-hidden">
                 <p className="font-bold text-gray-800 dark:text-white truncate">{userProfile?.full_name || 'User'}</p>
                 <p className="text-xs text-telegram-primary font-bold uppercase tracking-wider truncate">@{userProfile?.username || 'username'}</p>
             </div>
             <button onClick={() => supabase.auth.signOut()} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-xl transition"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
        </div>
      </div>

      {view === 'settings' && userProfile && <Settings user={userProfile} onClose={() => setView('home')} onUpdate={() => initUser(session!)} />}
      {view === 'search' && userProfile && <UserSearch currentUserId={userProfile.id} onSelectUser={(u) => openChat(u)} onClose={() => setView('home')} />}

      {/* Main Chat Area */}
      <div className={`${view === 'home' || view === 'settings' || view === 'search' ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full relative bg-gray-100 dark:bg-telegram-dark w-full max-w-full overflow-hidden`}>
         
         <ChatHeader 
            activePartner={activePartner}
            onBack={() => setView('home')}
            messages={messages}
            isSelectionMode={isSelectionMode}
            selectedCount={selectedMsgIds.size}
            onCancelSelection={() => { setIsSelectionMode(false); setSelectedMsgIds(new Set()); }}
            onDeleteSelected={handleBulkDelete}
            onForwardSelected={handleForwardMessages}
         />

         <div className="absolute inset-0 bg-repeat opacity-5 pointer-events-none z-0 mt-16" style={{ backgroundImage: "url('https://web.telegram.org/img/bg_0.png')", backgroundSize: '400px' }}></div>

         <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 z-0 space-y-1 pt-20 pb-4 w-full">
            {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60 animate-fade-in">
                    <div className="w-24 h-24 bg-gray-200 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    <p className="font-medium">Belum ada pesan</p>
                    <p className="text-sm">Mulai percakapan sekarang!</p>
                </div>
            ) : (
                messages.map(msg => (
                    <MessageBubble 
                        key={msg.id} 
                        message={msg} 
                        isOwn={msg.user_id === userProfile?.id}
                        isSelected={selectedMsgIds.has(msg.id)}
                        isSelectionMode={isSelectionMode}
                        onSelect={() => handleToggleSelection(msg.id)}
                        onDelete={handleDeleteCallback}
                    />
                ))
            )}
            <div ref={messagesEndRef} />
         </div>

         {!isSelectionMode && (
             <ChatInput 
                onSendMessage={(text) => handleSendMessage(text)} 
                onOpenFile={(file) => setPreviewFile(file)}
                onOpenCamera={() => setIsCameraOpen(true)}
                onTyping={() => {}} 
                disabled={false} 
             />
         )}
      </div>

      {previewFile && (
          <MediaPreview 
            file={previewFile} 
            onSend={(url, caption, type) => handleSendMessage(caption, url, type)}
            onClose={() => setPreviewFile(null)}
          />
      )}

      {isCameraOpen && (
          <CameraCapture 
            onCapture={(file) => {
                setIsCameraOpen(false);
                setPreviewFile(file);
            }}
            onClose={() => setIsCameraOpen(false)}
          />
      )}

    </div>
  );
};

export default App;