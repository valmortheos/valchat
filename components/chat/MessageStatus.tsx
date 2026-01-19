import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { chatService } from '../../services/chatService';
import { ReadReceipt } from '../../types';

interface MessageStatusProps {
  messageId: number;
  roomId: string;
  isGroup: boolean; // Jika public room atau group
  timestamp: string;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({ messageId, roomId, isGroup, timestamp }) => {
  const [status, setStatus] = useState<'sent' | 'delivered' | 'read'>('sent');
  const [showInfo, setShowInfo] = useState(false);
  const [readBy, setReadBy] = useState<ReadReceipt[]>([]);
  const [loadingReaders, setLoadingReaders] = useState(false);

  // Realtime subscription untuk status read
  useEffect(() => {
    checkStatus();

    const channel = supabase.channel(`status:${messageId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'read_receipts', filter: `message_id=eq.${messageId}` },
        () => {
          setStatus('read'); 
          if(showInfo) fetchReadInfo(); // Refresh list jika modal terbuka
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, showInfo]);

  const checkStatus = async () => {
    // Logic: 1 centang (sent), 2 centang abu (delivered/synced), 2 centang biru (read)
    // Untuk simplifikasi: Jika ada di tabel read_receipts, anggap read (Blue).
    // Jika tidak, anggap delivered (Gray) karena pesan sudah masuk DB.
    const { count } = await supabase
      .from('read_receipts')
      .select('*', { count: 'exact', head: true })
      .eq('message_id', messageId);
    
    if (count && count > 0) setStatus('read');
    else setStatus('delivered'); 
  };

  const fetchReadInfo = async () => {
    setLoadingReaders(true);
    try {
      const readers = await chatService.getReadReceipts(messageId);
      setReadBy(readers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReaders(false);
    }
  };

  const toggleInfo = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Bisa toggle info di DM maupun Group
    if (!showInfo) fetchReadInfo();
    setShowInfo(!showInfo);
  };

  return (
    <div className="relative inline-flex items-center gap-1 ml-1 select-none">
      <span className="text-[10px] text-green-800 dark:text-green-200">
          {new Date(timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
      </span>
      
      <div className="cursor-pointer p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition" onClick={toggleInfo}>
        {status === 'sent' && (
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        )}
        {status === 'delivered' && (
           <div className="flex -space-x-1">
             <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
             <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
           </div>
        )}
        {status === 'read' && (
           <div className="flex -space-x-1">
             <svg className="w-3.5 h-3.5 text-telegram-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
             <svg className="w-3.5 h-3.5 text-telegram-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
           </div>
        )}
      </div>

      {/* Popover Info Detail */}
      {showInfo && (
        <div className="absolute bottom-full right-0 mb-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-3 text-left animate-fade-in origin-bottom-right">
           <div className="flex justify-between items-center mb-2 px-1 border-b border-gray-100 dark:border-gray-700 pb-1">
               <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Info Pesan</span>
               <div className="text-[10px] text-gray-400">Terkirim: {new Date(timestamp).toLocaleTimeString('id-ID')}</div>
           </div>

           <div className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 px-1">Dibaca oleh:</div>
           
           {loadingReaders ? (
               <div className="flex justify-center p-2"><div className="w-4 h-4 border-2 border-telegram-primary border-t-transparent rounded-full animate-spin"></div></div>
           ) : readBy.length === 0 ? (
               <div className="text-xs px-2 italic text-gray-400 py-1">Belum ada yang membaca</div>
           ) : (
             <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
               {readBy.map((reader, idx) => (
                 <div key={idx} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition">
                    <img src={reader.user?.avatar_url || 'https://ui-avatars.com/api/?name=?'} className="w-7 h-7 rounded-full bg-gray-200" alt="av" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate text-gray-800 dark:text-gray-200">{reader.user?.full_name || 'Unknown'}</div>
                      <div className="text-[10px] text-telegram-primary flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          {new Date(reader.read_at).toLocaleDateString('id-ID')} • {new Date(reader.read_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                 </div>
               ))}
             </div>
           )}
           
           {/* Close Overlay */}
           <div className="fixed inset-0 z-[-1]" onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}></div>
        </div>
      )}
    </div>
  );
};