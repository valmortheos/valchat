import { supabase } from './supabaseClient';
import { Message } from '../types';

export const chatService = {
  // Tandai pesan sudah dibaca
  markMessagesAsRead: async (messageIds: number[], userId: string) => {
    if (messageIds.length === 0) return;
    
    const updates = messageIds.map(id => ({
      message_id: id,
      user_id: userId,
      read_at: new Date().toISOString()
    }));

    // Gunakan try-catch untuk menangani potensi error koneksi atau tabel missing
    try {
      const { error } = await supabase.from('read_receipts').upsert(updates, { onConflict: 'message_id,user_id' });
      if (error) {
         // Log message spesifik agar tidak muncul [object Object]
         console.warn('Gagal menandai pesan terbaca (mungkin tabel read_receipts belum dibuat?):', error.message);
      }
    } catch (err) {
      console.error('Unexpected error marking read:', err);
    }
  },

  // Ambil detail siapa saja yang sudah baca pesan ini
  getReadReceipts: async (messageId: number) => {
    const { data, error } = await supabase
      .from('read_receipts')
      .select('user_id, read_at, profiles:user_id(full_name, avatar_url)')
      .eq('message_id', messageId);
    
    if (error) {
      console.warn('Gagal load read receipts:', error.message);
      return [];
    }
    return data.map((item: any) => ({
      user_id: item.user_id,
      read_at: item.read_at,
      user: item.profiles
    }));
  },

  // Hapus pesan untuk semua orang (Soft Delete)
  deleteMessageForAll: async (messageId: number) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true, content: null, file_url: null })
      .eq('id', messageId);
    if (error) throw error;
  },

  // Hapus pesan untuk diri sendiri (Hide)
  deleteMessageForMe: async (messageId: number, userId: string) => {
    const { error } = await supabase
      .from('deleted_messages')
      .insert({ message_id: messageId, user_id: userId });
    
    if (error) {
       console.error("Gagal hapus pesan untuk saya:", error.message);
       throw error;
    }
  },

  // Bulk Delete For Me
  deleteMultipleMessagesForMe: async (messageIds: number[], userId: string) => {
    const inserts = messageIds.map(id => ({ message_id: id, user_id: userId }));
    const { error } = await supabase.from('deleted_messages').insert(inserts);
    if (error) {
      console.error("Gagal bulk delete:", error.message);
      throw error;
    }
  },

  // Fetch messages dengan filter 'deleted_messages' untuk user saat ini
  fetchMessages: async (roomId: string, currentUserId: string) => {
    // 1. Fetch pesan utama
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;

    // 2. Fetch daftar pesan yang dihapus oleh user ini
    // Kita handle error dengan soft fail agar chat tetap muncul meski fitur delete rusak/tabel hilang
    let hiddenSet = new Set<number>();
    
    try {
      const { data: deletedIds, error: deletedError } = await supabase
        .from('deleted_messages')
        .select('message_id')
        .eq('user_id', currentUserId)
        .in('message_id', messages.map(m => m.id));
      
      if (!deletedError && deletedIds) {
        hiddenSet = new Set(deletedIds.map(d => d.message_id));
      } else if (deletedError && deletedError.code !== 'PGRST116') { // Ignore empty result error
         console.warn("Gagal cek pesan terhapus:", deletedError.message);
      }
    } catch (e) {
      console.warn("Tabel deleted_messages mungkin belum ada.");
    }

    // 3. Filter pesan
    return messages.filter(m => !hiddenSet.has(m.id)) as Message[];
  },

  // Export Chat ke format text untuk di download
  exportChatToText: (messages: Message[]) => {
    const textContent = messages.map(m => {
        const time = new Date(m.created_at).toLocaleString('id-ID');
        const sender = m.user_email.split('@')[0];
        const content = m.is_deleted ? '[Pesan Dihapus]' : (m.content || '[File/Gambar]');
        return `[${time}] ${sender}: ${content}`;
    }).join('\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    return URL.createObjectURL(blob);
  }
};