import { supabase } from '../../services/supabaseClient';
import { UserProfile } from '../../types';

export const friendService = {
    // Tambah Close Friend
    addCloseFriend: async (friendId: string) => {
        const { error } = await supabase.from('close_friends').insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            friend_id: friendId
        });
        if (error && error.code !== '23505') throw error; // Ignore duplicate
    },

    // Hapus Close Friend
    removeCloseFriend: async (friendId: string) => {
        const { error } = await supabase.from('close_friends').delete()
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
            .eq('friend_id', friendId);
        if (error) throw error;
    },

    // Cek apakah user X adalah close friend saya
    isCloseFriend: async (friendId: string): Promise<boolean> => {
        const { count } = await supabase.from('close_friends')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
            .eq('friend_id', friendId);
        return (count || 0) > 0;
    },

    // Ambil list Close Friends
    getCloseFriends: async (): Promise<UserProfile[]> => {
        const { data, error } = await supabase.from('close_friends')
            .select('friend:friend_id(*)') // Join ke profiles
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        
        if (error) return [];
        return data.map((d: any) => d.friend) as UserProfile[];
    }
};