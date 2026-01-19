import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { presenceService } from '../services/features/presenceService';
import { userService } from '../services/userService';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Message } from '../types';

interface UseGlobalRealtimeProps {
  userId: string | null;
  onNewMessageGlobal: (message: Message) => void; // Callback untuk update sidebar/notif
}

export const useGlobalRealtime = ({ userId, onNewMessageGlobal }: UseGlobalRealtimeProps) => {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const globalChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    // 1. Channel Global untuk Presence (Online Status)
    const globalChannel = supabase.channel('global_presence', {
      config: { presence: { key: userId } }
    });

    globalChannel
      .on('presence', { event: 'sync' }, () => {
        const newState = globalChannel.presenceState();
        const onlineIds = new Set(Object.keys(newState));
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceService.trackPresence(globalChannel, userId);
        }
      });
      
    globalChannelRef.current = globalChannel;

    // 2. Channel Global untuk Pesan Masuk (Sidebar Update)
    // Kita subscribe ke tabel messages secara global, tapi filter di client side atau via filter receiver_id
    // Catatan: Filter receiver_id=eq.userId lebih efisien bandwidth
    const messageChannel = supabase.channel('global_messages')
        .on(
            'postgres_changes',
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `receiver_id=eq.${userId}` // Hanya dengar pesan yang ditujukan ke kita
            },
            (payload) => {
                onNewMessageGlobal(payload.new as Message);
            }
        )
        // Kita juga perlu dengar pesan Public Room agar sidebar update
        .on(
            'postgres_changes',
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `room_id=eq.public` 
            },
            (payload) => {
                 // Abaikan jika pesan dari kita sendiri (biasanya sudah dihandle optimistic UI)
                 if ((payload.new as Message).user_id !== userId) {
                    onNewMessageGlobal(payload.new as Message);
                 }
            }
        )
        .subscribe();


    // Heartbeat untuk Last Seen
    userService.updateLastSeen(userId);
    const intervalId = setInterval(() => {
        userService.updateLastSeen(userId);
    }, 60000);

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(globalChannel);
      supabase.removeChannel(messageChannel);
    };
  }, [userId]);

  return { onlineUsers };
};