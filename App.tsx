import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from './services/supabaseClient';
import { chatService } from './services/chatService';
import { userService } from './services/userService';
import { storyService } from './services/features/storyService';
import { groupService } from './services/features/groupService';
import { Session } from '@supabase/supabase-js';
import { Auth } from './components/Auth';
import { MessageBubble } from './components/chat/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { Settings } from './components/Settings';
import { UserSearch } from './components/UserSearch';
import { ChatHeader } from './components/chat/ChatHeader';
import { MediaPreview } from './components/chat/MediaPreview';
import { CameraCapture } from './components/chat/CameraCapture';
import { UserProfileViewer } from './components/profile/UserProfileViewer';
import { CreateGroupModal } from './components/group/CreateGroupModal';
import { Message, UserProfile, ChatSession, AppNotification, GroupedStories, Group } from './types';
import { Loader } from './components/ui/Loader';
import { APP_NAME, DEFAULT_AVATAR } from './constants';
import { notificationService } from './services/features/notificationService';
import { NotificationPanel } from './components/ui/NotificationPanel';

import { useRealtimeChat } from './hooks/useRealtimeChat';
import { useGlobalRealtime } from './hooks/useGlobalRealtime';

import { StoryList } from './components/story/StoryList';
import { StoryViewer } from './components/story/StoryViewer';
import { StoryCreator } from './components/story/StoryCreator';
import { ForwardModal } from './components/chat/ForwardModal';

// Context
import { UIProvider, useUI } from './contexts/UIContext';

// MAIN CONTENT COMPONENT (Separated to access Context)
const MainApp: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [view, setView] = useState<'home' | 'chat' | 'settings' | 'search'>('home');
  const [activePartner, setActivePartner] = useState<UserProfile | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string>('public');

  const [messages, setMessages] = useState<Message[]>([]);
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<number>>(new Set<number>());
  const [showForwardModal, setShowForwardModal] = useState(false);

  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  
  const [stories, setStories] = useState<GroupedStories[]>([]);
  const [viewingStoryGroup, setViewingStoryGroup] = useState<GroupedStories | null>(null);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use UI Context
  const { showToast, confirm } = useUI();

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

    const unsubNotif = notificationService.subscribe((notifs) => {
        setNotifications([...notifs]);
    });
    notificationService.requestPermission();

    return () => {
        subscription.unsubscribe();
        unsubNotif();
    };
  }, []);

  useEffect(() => {
      if(!session?.user) return;
      const channel = supabase.channel('story_updates')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
              refreshStories(session.user.id);
          })
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [session?.user]);

  const handleGlobalNewMessage = useCallback((msg: Message) => {
      if (!session?.user) return;
      if (msg.room_id !== activeRoomId) {
          fetchRecentChats(session.user.id);
          notificationService.notify(
              `Pesan dari ${msg.user_email?.split('@')[0] || 'User'}`,
              msg.content || 'Mengirim file',
              'message'
          );
      } else {
          fetchRecentChats(session.user.id);
      }
  }, [activeRoomId, session]);

  const { onlineUsers } = useGlobalRealtime({
      userId: session?.user?.id || null,
      onNewMessageGlobal: handleGlobalNewMessage
  });

  useEffect(() => {
      if (!session?.user) return;
      refreshStories(session.user.id);
      const interval = setInterval(() => refreshStories(session.user.id), 60000);
      return () => clearInterval(interval);
  }, [session?.user?.id]);

  const handleMessageReceived = useCallback((newMsg: Message) => {
      if (!session?.user) return;
      if (newMsg.user_id !== session.user.id) {
          setIsPartnerTyping(false);
          chatService.markMessagesAsRead([newMsg.id], session.user.id);
      }
      setMessages(prev => {
          const exists = prev.find(m => m.id === newMsg.id);
          if (exists) return prev;
          
          // Hydrate nested data for reply (limited)
          if (newMsg.reply_to_id && !newMsg.reply_to_message) {
              const originalMsg = prev.find(m => m.id === newMsg.reply_to_id);
              if (originalMsg) {
                  newMsg.reply_to_message = {
                      id: originalMsg.id,
                      content: originalMsg.content,
                      user_email: originalMsg.user_email,
                      file_type: originalMsg.file_type
                  };
              }
          }
          const cleanPrev = prev.filter(m => !(m.isPending && m.content === newMsg.content));
          return [...cleanPrev, newMsg];
      });
      setTimeout(scrollToBottom, 100);
  }, [session?.user?.id]);

  const handleMessageUpdated = useCallback((updatedMsg: Message) => {
      setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
  }, []);

  const handleMessageDeleted = useCallback((deletedId: number) => {
      setMessages(prev => prev.filter(m => m.id !== deletedId));
  }, []);

  const { sendTypingEvent } = useRealtimeChat({
      roomId: view === 'chat' ? activeRoomId : null,
      userId: session?.user?.id || null,
      onMessageReceived: handleMessageReceived,
      onMessageUpdated: handleMessageUpdated,
      onMessageDeleted: handleMessageDeleted,
      onTypingChange: setIsPartnerTyping
  });

  const refreshStories = async (userId: string) => {
      const data = await storyService.fetchStories(userId);
      setStories(data);
  };

  const initUser = async (session: Session) => {
      try {
          let profile = await userService.getProfile(session.user.id);
          if (!profile || !profile.username) {
              const userMeta = session.user.user_metadata || {};
              const email = session.user.email || ''; 
              const fullName = userMeta.full_name || (email ? email.split('@')[0] : 'User');
              const username = userMeta.username || undefined; 
              const avatarUrl = userMeta.avatar_url || DEFAULT_AVATAR;
              
              await userService.createProfile(session.user.id, email, fullName, avatarUrl, username);
              profile = await userService.getProfile(session.user.id);
          }
          if (profile) {
            setUserProfile(profile);
            await fetchRecentChats(session.user.id);
            checkPendingInvites(session.user.id);
          }
      } catch (error) {
          console.error("Error initializing user:", error);
      } finally {
          setLoading(false);
      }
  };

  const checkPendingInvites = async (userId: string) => {
      const invites = await groupService.getPendingInvites(userId);
      if (invites.length > 0) {
          invites.forEach(g => {
             notificationService.notify("Undangan Grup", `Anda diundang ke grup "${g.name}"`, 'info');
             confirm({
                 title: "Undangan Grup",
                 message: `Anda diundang ke grup "${g.name}". Terima?`,
                 confirmText: "Terima",
                 cancelText: "Abaikan",
                 onConfirm: () => {
                     groupService.acceptInvite(g.id, userId).then(() => {
                         fetchRecentChats(userId);
                         showToast("Berhasil bergabung ke grup!", "success");
                     });
                 }
             });
          });
      }
  };

  const getRoomId = (userId1: string, userId2: string) => [userId1, userId2].sort().join('_');

  const fetchRecentChats = async (userId: string) => {
    try {
        const chats: ChatSession[] = [];
        const { data: pData } = await supabase.from('last_messages').select('*').or(`user_id.eq.${userId},receiver_id.eq.${userId}`);
        if (pData) {
             const sortedData = (pData as Message[]).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
             for (const msg of sortedData) {
                 if (msg.room_id === 'public' || !msg.room_id.includes('_')) continue; 
                 const partnerId = msg.user_id === userId ? msg.receiver_id : msg.user_id;
                 if (!partnerId) continue;
                 const { data: partnerProfile } = await supabase.from('profiles').select('*').eq('id', partnerId).single();
                 if (partnerProfile) {
                     chats.push({ room_id: msg.room_id, partner: partnerProfile, last_message: msg });
                 }
             }
        }
        
        const groups = await groupService.getJoinedGroups(userId);
        for(const grp of groups) {
            const { data: lastMsg } = await supabase.from('messages')
                .select('*').eq('room_id', grp.id).order('created_at', {ascending: false}).limit(1).single();
            
            chats.push({
                room_id: grp.id,
                partner: { 
                    id: grp.id,
                    full_name: grp.name,
                    username: 'Group',
                    avatar_url: grp.avatar_url || DEFAULT_AVATAR,
                    email: ''
                },
                last_message: lastMsg || undefined,
                is_group: true,
                group_info: grp
            });
        }
        
        chats.sort((a,b) => {
            const tA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
            const tB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
            return tB - tA;
        });

        setRecentChats(chats);
    } catch (e) { console.warn("Load history failed", e); }
  };

  const openChat = (partner: UserProfile | null, isGroup = false, groupInfo?: Group) => {
      if (!session?.user) return;
      let roomId = 'public';
      
      if (isGroup && groupInfo) {
          roomId = groupInfo.id;
      } else if (partner) {
          roomId = getRoomId(session.user.id, partner.id);
      }
      
      setActivePartner(partner); 
      setActiveRoomId(roomId);
      setView('chat');
      setReplyToMessage(null); 

      chatService.fetchMessages(roomId, session.user.id).then(msgs => {
          setMessages(msgs);
          setTimeout(scrollToBottom, 100);
      });
      
      setIsSelectionMode(false);
      setSelectedMsgIds(new Set());
      setIsPartnerTyping(false); 
  };

  const handleToggleSelection = (msgId: number) => {
    const newSelected = new Set<number>(selectedMsgIds);
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
     confirm({
         title: "Hapus Pesan",
         message: `Hapus ${selectedMsgIds.size} pesan terpilih untuk Anda? (Pesan tidak akan terhapus untuk orang lain)`,
         confirmText: "Hapus",
         onConfirm: async () => {
             if(!session) return;
             const ids = Array.from(selectedMsgIds) as number[];
             try {
                 await chatService.deleteMultipleMessagesForMe(ids, session.user.id);
                 setMessages(prev => prev.filter(m => !selectedMsgIds.has(m.id)));
                 setIsSelectionMode(false);
                 setSelectedMsgIds(new Set());
                 showToast("Pesan dihapus.", "success");
             } catch(e) { 
                 showToast("Gagal menghapus pesan.", "error"); 
             }
         }
     });
  };

  const handleForwardMessages = () => {
     if(selectedMsgIds.size === 0) return;
     setShowForwardModal(true);
  };

  const handleExecuteForward = async (target: ChatSession | UserProfile) => {
      if (!session || !userProfile) return;
      try {
          let targetRoomId = 'public';
          let targetUserId = undefined;

          // Check if target is ChatSession (existing chat) or UserProfile (search result)
          if ('room_id' in target) {
              targetRoomId = target.room_id;
              if(!target.is_group) targetUserId = target.partner.id;
          } else {
              targetRoomId = getRoomId(session.user.id, target.id);
              targetUserId = target.id;
          }

          const selectedMessages = messages.filter(m => selectedMsgIds.has(m.id));
          
          await chatService.forwardMessages(selectedMessages, targetRoomId, session.user.id, userProfile, targetUserId);
          
          showToast("Pesan diteruskan!", "success");
          setShowForwardModal(false);
          setIsSelectionMode(false);
          setSelectedMsgIds(new Set());

          // Optional: Jump to that chat
          if('room_id' in target) openChat(target.partner, target.is_group, target.group_info);
          else openChat(target);

      } catch (e: any) {
          showToast("Gagal meneruskan pesan: " + e.message, "error");
      }
  };

  const handleSendMessage = async (content: string, replyTo?: Message | null, fileUrl?: string, fileType?: 'image' | 'file') => {
    if (!session?.user || !userProfile) return;

    const tempId = Date.now();
    const newMessage: Message = {
        id: tempId,
        created_at: new Date().toISOString(),
        content,
        user_id: userProfile.id,
        user_email: userProfile.username || userProfile.email,
        user_avatar: userProfile.avatar_url,
        receiver_id: activeRoomId === 'public' || activeRoomId.length > 30 ? undefined : activePartner?.id, 
        room_id: activeRoomId,
        file_url: fileUrl,
        file_type: fileType,
        isPending: true,
        reply_to_id: replyTo?.id,
        reply_to_message: replyTo ? {
            id: replyTo.id,
            content: replyTo.content,
            user_email: replyTo.user_email || 'User', 
            file_type: replyTo.file_type
        } : undefined
    };

    setMessages(prev => [...prev, newMessage]);
    setTimeout(scrollToBottom, 50);
    setReplyToMessage(null); 

    const { error } = await supabase.from('messages').insert({
        content,
        user_id: userProfile.id,
        user_email: userProfile.username || userProfile.email,
        user_avatar: userProfile.avatar_url,
        receiver_id: activeRoomId.includes('_') ? activePartner?.id : undefined, 
        room_id: activeRoomId,
        file_url: fileUrl,
        file_type: fileType,
        reply_to_id: replyTo?.id
    });

    if (error) {
        notificationService.notify('Gagal mengirim pesan', error.message, 'error');
        setMessages(prev => prev.filter(m => m.id !== tempId));
        showToast("Gagal mengirim pesan.", "error");
    } else {
        fetchRecentChats(userProfile.id);
    }
  };

  const handleDeleteCallback = async (msgId: number) => {
      if (!session) return;
      try {
          await chatService.deleteMessageForMe(msgId, session.user.id);
          setMessages(prev => prev.filter(m => m.id !== msgId));
          showToast("Pesan dihapus untuk saya.", "success");
      } catch (e) { console.error(e); }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) return <div className="h-screen bg-gray-50 dark:bg-telegram-dark"><Loader /></div>;
  if (!session) return <Auth />;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-telegram-dark font-sans text-gray-900 dark:text-gray-100 relative">
      
      {/* Sidebar */}
      <div className={`
          flex-col w-full md:w-96 bg-white dark:bg-telegram-darkSecondary border-r border-gray-200 dark:border-black/20 z-20 transition-all duration-300
          ${view === 'chat' ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Header Sidebar */}
        <div className="p-4 bg-telegram-primary dark:bg-telegram-darkPrimary text-white shadow-md z-10 sticky top-0 transition-colors">
           <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-xl tracking-tight">{APP_NAME}</span>
              <div className="flex gap-2">
                 <button onClick={() => { setShowCreateGroup(true) }} className="p-2 hover:bg-white/20 rounded-full transition" title="Buat Grup">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                 </button>
                 <button onClick={() => {setDarkMode(!darkMode); document.documentElement.classList.toggle('dark');}} className="p-2 hover:bg-white/20 rounded-full transition">
                    {darkMode ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
                 </button>
                 <button onClick={() => setView('settings')} className="p-2 hover:bg-white/20 rounded-full transition">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 </button>
              </div>
           </div>
           <div onClick={() => setView('search')} className="bg-white/20 hover:bg-white/30 transition rounded-xl p-2.5 flex items-center gap-2 cursor-pointer text-sm text-white/90 backdrop-blur-sm border border-white/10">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <span>Cari teman / username...</span>
           </div>
        </div>

        {userProfile && (
            <StoryList 
                currentUser={userProfile} 
                stories={stories} 
                onSelectGroup={(g) => setViewingStoryGroup(g)}
                onCreateStory={() => setIsCreatingStory(true)}
            />
        )}

        <div className="flex-1 overflow-y-auto">
            <div onClick={() => openChat(null)} className={`p-4 border-b border-gray-100 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition flex gap-4 items-center ${activeRoomId === 'public' ? 'bg-telegram-primary/5 dark:bg-white/5 border-l-4 border-l-telegram-primary' : ''}`}>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-telegram-primary flex items-center justify-center text-white font-bold text-2xl shadow-md transform hover:scale-105 transition-transform">#</div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">Public Room</h3>
                    <p className="text-sm text-gray-500 truncate">Ruang diskusi umum</p>
                </div>
            </div>
            {recentChats.map(chat => (
                <div key={chat.room_id} onClick={() => openChat(chat.partner, chat.is_group, chat.group_info)} className={`p-4 border-b border-gray-100 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition flex gap-4 items-center ${activeRoomId === chat.room_id ? 'bg-telegram-primary/5 dark:bg-white/5 border-l-4 border-l-telegram-primary' : ''}`}>
                    <div className="relative">
                        <img src={chat.partner.avatar_url || DEFAULT_AVATAR} className="w-14 h-14 rounded-2xl bg-gray-200 object-cover shadow-sm" alt="avatar" />
                        {!chat.is_group && onlineUsers.has(chat.partner.id) && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-telegram-darkSecondary rounded-full"></div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                             <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">{chat.partner.full_name || chat.partner.username}</h3>
                             <span className="text-[11px] text-gray-400 font-medium">
                                 {chat.last_message ? new Date(chat.last_message.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : ''}
                             </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
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
        </div>
      </div>

      {view === 'settings' && userProfile && <Settings user={userProfile} onClose={() => setView('home')} onUpdate={() => initUser(session!)} />}
      {view === 'search' && userProfile && <UserSearch currentUserId={userProfile.id} onSelectUser={(u) => openChat(u)} onClose={() => setView('home')} />}

      {/* Main Chat Area */}
      <div className={`
          flex-1 flex-col h-full relative bg-gray-100 dark:bg-telegram-dark w-full max-w-full overflow-hidden
          ${view === 'chat' ? 'flex animate-slide-in-right' : 'hidden md:flex'}
      `}>
         
         <ChatHeader 
            activePartner={activePartner}
            onBack={() => setView('home')}
            messages={messages}
            isSelectionMode={isSelectionMode}
            selectedCount={selectedMsgIds.size}
            onCancelSelection={() => { setIsSelectionMode(false); setSelectedMsgIds(new Set()); }}
            onDeleteSelected={handleBulkDelete}
            onForwardSelected={handleForwardMessages}
            onOpenProfile={() => activePartner && setViewingProfile(activePartner)}
            isTyping={isPartnerTyping}
            isOnline={activePartner ? onlineUsers.has(activePartner.id) : false}
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
                messages.map((msg, index) => {
                    const prevMsg = messages[index - 1];
                    const isSameUser = prevMsg && prevMsg.user_id === msg.user_id;
                    return (
                        <MessageBubble 
                            key={msg.id} 
                            message={msg} 
                            isOwn={msg.user_id === userProfile?.id}
                            isSelected={selectedMsgIds.has(msg.id)}
                            isSelectionMode={isSelectionMode}
                            onSelect={() => handleToggleSelection(msg.id)}
                            onDelete={handleDeleteCallback}
                            onReply={(m) => { setReplyToMessage(m); }}
                            prevMessageSameUser={isSameUser}
                        />
                    );
                })
            )}
            <div ref={messagesEndRef} />
         </div>

         {!isSelectionMode && (
             <ChatInput 
                onSendMessage={(text, replyTo) => handleSendMessage(text, replyTo)} 
                onOpenFile={(file) => setPreviewFile(file)}
                onOpenCamera={() => setIsCameraOpen(true)}
                onTyping={(t) => sendTypingEvent(t)} 
                disabled={false}
                replyTo={replyToMessage}
                onCancelReply={() => setReplyToMessage(null)}
             />
         )}
      </div>

      {previewFile && (
          <MediaPreview 
            file={previewFile} 
            onSend={(url, caption, type) => handleSendMessage(caption, null, url, type)}
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

      <NotificationPanel 
        notifications={notifications} 
        isOpen={showNotifPanel} 
        onClose={() => setShowNotifPanel(false)} 
      />

      {isCreatingStory && userProfile && (
          <StoryCreator 
             userId={userProfile.id}
             onClose={() => setIsCreatingStory(false)}
             onSuccess={() => refreshStories(userProfile.id)}
          />
      )}
      
      {viewingStoryGroup && userProfile && (
          <StoryViewer 
             group={viewingStoryGroup}
             currentUserId={userProfile.id}
             onClose={() => { setViewingStoryGroup(null); fetchRecentChats(userProfile.id); }} 
             onNextGroup={() => {
                 const currentIdx = stories.findIndex(g => g.user.id === viewingStoryGroup.user.id);
                 if (currentIdx < stories.length - 1) setViewingStoryGroup(stories[currentIdx + 1]);
                 else setViewingStoryGroup(null);
             }}
             onPrevGroup={() => {
                 const currentIdx = stories.findIndex(g => g.user.id === viewingStoryGroup.user.id);
                 if (currentIdx > 0) setViewingStoryGroup(stories[currentIdx - 1]);
             }}
             onAddStory={() => { setIsCreatingStory(true); setViewingStoryGroup(null); }}
          />
      )}
      
      {viewingProfile && (
          <UserProfileViewer 
              user={viewingProfile} 
              currentRoomId={activeRoomId}
              onClose={() => setViewingProfile(null)}
              isOnline={onlineUsers.has(viewingProfile.id)}
          />
      )}

      {showCreateGroup && userProfile && (
          <CreateGroupModal 
              creatorId={userProfile.id}
              onClose={() => setShowCreateGroup(false)}
              onGroupCreated={() => fetchRecentChats(userProfile.id)}
          />
      )}

      {showForwardModal && userProfile && (
          <ForwardModal 
              currentUserId={userProfile.id}
              onClose={() => setShowForwardModal(false)}
              onForward={handleExecuteForward}
          />
      )}

    </div>
  );
};

// EXPORTED APP (Wrapped)
export const App: React.FC = () => {
    return (
        <UIProvider>
            <MainApp />
        </UIProvider>
    );
};