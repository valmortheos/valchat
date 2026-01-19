import { RealtimeChannel } from '@supabase/supabase-js';

export const presenceService = {
  /**
   * Mengirim sinyal typing ke channel
   */
  sendTypingEvent: (channel: RealtimeChannel, userId: string, isTyping: boolean) => {
    if (!channel) return;
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, isTyping }
    });
  },

  /**
   * Melacak status online user (Presence)
   */
  trackPresence: async (channel: RealtimeChannel, userId: string) => {
    if (!channel) return;
    
    // Track user state
    await channel.track({
      user_id: userId,
      online_at: new Date().toISOString(),
    });
  },

  /**
   * Format waktu "Last Seen" menjadi string yang ramah pengguna
   */
  formatLastSeen: (lastSeenIso?: string) => {
    if (!lastSeenIso) return 'Offline';
    
    const last = new Date(lastSeenIso);
    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Online barusan';
    if (diffMinutes < 60) return `Terakhir dilihat ${diffMinutes} menit lalu`;
    if (diffHours < 24) return `Terakhir dilihat ${diffHours} jam lalu`;
    if (diffDays === 1) return `Terakhir dilihat kemarin pukul ${last.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}`;
    
    return `Terakhir dilihat ${last.toLocaleDateString('id-ID')} ${last.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}`;
  }
};