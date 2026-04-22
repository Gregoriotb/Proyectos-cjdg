import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import { useWebSocket } from '../../../context/WebSocketContext';
import {
  MessageCircle, Clock, ArrowRight, AlertCircle,
  DollarSign, Bell
} from 'lucide-react';

interface QuotationItem {
  id: string;
  service_name: string;
  status: string;
  budget_estimate?: number | string;
  last_message_preview?: string;
  last_message_time?: string;
  client_unread: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', active: 'En Proceso', quoted: 'Cotizado',
  negotiating: 'Negociando', closed: 'Cerrado', cancelled: 'Cancelado'
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  active: 'bg-blue-50 text-blue-700 border-blue-200',
  quoted: 'bg-green-50 text-green-700 border-green-200',
  negotiating: 'bg-purple-50 text-purple-700 border-purple-200',
  closed: 'bg-gray-50 text-gray-700 border-gray-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

interface Props {
  onSelectThread: (threadId: string) => void;
}

export default function ClientQuotationsList({ onSelectThread }: Props) {
  const [threads, setThreads] = useState<QuotationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadThreads = useCallback(async () => {
    try {
      const params = filter !== 'all' ? { status_filter: filter } : {};
      const res = await api.get('/chat-quotations/my-threads', { params });
      setThreads(res.data);
    } catch (e) {
      console.error('Error cargando cotizaciones:', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // SC-WS-01: carga inicial + refresh reactivo via WebSocket (sin polling)
  const { subscribe } = useWebSocket();

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    const unsub = subscribe('thread_updated', () => loadThreads());
    return unsub;
  }, [subscribe, loadThreads]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-cj-text-secondary">
        Cargando cotizaciones...
      </div>
    );
  }

  const totalUnread = threads.reduce((acc, t) => acc + (t.client_unread || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-cj-text-primary flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-cj-accent-blue" />
          Mis Cotizaciones
          {totalUnread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {totalUnread} nuevas
            </span>
          )}
        </h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-cj-surface border border-cj-border text-sm text-cj-text-primary rounded-lg px-4 py-2"
        >
          <option value="all">Todas</option>
          <option value="pending">Pendientes</option>
          <option value="active">En Proceso</option>
          <option value="quoted">Cotizadas</option>
          <option value="negotiating">Negociando</option>
          <option value="closed">Cerradas</option>
        </select>
      </div>

      <div className="grid gap-4">
        {threads.map((thread) => (
          <button
            key={thread.id}
            type="button"
            onClick={() => onSelectThread(thread.id)}
            className="group text-left bg-cj-surface border border-cj-border hover:border-cj-accent-blue/40 shadow-cj-sm rounded-xl p-6 transition-all hover:shadow-cj-md hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg text-cj-text-primary font-medium group-hover:text-cj-accent-blue transition-colors">
                  {thread.service_name}
                </h3>
                {thread.client_unread > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1">
                    <Bell className="w-3 h-3" />
                    {thread.client_unread} nuevo{thread.client_unread > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <span className={`text-xs px-3 py-1 rounded-full border font-medium ${STATUS_COLORS[thread.status]}`}>
                {STATUS_LABELS[thread.status] || thread.status}
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-cj-text-secondary mb-3">
              {thread.budget_estimate != null && (
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <DollarSign className="w-4 h-4" />
                  ${Number(thread.budget_estimate).toLocaleString('es-VE')}
                </span>
              )}
              {thread.last_message_time && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {new Date(thread.last_message_time).toLocaleDateString('es-VE', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              )}
            </div>

            {thread.last_message_preview ? (
              <p className="text-sm text-cj-text-secondary line-clamp-1 mb-4 bg-cj-bg-secondary p-2.5 rounded-lg">
                {thread.last_message_preview}…
              </p>
            ) : (
              <p className="text-sm text-cj-text-muted italic mb-4">Sin mensajes aún…</p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-cj-text-muted font-mono">
                #{thread.id.slice(0, 8).toUpperCase()}
              </span>
              <span className="flex items-center gap-2 text-sm text-cj-accent-blue font-medium group-hover:translate-x-1 transition-transform">
                Ver conversación <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </button>
        ))}

        {threads.length === 0 && (
          <div className="text-center py-20 text-cj-text-muted border border-dashed border-cj-border rounded-xl">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg mb-2">
              No tienes cotizaciones {filter !== 'all' ? 'en este estado' : 'activas'}
            </p>
            <p className="text-sm text-cj-text-muted">
              Usa la sección "Servicios CJDG" para solicitar una nueva cotización.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
