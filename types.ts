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
  reply_to_id?: number | null;
  reply_to_message?: {
    id: number;
    content: string | null;
    user_email: string;
    file_type?: 'image' | 'file' | null;
  };
  story_id?: number | null;
  story?: {
    id: number;
    media_url?: string;
    media_type: 'image' | 'video' | 'text';
    caption?: string;
  };
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
  connection_status?: 'connected' | 'pending' | 'none' | 'received'; // UI Helper
}

export interface ChatSession {
  room_id: string;
  partner: UserProfile; // Jika personal chat, partner adalah user. Jika group, partner adalah GroupInfo (diakali)
  last_message?: Message;
  unread_count?: number;
  is_group?: boolean; // New
  group_info?: Group; // New
}

export interface Group {
    id: string;
    name: string;
    avatar_url?: string;
    created_by: string;
    created_at: string;
}

export interface Connection {
    id: number;
    user_id: string;
    friend_id: string;
    status: 'pending' | 'accepted';
    friend?: UserProfile;
}

export interface ProfileGalleryItem {
    id: number;
    media_url: string;
    created_at: string;
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
  action?: 'group_invite' | 'connection_request'; // Actionable notifications
  action_id?: string; // ID untuk accept/reject
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
  privacy: 'public' | 'close_friends' | 'private'; 
  user?: UserProfile; 
  views?: StoryView[]; 
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