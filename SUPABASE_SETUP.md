# Panduan Konfigurasi Database & Supabase (Hard Delete Version)

... (Bagian atas tetap sama) ...

-- 10. AKTIFKAN REALTIME (PENTING!)
-- Tanpa ini, aplikasi harus di-refresh manual untuk melihat pesan baru.
-- Jalankan command ini di SQL Editor Supabase.

BEGIN;
  -- Hapus publikasi lama jika ada untuk reset
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Buat ulang publikasi realtime
  CREATE PUBLICATION supabase_realtime;
  
  -- Masukkan tabel yang butuh fitur realtime
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.read_receipts;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  -- ALTER PUBLICATION supabase_realtime ADD TABLE public.stories; -- Opsional
COMMIT;

-- Pastikan RLS Policy mengizinkan SELECT untuk realtime
-- (Sudah dihandle di step sebelumnya, tapi pastikan policy "Users can view messages in rooms they belong to" aktif)
