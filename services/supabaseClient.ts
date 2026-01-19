import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase URL atau Anon Key belum diset. Pastikan environment variables sudah dikonfigurasi.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
