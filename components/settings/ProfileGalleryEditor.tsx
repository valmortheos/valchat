import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { ProfileGalleryItem } from '../../types';
import { STORAGE_BUCKET } from '../../constants';

interface ProfileGalleryEditorProps {
    userId: string;
}

export const ProfileGalleryEditor: React.FC<ProfileGalleryEditorProps> = ({ userId }) => {
    const [items, setItems] = useState<ProfileGalleryItem[]>([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadGallery();
    }, []);

    const loadGallery = async () => {
        const { data } = await supabase.from('profile_gallery').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (data) setItems(data);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        if (items.length >= 3) {
            alert("Maksimal 3 media unggulan.");
            return;
        }

        setUploading(true);
        const file = e.target.files[0];
        const fileName = `gallery_${userId}_${Date.now()}`;
        
        try {
            const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, file);
            if (upErr) throw upErr;
            
            const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
            
            await supabase.from('profile_gallery').insert({
                user_id: userId,
                media_url: data.publicUrl
            });
            loadGallery();
        } catch (err: any) {
            alert("Upload gagal: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Hapus media ini?")) return;
        await supabase.from('profile_gallery').delete().eq('id', id);
        loadGallery();
    };

    return (
        <div className="mt-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Media Unggulan (Max 3)</h3>
            <div className="flex gap-2">
                {items.map(item => (
                    <div key={item.id} className="relative w-24 h-24 rounded-lg overflow-hidden group">
                        <img src={item.media_url} className="w-full h-full object-cover" alt="gallery" />
                        <button 
                            onClick={() => handleDelete(item.id)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ))}
                
                {items.length < 3 && (
                    <label className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-telegram-primary transition text-gray-400 hover:text-telegram-primary">
                        {uploading ? (
                            <div className="animate-spin h-6 w-6 border-2 border-current border-t-transparent rounded-full"></div>
                        ) : (
                            <>
                                <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                <span className="text-[10px] font-bold">UPLOAD</span>
                            </>
                        )}
                        <input type="file" onChange={handleUpload} className="hidden" accept="image/*" disabled={uploading} />
                    </label>
                )}
            </div>
        </div>
    );
};