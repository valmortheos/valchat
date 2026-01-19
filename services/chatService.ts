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

    const { error } = await supabase.from('read_receipts').upsert(updates, { onConflict: 'message_id,user_id' });
    if (error) console.error('Error marking read:', error);
  },

  // Ambil detail siapa saja yang sudah baca pesan ini
  getReadReceipts: async (messageId: number) => {
    const { data, error } = await supabase
      .from('read_receipts')
      .select('user_id, read_at, profiles:user_id(full_name, avatar_url)')
      .eq('message_id', messageId);
    
    if (error) throw error;
    // Map data agar sesuai struktur yang enak dipakai UI
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
    if (error) throw error;
  },

  // Fetch messages dengan filter 'deleted_messages' untuk user saat ini
  fetchMessages: async (roomId: string, currentUserId: string) => {
    // 1. Ambil pesan di room ini
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;

    // 2. Ambil daftar ID pesan yang dihapus oleh user ini (Delete for Me)
    const { data: deletedIds } = await supabase
      .from('deleted_messages')
      .select('message_id')
      .eq('user_id', currentUserId)
      .in('message_id', messages.map(m => m.id));
    
    const hiddenSet = new Set(deletedIds?.map(d => d.message_id));

    // 3. Filter pesan
    return messages.filter(m => !hiddenSet.has(m.id)) as Message[];
  }
};