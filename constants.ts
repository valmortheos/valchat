// Pastikan Anda mengisi environment variable ini di platform deployment (Vercel)
// Atau ganti string kosong di bawah ini dengan URL dan Key Supabase Anda untuk testing lokal
export const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const APP_NAME = "Val Chat";
export const STORAGE_BUCKET = "chat-files"; 

// Fallback avatar jika user tidak punya foto profil
export const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=2AABEE&color=fff&bold=true";
