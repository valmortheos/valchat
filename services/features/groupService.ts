import { supabase } from '../../services/supabaseClient';
import { Group, UserProfile } from '../../types';
import { STORAGE_BUCKET } from '../../constants';

export const groupService = {
    createGroup: async (name: string, avatarFile: File | null, createdBy: string) => {
        let avatarUrl = null;
        if (avatarFile) {
            const fileName = `group_${Date.now()}_${Math.random()}`;
            const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, avatarFile);
            if (!uploadError) {
                const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
                avatarUrl = data.publicUrl;
            }
        }

        const { data: group, error } = await supabase.from('groups').insert({
            name,
            avatar_url: avatarUrl,
            created_by: createdBy
        }).select().single();

        if (error) throw error;

        // Add creator as member (admin/joined)
        await supabase.from('group_members').insert({
            group_id: group.id,
            user_id: createdBy,
            role: 'admin',
            status: 'joined'
        });

        return group as Group;
    },

    inviteMember: async (groupId: string, userId: string) => {
        // Cek apakah sudah ada
        const { data } = await supabase.from('group_members').select('id').eq('group_id', groupId).eq('user_id', userId).single();
        if (data) return; // Already invited or joined

        await supabase.from('group_members').insert({
            group_id: groupId,
            user_id: userId,
            status: 'pending'
        });
    },

    acceptInvite: async (groupId: string, userId: string) => {
        await supabase.from('group_members').update({ status: 'joined' })
            .eq('group_id', groupId).eq('user_id', userId);
    },

    getJoinedGroups: async (userId: string) => {
        const { data, error } = await supabase.from('group_members')
            .select('group:groups(*)')
            .eq('user_id', userId)
            .eq('status', 'joined');
        
        if (error) return [];
        return data.map((d: any) => d.group) as Group[];
    },

    getPendingInvites: async (userId: string) => {
        const { data } = await supabase.from('group_members')
            .select('group:groups(*)')
            .eq('user_id', userId)
            .eq('status', 'pending');
        return data?.map((d: any) => d.group) as Group[] || [];
    }
};