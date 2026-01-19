import { supabase } from '../../services/supabaseClient';
import { UserProfile, Connection } from '../../types';

export const connectionService = {
    // Kirim permintaan koneksi
    connect: async (userId: string, targetId: string) => {
        // Cek existing
        const { data } = await supabase.from('connections').select('*').eq('user_id', userId).eq('friend_id', targetId).single();
        if (data) return; 

        await supabase.from('connections').insert({
            user_id: userId,
            friend_id: targetId,
            status: 'pending'
        });
    },

    // Terima koneksi
    accept: async (connectionId: string) => {
        await supabase.from('connections').update({ status: 'accepted' }).eq('id', connectionId);
        // Buat koneksi balik otomatis agar dua arah (optional, tergantung logic)
        // Disini kita asumsi 1 arah (follow) atau 2 arah explicit.
        // Untuk "Saling Berkoneksi" biasanya butuh record di kedua sisi atau 1 record status 'accepted' yang dianggap 2 arah.
        // Kita pakai simple: Record Accepted = Connected.
    },

    // Get Status
    getStatus: async (myId: string, otherId: string): Promise<'connected' | 'pending' | 'none' | 'received'> => {
        // Cek saya invite dia
        const { data: sent } = await supabase.from('connections')
            .select('status')
            .eq('user_id', myId).eq('friend_id', otherId).single();
        
        if (sent) {
            return sent.status === 'accepted' ? 'connected' : 'pending';
        }

        // Cek dia invite saya
        const { data: received } = await supabase.from('connections')
            .select('status')
            .eq('user_id', otherId).eq('friend_id', myId).single();
        
        if (received) {
             return received.status === 'accepted' ? 'connected' : 'received';
        }

        return 'none';
    }
};