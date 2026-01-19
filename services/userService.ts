import { supabase } from './supabaseClient';
import { UserProfile } from '../types';

export const userService = {
  // Membuat profil baru
  createProfile: async (userId: string, email: string, fullName: string, avatarUrl: string, username?: string) => {
    // 1. Cek dulu apakah profil sudah ada
    const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

    if (existing) return; // Jika sudah ada, skip

    // 2. Gunakan username yang dikirim, atau generate dari email jika kosong
    const finalUsername = username || (email.split('@')[0] + Math.floor(Math.random() * 1000));

    // 3. Insert ke public.profiles
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      email: email,
      full_name: fullName,
      username: finalUsername,
      avatar_url: avatarUrl,
      last_seen: new Date().toISOString()
    });

    if (error) {
        console.error("Gagal membuat profil:", error);
        // Jangan throw error fatal, agar user tetap bisa masuk (nanti bisa edit profil)
        // Kecuali duplicate username (error 23505)
        if (error.code === '23505') {
             throw new Error("Username sudah terpakai saat pembuatan profil.");
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