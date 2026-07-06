import { create } from 'zustand';
import api from '../lib/api';

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean; // SSE connection status
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  addNotification: (notification: AppNotification) => void;
  setConnected: (status: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isConnected: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/notifications');
      const data = response.data;
      set({
        notifications: data,
        unreadCount: data.filter((n: AppNotification) => !n.isRead).length,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      const { notifications } = get();
      const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
      set({
        notifications: updated,
        unreadCount: updated.filter((n: AppNotification) => !n.isRead).length,
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  addNotification: (notification: AppNotification) => {
    const { notifications } = get();
    // Prepend new notification
    const updated = [notification, ...notifications];
    set({
      notifications: updated,
      unreadCount: updated.filter((n: AppNotification) => !n.isRead).length,
    });
  },

  setConnected: (status: boolean) => {
    set({ isConnected: status });
  }
}));
