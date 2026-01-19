import { AppNotification } from '../../types';

type NotificationListener = (notifications: AppNotification[]) => void;

class NotificationService {
  private notifications: AppNotification[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private hasPermission: boolean = false;

  constructor() {
    this.checkPermission();
  }

  private checkPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      this.hasPermission = true;
    }
  }

  // Meminta izin notifikasi browser
  public async requestPermission() {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    this.hasPermission = permission === 'granted';
    return this.hasPermission;
  }

  // Menambah notifikasi (In-App + System)
  public notify(title: string, message: string, type: AppNotification['type'] = 'info', link?: string) {
    // 1. Tambahkan ke In-App List
    const newNotif: AppNotification = {
      id: Date.now().toString() + Math.random().toString().slice(2),
      title,
      message,
      type,
      timestamp: new Date(),
      read: false,
      link
    };

    this.notifications = [newNotif, ...this.notifications].slice(0, 50); // Simpan max 50
    this.notifyListeners();

    // 2. Trigger Browser Notification (Jika tab hidden/user izinkan)
    if (this.hasPermission && document.visibilityState === 'hidden') {
      try {
        const n = new Notification(title, {
          body: message,
          icon: 'https://ui-avatars.com/api/?background=2AABEE&color=fff&name=VC', // Icon Default
          tag: 'valchat-msg' // Prevent stacking too many
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch (e) {
        console.warn("System notification error", e);
      }
    }
  }

  // Manajemen State Internal
  public getNotifications() {
    return this.notifications;
  }

  public markAllAsRead() {
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    this.notifyListeners();
  }

  public clearAll() {
    this.notifications = [];
    this.notifyListeners();
  }

  // Pattern Observer untuk React Component
  public subscribe(listener: NotificationListener) {
    this.listeners.add(listener);
    // Emit current state immediately
    listener(this.notifications);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications));
  }
}

export const notificationService = new NotificationService();