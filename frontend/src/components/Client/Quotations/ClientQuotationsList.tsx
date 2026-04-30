import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import { useWebSocket } from '../../../context/WebSocketContext';
import {
  MessageCircle, Clock, ArrowRight, AlertCircle,
  DollarSign, Bell, EyeOff, Eye, RotateCcw
} from 'lucide-react';
import ConfirmDialog from '../../ui/ConfirmDialog';

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
  const [hiddenThreads, setHiddenThreads] = useState<QuotationItem[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadThreads = useCallback(async () => {
    try {
      const params: Record<string, any> = {};
      if (filter !== 'all') params.status_filter = filter;
      const [active, hidden] = await Promise.all([
        api.get('/chat-quotations/my-threads', { params }),
        api.get('/chat-quotations/my-threads', { params: { ...params, only_hidden: true } }),
      ]);
      setThreads(active.data);
      setHiddenThreads(hidden.data);
    } catch (e) {
      console.error('Error cargando cotizaciones:', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const restoreThread = async (id: string) => {
    try {
      await api.patch(`/chat-quotations/threads/${id}/recuperar`);
      await loadThreads();
    } catch (e) {
      console.error('Error al recuperar chat:', e);
    }
  };

  const [confirmHide, setConfirmHide] = useState<QuotationItem | null>(null);

  const performHide = async (id: string) => {
    await api.patch(`/chat-quotations/threads/${id}/ocultar`);
    await loadThreads();
  };

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
          <div
            key={thread.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectThread(thread.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectThread(thread.id); }}
            className="group cursor-pointer text-left bg-cj-surface border border-cj-border hover:border-cj-accent-blue/40 shadow-cj-sm rounded-xl p-6 transition-all hover:shadow-cj-md hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <h3 className="text-lg text-cj-text-primary font-medium group-hover:text-cj-accent-blue transition-colors truncate">
                  {thread.service_name}
                </h3>
                {thread.client_unread > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1 shrink-0">
                    <Bell className="w-3 h-3" />
                    {thread.client_unread} nuevo{thread.client_unread > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-3 py-1 rounded-full border font-medium ${STATUS_COLORS[thread.status]}`}>
                  {STATUS_LABELS[thread.status] || thread.status}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmHide(thread); }}
                  title="Ocultar conversación"
                  aria-label="Ocultar conversación"
                  className="p-1.5 rounded-lg text-cj-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              </div>
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
          </div>
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

      {/* SC-06 (FEAT-Historial-v2.4): chats ocultos por el cliente */}
      {hiddenThreads.length > 0 && (
        <div className="border-t border-cj-border pt-4">
          <button
            type="button"
            onClick={() => setShowHidden(v => !v)}
            className="inline-flex items-center gap-2 text-xs text-cj-text-muted hover:text-cj-text-primary transition-colors"
          >
            {showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showHidden ? 'Ocultar' : 'Mostrar'} {hiddenThreads.length} chat{hiddenThreads.length > 1 ? 's' : ''} oculto{hiddenThreads.length > 1 ? 's' : ''}
          </button>
          {showHidden && (
            <div className="mt-3 space-y-2">
              {hiddenThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="bg-cj-bg-secondary border border-cj-border rounded-lg p-3 flex items-center justify-between gap-3 opacity-75"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-cj-text-primary truncate">{thread.service_name}</p>
                    <p className="text-xs text-cj-text-muted">
                      {STATUS_LABELS[thread.status] || thread.status}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => restoreThread(thread.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-cj-surface border border-cj-border text-cj-text-secondary hover:text-cj-accent-blue hover:border-cj-accent-blue transition-colors shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" /> Recuperar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmHide !== null}
        onClose={() => setConfirmHide(null)}
        onConfirm={async () => {
          if (confirmHide) await performHide(confirmHide.id);
        }}
        title="Ocultar conversación"
        description={confirmHide?.service_name}
        variant="warning"
        confirmLabel="Ocultar"
      >
        <p>El chat dejará de aparecer en tu lista de cotizaciones.</p>
        <p className="mt-2 text-xs text-cj-text-muted">El admin sigue viéndolo. Es reversible: lo recuperas desde "Mostrar chats ocultos" abajo de la lista.</p>
      </ConfirmDialog>
    </div>
  );
}
