import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface NotificationItem {
  id: string;
  type: 'chat_message' | 'invoice_created' | 'invoice_status' | 'quotation_status';
  title: string;
  message: string;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

const POLL_INTERVAL_MS = 30_000;

/**
 * Hook compartido para notificaciones. Mantiene unread_count vía polling
 * y permite cargar la lista bajo demanda (cuando se abre el dropdown).
 */
export const useNotifications = () => {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.unread_count ?? 0);
    } catch {
      // silencioso para evitar spam si está offline
    }
  }, [isAuthenticated]);

  const fetchList = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingList(true);
    try {
      const res = await api.get('/notifications', { params: { limit: 20 } });
      setItems(res.data || []);
    } finally {
      setLoadingList(false);
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* noop */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      /* noop */
    }
  }, []);

  const removeNotification = useCallback(async (id: string) => {
    try {
      const wasUnread = items.find((n) => n.id === id)?.is_read === false;
      await api.delete(`/notifications/${id}`);
      setItems((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* noop */
    }
  }, [items]);

  // Polling de unread_count
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setItems([]);
      return;
    }
    fetchUnreadCount();
    intervalRef.current = window.setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, fetchUnreadCount]);

  return {
    unreadCount,
    items,
    loadingList,
    fetchList,
    markAsRead,
    markAllRead,
    removeNotification,
  };
};
