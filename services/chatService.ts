import { supabase } from './supabaseClient';
import { Message } from '../types';
import { archiveService } from './features/archiveService';
import { STORAGE_BUCKET } from '../constants';

export const chatService = {
  // Tandai pesan sudah dibaca
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

  /**
   * HARD DELETE untuk Semua Orang
   * Proses:
   * 1. Ambil info pesan (untuk arsip & path file)
   * 2. Arsip ke tabel message_archives (Audit Log)
   * 3. Hapus file fisik di Storage (jika ada)
   * 4. Hapus baris permanen dari tabel messages
   */
  deleteMessageForAll: async (messageId: number) => {
    // 1. Ambil data pesan dulu
    const { data: msg, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();
    
    if (fetchError || !msg) throw new Error("Pesan tidak ditemukan atau sudah dihapus.");

    const messageData = msg as Message;

    // 2. Arsipkan Pesan (ke service terpisah)
    await archiveService.archiveMessage(messageData);

    // 3. Cleanup File di Storage jika ada
    if (messageData.file_url) {
       try {
           const urlObj = new URL(messageData.file_url);
           const pathParts = urlObj.pathname.split(`/${STORAGE_BUCKET}/`);
           if (pathParts.length > 1) {
               const filePath = pathParts[1]; 
               // Hapus file fisik untuk menghemat storage
               await supabase.storage
                  .from(STORAGE_BUCKET)
                  .remove([decodeURIComponent(filePath)]);
           }
       } catch (e) {
           console.warn("Error parsing file URL saat delete (File mungkin sudah hilang):", e);
       }
    }

    // 4. Hard Delete dari Database
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) throw deleteError;
  },

  // Hapus pesan untuk diri sendiri (Hide - Masuk ke tabel deleted_messages)
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
    // Fetch pesan utama
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;

    // Filter pesan yang di-hide (Delete for Me)
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
      // Ignore error if table doesn't exist yet
    }

    return messages.filter(m => !hiddenSet.has(m.id)) as Message[];
  },

  exportChatToText: (messages: Message[]) => {
    const textContent = messages.map(m => {
        const time = new Date(m.created_at).toLocaleString('id-ID');
        const sender = m.user_email.split('@')[0];
        const content = m.content || '[File/Gambar]';
        return `[${time}] ${sender}: ${content}`;
    }).join('\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    return URL.createObjectURL(blob);
  }
};