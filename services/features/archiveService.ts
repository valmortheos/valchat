import { supabase } from '../supabaseClient';
import { Message } from '../../types';

export const archiveService = {
  /**
   * Mengarsipkan pesan ke tabel `message_archives`.
   * Digunakan sebelum melakukan Hard Delete pada tabel messages.
   */
  archiveMessage: async (message: Message) => {
    const { error } = await supabase.from('message_archives').insert({
      original_message_id: message.id,
      content: message.content,
      file_url: message.file_url,
      user_id: message.user_id,
      room_id: message.room_id
    });

    if (error) {
      console.error("Gagal mengarsipkan pesan:", error.message);
      // Kita log error tapi tidak throw, agar proses delete utama tetap bisa berlanjut
      // (tergantung kebijakan data: strict archive atau best effort)
    }
  }
};