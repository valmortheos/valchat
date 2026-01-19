import { supabase } from './supabaseClient';

export const authService = {
  // Login dengan Email OR Username & Password
  signIn: async (loginIdentifier: string, pass: string) => {
    let email = loginIdentifier;

    // Jika input tidak mengandung '@', asumsikan itu Username
    if (!loginIdentifier.includes('@')) {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', loginIdentifier)
        .single();
      
      if (error || !data) {
        throw new Error("Username tidak ditemukan.");
      }
      email = data.email;
    }

    // Login ke Supabase menggunakan Email (entah dari input langsung atau hasil lookup username)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
    return data;
  },

  // Daftar Akun Baru dengan Metadata tambahan
  signUp: async (email: string, pass: string, username: string, fullName: string) => {
    // Cek username availability di profiles dulu sebelum hit auth (optional but recommended for UX)
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();
    
    if (existingUser) {
      throw new Error("Username sudah digunakan.");
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          username: username,
          full_name: fullName,
        }
      }
    });
    if (error) throw error;
    return data;
  },

  // Logout
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
};