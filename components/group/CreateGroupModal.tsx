import React, { useState } from 'react';
import { groupService } from '../../services/features/groupService';
import { UserSearch } from '../UserSearch';
import { UserProfile } from '../../types';

interface CreateGroupModalProps {
    creatorId: string;
    onClose: () => void;
    onGroupCreated: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ creatorId, onClose, onGroupCreated }) => {
    const [name, setName] = useState('');
    const [step, setStep] = useState(1); // 1: Info, 2: Invite
    const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!name.trim()) return;
        try {
            const group = await groupService.createGroup(name, null, creatorId);
            setCreatedGroupId(group.id);
            setStep(2);
        } catch (e) {
            alert("Gagal membuat grup");
        }
    };

    const handleInvite = async (user: UserProfile) => {
        if (createdGroupId) {
            await groupService.inviteMember(createdGroupId, user.id);
            alert(`Undangan dikirim ke ${user.full_name}`);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-telegram-darkSecondary w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                        {step === 1 ? 'Buat Grup Baru' : 'Undang Anggota'}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>

                {step === 1 ? (
                    <div className="p-6">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nama Grup</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full mt-2 bg-gray-100 dark:bg-black/20 p-3 rounded-xl outline-none focus:ring-2 focus:ring-telegram-primary dark:text-white"
                            placeholder="Contoh: Tim Hore"
                            autoFocus
                        />
                        <button 
                            onClick={handleCreate} 
                            disabled={!name.trim()}
                            className="w-full mt-6 bg-telegram-primary text-white py-3 rounded-xl font-bold hover:bg-telegram-secondary disabled:opacity-50"
                        >
                            Lanjut
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs text-center">
                            Grup berhasil dibuat! Silakan undang teman.
                        </div>
                        <div className="flex-1 relative">
                             <UserSearch 
                                currentUserId={creatorId} 
                                onSelectUser={handleInvite} 
                                onClose={() => {}} 
                             />
                             {/* Override UserSearch absolute positioning style via wrapper if needed, but current impl uses absolute inset-0 */}
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-white/5">
                            <button onClick={() => { onGroupCreated(); onClose(); }} className="w-full bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-white py-3 rounded-xl font-bold">
                                Selesai
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};