/**
 * SC-WS-01 — WebSocket Realtime Context
 *
 * Una sola conexión WS por usuario. Reconexión exponencial con backoff,
 * heartbeat cada 25s, suscripción de listeners por tipo de evento.
 *
 * Eventos soportados desde el server:
 *   - {type: "notification", payload: NotificationItem}
 *   - {type: "chat_message", payload: ChatMessageResponse}
 *   - {type: "thread_updated", payload: {thread_id: string}}
 *   - {type: "connected", user_id}
 *   - {type: "pong"}
 */
import {
  createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode,
} from 'react';
import { useAuth } from './AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/api/v1';

export type WSEventType = 'notification' | 'chat_message' | 'thread_updated';

export interface WSEvent<T = any> {
  type: WSEventType | 'connected' | 'pong';
  payload?: T;
  user_id?: string;
}

type Listener = (event: WSEvent) => void;

interface WSContextType {
  connected: boolean;
  /** Suscribir a un tipo de evento. Devuelve función para des-suscribir. */
  subscribe: (type: WSEventType, listener: Listener) => () => void;
  /** Suscribirse a un thread (server empuja chat_message para ese thread). */
  subscribeThread: (threadId: string) => void;
  unsubscribeThread: (threadId: string) => void;
}

const WebSocketContext = createContext<WSContextType | undefined>(undefined);

const HEARTBEAT_MS = 25_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

const buildWsUrl = (token: string): string => {
  // VITE_API_URL típicamente "https://host/api/v1" — convertir a "wss://host/api/v1/ws?token=..."
  const wsBase = API_URL.replace(/^http/i, 'ws');
  return `${wsBase}/ws?token=${encodeURIComponent(token)}`;
};

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<WSEventType, Set<Listener>>>(new Map());
  const subscribedThreadsRef = useRef<Set<string>>(new Set());
  const heartbeatRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const stoppedRef = useRef(false); // true cuando se hace logout intencional

  const sendRaw = useCallback((data: any) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
    heartbeatRef.current = window.setInterval(() => {
      sendRaw({ action: 'ping' });
    }, HEARTBEAT_MS);
  }, [sendRaw]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (stoppedRef.current) return;
    const token = localStorage.getItem('cjdg_token');
    if (!token) return;

    // Cerrar conexión previa si existía
    if (wsRef.current) {
      try { wsRef.current.close(); } catch { /* noop */ }
    }

    const ws = new WebSocket(buildWsUrl(token));
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttemptRef.current = 0;
      startHeartbeat();

      // Re-subscribir a los threads que estaban activos antes del reconnect
      subscribedThreadsRef.current.forEach((tid) => {
        sendRaw({ action: 'subscribe_thread', thread_id: tid });
      });
    };

    ws.onmessage = (e) => {
      let event: WSEvent;
      try {
        event = JSON.parse(e.data);
      } catch {
        return;
      }
      if (event.type === 'pong' || event.type === 'connected') return;

      const listeners = listenersRef.current.get(event.type as WSEventType);
      if (listeners) {
        listeners.forEach((cb) => {
          try { cb(event); } catch (err) { console.error('WS listener error:', err); }
        });
      }
    };

    ws.onerror = () => {
      // El onclose se encarga del reintento
    };

    ws.onclose = () => {
      setConnected(false);
      stopHeartbeat();
      wsRef.current = null;

      if (stoppedRef.current) return;
      // Backoff exponencial con jitter (1s, 2s, 4s, 8s, ... cap 30s)
      const attempt = reconnectAttemptRef.current++;
      const baseDelay = Math.min(1000 * Math.pow(2, attempt), MAX_RECONNECT_DELAY_MS);
      const jitter = Math.random() * 500;
      reconnectTimerRef.current = window.setTimeout(connect, baseDelay + jitter);
    };
  }, [sendRaw, startHeartbeat, stopHeartbeat]);

  const disconnect = useCallback(() => {
    stoppedRef.current = true;
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    stopHeartbeat();
    if (wsRef.current) {
      try { wsRef.current.close(); } catch { /* noop */ }
      wsRef.current = null;
    }
    subscribedThreadsRef.current.clear();
    setConnected(false);
  }, [stopHeartbeat]);

  // Conectar/desconectar según auth
  useEffect(() => {
    if (isAuthenticated) {
      stoppedRef.current = false;
      connect();
    } else {
      disconnect();
    }
    return () => {
      // No desconectar en cada re-render, solo en unmount real / logout
    };
  }, [isAuthenticated, connect, disconnect]);

  // Cleanup en unmount real
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  const subscribe = useCallback((type: WSEventType, listener: Listener) => {
    let set = listenersRef.current.get(type);
    if (!set) {
      set = new Set();
      listenersRef.current.set(type, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
    };
  }, []);

  const subscribeThread = useCallback((threadId: string) => {
    subscribedThreadsRef.current.add(threadId);
    sendRaw({ action: 'subscribe_thread', thread_id: threadId });
  }, [sendRaw]);

  const unsubscribeThread = useCallback((threadId: string) => {
    subscribedThreadsRef.current.delete(threadId);
    sendRaw({ action: 'unsubscribe_thread', thread_id: threadId });
  }, [sendRaw]);

  return (
    <WebSocketContext.Provider value={{ connected, subscribe, subscribeThread, unsubscribeThread }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket debe usarse dentro de WebSocketProvider');
  return ctx;
};
