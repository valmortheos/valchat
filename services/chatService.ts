import { supabase } from './supabaseClient';
import { Message } from '../types';
import { archiveService } from './features/archiveService';
import { STORAGE_BUCKET } from '../constants';

export const chatService = {
  markMessagesAsRead: async (messageIds: number[], userId: string) => {
    if (messageIds.length === 0) return;
    
    const updates = messageIds.map(id => ({
      message_id: id,
      user_id: userId,
      read_at: new Date().toISOString()
    }));

    try {
      const { error } = await supabase.from('read_receipts').upsert(updates, { onConflict: 'message_id,user_id' });
      if (error) console.warn('Gagal read receipt:', error.message);
    } catch (err) {
      console.error('Unexpected error marking read:', err);
    }
  },

  getReadReceipts: async (messageId: number) => {
    const { data, error } = await supabase
      .from('read_receipts')
      .select('user_id, read_at, profiles:user_id(full_name, avatar_url)')
      .eq('message_id', messageId);
    
    if (error) return [];
    return data.map((item: any) => ({
      user_id: item.user_id,
      read_at: item.read_at,
      user: item.profiles
    }));
  },

  deleteMessageForAll: async (messageId: number) => {
    const { data: msg, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();
    
    if (fetchError || !msg) throw new Error("Pesan tidak ditemukan atau sudah dihapus.");

    const messageData = msg as Message;
    await archiveService.archiveMessage(messageData);

    if (messageData.file_url) {
       try {
           const urlObj = new URL(messageData.file_url);
           const pathParts = urlObj.pathname.split(`/${STORAGE_BUCKET}/`);
           if (pathParts.length > 1) {
               const filePath = pathParts[1]; 
               await supabase.storage.from(STORAGE_BUCKET).remove([decodeURIComponent(filePath)]);
           }
       } catch (e) {
           console.warn("Error parsing file URL saat delete (File mungkin sudah hilang):", e);
       }
    }

    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) throw deleteError;
  },

  deleteMessageForMe: async (messageId: number, userId: string) => {
    const { error } = await supabase
      .from('deleted_messages')
      .insert({ message_id: messageId, user_id: userId });
    
    if (error) throw error;
  },

  deleteMultipleMessagesForMe: async (messageIds: number[], userId: string) => {
    const inserts = messageIds.map(id => ({ message_id: id, user_id: userId }));
    const { error } = await supabase.from('deleted_messages').insert(inserts);
    if (error) throw error;
  },

  fetchMessages: async (roomId: string, currentUserId: string) => {
    // Fetch pesan utama DENGAN JOIN ke pesan yang di-reply DAN JOIN ke story
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *, 
        reply_to_message:messages!reply_to_id(id, content, user_email, file_type),
        story:stories(id, media_url, media_type, caption)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;

    let hiddenSet = new Set<number>();
    try {
      const { data: deletedIds } = await supabase
        .from('deleted_messages')
        .select('message_id')
        .eq('user_id', currentUserId)
        .in('message_id', messages.map(m => m.id));
      
      if (deletedIds) {
        hiddenSet = new Set(deletedIds.map(d => d.message_id));
      }
    } catch (e) {
      // Ignore
    }

    return messages.filter(m => !hiddenSet.has(m.id)) as Message[];
  },

  // Fetch 3 Media Terakhir untuk Profil User (Mirip Instagram/Whatsapp Info)
  fetchUserMedia: async (targetUserId: string, roomId?: string) => {
    let query = supabase
        .from('messages')
        .select('id, file_url, file_type, created_at')
        .eq('user_id', targetUserId)
        .in('file_type', ['image', 'video'])
        .order('created_at', { ascending: false })
        .limit(3);

    // Jika roomId ada, ambil media dari chat spesifik ini saja. 
    // Jika tidak (misal public profile), ambil dari mana saja (atau batasi public room).
    // Disini kita batasi ke roomId jika ada demi privasi.
    if (roomId && roomId !== 'public') {
        query = query.eq('room_id', roomId);
    }

    const { data, error } = await query;
    if (error) return [];
    return data;
  },

  exportChatToText: (messages: Message[]) => {
    const textContent = messages.map(m => {
        const time = new Date(m.created_at).toLocaleString('id-ID');
        const sender = m.user_email?.split('@')[0] || 'Unknown';
        const content = m.content || '[File/Gambar]';
        return `[${time}] ${sender}: ${content}`;
    }).join('\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    return URL.createObjectURL(blob);
  }
};