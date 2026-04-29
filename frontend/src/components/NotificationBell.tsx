import { useEffect, useRef, useState } from 'react';
import {
  Bell, Check, Trash2, MessageSquare, Receipt, FileText, ClipboardList, Loader2, Inbox,
} from 'lucide-react';
import { useNotifications, NotificationItem } from '../hooks/useNotifications';

interface Props {
  /** Callback opcional al hacer click en una notificación (para navegar). */
  onNavigate?: (n: NotificationItem) => void;
}

const ICON_BY_TYPE: Record<string, React.ElementType> = {
  chat_message: MessageSquare,
  invoice_created: Receipt,
  invoice_status: Receipt,
  quotation_status: ClipboardList,
};

const formatRelativeTime = (iso: string): string => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} d`;
  return d.toLocaleDateString();
};

const NotificationBell = ({ onNavigate }: Props) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    unreadCount, items, loadingList, fetchList, markAsRead, markAllRead, removeNotification,
  } = useNotifications();

  // Click-outside para cerrar
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) fetchList();
  };

  const handleItemClick = async (n: NotificationItem) => {
    if (!n.is_read) await markAsRead(n.id);
    if (onNavigate) {
      onNavigate(n);
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative p-2 rounded-lg text-cj-text-secondary hover:text-cj-text-primary hover:bg-cj-bg-primary transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-[24rem] sm:w-96 bg-cj-surface border border-cj-border rounded-xl shadow-cj-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-cj-border">
            <h3 className="text-sm font-semibold text-cj-text-primary">Notificaciones</h3>
            {items.some((n) => !n.is_read) && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-cj-accent-blue hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Marcar todas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-96 overflow-y-auto">
            {loadingList ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-cj-accent-blue animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-cj-text-muted">
                <Inbox className="w-8 h-8 mb-2" />
                <p className="text-sm">Sin notificaciones</p>
              </div>
            ) : (
              <ul className="divide-y divide-cj-border">
                {items.map((n) => {
                  const Icon = ICON_BY_TYPE[n.type] || FileText;
                  return (
                    <li
                      key={n.id}
                      className={`relative group ${!n.is_read ? 'bg-cj-accent-blue-light/40' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleItemClick(n)}
                        className="w-full text-left px-4 py-3 hover:bg-cj-bg-primary transition-colors"
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                !n.is_read
                                  ? 'bg-cj-accent-blue text-white'
                                  : 'bg-cj-bg-primary text-cj-text-secondary'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 pr-6">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-cj-text-primary truncate">
                                {n.title}
                              </p>
                              {!n.is_read && (
                                <span className="w-2 h-2 rounded-full bg-cj-accent-blue flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            <p className="text-xs text-cj-text-secondary mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-cj-text-muted mt-1 uppercase tracking-wider">
                              {formatRelativeTime(n.created_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(n.id);
                        }}
                        className="absolute top-3 right-3 p-1 rounded text-cj-text-muted hover:text-cj-danger hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        aria-label="Eliminar notificación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
