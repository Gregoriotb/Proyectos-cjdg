import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';

export interface NotificationItem {
  id: string;
  type: 'chat_message' | 'invoice_created' | 'invoice_status' | 'quotation_status';
  title: string;
  message: string;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

/**
 * Hook compartido para notificaciones.
 *
 * - Carga inicial: HTTP /notifications + /unread-count
 * - Realtime: suscripción al evento 'notification' del WebSocket
 * - Acciones (mark/delete): HTTP con actualización optimista
 *
 * NO hay polling. Si el WS está caído, la próxima reconexión refresca.
 */
export const useNotifications = () => {
  const { isAuthenticated } = useAuth();
  const { subscribe } = useWebSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.unread_count ?? 0);
    } catch {
      /* noop */
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
    } catch { /* noop */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* noop */ }
  }, []);

  const removeNotification = useCallback(async (id: string) => {
    const wasUnread = items.find((n) => n.id === id)?.is_read === false;
    try {
      await api.delete(`/notifications/${id}`);
      setItems((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* noop */ }
  }, [items]);

  // Carga inicial al autenticarse
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setItems([]);
      return;
    }
    fetchUnreadCount();
  }, [isAuthenticated, fetchUnreadCount]);

  // Realtime: nuevas notificaciones via WS
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = subscribe('notification', (event) => {
      const notif = event.payload as NotificationItem;
      if (!notif) return;
      // Insertar al tope si la lista ya estaba cargada; si no, solo bump count
      setItems((prev) => {
        // Evitar duplicado si por alguna razón llega 2 veces
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
      setUnreadCount((c) => c + 1);
    });
    return unsub;
  }, [isAuthenticated, subscribe]);

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
