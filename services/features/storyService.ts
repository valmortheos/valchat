import { supabase } from '../../services/supabaseClient';
import { Story, GroupedStories, StoryView } from '../../types';

export const storyService = {
  // Ambil semua active stories
  // Backend RLS juga harus dikonfigurasi untuk memfilter expires_at < now() agar aman
  fetchStories: async (currentUserId: string): Promise<GroupedStories[]> => {
    const { data, error } = await supabase
      .from('stories')
      .select('*, user:profiles(*)')
      .gt('expires_at', new Date().toISOString()) // Filter Client Side backup
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching stories:", error);
      return [];
    }

    const filteredData = (data as Story[]).filter(s => {
        if (s.privacy === 'private') {
            return s.user_id === currentUserId;
        }
        // Logic Close Friends bisa ditambahkan disini jika ada list teman
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

    // Set expires_at to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('stories').insert({
        user_id: userId,
        media_type: type,
        media_url: mediaUrl,
        caption: caption,
        background_color: bgColor,
        privacy: privacy,
        expires_at: expiresAt
    });

    if (error) throw error;
  },

  deleteStory: async (storyId: number) => {
      // 1. Ambil data story dulu untuk dapat path file
      const { data: story, error: fetchError } = await supabase
          .from('stories')
          .select('media_url, user_id')
          .eq('id', storyId)
          .single();
      
      if (fetchError) throw fetchError;

      // 2. Hapus File dari Storage (Jika ada media)
      if (story && story.media_url) {
          try {
              const url = new URL(story.media_url);
              // Format URL biasanya: .../storage/v1/object/public/stories/[userId]/[filename]
              // Kita butuh path setelah bucket name ('stories')
              const pathParts = url.pathname.split('/stories/');
              if (pathParts.length > 1) {
                  const filePath = decodeURIComponent(pathParts[1]);
                  await supabase.storage.from('stories').remove([filePath]);
              }
          } catch (e) {
              console.warn("Gagal parse/hapus file story:", e);
          }
      }

      // 3. Hapus Row Database
      const { error } = await supabase.from('stories').delete().eq('id', storyId);
      if (error) throw error;
  },

  recordView: async (storyId: number, viewerId: string) => {
      const { error } = await supabase.from('story_views').insert({
          story_id: storyId,
          viewer_id: viewerId
      });
      if (error && error.code !== '23505') {
          console.error("Gagal record view:", error);
      }
  },

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