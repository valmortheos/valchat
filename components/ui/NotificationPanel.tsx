import React from 'react';
import { AppNotification } from '../../types';
import { notificationService } from '../../services/features/notificationService';

interface NotificationPanelProps {
  notifications: AppNotification[];
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleClear = () => {
    notificationService.clearAll();
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'message':
        return <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>;
      case 'success':
        return <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
      case 'error':
        return <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      default:
        return <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose}></div>
      <div className="fixed top-0 right-0 bottom-0 w-80 bg-white dark:bg-telegram-darkSecondary shadow-2xl z-50 flex flex-col animate-slide-up md:animate-fade-in border-l border-gray-200 dark:border-black/20">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-black/10">
          <h3 className="font-bold text-gray-800 dark:text-white">Notifikasi</h3>
          <div className="flex gap-2">
             <button onClick={handleClear} className="text-xs text-red-500 hover:underline">Hapus Semua</button>
             <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
               <svg className="w-12 h-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
               <p className="text-sm">Tidak ada notifikasi baru</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div key={notif.id} className={`p-3 rounded-xl border ${notif.read ? 'bg-white dark:bg-white/5 border-gray-100 dark:border-gray-700 opacity-70' : 'bg-blue-50 dark:bg-telegram-primary/10 border-blue-100 dark:border-telegram-primary/30'} transition-all`}>
                  <div className="flex gap-3">
                      <div className="mt-1 shrink-0">{getIcon(notif.type)}</div>
                      <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{notif.title}</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-0.5">{notif.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{notif.timestamp.toLocaleTimeString()}</p>
                      </div>
                  </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};