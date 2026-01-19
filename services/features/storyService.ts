import { supabase } from '../../services/supabaseClient';
import { Story, UserProfile, GroupedStories } from '../../types';

export const storyService = {
  // Ambil semua active stories (belum expired)
  fetchStories: async (currentUserId: string): Promise<GroupedStories[]> => {
    const { data, error } = await supabase
      .from('stories')
      .select('*, user:profiles(*)')
      .gt('expires_at', new Date().toISOString()) // Ambil yang belum expired
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching stories:", error);
      return [];
    }

    // Grouping by User
    const groupedMap = new Map<string, GroupedStories>();

    // Pastikan user sendiri ada di list (agar bisa lihat story sendiri) atau logic lain
    // Di sini kita group semua story yang didapat
    (data as Story[]).forEach(story => {
        if (!story.user) return;
        
        if (!groupedMap.has(story.user_id)) {
            groupedMap.set(story.user_id, {
                user: story.user,
                stories: [],
                hasUnseen: true // Logic unseen bisa dikembangkan dengan table story_views
            });
        }
        groupedMap.get(story.user_id)!.stories.push(story);
    });

    // Pindahkan story user sendiri ke paling depan jika ada
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
    bgColor?: string
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
        background_color: bgColor
    });

    if (error) throw error;
  },

  deleteStory: async (storyId: number) => {
      // Trigger RLS akan handle permission
      const { error } = await supabase.from('stories').delete().eq('id', storyId);
      if (error) throw error;
  }
};