import { supabase } from '../../services/supabaseClient';
import { Group, UserProfile } from '../../types';
import { STORAGE_BUCKET } from '../../constants';

export const groupService = {
    createGroup: async (name: string, avatarFile: File | null, createdBy: string) => {
        let avatarUrl = null;
        
        // 1. Upload Avatar (Jika ada)
        if (avatarFile) {
            try {
                const fileName = `group_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, avatarFile);
                if (uploadError) throw uploadError;
                
                const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
                avatarUrl = data.publicUrl;
            } catch (e) {
                console.warn("Gagal upload avatar grup, melanjutkan tanpa avatar.", e);
            }
        }

        // 2. Insert Group Row
        const { data: group, error } = await supabase.from('groups').insert({
            name,
            avatar_url: avatarUrl,
            created_by: createdBy
        }).select().single();

        if (error) throw error;

        // 3. Add Creator as Admin
        // Menggunakan upsert untuk keamanan jika trigger DB sudah membuatnya (tergantung setup DB)
        // Di sini kita insert manual
        const { error: memberError } = await supabase.from('group_members').insert({
            group_id: group.id,
            user_id: createdBy,
            role: 'admin',
            status: 'joined'
        });

        if (memberError) {
            // Rollback (Hapus grup jika gagal add member creator) - Optional tapi recommended
            await supabase.from('groups').delete().eq('id', group.id);
            throw new Error("Gagal menambahkan admin grup: " + memberError.message);
        }

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