// Vite menggunakan import.meta.env untuk environment variables
// Kami menambahkan fallback value dari kredensial yang Anda berikan agar aplikasi langsung berjalan

// Defensive coding: pastikan env object ada sebelum mengakses propertinya
// Ini mencegah error "Cannot read properties of undefined" jika import.meta.env belum siap
const env = (import.meta as any).env || {};

export const SUPABASE_URL = env.VITE_PUBLIC_SUPABASE_URL || "https://jwdesflbtnzfturnqiov.supabase.co";
export const SUPABASE_ANON_KEY = env.VITE_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3ZGVzZmxidG56ZnR1cm5xaW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg5NDMsImV4cCI6MjA4NDM4NDk0M30.Q94IIFsXCHoFVvmbKFYvLBiBvPMOpVhmWtlJbM9Ipak";

export const APP_NAME = "Val Chat";
export const STORAGE_BUCKET = "chat-files"; 

// Fallback avatar jika user tidak punya foto profil
export const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=2AABEE&color=fff&bold=true";
