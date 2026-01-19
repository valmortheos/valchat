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

  // Realtime subscription untuk status read
  useEffect(() => {
    // Cek status awal
    checkStatus();

    const channel = supabase.channel(`status:${messageId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'read_receipts', filter: `message_id=eq.${messageId}` },
        () => {
          setStatus('read'); // Jika ada entry baru di read_receipts, tandanya sudah dibaca
          if(showInfo) fetchReadInfo(); // Refresh info jika sedang dibuka
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, showInfo]);

  const checkStatus = async () => {
    // Sederhana: jika ada di table read_receipts, anggap read.
    // Untuk 1v1, cukup cek count > 0.
    // Untuk Group, logika bisa lebih kompleks (misal read by all), tapi di sini kita pakai logika "read by anyone" dulu untuk trigger biru
    const { count } = await supabase
      .from('read_receipts')
      .select('*', { count: 'exact', head: true })
      .eq('message_id', messageId);
    
    if (count && count > 0) setStatus('read');
    else setStatus('delivered'); // Asumsi jika sudah terload di client lawan (walau kita gak tau pasti tanpa ACK), kita set delivered. Default sent.
  };

  const fetchReadInfo = async () => {
    try {
      const readers = await chatService.getReadReceipts(messageId);
      setReadBy(readers);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleInfo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isGroup) return; // Info detail hanya relevan di grup
    
    if (!showInfo) fetchReadInfo();
    setShowInfo(!showInfo);
  };

  return (
    <div className="relative inline-flex items-center gap-1 ml-1">
      <span className="text-[10px] text-green-800 dark:text-green-200">{new Date(timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>
      
      <div className="cursor-pointer" onClick={toggleInfo}>
        {status === 'sent' && (
          <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        )}
        {status === 'delivered' && (
           <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7M5 13l4 4L19 7" /></svg>
        )}
        {status === 'read' && (
           <div className="flex">
             <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
             <svg className="w-3 h-3 text-blue-500 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
           </div>
        )}
      </div>

      {/* Popover Info untuk Group Read Receipts */}
      {showInfo && isGroup && (
        <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-2 text-left animate-fade-in-up">
           <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 px-2">Dibaca oleh:</div>
           {readBy.length === 0 ? <div className="text-xs px-2 italic">Belum ada yang membaca</div> : (
             <div className="max-h-32 overflow-y-auto custom-scrollbar">
               {readBy.map((reader, idx) => (
                 <div key={idx} className="flex items-center gap-2 p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded">
                    <img src={reader.user?.avatar_url} className="w-6 h-6 rounded-full" alt="av" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate dark:text-gray-200">{reader.user?.full_name}</div>
                      <div className="text-[9px] text-gray-400">{new Date(reader.read_at).toLocaleTimeString('id-ID')}</div>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      )}
    </div>
  );
};
