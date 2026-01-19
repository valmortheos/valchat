import { supabase } from '../../services/supabaseClient';
import { Story, UserProfile, GroupedStories, StoryView } from '../../types';

export const storyService = {
  // Ambil semua active stories (belum expired)
  fetchStories: async (currentUserId: string): Promise<GroupedStories[]> => {
    const { data, error } = await supabase
      .from('stories')
      .select('*, user:profiles(*)')
      .gt('expires_at', new Date().toISOString()) 
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching stories:", error);
      return [];
    }

    // Filter privacy: Jika private, hanya owner yang bisa lihat
    const filteredData = (data as Story[]).filter(s => {
        if (s.privacy === 'private') {
            return s.user_id === currentUserId;
        }
        return true;
    });

    const groupedMap = new Map<string, GroupedStories>();

    filteredData.forEach(story => {
        if (!story.user) return;
        
        if (!groupedMap.has(story.user_id)) {
            groupedMap.set(story.user_id, {
                user: story.user,
                stories: [],
                hasUnseen: true 
            });
        }
        groupedMap.get(story.user_id)!.stories.push(story);
    });

    const result = Array.from(groupedMap.values());
    const myStoryIndex = result.findIndex(g => g.user.id === currentUserId);
    if (myStoryIndex > -1) {
        const myStory = result.splice(myStoryIndex, 1)[0];
        result.unshift(myStory);
    }

    return result;
  },

  createStory: async (
    userId: string, 
    type: 'image' | 'video' | 'text', 
    file: File | null, 
    caption: string, 
    bgColor?: string, 
    privacy: 'public' | 'close_friends' | 'private' = 'public'
  ) => {
    let mediaUrl = null;

    if (file && (type === 'image' || type === 'video')) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('stories')
            .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('stories').getPublicUrl(filePath);
        mediaUrl = data.publicUrl;
    }

    const { error } = await supabase.from('stories').insert({
        user_id: userId,
        media_type: type,
        media_url: mediaUrl,
        caption: caption,
        background_color: bgColor,
        privacy: privacy
    });

    if (error) throw error;
  },

  deleteStory: async (storyId: number) => {
      const { error } = await supabase.from('stories').delete().eq('id', storyId);
      if (error) throw error;
  },

  // Record View: Mencatat bahwa user telah melihat story
  recordView: async (storyId: number, viewerId: string) => {
      // Gunakan UPSERT ignore duplicates (via ON CONFLICT DO NOTHING di SQL, atau error handling di sini)
      // Supabase JS tidak support ON CONFLICT DO NOTHING di simple insert, jadi kita biarkan error unique constraint terjadi (silent fail)
      const { error } = await supabase.from('story_views').insert({
          story_id: storyId,
          viewer_id: viewerId
      });
      // Ignore error duplicate key value violates unique constraint
      if (error && error.code !== '23505') {
          console.error("Gagal record view:", error);
      }
  },

  // Fetch Viewers: Untuk owner melihat siapa yang lihat storynya
  fetchViewers: async (storyId: number): Promise<StoryView[]> => {
      const { data, error } = await supabase
        .from('story_views')
        .select('viewed_at, viewer_id, viewer:profiles(*)')
        .eq('story_id', storyId)
        .order('viewed_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as StoryView[];
  }
};