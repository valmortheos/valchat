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
    // 1. Fetch pesan untuk backup & cek file
    const { data: msg, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();
    
    if (fetchError || !msg) throw new Error("Pesan tidak ditemukan atau sudah dihapus.");

    const messageData = msg as Message;
    
    // 2. Archive (Best effort)
    await archiveService.archiveMessage(messageData);

    // 3. Hapus File di Storage jika ada
    if (messageData.file_url) {
       try {
           const urlObj = new URL(messageData.file_url);
           // Parsing URL Supabase Storage standar: /storage/v1/object/public/[bucket]/[path]
           const pathParts = urlObj.pathname.split(`/${STORAGE_BUCKET}/`);
           if (pathParts.length > 1) {
               const filePath = pathParts[1]; 
               await supabase.storage.from(STORAGE_BUCKET).remove([decodeURIComponent(filePath)]);
           }
       } catch (e) {
           console.warn("Error parsing/deleting file URL:", e);
       }
    }

    // 4. Hard Delete Row
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

  forwardMessages: async (originalMessages: Message[], targetRoomId: string, senderId: string, senderProfile: any, targetUserId?: string) => {
      // Prepare new messages
      const newMessages = originalMessages.map(msg => ({
          content: msg.content,
          file_url: msg.file_url,
          file_type: msg.file_type,
          user_id: senderId,
          user_email: senderProfile.username || senderProfile.email,
          user_avatar: senderProfile.avatar_url,
          receiver_id: targetUserId, // Undefined if group (handled by trigger/logic) or set correctly
          room_id: targetRoomId,
          created_at: new Date().toISOString()
          // Forwarded messages lose original reply context for simplicity
      }));

      const { error } = await supabase.from('messages').insert(newMessages);
      if (error) throw error;
  },

  fetchMessages: async (roomId: string, currentUserId: string) => {
    // FIX: Nested Join untuk mendapatkan Profile User dari pesan yang di-reply
    // Syntax: relation_name:table_name!fk_name (columns)
    // Di sini kita join 'messages' sebagai 'reply_to_message' via 'reply_to_id'.
    // LALU di dalam 'reply_to_message', kita join 'profiles' via 'user_id' untuk dapat nama.
    
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *, 
        reply_to_message:messages!reply_to_id(
            id, 
            content, 
            user_id, 
            file_type,
            user_email,
            sender_profile:profiles!user_id(full_name, email) 
        ),
        story:stories(id, media_url, media_type, caption)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;

    // Mapping manual untuk memperbaiki struktur data agar sesuai UI
    const formattedMessages = messages.map((m: any) => {
        if (m.reply_to_message) {
            // Prioritas nama: Profile FullName > User Email di Message
            const profileName = m.reply_to_message.sender_profile?.full_name;
            const emailName = m.reply_to_message.user_email; // Fallback legacy
            
            // Inject display name ke object reply_to_message agar UI MessageBubble mudah bacanya
            m.reply_to_message.display_name = profileName || (emailName ? emailName.split('@')[0] : 'Unknown');
            
            // Fallback email jika di reply message kosong
            if(!m.reply_to_message.user_email && m.reply_to_message.sender_profile?.email) {
                m.reply_to_message.user_email = m.reply_to_message.sender_profile.email;
            }
        }
        return m;
    });

    // Filter Deleted Messages (For Me)
    let hiddenSet = new Set<number>();
    try {
      const { data: deletedIds } = await supabase
        .from('deleted_messages')
        .select('message_id')
        .eq('user_id', currentUserId)
        .in('message_id', formattedMessages.map((m: any) => m.id));
      
      if (deletedIds) {
        hiddenSet = new Set(deletedIds.map(d => d.message_id));
      }
    } catch (e) {
      // Ignore
    }

    return formattedMessages.filter((m: any) => !hiddenSet.has(m.id)) as Message[];
  },

  fetchUserMedia: async (targetUserId: string, roomId?: string) => {
    let query = supabase
        .from('messages')
        .select('id, file_url, file_type, created_at')
        .eq('user_id', targetUserId)
        .in('file_type', ['image', 'video'])
        .order('created_at', { ascending: false })
        .limit(9);

    if (roomId && roomId !== 'public' && !roomId.includes('group')) {
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
        const content = m.content || (m.file_type ? `[File: ${m.file_type}]` : '');
        return `[${time}] ${sender}: ${content}`;
    }).join('\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    return URL.createObjectURL(blob);
  }
};