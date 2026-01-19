import { supabase } from '../../services/supabaseClient';
import { Message } from '../../types';

export const archiveService = {
  /**
   * Mengarsipkan pesan ke tabel `message_archives`.
   * Digunakan sebelum melakukan Hard Delete pada tabel messages.
   * Tabel archives bersifat independen (tidak punya Foreign Key ke messages)
   * agar data tidak ikut terhapus saat pesan asli di-delete.
   */
  archiveMessage: async (message: Message) => {
    // Kita abaikan error di sini agar UX delete tetap cepat.
    // Data arsip bersifat "best effort" untuk keperluan audit.
    const { error } = await supabase.from('message_archives').insert({
      original_message_id: message.id,
      content: message.content,
      file_url: message.file_url,
      user_id: message.user_id,
      room_id: message.room_id
    });

    if (error) {
      console.warn("Gagal mengarsipkan pesan (Non-blocking):", error.message);
    }
  }
};