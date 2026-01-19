import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { Auth } from './components/Auth';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { Message } from './types';
import { Loader } from './components/ui/Loader';
import { APP_NAME } from './constants';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initial Auth Check & Message Fetch
  useEffect(() => {
    // Cek session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchMessages();
      setLoading(false);
    });

    // Listener perubahan auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchMessages();
    });

    // Cek preferensi dark mode sistem
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
    }

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch Messages
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data as Message[]);
      setTimeout(scrollToBottom, 100);
    }
  };

  // Realtime Subscription
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const handleSendMessage = async (content: string, fileUrl?: string, fileType?: 'image' | 'file') => {
    if (!session?.user) return;

    const { error } = await supabase.from('messages').insert({
      content,
      user_id: session.user.id,
      user_email: session.user.email,
      user_avatar: session.user.user_metadata.avatar_url,
      file_url: fileUrl,
      file_type: fileType,
    });

    if (error) {
      alert('Gagal mengirim pesan: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessages([]);
  };

  if (loading) return <div className="h-screen bg-gray-100 dark:bg-telegram-dark"><Loader /></div>;

  if (!session) return <Auth />;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-telegram-dark">
      {/* Sidebar (Desktop Only) */}
      <div className="hidden md:flex flex-col w-80 bg-white dark:bg-telegram-darkSecondary border-r border-gray-200 dark:border-black/20">
        <div className="p-4 bg-telegram-primary text-white font-bold text-lg flex justify-between items-center shadow-md">
          <span>{APP_NAME}</span>
          <button onClick={toggleDarkMode} className="p-1 rounded hover:bg-white/20">
            {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
            <div className="p-3 rounded-lg bg-telegram-primary/10 dark:bg-white/5 cursor-pointer">
                <div className="font-semibold text-gray-800 dark:text-gray-200">Public Room</div>
                <div className="text-xs text-gray-500 truncate">Ruang chat umum untuk semua user.</div>
            </div>
            {/* Placeholder untuk list user lain atau private chat */}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
           <div className="flex items-center gap-3 mb-3">
              <img src={session.user.user_metadata.avatar_url || 'https://via.placeholder.com/30'} className="w-8 h-8 rounded-full" alt="Profile" />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{session.user.user_metadata.full_name || session.user.email}</p>
                <p className="text-xs text-green-500">Online</p>
              </div>
           </div>
           <button onClick={handleLogout} className="w-full text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded transition">
               Keluar
           </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header Mobile & Desktop */}
        <header className="bg-white dark:bg-telegram-darkSecondary p-3 flex items-center justify-between shadow-sm z-10 shrink-0">
           <div className="flex items-center gap-3">
             <div className="md:hidden w-10 h-10 bg-gradient-to-tr from-telegram-primary to-blue-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                V
             </div>
             <div>
                <h2 className="font-bold text-gray-800 dark:text-white text-lg">Public Room</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{messages.length} pesan</p>
             </div>
           </div>
           
           <div className="flex items-center gap-2">
              <button onClick={toggleDarkMode} className="md:hidden p-2 text-gray-600 dark:text-gray-300">
                {darkMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
              </button>
              <button onClick={handleLogout} className="md:hidden p-2 text-gray-600 dark:text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
           </div>
        </header>

        {/* Background Pattern Overlay (Optional Aesthetic) */}
        <div className="absolute inset-0 bg-repeat opacity-5 pointer-events-none z-0" style={{ backgroundImage: "url('https://web.telegram.org/img/bg_0.png')", backgroundSize: '400px' }}></div>

        {/* Message List */}
        <div 
            className="flex-1 overflow-y-auto p-4 z-0 space-y-1 scroll-smooth" 
            ref={scrollContainerRef}
            style={{ 
              backgroundImage: darkMode ? 'none' : 'radial-gradient(circle, #f5f5f5 1px, transparent 1px)', 
              backgroundSize: '20px 20px' 
            }}
        >
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                    <div className="bg-gray-200 dark:bg-gray-700 p-4 rounded-full mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-center">Belum ada pesan.<br/>Mulailah percakapan!</p>
                </div>
            )}
            
            {messages.map((msg) => (
                <MessageBubble 
                    key={msg.id} 
                    message={msg} 
                    isOwn={msg.user_id === session.user.id} 
                />
            ))}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="z-10 shrink-0">
            <ChatInput onSendMessage={handleSendMessage} disabled={loading} />
            <div className="bg-white dark:bg-telegram-darkSecondary text-center py-1 text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-800">
               {APP_NAME} &copy; Created by Valmortheos
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;
