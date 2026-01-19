export interface Message {
  id: number;
  created_at: string;
  content: string | null;
  user_id: string;
  user_email: string;
  user_avatar?: string;
  file_url?: string | null;
  file_type?: 'image' | 'file' | null;
}

export interface UserProfile {
  id: string;
  email: string;
  avatar_url?: string;
  full_name?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
