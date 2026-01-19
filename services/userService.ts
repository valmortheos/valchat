import { supabase } from './supabaseClient';
import { UserProfile } from '../types';

export const userService = {
  // Membuat atau Memperbarui profil
  // Menggunakan UPSERT untuk menangani race condition antara Frontend dan DB Trigger
  createProfile: async (userId: string, email: string, fullName: string, avatarUrl: string, username?: string) => {
    
    // Fallback username jika undefined
    const finalUsername = username || (email.split('@')[0] + Math.floor(Math.random() * 1000));

    // Gunakan upsert: Jika ID sudah ada (karena trigger), update datanya. Jika belum, insert baru.
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      email: email,
      full_name: fullName,
      username: finalUsername,
      avatar_url: avatarUrl,
      last_seen: new Date().toISOString()
    }, { onConflict: 'id' });

    if (error) {
        console.error("Gagal sync profil:", error);
        // Abaikan error duplicate username jika kita hanya mencoba sync otomatis
        if (error.code === '23505') {
             console.warn("Username conflict, user mungkin harus menggantinya di settings.");
        } else {
             throw error;
        }
    }
  },

  getProfile: async (userId: string): Promise<UserProfile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) return null;
      return data as UserProfile;
  },

  updateLastSeen: async (userId: string) => {
      await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', userId);
  }
};