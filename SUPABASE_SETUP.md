# Panduan Konfigurasi Database & Supabase (Hard Delete Version)

... (Script sebelumnya) ...

-- 11. FITUR REPLY CHAT
-- Pastikan kolom reply_to_id ada dan terhubung sebagai Foreign Key ke tabel messages itu sendiri
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reply_to_id BIGINT REFERENCES public.messages(id) ON DELETE SET NULL;

-- Index untuk mempercepat query saat melakukan JOIN reply_to_message
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);

-- 12. FITUR CLOSE FRIENDS
... (Script Close Friends) ...

-- 13. UPDATE STORY PRIVACY
... (Script Story Privacy) ...

-- 14. FITUR REPLY STORY
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS story_id BIGINT REFERENCES public.stories(id) ON DELETE SET NULL;

-- Index untuk performa query media gallery di profil
CREATE INDEX IF NOT EXISTS idx_messages_user_file ON public.messages(user_id, file_type);