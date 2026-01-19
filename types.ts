export interface Message {
  id: number;
  created_at: string;
  content: string | null;
  user_id: string;
  user_email: string;
  user_avatar?: string;
  receiver_id?: string;
  room_id: string;
  file_url?: string | null;
  file_type?: 'image' | 'file' | null;
  isPending?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  last_seen?: string;
  updated_at?: string; 
}

export interface ChatSession {
  room_id: string;
  partner: UserProfile;
  last_message?: Message;
  unread_count?: number;
}

export interface ReadReceipt {
  user_id: string;
  read_at: string;
  user?: UserProfile;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'message';
  timestamp: Date;
  read: boolean;
  link?: string;
}

// STORY TYPES
export interface StoryView {
  viewer_id: string;
  viewed_at: string;
  viewer?: UserProfile;
}

export interface Story {
  id: number;
  user_id: string;
  media_type: 'image' | 'video' | 'text';
  media_url?: string;
  caption?: string;
  background_color?: string; 
  created_at: string;
  expires_at: string;
  privacy: 'public' | 'private'; 
  user?: UserProfile; 
  views?: StoryView[]; // Joined views
  view_count?: number;
}

export interface GroupedStories {
  user: UserProfile;
  stories: Story[];
  hasUnseen: boolean; 
}

// PRESENCE TYPE
export interface UserPresence {
  user_id: string;
  online_at: string;
  status: 'online' | 'offline';
}