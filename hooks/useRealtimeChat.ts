import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { presenceService } from '../services/features/presenceService';
import { Message } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeChatProps {
  roomId: string | null;
  userId: string | null;
  onMessageReceived: (message: Message) => void;
  onMessageUpdated: (message: Message) => void;
  onMessageDeleted: (messageId: number) => void;
  onTypingChange: (isTyping: boolean) => void;
}

export const useRealtimeChat = ({
  roomId,
  userId,
  onMessageReceived,
  onMessageUpdated,
  onMessageDeleted,
  onTypingChange
}: UseRealtimeChatProps) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!roomId || !userId) return;

    // Bersihkan channel lama jika ganti room
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Reset typing state saat ganti room
    onTypingChange(false);

    const channel = supabase.channel(`room:${roomId}`);

    channel
      // 1. Listen Pesan Baru (INSERT)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          // Filter pesan pending (optimistic UI) agar tidak duplikat
          // Logic filtering biasanya di handle di state parent, tapi di sini kita terima raw data
          onMessageReceived(newMsg);
        }
      )
      // 2. Listen Update Pesan (Edit content / Read status sync)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          onMessageUpdated(payload.new as Message);
        }
      )
      // 3. Listen Hapus Pesan (DELETE)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          onMessageDeleted(payload.old.id);
        }
      )
      // 4. Listen Typing Indicator (Broadcast)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        // Abaikan typing dari diri sendiri
        if (payload.userId !== userId) {
          onTypingChange(payload.isTyping);
        }
      })
      .subscribe();

    channelRef.current = channel;

    // Cleanup saat unmount atau room ganti
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, userId]);

  // Fungsi helper untuk mengirim event typing
  const sendTypingEvent = (isTyping: boolean) => {
    if (channelRef.current && userId) {
      presenceService.sendTypingEvent(channelRef.current, userId, isTyping);
    }
  };

  return { sendTypingEvent };
};